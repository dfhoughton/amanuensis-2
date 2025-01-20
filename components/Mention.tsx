import { Typography } from "@mui/material"
import React from "react"

// styling for a mention, as opposed to a use, of a phrase
export const Mention: React.FC<{ phrase: string }> = ({ phrase }) => {
  return (
    <Typography variant="body2" component="span" sx={{ fontStyle: "italic" }}>
      {phrase}
    </Typography>
  )
}
