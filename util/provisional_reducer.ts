import { Citation, ContentSelection, Word } from "../types/common"

export type Action =
  | { action: "selection"; selection: ContentSelection }
  | { action: "upper" }
  | { action: "lower" }

export type AppState = {
  word?: Word
}

export function wordReducer(state: AppState, action: Action): AppState {
  switch (action.action) {
    case "selection":
      const citation: Citation = {
        word: action.selection.phrase,
        when: new Date(),
        where: "",
        context: {
          before: action.selection.before,
          after: action.selection.after,
          instance: 0,
        },
      }
      const word: Word = {
        lemma: action.selection.phrase,
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
    default:
      console.error({ wut: action })
      return state
  }
}
