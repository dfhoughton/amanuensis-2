import React, { useEffect } from "react"
import { AppState, Search, SearchResults } from "../types/common"
import { Action, errorHandler } from "../util/reducer"
import { Paper, Stack, Typography } from "@mui/material"
import isEqual from "lodash/isEqual"
import { phraseSearch } from "../util/database"

type DictionaryProps = {
  state: AppState
  dispatch: React.Dispatch<Action>
}

export const noSearchYet: SearchResults = {
  selected: -1,
  phrases: [],
  total: 0,
  page: 1,
  pageSize: 10,
  pages: 0,
}

export const Dictionary: React.FC<DictionaryProps> = ({ state, dispatch }) => {
  const { search = { ...searchDefaults }, searchResults = noSearchYet } = state
  // get initial search results
  useEffect(() => {
    phraseSearch(search)
      .then((searchResults) =>
        dispatch({ action: "searchInit", search, searchResults })
      )
      .catch(errorHandler(dispatch))
  }, [state.search, state.searchResults])
  return (
    <>
      <SearchForm state={state} dispatch={dispatch} />
      <SearchResults state={state} dispatch={dispatch} />
    </>
  )
}

const searchDefaults: Search = {
  exact: true,
  page: 1,
  pageSize: 10,
}

type SearchFormProps = {
  state: AppState
  dispatch: React.Dispatch<Action>
}

const SearchForm: React.FC<SearchFormProps> = ({ state, dispatch }) => {
  const { search = { ...searchDefaults } } = state
  useEffect(() => {
    if (!isEqual(search, state.search)) {
    }
  }, [search])
  return (
    <Stack spacing={1} sx={{ alignItems: "flex-start" }}>
      <Typography variant="h5" component="h1">
        Search
      </Typography>
      {/** TODO fill in the form and add submit handlers */}
    </Stack>
  )
}

const SearchResults: React.FC<SearchFormProps> = ({ state, dispatch }) => {
  const { searchResults = noSearchYet } = state
  const selectionHandler = (i: number) =>
    dispatch({ action: "selectResult", selected: i })
  return (
    <Stack spacing={1} sx={{ alignItems: "flex-start" }}>
      {searchResults.phrases.map((p, i) => (
        <Paper
          key={i}
          elevation={i === searchResults.selected ? 2 : 0}
          onClick={() => selectionHandler(i)}
        >
          <Stack direction="row">{p.lemma}</Stack>
        </Paper>
      ))}
    </Stack>
  )
}
