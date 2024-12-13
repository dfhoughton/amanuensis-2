import { useEffect } from "react"
import { Action } from "../util/reducer"
import {
  MessageFromBackgroundToPopup,
  MessageFromPopupToBackground,
} from "../util/switchboard"

// send initial request for selected text and start listening
export const useCommunicationCenter = (dispatch: React.Dispatch<Action>) => {
  useEffect(() => {
    chrome.runtime.sendMessage(
      { action: "open" } as MessageFromPopupToBackground,
      (response: MessageFromBackgroundToPopup) => {
        switch (response.action) {
          case "error":
          case "noSelection":
          case "phraseSelected":
            dispatch(response)
            break
          default:
            console.error(
              "unhandled response from background to popup",
              response
            )
            dispatch({
              action: "error",
              message: `Unhandled message from background; type: ${response.action}`,
            })
        }
      }
    )
    // for messages from background not triggered by the initial send message
    chrome.runtime.onMessage.addListener(
      (
        message: MessageFromBackgroundToPopup,
        sender,
        _sendResponse: (m: MessageFromPopupToBackground) => void
      ) => {
        switch (message.action) {
          case "error":
            dispatch(message)
            break
          case "reloaded":
            dispatch({
              action: "message",
              messageLevel: "info" as any,
              message: `The active tab has reloaded.`,
            })
            break
          default:
            console.error(
              "unhandled response from background to popup",
              message
            )
            dispatch({
              action: "error",
              message: `Unhandled message from background; type: ${message.action}`,
            })
        }
        return true
      }
    )
  }, [])
}
