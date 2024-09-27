/**
 * Code concerning popup-side communications. There is analogous code in the content and background scripts.
 *
 */

import { CitationRecord, ContentSelection } from "../types/common"

export type MessageFromBackgroundToPopup =
  | { action: "url"; url?: string }
  | { action: "reloaded"; url?: string }
  | {
    action: "selection"
    selection: ContentSelection
    source: { title?: string; url?: string }
  }
| Extract<
      MessageFromContentToBackground,
      { action: "error" } | { action: "noSelection" }
    >

export type MessageFromBackgroundToContent =
  | { action: "getSelection" }
  | { action: "goto"; citation: CitationRecord }
  | { action: "load"; url: string }
  | { action: "select"; selection: CitationRecord }

export type MessageFromContentToBackground =
  | { action: "open" }
  | { action: "selection"; selection: ContentSelection }
  | { action: "noSelection" }
  | { action: "error"; message: string }

export type MessageFromPopupToBackground =
  | { action: "open" }
  | Extract<
      MessageFromBackgroundToContent,
      { action: "goto" } | { action: "load" } | { action: "select" }
    >

export const handleMessageFromBackgroundToPopup = (msg: MessageFromBackgroundToPopup) => {

}