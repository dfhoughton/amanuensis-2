import { Citation } from "./types/common"
import { magicUrl } from "./util/magic_url"
import { squish } from "./util/string"
import {
  MessageFromBackgroundToContent,
  MessageFromContentToBackground,
} from "./util/switchboard"

/*
Send non-trivial selections to the background process to prepare for annotation.

Selections are serialized as the selection and its context -- text before and after
*/

function parents(node: Node) {
  const ar = [node]
  let n = node.parentNode as Node
  while (n) {
    ar.unshift(n)
    n = n.parentNode as Node
  }
  return ar
}

function commonParent(anchor: Node, focus: Node) {
  if (anchor === focus) {
    return anchor // null signifies anchor and focus are the same node
  }
  const aParents = parents(anchor),
    fParents = parents(focus)
  let i = 2 // skip the document and html nodes
  while (true) {
    if (aParents[i] !== fParents[i]) {
      return aParents[i - 1]
    }
    i += 1
  }
}

type NodeDescription = {
  offset: number
  node: Node
  path?: string
  parentOffset?: number
  parent?: Node | null
}

function describeSelectionNode(n: Node, offset: number): NodeDescription {
  if (n.nodeType === Node.TEXT_NODE) {
    const ar = n.parentNode?.childNodes ?? []
    for (let i = 0; i < ar.length; i++) {
      if (ar[i] === n) {
        return { offset, node: n, parentOffset: i, parent: n.parentNode }
      }
    }
  }
  return { offset, node: n }
}

// extract the useful information out of a selection
function wrapSelection(): Citation | undefined {
  const selection = document.getSelection()
  if (!selection || selection.isCollapsed) {
    return
  }
  let phrase = selection.toString()
  if (!/\S/.test(phrase)) {
    return
  }
  phrase = squish(phrase)!
  let anchor = describeSelectionNode(
    selection.anchorNode!,
    selection.anchorOffset
  )
  let focus = describeSelectionNode(selection.focusNode!, selection.focusOffset)
  const ap = anchor.parent || anchor.node,
    fp = focus.parent || focus.node
  const parent = commonParent(ap, fp)
  const context = squish(parent.textContent ?? "") ?? ""
  const i = context.indexOf(phrase)
  const before = context.substring(0, i),
    after = context.substring(i + phrase.length)
  return {
    phrase: phrase,
    before,
    after,
    when: new Date(),
  }
}

/** Look for anything the page intends to be understood as a title */
function getTitle(): string {
  // title element
  const titleElement = document.head.getElementsByTagName("title")[0]
  if (titleElement) return titleElement.innerText
  // open graph title
  const ogMetaTitle = Array.from(document.head.getElementsByTagName("meta"))
    .find(
      (e) =>
        e.getAttribute("data-rh") === "true" &&
        e.getAttribute("property") === "og:title"
    )
    ?.getAttribute("content")
  if (ogMetaTitle) return ogMetaTitle
  // Xitter title
  const twitterTitle = Array.from(document.head.getElementsByTagName("meta"))
    .find(
      (e) =>
        e.getAttribute("data-rh") === "true" &&
        e.getAttribute("name") === "twitter:title"
    )
    ?.getAttribute("content")
  if (twitterTitle) return twitterTitle
  // first h1
  const firstH1 = document.body.getElementsByTagName("h1")[0]
  if (firstH1) return firstH1.innerText
  // give up
  return ""
}

chrome.runtime.onMessage.addListener(function (
  request: MessageFromBackgroundToContent,
  _sender,
  sendResponse: (response: MessageFromContentToBackground) => void
) {
  switch (request.action) {
    case "goto":
      const { citation } = request
      const magic = magicUrl(citation)
      if (magic) {
        sendResponse({ action: "goingTo", url: magic })
        window.location.assign(magic)
      } else {
        sendResponse({ action: "error", message: "received no URL" })
      }
      break
    case "help": // load documentation into current tab
      const { anchor } = request
      window.location.assign(
        `https://dfhoughton.github.io/amanuensis-2/${
          anchor ? `#${anchor}` : ""
        }`
      )
      break
    case "getSelection":
      const selection = wrapSelection()
      if (selection) {
        selection.title = getTitle()
        selection.url = document.URL
        sendResponse({ action: "selection", selection })
      } else {
        sendResponse({ action: "noSelection", url: window.location.href })
      }
      break
    default:
      throw { message: "unexpected request", request }
  }
  return true
})

// tell background we're ready
chrome.runtime.sendMessage({ action: "open" }, (response) =>
  console.log("Amanuensis received this confirmation", response)
)
