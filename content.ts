import { CitationRecord, ContentSelection } from "./types/common"
import {
  MessageFromBackgroundToContent,
  MessageFromContentToBackground,
} from "./util/switchboard"

console.log("content is ready for action...")
/*
Send non-trivial selections to the background process to prepare for annotation.

Selections are serialized as the selection, its context -- text before and after -- and
a selector to find its node.
*/

// count the number of hits for a complete path
const cachedPathCounts = new Map()
function countHits(path) {
  let count = cachedPathCounts[path]
  if (count != null) {
    return count
  }
  count = document.querySelectorAll(path).length
  cachedPathCounts[path] = count
  return count
}

/*
given a list of classes (strings), return all sublists producible by deleting some
members of the list, so, from ["foo", "bar", "baz"], ["", ".foo", ".bar", ".baz", ".foo.bar", ".foo.baz", ".bar.baz", ".foo.bar.baz"]
the list is de-duped, so [1,1,1] returns ["", ".1", ".1.1", ".1.1.1"]
*/
function classCombinations(ar) {
  const l = ar.length
  const seen: Set<string> = new Set()
  if (l) {
    const n = 1 << l
    const combinations: string[] = []
    for (let i = 0; i < n; i++) {
      let a = i,
        s = ""
      for (let j = 0; j < l; j++) {
        if (a & 1) {
          s += "." + ar[j]
        }
        a = a >> 1
        if (!a) {
          break
        }
      }
      if (!seen.has(s)) {
        seen.add(s)
        combinations.push(s)
      }
    }
    return combinations
  }
}

// how selective is a particular class?
const classUses: Map<string, number> = new Map()
function hits(cz: string) {
  let n = classUses[cz]
  if (!n) {
    // n will necessarily never be 0 after the line below
    n = document.getElementsByClassName(cz).length
    classUses[cz] = n
  }
  return n
}

// escapes weird characters in class names
function escapeClass(cz: string): string {
  const chars: string[] = []
  const conv = function (c) {
    return "\\" + c.codePointAt(0).toString(16) + " "
  }
  for (let i = 0; i < cz.length; i++) {
    const c = cz.charAt(i)
    if (/[\w-]/.test(c)) {
      if (i || !/[\d-]/.test(c)) {
        chars.push(c)
      } else {
        chars.push(conv(c))
      }
    } else {
      chars.push(conv(c))
    }
  }
  return chars.join("").replace(/ $/, "")
}

function escapeClasses(classes: string[]) {
  const ar: string[] = []
  for (let i = 0; i < classes.length; i++) {
    ar.push(escapeClass(classes[i]))
  }
  return ar
}

// to reduce combinatorial explosions when looking for a good path, prune the class list to 4 or fewer useful classes
function optimalClasses(classes: string[]) {
  const uniq: Set<string> = new Set()
  for (let i = 0; i < classes.length; ) {
    if (uniq.has(classes[i])) {
      classes.splice(i, 1)
    } else {
      uniq.add(classes[i])
      i += 1
    }
  }
  classes = escapeClasses(classes)
  if (classes.length <= 4) {
    return classes
  }
  classes.sort(function (a, b) {
    // prefer the less common class
    let cmp = hits(a) - hits(b)
    if (!cmp) {
      // prefer the class with a shorter name
      cmp = a.length - b.length
    }
    if (!cmp) {
      // as a tie breaker, prefer the class earlier in alphabetical order
      cmp = a < b ? -1 : 1
    }
    return cmp
  })
  return classes.slice(0, 4)
}

// collect a set of ways one might find a particular node which we can then winnow down
function descriptors(n: Node): string[] {
  let descriptors: string[] = [n.nodeName]
  if (n.hasOwnProperty("classList")) {
    const node = n as HTMLElement
    if (node.id) {
      descriptors.push(`${node.nodeName}#${node.id}`)
    }
    let classes = classCombinations(optimalClasses([...node.classList]))
    if (classes) {
      let rv: string[] = []
      for (let i = 0; i < classes.length; i++) {
        let c = classes[i]
        for (let j = 0; j < descriptors.length; j++) {
          if (c) {
            rv.push(descriptors[j] + c)
          } else {
            rv.push(descriptors[j])
          }
        }
      }
      return rv
    } else {
      return descriptors
    }
  } else {
    return descriptors
  }
}

// find a selector that is not terribly long but as specifically as possible identifies the given node
const pathSymbol = Symbol("best path")
function simplestPath(node: Node | null, suffix?: string): string | undefined {
  if (node === null) return suffix
  let path
  if (!suffix) {
    path = node[pathSymbol]
    if (path) {
      return path
    }
  }
  let paths = descriptors(node)
  if (suffix) {
    for (let i = 0; i < paths.length; i++) {
      paths[i] = paths[i] + " > " + suffix
    }
  }
  path = paths.sort(function (a, b) {
    return (
      countHits(a) - countHits(b) || a.length - b.length || (a <= b ? -1 : 1)
    )
  })[0]
  if (
    ((node as HTMLElement).tagName &&
      (node as HTMLElement).tagName === "BODY") ||
    countHits(path) === 1
  ) {
    if (!suffix) {
      node[pathSymbol] = path
    }
    return path
  }
  const maybeBetterPath = simplestPath(node.parentNode as Node, path)
  if (countHits(path) <= countHits(maybeBetterPath)) {
    if (!suffix) {
      node[pathSymbol] = path
    }
    return path
  }
  if (!suffix) {
    node[pathSymbol] = maybeBetterPath
  }
  return maybeBetterPath
}

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

function absolutePath(ancestor: Node, descendant: Node): string {
  let n = descendant
  const steps: string[] = []
  while (n !== ancestor) {
    const children = n.parentNode!.children
    for (let i = 0; i < children.length; i++) {
      if (children[i] === n) {
        steps.unshift(`:nth-child(${i + 1})`)
        break
      }
    }
    if (n && n.parentNode) {
      n = n.parentNode! as Node
    } else {
      break
    }
  }
  return steps.join(" > ")
}

function squish(string: string) {
  if (string) {
    return string.replace(/^\s+|\s+$/g, "").replace(/\s+/g, " ")
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

type TrimmedNode = {
  path: string
  offset: number
  parentOffset?: number
}

// simplify the representation of a node
function trimNode({
  offset,
  path,
  parentOffset,
  parent,
}: NodeDescription): TrimmedNode {
  if (path === undefined) throw "the object passed to trimNode must have a path"
  if (parent) {
    return { path, offset, parentOffset }
  } else {
    return { path, offset }
  }
}

// extract the useful information out of a selection
function wrapSelection(): ContentSelection | undefined {
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
  const before = context.substr(0, i),
    after = context.substr(i + phrase.length)
  const path = simplestPath(parent)!,
    anchorPath = absolutePath(parent, ap),
    focusPath = absolutePath(parent, fp)
  anchor.path = anchorPath
  focus.path = focusPath
  return {
    phrase,
    before,
    after,
    selection: { path, anchor: trimNode(anchor), focus: trimNode(focus) },
  }
}

function findSelection({ phrase, before, after, selection }) {
  const context = before + phrase + after
  const candidates = document.querySelectorAll(selection.path)
  for (let i = 0; i < candidates.length; i++) {
    const candidate = candidates[i]
    if ((squish(candidate.textContent) ?? "").indexOf(context) > -1) {
      return candidate
    }
  }
}

// attempt to find the original selection, select it again, and scroll it into view
function highlightSelection(wrappedSelection: CitationRecord) {
  const element = findSelection(wrappedSelection)
  if (element) {
    const { anchor: a, focus: f } = wrappedSelection.selection
    let anchor: Node = a.path ? element.querySelector(a.path) : element
    let focus: Node = f.path ? element.querySelector(f.path) : element
    const scrollable: any = anchor ?? element
    if (scrollable.scrollIntoView) {
      scrollable.scrollIntoView({
        behavior: "smooth",
        block: "center",
        inline: "center",
      })
    }
    if (anchor && focus) {
      if (a.hasOwnProperty("parentOffset")) {
        anchor = anchor.childNodes[a.parentOffset!]
      }
      if (f.hasOwnProperty("parentOffset")) {
        focus = focus.childNodes[f.parentOffset!]
      }
      const range = new Range()
      range.setStart(anchor, a.offset)
      range.setEnd(focus, f.offset)
      if (squish(range.toString()) === wrappedSelection.phrase) {
        document.getSelection()?.removeAllRanges()
        document.getSelection()?.addRange(range)
      }
    }
    return true
  }
  return false
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
      if (citation?.source?.url) {
        if (window.location.href === citation.source.url) {
          if (!highlightSelection(citation)) {
            port.postMessage({
              action: "error",
              message: "could not find citation on page",
            })
          }
        } else {
          window.location.assign(citation.source.url)
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
        if (!highlightSelection(toSelect)) {
          port.postMessage({
            action: "error",
            message: "could not find citation on page",
          })
        }
      } else {
        port.postMessage({ action: "error", message: "received no citation" })
      }
      break
  }
})
