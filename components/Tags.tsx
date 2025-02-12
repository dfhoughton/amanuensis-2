import React, { useEffect, useState } from "react"
import { AppState, AppTabs, Tag } from "../types/common"
import { Action, errorHandler } from "../util/reducer"
import {
  Box,
  Button,
  Divider,
  IconButton,
  Modal,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material"
import Grid from "@mui/material/Grid2"
import EditIcon from "@mui/icons-material/Edit"
import ContentCopyIcon from "@mui/icons-material/ContentCopy"
import AddIcon from "@mui/icons-material/Add"
import DeleteIcon from "@mui/icons-material/Delete"
import debounce from "lodash/debounce"
import { MuiColorInput } from "mui-color-input"
import { deleteTag, knownTags, phraseSearch, saveTag } from "../util/database"
import { TagChip } from "./TagChip"

type TagsProps = {
  state: AppState
  dispatch: React.Dispatch<Action>
}

export const Tags: React.FC<TagsProps> = ({ state, dispatch }) => {
  const [tags, setTags] = useState<Tag[] | undefined>()
  const [openAddTagModal, setOpenAddTagModal] = useState(false)
  const [version, setVersion] = useState(0)
  const { config = {} } = state
  useEffect(() => {
    knownTags()
      .then((tags) => {
        // sort the tags initially by creation order, then re-group by
        // style, within each style group, sort by name
        tags = sortTags(tags)
        setTags(tags)
      })
      .catch(errorHandler(dispatch))
  }, [version])
  const bumpVersion = () => setVersion(version + 1)
  const [modalTag, setModalTag] = useState<Tag>({ name: "" })
  return (
    <Box sx={{ minHeight: "400px" }}>
      <Stack direction="row" justifyContent={"space-between"}>
        <Typography variant="h5" component="h1">
          Tags
        </Typography>
        <Tooltip arrow title="Create a tag">
          <IconButton
            color="primary"
            size="small"
            onClick={() => {
              setModalTag({ name: "" })
              setOpenAddTagModal(true)
            }}
          >
            <AddIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Stack>
      {!!config.showHelp && (
        <Paper
          sx={{
            m: 1,
            p: 1,
            my: 2,
            fontSize: "smaller",
            fontStyle: "italic",
            border: "1px solid",
            borderColor: "background.paper",
          }}
        >
          You may add tags to notes and citations to mark common properties and
          make them discoverable.
        </Paper>
      )}
      <Stack spacing={0.75} sx={{ mt: 2 }}>
        {tags
          ?.filter((t) => !!t)
          .map((t, i) => (
            <Box key={t.id}>
              {!!i && <Divider />}
              <TagRow
                tag={t}
                setTag={setModalTag}
                setOpen={setOpenAddTagModal}
                bumpVersion={bumpVersion}
                dispatch={dispatch}
              />
            </Box>
          ))}
        {!tags?.length && <i>no tags yet</i>}
      </Stack>
      <EditTagModal
        open={openAddTagModal}
        bumpVersion={bumpVersion}
        tag={modalTag}
        setTag={setModalTag}
        setOpen={setOpenAddTagModal}
        tags={tags ?? []}
        dispatch={dispatch}
      />
    </Box>
  )
}

// for creating a click handler for tags that runs a tag search
export const tagSearch =
  (tag: Tag, dispatch: React.Dispatch<Action>) => (e: React.MouseEvent) => {
    e.stopPropagation()
    const s = { tags: [tag.id!] }
    phraseSearch(s)
      .then((searchResults) => {
        dispatch({
          action: "search",
          search: s,
          searchResults,
          tab: AppTabs.Dictionary,
        })
      })
      .catch(errorHandler(dispatch))
  }

export type TagRowProps = {
  tag: Tag
  setTag: (Tag) => void
  setOpen: (Boolean) => void
  bumpVersion: VoidFunction
  dispatch: React.Dispatch<Action>
}
export const TagRow: React.FC<TagRowProps> = ({
  tag,
  setTag,
  setOpen,
  bumpVersion,
  dispatch,
}) => {
  return (
    <>
      <Stack
        direction="row"
        spacing={1}
        justifyContent={"space-between"}
        sx={{ width: "100%", p: 0.5 }}
      >
        <TagChip tag={tag} onClick={tagSearch(tag, dispatch)} />
        <Box>{tag.description}</Box>
        <Stack direction="row" spacing={1}>
          <Tooltip arrow title="edit tag">
            <IconButton
              color="primary"
              size="small"
              onClick={() => {
                setTag(tag)
                setOpen(true)
              }}
            >
              <EditIcon fontSize="inherit" />
            </IconButton>
          </Tooltip>
          <Tooltip arrow title="duplicate tag colors">
            <IconButton
              color="primary"
              size="small"
              onClick={() => {
                setTag({ name: "", color: tag.color, bgcolor: tag.bgcolor })
                setOpen(true)
              }}
            >
              <ContentCopyIcon fontSize="inherit" />
            </IconButton>
          </Tooltip>
          <Tooltip arrow title="delete tag">
            <IconButton
              color="primary"
              size="small"
              onClick={() => {
                deleteTag(tag)
                  .then((count) => {
                    const verb =
                      count === 0
                        ? `No phrases were`
                        : count === 1
                        ? `One phrase was`
                        : `${count} phrases were`
                    bumpVersion()
                    dispatch({
                      action: "message",
                      message: `${verb} affected by the deletion of tag "${tag.name}".`,
                    })
                  })
                  .catch(errorHandler(dispatch))
              }}
            >
              <DeleteIcon fontSize="inherit" />
            </IconButton>
          </Tooltip>
        </Stack>
      </Stack>
    </>
  )
}

type EditTagModalProps = {
  open: boolean
  setOpen: (open: boolean) => void
  bumpVersion: VoidFunction
  tag: Tag
  setTag: (Tag) => void
  tags: Tag[]
  dispatch: React.Dispatch<Action>
}
const EditTagModal: React.FC<EditTagModalProps> = ({
  open,
  setOpen,
  bumpVersion,
  tag,
  setTag,
  tags,
  dispatch,
}) => {
  const unique = (tag: Tag) =>
    !tags.some((t) => t.id !== tag.id && t.name === tag.name)
  const error = !unique(tag)
  const tagHasUniqueName = (tag: Tag) =>
    !!(tag.name && /\S/.test(tag.name) && unique(tag))
  const [submissible, setSubmissible] = useState(false)
  // we have just the one modal, so we have to reset this each time we pop it open with a different tag
  useEffect(() => {
    setSubmissible(tagHasUniqueName(tag))
  }, [tag.name, tag.id])
  const handleLabelChange: (e: React.ChangeEvent<HTMLInputElement>) => void =
    debounce((e) => {
      setTag({ ...tag, name: e.target.value })
      setSubmissible(tagHasUniqueName(e.target.value))
    }, 250)
  const save = () =>
    saveTag(tag)
      .then(() => {
        setOpen(false)
        bumpVersion()
      })
      .catch(errorHandler(dispatch))
  return (
    <Modal
      open={open}
      onClose={() => setOpen(false)}
      aria-labelledby="modal-modal-title"
      aria-describedby="modal-modal-description"
      onKeyDown={(e) => {
        if (e.code === "KeyS" && (e.ctrlKey || e.metaKey)) {
          e.preventDefault()
          e.stopPropagation()
          if (submissible) save()
        }
      }}
    >
      <Box>
        <Typography id="modal-modal-title" variant="h6" component="h2">
          {!tag?.id && <>Create a New Tag</>}
          {!!tag?.id && <>Edit Tag</>}
        </Typography>
        <Stack
          spacing={2}
          sx={{ mt: 2, justifyContent: "space-evenly", alignContent: "center" }}
        >
          <Box sx={{ display: "flex", justifyContent: "center" }}>
            <TagChip tag={tag} />
          </Box>
          <TextField
            required
            autoFocus
            error={error}
            onChange={handleLabelChange}
            variant="standard"
            label="tag"
            placeholder="tag"
            helperText={error ? "tag must be unique" : undefined}
            defaultValue={tag?.name}
          />
          <TextField
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setTag({ ...tag, description: e.target.value })
            }
            variant="standard"
            label="description"
            placeholder="description"
            defaultValue={tag?.description}
          />
          <Grid container spacing={1} columns={12}>
            <Grid size={4}>
              <Box
                sx={{
                  whiteSpace: "nowrap",
                  display: "flex",
                  alignItems: "center",
                  height: "100%",
                }}
              >
                text
              </Box>
            </Grid>
            <Grid size={8}>
              <MuiColorInput
                format="hex"
                value={tag.color ?? "#000000"}
                onChange={(v) => setTag({ ...tag, color: v })}
              />
            </Grid>
            <Grid size={4}>
              <Box
                sx={{
                  whiteSpace: "nowrap",
                  display: "flex",
                  alignItems: "center",
                  height: "100%",
                }}
              >
                background
              </Box>
            </Grid>
            <Grid size={8}>
              <MuiColorInput
                value={tag.bgcolor ?? "#ffffff"}
                onChange={(v) => setTag({ ...tag, bgcolor: v })}
              />
            </Grid>
          </Grid>
          <Stack direction="row" sx={{ justifyContent: "space-between" }}>
            <Button variant="contained" disabled={!submissible} onClick={save}>
              Save
            </Button>
            <Button variant="outlined" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </Stack>
        </Stack>
      </Box>
    </Modal>
  )
}
// put tags into their canonical display order
export function sortTags(tags: Tag[]) {
  tags = tags.sort((a, b) => a.id! - b.id!) // creation order

  // group by style
  let i = 0
  type StyleGroup = { id: number; tags: Tag[] }
  const styleMap: Map<string, StyleGroup> = new Map()
  const styleGroups: StyleGroup[] = []
  for (const t of tags) {
    const style = `${t.bgcolor}:${t.color}`
    const sg = styleMap.get(style) ?? {
      id: i++,
      tags: [],
    }
    sg.tags.push(t)
    styleMap.set(style, sg)
    if (i > styleGroups.length) styleGroups.push(sg)
  }
  tags.length = 0
  for (const sg of styleGroups) {
    tags = [
      ...tags,
      ...sg.tags.sort((a, b) => a.name.localeCompare(b.name)), // within group by name
    ]
  }
  return tags
}
