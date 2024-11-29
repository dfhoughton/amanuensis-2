import React, { useEffect, useState } from "react"
import {
  AppState,
  FreeFormSearch,
  Language,
  Phrase,
  SearchResults,
  SearchTabs,
  SimilaritySearch,
  Tag,
} from "../types/common"
import { Action, errorHandler } from "../util/reducer"
import {
  Avatar,
  Box,
  Button,
  Chip,
  Divider,
  IconButton,
  Menu,
  MenuItem,
  Modal,
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
import Grid from "@mui/material/Grid2"
import isEqual from "lodash/isEqual"
import {
  deletePhrase,
  knownTags,
  mergePhrases,
  perhapsStaleLanguages,
  phraseSearch,
  similaritySearch,
} from "../util/database"
import { TagWidget } from "./TagWidget"
import { LabelWithHelp } from "./LabelWithHelp"
import debounce from "lodash/debounce"
import { FauxPlaceholder } from "./FauxPlaceholder"
import { TabContext, TabList, TabPanel } from "@mui/lab"
import { alpha } from "@mui/material/styles"
import { ConfirmationModal } from "./ConfirmationModal"
import { TagChip } from "./TagChip"

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
  const search = state.similaritySearch ?? {
    phrase: "",
    languages: [],
    limit: 10,
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
  languages,
}) => {
  const [mergePhrase, setMergePhrase] = useState<Phrase>()
  const [deletedPhrase, setDeletedPhrase] = useState<Phrase>()
  const unselectedStyle: SxProps<Theme> = {
    p: 0.5,
    justifyContent: "space-between",
  }
  const selectedStyle: SxProps<Theme> = {
    ...unselectedStyle,
    bgcolor: ({ palette }) => alpha(palette.primary.light, 0.2),
  }
  const iconStyle: SxProps<Theme> = { position: "relative", top: "4px" }
  return (
    <>
      {" "}
      <Stack spacing={1} sx={{ alignItems: "flex-start", width: "100%" }}>
        {searchResults.phrases.map((p, i) => {
          const selected = p.id === state.phrase?.id
          const unmergeable = selected || !state.phrase
          const lang = languages?.find((l) => l.id === p.languageId)
          return (
            <Box
              key={p.id}
              sx={{ width: "100%", cursor: "pointer" }}
              onClick={() => dispatch({ action: "selectResult", selected: i })}
            >
              <Divider sx={{ mb: 1 }} />
              <Stack
                direction="row"
                sx={selected ? selectedStyle : unselectedStyle}
              >
                <Box>{p.lemma}</Box>
                <Box
                  sx={{
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {p.note}
                </Box>
                <Stack direction="row" spacing={1}>
                  {!!lang && (
                    <Chip label={lang.locale} key={lang.id} size="small" />
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
      <Stack spacing={1}>
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
