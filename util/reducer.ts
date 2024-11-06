import {
  AppState,
  AppTabs,
  Citation,
  Configuration,
  Language,
  Phrase,
} from "../types/common"
import { setConfiguration } from "./database"
import { deepClone } from "./general"

export type Action =
  | { action: "selection"; selection: Citation }
  | { action: "select"; selection: Citation }
  | { action: "openPort"; port: chrome.runtime.Port }
  | { action: "closePort" }
  | { action: "language"; language: Language }
  | { action: "phraseSelected"; phrase: Phrase; others: Phrase[] }
  | { action: "error"; message?: string } // undefined message hides error
  | { action: "config"; config: Configuration }
  | { action: "phrase"; phrase: Phrase }
  | { action: "phraseSaved" }
  | { action: "citationSelected"; citationIndex: number }
  | { action: "tab"; tab: AppTabs }
  | { action: "goto"; phrase: Phrase; citationIndex: number }

export function reducer(state: AppState, action: Action): AppState {
  switch (action.action) {
    case "phraseSelected":
      const { phrase, others } = action
      let { language } = state
      language ??= phrase.language
      const maybeMerge = others.length ? others : undefined
      return { ...state, language, phrase, maybeMerge, priorPhrase: undefined }
    case "openPort":
      return { ...state, port: action.port }
    case "closePort":
      return { ...state, port: undefined }
    case "select":
      state.port?.postMessage(action)
      return state
    case "error":
      return { ...state, error: action.message }
    case "tab":
      return { ...state, tab: action.tab }
    case "config":
      const { config } = action
      setConfiguration(config)
      return { ...state, config }
    case "phrase": // unsaved change to phrase
      return { ...state, phrase: action.phrase }
    case "phraseSaved":
      return { ...state, priorPhrase: { ...state.phrase! } }
    case "citationSelected":
      return { ...state, citationIndex: action.citationIndex }
    case "goto":
      const { phrase: gotoPhrase, citationIndex } = action
      return {
        ...state,
        phrase: gotoPhrase,
        priorPhrase: deepClone(gotoPhrase),
        citationIndex,
        tab: AppTabs.Note,
      }
    default:
      console.error({ wut: action })
      return state
  }
}
