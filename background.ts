import { citationToPhrase, languageForLocale } from "./util/database"
import {
  MessageFromBackgroundToContent,
  MessageFromBackgroundToPopup,
  MessageFromContentToBackground,
  MessageFromPopupToBackground,
} from "./util/switchboard"

const state: {
  contentPort?: chrome.runtime.Port
  popupPort?: chrome.runtime.Port
} = {}

function sendToContent(msg: MessageFromBackgroundToContent) {
  state.contentPort?.postMessage(msg)
}
function sendToPopup(msg: MessageFromBackgroundToPopup) {
  state.popupPort?.postMessage(msg)
}

function handlePopupMessage(msg: MessageFromPopupToBackground) {
  switch (msg.action) {
    case "open":
      chrome.tabs.query({ active: true }, (tabs) => {
        const { url } = tabs[0]
        if (url) {
          sendToContent({ action: "getSelection" })
        }
      })
      break
    case "load":
    case "goto":
    case "select":
      sendToContent(msg)
      break
    default:
      console.warn('could not handle action', msg)
  }
}

function handleContentMessage(msg: MessageFromContentToBackground) {
  switch (msg.action) {
    case "selection":
      chrome.tabs.query({ active: true }, (tabs) => {
        const tab = tabs[0]
        if (tab) {
          const { title, url } = tab
          const { selection } = msg;
          selection.title = title
          selection.url = url
          const text = `${selection.before}${selection.phrase}${selection.after}`
          chrome.i18n.detectLanguage(text).then((rv) => {
            const locale = rv.languages.sort((a, b) =>  b.percentage - a.percentage)[0].language
            citationToPhrase(selection, locale).then((phrase) => {
              sendToPopup({action: 'phraseSelected', phrase})
            }).catch((e) => {
              console.error('trouble getting citations for phrase', e);
              sendToPopup({action: 'error', message: e.message})
            })
          }).catch((e) => {
            console.error(e);
            sendToPopup({action: 'error', message: e.message})
          })
        }
      })
      break
    case "open":
      // this should be a reload, but send back the active URL to confirm it's what the popup expects
      chrome.tabs.query({ active: true }, (tabs) => {
        const tab = tabs[0]
        if (tab) {
          const { url } = tab
          sendToPopup({ action: "reloaded", url })
        }
      })
      break
    case "noSelection":
    case "error":
      sendToPopup(msg)
      break
  }
}

chrome.runtime.onConnect.addListener(function (port) {
  port.onMessage.addListener(function (msg) {
    switch (port.name) {
      case "content":
        state.contentPort = port
        handleContentMessage(msg)
        break
      case "popup":
        state.popupPort = port
        handlePopupMessage(msg)
        break
      default:
        console.error(`unfamiliar port name: ${port.name}`)
    }
  })
  port.onDisconnect.addListener(function () {
    switch (port.name) {
      case "popup":
        state.popupPort = undefined
        break
      case "content":
        state.contentPort = undefined
        break
      default:
        console.error(`unfamiliar port name: ${port.name}`)
    }
  })
})
