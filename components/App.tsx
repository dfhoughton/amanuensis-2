import { Box, Container, CssBaseline, ThemeProvider } from "@mui/material"
import React, { useReducer, useState } from "react"
import { useConnectionToBackground } from "../lib/hooks"
import { Action, reducer } from "../util/reducer"
import { AppState } from "../types/common"
import { theme } from "../util/theme"
import Tab from "@mui/material/Tab"
import TabContext from "@mui/lab/TabContext"
import TabList from "@mui/lab/TabList"
import TabPanel from "@mui/lab/TabPanel"
import CreateIcon from "@mui/icons-material/Create"
import { AutoStories, Tune } from "@mui/icons-material"
import { Note } from "./Note"
import { Dictionary } from "./Dictionary"
import { Configuration } from "./Configuration"

const App: React.FC = () => {
  const [state, dispatch] = useReducer<
    (state: AppState, action: Action) => AppState
  >(reducer, {})
  useConnectionToBackground(dispatch)
  const [currentTab, setCurrentTab] = useState("1")
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Container sx={{ width: "400px" }}>
        <TabContext value={currentTab}>
          <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
            <TabList
              onChange={(_e, tab) => {
                setCurrentTab(tab)
              }}
            >
              <Tab icon={<CreateIcon />} value="1" />
              <Tab icon={<AutoStories />} value="2" />
              <Tab icon={<Tune />} value="3" />
            </TabList>
          </Box>
          <TabPanel value="1">
            <Note state={state} dispatch={dispatch} />
          </TabPanel>
          <TabPanel value="2">
            <Dictionary state={state} dispatch={dispatch} />
          </TabPanel>
          <TabPanel value="3">
            <Configuration state={state} dispatch={dispatch} />
          </TabPanel>
        </TabContext>
      </Container>
    </ThemeProvider>
  )
}

export default App
