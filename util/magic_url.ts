import Url from "url-parse"
import { Citation } from "../types/common"
import { squish } from "./string"

function enc(s: string): string {
  // it appears marginal whitespace breaks stuff; also encodeURIComponent doesn't fix hyphens
  return encodeURIComponent(s).replaceAll("-", "%2D")
}

function fragment(c: Citation, budget: number): string | undefined {
  if (budget < 1) return
  const directive = ":~:text="
  let { before, after, phrase } = c
  // trim things a bit to accommodate changing text
  before =
    squish(before ?? "")
      ?.split(" ")
      .slice(-2)
      .join(" ") ?? ""
  after =
    squish(after ?? "")
      ?.split(" ")
      .slice(0, 2)
      .join(" ") ?? ""
  const p = Math.floor(phrase.length / 2)
  let beginning = phrase.slice(0, p)
  let end = phrase.slice(p)
  while (true) {
    let a, b
    if (before) {
      b = enc(before) + "-,"
    }
    if (after) {
      a = ",-" + enc(after)
    }
    let frag
    if (a || b) {
      const p = enc(phrase)
      frag = `${directive}${b || ""}${p}${a || ""}`
    } else {
      const left = enc(beginning)
      const right = enc(end)
      frag = `${directive}${left},${right}`
    }
    if (frag.length > budget) {
      if (a || b) {
        if (a) after = after.slice(0, after.length - 1)
        if (b) beginning = beginning.slice(1)
      } else {
        beginning = beginning.slice(0, beginning.length - 1)
        if (!beginning) return
        end = end.slice(1)
        if (!end) return
      }
    } else {
      return frag
    }
  }
}

/** returns a URL for the citation that will magically highlight the citation and scroll to it */
export function magicUrl(c: Citation): string | undefined {
  const { url } = c
  if (!url) return
  const u = new Url(url)
  u.set("hash", "")
  const budget = 2048 - u.href.length
  const f = fragment(c, budget)
  if (f) {
    u.set("hash", f)
    return u.href
  } else {
    return url
  }
}
