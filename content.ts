import { Citation } from "./types/common"
import { magicUrl } from "./util/magic_url"
import { squish } from "./util/string"
import { MessageFromBackgroundToContent } from "./util/switchboard"

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

// our communication channel to the background and, via the background, to the popup
const port = chrome.runtime.connect({ name: "content" })
// knock on the port to open up the pipe
port.postMessage({ action: "open" })
port.onMessage.addListener(function (msg: MessageFromBackgroundToContent) {
  switch (msg.action) {
    case "getSelection":
      const selection = wrapSelection()
      if (selection) {
        port.postMessage({ action: "selection", selection })
      } else {
        port.postMessage({ action: "noSelection" })
      }
      break
    case "goto":
      const { citation } = msg
      const magic = magicUrl(citation)
      if (magic) {
        window.location.assign(magic)
      } else {
        port.postMessage({ action: "error", message: "received no URL" })
      }
      break
  }
})
