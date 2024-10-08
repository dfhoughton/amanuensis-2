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
  word: string
  before: string
  after: string
  when: Date
  where?: string // the URL of the tab
}

export interface Word {
  lemma: string
  citations: Citation[]
}

export interface dictionary {
  language: string
  words: Word[]
}

export type AppState = {
  word?: Word
  url?: string
  locale?: string
  port?: chrome.runtime.Port
}

// describes success of highlighting a citation on a page
export type Highlights = {
  matches: number
  preservedContext: boolean
  preservedCase: boolean
}
