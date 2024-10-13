import { Box, Button } from "@mui/material"
import React from "react"
import { AppState } from "../types/common"
import { Action } from "../util/reducer"

type NoteProps = {
  state: AppState
  dispatch: React.Dispatch<Action>
}

export const Note: React.FC<NoteProps> = ({ state, dispatch }) => {
  return (
    <>
      <Box>
        {!state.phrase && <i>no word yet</i>}
        {!!state.phrase && (
          <>
            {state.phrase.citations[0].before}
            <b>{state.phrase.citations[0].phrase}</b>
            {state.phrase.citations[0].after}
          </>
        )}
      </Box>
      {/** just for testing purposes */}
      {!!state.phrase && (
        <Button
          onClick={() => {
            dispatch({
              action: "select",
              selection: state.phrase!.citations[0],
            })
          }}
        >
          highlight
        </Button>
      )}
    </>
  )
}
