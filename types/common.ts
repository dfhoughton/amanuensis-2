import { AlertColor, AlertPropsColorOverrides } from "@mui/material"
import { OverridableStringUnion } from "@material-ui/types"
import { DistanceMetric } from "../util/similarity_sorter"

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
  note?: string
  tags?: number[] // foreign keys into the tags table
  title?: string
  url?: string
  locale?: string // the locale provided by Chrome for this particular citation
  canonical?: boolean
}

// a link between two phrases
export type Relation = {
  id?: number
  p1: number // a phrase id
  p2: number // another phrase id
}

export interface Phrase {
  id?: number
  lemma: string
  note?: string
  tags?: number[] // foreign keys into the tags table
  relations?: number[] // a collection of relation ids
  languageId?: number
  relatedPhrases?: Map<number, [number, Phrase]> // a cache of phrases pulled down from relations
  citations: Citation[]
  updatedAt: Date
  createdAt: Date
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

export enum SearchTabs {
  Free = "free",
  Similar = "similar",
  Page = "page",
}

export type TextSearch = {
  text: string
  exact: boolean
  whole: boolean
  caseSensitive: boolean
}

export enum SortType {
  Lemma,
  Creation,
  Update
}

export enum SortDirection {
  Ascending,
  Descending
}

export type Sort = {
  type: SortType
  direction: SortDirection
}

// used to find phrases in the dictionary
export type FreeFormSearch = {
  lemma?: TextSearch
  text?: TextSearch
  tags?: number[]
  languages?: number[]
  pageSize?: number
  page?: number
  sort?: Sort
}

// used to find phrases a citation/phrase might be merged with
export type SimilaritySearch = {
  phrase: string
  limit: number
  metric: DistanceMetric
  languages?: number[]
  pageSize?: number
  page?: number
}

// used to search for all citations at a particular URL
export type UrlSearch = {
  url: string
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

export type MessageLevel = OverridableStringUnion<
  AlertColor,
  AlertPropsColorOverrides
>

export type AppState = {
  tab: AppTabs
  phrase?: Phrase
  maybeMeld?: Phrase[] // phrases in a compatible locale which an identical citation phrase (modulo case)
  citationIndex?: number // which citation is currently displayed
  priorPhrase?: Phrase // so we can see when phrase is dirty and should be saved
  languageId?: number // do we need this?
  message?: string // triggers the display of a toast
  messageLevel?: MessageLevel // colors the toast
  config?: Configuration
  freeSearch?: FreeFormSearch
  similaritySearch?: SimilaritySearch
  searchResults?: SearchResults
  freeSearchResults?: SearchResults
  similaritySearchResults?: SearchResults
  urlSearch?: UrlSearch
  urlSearchResults?: SearchResults
  searchTab?: SearchTabs
}

export type Configuration = {
  id?: number // here to make configuration compatible with indexeddb
  showHelp?: boolean
  distanceMetric?: DistanceMetric
  maxSimilarPhrases?: number
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
