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
  SortDirection,
  SortType,
  Tag,
  UrlSearch,
} from "../types/common"
import { matcher } from "./general"
import every from "lodash/every"
import uniq from "lodash/uniq"
import { exportDB } from "dexie-export-import"
import { defaultMaxSimilarPhrases, SimilaritySorter } from "./similarity_sorter"
import {
  NonInitialOutcome,
  PreparedTrial,
  QuizSignature,
  Summary,
  Trial,
} from "./spaced_repetition"

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
type TrialTable = {
  trials: Table<Trial>
}
const trialSchema = {
  trials: "phraseId",
}
type DexieTable = PhraseTable &
  LanguageTable &
  ConfigurationTable &
  TagTable &
  RelationTable &
  TrialTable
type Dexie<T extends any = DexieTable> = BaseDexie & T
const db = new BaseDexie("amanuensis") as Dexie
const schema = Object.assign(
  {},
  phrasesSchema,
  languagesSchema,
  tagsSchema,
  relationsSchema,
  configurationSchema,
  trialSchema
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
    [db.phrases, db.languages, db.configuration, db.tags, db.relations],
    () => {
      Promise.all(db.tables.map((table) => table.clear())).then(() => init())
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
      p.relations = uniq([...(p.relations ?? []), id])
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
    .filter((p) => p.citations.some((c) => c.url?.startsWith(url)))
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
    sort = { type: SortType.Lemma, direction: SortDirection.Ascending },
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
          if (p.elaboration && rx.test(p.elaboration)) return true
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
      const sortKey =
        sort.type === SortType.Lemma
          ? "lemma"
          : sort.type === SortType.Creation
          ? "created_at"
          : "updated_at"
      const offset = (page - 1) * pageSize
      const rs: Phrase[] = await scope
        .sortBy(sortKey)
        .then((phrases) =>
          sort.direction === SortDirection.Descending
            ? phrases.reverse()
            : phrases
        )
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

export async function importDb(
  file: File,
  progressCallback?: (total: number, completed: number) => void
) {
  const blob = await renameDb(file)
  const tmp = (await BaseDexie.import(blob)) as Dexie
  const languageMap = await mergeLanguages(tmp)
  const tagMap = await importTags(tmp)
  await importPhrases(tmp, languageMap, tagMap)
  tmp.delete()
  return
}

// we export the db under the name amanuensis but want to import it under the name "tmp", so we need
// to munge the import file
function renameDb(file: File): Promise<Blob> {
  return new Promise((resolve, _reject) => {
    const reader = new FileReader()
    reader.addEventListener(
      "load",
      () => {
        const data = JSON.parse(reader.result as string)
        data.data.databaseName = "tmp"
        resolve(new Blob([JSON.stringify(data)], { type: "application/json" }))
      },
      false
    )
    reader.readAsText(file)
  })
}

// import phrases and relations, converting all foreign keys to those appropriate after import
async function importPhrases(
  tmp: Dexie<DexieTable>,
  languageMap: Map<number, number>,
  tagMap: Map<number, number>
) {
  const phraseNumberMap = new Map() as Map<number, number>
  const phraseMap = new Map() as Map<number, Phrase>
  // add the phrases minus relations
  const phrases = await tmp.phrases.toArray()
  for (let p of phrases) {
    const oldId = p.id
    delete p.id
    p.languageId = languageMap.get(p.languageId!)
    const newTags: number[] = []
    for (const t of p.tags ?? []) {
      newTags.push(tagMap.get(t)!)
    }
    p = { ...p, tags: newTags, relations: [] }
    const id = await db.phrases.put(p)
    phraseNumberMap.set(oldId!, id)
    phraseMap.set(id, { ...p, id })
  }
  // now restore the relations
  const relations = await tmp.relations.toArray()
  for (let { p1: p1id, p2: p2id } of relations) {
    if (!phraseNumberMap.has(p1id)) continue
    if (!phraseNumberMap.has(p2id)) continue
    const p1 = phraseMap.get(phraseNumberMap.get(p1id)!)!
    const p2 = phraseMap.get(phraseNumberMap.get(p2id)!)!
    await createRelation(p1, p2)
  }
}

// import the tags from tmp, dealing with name collisions and returning a map from old tag ids to new
async function importTags(tmp: Dexie<DexieTable>) {
  const tagMap = new Map() as Map<number, number>
  ;(await tmp.tags.toArray()).forEach(async (t) => {
    let name = t.name
    let disambiguator = 1
    while (true) {
      const nameInUse = await db.tags.get({ name })
      if (nameInUse) {
        name = `${t.name} (${disambiguator++})`
      } else {
        const oldId = t.id!
        delete t.id
        const id = (await db.tags.put({ ...t, name })) as number
        tagMap.set(oldId, id)
        break
      }
    }
  })
  return tagMap
}

// merge an imported set of languages into the existing languages table
async function mergeLanguages(tmp: Dexie<DexieTable>) {
  const newLanguages: Map<string, Language> = new Map()
  const oldLanguages: Map<string, Language> = new Map()
  ;(await tmp.languages.toArray()).forEach((l) =>
    newLanguages.set(l.locale!, l)
  )
  ;(await db.languages.toArray()).forEach((l) => oldLanguages.set(l.locale!, l))
  const languageMap: Map<number, number> = new Map() // map new language ids to old language ids
  db.transaction("rw", db.languages, async () => {
    for (const [locale, newLang] of newLanguages) {
      const oldLang = oldLanguages.get(locale)
      if (oldLang) {
        oldLang.count += newLang.count
        for (const [locale, count] of Object.entries(newLang.locales!)) {
          oldLang.locales![locale] ??= 0
          oldLang.locales![locale] += count
        }
        await db.languages.put(oldLang)
        languageMap.set(newLang.id!, oldLang.id!)
      } else {
        const oldId = newLang.id!
        delete newLang.id
        const newId: number = await db.languages.put(newLang)
        languageMap.set(oldId, newId)
      }
    }
  })
  return languageMap
}

// functions relating to spaced repetition quizzes

// collect the information necessary to start a spaced repetition quiz
export async function makeQuiz(
  // the maximum number of new phrases to include
  newPhrases: number,
  // whether questions concern the lemma or the gloss
  phrasesAreQuestionsAndGlossesAreAnswers: boolean
): Promise<QuizSignature> {
  const startTime = new Date()
  const phrases: number[] = []
  return db.transaction("r", db.phrases, db.trials, async () => {
    const trials = await db.trials.toArray()
    const trialMap = new Map<number, Trial>()
    trials.forEach((t) => trialMap.set(t.phraseId, t))
    const phraseIds: number[] = await db.phrases.toCollection().primaryKeys()
    // shuffle these
    for (let i = phraseIds.length - 1; i > 0; i--) {
      const j = Math.floor((i + 1) * Math.random()) as number
      ;[phraseIds[i], phraseIds[j]] = [phraseIds[j], phraseIds[i]]
    }
    let newCount = 0
    for (const i of phraseIds) {
      const t = trialMap.get(i)
      if (t) {
        const times =
          t[
            phrasesAreQuestionsAndGlossesAreAnswers
              ? "phraseTrials"
              : "glossTrials"
          ]
        if (times) {
          if (times.done) continue
          if (times.nextTime < startTime) {
            phrases.push(i)
          }
        } else {
          if (newCount < newPhrases) {
            newCount++
            phrases.push(i)
          }
        }
      } else {
        if (newCount < newPhrases) {
          newCount++
          phrases.push(i)
        }
      }
    }
    return {
      startTime,
      phrasesAreQuestionsAndGlossesAreAnswers,
      phrases,
      index: 0,
    }
  })
}

// gather the information necessary to display a single flashcard
export async function prepareTrial(phraseId: number): Promise<PreparedTrial> {
  return db.transaction(
    "r",
    db.phrases,
    db.languages,
    db.tags,
    db.trials,
    async () => {
      const phrase = (await db.phrases.get(phraseId)) as Phrase
      const language = (await db.languages.get(phrase.languageId!)) as Language
      const tags: Tag[] = phrase.tags?.length
        ? await db.tags.where("id").anyOf(phrase.tags).toArray()
        : []
      const trial = (await db.trials.get(phraseId)) ?? { phraseId }
      return { phrase, trial, tags, language }
    }
  )
}

// save the outcome of a single flash card trial
export async function saveTrial(trial: Trial): Promise<void> {
  return db.trials.put(trial, trial.phraseId)
}

// returns a summary of how a quiz is going
export async function howTheQuizIsGoingSoFar(
  phrases: number[],
  startTime: Date,
  quizzingOnLemmas: boolean
): Promise<Summary> {
  return db.transaction("r", db.trials, async () => {
    const allTrials = await db.trials.where("phraseId").anyOf(phrases).toArray()
    const trialsWithinPeriod: NonInitialOutcome[] = []
    const field = quizzingOnLemmas ? "phraseTrials" : "glossTrials"
    // preliminary counts
    let old = allTrials.length // if we have any trials, it's probably old
    let remaining = phrases.length // we have to review them all
    for (const trial of allTrials) {
      const previous = trial[field]
      // we might have trials, but not for this type of quiz
      if (previous?.times.length) {
        // reduce it to just today's trials
        let times = previous.times.filter(([time, outcome]) => {
          const usableTime = time > startTime
          const usableOutcome = outcome !== "first"
          return usableTime && usableOutcome
        })
        // do we have any left?
        if (times.length) {
          // store these outcomes
          for (const [_time, outcome] of times) {
            trialsWithinPeriod.push(outcome as NonInitialOutcome)
          }
          // did all trials happen today? if so, we miscounted it as old
          if (times.length + 1 === previous.times.length) old--
          // do we have any left after removing 'again'? if so, we've miscounted remaining
          if (times.filter(([_time, outcome]) => outcome !== "again").length)
            remaining--
        }
      } else {
        // no trials of this type, so it's new
        old--
      }
    }
    return {
      old,
      new: phrases.length - old,
      remaining,
      outcomes: trialsWithinPeriod,
    }
  })
}

// given a list of words looks for exact matches among lemmas or citations in given language
export async function phrasesInText(
  words: string[],
  language: Language
): Promise<Phrase[]> {
  const set = new Set<string>()
  for (const s of words.filter(w => /\S/.test(w))) set.add(s)
  return db.transaction("r", db.phrases, async () => {
    const phrases = await db.phrases
      .where("languageId")
      .equals(language.id!)
      .filter(
        (p) => set.has(p.lemma) || p.citations.some((c) => set.has(c.phrase))
      )
      .toArray()
    return phrases
  })
}
