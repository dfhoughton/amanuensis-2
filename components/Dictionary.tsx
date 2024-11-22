import React, { ReactNode, useEffect, useState } from "react"
import {
  AppState,
  FreeFormSearch,
  Language,
  Search,
  SearchResults,
  SimilaritySearch,
  Tag,
} from "../types/common"
import { Action, errorHandler } from "../util/reducer"
import {
  Avatar,
  Box,
  Chip,
  Divider,
  IconButton,
  Menu,
  MenuItem,
  Paper,
  Skeleton,
  Stack,
  Tab,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material"
import { Language as LanguageIcon } from "@mui/icons-material"
import ClearIcon from "@mui/icons-material/Clear"
import Grid from "@mui/material/Grid2"
import isEqual from "lodash/isEqual"
import {
  knownTags,
  perhapsStaleLanguages,
  phraseSearch,
  similaritySearch,
} from "../util/database"
import { TagWidget } from "./TagWidget"
import { LabelWithHelp } from "./LabelWithHelp"
import debounce from "lodash/debounce"
import some from "lodash/some"
import { FauxPlaceholder } from "./FauxPlaceholder"
import { TabContext, TabList, TabPanel } from "@mui/lab"

type DictionaryProps = {
  state: AppState
  dispatch: React.Dispatch<Action>
}

export const Dictionary: React.FC<DictionaryProps> = ({ state, dispatch }) => {
  const {
    search = { type: "free", params: searchDefaults },
    searchResults: sr,
  } = state
  const freeSearch = search.type === "free"
  const [searchResults, setSearchResults] = useState(sr)
  const [lastSearch, setLastSearch] = useState<Search | undefined>()
  const [searchTab, setSearchTab] = useState<"free" | "similar">(search.type)
  // get initial search results
  useEffect(() => {
    if (!isEqual(searchResults, state.searchResults))
      setSearchResults(state.searchResults)
    if (search && !isEqual(search, lastSearch)) {
      if (search.type === "free")
        phraseSearch(search.params)
          .then((searchResults) => {
            setLastSearch(search)
            dispatch({ action: "search", search, searchResults })
          })
          .catch(errorHandler(dispatch))
      else
        similaritySearch(search.params)
          .then((searchResults) => {
            setLastSearch(search)
            dispatch({ action: "search", search, searchResults })
          })
          .catch(errorHandler(dispatch))
    }
  }, [state.search, state.searchResults])
  const [languages, setLanguages] = useState<Language[]>([])
  useEffect(() => {
    perhapsStaleLanguages()
      .then((languages) => setLanguages(languages))
      .catch(errorHandler(dispatch))
  }, [])
  return (
    <>
      <TabContext value={searchTab}>
        <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
          <TabList
            onChange={(_e, tab) => {
              setSearchResults(undefined)
              setSearchTab(tab)
              if (tab === "similar") {
                const params: SimilaritySearch = {
                  phrase: state.phrase?.citations[0].phrase ?? "",
                  language: state.phrase?.languageId,
                  limit: 10,
                }
                similaritySearch(params)
                  .then((searchResults) =>
                    dispatch({
                      action: "search",
                      search: { type: "similar", params },
                      searchResults,
                    })
                  )
                  .catch(errorHandler(dispatch))
              } else {
                phraseSearch(searchDefaults)
                  .then((searchResults) =>
                    dispatch({
                      action: "search",
                      search: { type: "free", params: searchDefaults },
                      searchResults,
                    })
                  )
                  .catch(errorHandler(dispatch))
              }
            }}
          >
            <Tab label="Search" value="free" />
            <Tab label="Similar Phrases" value="similar" />
          </TabList>
        </Box>
        <TabPanel value="free">
          <SearchForm
            languages={languages}
            searchResults={
              searchResults ?? {
                selected: -1,
                ...searchDefaults,
                pages: 0,
                total: 0,
                phrases: [],
              }
            }
            state={state}
            dispatch={dispatch}
          />
        </TabPanel>
        <TabPanel value="similar">
          <SimilaritySearchForm
            languages={languages}
            state={state}
            dispatch={dispatch}
          />
        </TabPanel>
      </TabContext>
      {!searchResults && (
        <Stack spacing={1}>
          {new Array(10).fill(null).map((_n, i) => (
            <Skeleton key={i} sx={{ fontSize: "2rem" }} />
          ))}
        </Stack>
      )}
      {!!searchResults && (
        <SearchResults
          languages={languages}
          searchResults={searchResults}
          state={state}
          dispatch={dispatch}
        />
      )}
    </>
  )
}

const searchDefaults = {
  page: 1,
  pageSize: 10,
}

type SearchFormProps = {
  languages: Language[] | undefined
  searchResults: SearchResults
  state: AppState
  dispatch: React.Dispatch<Action>
}

const SearchForm: React.FC<SearchFormProps> = ({
  languages,
  searchResults,
  state,
  dispatch,
}) => {
  const { search: gs = { type: "free", params: { ...searchDefaults } } } = state
  const search = gs.params as any as FreeFormSearch
  const hideHelp = !state.config?.showHelp
  const [tags, setTags] = useState<Tag[] | undefined>()
  useEffect(() => {
    knownTags()
      .then((tags) => setTags(tags))
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
      <Grid container columns={12} spacing={1} sx={{ width: "100%" }}>
        <Grid size={6}>
          <TagWidget
            hideHelp={hideHelp}
            tags={tags}
            presentTags={search.tags}
            dispatch={dispatch}
            addTag={(t) => {
              const tags = [...(search.tags ?? []), t.id!]
              let s: FreeFormSearch = { ...search, tags }
              phraseSearch(s)
                .then((searchResults) =>
                  dispatch({
                    action: "search",
                    search: { type: "free", params: s },
                    searchResults,
                  })
                )
                .catch(errorHandler(dispatch))
            }}
            removeTag={(t) => {
              const tags = search.tags!.filter((tag) => tag !== t.id)
              let s: FreeFormSearch = { ...search, tags }
              phraseSearch(s)
                .then((searchResults) =>
                  dispatch({
                    action: "search",
                    search: { type: "free", params: s },
                    searchResults,
                  })
                )
                .catch(errorHandler(dispatch))
            }}
          />
        </Grid>
        <Grid size={6}>
          <LabelWithHelp
            label="Languages"
            explanation="TODO: think of something to put here"
            hidden={hideHelp}
          >
            <Stack
              direction="row"
              spacing={1}
              sx={{ justifyContent: "space-between" }}
            >
              <Box>
                {!search.languages?.length && (
                  <FauxPlaceholder>Languages</FauxPlaceholder>
                )}
                {(search.languages ?? []).map((l) => {
                  const lang = languages?.find((lang) => lang.id === l)
                  if (!lang) return <></>
                  return (
                    <Chip
                      label={lang.locale}
                      key={lang.id}
                      size="small"
                      onDelete={() => {
                        let languages = (search.languages ?? []).filter(
                          (la) => la !== lang.id
                        )
                        const s = { ...search, languages }
                        phraseSearch(s)
                          .then((searchResults) =>
                            dispatch({
                              action: "search",
                              search: { type: "free", params: s },
                              searchResults,
                            })
                          )
                          .catch(errorHandler(dispatch))
                      }}
                    />
                  )
                })}
              </Box>
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
                {languages?.map((l) => (
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
                        .then((searchResults) => {
                          dispatch({
                            action: "search",
                            search: { type: "free", params: s },
                            searchResults,
                          })
                          setLanguageMenuAnchorEl(null)
                        })
                        .catch(errorHandler(dispatch))
                    }}
                  >
                    {l.name}
                  </MenuItem>
                ))}
              </Menu>
            </Stack>
          </LabelWithHelp>
        </Grid>
      </Grid>
    </Stack>
  )
}

type SimilaritySearchFormProps = {
  languages: Language[] | undefined
  state: AppState
  dispatch: React.Dispatch<Action>
}
const SimilaritySearchForm: React.FC<SimilaritySearchFormProps> = ({
  languages,
  state,
  dispatch,
}) => {
  const { phrase, language, limit } = state.search!
    .params as any as SimilaritySearch
  const hideHelp = !state.config?.showHelp
  const [languageMenuAnchorEl, setLanguageMenuAnchorEl] =
    React.useState<null | HTMLElement>(null)
  const languageMenuOpen = Boolean(languageMenuAnchorEl)
  const currentLanguage =  languages?.find((l) => l.id === language)
  return (
    <Grid container spacing={1} columns={5}>
      <Grid size={3}>
        <TextField
          hiddenLabel
          sx={{ width: "100%" }}
          placeholder="Phrase"
          defaultValue={phrase}
          variant="standard"
          onChange={
            debounce((e: React.ChangeEvent<HTMLInputElement>) => {
              const params: SimilaritySearch = {
                limit,
                language,
                phrase: e.target.value,
              }
              similaritySearch(params)
                .then((searchResults) =>
                  dispatch({
                    action: "search",
                    search: { type: "similar", params },
                    searchResults,
                  })
                )
                .catch(errorHandler(dispatch))
            }, 500) as React.ChangeEventHandler<HTMLInputElement>
          }
        />
      </Grid>
      <Grid size={2}>
        <Stack
          direction="row"
          spacing={1}
          sx={{ justifyContent: "space-between" }}
        >
          <Box>
            {!currentLanguage && <FauxPlaceholder>Language</FauxPlaceholder>}
            {!!currentLanguage && currentLanguage.name}
          </Box>
          <IconButton
            color="primary"
            size="small"
            onClick={(e) => setLanguageMenuAnchorEl(e.currentTarget)}
          >
            <LanguageIcon fontSize="inherit" />
          </IconButton>
          <Menu
            anchorEl={languageMenuAnchorEl}
            open={languageMenuOpen}
            onClose={() => setLanguageMenuAnchorEl(null)}
          >
            {languages?.map((l) => (
              <MenuItem
                key={l.id!}
                selected={l.id === language}
                onClick={() => {
                  setLanguageMenuAnchorEl(null)
                  const params: SimilaritySearch = {
                    phrase,
                    limit,
                    language: l.id === language ? undefined : l.id,
                  }
                  similaritySearch(params)
                    .then((searchResults) =>
                      dispatch({
                        action: "search",
                        search: { type: "similar", params },
                        searchResults,
                      })
                    )
                    .catch(errorHandler(dispatch))
                }}
              >
                {l.name}
              </MenuItem>
            ))}
          </Menu>
        </Stack>
      </Grid>
    </Grid>
  )
}

type TextSearchWidgetProps = {
  label: string
  explanation: string
  hideHelp: boolean
  placeholder: string
  field: "lemma" | "text"
  search: FreeFormSearch
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
  const [textEl, setTextEl] = React.useState<null | HTMLInputElement>(null)
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
        <Grid size={9}>
          <TextField
            sx={{ width: "100%" }}
            onChange={
              debounce((e: React.ChangeEvent<HTMLInputElement>) => {
                setTextEl(e.target)
                ts.text = e.target.value
                search = { ...search, [field]: ts }
                phraseSearch(search)
                  .then((searchResults) =>
                    dispatch({
                      action: "search",
                      search: { type: "free", params: search },
                      searchResults,
                    })
                  )
                  .catch(errorHandler(dispatch))
              }, 500) as React.ChangeEventHandler<HTMLInputElement>
            }
            variant="standard"
            hiddenLabel
            placeholder={placeholder}
            defaultValue={ts.text}
          />
        </Grid>
        <Grid container size={3} spacing={0.75} columns={4}>
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
          <Grid size={1}>
            <Tooltip arrow title={"clear"} enterDelay={1000}>
              <Avatar
                sx={{
                  width: "20px",
                  height: "20px",
                  fontSize: "0.75rem",
                  color: "gray",
                  bgcolor: "transparent",
                  border: "1px solid gray",
                  fontWeight: 800,
                  cursor: "pointer",
                }}
                onClick={() => {
                  ts.text = ""
                  if (textEl) textEl.value = ""
                  search = { ...search, [field]: ts }
                  const s: Search = { type: "free", params: search }
                  phraseSearch(search)
                    .then((searchResults) =>
                      dispatch({ action: "search", search: s, searchResults })
                    )
                    .catch(errorHandler(dispatch))
                }}
              >
                x
              </Avatar>
            </Tooltip>
          </Grid>
        </Grid>
      </Grid>
    </LabelWithHelp>
  )
}

type BooleanBubbleProps = {
  search: FreeFormSearch
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
          const s: Search = { type: "free", params: search }
          if (/\S/.test(ts.text)) {
            phraseSearch(search)
              .then((searchResults) =>
                dispatch({ action: "search", search: s, searchResults })
              )
              .catch(errorHandler(dispatch))
          } else {
            dispatch({ action: "search", search: s, searchResults })
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
