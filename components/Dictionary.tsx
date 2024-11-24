import React, { useEffect, useState } from "react"
import {
  AppState,
  FreeFormSearch,
  Language,
  SearchResults,
  SearchTabs,
  SimilaritySearch,
  Tag,
} from "../types/common"
import { Action, errorHandler } from "../util/reducer"
import {
  Avatar,
  Box,
  Chip,
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
import { FauxPlaceholder } from "./FauxPlaceholder"
import { TabContext, TabList, TabPanel } from "@mui/lab"

const searchDefaults = {
  page: 1,
  pageSize: 10,
}

type DictionaryProps = {
  state: AppState
  dispatch: React.Dispatch<Action>
}

export const Dictionary: React.FC<DictionaryProps> = ({ state, dispatch }) => {
  const {
    freeSearch = searchDefaults,
    similaritySearch: sSearch = { phrase: "", limit: 10 }, // TODO: don't just type in these constants willy-nilly
    searchResults,
    searchTab = SearchTabs.Free,
    freeSearchResults,
    similaritySearchResults,
  } = state
  const [fs, setFs] = useState<FreeFormSearch>(freeSearch)
  const [ss, setSs] = useState<SimilaritySearch>(sSearch)
  // get initial search results
  useEffect(() => {
    if (searchTab === SearchTabs.Free) {
      if (
        !(
          searchResults &&
          isEqual(searchResults, freeSearchResults) &&
          isEqual(freeSearch, fs)
        )
      ) {
        phraseSearch(freeSearch)
          .then((searchResults) => {
            setFs(freeSearch)
            dispatch({ action: "search", searchResults, search: freeSearch })
          })
          .catch(errorHandler(dispatch))
      }
    } else {
      if (
        !(
          searchResults &&
          isEqual(searchResults, similaritySearchResults) &&
          isEqual(sSearch, ss)
        )
      ) {
        similaritySearch(sSearch)
          .then((searchResults) => {
            setSs(sSearch)
            dispatch({
              action: "similaritySearch",
              searchResults,
              search: sSearch,
            })
          })
          .catch(errorHandler(dispatch))
      }
    }
  }, [
    freeSearch,
    sSearch,
    searchResults,
    freeSearchResults,
    similaritySearchResults,
    searchTab,
  ])
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
          <TabList onChange={() => dispatch({ action: "switchSearch" })}>
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
          <Skeleton sx={{ fontSize: "2rem" }} />
          <Skeleton sx={{ fontSize: "2rem" }} />
          <Skeleton sx={{ fontSize: "2rem" }} />
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
  const { freeSearch: search = { ...searchDefaults } } = state
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
              const s = { ...search, tags }
              phraseSearch(s)
                .then((searchResults) =>
                  dispatch({
                    action: "search",
                    search: s,
                    searchResults,
                  })
                )
                .catch(errorHandler(dispatch))
            }}
            removeTag={(t) => {
              const tags = search.tags!.filter((tag) => tag !== t.id)
              const s = { ...search, tags }
              phraseSearch(s)
                .then((searchResults) =>
                  dispatch({
                    action: "search",
                    search: s,
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
            <LanguagePickerWidget
              languageIds={search.languages ?? []}
              languages={languages!}
              onDelete={(lang) => () => {
                let languages = (search.languages ?? []).filter(
                  (la) => la !== lang.id
                )
                const s = { ...search, languages }
                phraseSearch(s)
                  .then((searchResults) =>
                    dispatch({
                      action: "search",
                      search: s,
                      searchResults,
                    })
                  )
                  .catch(errorHandler(dispatch))
              }}
              onAdd={(l) => () => {
                let languages = search.languages ?? []
                if (languages.some((lId: number) => lId === l.id)) {
                  languages = languages.filter((lId) => lId !== l.id)
                } else {
                  languages = [...languages, l.id!]
                }
                const s = { ...search, languages }
                phraseSearch(s)
                  .then((searchResults) => {
                    dispatch({
                      action: "search",
                      search: s,
                      searchResults,
                    })
                    setLanguageMenuAnchorEl(null)
                  })
                  .catch(errorHandler(dispatch))
              }}
            />
          </LabelWithHelp>
        </Grid>
      </Grid>
    </Stack>
  )
}

type LanguagePickerProps = {
  languages: Language[]
  languageIds: number[]
  onDelete: (Language) => VoidFunction
  onAdd: (Language) => VoidFunction
}
const LanguagePickerWidget: React.FC<LanguagePickerProps> = ({
  languages,
  languageIds,
  onDelete,
  onAdd,
}) => {
  const [languageMenuAnchorEl, setLanguageMenuAnchorEl] =
    React.useState<null | HTMLElement>(null)
  const languageMenuOpen = Boolean(languageMenuAnchorEl)
  return (
    <Stack direction="row" spacing={1} sx={{ justifyContent: "space-between" }}>
      <Box>
        {!languageIds.length && <FauxPlaceholder>Languages</FauxPlaceholder>}
        {languageIds.map((l) => {
          const lang = languages?.find((lang) => lang.id === l)
          if (!lang) return <></>
          return (
            <Chip
              label={lang.locale}
              key={lang.id}
              size="small"
              onDelete={onDelete(lang)}
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
            selected={languageIds.some((lId) => lId === l.id)}
            onClick={onAdd(l)}
          >
            {l.name}
          </MenuItem>
        ))}
      </Menu>
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
  const search = state.similaritySearch!
  const { phrase, languages: langs, limit } = search
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
                languages: langs,
                phrase: e.target.value,
              }
              similaritySearch(params)
                .then((searchResults) =>
                  dispatch({
                    action: "similaritySearch",
                    search,
                    searchResults,
                  })
                )
                .catch(errorHandler(dispatch))
            }, 500) as React.ChangeEventHandler<HTMLInputElement>
          }
        />
      </Grid>
      <Grid size={2}>
        <LanguagePickerWidget
          languageIds={langs ?? []}
          languages={languages ?? []}
          onDelete={(l) => () => {
            const languageIds = langs!.filter((lId) => lId !== l.id)
            const s = { ...search, languages: languageIds }
            similaritySearch(s)
              .then((searchResults) =>
                dispatch({
                  action: "similaritySearch",
                  search: s,
                  searchResults,
                })
              )
              .then(errorHandler(dispatch))
          }}
          onAdd={(l) => () => {
            const languageIds = [...(langs ?? []), l.id]
            const s = { ...search, languages: languageIds }
            similaritySearch(s)
              .then((searchResults) =>
                dispatch({
                  action: "similaritySearch",
                  search: s,
                  searchResults,
                })
              )
              .then(errorHandler(dispatch))
          }}
        />
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
                      search,
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
                  phraseSearch(search)
                    .then((searchResults) =>
                      dispatch({ action: "search", search, searchResults })
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
