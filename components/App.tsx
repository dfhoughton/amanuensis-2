import { Container, Typography } from "@mui/material"
import React, { createContext, useReducer } from "react"
import { useConnectionToBackground } from "../lib/hooks"
import { AppState, wordReducer } from "../util/provisional_reducer"

const WordContext = createContext<AppState>({})

const App: React.FC = () => {
  const [state, dispatch] = useReducer(wordReducer, {})
  useConnectionToBackground(dispatch)
  return (
    <WordContext.Provider value={state}>
      <Container>
        <Typography variant="h4" component="h1" gutterBottom>
          Hello, world!
        </Typography>
        <div>
          {state.word === undefined ? <i>no word yet</i> : state.word.lemma}
        </div>
        {state.word !== undefined && (
          <>
            <button onClick={() => dispatch({ action: "upper" })}>UPPER</button>
            <button onClick={() => dispatch({ action: "lower" })}>lower</button>
          </>
        )}
      </Container>
    </WordContext.Provider>
  )
}

export default App
