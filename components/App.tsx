import {
  Alert,
  Box,
  Container,
  CssBaseline,
  Snackbar,
  ThemeProvider,
} from "@mui/material"
import React, { useEffect, useReducer } from "react"
import { useConnectionToBackground } from "../lib/hooks"
import { Action, errorHandler, reducer } from "../util/reducer"
import { AppState, AppTabs } from "../types/common"
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
import { configuration } from "../util/database"

const App: React.FC = () => {
  const [state, dispatch] = useReducer<
    (state: AppState, action: Action) => AppState
  >(reducer, { tab: AppTabs.Note })
  useConnectionToBackground(dispatch)
  useEffect(() => {
    configuration()
      .then((c) => {
        dispatch({ action: "config", config: c ?? {} })
      })
      .catch(errorHandler(dispatch))
  }, [])
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Container sx={{ width: "500px" }}>
        <TabContext value={state.tab}>
          <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
            <TabList
              onChange={(_e, tab) => {
                dispatch({ action: "tab", tab })
              }}
            >
              <Tab icon={<CreateIcon />} value={AppTabs.Note} />
              <Tab icon={<AutoStories />} value={AppTabs.Dictionary} />
              <Tab icon={<Tune />} value={AppTabs.Configuration} />
            </TabList>
          </Box>
          <TabPanel value={AppTabs.Note}>
            <Note state={state} dispatch={dispatch} />
          </TabPanel>
          <TabPanel value={AppTabs.Dictionary}>
            <Dictionary state={state} dispatch={dispatch} />
          </TabPanel>
          <TabPanel value={AppTabs.Configuration}>
            <Configuration state={state} dispatch={dispatch} />
          </TabPanel>
        </TabContext>
        <Snackbar
          open={!!state.error}
          autoHideDuration={5000}
          anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
          onClose={() => {
            dispatch({ action: "error" })
          }}
        >
          <Alert severity="error" variant="filled">
            {state.error}
          </Alert>
        </Snackbar>
      </Container>
      </ThemeProvider>
  )
}

export default App
