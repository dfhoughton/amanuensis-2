/**
 * Code concerning popup-side communications. There is analogous code in the content and background scripts.
 *
 */

import { Citation, Highlights, Phrase } from "../types/common"

export type MessageFromBackgroundToPopup =
  | { action: "url"; url?: string }
  | { action: "reloaded"; url?: string }
  | {
      action: "selection"
      selection: Citation
      source: { title?: string; url?: string }
    }
  | { action: 'phraseSelected', phrase: Phrase, others: Phrase[] }
  | { action: "locale"; locale: string }
  | Extract<
      MessageFromContentToBackground,
      { action: "error" } | { action: "noSelection" } | { action: "highlight" }
    >

export type MessageFromBackgroundToContent =
  | { action: "getSelection" }
  | { action: "goto"; citation: Citation }
  | { action: "load"; url: string }
  | { action: "select"; selection: Citation }

export type MessageFromContentToBackground =
  | { action: "open" }
  | { action: "selection"; selection: Citation }
  | { action: "noSelection" }
  | { action: "error"; message: string }
  | { action: "highlight"; highlights: Highlights }

export type MessageFromPopupToBackground =
  | { action: "open" }
  | Extract<
      MessageFromBackgroundToContent,
      { action: "goto" } | { action: "load" } | { action: "select" }
    >

export const handleMessageFromBackgroundToPopup = (
  msg: MessageFromBackgroundToPopup
) => {}
