import {
  AppState,
  AppTabs,
  Citation,
  Configuration,
  FreeFormSearch,
  Language,
  MessageLevel,
  Phrase,
  SearchResults,
  SearchTabs,
  SimilaritySearch,
} from "../types/common"
import { setConfiguration } from "./database"
import { deepClone } from "./general"

export type Action =
  | { action: "selection"; selection: Citation }
  | { action: "select"; selection: Citation }
  | { action: "openPort"; port: chrome.runtime.Port }
  | { action: "closePort" }
  | { action: "language"; language: Language }
  | { action: "phraseSelected"; phrase: [Phrase, Phrase[]] }
  | {
      action: "message"
      message?: string // undefined message hides notification
      messageLevel?: MessageLevel
    }
  | { action: "error"; message: string }
  | { action: "config"; config: Configuration }
  | { action: "phrase"; phrase: Phrase }
  | { action: "phraseSaved" }
  | { action: "citationSelected"; citationIndex: number }
  | { action: "tab"; tab: AppTabs }
  | { action: "goto"; phrase: Phrase; citationIndex: number }
  | {
      action: "search"
      search: FreeFormSearch
      searchResults: SearchResults
      tab?: AppTabs
    }
  | {
      action: "similaritySearch"
      search: SimilaritySearch
      searchResults: SearchResults
      tab?: AppTabs
    }
  | { action: "switchSearch" }
  | { action: "selectResult"; selected: number }
  | { action: "noSelection" } // when popup is opened with nothing highlighted
  | { action: "merged"; phrase: Phrase }
  | { action: "phrasesDeleted" } // *all* phrases deleted from database
  | { action: "phraseDeleted"; phrase: Phrase }
  | { action: "changeLanguage"; language: Language } // change the language the phrase is assigned to
  | { action: "relationsChanged"; relations: number[]; message?: string }
  | { action: "relatedPhrasesChanged"; relatedPhrases: Map<number, [number, Phrase]> }
  | { action: "relationClicked"; phrase: Phrase }

export function reducer(state: AppState, action: Action): AppState {
  switch (action.action) {
    case "phraseSelected":
      const {
        phrase: [phrase, others],
      } = action
      const { citations } = phrase
      // phrase arrives with dates serialized; must fix
      for (const c of citations) {
        if (typeof c.when === "string") c.when = new Date(c.when)
      }
      let { languageId } = state
      languageId ??= phrase.languageId
      const languages = languageId === undefined ? [] : [languageId]
      let maybeMeld,
        message,
        messageLevel,
        searchTab = SearchTabs.Free
      if (others.length) {
        maybeMeld = others
        message = `There ${
          others.length === 1
            ? "is a phrase"
            : `are ${others.length} other phrases`
        } you may wish to attach this citation to. See the search tab.`
        messageLevel = "info"
        searchTab = SearchTabs.Similar
      }
      return {
        ...state,
        languageId,
        phrase,
        maybeMeld,
        message,
        messageLevel,
        priorPhrase: undefined,
        citationIndex: selectCitation(citations),
        similaritySearch: {
          phrase: phrase.lemma,
          languages,
          limit: 10,
        }, // TODO: make limit a configuration parameter
        searchTab,
      }
    case "openPort":
      return { ...state, port: action.port }
    case "closePort":
      return { ...state, port: undefined }
    case "select":
      state.port?.postMessage(action)
      return state
    case "message":
      return {
        ...state,
        message: action.message,
        messageLevel: action.messageLevel,
      }
    case "error":
      return {
        ...state,
        message: action.message,
        messageLevel: "error" as any,
      }
    case "tab":
      return { ...state, tab: action.tab }
    case "config":
      const { config } = action
      setConfiguration(config)
      return { ...state, config }
    case "phrase": // unsaved change to phrase
      return { ...state, phrase: action.phrase, searchResults: undefined }
    case "phraseSaved":
      return { ...state, priorPhrase: { ...state.phrase! } }
    case "citationSelected":
      return { ...state, citationIndex: action.citationIndex }
    case "search":
      let { search, searchResults: freeSearchResults, tab } = action
      tab ??= state.tab
      return {
        ...state,
        freeSearch: search,
        freeSearchResults,
        searchResults: freeSearchResults,
        tab,
        searchTab: SearchTabs.Free,
      }
    case "similaritySearch":
      let {
        search: similaritySearch,
        searchResults: similaritySearchResults,
        tab: appTabb,
      } = action
      appTabb ??= state.tab
      return {
        ...state,
        similaritySearch,
        similaritySearchResults,
        searchResults: similaritySearchResults,
        tab: appTabb,
        searchTab: SearchTabs.Similar,
      }
    case "switchSearch":
      const nowFree = state.searchTab === SearchTabs.Similar
      return {
        ...state,
        searchTab: nowFree ? SearchTabs.Free : SearchTabs.Similar,
        searchResults: nowFree
          ? state.similaritySearchResults
          : state.freeSearchResults,
      }
    case "selectResult":
      let { searchResults: results } = state
      results ??= {
        selected: -1,
        phrases: [],
        total: 0,
        page: 1,
        pageSize: 10,
        pages: 0,
      }
      const { selected } = action
      const selectedPhrase = results!.phrases[selected]
      return {
        ...state,
        phrase: selectedPhrase,
        priorPhrase: selectedPhrase,
        citationIndex: selectCitation(selectedPhrase.citations),
        tab: AppTabs.Note,
        searchResults: { ...results, selected },
      }
    case "goto":
      const { phrase: gotoPhrase, citationIndex } = action
      return {
        ...state,
        phrase: gotoPhrase,
        priorPhrase: deepClone(gotoPhrase),
        citationIndex,
        tab: AppTabs.Note,
      }
    case "noSelection":
      return state
    case "changeLanguage":
      const { phrase: changeLanguagePhrase } = state
      return {
        ...state,
        phrase: { ...changeLanguagePhrase!, languageId: action.language.id },
      }
    case "merged":
      // one phrase has been merged into another
      return {
        ...state,
        // show the result of the merge
        phrase: action.phrase,
        priorPhrase: { ...action.phrase },
        tab: AppTabs.Note,
        // we must redo searches to purge the phrase merged in
        freeSearchResults: undefined,
        similaritySearchResults: undefined,
      }
    case "phrasesDeleted":
      return {
        ...state,
        priorPhrase: undefined,
        freeSearchResults: undefined,
        similaritySearchResults: undefined,
      }
    case "phraseDeleted":
      const deletedStatePhrase = action.phrase.id === state.phrase?.id
      const newPhrase = deletedStatePhrase ? undefined : state.phrase
      const newPriorPhrase = deletedStatePhrase ? undefined : state.priorPhrase
      return {
        ...state,
        // we may have deleted the selected phrase
        phrase: newPhrase,
        priorPhrase: newPriorPhrase,
        // we must redo searches to purge the deleted phrase merged in
        freeSearchResults: undefined,
        similaritySearchResults: undefined,
      }
    case "relationsChanged": // we save relation ids in the database
      return {
        ...state,
        phrase: { ...state.phrase!, relations: action.relations, relatedPhrases: undefined },
        message: action.message,
        searchResults: undefined
      }
    case "relatedPhrasesChanged": // we join in the related phrases for rendering
      return {
        ...state,
        phrase: { ...state.phrase!, relatedPhrases: action.relatedPhrases },
      }
    case "relationClicked": // display the entity clicked, erasing any unsaved state
      const ap = {...action.phrase}
      return {
        ...state,
        phrase: ap,
        citationIndex: selectCitation(ap.citations),
        priorPhrase: ap,
      }
    default:
      console.error({ wut: action })
      return state
  }
}

export function errorHandler(dispatch: React.Dispatch<Action>) {
  return (e: any) => {
    const message = e.message ?? `${e}`
    const messageLevel: MessageLevel = "error" as never // unclear why typescript requires this
    const action: Action = { action: "message", message, messageLevel }
    dispatch(action)
  }
}

const selectCitation = (citations: Citation[]): number => {
  const i = citations.findIndex((c) => c.canonical)
  if (i > -1) return i
  return 0
}
