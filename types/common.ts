import { AlertColor, AlertPropsColorOverrides } from "@mui/material"
import { OverridableStringUnion } from '@material-ui/types';
import { Action } from "../util/reducer"

// a representation of a selection
export type Selection = {
  path: string // somewhat optimized/generalized CSS selector to find the common parent node holding the anchor and focus
  anchor: SelectableNode // where the selection starts
  focus: SelectableNode // where the selection ends
}

// representing the anchor or focus of a selection
export type SelectableNode = {
  path: string // a CSS selector providing an *absolute* path (relative to a common parent) of the DOM node which is contains the relevant text node
  offset: number // the character offset from the beginning of the relevant text node
  parentOffset?: number // the index of the relevant text node among the children of the parent node -- absent if the point in question is not within a text node
}

export interface Citation {
  phrase: string
  before: string
  after: string
  when: Date
  where?: string // the URL of the tab
  note?: string
  tags?: number[] // foreign keys into the tags table
  title?: string
  url?: string
  locale?: string // the locale provided by Chrome for this particular citation
  canonical?: boolean
}

export interface Phrase {
  id?: number
  lemma: string
  note?: string
  tags?: number[] // foreign keys into the tags table
  languageId?: number
  citations: Citation[]
  updatedAt: Date
}

export interface dictionary {
  language: Language
  phrases: Phrase[]
}

export enum AppTabs {
  Note = "note",
  Dictionary = "dictionary",
  Tags = "tags",
  Configuration = "configuration",
}

export type Search = {
  phrase?: string
  exact?: boolean
  caseSensitive?: boolean
  tags?: number[]
  languages?: number[]
  pageSize?: number
  page?: number
}

export type SearchResults = {
  selected: number // which individual result is selected
  page: number // redundant
  pageSize: number // redundant
  pages: number
  total: number
  phrases: Phrase[]
}

export type MessageLevel = OverridableStringUnion<AlertColor, AlertPropsColorOverrides>

export type AppState = {
  tab: AppTabs
  phrase?: Phrase
  citationIndex?: number // which citation is currently displayed
  priorPhrase?: Phrase // so we can see when phrase is dirty and should be saved
  maybeMerge?: Phrase[]
  languageId?: number // do we need this?
  port?: chrome.runtime.Port // so the reducer can send stuff on to the background
  message?: string // triggers the display of a toast
  messageLevel?: MessageLevel // colors the toast
  config?: Configuration
  search?: Search
  searchResults?: SearchResults
}

export type Configuration = {
  id?: number // here to make configuration compatible with indexeddb
  showHelp?: boolean
}

// describes success of highlighting a citation on a page
export type Highlights = {
  matches: number
  preservedContext: boolean
  preservedCase: boolean
}

export type Language = {
  id?: number
  name: string
  locale?: string // the expected locale for this language
  // the keys are the two-letter locale identifiers Chrome may identify this language by
  // the values are the number of citations for the given language with this locale
  locales: Record<string, number>
  count: number // number of phrases assigned to language -- this is a denormalization
}

// for tagging notes and citations
export type Tag = {
  id?: number
  name: string
  description?: string
  color?: string
  bgcolor?: string
}