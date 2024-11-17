import React from "react"
import { AppTabs, Tag } from "../types/common"
import { Action } from "../util/reducer"
import { LabelWithHelp } from "./LabelWithHelp"
import { TagChip } from "./TagChip"
import {
  IconButton,
  Link,
  Menu,
  MenuItem,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material"
import AddIcon from "@mui/icons-material/Add"
import RemoveIcon from "@mui/icons-material/Remove"
import LocalOfferIcon from "@mui/icons-material/LocalOffer"

type TagWidgeProps = {
  hideHelp: boolean
  tags: Tag[] | undefined
  presentTags: number[] | undefined
  addTag: (tag: Tag) => void
  removeTag: (tag: Tag) => void
  dispatch: React.Dispatch<Action>
}
/** Displays tags and allows their addition or removal */
export const TagWidget: React.FC<TagWidgeProps> = ({
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
  return (
    <LabelWithHelp
      hidden={hideHelp}
      label="Tags"
      sx={{width: '100%'}}
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
