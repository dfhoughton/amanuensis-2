import {
  Box,
  Chip,
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
import React, { useCallback, useEffect, useRef, useState } from "react"
import { AppState, Citation, Language, Phrase, Tag } from "../types/common"
import { Action, errorHandler } from "../util/reducer"
import { LabelWithHelp } from "./LabelWithHelp"
import debounce from "lodash/debounce"
import isEqual from "lodash/isEqual"
import { Save, Language as LanguageIcon } from "@mui/icons-material"
import {
  deleteRelation,
  knownTags,
  perhapsStaleLanguages,
  phrasesForRelations,
  savePhrase,
} from "../util/database"
import { TagWidget } from "./TagWidget"
import { tagSearch } from "./Tags"
import { FauxPlaceholder } from "./FauxPlaceholder"
import { MessageFromPopupToBackground } from "../util/switchboard"

type NoteProps = {
  state: AppState
  dispatch: React.Dispatch<Action>
}

export const Note: React.FC<NoteProps> = ({ state, dispatch }) => {
  const { phrase, priorPhrase, citationIndex = 0 } = state
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
    if (phrase?.languageId !== language.id)
      dispatch({ action: "changeLanguage", language })
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
                    onClick={save}
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
                inputRef={lemmaRef}
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
                inputRef={noteRef}
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
  dispatch: React.Dispatch<Action>
}

// a link that will highlight
const CitationLink: React.FC<CitationLinkProps> = ({
  dispatch,
  phrase,
  citation,
}) => {
  const { url } = citation
  const { citations } = phrase
  const i = citations!.indexOf(citation)
  const sx = {
    fontSize: "small",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  }
  const linkHandler = useCallback(() => {
    (async () => {
      const [tab] = await chrome.tabs.query({
        active: true,
        lastFocusedWindow: true,
      })
      if (tab?.id) {
        const response = await chrome.tabs.sendMessage(tab.id, {
          action: "goto",
          citation: citation,
        })
        console.log(response) // todo: response should indicate whether there is any selection
      } else {
        console.error("could not find tab for citation", citation)
      }
    })()
    dispatch({ action: "goto", phrase, citationIndex: i })
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
      <CitationLink dispatch={dispatch} phrase={phrase!} citation={citation} />
    </Stack>
  )
}
