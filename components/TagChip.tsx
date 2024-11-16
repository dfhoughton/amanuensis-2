import { Chip, Tooltip } from "@mui/material"
import React from "react"
import { Tag } from "../types/common"

type Props = {
  tag: Tag
  onClick?: VoidFunction
}

/** A label with a question mark icon. If you click the icon, some collapsed explanatory text appears. */
export const TagChip: React.FC<Props> = ({ tag, onClick }) => {
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
      sx={{ color, backgroundColor: bgcolor }}
      clickable={!!onClick}
      onClick={onClick}
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
