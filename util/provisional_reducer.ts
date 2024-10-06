import { AppState, Citation, Word } from "../types/common"

export type Action =
  | { action: "selection"; selection: Citation }
  | { action: "upper" }
  | { action: "lower" }
  | { action: "url"; url: string }

export function wordReducer(state: AppState, action: Action): AppState {
  switch (action.action) {
    case "selection":
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
    case "upper":
      if (state.word) {
        const word = state.word
        return {
          ...state,
          word: { ...word, lemma: word.lemma.toLocaleUpperCase() },
        }
      } else {
        return { ...state }
      }
    case "lower":
      if (state.word) {
        const word = state.word
        return {
          ...state,
          word: { ...word, lemma: word.lemma.toLocaleLowerCase() },
        }
      } else {
        return { ...state }
      }
    case "url":
      return { ...state, url: action.url }
    default:
      console.error({ wut: action })
      return state
  }
}
