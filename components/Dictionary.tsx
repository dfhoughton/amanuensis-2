import React, { useEffect, useState } from "react"
import { AppState, Language, Search, SearchResults, Tag } from "../types/common"
import { Action, errorHandler } from "../util/reducer"
import {
  Avatar,
  Divider,
  IconButton,
  Menu,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material"
import { Language as LanguageIcon } from "@mui/icons-material"
import Grid from "@mui/material/Grid2"
import isEqual from "lodash/isEqual"
import {
  knownTags,
  perhapsStaleLanguages,
  phraseSearch,
} from "../util/database"
import { TagWidget } from "./TagWidget"
import { LabelWithHelp } from "./LabelWithHelp"
import debounce from "lodash/debounce"
import some from "lodash/some"

type DictionaryProps = {
  state: AppState
  dispatch: React.Dispatch<Action>
}

export const noSearchYet: SearchResults = {
  selected: -1,
  phrases: [],
  total: 0,
  page: 1,
  pageSize: 10,
  pages: 0,
}

export const Dictionary: React.FC<DictionaryProps> = ({ state, dispatch }) => {
  const { search = { ...searchDefaults }, searchResults = noSearchYet } = state
  const [lastSearch, setLastSearch] = useState<Search | undefined>()
  // get initial search results
  useEffect(() => {
    if (search && !isEqual(search, lastSearch)) {
      phraseSearch(search)
        .then((searchResults) => {
          setLastSearch(search)
          dispatch({ action: "search", search, searchResults })
        })
        .catch(errorHandler(dispatch))
    }
  }, [state.search, state.searchResults])
  return (
    <>
      <SearchForm
        searchResults={searchResults}
        state={state}
        dispatch={dispatch}
      />
      <Divider sx={{ my: 2 }} />
      <SearchResults
        searchResults={searchResults}
        state={state}
        dispatch={dispatch}
      />
    </>
  )
}

const searchDefaults: Search = {
  page: 1,
  pageSize: 10,
}

type SearchFormProps = {
  searchResults: SearchResults
  state: AppState
  dispatch: React.Dispatch<Action>
}

const SearchForm: React.FC<SearchFormProps> = ({
  searchResults,
  state,
  dispatch,
}) => {
  const { search = { ...searchDefaults } } = state
  const hideHelp = !state.config?.showHelp
  useEffect(() => {
    if (!isEqual(search, state.search)) {
    }
  }, [search])
  const [tags, setTags] = useState<Tag[] | undefined>()
  useEffect(() => {
    knownTags()
      .then((tags) => setTags(tags))
      .catch(errorHandler(dispatch))
  }, [])
  const [languages, setLanguages] = useState<Language[]>([])
  useEffect(() => {
    perhapsStaleLanguages()
      .then((languages) => setLanguages(languages))
      .catch(errorHandler(dispatch))
  }, [])
  const [languageMenuAnchorEl, setLanguageMenuAnchorEl] =
    React.useState<null | HTMLElement>(null)
  const languageMenuOpen = Boolean(languageMenuAnchorEl)
  return (
    <Stack spacing={1} sx={{ alignItems: "flex-start" }}>
      {!hideHelp && (
        <Paper>This tab allows you to search for particular phrases.</Paper>
      )}
      <TextSearchWidget
        label="Lemma"
        explanation=""
        hideHelp={hideHelp}
        placeholder="Lemma to search for"
        field="lemma"
        search={search}
        searchResults={searchResults}
        dispatch={dispatch}
      />
      <TextSearchWidget
        label="Any Text"
        explanation=""
        hideHelp={hideHelp}
        placeholder="Text to search for"
        field="text"
        search={search}
        searchResults={searchResults}
        dispatch={dispatch}
      />
      <Grid container columns={12} spacing={1}>
        <Grid size={10}>
          <TagWidget
            hideHelp={hideHelp}
            tags={tags}
            presentTags={search.tags}
            dispatch={dispatch}
            addTag={(t) => {
              const tags = [...(search.tags ?? []), t.id!]
              console.log("tags", tags)
              let s: Search = { ...search, tags }
              phraseSearch(s)
                .then((searchResults) =>
                  dispatch({ action: "search", search: s, searchResults })
                )
                .catch(errorHandler(dispatch))
            }}
            removeTag={(t) => {
              const tags = search.tags!.filter((tag) => tag !== t.id)
              console.log("tags", tags)
              let s: Search = { ...search, tags }
              phraseSearch(s)
                .then((searchResults) =>
                  dispatch({ action: "search", search: s, searchResults })
                )
                .catch(errorHandler(dispatch))
            }}
          />
        </Grid>
        <Grid size={2}>
          <Tooltip arrow title="Filter by language">
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
                selected={
                  search.languages &&
                  some(search.languages, (lId) => lId === l.id)
                }
                onClick={() => {
                  let languages = search.languages ?? []
                  if (some(languages, (lId: number) => lId === l.id)) {
                    languages = languages.filter((lId) => lId !== l.id)
                  } else {
                    languages = [...languages, l.id!]
                  }
                  const s = { ...search, languages }
                  phraseSearch(s)
                    .then((searchResults) =>
                      dispatch({ action: "search", search: s, searchResults })
                    )
                    .catch(errorHandler(dispatch))
                }}
              >
                {l.name}
              </MenuItem>
            ))}
          </Menu>
        </Grid>
      </Grid>
    </Stack>
  )
}

type TextSearchWidgetProps = {
  label: string
  explanation: string
  hideHelp: boolean
  placeholder: string
  field: "lemma" | "text"
  search: Search
  searchResults: SearchResults
  dispatch: React.Dispatch<Action>
}
const TextSearchWidget: React.FC<TextSearchWidgetProps> = ({
  label,
  explanation,
  placeholder,
  hideHelp: hidden,
  field,
  search,
  searchResults,
  dispatch,
}) => {
  const ts = search[field] ?? {
    text: "",
    whole: false,
    exact: false,
    caseSensitive: false,
  }
  const { text, whole, exact, caseSensitive } = ts
  return (
    <LabelWithHelp
      label={label}
      hidden={hidden}
      explanation={
        <>
          <Typography>{explanation}</Typography>
        </>
      }
      sx={{ width: "100%" }}
    >
      <Grid container spacing={1} columns={12}>
        <Grid size={10}>
          <TextField
            sx={{ width: "100%" }}
            onChange={
              debounce((e: React.ChangeEvent<HTMLInputElement>) => {
                ts.text = e.target.value
                search = { ...search, [field]: ts }
                phraseSearch(search)
                  .then((searchResults) =>
                    dispatch({ action: "search", search, searchResults })
                  )
                  .catch(errorHandler(dispatch))
              }, 500) as React.ChangeEventHandler<
                HTMLInputElement | HTMLTextAreaElement
              >
            }
            variant="standard"
            hiddenLabel
            placeholder={placeholder}
            defaultValue={text}
          />
        </Grid>
        <Grid container size={2} spacing={1} columns={3}>
          <Grid size={1}>
            <BooleanBubble
              search={search}
              searchResults={searchResults}
              field={field}
              subField="whole"
              dispatch={dispatch}
            />
          </Grid>
          <Grid size={1}>
            <BooleanBubble
              search={search}
              searchResults={searchResults}
              field={field}
              subField="exact"
              dispatch={dispatch}
            />
          </Grid>
          <Grid size={1}>
            <BooleanBubble
              search={search}
              searchResults={searchResults}
              field={field}
              subField="caseSensitive"
              dispatch={dispatch}
            />
          </Grid>
        </Grid>
      </Grid>
    </LabelWithHelp>
  )
}

type BooleanBubbleProps = {
  search: Search
  searchResults: SearchResults
  field: "lemma" | "text"
  subField: "whole" | "exact" | "caseSensitive"
  dispatch: React.Dispatch<Action>
}
const BooleanBubble: React.FC<BooleanBubbleProps> = ({
  search,
  searchResults,
  field,
  subField,
  dispatch,
}) => {
  const ts = search[field] ?? {
    text: "",
    whole: false,
    exact: false,
    caseSensitive: false,
  }
  const on = ts[subField]
  let letter,
    explanation,
    checked = on
  switch (subField) {
    case "whole":
      letter = "w"
      explanation =
        "whole words: the first at last letters typed should be at word boundaries"
      break
    case "exact":
      letter = "f"
      explanation =
        "fuzzy match: other characters may appear between the letters typed"
      checked = !on
      break
    case "caseSensitive":
      letter = "i"
      explanation = "case insensitive: disregard case"
      checked = !on
      break
    default:
      throw "we should never get here"
  }
  const sx = {
    width: "20px",
    height: "20px",
    fontSize: "0.75rem",
    fontWeight: 800,
    cursor: "pointer",
  }
  if (checked) (sx as any).bgcolor = "primary.main"
  return (
    <Tooltip arrow title={explanation} enterDelay={1000}>
      <Avatar
        sx={sx}
        onClick={() => {
          ts[subField] = !on
          search = { ...search, [field]: ts }
          console.log("search", search)
          if (/\S/.test(ts.text)) {
            phraseSearch(search)
              .then((searchResults) =>
                dispatch({ action: "search", search, searchResults })
              )
              .catch(errorHandler(dispatch))
          } else {
            dispatch({ action: "search", search, searchResults })
          }
        }}
      >
        {letter}
      </Avatar>
    </Tooltip>
  )
}

const SearchResults: React.FC<SearchFormProps> = ({
  state,
  searchResults,
  dispatch,
}) => {
  const selectionHandler = (i: number) =>
    dispatch({ action: "selectResult", selected: i })
  return (
    <Stack spacing={1} sx={{ alignItems: "flex-start" }}>
      {searchResults.phrases.map((p, i) => (
        <Paper
          key={i}
          elevation={i === searchResults.selected ? 2 : 0}
          onClick={() => selectionHandler(i)}
        >
          <Stack direction="row">{p.lemma}</Stack>
        </Paper>
      ))}
    </Stack>
  )
}
