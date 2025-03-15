import React, { useRef } from "react"
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
import LocalOfferIcon from "@mui/icons-material/LocalOffer"
import { FauxPlaceholder } from "./FauxPlaceholder"

type TagWidgeProps = {
  hideHelp: boolean
  tags: Tag[] | undefined
  presentTags: number[] | undefined
  addTag: (tag: Tag) => void
  removeTag: (tag: Tag) => void
  onClick?: (tag: Tag) => (e: React.MouseEvent) => void
  dispatch: React.Dispatch<Action>
}
/** Displays tags and allows their addition or removal */
export const TagWidget: React.FC<TagWidgeProps> = ({
  hideHelp,
  tags,
  presentTags,
  addTag,
  removeTag,
  onClick,
  dispatch,
}) => {
  const [addTagMenuAnchorEl, setAddTagMenuAnchorEl] =
    React.useState<null | HTMLElement>(null)
  const [removeTagMenuAnchorEl, setRemoveTagMenuAnchorEl] = React.useState<
    null | HTMLElement | SVGSVGElement
  >(null)
  const addTagMenuOpen = Boolean(addTagMenuAnchorEl)
  const menuAnchor = useRef<SVGSVGElement>(null)
  const usedTags = new Set<number>(presentTags)
  return (
    <LabelWithHelp
      hidden={hideHelp}
      label="Tags"
      sx={{ width: "100%" }}
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
          <Stack
            direction="row"
            spacing={1}
            sx={{ width: "100%" }}
            onClick={() => {
              if (menuAnchor.current)
                setAddTagMenuAnchorEl(menuAnchor.current as any)
            }}
          >
            {!presentTags?.length && <FauxPlaceholder>Tags</FauxPlaceholder>}
            {presentTags
              ?.filter((i) => i != null)
              .map((i) => tags.find((t: Tag) => t.id === i)!)
              .map((t) => {
                const f = onClick ? onClick(t) : undefined
                return (
                  <TagChip
                    key={t.id}
                    tag={t}
                    onDelete={() => removeTag(t)}
                    onClick={f}
                  />
                )
              })}
          </Stack>
          {(!presentTags || tags.length > presentTags.length) && (
            <>
              <Tooltip arrow title="Add a tag">
                <IconButton
                  color="primary"
                  size="small"
                  onClick={(e) => setAddTagMenuAnchorEl(e.currentTarget)}
                >
                  <AddIcon fontSize="inherit" ref={menuAnchor} />
                </IconButton>
              </Tooltip>
              <Menu
                MenuListProps={{ dense: true }}
                anchorEl={addTagMenuAnchorEl}
                open={addTagMenuOpen}
                onClose={() => setAddTagMenuAnchorEl(null)}
              >
                {tags
                  .filter((t) => !usedTags.has(t.id!))
                  .map((t) => (
                    <MenuItem key={t.id!} onClick={() => addTag(t)}>
                      <TagChip tag={t} />
                    </MenuItem>
                  ))}
              </Menu>
            </>
          )}
        </Stack>
      )}
    </LabelWithHelp>
  )
}
