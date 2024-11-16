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
import LocalOfferIcon from "@mui/icons-material/LocalOffer"
import React, { useEffect, useState } from "react"
import {
  AppState,
  AppTabs,
  Citation,
  Language,
  Phrase,
  Tag,
} from "../types/common"
import { Action, errorHandler } from "../util/reducer"
import { LabelWithHelp } from "./LabelWithHelp"
import debounce from "lodash/debounce"
import isEqual from "lodash/isEqual"
import { Save, Language as LanguageIcon } from "@mui/icons-material"
import AddIcon from "@mui/icons-material/Add"
import RemoveIcon from "@mui/icons-material/Remove"
import { knownTags, perhapsStaleLanguages, savePhrase } from "../util/database"
import { TagChip } from "./TagChip"

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
  return (
    <>
      <Box>
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

type TagWidgeProps = {
  hideHelp: boolean
  tags: Tag[] | undefined
  presentTags: number[] | undefined
  addTag: (tag: Tag) => void
  removeTag: (tag: Tag) => void
  dispatch: React.Dispatch<Action>
}
/** Displays tags and allows their addition or removal */
const TagWidget: React.FC<TagWidgeProps> = ({
  hideHelp,
  tags,
  presentTags,
  addTag,
  removeTag,
  dispatch,
}) => {
  const [addTagMenuAnchorEl, setAddTagMenuAnchorEl] =
    React.useState<null | HTMLElement>(null)
  const [removeTagMenuAnchorEl, setRemoveTagMenuAnchorEl] =
    React.useState<null | HTMLElement>(null)
  const addTagMenuOpen = Boolean(addTagMenuAnchorEl)
  const removeTagMenuOpen = Boolean(removeTagMenuAnchorEl)
  const usedTags = new Set<number>(presentTags)
  console.log("tags", { presentTags, usedTags })
  return (
    <LabelWithHelp
      hidden={hideHelp}
      label="Tags"
      explanation={
        <>
          <Typography>
            See the Tags tab:{" "}
            <Link
              onClick={() => dispatch({ action: "tab", tab: AppTabs.Tags })}
            >
              <LocalOfferIcon fontSize="inherit" />
            </Link>
            .
          </Typography>
          {!tags?.length && (
            <Typography>You currently have no defined tags.</Typography>
          )}
        </>
      }
    >
      {tags && !!tags.length && (
        <Stack
          direction="row"
          spacing={1}
          sx={{ justifyContent: "space-between" }}
        >
          <Stack direction="row" spacing={1}>
            {presentTags
              ?.map((i) => tags.find((t: Tag) => t.id === i)!)
              .map((t) => (
                <TagChip key={t.id} tag={t} />
              ))}
          </Stack>
          <Stack direction="row" spacing={1}>
            {(!presentTags || tags.length > presentTags.length) && (
              <>
                <Tooltip arrow title="Add a tag">
                  <IconButton
                    color="primary"
                    size="small"
                    onClick={(e) => setAddTagMenuAnchorEl(e.currentTarget)}
                  >
                    <AddIcon fontSize="inherit" />
                  </IconButton>
                </Tooltip>
                <Menu
                  anchorEl={addTagMenuAnchorEl}
                  open={addTagMenuOpen}
                  onClose={() => setAddTagMenuAnchorEl(null)}
                >
                  {tags
                    .filter((t) => !usedTags.has(t.id!))
                    .map((t) => (
                      <MenuItem
                        key={t.id!}
                        onClick={() => {
                          addTag(t)
                          setAddTagMenuAnchorEl(null)
                        }}
                      >
                        {t.name}
                      </MenuItem>
                    ))}
                </Menu>
              </>
            )}
            {!!presentTags?.length && (
              <>
                <Tooltip arrow title="Remove a tag">
                  <IconButton
                    color="primary"
                    size="small"
                    onClick={(e) => setRemoveTagMenuAnchorEl(e.currentTarget)}
                  >
                    <RemoveIcon fontSize="inherit" />
                  </IconButton>
                </Tooltip>
                <Menu
                  anchorEl={removeTagMenuAnchorEl}
                  open={removeTagMenuOpen}
                  onClose={() => setRemoveTagMenuAnchorEl(null)}
                >
                  {tags
                    .filter((t) => usedTags.has(t.id!))
                    .map((t) => (
                      <MenuItem
                        key={t.id!}
                        onClick={() => {
                          removeTag(t)
                          setRemoveTagMenuAnchorEl(null)
                        }}
                      >
                        {t.name}
                      </MenuItem>
                    ))}
                </Menu>
              </>
            )}
          </Stack>
        </Stack>
      )}
    </LabelWithHelp>
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
