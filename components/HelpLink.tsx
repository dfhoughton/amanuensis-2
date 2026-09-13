import HelpOutlineIcon from "@mui/icons-material/HelpOutlineOutlined"
import { Link, Tooltip } from "@mui/material"
import React from "react"

export type HelpLinkProps = {
  anchor: string
  title: string
}

export const HelpLink: React.FC<HelpLinkProps> = ({ anchor, title }) => {
  return (
    <Link
      sx={{ cursor: "pointer" }}
      onClick={async () => {
        let [tab] = await chrome.tabs.query({
          active: true,
          lastFocusedWindow: true,
        })
        if (tab === undefined) {
          // try a different query
          const tabs = await chrome.tabs.query({
            active: true,
            currentWindow: true,
          })
          if (tabs.length === 1) tab = tabs[0]
        }
        if (tab?.id) {
          chrome.tabs.sendMessage(tab.id, {
            action: "help",
            anchor,
          })
        }
      }}
    >
      <Tooltip
        arrow
        enterDelay={200}
        title={`go to the Amanuensis documentation concerning ${title}`}
      >
        <HelpOutlineIcon />
      </Tooltip>
    </Link>
  )
}

export default HelpLink
