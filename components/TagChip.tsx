import { alpha, Chip, Tooltip } from "@mui/material"
import React from "react"
import { Tag } from "../types/common"

type Props = {
  tag: Tag
  onClick?: (e: React.MouseEvent) => void
  onDelete?: VoidFunction
}

/** A label with a question mark icon. If you click the icon, some collapsed explanatory text appears. */
export const TagChip: React.FC<Props> = ({ tag, onClick, onDelete }) => {
  // somehow sometimes the tag is undefined
  const {
    name = "",
    color = "#000000",
    bgcolor = "#ffffff",
    description,
  } = tag ?? {}
  const chip = (
    <Chip
      label={name}
      variant="outlined"
      size="small"
      sx={{
        color,
        backgroundColor: bgcolor,
        '& .MuiChip-deleteIcon': {
          color: alpha(color, 0.6)
        }
      }}
      clickable={!!onClick}
      onClick={onClick}
      onDelete={onDelete}
    />
  )
  return description ? (
    <Tooltip arrow title={description} enterDelay={500}>
      {chip}
    </Tooltip>
  ) : (
    chip
  )
}
