import { createRoot } from "react-dom/client"
import App from "./components/App"
window.onload = () => {
  const container = document.getElementById("root")
  if (container) {
    const root = createRoot(container)
    root.render(<App />)
  } else {
    console.error("No root element found")
  }
}
