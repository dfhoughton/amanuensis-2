import { useEffect, useMemo, useState } from "react"

// obtain a port to send messages through; also the URL of the active tab
export const usePort = (reducer: (message: any) => void) => {
    const [port, setPort] = useState<chrome.runtime.Port | null>(null)
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
    return port
}