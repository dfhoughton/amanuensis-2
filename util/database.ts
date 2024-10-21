import BaseDexie, { Table } from "dexie"
import { Citation, Language, Phrase } from "../types/common"

type PhraseTable = {
  phrases: Table<Phrase>
}
const phrasesSchema = {
  phrases:
    "++id, &lemma, &language.id, *tags, *citations.tags, *citations.phrase",
}
type LanguageTable = {
  languages: Table<Language>
}
const languagesSchema = {
  languages: "++id, name",
}
type DexieTable = PhraseTable & LanguageTable
type Dexie<T extends any = DexieTable> = BaseDexie & T
const db = new BaseDexie("amanuensis") as Dexie
const schema = Object.assign({}, phrasesSchema, languagesSchema)
db.version(1).stores(schema)
function init() {
  db.languages.get(1).then((l) => {
    if (!l) {
      db.languages.add({
        id: 1,
        name: "unknown",
        locale: "und",
        locales: {},
      })
    }
  })
}
init()

// clear everything
export function resetDatabase() {
  return db.transaction("rw", db.phrases, db.languages, async () => {
    await Promise.all(db.tables.map((table) => table.clear()))
    await init()
  })
}

// get phrases in the same language that have some citation with the same phrase modulo case
function phrasesForCitation(c: Citation, l: Language): Promise<Phrase[]> {
  return db.phrases
    .where("citations.phrase")
    .equalsIgnoreCase(c.phrase)
    .and((p) => p.language.id === l.id)
    .toArray()
}

export function languageForLocale(locale: string): Promise<Language> {
  return db.transaction("r", db.languages, async () => {
    const languages = await db.languages.filter((l) => l[locale]).toArray()
    if (languages.length) {
      return languages.sort((l) => -l[locale])[0]
    } else {
      // default language
      return db.languages.get(1) as any as Language
    }
  })
}

// returns languages and frequencies for display in configuration
export function knownLanguages(): Promise<[Language, number][]> {
  return db.transaction("r", db.languages, db.phrases, async () => {
    const languages = await db.languages.toArray()
    const stats: [Language, number][] = await Promise.all(
      languages.map(async (l) => {
        const count = await db.phrases
          .where("language.id")
          .equals(l.id!)
          .count()
        return [l, count]
      })
    )
    // sort them primarily most used to least used and secondarily alphabetically
    return stats.sort(([la, ca], [lb, cb]) => {
      if (ca === cb) return la.name < lb.name ? -1 : la.name > lb.name ? 1 : 0
      return cb - ca
    })
  })
}

// record an additional use of the locale with the language
export function bumpLocaleCount(language: Language) {
  return db.languages.update(language.id!, { locales: language.locales })
}

// generate a new *unsaved* phrase and return the phrase a list of phrases it might be merged with
export function citationToPhrase(
  c: Citation,
  locale: string
): Promise<[Phrase, Phrase[]]> {
  return db.transaction("rw", db.languages, db.phrases, async () => {
    const language = await languageForLocale(locale)
    language.locales[locale] ??= 0
    language.locales[locale]++
    void bumpLocaleCount(language)
    const phrase: Phrase = {
      lemma: c.phrase,
      language: language,
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
