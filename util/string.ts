/** a repository of string-related functions */

import { regex } from "list-matcher"
import { Language } from "../types/common"

// strip and condense whitespace
export function squish(string: string) {
  if (string) {
    return string.replace(/^\s+|\s+$/g, "").replace(/\s+/g, " ")
  }
}

// canonical form for string comparison
export function snorm(s: string) {
  return squish(s)?.toLowerCase()
}

// reverse the order of characters in a string
export function reverse(string: string): string {
  return string.split("").reverse().join("")
}

// create a pattern to be compiled into a regular expression
// the pattern matches all characters as given
// except whitespace characters which can be any string of whitespace
export function wsrx(s: string): string | undefined {
  if (!s) return
  const chars: string[] = []
  for (const c of s.split("")) {
    switch (c) {
      case ".":
      case "[":
      case "]":
      case "{":
      case "}":
      case "^":
      case "$":
      case "+":
      case "?":
      case "*":
      case "(":
      case ")":
      case "\\":
      case "|":
        chars.push("\\" + c)
        break
      case " ":
        chars.push("\\s+")
        break
      default:
        chars.push(c)
    }
  }
  return chars.join("")
}

// for a given language generate a function which will normalize strings according to its equivalence classes
// if it has none, fall back to snorm
export function normalizer(language: Language): (s: string) => string {
  const { graphemeEquivalenceClasses } = language
  if (graphemeEquivalenceClasses) {
    // collect the things that need normalizing
    const parts: string[] = []
    for (const [_base, equivalents] of graphemeEquivalenceClasses) {
      for (const equivalent of equivalents) {
        const s = snorm(equivalent)
        if (s) {
          parts.push(s)
        }
      }
    }
    // a regular expression that will match anything needing normalization
    const rx = regex(parts, {
      capture: true,
      flags: "u",
    })
    const norms: [string, RegExp][] = graphemeEquivalenceClasses.map(
      ([base, equivalents]) => [
        snorm(base) ?? "",
        regex(equivalents.map(snorm).filter((n) => n) as any as string[], {
          flags: "u",
        }),
      ],
    )
    return (s: string) => {
      const sn = snorm(s)
      if (!sn) return ""
      return sn.split(rx).map((n, i) => {
        // the odd-numbered fragments are matches
        if (i % 2 === 1) {
          // return the correct normalization
          for (const [p, r] of norms) {
            if (r.test(n)) return p
          }
        }
        return n
      }).join("")
    }
  } else {
    return (s: string) => snorm(s) ?? ""
  }
}
