import { Citation, Highlights } from "./types/common"
import { squish, wspat, wsrx } from "./util/string"
import {
  MessageFromBackgroundToContent,
  MessageFromContentToBackground,
} from "./util/switchboard"

console.log("content is ready for action...")
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
    word: phrase,
    before,
    after,
    when: new Date(),
  }
}

// a better highlighting function that relies on content, not ephemeral document structure
// returns the number of instances highlighted
function highlight(citation: Citation): Highlights {
  const rv: Highlights = {
    matches: 0,
    preservedContext: true,
    preservedCase: true,
  }
  const phrase = citation.word
  let rx = wsrx(phrase)
  if (rx === undefined) return rv

  let normalizingCase = false
  const body = document.body
  let candidates = gatherHighlights(phrase, body, rx)
  if (candidates.length === 0) {
    // maybe there has been some fiddling with case on the page?
    rv.preservedCase = false
    normalizingCase = true
    rx = wsrx(phrase, true)!
    candidates = gatherHighlights(phrase, body, rx)
  }
  if (candidates.length === 0) return rv
  // we need to match before and the phrase so we can calculate the context
  let fullContext = `(${wspat(citation.before)})(${wspat(phrase)})${wspat(citation.after)}`
  let fcrx = normalizingCase
    ? new RegExp(fullContext, "i")
    : new RegExp(fullContext)
  let seekFullContext = (rv.preservedContext = false)
  let elementsToHighlight: HTMLElement[]
  if (candidates.length === 1) {
    seekFullContext = rv.preservedContext = fcrx.test(
      candidates[0]!.textContent ?? ""
    )
    elementsToHighlight = candidates
  } else {
    // filter down to those with the correct context
    const primeCandidates = candidates.filter((e) =>
      fcrx.test(e.textContent ?? "")
    )
    if (primeCandidates.length) {
      seekFullContext = rv.preservedContext = true
      elementsToHighlight = primeCandidates
    } else {
      elementsToHighlight = candidates
    }
  }
  document.getSelection()?.removeAllRanges()
  const searchRx = seekFullContext ? fcrx : rx
  for (const c of elementsToHighlight) {
    let n = 0
    let t = c.textContent ?? ""
    while (n < t.length) {
      let m = t.substring(n).match(searchRx)
      if (m) {
        let matchedString,
          bs = "",
          ss
        const offset = m.index!
        if (seekFullContext) {
          [matchedString, bs, ss] = m
        } else {
          [matchedString] = m
          ss = matchedString
        }
        n = offset + matchedString.length
        const start = offset + bs.length
        const end = start + ss.length
        const range = new Range()
        let s = elementAndOffset(c, start)
        if (!s) continue
        let e = elementAndOffset(c, end)
        if (!e) continue
        range.setStart(...s)
        range.setEnd(...e)
        document.getSelection()?.addRange(range)
        rv.matches++
      } else {
        break
      }
    }
  }
  // highlight the first match
  elementsToHighlight[0].scrollIntoView({
    behavior: "smooth",
    block: "center",
    inline: "center",
  })
  return rv
}

// given a node, return the child node at a particular text offset and the offset within
// the child corresponding to the offset
function elementAndOffset(
  e: HTMLElement,
  offset: number
): [ChildNode, number] | undefined {
  let n = 0
  for (const c of e.childNodes) {
    const l = (c.textContent ?? "").length
    if (n + l < offset) {
      n += l
    } else {
      const o = offset - n
      if (c.nodeType === 3) return [c, o]
      return elementAndOffset(c as HTMLElement, o)
    }
  }
}

// recursively search the DOM for HTMLElements immediately dominating text containing a given phrase
function gatherHighlights(
  phrase: string,
  node: HTMLElement,
  rx: RegExp
): HTMLElement[] {
  if (node.childNodes.length === 1 && node.childNodes[0].nodeType === 1)
    return gatherHighlights(phrase, node.childNodes[0] as HTMLElement, rx)
  const candidates = Array.from(node.childNodes)
    .filter((n: any) => n.nodeType === 1)
    .filter((n: any) => !(n.tagName === "SCRIPT" || n.tagName === "STYLE"))
    .filter((n: any) => rx?.test(n.textContent ?? ""))
  // the following handles the case where we had it in the parent node but we can't find it among
  // the children
  if (candidates.length === 0) {
    // maybe the children just have part of it
    if (rx?.test(node.textContent ?? "")) return [node]
    return []
  }
  if (candidates.length === 1) {
    const c = candidates[0] as HTMLElement
    if (c.childNodes[0]?.nodeType === 1) return gatherHighlights(phrase, c, rx)
    // we've drilled down deep enough
    return [c]
  }
  return candidates
    .map((n) => gatherHighlights(phrase, n as HTMLElement, rx))
    .flat(1)
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
      if (citation?.where) {
        if (window.location.href === citation.where) {
          const highlights = highlight(citation)
          if (highlights.matches === 0) {
            port.postMessage({
              action: "error",
              message: "could not find citation on page",
            })
          } else {
            port.postMessage({
              action: "highlight",
              highlights,
            })
          }
        } else {
          window.location.assign(citation.where)
        }
      } else {
        port.postMessage({ action: "error", message: "received no URL" })
      }
      break
    case "load": // for just going to a new URL
      const { url } = msg
      if (window.location.href !== url) {
        window.location.assign(url)
      }
      break
    case "select":
      const { selection: toSelect } = msg
      if (toSelect) {
        const highlights = highlight(toSelect)
        if (highlights.matches === 0) {
          port.postMessage({
            action: "error",
            message: "could not find citation on page",
          })
        } else {
          port.postMessage({
            action: "highlight",
            highlights,
          })
        }
      } else {
        port.postMessage({ action: "error", message: "received no citation" })
      }
      break
  }
})
