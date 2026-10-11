import React, { useCallback, useEffect, useState } from "react"
import { AppTabs, Language, Tag } from "../types/common"
import { Action, errorHandler } from "../util/reducer"
import {
  Box,
  Button,
  Chip,
  Divider,
  FormControl,
  FormControlLabel,
  FormHelperText,
  IconButton,
  InputLabel,
  MenuItem,
  Modal,
  Select,
  Stack,
  Switch,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material"
import EditIcon from "@mui/icons-material/Edit"
import ContentCopyIcon from "@mui/icons-material/ContentCopy"
import AddIcon from "@mui/icons-material/Add"
import DeleteIcon from "@mui/icons-material/Delete"
import {
  deleteTag,
  knownTagGroups,
  knownTags,
  normalizeHexColor,
  perhapsStaleLanguages,
  phraseSearch,
  saveTag,
  sortTags,
} from "../util/database"
import { TagChip } from "./TagChip"
import { LanguageChip } from "./LanguageChip"
import { LanguagePicker } from "./LanguagePicker"
import { HelpLink } from "./HelpLink"
import { TagGroups } from "./TagGroups"
import { DEFAULT_TAG_GROUP_NAME, TagGroup } from "../types/common"

type TagsProps = {
  dispatch: React.Dispatch<Action>
}

export const Tags: React.FC<TagsProps> = ({ dispatch }) => {
  const [tags, setTags] = useState<Tag[] | undefined>()
  const [groups, setGroups] = useState<TagGroup[]>([])
  const [subTab, setSubTab] = useState<"tags" | "groups">("tags")
  const [openAddTagModal, setOpenAddTagModal] = useState(false)
  const [version, setVersion] = useState(0)
  const bumpVersion = () => setVersion((v) => v + 1)

  useEffect(() => {
    knownTags()
      .then((tags) => {
        tags = sortTags(tags)
        setTags(tags)
      })
      .catch(errorHandler(dispatch, "obtaining known tags for tags page"))
  }, [version, dispatch])

  useEffect(() => {
    knownTagGroups()
      .then((groups) => setGroups(groups))
      .catch(errorHandler(dispatch, "obtaining tag groups for tags page"))
  }, [version, dispatch])

  const [modalTag, setModalTag] = useState<Tag>({ name: "" })
  const [languages, setLanguages] = useState<Language[]>([])
  useEffect(() => {
    perhapsStaleLanguages()
      .then((languages) => setLanguages(languages))
      .catch(errorHandler(dispatch, "obtaining languages for tags"))
  }, [dispatch])

  return (
    <Box sx={{ minHeight: "400px" }}>
      <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center" }}>
        <Typography variant="h5" component="h1">
          Tags
        </Typography>
        <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
          <Tooltip enterDelay={200} arrow title="Create a tag">
            <IconButton
              color="primary"
              size="small"
              onClick={() => {
                const defaultGroup = groups.find(
                  (g) =>
                    g.name.toLowerCase() === DEFAULT_TAG_GROUP_NAME.toLowerCase()
                )
                setModalTag({
                  name: "",
                  groupId: defaultGroup?.id ?? 1,
                  languages: undefined,
                })
                setOpenAddTagModal(true)
              }}
            >
              <AddIcon fontSize="medium" />
            </IconButton>
          </Tooltip>
          <HelpLink anchor="tags" title="tags" />
        </Stack>
      </Stack>

      <Tabs
        value={subTab}
        onChange={(_e, v) => setSubTab(v)}
        sx={{ borderBottom: 1, borderColor: "divider", mt: 1, mb: 2 }}
      >
        <Tab label="Tags" value="tags" />
        <Tab label="Tag Groups" value="groups" />
      </Tabs>

      {subTab === "tags" && (
        <Stack spacing={0.75}>
          {tags
            ?.filter((t) => !!t)
            .map((t, i) => (
              <Box key={t.id}>
                {!!i && <Divider />}
                <TagRow
                  tag={t}
                  languages={languages}
                  setTag={setModalTag}
                  setOpen={setOpenAddTagModal}
                  bumpVersion={bumpVersion}
                  dispatch={dispatch}
                />
              </Box>
            ))}
          {!tags?.length && <i>no tags yet</i>}
        </Stack>
      )}

      {subTab === "groups" && (
        <TagGroups
          groups={groups}
          tags={tags ?? []}
          languages={languages}
          bumpVersion={bumpVersion}
          dispatch={dispatch}
        />
      )}

      <EditTagModal
        open={openAddTagModal}
        bumpVersion={bumpVersion}
        tag={modalTag}
        setTag={setModalTag}
        setOpen={setOpenAddTagModal}
        tags={tags ?? []}
        groups={groups}
        languages={languages}
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
      .catch(errorHandler(dispatch, "searching for phrases after clicking tag"))
  }

export type TagRowProps = {
  tag: Tag
  languages: Language[]
  setTag: (t: Tag) => void
  setOpen: (b: boolean) => void
  bumpVersion: VoidFunction
  dispatch: React.Dispatch<Action>
}
export const TagRow: React.FC<TagRowProps> = ({
  tag,
  languages,
  setTag,
  setOpen,
  bumpVersion,
  dispatch,
}) => {
  const effectiveLangIds = tag.effectiveLanguages ?? tag.languages
  const tagLanguages = effectiveLangIds
    ?.map((id) => languages.find((l) => l.id === id))
    .filter((l) => l != null)
    .sort((a, b) => a!.name!.localeCompare(b!.name!))
  const languageTooltip = tagLanguages?.map((l) => l!.name!).join("; ")
  return (
    <>
      <Stack
        direction="row"
        spacing={1}
        sx={{ justifyContent: "space-between", alignItems: "center", width: "100%", p: 0.5 }}
      >
        <TagChip tag={tag} onClick={tagSearch(tag, dispatch)} />
        <Box sx={{ flex: 1, px: 2 }}>{tag.description}</Box>
        <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
          {!!languageTooltip && (
            <LanguageChip
              title={languageTooltip}
              locale={
                tagLanguages?.length === 1 ? tagLanguages[0]!.locale! : "…"
              }
            />
          )}
          <Tooltip enterDelay={200} arrow title="edit tag">
            <IconButton
              color="primary"
              size="small"
              onClick={() => {
                setTag({ ...tag })
                setOpen(true)
              }}
            >
              <EditIcon fontSize="inherit" />
            </IconButton>
          </Tooltip>
          <Tooltip enterDelay={200} arrow title="duplicate tag">
            <IconButton
              color="primary"
              size="small"
              onClick={() => {
                setTag({
                  name: "",
                  groupId: tag.groupId,
                  description: tag.description,
                  languages: tag.languages ? [...tag.languages] : undefined,
                })
                setOpen(true)
              }}
            >
              <ContentCopyIcon fontSize="inherit" />
            </IconButton>
          </Tooltip>
          <Tooltip enterDelay={200} arrow title="delete tag">
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
                  .catch(errorHandler(dispatch, "deleting tag after clicking delete icon"))
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
  setTag: (tag: Tag) => void
  tags: Tag[]
  groups: TagGroup[]
  languages: Language[]
  dispatch: React.Dispatch<Action>
}

const EditTagModal: React.FC<EditTagModalProps> = ({
  open,
  setOpen,
  bumpVersion,
  tag,
  setTag,
  tags,
  groups,
  languages,
  dispatch,
}) => {
  const defaultGroup = groups.find(
    (g) => g.name.toLowerCase() === DEFAULT_TAG_GROUP_NAME.toLowerCase()
  )
  const defaultGroupId = defaultGroup?.id ?? 1
  const currentGroupId = tag.groupId ?? defaultGroupId
  const currentGroup = groups.find((g) => g.id === currentGroupId)

  // Language inheritance state: true if tag.languages is undefined
  const inheritLanguages = tag.languages === undefined

  // Check if tag name is unique within the selected group
  const isNameUniqueInGroup = useCallback(
    (name: string, targetGroupId: number) => {
      const trimmed = name.trim().toLowerCase()
      if (!trimmed) return false
      return !tags.some(
        (t) =>
          t.id !== tag.id &&
          t.groupId === targetGroupId &&
          t.name.trim().toLowerCase() === trimmed
      )
    },
    [tag.id, tags]
  )

  const isNameUnique = isNameUniqueInGroup(tag.name || "", currentGroupId)
  const hasValidName = !!tag.name && /\S/.test(tag.name)
  const nameError = hasValidName && !isNameUnique
  const submissible = hasValidName && isNameUnique

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTag({ ...tag, name: e.target.value })
  }

  const handleGroupChange = (newGroupId: number) => {
    setTag({ ...tag, groupId: newGroupId })
  }

  const handleInheritToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
    const shouldInherit = e.target.checked
    if (shouldInherit) {
      setTag({ ...tag, languages: undefined })
    } else {
      // Initialize with group languages as a starting point
      setTag({
        ...tag,
        languages: currentGroup?.languages ? [...currentGroup.languages] : [],
      })
    }
  }

  const save = () => {
    if (!submissible) return
    saveTag({
      ...tag,
      groupId: currentGroupId,
      name: tag.name.trim(),
    })
      .then(() => {
        setOpen(false)
        bumpVersion()
      })
      .catch(errorHandler(dispatch, "saving tag after clicking save button in modal"))
  }

  const onlyDefaultGroup = groups.length <= 1
  const anyGroupsDisabled = groups.some(
    (g) => !isNameUniqueInGroup(tag.name || "", g.id!)
  )

  const previewTag: Tag = {
    ...tag,
    color: currentGroup?.color ?? "#000000",
    bgcolor: currentGroup?.bgcolor ?? "#ffffff",
  }

  return (
    <Modal
      open={open}
      onClose={() => setOpen(false)}
      aria-labelledby="modal-modal-title"
      onKeyDown={(e) => {
        if (e.code === "KeyS" && (e.ctrlKey || e.metaKey)) {
          e.preventDefault()
          e.stopPropagation()
          if (submissible) save()
        }
      }}
    >
      <Box
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.preventDefault()
            setOpen(false)
          }
        }}
      >
        <Typography id="modal-modal-title" variant="h6" component="h2">
          {!tag?.id ? "Create a New Tag" : "Edit Tag"}
        </Typography>
        <Stack
          spacing={2}
          sx={{ mt: 2, justifyContent: "space-evenly", alignContent: "center" }}
        >
          <Box sx={{ display: "flex", justifyContent: "center" }}>
            <TagChip tag={previewTag} />
          </Box>
          <TextField
            required
            autoFocus
            error={nameError}
            onChange={handleNameChange}
            variant="standard"
            label="tag"
            placeholder="tag"
            helperText={nameError ? "Tag name must be unique within this group" : undefined}
            value={tag?.name ?? ""}
          />
          <TextField
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setTag({ ...tag, description: e.target.value })
            }
            variant="standard"
            label="description"
            placeholder="description"
            value={tag?.description ?? ""}
          />

          <FormControl fullWidth variant="standard" disabled={onlyDefaultGroup}>
            <InputLabel id="tag-group-select-label">Tag Group</InputLabel>
            <Select
              labelId="tag-group-select-label"
              value={currentGroupId}
              onChange={(e) => handleGroupChange(Number(e.target.value))}
              renderValue={(val) => {
                const g = groups.find((grp) => grp.id === val)
                if (!g) return ""
                return (
                  <Chip
                    label={g.name}
                    size="small"
                    variant="outlined"
                    sx={{
                      color: normalizeHexColor(g.color, "#000000"),
                      backgroundColor: normalizeHexColor(g.bgcolor, "#ffffff"),
                      fontWeight: 600,
                    }}
                  />
                )
              }}
            >
              {groups.map((g) => {
                const disabled = !isNameUniqueInGroup(tag.name || "", g.id!)
                const tooltipTitle = disabled
                  ? `A tag named "${tag.name}" already exists in this group`
                  : g.description || g.name
                return (
                  <MenuItem
                    key={g.id}
                    value={g.id}
                    disabled={disabled}
                    title={tooltipTitle}
                  >
                    <Stack
                      direction="row"
                      spacing={1}
                      sx={{ alignItems: "center", width: "100%" }}
                    >
                      <Chip
                        label={g.name}
                        size="small"
                        variant="outlined"
                        sx={{
                          color: normalizeHexColor(g.color, "#000000"),
                          backgroundColor: normalizeHexColor(g.bgcolor, "#ffffff"),
                          fontWeight: 600,
                        }}
                      />
                      {!!g.description && (
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{
                            maxWidth: 200,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {g.description}
                        </Typography>
                      )}
                    </Stack>
                  </MenuItem>
                )
              })}
            </Select>
            {onlyDefaultGroup ? (
              <FormHelperText>
                Create groups to cluster tags of similar purpose.
              </FormHelperText>
            ) : anyGroupsDisabled ? (
              <FormHelperText>
                Some groups are disabled because a tag with this name already exists in them.
              </FormHelperText>
            ) : null}
          </FormControl>

          <Box>
            <FormControlLabel
              control={
                <Switch
                  checked={inheritLanguages}
                  onChange={handleInheritToggle}
                  size="small"
                />
              }
              label="Inherit languages from group"
            />
            {inheritLanguages ? (
              <Box sx={{ mt: 0.5 }}>
                {currentGroup?.languages?.length ? (
                  <Stack
                    direction="row"
                    spacing={0.5}
                    sx={{ alignItems: "center", flexWrap: "wrap", rowGap: 0.5 }}
                  >
                    <Typography variant="caption" color="text.secondary" sx={{ mr: 0.5 }}>
                      Inheriting:
                    </Typography>
                    {currentGroup.languages.map((id) => {
                      const lang = languages.find((l) => l.id === id)
                      if (!lang) return null
                      return (
                        <LanguageChip
                          key={id}
                          title={lang.name}
                          locale={lang.locale ?? lang.name}
                        />
                      )
                    })}
                  </Stack>
                ) : (
                  <Typography variant="caption" color="text.secondary">
                    Inheriting: All languages (no restrictions)
                  </Typography>
                )}
              </Box>
            ) : (
              <Box sx={{ mt: 1 }}>
                <LanguagePicker
                  languages={languages}
                  languageIds={tag.languages ?? []}
                  onAdd={(l: Language) => () => {
                    if (!tag.languages?.some((lang) => lang === l.id)) {
                      setTag({ ...tag, languages: [...(tag.languages ?? []), l.id!] })
                    }
                  }}
                  onDelete={(l: Language) => () => {
                    setTag({
                      ...tag,
                      languages: tag.languages?.filter((lang) => lang !== l.id),
                    })
                  }}
                />
              </Box>
            )}
          </Box>

          <Stack direction="row" sx={{ justifyContent: "space-between", mt: 1 }}>
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

export { sortTags } from "../util/database"

