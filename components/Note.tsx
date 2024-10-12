import { Box, Button } from "@mui/material"
import React from "react"
import { AppState } from "../types/common"
import { Action } from "../util/provisional_reducer"

type NoteProps = {
  state: AppState
  dispatch: React.Dispatch<Action>
}

export const Note: React.FC<NoteProps> = ({ state, dispatch }) => {
  return (
    <>
      <Box>
        {!state.word && <i>no word yet</i>}
        {!!state.word && (
          <>
            {state.word.citations[0].before}
            <b>{state.word.citations[0].word}</b>
            {state.word.citations[0].after}
          </>
        )}
      </Box>
      {/** just for testing purposes */}
      {!!state.word && (
        <Button
          onClick={() => {
            dispatch({
              action: "select",
              selection: state.word!.citations[0],
            })
          }}
        >
          highlight
        </Button>
      )}
    </>
  )
}
