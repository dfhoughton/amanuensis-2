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

export type ContentSelection = {
  phrase: string
  before: string
  after: string
  selection: Selection
}

export type SourceRecord = {
  url: string // the URL the selection was found on
  title: string // the chrome extension provides this, and it may be useful for display and summary
}

export interface PhraseInContext {
  phrase: string // the text selected
  before: string // the context preceding the selection
  after: string // the context following the selection
}

export interface CitationRecord extends PhraseInContext {
  // some text extracted at the moment of selection
  // this is saved for display and summary and because if pages change Selection objects may cease to work
  note: string
  when: Date[] // the times that this selection was looked up *on the same page*
  selection: Selection // where the text was found on the page
  source: SourceRecord // the page where the text was found
}

export interface Citation {
  word: string
  context: {
    before: string
    after: string
    instance: number // if there is more than one phrase with this before and after, which one is it
  }
  when: Date
  where: string // the URL of the tab
  note?: string //
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
}
