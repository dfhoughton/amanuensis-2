import { Box, Container, Paper, Typography } from "@mui/material"
import React, { createContext, useReducer, useState } from "react"
import { useConnectionToBackground } from "../lib/hooks"
import { wordReducer } from "../util/provisional_reducer"
import { AppState } from "../types/common"

const WordContext = createContext<AppState>({})

const App: React.FC = () => {
  const [state, dispatch] = useReducer(wordReducer, {})
  const [matches, setMatches] = useState<string[]>([])
  useConnectionToBackground(dispatch)
  return (
    <WordContext.Provider value={state}>
      <Container sx={{ p: 1, width: '300px' }}>
        <label>locale:</label>
        {!state.locale && <i>locale not detected</i>}
        {!!state.locale && <>{state.locale}</>}
        <Typography variant="h4">Citation</Typography>
        <div>
          {!state.word && <i>no word yet</i>}
          {!!state.word && (
            <>
              {state.word.citations[0].before}
              <b>{state.word.lemma}</b>
              {state.word.citations[0].after}
            </>
          )}
        </div>
      </Container>
    </WordContext.Provider>
  )
}

export default App
