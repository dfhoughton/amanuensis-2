import { Dispatch, DispatchWithoutAction, useEffect, useState } from "react"
import { MessageFromBackgroundToPopup } from "../util/switchboard"
import { Action } from "../util/provisional_reducer"

// obtain a port to send messages through; also the URL of the active tab
export const useConnectionToBackground = (dispatch: Dispatch<Action>) => {
  const [port, setPort] = useState<chrome.runtime.Port | null>(null)
  useEffect(() => {
    const closedPort = chrome.runtime.connect({ name: "popup" })
    closedPort.onMessage.addListener((message, openPort) => {
      if (!port) {
        dispatch({action: 'openPort', port: openPort})
        setPort(openPort)
      }
      dispatch(message)
    })
    // we open the port by using to to send a message
    closedPort.postMessage({ action: "open" })
    return () => {
      dispatch({action: 'closePort'})
      port?.disconnect()
    }
  }, [])
}
