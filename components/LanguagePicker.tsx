import {
  Box,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  Stack,
  Tooltip,
} from "@mui/material"
import React, { useRef } from "react"
import { Language } from "../types/common"
import { FauxPlaceholder } from "./FauxPlaceholder"
import { Language as LanguageIcon } from "@mui/icons-material"

type Props = {
  languages: Language[]
  languageIds: number[]
  onDelete: (l: Language) => VoidFunction
  onAdd: (l: Language) => VoidFunction
}
/** A special form element for selecting languages */
export const LanguagePicker: React.FC<Props> = ({
  languages,
  languageIds,
  onDelete,
  onAdd,
}) => {
  const [languageMenuAnchorEl, setLanguageMenuAnchorEl] =
    React.useState<null | HTMLElement>(null)
  const languageMenuAnchor = useRef<SVGSVGElement>(null)
  const languageMenuOpen = Boolean(languageMenuAnchorEl)
  return (
    <Stack direction="row" spacing={1} sx={{ justifyContent: "space-between" }}>
      <Box
        onClick={() =>
          setLanguageMenuAnchorEl(languageMenuAnchor.current as any)
        }
      >
        {!languageIds.length && <FauxPlaceholder>Languages</FauxPlaceholder>}
        {!!languages &&
          languageIds
            .map((l) => languages.find((lang) => lang.id === l)!)
            .sort((a, b) => (a.name < b.name ? -1 : 1))
            .filter((l) => l)
            .map((lang) => (
              <Chip
                label={lang.locale}
                key={lang.id}
                size="small"
                onDelete={onDelete(lang)}
              />
            ))}
      </Box>
      <Tooltip arrow title="Filter by language">
        <IconButton
          color="primary"
          size="small"
          onClick={(e) => setLanguageMenuAnchorEl(e.currentTarget)}
        >
          <LanguageIcon fontSize="inherit" ref={languageMenuAnchor} />
        </IconButton>
      </Tooltip>
      <Menu
        MenuListProps={{ dense: true }}
        anchorEl={languageMenuAnchorEl}
        open={languageMenuOpen}
        onClose={() => setLanguageMenuAnchorEl(null)}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.preventDefault()
            setLanguageMenuAnchorEl(null)
          }
        }}
      >
        {!!languages &&
          languages
            .sort((a, b) => (a.name < b.name ? -1 : 1))
            .map((l) => {
              const selected = languageIds.some((lId) => lId === l.id)
              const handler = onAdd(l)
              return (
                <MenuItem
                  key={l.id!}
                  selected={selected}
                  disabled={selected}
                  onClick={() => {
                    handler()
                    setLanguageMenuAnchorEl(null)
                  }}
                >
                  {l.name}
                </MenuItem>
              )
            })}
      </Menu>
    </Stack>
  )
}
