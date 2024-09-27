import { ContentSelection, Word } from "../types/common"

interface Action {
  action: string
  rest: any
}

export function wordReducer(word: Word, action: Action) {
  switch (action.action) {
    case "selection":
      return { word: (action.rest as ContentSelection).phrase }
    case "upper":
      return { word: word.word?.toLocaleUpperCase() }
    default:
      console.error({ wut: action })
      return word
  }
}
