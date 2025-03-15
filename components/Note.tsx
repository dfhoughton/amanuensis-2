import {
  Badge,
  Box,
  Button,
  Chip,
  Divider,
  IconButton,
  Link,
  Menu,
  MenuItem,
  Paper,
  Stack,
  SxProps,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material"
import Grid from "@mui/material/Grid2"
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  AppState,
  Citation,
  Language,
  Phrase,
  Tag,
  UrlSearch,
} from "../types/common"
import { Action, errorHandler, selectCitation } from "../util/reducer"
import { LabelWithHelp } from "./LabelWithHelp"
import debounce from "lodash/debounce"
import isEqual from "lodash/isEqual"
import { Save, Language as LanguageIcon } from "@mui/icons-material"
import MoreVertIcon from "@mui/icons-material/MoreVert"
import StarRateIcon from "@mui/icons-material/StarRate"
import DeleteIcon from "@mui/icons-material/Delete"
import {
  deleteRelation,
  knownTags,
  perhapsStaleLanguages,
  phrasesForRelations,
  phrasesOnPage,
  savePhrase,
} from "../util/database"
import { TagWidget } from "./TagWidget"
import { sortTags, tagSearch } from "./Tags"
import { FauxPlaceholder } from "./FauxPlaceholder"

type NoteProps = {
  state: AppState
  dispatch: React.Dispatch<Action>
}

export const Note: React.FC<NoteProps> = ({ state, dispatch }) => {
  const { phrase, priorPhrase, citationIndex = 0 } = state
  const [languages, setLanguages] = useState<Language[]>([])
  const [currentLanguage, setCurrentLanguage] = useState<Language>()
  const [note, setNote] = useState(phrase?.note)
  useEffect(() => {
    setNote(phrase?.note)
  }, [phrase?.note])
  useEffect(() => {
    perhapsStaleLanguages()
      .then((languages) => {
        setLanguages(languages)
        setCurrentLanguage(languages.find((l) => l.id === phrase?.languageId))
      })
      .catch(errorHandler(dispatch))
  }, [state.languageId])
  const [tags, setTags] = useState<Tag[] | undefined>()
  useEffect(() => {
    knownTags()
      .then((tags) => setTags(sortTags(tags)))
      .catch(errorHandler(dispatch))
  }, [])
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
  const [languageMenuAnchorEl, setLanguageMenuAnchorEl] =
    React.useState<null | HTMLElement>(null)
  const lemmaRef = useRef<HTMLInputElement>()
  const noteRef = useRef<HTMLInputElement>()
  const languageMenuOpen = Boolean(languageMenuAnchorEl)
  const citation = phrase?.citations[citationIndex]
  const clean = isEqual(phrase, priorPhrase)
  const helpHidden = !state.config?.showHelp
  const changeLanguage = (language: Language) => () => {
    setLanguageMenuAnchorEl(null)
    if (phrase?.languageId !== language.id) {
      setCurrentLanguage(language)
      dispatch({ action: "changeLanguage", language })
    }
  }
  const save = () =>
    savePhrase(phrase!).then((p) => dispatch({ action: "phraseSaved" }))
  return (
    <>
      <Box
        onKeyDown={(e) => {
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
            <Grid container columns={6}>
              <Grid size={5}>
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
                    sx={{ width: "100%" }}
                    inputRef={lemmaRef}
                  />
                </LabelWithHelp>
              </Grid>
              <Grid size={1}>
                <Stack
                  sx={{
                    display: "inline-table",
                    float: "right",
                  }}
                >
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
                        onClick={save}
                      >
                        <Save fontSize="inherit" />
                      </IconButton>
                    </span>
                  </Tooltip>
                  {languages.length > 1 && (
                    <>
                      <Tooltip
                        arrow
                        title="Change language assignment for note"
                      >
                        <Badge
                          badgeContent={
                            currentLanguage?.locale === "und"
                              ? undefined
                              : currentLanguage?.locale
                          }
                          overlap="circular"
                          color="secondary"
                        >
                          <IconButton
                            color="primary"
                            size="small"
                            onClick={(e) =>
                              setLanguageMenuAnchorEl(e.currentTarget)
                            }
                          >
                            <LanguageIcon fontSize="inherit" />
                          </IconButton>
                        </Badge>
                      </Tooltip>
                      <Menu
                        MenuListProps={{ dense: true }}
                        anchorEl={languageMenuAnchorEl}
                        open={languageMenuOpen}
                        onClose={() => setLanguageMenuAnchorEl(null)}
                      >
                        {languages
                          .sort((a, b) => (a.name < b.name ? -1 : 1))
                          .map((l) => (
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
              </Grid>
            </Grid>
            <LabelWithHelp
              hidden={helpHidden}
              label="Lemma Note"
              explanation={"A note that pertains to all citations."}
              sx={{ pb: 1 }}
            >
              <TextField
                multiline
                autoFocus
                onChange={(e) => {
                  dispatch({
                    action: "phrase",
                    phrase: { ...phrase!, note: e.target.value },
                  })
                }}
                variant="standard"
                hiddenLabel
                placeholder="Lemma Note"
                value={note}
                sx={{ width: "100%" }}
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
              onClick={(tag: Tag) => tagSearch(tag, dispatch)}
            />
            <Divider sx={{ my: 0.5 }} />
            <LabelWithHelp
              hidden={helpHidden}
              label="Related Phrases"
              explanation={
                <>
                  Phrases that have some notable relation to{" "}
                  <i>{phrase.lemma}</i>.
                </>
              }
              sx={{ pb: 1 }}
            >
              <Stack direction="row" spacing={1} sx={{ width: "100%" }}>
                {!phrase.relatedPhrases?.size && (
                  <FauxPlaceholder>Relations</FauxPlaceholder>
                )}
                {!!phrase.relatedPhrases?.size &&
                  Array.from(phrase.relatedPhrases!.entries())
                    .sort((a, b) => (a[1][1].lemma < b[1][1].lemma ? -1 : 1)) // put them in alphabetical order
                    .map(([pid, [rid, p]]) => {
                      return (
                        <Chip
                          key={pid}
                          label={p.lemma}
                          size="small"
                          variant="outlined"
                          onClick={() => {
                            // todo: add confirmation modal to protect unsaved state
                            dispatch({ action: "relationClicked", phrase: p })
                            lemmaRef.current!.value = p.lemma
                            noteRef.current!.value = p.note ?? ""
                          }}
                          onDelete={() => {
                            deleteRelation(rid)
                              .then(() => {
                                const relations = phrase.relations!.filter(
                                  (n) => n !== rid
                                )
                                dispatch({
                                  action: "relationsChanged",
                                  relations,
                                })
                              })
                              .catch(errorHandler(dispatch))
                          }}
                        />
                      )
                    })}
              </Stack>
            </LabelWithHelp>
            {phrase?.citations.map((c, i) => (
              <CitationInBrief
                phrase={phrase}
                citation={c}
                citationIndex={i}
                key={i}
                tags={tags}
                chosen={state.citationIndex === i}
                helpHidden={helpHidden}
                onlyCitation={(phrase?.citations.length ?? 0) < 2}
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
  onlyCitation: boolean
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
  onlyCitation,
  state,
  dispatch,
}) => {
  const [moreMenuAnchorEl, setMoreMenuAnchorEl] =
    React.useState<null | HTMLElement>(null)
  const separation = citationIndex === 0 ? 2 : 1
  const divider = <Divider sx={{ mt: separation, mb: separation }} />
  if (chosen)
    return (
      <Stack spacing={1}>
        {divider}
        <LabelWithHelp hidden={hidden} label="Title and URL">
          <Grid container columns={12}>
            <Grid size={onlyCitation ? 12 : 11}>
              <TitleDateAndUrl
                citation={citation}
                state={state}
                dispatch={dispatch}
                phrase={phrase}
              />
            </Grid>
            {!onlyCitation && (
              <Grid size={1}>
                <IconButton
                  color="primary"
                  size="small"
                  onClick={(e) => setMoreMenuAnchorEl(e.currentTarget)}
                >
                  <MoreVertIcon fontSize="inherit" />
                </IconButton>
                <Menu
                  MenuListProps={{ dense: true }}
                  anchorEl={moreMenuAnchorEl}
                  open={Boolean(moreMenuAnchorEl)}
                  onClose={() => setMoreMenuAnchorEl(null)}
                >
                  <MenuItem>
                    <Tooltip title="The canonical citation is the one shown by default">
                      <Button
                        color="secondary"
                        size="small"
                        disabled={citation.canonical}
                        sx={{ width: "100%" }}
                        endIcon={<StarRateIcon fontSize="inherit" />}
                        onClick={() => {
                          const i = phrase.citations.findIndex(
                            (c) => c === citation
                          )
                          const citations = phrase.citations.map((c) => ({
                            ...c,
                            canonical: false,
                          }))
                          citations[i].canonical = true
                          console.log("citations", citations)
                          dispatch({
                            action: "phrase",
                            phrase: { ...phrase, citations },
                          })
                          dispatch({
                            action: "message",
                            message:
                              "displayed citation marked as canonical; change not yet saved",
                          })
                          setMoreMenuAnchorEl(null)
                        }}
                      >
                        Canonical
                      </Button>
                    </Tooltip>
                  </MenuItem>
                  <MenuItem>
                    <Button
                      color="primary"
                      size="small"
                      sx={{ width: "100%" }}
                      endIcon={<DeleteIcon fontSize="inherit" />}
                      onClick={() => {
                        const i = phrase.citations.findIndex(
                          (c) => c === citation
                        )
                        const citations = phrase.citations
                        citations.splice(i, 1)
                        dispatch({
                          action: "phrase",
                          citationIndex: selectCitation(citations),
                          phrase: { ...phrase, citations },
                        })
                        dispatch({
                          action: "message",
                          message:
                            "citation removed from phrase; change not yet saved",
                        })
                        setMoreMenuAnchorEl(null)
                      }}
                    >
                      Delete
                    </Button>
                  </MenuItem>
                </Menu>
              </Grid>
            )}
          </Grid>
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
          onClick={(tag: Tag) => tagSearch(tag, dispatch)}
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
          bgcolor: "primary.light",
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
  urlSearch: UrlSearch | undefined
  dispatch: React.Dispatch<Action>
}

// a link that will highlight
const CitationLink: React.FC<CitationLinkProps> = ({
  dispatch,
  phrase,
  citation,
  urlSearch,
}) => {
  const { url } = citation
  const { citations } = phrase
  const i = citations!.indexOf(citation)
  const sx = useMemo<SxProps>(
    () => ({
      fontSize: "small",
      whiteSpace: "nowrap",
      overflow: "hidden",
      textOverflow: "ellipsis",
    }),
    []
  )
  const dontRepeatSearch = urlSearch && url === urlSearch.url
  const linkHandler = useCallback(() => {
    if (url) {
      ;(async () => {
        let [tab] = await chrome.tabs.query({
          active: true,
          lastFocusedWindow: true,
        })
        if (tab === undefined) {
          // try a different query
          const tabs = await chrome.tabs.query({
            active: true,
            currentWindow: true,
          })
          if (tabs.length === 1) tab = tabs[0]
        }
        if (tab?.id) {
          if (citation.url) {
            const url = citation.url
            chrome.tabs.sendMessage(
              tab.id,
              {
                action: "goto",
                citation: citation,
              },
              (response) => {
                if (!dontRepeatSearch) {
                  phrasesOnPage({ url })
                    .then((searchResults) => {
                      dispatch({
                        action: "urlSearch",
                        search: { url },
                        searchResults,
                      })
                    })
                    .catch(errorHandler(dispatch))
                }
              }
            )
          }
        } else {
          console.error("could not find tab for citation", citation)
        }
      })()
      dispatch({ action: "goto", phrase, citationIndex: i })
    } else {
      dispatch({
        action: "message",
        messageLevel: "warning" as any,
        message: "This citation has no recorded URL.",
      })
    }
  }, [phrase, i])
  if (!url)
    return (
      <Typography sx={sx}>
        <i>no URL</i>
      </Typography>
    )
  return (
    <Tooltip arrow title={url}>
      <Link sx={{ cursor: "pointer" }} onClick={linkHandler}>
        <Typography sx={sx}>{url}</Typography>
      </Link>
    </Tooltip>
  )
}

type TitleDateAndUrlProps = {
  citation: Citation
  phrase?: Phrase
  state: AppState
  dispatch: React.Dispatch<Action>
}

const TitleDateAndUrl: React.FC<TitleDateAndUrlProps> = ({
  citation,
  dispatch,
  state,
  phrase,
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
        dispatch={dispatch}
        phrase={phrase!}
        citation={citation}
        urlSearch={state.urlSearch}
      />
    </Stack>
  )
}
