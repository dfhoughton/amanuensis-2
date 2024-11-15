import React, { useEffect, useState } from "react"
import { AppState, Tag } from "../types/common"
import { Action, errorHandler } from "../util/reducer"
import {
  Alert,
  Box,
  Button,
  IconButton,
  Modal,
  Paper,
  Snackbar,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material"
import Grid from "@mui/material/Grid2"
import EditIcon from "@mui/icons-material/Edit"
import AddIcon from "@mui/icons-material/Add"
import DeleteIcon from "@mui/icons-material/Delete"
import some from "lodash/some"
import debounce from "lodash/debounce"
import { MuiColorInput } from "mui-color-input"
import { deleteTag, knownTags, saveTag } from "../util/database"
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
      .then((tags) => setTags(tags))
      .catch(errorHandler(dispatch))
  }, [version])
  return (
    <Box sx={{ minHeight: "400px" }}>
      <Stack direction="row" justifyContent={"space-between"}>
        <Typography variant="h5" component="h1">
          Tags
        </Typography>
        <Tooltip title="Create a tag" arrow>
          <IconButton
            color="primary"
            size="small"
            onClick={() => setOpenAddTagModal(true)}
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
      <Stack spacing={2} sx={{ mt: 2 }}>
        {tags
          ?.filter((t) => !!t)
          .map((t) => (
            <TagCard
              key={t.id}
              tag={t}
              tags={tags}
              version={version}
              setVersion={setVersion}
              dispatch={dispatch}
            />
          ))}
        {!tags?.length && <i>no tags yet</i>}
      </Stack>
      <EditTagModal
        open={openAddTagModal}
        version={version}
        setVersion={setVersion}
        tag={{ name: "", color: "#000000", bgcolor: "#ffffff" }}
        setOpen={setOpenAddTagModal}
        tags={tags ?? []}
        dispatch={dispatch}
      />
    </Box>
  )
}

export type TagCardProps = {
  tag: Tag
  tags: Tag[]
  version: number
  setVersion: (version: number) => void
  dispatch: React.Dispatch<Action>
}
export const TagCard: React.FC<TagCardProps> = ({
  tag,
  tags,
  version,
  setVersion,
  dispatch,
}) => {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Paper elevation={1}>
        <Stack
          direction="row"
          spacing={2}
          justifyContent={"space-between"}
          sx={{ width: "100%", p: 2 }}
        >
          <TagChip tag={tag} />
          <Box>{tag.description}</Box>
          <Stack direction="row" spacing={1}>
            <Tooltip title="remove tag" arrow>
              <IconButton
                color="primary"
                size="small"
                onClick={() => setOpen(true)}
              >
                <EditIcon fontSize="inherit" />
              </IconButton>
            </Tooltip>
            <Tooltip title="delete tag" arrow>
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
                      setVersion(version + 1)
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
      </Paper>
      <EditTagModal
        tag={tag}
        open={open}
        setOpen={setOpen}
        version={version}
        setVersion={setVersion}
        tags={tags}
        dispatch={dispatch}
      />
    </>
  )
}

type EditTagModalProps = {
  open: boolean
  setOpen: (open: boolean) => void
  version: number
  setVersion: (version: number) => void
  tag: Tag
  tags: Tag[]
  dispatch: React.Dispatch<Action>
}
const EditTagModal: React.FC<EditTagModalProps> = ({
  open,
  setOpen,
  version,
  setVersion,
  tag,
  tags,
  dispatch,
}) => {
  const [editedTag, setEditedTag] = useState<Tag>(tag ?? { name: "" })
  const testSubmission = (s?: string) => {
    const l = s ?? editedTag?.name ?? ""
    return (
      /\S/.test(l) && !some(tags, (t: Tag) => t.id !== tag?.id && t.name === l)
    )
  }
  const [submissible, setSubmissible] = useState(testSubmission())
  const handleLabelChange: (e: React.ChangeEvent<HTMLInputElement>) => void =
    debounce((e) => {
      setEditedTag({ ...editedTag, name: e.target.value })
      setSubmissible(testSubmission(e.target.value))
    }, 250)
  return (
    <Modal
      open={open}
      onClose={() => setOpen(false)}
      aria-labelledby="modal-modal-title"
      aria-describedby="modal-modal-description"
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
            <TagChip tag={editedTag} />
          </Box>
          <TextField
            onChange={handleLabelChange}
            variant="standard"
            hiddenLabel
            placeholder="tag"
            defaultValue={tag?.name}
          />
          <TextField
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setEditedTag({ ...editedTag, description: e.target.value })
            }
            variant="standard"
            hiddenLabel
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
                value={editedTag.color ?? "#000000"}
                onChange={(v) => setEditedTag({ ...editedTag, color: v })}
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
                value={editedTag.bgcolor ?? "#ffffff"}
                onChange={(v) => setEditedTag({ ...editedTag, bgcolor: v })}
              />
            </Grid>
          </Grid>
          <Stack direction="row" sx={{ justifyContent: "space-between" }}>
            <Button variant="outlined" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="outlined"
              disabled={!submissible}
              onClick={() =>
                saveTag(editedTag)
                  .then(() => {
                    setOpen(false)
                    setVersion(version + 1)
                  })
                  .catch(errorHandler(dispatch))
              }
            >
              Save
            </Button>
          </Stack>
        </Stack>
      </Box>
    </Modal>
  )
}
