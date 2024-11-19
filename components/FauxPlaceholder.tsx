import { Box } from "@mui/material"
import React from "react"
import { ReactNode } from "react"

type FauxPlaceholderPropes = {
  div?: boolean
  children: ReactNode
}
export const FauxPlaceholder: React.FC<FauxPlaceholderPropes> = ({
  div,
  children,
}) => {
  const component = div ? "div" : "span"
  return (
    <Box component={component} sx={{ color: "rgb(0,0,0,0.35)" }}>
      {children}
    </Box>
  )
}
