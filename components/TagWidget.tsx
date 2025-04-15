import React, { useRef } from "react"
import { Tag } from "../types/common"
import { TagChip } from "./TagChip"
import { IconButton, Menu, MenuItem, Stack, Tooltip } from "@mui/material"
import AddIcon from "@mui/icons-material/Add"
import { FauxPlaceholder } from "./FauxPlaceholder"

type TagWidgeProps = {
  tags: Tag[] | undefined
  languageIds: number[] // for filtering out tags inappropriate to the language
  presentTags: number[] | undefined
  addTag: (tag: Tag) => void
  removeTag: (tag: Tag) => void
  onClick?: (tag: Tag) => (e: React.MouseEvent) => void
}
/** Displays tags and allows their addition or removal */
export const TagWidget: React.FC<TagWidgeProps> = ({
  tags,
  languageIds,
  presentTags,
  addTag,
  removeTag,
  onClick,
}) => {
  const [addTagMenuAnchorEl, setAddTagMenuAnchorEl] =
    React.useState<null | HTMLElement>(null)
  const addTagMenuOpen = Boolean(addTagMenuAnchorEl)
  const menuAnchor = useRef<SVGSVGElement>(null)
  const usedTags = new Set<number>(presentTags)
  return (
    <>
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
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    e.preventDefault()
                    setAddTagMenuAnchorEl(null)
                  }
                }}
              >
                {tags
                  .filter((t) => !usedTags.has(t.id!))
                  .filter(
                    (t) =>
                      !languageIds?.length ||
                      !t.languages?.length ||
                      t.languages.some((i) =>
                        languageIds.some((i2) => i2 === i)
                      )
                  )
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
    </>
  )
}
