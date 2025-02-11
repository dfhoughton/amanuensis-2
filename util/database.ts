import BaseDexie, { Collection, Table } from "dexie"
import {
  Citation,
  Configuration,
  FreeFormSearch,
  Language,
  Phrase,
  Relation,
  SearchResults,
  SimilaritySearch,
  Tag,
  UrlSearch,
} from "../types/common"
import { matcher } from "./general"
import every from "lodash/every"
import {importDB, exportDB, importInto, peakImportFile} from "dexie-export-import";
import { defaultMaxSimilarPhrases, SimilaritySorter } from "./similarity_sorter"

type PhraseTable = {
  phrases: Table<Phrase>
}
const phrasesSchema = {
  phrases: "++id, lemma, languageId, updatedAt, createdAt",
}
type LanguageTable = {
  languages: Table<Language>
}
const languagesSchema = {
  languages: "++id, &name, &locale",
}
type TagTable = {
  tags: Table<Tag>
}
const tagsSchema = {
  tags: "++id, &name",
}
type RelationTable = {
  relations: Table<Relation>
}
const relationsSchema = {
  relations: "++id, p1, p2",
}
// just putting this here so the extension only manages stored data in the one way
type ConfigurationTable = {
  configuration: Table<Configuration>
}
const configurationSchema = {
  configuration: "id",
}
type DexieTable = PhraseTable &
  LanguageTable &
  ConfigurationTable &
  TagTable &
  RelationTable
type Dexie<T extends any = DexieTable> = BaseDexie & T
const db = new BaseDexie("amanuensis") as Dexie
const schema = Object.assign(
  {},
  phrasesSchema,
  languagesSchema,
  tagsSchema,
  relationsSchema,
  configurationSchema
)
db.version(1).stores(schema)
function init() {
  db.languages.get(0).then((l) => {
    if (!l) {
      db.languages.add({
        id: 0,
        name: "unknown",
        locale: "und",
        locales: {},
        count: 0,
      })
    }
  })
  db.configuration.get(0).then((c) => {
    if (!c) {
      db.configuration.add({ id: 0 })
    }
  })
}
init()

// clear everything
export function resetDatabase() {
  return db.transaction(
    "rw",
    db.phrases,
    db.languages,
    db.configuration,
    db.tags,
    () => {
      Promise.all(db.tables.map((table) => table.clear())).then(() => {
        db.relations.clear() // transaction couldn't take all the tables
        init()
      })
    }
  )
}

export function configuration(): Promise<Configuration | undefined> {
  return db.configuration.get(0)
}

export function setConfiguration(
  configuration: Configuration
): Promise<Configuration> {
  return db.configuration.put(configuration, 0)
}

// creates a relation between the two phrases (if one does not exist), returning the relation id
export function createRelation(p1: Phrase, p2: Phrase): Promise<number> {
  const [i1, i2] = [p1.id!, p2.id!].sort()
  return db.transaction("rw", db.phrases, db.relations, async () => {
    let id = (
      await db.relations
        .where("p1")
        .equals(i1)
        .and((r) => r.p2 === i2)
        .first()
    )?.id
    if (id === undefined)
      id = (await db.relations.put({ p1: i1, p2: i2 })) as number
    // save *just this relation* into the record of both phrases
    const phrases = await db.phrases.where("id").anyOf([i1, i2]).toArray()
    phrases.forEach((p) => {
      p.relations = [...(p.relations ?? []), id]
    })
    await db.phrases.bulkPut(phrases)
    return id!
  })
}

// this basically does a join and fetches down the related phrases
export function phrasesForRelations(
  ids: number[]
): Promise<Map<number, [number, Phrase]>> {
  return db.transaction("r", db.phrases, db.relations, async () => {
    const relations = await db.relations.where("id").anyOf(ids).toArray()
    const phraseIds: number[] = []
    for (const r of relations) {
      phraseIds.push(r.p1)
      phraseIds.push(r.p2)
    }
    const phrases = await db.phrases.where("id").anyOf(phraseIds).toArray()
    const map = new Map<number, [number, Phrase]>()
    for (const p of phrases) {
      const r = relations.find((r) => r.p1 === p.id || r.p2 === p.id)!
      map.set(p.id!, [r.id!, p])
    }
    return map
  })
}

export function deleteRelation(id: number): Promise<void> {
  return db.transaction("rw", db.relations, db.phrases, async () => {
    const relation = await db.relations.get(id)
    if (relation) {
      const phrases = await db.phrases
        .where("id")
        .anyOf([relation.p1, relation.p2])
        .toArray()
      for (const p of phrases) {
        p.relations = (p.relations ?? []).filter((r) => r !== id)
      }
      await db.phrases.bulkPut(phrases)
    }
    return await db.relations.delete(id)
  })
}

export function knownTags(): Promise<Tag[]> {
  return db.tags.toArray()
}

export function saveTag(tag: Tag): Promise<void> {
  return db.tags.put(tag)
}

// deletes a tag and all its uses, returning the number of phrases affected
export function deleteTag(tag: Tag): Promise<number> {
  return db.transaction("rw", db.tags, db.phrases, async () => {
    let count = 0
    const mutated: Phrase[] = []
    db.phrases.each((p) => {
      let changed = false
      if (p.tags) {
        const newTags: number[] = []
        for (const t of p.tags) {
          if (t === tag.id) {
            changed = true
          } else {
            newTags.push(t)
          }
        }
        if (changed) p.tags = newTags
      }
      for (const c of p.citations) {
        let citationChanged = false
        if (c.tags) {
          const newTags: number[] = []
          for (const t of c.tags) {
            if (t === tag.id) {
              citationChanged = true
            } else {
              newTags.push(t)
            }
          }
          if (citationChanged) c.tags = newTags
        }
        changed ||= citationChanged
      }
      if (changed) {
        mutated.push(p)
        count++
      }
    })
    if (mutated.length) await db.phrases.bulkPut(mutated)
    await db.tags.delete(tag.id)
    return count
  })
}

export function mergePhrases(to: Phrase, from: Phrase): Promise<void> {
  return db.transaction("rw", db.phrases, db.relations, async () => {
    to.citations = [...to.citations, ...from.citations] // merge citations
    // fix relations
    const allRelations = [...(to.relations ?? []), ...(from.relations ?? [])]
    if (allRelations.length) {
      // we just delete these all and create replacements
      const relations = await db.relations
        .where("id")
        .anyOf(allRelations)
        .toArray()
      const allPhraseIds = new Set<number>()
      for (const r of relations) {
        for (const i of [r.p1, r.p2])
          if (!(i === from.id || i === to.id)) allPhraseIds.add(i)
      }
      // phrases other than from or to for which we need to recreate relations
      const phrases = await db.phrases
        .where("id")
        .anyOf(Array.from(allPhraseIds))
        .toArray()
      const delenda = new Set(relations.map((r) => r.id))
      const newRelations: number[] = []
      for (const p of phrases) {
        const [i1, i2] = [to.id!, p.id!].sort()
        const r: number = await db.relations.put({ p1: i1, p2: i2 })
        newRelations.push(r)
        const rs = p.relations!.filter((i) => !delenda.has(i))
        const modifiedPhrase = {
          ...p,
          relations: [...rs, r],
        }
        await db.phrases.put(modifiedPhrase)
      }
      await db.relations.bulkDelete(Array.from(delenda))
      to.relations = newRelations
    }
    if (from.updatedAt > to.updatedAt) to.updatedAt = from.updatedAt // the most recentl updatedAt wins
    if (from.id) await db.phrases.delete(from.id)
    await db.phrases.put(to, to.id!)
    knownLanguages() // recalculate cached information
  })
}

export function deletePhrase(phrase: Phrase): Promise<void> {
  return db.transaction("rw", db.phrases, db.relations, async () => {
    if (phrase.relations?.length) {
      // safely delete all relations
      const relations = await db.relations
        .where("id")
        .anyOf(phrase.relations)
        .toArray()
      const phraseIds: number[] = []
      for (const r of relations)
        for (const i of [r.p1, r.p2]) if (i !== phrase.id) phraseIds.push(i)
      const phrases = await db.phrases.where("id").anyOf(phraseIds).toArray()
      for (const p of phrases) {
        p.relations = p.relations!.filter(
          (i) => !relations.some((r) => r.id === i)
        )
      }
      await db.phrases.bulkPut(phrases)
      await db.relations.bulkDelete(relations.map((r) => r.id))
    }
    await db.phrases.delete(phrase.id)
  })
}

// returns languages and frequencies for display in configuration
export function knownLanguages(): Promise<Language[]> {
  return db.transaction("rw", db.languages, db.phrases, async () => {
    void (await db.languages.toCollection().modify({ count: 0, locales: {} }))
    const languages = await db.languages.toArray()
    db.phrases.each((p) => {
      const language = languages.find((l) => l.id === p.languageId)!
      language.count++
      for (const c of p.citations) {
        if (c.locale) {
          language.locales[c.locale] ??= 0
          language.locales[c.locale]++
        }
      }
    })
    void (await db.languages.bulkPut(languages))
    // sort them primarily most used to least used and secondarily alphabetically
    return languages.sort((la, lb) => {
      if (la.id === 0) return -1
      if (lb.id === 0) return 1
      const delta = lb.count - la.count
      if (delta) return delta
      return la.name < lb.name ? -1 : la.name > lb.name ? 1 : 0
    })
  })
}

// cheaper version of knownLanguages which doesn't promise accurate locales or counts
export function perhapsStaleLanguages(): Promise<Language[]> {
  return db.languages.toArray()
}

export function addLanguage(
  name: string,
  locale: string,
  moveExisting: boolean
): Promise<Language> {
  return db.transaction("rw", db.phrases, db.languages, async () => {
    const language: Language = { name, locale, locales: {}, count: 0 }
    language.id = await db.languages.put(language)
    if (moveExisting) {
      const phrasesToModify = await db.phrases
        .filter((p) => every(p.citations, (c) => c.locale === locale))
        .toArray()
      const updates = phrasesToModify.map((p: Phrase) => ({
        key: p.id,
        changes: { languageId: language.id },
      }))
      void (await db.phrases.bulkUpdate(updates))
    }
    return language
  })
}

// count the number of phrases all of whose citations have the given locale
export function countPhrasesWithLocale(locale: string): Promise<Number> {
  return db.transaction("r", db.phrases, async () => {
    return db.phrases
      .filter((p) => every(p.citations, (c) => c.locale === locale))
      .count()
  })
}

export function removeLanguage(
  language: Language,
  moveExisting: boolean
): Promise<void> {
  return db.transaction("rw", db.phrases, db.languages, async () => {
    if (moveExisting) {
      void (await db.phrases
        .where("languageId")
        .equals(language.id!)
        .modify({ languageId: 0 }))
    } else {
      void (await db.phrases.where("languageId").equals(language.id!).delete())
    }
    db.languages.bulkDelete([language.id!])
    return
  })
}

// generate a new *unsaved* phrase and return the phrase a list of phrases it might be merged with
export function citationToPhrase(
  c: Citation,
  locale: string
): Promise<[Phrase, Phrase[]]> {
  return db.transaction("rw", db.languages, db.phrases, async () => {
    const languages = (await db.languages.toArray()).filter(
      (l) => l.locale === locale || l.locales[locale]
    )
    let languageId = 0
    if (languages.length > 1) {
      languageId = languages.sort((a, b) => {
        if (a.locale === locale) return -1
        if (b.locale === locale) return 1
        return (a.locales[locale] ?? 0) - (b.locales[locale] ?? 0)
      })[0].id!
    } else if (languages.length === 1) languageId = languages[0].id!
    const languageIds = languages.length ? languages.map((l) => l.id!) : [0]
    const key = c.phrase.toLowerCase()
    const others = await db.phrases
      .where("languageId")
      .anyOf(languageIds)
      .filter((p) => p.citations.some((o) => o.phrase.toLowerCase() === key))
      .toArray()
    c.locale = locale
    const phrase: Phrase = {
      lemma: c.phrase,
      languageId,
      citations: [c],
      updatedAt: new Date(),
      createdAt: new Date(),
    }
    return [phrase, others]
  })
}

/** really it's citations associated with a particular URL */
export async function phrasesOnPage(search: UrlSearch): Promise<SearchResults> {
  const { url, page = 1, pageSize = 10 } = search
  const rs = await db.phrases
    .toCollection()
    .filter((p) => p.citations.some((c) => c.url === url))
    .toArray()
  const offset = (page - 1) * pageSize
  const phrases = rs.slice(offset, offset + pageSize)
  const total = rs.length
  const pages = Math.ceil(total / pageSize)
  return { selected: -1, phrases, page, pages, pageSize, total }
}

// basically an upsert; returns the phrase with its database id
export async function savePhrase(phrase: Phrase): Promise<Phrase> {
  const p = { ...phrase, relatedPhrases: undefined } // we don't cache these in the database
  p.createdAt ??= new Date()
  const id = await db.phrases.put(p, phrase.id)
  if (id) phrase.id = id
  return phrase
}

/** search for phrases that might be merged with a phrase/citation */
export async function similaritySearch(
  search: SimilaritySearch
): Promise<SearchResults> {
  const {
    phrase,
    limit,
    metric,
    languages = [],
    page = 1,
    pageSize = defaultMaxSimilarPhrases,
  } = search
  console.log("doing similarity search")
  const rs = await db.transaction("r", db.phrases, async () => {
    if (!search.phrase) return []
    const scope = languages.length
      ? db.phrases.where("languageId").anyOf(languages)
      : db.phrases.toCollection()
    const sims = new SimilaritySorter(metric, phrase, limit)
    void (await scope.each((p) => sims.add(p)))
    return sims.toArray()
  })
  const offset = (page - 1) * pageSize
  const phrases = rs.slice(offset, offset + pageSize)
  const total = rs.length
  const pages = Math.ceil(total / pageSize)
  return { selected: -1, phrases, page, pages, pageSize, total }
}

/** general search */
export async function phraseSearch(
  search: FreeFormSearch
): Promise<SearchResults> {
  const {
    lemma,
    text,
    tags = [],
    languages = [],
    // these defaults should be redundant
    page = 1,
    pageSize = 10,
  } = search
  const rv: { phrases: Phrase[]; total: number } = await db.transaction(
    "r",
    db.phrases,
    db.tags,
    async () => {
      let scope: Collection<Phrase, any, Phrase>
      if (languages.length) {
        scope = db.phrases.where("languageId").anyOf(languages)
      } else {
        scope = db.phrases.toCollection()
      }
      if (text && /\S/.test(text.text)) {
        const { whole, exact, caseSensitive } = text
        const rx = matcher(text.text, !!whole, !exact, !caseSensitive)
        scope = scope.filter((p: Phrase) => {
          if (rx.test(p.lemma)) return true
          if (p.note && rx.test(p.note)) return true
          for (const c of p.citations) {
            if (rx.test(c.phrase)) return true
            if (rx.test(c.before)) return true
            if (rx.test(c.after)) return true
            if (c.note && rx.test(c.note)) return true
          }
          return false
        })
      }
      if (lemma && /\S/.test(lemma.text)) {
        const { whole, exact, caseSensitive } = lemma
        const rx = matcher(lemma.text, !!whole, !exact, !caseSensitive)
        scope = scope.filter((p: Phrase) => rx.test(p.lemma))
      }
      if (tags.length) {
        const tagSet = new Set(tags)
        scope = scope.filter((p: Phrase) => {
          if (p.tags) {
            for (const t of p.tags) {
              if (tagSet.has(t)) return true
            }
            for (const c of p.citations) {
              if (c.tags) {
                for (const t of c.tags) {
                  if (tagSet.has(t)) return true
                }
              }
            }
          }
          return false
        })
      }
      const offset = (page - 1) * pageSize
      const rs: Phrase[] = await scope.sortBy("lemma")
      const phrases = rs.slice(offset, offset + pageSize)
      const total = rs.length
      return { phrases, total }
    }
  )
  const { phrases, total } = rv
  const pages = Math.ceil(total / pageSize)
  return { selected: -1, phrases, page, pages, pageSize, total }
}

/** import export functionality */
export async function exportDb() {
  return exportDB(db)
}

export async function importDb(file: File, progressCallback?: (total: number, completed: number) => void) {
  return
}