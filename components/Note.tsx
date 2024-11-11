import {
  Box,
  IconButton,
  Link,
  Menu,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material"
import React, { useEffect, useState } from "react"
import { AppState, Citation, Language, Phrase } from "../types/common"
import { Action, errorHandler } from "../util/reducer"
import { LabelWithHelp } from "./LabelWithHelp"
import debounce from "lodash/debounce"
import isEqual from "lodash/isEqual"
import { Save, Language as LanguageIcon } from "@mui/icons-material"
import { perhapsStaleLanguages, savePhrase } from "../util/database"

type NoteProps = {
  state: AppState
  dispatch: React.Dispatch<Action>
}

export const Note: React.FC<NoteProps> = ({ state, dispatch }) => {
  const [languages, setLanguages] = useState<Language[]>([])
  useEffect(() => {
    perhapsStaleLanguages()
      .then((languages) => setLanguages(languages))
      .catch(errorHandler(dispatch))
  }, [])
  const [languageMenuAnchorEl, setLanguageMenuAnchorEl] =
    React.useState<null | HTMLElement>(null)
  const languageMenuOpen = Boolean(languageMenuAnchorEl)
  const { phrase, priorPhrase, citationIndex = 0 } = state
  const citation = phrase?.citations[citationIndex]
  const clean = isEqual(phrase, priorPhrase)
  const hidden = !state.config?.showHelp
  const changeLanguage = (language: Language) => () => {
    setLanguageMenuAnchorEl(null)
    if (phrase?.languageId !== language.id)
      dispatch({ action: "changeLanguage", language })
  }
  return (
    <>
      <Box>
        {!citation && <i>no word yet</i>}
        {!!citation && (
          <>
            <Stack sx={{ display: "inline-table", float: "right" }}>
              <Tooltip
                title={`When this is enabled, some part of this phrase is unsaved.${
                  clean ? "" : " Click to save."
                }`}
              >
                <span>
                  <IconButton
                    color="primary"
                    size="small"
                    disabled={clean}
                    onClick={() => {
                      savePhrase(phrase!).then((p) =>
                        dispatch({ action: "phraseSaved" })
                      )
                    }}
                  >
                    <Save fontSize="inherit" />
                  </IconButton>
                </span>
              </Tooltip>
              {languages.length > 1 && (
                <>
                  <Tooltip title="Change language assignment for note">
                    <IconButton
                      color="primary"
                      size="small"
                      onClick={(e) => setLanguageMenuAnchorEl(e.currentTarget)}
                    >
                      <LanguageIcon fontSize="inherit" />
                    </IconButton>
                  </Tooltip>
                  <Menu
                    anchorEl={languageMenuAnchorEl}
                    open={languageMenuOpen}
                    onClose={() => setLanguageMenuAnchorEl(null)}
                  >
                    {languages.map((l) => (
                      <MenuItem
                        key={l.id!}
                        selected={l.id === phrase.languageId}
                        onClick={changeLanguage(l)}
                      >
                        {l.name}
                      </MenuItem>
                    ))}
                  </Menu>
                </>
              )}
            </Stack>
            <LabelWithHelp
              hidden={hidden}
              label="Lemma"
              explanation={
                'The canonical, "dictionary" form of the selected phrase. The lemma of "running", for example, might be "run".'
              }
              sx={{ pb: 1 }}
            >
              <TextField
                onChange={
                  debounce((e: React.ChangeEvent<HTMLInputElement>) => {
                    console.log({ phrase, lemma: e.target.value })
                    dispatch({
                      action: "phrase",
                      phrase: { ...phrase!, lemma: e.target.value },
                    })
                  }, 500) as React.ChangeEventHandler<
                    HTMLInputElement | HTMLTextAreaElement
                  >
                }
                variant="standard"
                hiddenLabel
                placeholder="Lemma"
                defaultValue={phrase?.lemma}
                sx={{ width: "85%" }}
              />
            </LabelWithHelp>
            <LabelWithHelp
              hidden={hidden}
              label="Lemma Note"
              explanation={"A note that pertains to all citations."}
              sx={{ pb: 1 }}
            >
              <TextField
                onChange={
                  debounce((e: React.ChangeEvent<HTMLInputElement>) => {
                    dispatch({
                      action: "phrase",
                      phrase: { ...phrase!, note: e.target.value },
                    })
                  }, 500) as React.ChangeEventHandler<
                    HTMLInputElement | HTMLTextAreaElement
                  >
                }
                variant="standard"
                hiddenLabel
                placeholder="Lemma Note"
                defaultValue={phrase?.note}
                sx={{ width: "85%" }}
              />
            </LabelWithHelp>
            {/** primary citation */}
            <LabelWithHelp hidden={hidden} label="Title and URL">
              <TitleDateAndUrl
                citation={citation}
                state={state}
                dispatch={dispatch}
                phrase={phrase}
                clean={clean}
              />
            </LabelWithHelp>
            <LabelWithHelp
              hidden={hidden}
              label="Citation"
              explanation={
                citation.url
                  ? `The text selected from ${citation!.url}`
                  : "The text selected."
              }
            >
              {citation?.before}
              <b>{citation!.phrase}</b>
              {citation?.after}
            </LabelWithHelp>
            {/** other citations */}
            <LabelWithHelp
              hidden={hidden}
              label="All Citations for Lemma"
              explanation="The currently selected citation is marked. Click on others to select them and see their details."
            >
              {phrase?.citations.map((c, i) => (
                <CitationInBrief
                  citation={c}
                  citationIndex={i}
                  key={i}
                  chosen={state.citationIndex === i}
                  dispatch={dispatch}
                />
              ))}
            </LabelWithHelp>
          </>
        )}
      </Box>
    </>
  )
}

type CitationInBriefProps = {
  citation: Citation
  citationIndex: number
  chosen: boolean
  dispatch: React.Dispatch<Action>
}
const CitationInBrief: React.FC<CitationInBriefProps> = ({
  citation,
  citationIndex,
  chosen,
  dispatch,
}) => (
  <Paper
    elevation={chosen ? 2 : 1}
    sx={{}}
    onClick={() => {
      if (!chosen) dispatch({ action: "citationSelected", citationIndex })
    }}
  >
    <Stack
      direction="row"
      spacing={1}
      sx={{ justifyContent: "space-between", m: 1 }}
    >
      <Box>{citation.phrase}</Box>
      <Box>{citation.when.toLocaleDateString()}</Box>
    </Stack>
  </Paper>
)

const Title: React.FC<{ citation: Citation }> = ({ citation }) => {
  const sx = {
    fontSize: "small",
    fontWeight: 600,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  }
  if (!citation.title)
    return (
      <Typography sx={sx}>
        <i>no title</i>
      </Typography>
    )
  return (
    <Tooltip title={citation.title}>
      <Typography sx={sx}>{citation.title}</Typography>
    </Tooltip>
  )
}

type CitationLinkProps = {
  phrase: Phrase
  citation: Citation
  clean: boolean
  state: AppState
  dispatch: React.Dispatch<Action>
}

// a link that will highlight
const CitationLink: React.FC<CitationLinkProps> = ({
  state,
  dispatch,
  phrase,
  citation,
  clean,
}) => {
  const { url } = citation
  const { citations } = phrase
  const i = citations!.indexOf(citation)
  const samePhrase =
    isEqual(phrase.languageId, state.phrase?.languageId) &&
    isEqual(phrase.lemma, state.phrase?.lemma)
  const sx = {
    fontSize: "small",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  }
  if (!url)
    return (
      <Typography sx={sx}>
        <i>no URL</i>
      </Typography>
    )
  if (samePhrase && state.citationIndex === i) {
    // we are already here; make this link inert
    return (
      <Tooltip title={url}>
        <Typography sx={sx}>{url}</Typography>
      </Tooltip>
    )
  }
  return (
    <Tooltip title={url}>
      <Link
        onClick={() => {
          state.port?.postMessage({ action: "goto", citation: citation })
          dispatch({ action: "goto", phrase, citationIndex: i })
        }}
      >
        <Typography sx={sx}>{url}</Typography>
      </Link>
    </Tooltip>
  )
}

type TitleDateAndUrlProps = {
  citation: Citation
  phrase?: Phrase
  clean: boolean
  state: AppState
  dispatch: React.Dispatch<Action>
}

const TitleDateAndUrl: React.FC<TitleDateAndUrlProps> = ({
  citation,
  state,
  dispatch,
  phrase,
  clean,
}) => {
  return (
    <Stack
      direction="row"
      spacing={1}
      sx={{ justifyContent: "space-between", m: 1 }}
    >
      <Title citation={citation} />
      <Tooltip title={citation.when.toLocaleTimeString()}>
        <Box sx={{ fontSize: "small", color: "grey" }}>
          {citation.when.toLocaleDateString()}
        </Box>
      </Tooltip>
      <CitationLink
        state={state}
        dispatch={dispatch}
        phrase={phrase!}
        citation={citation}
        clean={clean}
      />
    </Stack>
  )
}
