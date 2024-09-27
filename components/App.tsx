import { Container, Typography } from "@mui/material"
import React, { createContext, useReducer } from "react"
import { usePort } from "../lib/hooks"
import { MessageFromBackgroundToPopup } from "../util/switchboard"
import { wordReducer } from "../util/provisional_reducer"

const WordContext = createContext<{ word?: string }>({})

const App: React.FC = () => {
  const [word, dispatch] = useReducer(wordReducer, {})
  const dispatcher = (message: MessageFromBackgroundToPopup) => {
    switch (message.action) {
      case "selection":
        console.log("selection", message.selection)
        dispatch({action: 'selection', rest: message.selection})
        break
      case "url":
        console.log("url", message.url)
        break
      default:
        console.log({ message })
    }
  }
  const port = usePort(dispatcher)
  return (
    <WordContext.Provider value={word}>
      <Container>
        <Typography variant="h4" component="h1" gutterBottom>
          Hello, world!
        </Typography>
        <div>
          {word.word || 'not yet defined'}
        </div>
        <button onClick={() => dispatch({action: 'upper'})}>UPPER</button>
      </Container>
    </WordContext.Provider>
  )
}

export default App
