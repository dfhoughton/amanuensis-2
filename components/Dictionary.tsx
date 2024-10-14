import React from "react"
import { AppState } from "../types/common"
import { Action } from "../util/reducer"

type DictionaryProps = {
  state: AppState
  dispatch: React.Dispatch<Action>
}

export const Dictionary: React.FC<DictionaryProps> = ({ state, dispatch }) => {
  return (
    <>
      This will eventually be a dictionary
    </>
  )
}
