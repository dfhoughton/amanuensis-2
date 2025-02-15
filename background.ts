import { citationToPhrase } from "./util/database"
import {
  MessageFromBackgroundToContent,
  MessageFromBackgroundToPopup,
  MessageFromContentToBackground,
  MessageFromPopupToBackground,
} from "./util/switchboard"

function sendToContent(
  msg: MessageFromBackgroundToContent,
  sendResponse: (m: MessageFromBackgroundToPopup) => void
) {
  chrome.tabs.query({ active: true }).then((tabs) => {
    if (tabs.length) {
      const tab = tabs[0]
      chrome.tabs.sendMessage(
        tab.id!,
        msg,
        (m: MessageFromContentToBackground) => {
          if (m == null) return // we get a null message in the extensions manager; we may other places as well
          switch (m.action) {
            case "noSelection":
            case "phraseSelected":
              sendResponse(m)
              break
            case "selection":
              chrome.tabs.query({ active: true }, (tabs) => {
                const tab = tabs[0]
                if (tab) {
                  const { title, url } = tab
                  const { selection } = m
                  selection.title = title
                  selection.url = url
                  const text = `${selection.before}${selection.phrase}${selection.after}`
                  chrome.i18n
                    .detectLanguage(text)
                    .then((rv) => {
                      const locale = rv.languages.sort(
                        (a, b) => b.percentage - a.percentage
                      )[0].language
                      citationToPhrase(selection, locale)
                        .then((phrase) => {
                          sendResponse({ action: "phraseSelected", phrase })
                        })
                        .catch((e) => {
                          console.error(
                            "trouble getting citations for phrase",
                            e
                          )
                          sendResponse({ action: "error", message: e.message })
                        })
                    })
                    .catch((e) => {
                      console.error(e)
                      sendResponse({ action: "error", message: e.message })
                    })
                }
              })
              break
            default:
              sendResponse({
                action: "error",
                message: `We do not yet handle content action ${m.action}.`,
              })
          }
        }
      )
    } else {
      sendResponse({ action: "error", message: "No active tab." })
    }
  })
}
function sendToPopup(
  msg: MessageFromBackgroundToPopup,
  sendResponse: (m: MessageFromBackgroundToContent) => void
) {
  chrome.runtime.sendMessage(msg, sendResponse)
}

function handlePopupMessage(
  msg: MessageFromPopupToBackground,
  sendResponse: (m: MessageFromBackgroundToPopup) => void
) {
  switch (msg.action) {
    case "open":
      sendToContent({ action: "getSelection" }, sendResponse)
      break
    case "goto":
      sendToContent(msg, sendResponse)
      break
    default:
      console.error("could not handle popup action action", msg)
  }
}

function handleContentMessage(
  msg: MessageFromContentToBackground,
  contentResponseSender: (m: MessageFromBackgroundToContent) => void
) {
  switch (msg.action) {
    case "open":
      // this should be a reload, but send back the active URL to confirm it's what the popup expects
      console.log("a tab just checked in!")
      contentResponseSender({ action: "welcome" })
      break
    case "noSelection":
    case "goingTo":
    case "error":
      sendToPopup(msg, contentResponseSender)
      break
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (sender.tab) {
    handleContentMessage(message, sendResponse)
  } else {
    handlePopupMessage(message, sendResponse)
  }
  return true
})
