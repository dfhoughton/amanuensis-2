/** generic utility functions */

import isArray from "lodash/isArray"
import isObject from "lodash/isObject"

export function uniq<T>(things: T[], by?: (T) => any): T[] {
  const ar: T[] = []
  by ??= (t: T) => t
  const seen = new Set<any>()
  for (const t of things) {
    const b = by(t)
    if (seen.has(b)) continue
    seen.add(b)
    ar.push(t)
  }
  return ar
}

export function deepClone<T>(obj: T): T {
  if (isArray(obj)) {
    return (obj as Array<any>).map(deepClone) as T
  }
  if (isObject(obj)) {
    const t = {}
    for (const [k, v] of Object.entries(obj as Object)) {
      t[k] = deepClone(v)
    }
    return t as T
  }
  return obj
}

// generates a regular expression that matches a sequence of
// characters with optional other characters in between
export function fuzzyMatcher(s: string, i: boolean | undefined) {
  // squish
  s = s.replace(/^\s+|\s+$/g, "").replace(/\s+/g, " ")
  s = s
    .split("")
    .map((c) =>
      c === " " ? "s+" : /[.?+*^$\\{}\[\]\(\)]/.test(c) ? `\\${c}` : c
    )
    .join(".*")
  return new RegExp(s, i ? "i" : "")
}
