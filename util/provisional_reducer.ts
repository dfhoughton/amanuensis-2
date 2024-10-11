import { AppState, Citation, Word } from "../types/common"

export type Action =
  | { action: "selection"; selection: Citation }
  | { action: "select", selection: Citation }
  | { action: "url"; url: string }
  | { action: "locale"; locale: string }
  | { action: "openPort"; port: chrome.runtime.Port }
  | { action: "closePort" }

export function wordReducer(state: AppState, action: Action): AppState {
  switch (action.action) {
    case "selection":
      console.log({ state, action })
      const citation: Citation = {
        word: action.selection.word,
        when: new Date(),
        where: state.url || "",
        before: action.selection.before,
        after: action.selection.after,
      }
      const word: Word = {
        lemma: action.selection.word,
        citations: [citation],
      }
      return { ...state, word }
    case "url":
      return { ...state, url: action.url }
    case "locale":
      return { ...state, locale: action.locale }
    case "openPort":
      return { ...state, port: action.port }
    case "closePort":
      return { ...state, port: undefined }
    case "select":
      state.port?.postMessage(action);
      return state
    default:
      console.error({ wut: action })
      return state
  }
}
