import { Avatar, Box, Tooltip } from "@mui/material"
import React from "react"
import { AppTabs, Language } from "../types/common"
import { Action, errorHandler } from "../util/reducer"
import { phraseSearch } from "../util/database"

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

type BigLanguageChipProps = {
  language: Language
  dispatch: React.Dispatch<Action>
}

export const BigLanguageChip: React.FC<BigLanguageChipProps> = ({
  language,
  dispatch,
}) => (
  <Box onClick={languageSearch(language, dispatch)}>
    <Tooltip arrow title={language.name}>
      <Avatar
        sx={{
          cursor: "pointer",
          width: 30,
          height: 30,
          fontSize: "1rem",
          fontWeight: 800,
          color: "white",
          backgroundColor: "secondary.main",
        }}
      >
        {language.locale}
      </Avatar>
    </Tooltip>
  </Box>
)

// for creating a click handler for tags that runs a tag search
export const languageSearch =
  (lang: Language, dispatch: React.Dispatch<Action>) =>
  (e: React.MouseEvent) => {
    e.stopPropagation()
    const s = { languages: [lang.id!] }
    phraseSearch(s)
      .then((searchResults) => {
        dispatch({
          action: "search",
          search: s,
          searchResults,
          tab: AppTabs.Dictionary,
        })
      })
      .catch(errorHandler(dispatch))
  }
