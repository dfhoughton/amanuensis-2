import { Dispatch, DispatchWithoutAction, useEffect, useState } from "react"
import { MessageFromBackgroundToPopup } from "../util/switchboard"
import { Action } from "../util/provisional_reducer"

// obtain a port to send messages through; also the URL of the active tab
export const useConnectionToBackground = (dispatch: Dispatch<Action>) => {
    const [port, setPort] = useState<chrome.runtime.Port | null>(null)
    const reducer = (message: MessageFromBackgroundToPopup) => {
        switch (message.action) {
          case "selection":
            console.log("selection", message.selection)
            dispatch({action: 'selection', selection: message.selection})
            break
          case "url":
            console.log("url", message.url)
            break
          default:
            console.log({ message })
        }
      }
        useEffect(() => {
        console.log("I'm loading now")
        const closedPort = chrome.runtime.connect({name: 'popup'})
        closedPort.onMessage.addListener((message, openPort) => {
            if (!port) setPort(openPort);
            reducer(message);
        })
        // we open the port by using to to send a message
        closedPort.postMessage({ action: "open" })
        return () => {
            console.log("I'm unloading now")
            port?.disconnect()
        }
    }, [])
}