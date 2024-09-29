import { Container, Typography } from "@mui/material"
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
        <div>
          <Typography variant="h3" component="h2">
            Search Experiment
          </Typography>
          <input id="search"></input>
          <button onClick={() => {}}>search</button>
        </div>
      </Container>
    </WordContext.Provider>
  )
}

export default App
