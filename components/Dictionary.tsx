import React, { useEffect, useRef, useState } from "react"
import {
  AppState,
  FreeFormSearch,
  Language,
  Phrase,
  SearchResults,
  SearchTabs,
  SimilaritySearch,
  Sort,
  SortDirection,
  SortType,
  Tag,
  UrlSearch,
} from "../types/common"
import { Action, errorHandler } from "../util/reducer"
import {
  Avatar,
  Badge,
  Box,
  Button,
  Chip,
  Divider,
  IconButton,
  Menu,
  MenuItem,
  Modal,
  Pagination,
  Paper,
  Skeleton,
  Stack,
  SxProps,
  Tab,
  TextField,
  Theme,
  Tooltip,
  Typography,
} from "@mui/material"
import { Language as LanguageIcon } from "@mui/icons-material"
import MergeIcon from "@mui/icons-material/Merge"
import DeleteIcon from "@mui/icons-material/Delete"
import LinkIcon from "@mui/icons-material/Link"
import SortIcon from "@mui/icons-material/Sort"
import ClearIcon from "@mui/icons-material/Clear"
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward"
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward"
import Grid from "@mui/material/Grid2"
import isEqual from "lodash/isEqual"
import {
  createRelation,
  deletePhrase,
  knownTags,
  mergePhrases,
  perhapsStaleLanguages,
  phraseSearch,
  phrasesForRelations,
  phrasesOnPage,
  similaritySearch,
} from "../util/database"
import { TagWidget } from "./TagWidget"
import { LabelWithHelp } from "./LabelWithHelp"
import debounce from "lodash/debounce"
import { FauxPlaceholder } from "./FauxPlaceholder"
import { TabContext, TabList, TabPanel } from "@mui/lab"
import { ConfirmationModal } from "./ConfirmationModal"
import { TagChip } from "./TagChip"
import {
  defaultDistanceMetric,
  defaultMaxSimilarPhrases,
} from "../util/similarity_sorter"
import { sortTags } from "./Tags"

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
    similaritySearch: sSearch = {
      phrase: "",
      metric: state.config?.distanceMetric ?? defaultDistanceMetric,
      limit: defaultMaxSimilarPhrases,
    }, // TODO: don't just type in these constants willy-nilly
    searchResults,
    searchTab = SearchTabs.Free,
    freeSearchResults,
    similaritySearchResults,
    urlSearch: uSearch = { url: "", limit: 10 }, // TODO: don't just type in these constants willy-nilly
    urlSearchResults,
    phrase,
  } = state
  const [fs, setFs] = useState<FreeFormSearch>(freeSearch)
  const [ss, setSs] = useState<SimilaritySearch>(sSearch)
  const [us, setUs] = useState<UrlSearch>(uSearch)
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
    } else if (searchTab == SearchTabs.Similar) {
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
    } else {
      if (
        !(
          searchResults &&
          isEqual(searchResults, urlSearchResults) &&
          isEqual(uSearch, us)
        )
      ) {
        phrasesOnPage(uSearch)
          .then((searchResults) => {
            setUs(uSearch)
            dispatch({
              action: "urlSearch",
              searchResults,
              search: uSearch,
            })
          })
          .catch(errorHandler(dispatch))
      }
    }
  }, [
    freeSearch,
    sSearch,
    uSearch,
    searchResults,
    freeSearchResults,
    similaritySearchResults,
    urlSearchResults,
    searchTab,
  ])
  const [languages, setLanguages] = useState<Language[]>([])
  useEffect(() => {
    perhapsStaleLanguages()
      .then((languages) => setLanguages(languages))
      .catch(errorHandler(dispatch))
  }, [])
  // we need related phrases for the link widgets
  useEffect(() => {
    if (!phrase) return
    if (phrase.relations) {
      phrasesForRelations(phrase.relations)
        .then((relatedPhrases) => {
          relatedPhrases.delete(phrase.id!)
          dispatch({ action: "relatedPhrasesChanged", relatedPhrases })
        })
        .catch(errorHandler(dispatch))
    } else {
      dispatch({ action: "relatedPhrasesChanged", relatedPhrases: new Map() })
    }
  }, [phrase?.relations])
  return (
    <>
      <TabContext value={searchTab}>
        <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
          <TabList
            onChange={(_e, val) =>
              dispatch({ action: "switchSearch", tab: val })
            }
          >
            <Tab label="Search" value={SearchTabs.Free} />
            <Tab label="Similar Phrases" value={SearchTabs.Similar} />
            <Tab label="Citations on Page" value={SearchTabs.Page} />
          </TabList>
        </Box>
        <TabPanel value={SearchTabs.Free}>
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
        <TabPanel value={SearchTabs.Similar}>
          <SimilaritySearchForm
            languages={languages}
            state={state}
            dispatch={dispatch}
          />
        </TabPanel>
        <TabPanel value={SearchTabs.Page}>
          <UrlSearchForm state={state} dispatch={dispatch} />
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
        <SearchResultsWidget
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
      .then((tags) => setTags(sortTags(tags)))
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
      <Grid container columns={14} spacing={1} sx={{ width: "100%" }}>
        <Grid size={6}>
          <TagWidget
            hideHelp={hideHelp}
            tags={tags}
            presentTags={search.tags}
            dispatch={dispatch}
            addTag={(t) => {
              const tags = [...(search.tags ?? []), t.id!]
              const s = { ...search, tags, page: 1 }
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
              const s = { ...search, tags, page: 1 }
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
                const s = { ...search, languages, page: 1 }
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
        <Grid size={1}>
          <SortWidget state={state} search={search} dispatch={dispatch} />
        </Grid>
        <Grid size={1}>
          <ClearWidget dispatch={dispatch} />
        </Grid>
      </Grid>
    </Stack>
  )
}

type ClearWidgetProps = {
  dispatch: React.Dispatch<Action>
}
const ClearWidget: React.FC<ClearWidgetProps> = ({ dispatch }) => (
  <Tooltip arrow title="clear search form">
    <IconButton
      color="primary"
      size="small"
      onClick={() => {
        phraseSearch({})
          .then((searchResults) =>
            dispatch({
              action: "search",
              search: {},
              searchResults,
            })
          )
          .catch(errorHandler(dispatch))
      }}
    >
      <ClearIcon fontSize="inherit" />
    </IconButton>
  </Tooltip>
)

type SortWidgetProps = {
  state: AppState
  search: FreeFormSearch
  dispatch: React.Dispatch<Action>
}
const SortWidget: React.FC<SortWidgetProps> = ({ state, search, dispatch }) => {
  const [sortMenuAnchorEl, setSortMenuAnchorEl] =
    React.useState<null | HTMLElement>(null)
  const sortMenuAnchor = useRef<SVGSVGElement>(null)
  const sortMenuOpen = Boolean(sortMenuAnchorEl)
  const sort = state.freeSearch?.sort ?? {
    type: SortType.Lemma,
    direction: SortDirection.Ascending,
  }
  return (
    <>
      <Tooltip
        arrow
        title={
          <>
            Sort by lemma (L), creation date (C), time of last edit (E),
            ascending (<ArrowUpwardIcon fontSize="inherit" />) or descending (
            <ArrowDownwardIcon fontSize="inherit" />)
          </>
        }
      >
        <IconButton
          color="primary"
          size="small"
          onClick={(e) => setSortMenuAnchorEl(e.currentTarget)}
        >
          <Badge
            badgeContent={<SortBadgeDescription sort={sort} />}
            color="secondary"
            invisible={
              sort.direction === SortDirection.Ascending &&
              sort.type === SortType.Lemma
            }
          >
            <SortIcon fontSize="inherit" ref={sortMenuAnchor} />
          </Badge>
        </IconButton>
      </Tooltip>
      <Menu
        MenuListProps={{ dense: true }}
        anchorEl={sortMenuAnchorEl}
        open={sortMenuOpen}
        onClose={() => setSortMenuAnchorEl(null)}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.preventDefault()
            setSortMenuAnchorEl(null)
          }
        }}
      >
        {sorts.map(({ description, sort: s }, i) => (
          <MenuItem
            key={i}
            selected={s.type === sort.type && s.direction === sort.direction}
            onClick={() => {
              setSortMenuAnchorEl(null)
              search = { ...search, sort: s, page: 1 }
              phraseSearch(search)
                .then((searchResults) =>
                  dispatch({
                    action: "search",
                    search,
                    searchResults,
                  })
                )
                .catch(errorHandler(dispatch))
            }}
          >
            {description}
          </MenuItem>
        ))}
      </Menu>
    </>
  )
}

const SortBadgeDescription: React.FC<{ sort: Sort }> = ({ sort: s }) => {
  const t =
    s.type === SortType.Lemma ? "L" : s.type === SortType.Creation ? "C" : "U"
  const d =
    s.direction == SortDirection.Ascending ? (
      <ArrowUpwardIcon fontSize="inherit" />
    ) : (
      <ArrowDownwardIcon fontSize="inherit" />
    )
  return (
    <Box sx={{ textWrap: "nowrap" }}>
      {t}
      {d}
    </Box>
  )
}

const sorts: Array<{ description: string; sort: Sort }> = [
  {
    description: "by lemma ascending",
    sort: { type: SortType.Lemma, direction: SortDirection.Ascending },
  },
  {
    description: "by lemma descending",
    sort: { type: SortType.Lemma, direction: SortDirection.Descending },
  },
  {
    description: "by creation date ascending",
    sort: { type: SortType.Creation, direction: SortDirection.Ascending },
  },
  {
    description: "by creation date descending",
    sort: { type: SortType.Creation, direction: SortDirection.Descending },
  },
  {
    description: "by time of last update ascending",
    sort: { type: SortType.Update, direction: SortDirection.Ascending },
  },
  {
    description: "by time of last update descending",
    sort: { type: SortType.Update, direction: SortDirection.Descending },
  },
]

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
  const languageMenuAnchor = useRef<SVGSVGElement>(null)
  const languageMenuOpen = Boolean(languageMenuAnchorEl)
  return (
    <Stack direction="row" spacing={1} sx={{ justifyContent: "space-between" }}>
      <Box
        onClick={() =>
          setLanguageMenuAnchorEl(languageMenuAnchor.current as any)
        }
      >
        {!languageIds.length && <FauxPlaceholder>Languages</FauxPlaceholder>}
        {!!languages &&
          languageIds
            .map((l) => languages.find((lang) => lang.id === l)!)
            .sort((a, b) => (a.name < b.name ? -1 : 1))
            .filter((l) => l)
            .map((lang) => (
              <Chip
                label={lang.locale}
                key={lang.id}
                size="small"
                onDelete={onDelete(lang)}
              />
            ))}
      </Box>
      <Tooltip arrow title="Filter by language">
        <IconButton
          color="primary"
          size="small"
          onClick={(e) => setLanguageMenuAnchorEl(e.currentTarget)}
        >
          <LanguageIcon fontSize="inherit" ref={languageMenuAnchor} />
        </IconButton>
      </Tooltip>
      <Menu
        MenuListProps={{ dense: true }}
        anchorEl={languageMenuAnchorEl}
        open={languageMenuOpen}
        onClose={() => setLanguageMenuAnchorEl(null)}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.preventDefault()
            setLanguageMenuAnchorEl(null)
          }
        }}
      >
        {!!languages &&
          languages
            .sort((a, b) => (a.name < b.name ? -1 : 1))
            .map((l) => {
              const selected = languageIds.some((lId) => lId === l.id)
              return (
                <MenuItem
                  key={l.id!}
                  selected={selected}
                  disabled={selected}
                  onClick={onAdd(l)}
                >
                  {l.name}
                </MenuItem>
              )
            })}
      </Menu>
    </Stack>
  )
}

type UrlSearchFormProps = {
  state: AppState
  dispatch: React.Dispatch<Action>
}
const UrlSearchForm: React.FC<UrlSearchFormProps> = ({ state, dispatch }) => {
  const search = state.urlSearch ?? {
    url: "",
    limit: 10,
  }
  const { url } = search
  return (
    <TextField
      hiddenLabel
      sx={{ width: "100%" }}
      placeholder="URL"
      defaultValue={url}
      variant="standard"
      onChange={
        debounce((e: React.ChangeEvent<HTMLInputElement>) => {
          const params: UrlSearch = {
            url: e.target.value,
          }
          phrasesOnPage(params)
            .then((searchResults) =>
              dispatch({
                action: "urlSearch",
                search: { ...search, page: 1 },
                searchResults,
              })
            )
            .catch(errorHandler(dispatch))
        }, 500) as React.ChangeEventHandler<HTMLInputElement>
      }
    />
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
  const metric = state.config?.distanceMetric ?? defaultDistanceMetric
  const search = state.similaritySearch ?? {
    phrase: "",
    metric,
    languages: [],
    limit: defaultMaxSimilarPhrases,
  }
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
                metric,
                languages: langs,
                phrase: e.target.value,
              }
              similaritySearch(params)
                .then((searchResults) =>
                  dispatch({
                    action: "similaritySearch",
                    search: { ...search, page: 1 },
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
            const s = { ...search, languages: languageIds, page: 1 }
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
            const s = { ...search, languages: languageIds, page: 1 }
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
                search = { ...search, [field]: ts, page: 1 }
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
                  search = { ...search, [field]: ts, page: 1 }
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
          search = { ...search, [field]: ts, page: 1 }
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

const SearchResultsWidget: React.FC<SearchFormProps> = ({
  state,
  searchResults,
  dispatch,
  languages,
}) => {
  const [mergePhrase, setMergePhrase] = useState<Phrase>()
  const [deletedPhrase, setDeletedPhrase] = useState<Phrase>()
  const { phrase } = state
  const { phrases, page, pages, total, pageSize } = searchResults
  const firstResult = pageSize * (page - 1) + 1
  const lastResult = firstResult + phrases.length - 1
  const iconStyle: SxProps<Theme> = { position: "relative", top: "4px" }
  return (
    <>
      <Stack spacing={1} sx={{ alignItems: "flex-start", width: "100%" }}>
        <Stack
          direction="row"
          spacing={0.5}
          flexWrap="nowrap"
          sx={{ width: "100%", justifyContent: "space-between" }}
        >
          <Pagination
            page={page}
            count={pages}
            size="small"
            siblingCount={0}
            onChange={(_e, p) => {
              if (state.searchTab === SearchTabs.Free) {
                const s: FreeFormSearch = { ...state.freeSearch, page: p }
                phraseSearch(s)
                  .then((results) =>
                    dispatch({
                      action: "search",
                      search: s,
                      searchResults: results,
                    })
                  )
                  .catch(errorHandler(dispatch))
              } else if (state.searchTab === SearchTabs.Page) {
                const s: UrlSearch = { ...state.urlSearch, page: p } as any
                phrasesOnPage(s).then((results) =>
                  dispatch({
                    action: "urlSearch",
                    search: s,
                    searchResults: results,
                  })
                )
              } else {
                const s: SimilaritySearch = {
                  ...state.similaritySearch,
                  page: p,
                } as any
                similaritySearch(s)
                  .then((results) =>
                    dispatch({
                      action: "similaritySearch",
                      search: s,
                      searchResults: results,
                    })
                  )
                  .catch(errorHandler(dispatch))
              }
            }}
          />
          <Box sx={{ fontSize: "0.875rem" }}>
            {total === 0 && <b>none found</b>}
            {total > 0 && (
              <>
                <b>{firstResult}</b> &ndash; <b>{lastResult}</b> of{" "}
                <b>{total}</b>
              </>
            )}
          </Box>
        </Stack>
        {phrases.map((p, i) => {
          const selected = p.id === phrase?.id
          const unmergeable = selected || !phrase
          const linked = !!phrase?.relatedPhrases?.has(p.id!)
          const unlinkable = unmergeable || linked
          const lang = languages?.find((l) => l.id === p.languageId)
          return (
            <Box
              key={p.id}
              sx={{ width: "100%", cursor: "pointer" }}
              onClick={() => dispatch({ action: "selectResult", selected: i })}
            >
              <Divider sx={{ mb: 1 }} />
              <Paper
                elevation={0}
                sx={selected ? { bgcolor: "primary.light" } : undefined}
              >
                <Stack
                  direction="row"
                  spacing={1}
                  sx={{ p: 0.5, justifyContent: "space-between" }}
                >
                  <Box sx={{ fontWeight: 600 }}>{p.lemma}</Box>
                  <Box
                    sx={{
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {p.note}
                  </Box>
                  <Stack direction="row" spacing={0.5}>
                    {!!lang && (
                      <Chip label={lang.locale} key={lang.id} size="small" color="secondary"/>
                    )}
                    <Tooltip
                      arrow
                      enterDelay={500}
                      title={
                        unmergeable ? (
                          ""
                        ) : (
                          <>
                            merge with <i>{state.phrase!.lemma}</i>
                          </>
                        )
                      }
                    >
                      <MergeIcon
                        color={unmergeable ? "disabled" : "primary"}
                        fontSize="inherit"
                        sx={iconStyle}
                        onClick={
                          selected || !state.phrase
                            ? undefined
                            : (e) => {
                                e.stopPropagation()
                                setMergePhrase(p)
                              }
                        }
                      />
                    </Tooltip>
                    <Tooltip
                      arrow
                      enterDelay={500}
                      title={
                        linked ? (
                          <>
                            related to <i>{phrase!.lemma}</i>
                          </>
                        ) : unlinkable ? (
                          ""
                        ) : (
                          <>
                            mark as related to <i>{phrase!.lemma}</i>
                          </>
                        )
                      }
                    >
                      <LinkIcon
                        color={
                          linked
                            ? "success"
                            : unmergeable
                            ? "disabled"
                            : "primary"
                        }
                        fontSize="inherit"
                        sx={iconStyle}
                        onClick={
                          selected || !phrase
                            ? undefined
                            : (e) => {
                                e.stopPropagation()
                                createRelation(p, phrase!)
                                  .then((id) => {
                                    const relations = [
                                      ...(phrase!.relations ?? []),
                                      id,
                                    ]
                                    dispatch({
                                      action: "relationsChanged",
                                      relations,
                                      message: `${
                                        phrase!.lemma
                                      } is now linked to ${p.lemma}`,
                                    })
                                  })
                                  .catch(errorHandler(dispatch))
                              }
                        }
                      />
                    </Tooltip>
                    <DeleteIcon
                      color={"warning"}
                      fontSize="inherit"
                      sx={iconStyle}
                      onClick={(e) => {
                        e.stopPropagation()
                        setDeletedPhrase(p)
                      }}
                    />
                  </Stack>
                </Stack>
              </Paper>
            </Box>
          )
        })}
      </Stack>
      <MergeModal
        from={mergePhrase}
        to={state.phrase}
        close={() => setMergePhrase(undefined)}
        dispatch={dispatch}
      />
      <ConfirmationModal
        title={
          <>
            Delete <i>{deletedPhrase?.lemma}</i>
          </>
        }
        open={!!deletedPhrase}
        setOpen={(b) => !b && setDeletedPhrase(undefined)}
        okHandler={() => {
          deletePhrase(deletedPhrase!)
            .then(() => {
              setDeletedPhrase(undefined)
              dispatch({ action: "phraseDeleted", phrase: deletedPhrase! })
            })
            .catch(errorHandler(dispatch))
        }}
      >
        This action is irreversible!
      </ConfirmationModal>
    </>
  )
}

type MergeModalProps = {
  from?: Phrase
  to?: Phrase
  close: VoidFunction
  dispatch: React.Dispatch<Action>
}
const MergeModal: React.FC<MergeModalProps> = ({
  from: f,
  to,
  close,
  dispatch,
}) => {
  // in the case of an unsaved phrase, we want to switch which is from and which is to
  if (to && to.id === undefined) [f, to] = [to, f]
  const emptyPhrase = {
    lemma: "",
    tags: [],
    citations: [],
    updatedAt: new Date(),
    createdAt: new Date(),
  }
  const [merged, setMerged] = useState<Phrase>({ ...(to ?? emptyPhrase) })
  const [from, setFrom] = useState<Phrase>({ ...(f ?? emptyPhrase) })
  const [tags, setTags] = useState<Tag[]>([])
  useEffect(() => {
    setFrom({ ...(f ?? emptyPhrase) })
    setMerged({ ...(to ?? emptyPhrase) })
    knownTags()
      .then((tags) => setTags(tags))
      .catch(errorHandler(dispatch))
  }, [f, to])
  const closeAll = () => {
    close()
    setMerged(emptyPhrase)
    setFrom(emptyPhrase)
  }
  // do we need to merge anything other than citations?
  const anyMerging =
    f?.lemma &&
    to?.lemma &&
    (f.lemma !== to.lemma ||
      f.note !== to.note ||
      f.tags?.length !== to.tags?.length ||
      (f.tags && !to.tags) ||
      (to.tags && !f.tags) ||
      f.tags!.some((ft) => !to.tags!.some((mt) => mt === ft)))
  return (
    <Modal
      open={!!(from.lemma && to?.lemma)}
      onClose={close}
      aria-labelledby="modal-modal-title"
      aria-describedby="modal-modal-description"
    >
      <Stack
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.preventDefault()
            close()
          }
        }}
        spacing={1}
      >
        <Typography id="modal-modal-title" variant="h6" component="h2">
          Merge <i>{from?.lemma}</i> into <i>{merged?.lemma}</i>
        </Typography>
        <Typography id="modal-modal-description" sx={{ m: 2 }}>
          Information from <i>{from?.lemma}</i> to merge into <i>{to?.lemma}</i>
          . If only one entry has a particular field, that field will be used in
          the merged result.
        </Typography>
        {!anyMerging && (
          <>
            There are no conflicting fields between <i>{from?.lemma}</i> and{" "}
            <i>{to?.lemma}</i>. All the citations in the former will be
            transferred to the latter.
          </>
        )}
        {anyMerging && (
          <Box sx={{ mx: "-1.25rem !important" }}>
            <Grid
              container
              wrap="nowrap"
              columns={2}
              spacing={0.5}
              sx={{ width: "100%" }}
            >
              <Grid width={1} sx={{ textAlign: "center" }}>
                <i>{from.lemma}</i>
              </Grid>
              <Grid width={1} sx={{ textAlign: "center" }}>
                <i>{to?.lemma}</i>
              </Grid>
            </Grid>
            <ComparisonWidget
              from={from}
              to={merged}
              label="Lemma"
              field="lemma"
              setMerged={setMerged}
            />
            <ComparisonWidget
              from={from}
              to={merged}
              label="Note"
              field="note"
              multiline
              setMerged={setMerged}
            />
            {!!(f?.tags?.length && to?.tags?.length) && (
              <Grid
                container
                wrap="nowrap"
                columns={2}
                spacing={0.5}
                sx={{ width: "100%" }}
              >
                <Grid width={1}>
                  <Box>
                    {from.tags?.map((t, i) => {
                      const tag = tags.find((tag) => tag.id === t)!
                      const common = merged.tags!.some((o) => o === t)
                      return (
                        <TagChip
                          key={tag.id}
                          tag={tag}
                          onDelete={
                            common
                              ? undefined
                              : () => {
                                  const tags = from.tags!.filter(
                                    (t2) => t2 !== t
                                  )
                                  setFrom({ ...from, tags })
                                }
                          }
                          onClick={
                            common
                              ? undefined
                              : () => {
                                  const tags = [...merged.tags!, t]
                                  setMerged({ ...merged, tags })
                                }
                          }
                        />
                      )
                    })}
                  </Box>
                </Grid>
                <Grid width={1}>
                  <Box>
                    {merged.tags!.map((t, i) => {
                      const tag = tags.find((tag) => tag.id === t)!
                      return (
                        <TagChip
                          key={tag.id}
                          tag={tag}
                          onDelete={() => {
                            const tags = merged.tags!.filter((t2) => t2 !== t)
                            setMerged({ ...merged, tags })
                          }}
                        />
                      )
                    })}
                  </Box>
                </Grid>
              </Grid>
            )}
          </Box>
        )}
        <Stack
          spacing={2}
          direction="row"
          sx={{
            justifyContent: "flex-end",
            alignItems: "center",
          }}
        >
          <Button
            variant="contained"
            onClick={() => {
              mergePhrases(merged, f!)
                .then(() => {
                  dispatch({ action: "merged", phrase: merged })
                  closeAll()
                })
                .catch(errorHandler(dispatch))
            }}
          >
            Merge
          </Button>
          <Button variant="outlined" onClick={closeAll}>
            Cancel
          </Button>
        </Stack>
      </Stack>
    </Modal>
  )
}

type ComparisonWidgetProps = {
  label: string
  from?: Phrase
  to?: Phrase
  field: keyof Phrase
  multiline?: boolean
  setMerged: (Phrase) => void
}
const ComparisonWidget: React.FC<ComparisonWidgetProps> = ({
  label,
  from,
  to,
  field,
  multiline,
  setMerged,
}) => {
  if (
    !(
      from &&
      to &&
      from[field] &&
      to[field] &&
      /\S/.test(from[field] as string) &&
      /\S/.test(to[field] as string)
    )
  )
    return <></>
  const onChange = debounce((e: React.ChangeEvent<HTMLInputElement>) => {
    setMerged({ ...to, [field]: e.target.value })
  }, 250)
  return (
    <Grid
      container
      columns={2}
      spacing={0.5}
      wrap="nowrap"
      sx={{ width: "100%" }}
    >
      <Grid width={1}>
        <TextField
          fullWidth
          label={label}
          margin="dense"
          size="small"
          multiline={multiline}
          defaultValue={from[field]}
          disabled
        />
      </Grid>
      <Grid width={1}>
        <TextField
          fullWidth
          label={label}
          margin="dense"
          size="small"
          multiline={multiline}
          defaultValue={to[field]}
          onChange={onChange}
        />
      </Grid>
    </Grid>
  )
}
