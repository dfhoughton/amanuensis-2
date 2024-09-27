import { createRoot } from "react-dom/client"
import App from "./components/App"
import React from "react"
window.onload = () => {
  const container = document.getElementById("root")
  const root = createRoot(container!)
  root.render(<App />)
}
