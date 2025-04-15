import { Avatar, Tooltip } from "@mui/material"
import React from "react"

type Props = {
  title: string
  locale: string
}

/** a little bubble containing a locale */
export const LanguageChip: React.FC<Props> = ({ title, locale }) => (
  <Tooltip arrow title={title}>
    <Avatar
      sx={{
        width: "20px",
        height: "20px",
        fontSize: "0.75rem",
        fontWeight: 800,
        color: "white",
        backgroundColor: "secondary.main",
      }}
    >
      {locale}
    </Avatar>
  </Tooltip>
)
