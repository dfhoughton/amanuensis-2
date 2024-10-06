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
        <Typography variant="h4" component="h1" gutterBottom>
          Hello, world!
        </Typography>
        <div>
          {!state.word && <i>no word yet</i>}
          {!!state.word && (
            <>
              {state.word.lemma}
              <button onClick={() => dispatch({ action: "upper" })}>
                UPPER
              </button>
              <button onClick={() => dispatch({ action: "lower" })}>
                lower
              </button>
            </>
          )}
        </div>
      </Container>
    </WordContext.Provider>
  )
}

export default App
