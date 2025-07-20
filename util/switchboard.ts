/**
 * Code concerning popup-side communications. There is analogous code in the content and background scripts.
 *
 */

import { Citation, Phrase } from "../types/common"

export type MessageFromBackgroundToPopup =
  | { action: "url"; url?: string }
  | { action: "reloaded"; url?: string }
  | { action: "open" }
  | {
      action: "selection"
      selection: Citation
      source: { title?: string; url?: string }
    }
  | { action: "phraseSelected"; phrase: [Phrase, Phrase[]] }
  | { action: "locale"; locale: string }
  | { action: "goingTo"; url: string }
  | Extract<
      MessageFromContentToBackground,
      | { action: "error" }
      | { action: "noSelection" }
      | { action: "highlight" }
      | { action: "goingTo" }
    >

export type MessageFromBackgroundToContent =
  | { action: "getSelection" }
  | { action: "goto"; citation: Citation }
  | { action: "load"; url: string }
  | { action: "select"; selection: Citation }
  | { action: "welcome" }
  | { action: "help"; anchor?: string } // load amanuensis github page into active tab

export type MessageFromContentToBackground =
  | { action: "open" }
  | { action: "selection"; selection: Citation }
  | { action: "noSelection"; url: string }
  | { action: "error"; message: string }
  | { action: "phraseSelected"; phrase: [Phrase, Phrase[]] }
  | { action: "goingTo"; url: string }

export type MessageFromPopupToBackground =
  | { action: "open" }
  | { action: "goto"; citation: Citation }
  | { action: "help"; anchor?: string } // load amanuensis github page into active tab

export const handleMessageFromBackgroundToPopup = (
  msg: MessageFromBackgroundToPopup
) => {}
