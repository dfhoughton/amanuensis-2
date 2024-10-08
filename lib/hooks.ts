import { Dispatch, DispatchWithoutAction, useEffect, useState } from "react"
import { MessageFromBackgroundToPopup } from "../util/switchboard"
import { Action } from "../util/provisional_reducer"

// obtain a port to send messages through; also the URL of the active tab
export const useConnectionToBackground = (dispatch: Dispatch<Action>) => {
  const [port, setPort] = useState<chrome.runtime.Port | null>(null)
  const reducer = (message: MessageFromBackgroundToPopup) => {
    switch (message.action) {
      case "selection":
        dispatch({ action: "selection", selection: message.selection })
        break
      case "url":
        dispatch({ action: "url", url: message.url || "" })
        break
      case 'locale':
        dispatch(message)
        break
      default:
        console.log({ message })
    }
  }
  useEffect(() => {
    const closedPort = chrome.runtime.connect({ name: "popup" })
    closedPort.onMessage.addListener((message, openPort) => {
      if (!port) {
        dispatch({action: 'openPort', port: openPort})
        setPort(openPort)
      }
      reducer(message)
    })
    // we open the port by using to to send a message
    closedPort.postMessage({ action: "open" })
    return () => {
      dispatch({action: 'closePort'})
      port?.disconnect()
    }
  }, [])
}
