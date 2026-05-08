import { alpha, Chip, Tooltip, TooltipProps } from "@mui/material"
import React from "react"
import { Tag } from "../types/common"

type Props = {
  tag: Tag
  onClick?: (e: React.MouseEvent) => void
  onDelete?: VoidFunction
  arrowPosition?: TooltipProps["placement"]
}

/** A label with a question mark icon. If you click the icon, some collapsed explanatory text appears. */
export const TagChip: React.FC<Props> = ({
  tag,
  onClick,
  onDelete,
  arrowPosition,
}) => {
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
        "& .MuiChip-deleteIcon": {
          color: alpha(color, 0.6),
        },
      }}
      clickable={!!onClick}
      onClick={onClick}
      onDelete={onDelete}
    />
  )
  return description ? (
    <Tooltip
      enterDelay={200}
      arrow
      placement={arrowPosition}
      title={description}
    >
      {chip}
    </Tooltip>
  ) : (
    chip
  )
}
