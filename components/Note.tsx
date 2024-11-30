import {
  Box,
  Divider,
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
import { AppState, Citation, Language, Phrase, Tag } from "../types/common"
import { Action, errorHandler } from "../util/reducer"
import { LabelWithHelp } from "./LabelWithHelp"
import debounce from "lodash/debounce"
import isEqual from "lodash/isEqual"
import { Save, Language as LanguageIcon } from "@mui/icons-material"
import { knownTags, perhapsStaleLanguages, savePhrase } from "../util/database"
import { TagWidget } from "./TagWidget"
import { bigRed } from "../util/theme"

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
  const [tags, setTags] = useState<Tag[] | undefined>()
  useEffect(() => {
    knownTags()
      .then((tags) => setTags(tags))
      .catch(errorHandler(dispatch))
  }, [])
  const [languageMenuAnchorEl, setLanguageMenuAnchorEl] =
    React.useState<null | HTMLElement>(null)
  const languageMenuOpen = Boolean(languageMenuAnchorEl)
  const { phrase, priorPhrase, citationIndex = 0 } = state
  const citation = phrase?.citations[citationIndex]
  const clean = isEqual(phrase, priorPhrase)
  const helpHidden = !state.config?.showHelp
  const changeLanguage = (language: Language) => () => {
    setLanguageMenuAnchorEl(null)
    if (phrase?.languageId !== language.id)
      dispatch({ action: "changeLanguage", language })
  }
  const save = () =>
    savePhrase(phrase!).then((p) => dispatch({ action: "phraseSaved" }))
  return (
    <>
      <Box
        onKeyDown={(e) => {
          console.log("down", e.code, e.ctrlKey, e.metaKey)
          if (e.code === "KeyS" && (e.ctrlKey || e.metaKey)) {
            e.preventDefault()
            e.stopPropagation()
            if (!clean) save()
          }
        }}
      >
        {!citation && <i>no word yet</i>}
        {!!citation && (
          <>
            <Stack sx={{ display: "inline-table", float: "right" }}>
              <Tooltip
                arrow
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
                      save
                    }}
                  >
                    <Save fontSize="inherit" />
                  </IconButton>
                </span>
              </Tooltip>
              {languages.length > 1 && (
                <>
                  <Tooltip arrow title="Change language assignment for note">
                    <IconButton
                      color="primary"
                      size="small"
                      onClick={(e) => setLanguageMenuAnchorEl(e.currentTarget)}
                    >
                      <LanguageIcon fontSize="inherit" />
                    </IconButton>
                  </Tooltip>
                  <Menu
                    MenuListProps={{ dense: true }}
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
              hidden={helpHidden}
              label="Lemma"
              explanation={
                'The canonical, "dictionary" form of the selected phrase. The lemma of "running", for example, might be "run".'
              }
              sx={{ pb: 1 }}
            >
              <TextField
                onChange={
                  debounce((e: React.ChangeEvent<HTMLInputElement>) => {
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
              hidden={helpHidden}
              label="Lemma Note"
              explanation={"A note that pertains to all citations."}
              sx={{ pb: 1 }}
            >
              <TextField
                multiline
                autoFocus
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
            <TagWidget
              tags={tags}
              presentTags={phrase.tags}
              hideHelp={helpHidden}
              dispatch={dispatch}
              addTag={(t) => {
                const tags: number[] = [...(phrase.tags ?? []), t.id!]
                dispatch({ action: "phrase", phrase: { ...phrase, tags } })
              }}
              removeTag={(t) => {
                const tags: number[] = phrase.tags!.filter((i) => i !== t.id)
                dispatch({ action: "phrase", phrase: { ...phrase, tags } })
              }}
            />
            {phrase?.citations.map((c, i) => (
              <CitationInBrief
                phrase={phrase}
                citation={c}
                citationIndex={i}
                key={i}
                tags={tags}
                chosen={state.citationIndex === i}
                helpHidden={helpHidden}
                clean={clean}
                state={state}
                dispatch={dispatch}
              />
            ))}
          </>
        )}
      </Box>
    </>
  )
}

type CitationInBriefProps = {
  phrase: Phrase
  citation: Citation
  citationIndex: number
  chosen: boolean
  tags: Tag[] | undefined
  helpHidden: boolean
  clean: boolean
  state: AppState
  dispatch: React.Dispatch<Action>
}
const CitationInBrief: React.FC<CitationInBriefProps> = ({
  phrase,
  citation,
  citationIndex,
  tags,
  chosen,
  helpHidden: hidden,
  clean,
  state,
  dispatch,
}) => {
  const separation = citationIndex === 0 ? 2 : 1
  const divider = <Divider sx={{ mt: separation, mb: separation }} />
  if (chosen)
    return (
      <Stack spacing={1}>
        {divider}
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
        <LabelWithHelp
          hidden={hidden}
          label="Citation Note"
          explanation={"Any notes about this particular citation"}
        >
          <TextField
            multiline
            onChange={
              debounce((e: React.ChangeEvent<HTMLInputElement>) => {
                let { citations } = phrase
                citations = [...citations]
                citations[citationIndex] = { ...citation, note: e.target.value }
                dispatch({
                  action: "phrase",
                  phrase: { ...phrase, citations },
                })
              }, 500) as React.ChangeEventHandler<
                HTMLInputElement | HTMLTextAreaElement
              >
            }
            variant="standard"
            hiddenLabel={hidden}
            placeholder="Citation Note"
            defaultValue={citation.note}
            sx={{ width: "85%" }}
          />
        </LabelWithHelp>
        <TagWidget
          tags={tags}
          presentTags={citation.tags}
          hideHelp={hidden}
          dispatch={dispatch}
          addTag={(t) => {
            const tags: number[] = [...(citation.tags ?? []), t.id!]
            const c: Citation = { ...citation, tags }
            const citations = [...phrase.citations]
            citations[citationIndex] = c
            dispatch({ action: "phrase", phrase: { ...phrase, citations } })
          }}
          removeTag={(t) => {
            const tags: number[] = citation.tags!.filter((i) => i !== t.id)
            const c: Citation = { ...citation, tags }
            const citations = [...phrase.citations]
            citations[citationIndex] = c
            dispatch({ action: "phrase", phrase: { ...phrase, citations } })
          }}
        />
      </Stack>
    )
  return (
    <>
      {divider}
      <Paper
        elevation={0}
        sx={{
          cursor: "pointer",
          bgcolor: bigRed,
        }}
        onClick={() => {
          if (!chosen) dispatch({ action: "citationSelected", citationIndex })
        }}
      >
        <Stack
          direction="row"
          spacing={1}
          sx={{ justifyContent: "space-between", m: 1 }}
        >
          <Box sx={{ fontWeight: 600 }}>{citation.phrase}</Box>
          <Box
            sx={{
              fontStyle: "italic",
              fontSize: "small",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {citation.note}
          </Box>
          <Box>{citation.when.toLocaleDateString()}</Box>
        </Stack>
      </Paper>
    </>
  )
}

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
    <Tooltip arrow title={citation.title}>
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
      <Tooltip arrow title={url}>
        <Typography sx={sx}>{url}</Typography>
      </Tooltip>
    )
  }
  return (
    <Tooltip arrow title={url}>
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
      <Tooltip arrow title={citation.when.toLocaleTimeString()}>
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
