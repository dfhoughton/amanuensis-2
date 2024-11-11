import BaseDexie, { Collection, Table } from "dexie"
import {
  Citation,
  Configuration,
  Language,
  Phrase,
  Search,
  SearchResults,
} from "../types/common"
import { fuzzyMatcher } from "./general"
import every from "lodash/every"
import some from "lodash/some"

type PhraseTable = {
  phrases: Table<Phrase>
}
const phrasesSchema = {
  phrases: "++id, lemma, languageId",
}
type LanguageTable = {
  languages: Table<Language>
}
const languagesSchema = {
  languages: "++id, &name, &locale",
}
// just putting this here so the extension only manages stored data in the one way
type ConfigurationTable = {
  configuration: Table<Configuration>
}
const configurationSchema = {
  configuration: "id",
}
type DexieTable = PhraseTable & LanguageTable & ConfigurationTable
type Dexie<T extends any = DexieTable> = BaseDexie & T
const db = new BaseDexie("amanuensis") as Dexie
const schema = Object.assign(
  {},
  phrasesSchema,
  languagesSchema,
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
    async () => {
      await Promise.all(db.tables.map((table) => table.clear()))
      await init()
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

// get phrases in the same language that have some citation with the same phrase modulo case
function phrasesForCitation(c: Citation, l: Language): Promise<Phrase[]> {
  const phrase = c.phrase.toLowerCase()
  return db.phrases
    .where("languageId")
    .equals(l.id!)
    .and((p) => some(p.citations, (c) => c.phrase.toLowerCase() === phrase))
    .toArray()
}

export function languageForLocale(locale: string): Promise<Language> {
  return db.transaction("r", db.languages, async () => {
    const language = await db.languages.get({ locale })
    if (language) return language
    const languages = await db.languages
      .filter((l) => !!(l.locales && l.locales[locale]))
      .toArray()
    if (languages.length) {
      return languages.sort((l) => -l.locales![locale])[0]
    } else {
      // default language
      return db.languages.get(0) as any as Language
    }
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
    const language = await languageForLocale(locale)
    c.locale = locale
    const phrase: Phrase = {
      lemma: c.phrase,
      languageId: language.id,
      citations: [c],
      updatedAt: new Date(),
    }
    const others = await phrasesForCitation(c, language)
    return [phrase, others]
  })
}

// basically an upsert; returns the phrase with its database id
export async function savePhrase(phrase: Phrase): Promise<Phrase> {
  const id = await db.phrases.put(phrase, phrase.id)
  if (id) phrase.id = id
  return phrase
}

export async function phraseSearch(search: Search): Promise<SearchResults> {
  const {
    phrase,
    exact,
    caseSensitive,
    tags = [],
    languages = [],
    // these defaults should be redundant
    page = 1,
    pageSize = 10,
  } = search
  const rv: { phrases: Phrase[]; total: number } = await db.transaction(
    "r",
    db.phrases,
    async () => {
      let scope: any = db.phrases.orderBy("lemma")
      if (languages.length) scope = scope.where("languages.id").anyOf(languages)
      if (phrase) {
        if (exact) {
          if (caseSensitive) {
            scope = scope.where("citations.phrase").equals(phrase)
          } else {
            scope = scope.where("citations.phrase").equalsIgnoreCase(phrase)
          }
        } else {
          const rx = fuzzyMatcher(phrase, !caseSensitive)
          scope = scope.filter((p: Phrase) => {
            if (rx.test(p.lemma)) return true
            for (const c of p.citations) {
              if (rx.test(c.phrase)) return true
            }
            return false
          })
        }
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
      const rs: Phrase[] = await scope.toArray()
      const phrases = rs.slice(offset, offset + pageSize)
      const total = rs.length
      return { phrases, total }
    }
  )
  const { phrases, total } = rv
  const pages = Math.ceil(total / pageSize)
  return { selected: -1, phrases, page, pages, pageSize, total }
}
