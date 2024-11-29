import {
  Box,
  Collapse,
  InputLabel,
  InputLabelProps,
  Stack,
  Typography,
} from "@mui/material"
import React, { ReactNode, useState } from "react"
import HelpOutlineIcon from "@mui/icons-material/HelpOutline"

type Props = InputLabelProps & {
  hidden: boolean
  label: string
  explanation?: string | ReactNode
}

/** A label with a question mark icon. If you click the icon, some collapsed explanatory text appears. */
export const LabelWithHelp: React.FC<Props> = ({
  hidden,
  label,
  explanation,
  children,
  sx,
  ...labelProps
}) => {
  const [collapse, setCollapse] = useState(true)
  if (hidden) return <Box sx={sx}>{children}</Box>
  Object.assign(
    {
      margin: "dense",
      size: "small",
    },
    labelProps
  )
  return (
    <>
      {!!(label || explanation) && (
        <Stack
          direction="row"
          sx={{ justifyContent: "space-between", width: "100%" }}
        >
          {!!label && (
            <InputLabel {...labelProps} sx={{ display: "inline" }}>
              {label}
            </InputLabel>
          )}
          {!!(!label && explanation) && <span />}
          {!!explanation && (
            <HelpOutlineIcon
              fontSize="small"
              sx={{
                cursor: "pointer",
                ml: label ? 1 : 0,
                mr: 1,
                color: (theme) => theme.palette.text.disabled,
              }}
              onClick={() => setCollapse(!collapse)}
            />
          )}
        </Stack>
      )}
      <Box sx={sx}>{children}</Box>
      {!!explanation && (
        <Collapse
          in={!collapse}
          sx={{
            fontSize: "smaller",
            padding: collapse ? 0 : 1,
            margin: collapse ? 0 : 1,
            border: "1px solid #cccccc",
            borderRadius: 1,
            overflow: "hidden",
            whiteSpace: "wrap",
            textOverflow: "ellipsis",
          }}
        >
          {typeof explanation === "string" ? (
            <Box>{explanation}</Box>
          ) : (
            explanation
          )}
        </Collapse>
      )}
    </>
  )
}
