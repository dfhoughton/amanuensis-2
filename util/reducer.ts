import { AppState, Citation, Language, Phrase } from "../types/common"

export type Action =
  | { action: "selection"; selection: Citation }
  | { action: "select"; selection: Citation }
  | { action: "url"; url: string }
  | { action: "locale"; locale: string }
  | { action: "openPort"; port: chrome.runtime.Port }
  | { action: "closePort" }
  | { action: "language"; language: Language }
  | { action: "phraseSelected"; phrase: Phrase; others: Phrase[] }

export function reducer(state: AppState, action: Action): AppState {
  switch (action.action) {
    case "phraseSelected":
      const { phrase, others } = action
      let { language } = state
      language ??= phrase.language
      const maybeMerge = others.length ? others : undefined
      return { ...state, language, phrase, maybeMerge, priorPhrase: undefined }
    case "url":
      return { ...state, url: action.url }
    case "openPort":
      return { ...state, port: action.port }
    case "closePort":
      return { ...state, port: undefined }
    case "select":
      state.port?.postMessage(action)
      return state
    default:
      console.error({ wut: action })
      return state
  }
}
