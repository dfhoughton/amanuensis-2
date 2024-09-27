import { Container, Typography } from "@mui/material"
import React from "react"
import { usePort } from "../lib/hooks"
import { MessageFromBackgroundToPopup } from "../util/switchboard"

const dispatcher = (message: MessageFromBackgroundToPopup) => {
  switch (message.action) {
    case "selection":
      console.log("selection", message.selection)
      break
    case "url":
      console.log("url", message.url)
      break
    default:
      console.log({ message })
  }
}

const App: React.FC = () => {
  const port = usePort(dispatcher)
  console.log({ port })
  return (
    <Container>
      <Typography variant="h4" component="h1" gutterBottom>
        Hello, world!
      </Typography>
    </Container>
  )
}

export default App
