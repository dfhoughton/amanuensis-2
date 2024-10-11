import {
  Box,
  Button,
  Container,
  CssBaseline,
  ThemeProvider,
} from "@mui/material"
import React, { createContext, useReducer, useState } from "react"
import { useConnectionToBackground } from "../lib/hooks"
import { wordReducer } from "../util/provisional_reducer"
import { AppState } from "../types/common"
import { theme } from "../util/theme"
import Tab from "@mui/material/Tab"
import TabContext from "@mui/lab/TabContext"
import TabList from "@mui/lab/TabList"
import TabPanel from "@mui/lab/TabPanel"

const WordContext = createContext<AppState>({})

const App: React.FC = () => {
  const dummyState = {
    word: {
      lemma: "foo",
      citations: [
        { before: "bws ", word: "wedi", after: " taro", when: new Date() },
      ],
    },
  }
  const [state, dispatch] = useReducer(wordReducer, dummyState)
  useConnectionToBackground(dispatch)
  const [currentTab, setCurrentTab] = useState("1")
  return (
    <WordContext.Provider value={state}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Container sx={{ width: "300px" }}>
          <TabContext value={currentTab}>
            <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
              <TabList
                onChange={(_e, tab) => {
                  setCurrentTab(tab)
                }}
                aria-label="lab API tabs example"
              >
                <Tab label="Item One" value="1" />
                <Tab label="Item Two" value="2" />
              </TabList>
            </Box>
            <TabPanel value="1">
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
            </TabPanel>
            <TabPanel value="2">Item Two</TabPanel>
          </TabContext>
        </Container>
      </ThemeProvider>
    </WordContext.Provider>
  )
}

export default App
