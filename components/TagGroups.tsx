import React, { useEffect, useState } from "react"
import {
  DEFAULT_TAG_GROUP_NAME,
  Language,
  Tag,
  TagGroup,
} from "../types/common"
import { Action, errorHandler } from "../util/reducer"
import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Modal,
  Select,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material"
import Grid from "@mui/material/Grid"
import EditIcon from "@mui/icons-material/Edit"
import ContentCopyIcon from "@mui/icons-material/ContentCopy"
import DeleteIcon from "@mui/icons-material/Delete"
import CallMergeIcon from "@mui/icons-material/CallMerge"
import DragIndicatorIcon from "@mui/icons-material/DragIndicator"
import { MuiColorInput } from "mui-color-input"
import {
  checkGroupDeletionConflicts,
  deleteTagGroup,
  mergeTagGroups,
  normalizeHexColor,
  reorderTagGroups,
  saveTagGroup,
} from "../util/database"
import { LanguageChip } from "./LanguageChip"
import { LanguagePicker } from "./LanguagePicker"

type TagGroupsProps = {
  groups: TagGroup[]
  tags: Tag[]
  languages: Language[]
  bumpVersion: VoidFunction
  dispatch: React.Dispatch<Action>
}

export const TagGroups: React.FC<TagGroupsProps> = ({
  groups,
  tags,
  languages,
  bumpVersion,
  dispatch,
}) => {
  // Modal states
  const [editingGroup, setEditingGroup] = useState<TagGroup | null>(null)
  const [openEditModal, setOpenEditModal] = useState(false)
  const [groupToDelete, setGroupToDelete] = useState<TagGroup | null>(null)
  const [groupToMerge, setGroupToMerge] = useState<TagGroup | null>(null)

  // Drag-and-drop state
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index)
    e.dataTransfer.effectAllowed = "move"
    e.dataTransfer.setData("text/plain", `${index}`)
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
    if (dragOverIndex !== index) {
      setDragOverIndex(index)
    }
  }

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault()
    if (draggedIndex === null || draggedIndex === targetIndex) {
      setDraggedIndex(null)
      setDragOverIndex(null)
      return
    }
    const next = [...groups]
    const [moved] = next.splice(draggedIndex, 1)
    next.splice(targetIndex, 0, moved)
    setDraggedIndex(null)
    setDragOverIndex(null)

    const reorderedIds = next.map((g) => g.id!)
    reorderTagGroups(reorderedIds)
      .then(() => bumpVersion())
      .catch(errorHandler(dispatch, "reordering tag groups"))
  }

  const handleDragEnd = () => {
    setDraggedIndex(null)
    setDragOverIndex(null)
  }

  return (
    <Box>
      <Stack spacing={0.75} sx={{ mt: 1 }}>
        {groups.map((group, i) => {
          const isDefault =
            group.name.toLowerCase() === DEFAULT_TAG_GROUP_NAME.toLowerCase()
          const groupLanguages = group.languages
            ?.map((id) => languages.find((l) => l.id === id))
            .filter((l) => l != null)
            .sort((a, b) => a!.name!.localeCompare(b!.name!))
          const languageTooltip = groupLanguages?.map((l) => l!.name!).join("; ")

          const isDraggingThis = draggedIndex === i
          const showTopBorder =
            dragOverIndex === i &&
            draggedIndex !== null &&
            draggedIndex > i
          const showBottomBorder =
            dragOverIndex === i &&
            draggedIndex !== null &&
            draggedIndex < i

          return (
            <Box
              key={group.id ?? group.name}
              draggable
              onDragStart={(e) => handleDragStart(e, i)}
              onDragOver={(e) => handleDragOver(e, i)}
              onDrop={(e) => handleDrop(e, i)}
              onDragEnd={handleDragEnd}
              sx={{
                opacity: isDraggingThis ? 0.35 : 1,
                borderTop: showTopBorder
                  ? "2px solid #1976d2"
                  : undefined,
                borderBottom: showBottomBorder
                  ? "2px solid #1976d2"
                  : undefined,
                borderRadius: 1,
                transition: "background-color 0.15s ease",
                "&:hover": { bgcolor: "action.hover" },
              }}
            >
              {!!i && !showTopBorder && <Divider />}
              <Stack
                direction="row"
                spacing={1}
                sx={{
                  justifyContent: "space-between",
                  alignItems: "center",
                  width: "100%",
                  p: 0.5,
                }}
              >
                <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                  <Tooltip enterDelay={200} arrow title="Drag to reorder display">
                    <Box
                      component="span"
                      sx={{
                        cursor: "grab",
                        display: "flex",
                        alignItems: "center",
                        color: "text.secondary",
                      }}
                    >
                      <DragIndicatorIcon fontSize="small" />
                    </Box>
                  </Tooltip>
                  <Tooltip
                    enterDelay={200}
                    arrow
                    title={group.description || group.name}
                  >
                    <Chip
                      label={group.name}
                      variant="outlined"
                      size="small"
                      sx={{
                        color: normalizeHexColor(group.color, "#000000"),
                        backgroundColor: normalizeHexColor(group.bgcolor, "#ffffff"),
                        fontWeight: 600,
                      }}
                    />
                  </Tooltip>
                </Stack>

                <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                  {!!languageTooltip && (
                    <LanguageChip
                      title={languageTooltip}
                      locale={
                        groupLanguages?.length === 1
                          ? groupLanguages[0]!.locale!
                          : "…"
                      }
                    />
                  )}
                  <Tooltip enterDelay={200} arrow title="Clone group">
                    <IconButton
                      color="primary"
                      size="small"
                      onClick={() => {
                        setEditingGroup({
                          name: "",
                          description: group.description,
                          color: group.color,
                          bgcolor: group.bgcolor,
                          languages: group.languages ? [...group.languages] : [],
                          order: groups.length,
                        })
                        setOpenEditModal(true)
                      }}
                    >
                      <ContentCopyIcon fontSize="inherit" />
                    </IconButton>
                  </Tooltip>
                  {!isDefault && (
                    <>
                      <Tooltip enterDelay={200} arrow title="Edit group">
                        <IconButton
                          color="primary"
                          size="small"
                          onClick={() => {
                            setEditingGroup({
                              ...group,
                              languages: group.languages ? [...group.languages] : [],
                            })
                            setOpenEditModal(true)
                          }}
                        >
                          <EditIcon fontSize="inherit" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip enterDelay={200} arrow title="Merge group into another">
                        <IconButton
                          color="primary"
                          size="small"
                          onClick={() => setGroupToMerge(group)}
                        >
                          <CallMergeIcon fontSize="inherit" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip enterDelay={200} arrow title="Delete group">
                        <IconButton
                          color="primary"
                          size="small"
                          onClick={() => setGroupToDelete(group)}
                        >
                          <DeleteIcon fontSize="inherit" />
                        </IconButton>
                      </Tooltip>
                    </>
                  )}
                </Stack>
              </Stack>
            </Box>
          )
        })}
        {!groups.length && <i>No tag groups yet</i>}
      </Stack>

      {/* Edit / Clone Modal */}
      {openEditModal && editingGroup && (
        <EditGroupModal
          open={openEditModal}
          group={editingGroup}
          existingGroups={groups}
          languages={languages}
          onClose={() => {
            setOpenEditModal(false)
            setEditingGroup(null)
          }}
          bumpVersion={bumpVersion}
          dispatch={dispatch}
        />
      )}

      {/* Delete Confirmation Modal */}
      {groupToDelete && (
        <DeleteGroupModal
          group={groupToDelete}
          tags={tags}
          open={Boolean(groupToDelete)}
          onClose={() => setGroupToDelete(null)}
          bumpVersion={bumpVersion}
          dispatch={dispatch}
        />
      )}

      {/* Merge Group Modal */}
      {groupToMerge && (
        <MergeGroupModal
          sourceGroup={groupToMerge}
          existingGroups={groups}
          open={Boolean(groupToMerge)}
          onClose={() => setGroupToMerge(null)}
          bumpVersion={bumpVersion}
          dispatch={dispatch}
        />
      )}
    </Box>
  )
}

type EditGroupModalProps = {
  open: boolean
  group: TagGroup
  existingGroups: TagGroup[]
  languages: Language[]
  onClose: VoidFunction
  bumpVersion: VoidFunction
  dispatch: React.Dispatch<Action>
}

const EditGroupModal: React.FC<EditGroupModalProps> = ({
  open,
  group: initialGroup,
  existingGroups,
  languages,
  onClose,
  bumpVersion,
  dispatch,
}) => {
  const [group, setGroup] = useState<TagGroup>({ ...initialGroup })
  const isNew = initialGroup.id === undefined

  // Validation
  const trimmedName = group.name.trim()
  const nameIsEmpty = trimmedName.length === 0
  const isDefaultName =
    trimmedName.toLowerCase() === DEFAULT_TAG_GROUP_NAME.toLowerCase()

  const nameConflict = existingGroups.some(
    (g) =>
      g.id !== group.id &&
      g.name.toLowerCase() === trimmedName.toLowerCase()
  )

  const normColor = normalizeHexColor(group.color, "#000000")
  const normBg = normalizeHexColor(group.bgcolor, "#ffffff")

  const colorConflictGroup = existingGroups.find(
    (g) =>
      g.id !== group.id &&
      normalizeHexColor(g.color) === normColor &&
      normalizeHexColor(g.bgcolor) === normBg
  )

  const submissible =
    !nameIsEmpty &&
    !nameConflict &&
    !isDefaultName &&
    !colorConflictGroup

  const handleSave = () => {
    if (!submissible) return
    saveTagGroup({
      ...group,
      name: trimmedName,
      color: normColor,
      bgcolor: normBg,
      languages: group.languages?.length ? group.languages : undefined,
    })
      .then(() => {
        onClose()
        bumpVersion()
      })
      .catch(errorHandler(dispatch, "saving tag group"))
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      aria-labelledby="group-modal-title"
      onKeyDown={(e) => {
        if (e.code === "KeyS" && (e.ctrlKey || e.metaKey)) {
          e.preventDefault()
          e.stopPropagation()
          if (submissible) handleSave()
        }
      }}
    >
      <Box
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.preventDefault()
            onClose()
          }
        }}
      >
        <Typography id="group-modal-title" variant="h6" component="h2">
          {isNew ? "Create Tag Group" : "Edit Tag Group"}
        </Typography>

        <Stack spacing={2} sx={{ mt: 2 }}>
          <Box sx={{ display: "flex", justifyContent: "center" }}>
            <Chip
              label={group.name || "Group Preview"}
              variant="outlined"
              size="medium"
              sx={{
                color: normalizeHexColor(group.color, "#000000"),
                backgroundColor: normalizeHexColor(group.bgcolor, "#ffffff"),
                fontWeight: 600,
              }}
            />
          </Box>

          <TextField
            required
            autoFocus
            label="group name"
            variant="standard"
            value={group.name}
            onChange={(e) => setGroup({ ...group, name: e.target.value })}
            error={nameConflict || isDefaultName}
            helperText={
              isDefaultName
                ? "Cannot use 'default' as a group name"
                : nameConflict
                  ? "A group with this name already exists"
                  : undefined
            }
          />

          <TextField
            label="description"
            variant="standard"
            value={group.description ?? ""}
            onChange={(e) => setGroup({ ...group, description: e.target.value })}
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
                text color
              </Box>
            </Grid>
            <Grid size={8}>
              <MuiColorInput
                format="hex"
                value={group.color}
                onChange={(v) => setGroup({ ...group, color: v })}
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
                format="hex"
                value={group.bgcolor}
                onChange={(v) => setGroup({ ...group, bgcolor: v })}
              />
            </Grid>
          </Grid>

          {Boolean(colorConflictGroup) && (
            <Alert severity="error">
              These colors are already used by group &quot;{colorConflictGroup?.name}&quot;.
              Colors must be distinct.
            </Alert>
          )}

          <Typography variant="caption" color="text.secondary">
            Default Languages (inherited by tags in this group):
          </Typography>
          <LanguagePicker
            languages={languages}
            languageIds={group.languages ?? []}
            onAdd={(l: Language) => () => {
              if (!group.languages?.some((lang) => lang === l.id)) {
                setGroup({ ...group, languages: [...(group.languages ?? []), l.id!] })
              }
            }}
            onDelete={(l: Language) => () => {
              setGroup({
                ...group,
                languages: group.languages?.filter((lang) => lang !== l.id),
              })
            }}
          />

          <Stack direction="row" sx={{ justifyContent: "space-between", mt: 1 }}>
            <Button variant="contained" disabled={!submissible} onClick={handleSave}>
              Save
            </Button>
            <Button variant="outlined" onClick={onClose}>
              Cancel
            </Button>
          </Stack>
        </Stack>
      </Box>
    </Modal>
  )
}

type DeleteGroupModalProps = {
  group: TagGroup
  tags: Tag[]
  open: boolean
  onClose: VoidFunction
  bumpVersion: VoidFunction
  dispatch: React.Dispatch<Action>
}

const DeleteGroupModal: React.FC<DeleteGroupModalProps> = ({
  group,
  tags,
  open,
  onClose,
  bumpVersion,
  dispatch,
}) => {
  const [conflicts, setConflicts] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  const tagsInGroup = tags.filter((t) => t.groupId === group.id)

  useEffect(() => {
    let isMounted = true
    checkGroupDeletionConflicts(group.id!)
      .then((c) => {
        if (isMounted) {
          setConflicts(c)
          setLoading(false)
        }
      })
      .catch((err) => {
        if (isMounted) {
          setLoading(false)
          errorHandler(dispatch, "checking tag deletion conflicts")(err)
        }
      })
    return () => {
      isMounted = false
    }
  }, [group.id, dispatch])

  const hasConflicts = conflicts.length > 0

  const handleDelete = () => {
    deleteTagGroup(group)
      .then((movedCount) => {
        onClose()
        bumpVersion()
        dispatch({
          action: "message",
          message: `Deleted group "${group.name}". ${movedCount} tag(s) moved to default group.`,
        })
      })
      .catch(errorHandler(dispatch, "deleting tag group"))
  }

  return (
    <Modal open={open} onClose={onClose}>
      <Box>
        <Typography variant="h6" component="h2">
          Delete Tag Group
        </Typography>

        <Stack spacing={2} sx={{ mt: 2 }}>
          {loading ? (
            <Typography variant="body2">Checking conflicts...</Typography>
          ) : hasConflicts ? (
            <Alert severity="error">
              Cannot delete group <strong>&quot;{group.name}&quot;</strong>. The following tag(s)
              already exist in the default group and would cause name collisions:
              <Box component="ul" sx={{ mt: 1, pl: 2, mb: 0 }}>
                {conflicts.map((name) => (
                  <li key={name}>
                    <strong>{name}</strong>
                  </li>
                ))}
              </Box>
              Please rename or delete these tags before deleting this group.
            </Alert>
          ) : (
            <Alert severity="warning">
              Are you sure you want to delete group <strong>&quot;{group.name}&quot;</strong>?
              {tagsInGroup.length === 0 ? (
                <> This group contains no tags.</>
              ) : (
                <>
                  {" "}
                  All <strong>{tagsInGroup.length}</strong> tag(s) currently in this group
                  will be moved to the <strong>default</strong> group.
                </>
              )}
            </Alert>
          )}

          <Stack direction="row" sx={{ justifyContent: "space-between" }}>
            <Button
              variant="contained"
              color="error"
              disabled={loading || hasConflicts}
              onClick={handleDelete}
            >
              Delete Group
            </Button>
            <Button variant="outlined" onClick={onClose}>
              Cancel
            </Button>
          </Stack>
        </Stack>
      </Box>
    </Modal>
  )
}

type MergeGroupModalProps = {
  sourceGroup: TagGroup
  existingGroups: TagGroup[]
  open: boolean
  onClose: VoidFunction
  bumpVersion: VoidFunction
  dispatch: React.Dispatch<Action>
}

const MergeGroupModal: React.FC<MergeGroupModalProps> = ({
  sourceGroup,
  existingGroups,
  open,
  onClose,
  bumpVersion,
  dispatch,
}) => {
  const targetCandidates = existingGroups.filter((g) => g.id !== sourceGroup.id)
  const [targetGroupId, setTargetGroupId] = useState<number | "">(
    targetCandidates[0]?.id ?? ""
  )

  const targetGroup = existingGroups.find((g) => g.id === targetGroupId)

  const handleMerge = () => {
    if (!targetGroupId) return
    mergeTagGroups(sourceGroup.id!, targetGroupId)
      .then(() => {
        onClose()
        bumpVersion()
        dispatch({
          action: "message",
          message: `Merged group "${sourceGroup.name}" into "${targetGroup?.name}".`,
        })
      })
      .catch(errorHandler(dispatch, "merging tag group"))
  }

  return (
    <Modal open={open} onClose={onClose}>
      <Box>
        <Typography variant="h6" component="h2">
          Merge Tag Group
        </Typography>

        <Stack spacing={2} sx={{ mt: 2 }}>
          <Alert severity="info">
            Merging <strong>&quot;{sourceGroup.name}&quot;</strong> into another group will move all
            its tags to the selected group and delete <strong>&quot;{sourceGroup.name}&quot;</strong>.
            If both groups have a tag with the same name, they will be combined into a single tag
            and notes referencing them will be updated.
          </Alert>

          <FormControl fullWidth variant="standard">
            <InputLabel id="target-group-label">Destination Group</InputLabel>
            <Select
              labelId="target-group-label"
              value={targetGroupId}
              onChange={(e) => setTargetGroupId(Number(e.target.value))}
            >
              {targetCandidates.map((g) => (
                <MenuItem key={g.id} value={g.id}>
                  <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                    <Chip
                      label={g.name}
                      size="small"
                      variant="outlined"
                      sx={{
                        color: g.color,
                        backgroundColor: g.bgcolor,
                        fontWeight: 600,
                      }}
                    />
                    {!!g.description && (
                      <Typography variant="caption" color="text.secondary">
                        {g.description}
                      </Typography>
                    )}
                  </Stack>
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Stack direction="row" sx={{ justifyContent: "space-between", mt: 1 }}>
            <Button
              variant="contained"
              color="primary"
              disabled={!targetGroupId}
              onClick={handleMerge}
            >
              Merge Group
            </Button>
            <Button variant="outlined" onClick={onClose}>
              Cancel
            </Button>
          </Stack>
        </Stack>
      </Box>
    </Modal>
  )
}
