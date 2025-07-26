/** generic utility functions */

import isArray from "lodash/isArray"
import isObject from "lodash/isObject"
import { wsrx } from "./string"
import { isEqual } from "lodash"

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

export function matcher(
  s: string,
  wholeWord: boolean,
  fuzzy: boolean,
  caseInsensitive: boolean
): RegExp {
  // squish
  s = s.replace(/^\s+|\s+$/g, "").replace(/\s+/g, " ")
  if (s.length === 0) return /(?!)/ // the null regex that matches nothing

  let chars = s.split("")
  let leftBound, rightBound
  if (wholeWord) {
    const left = /\w/.test(chars[0])
    const right = /\w/.test(chars[chars.length - 1])
    leftBound = left ? "\\b" : "(?<=s|^)"
    rightBound = right ? "\\b" : "(?=s|$)"
  }
  chars = chars.map((c) => wsrx(c)!) // maybe map these to grouped expressions
  if (wholeWord) {
    chars.unshift(leftBound)
    chars.push(rightBound)
  }
  s = chars.join(fuzzy ? ".*" : "")
  return new RegExp(s, caseInsensitive ? "i" : "")
}

// create a visual representation of the difference between two objects for debugging
export function diff(a: any, b: any): any {
  if (!isEqual(a, b)) {
    if (typeof a == typeof b) {
      if (isObject(a) && isObject(b)) {
        const d = {}
        const keys = new Set<string>()
        for (const obj of [a, b]) {
          for (const k of Object.keys(obj)) keys.add(k)
        }
        for (const k of [...keys].sort()) {
          const d2 = diff(a[k], b[k])
          if (d2) d[k] = d2
        }
        return d
      } else if (isArray(a) && isArray(b)) {
        const lim = a.length > b.length ? a.length : b.length
        const d: any[] = []
        for (let i = 0; i < lim; i++) {
          const d2 = diff(a[i], b[i])
          d.push(d2 ?? null)
        }
        return d
      } else {
        return { a, b }
      }
    } else {
      return { a, b }
    }
  }
}

// do these two times fall on the same day?
export function sameDate(d1: Date, d2: Date): boolean {
  return (
    d1.getDate() === d2.getDate() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getFullYear() === d2.getFullYear()
  )
}

// return the last n items of an array
export function lastN<T>(array: T[], n: number): T[] {
  if (array.length <= n) return [...array]
  return array.slice(array.length - n)
}

// ring the bell
// code provided by Gemini then modified
export function bell() {
  const audioContext = new window.AudioContext()
  const oscillator = audioContext.createOscillator()
  const gainNode = audioContext.createGain()

  oscillator.connect(gainNode)
  gainNode.connect(audioContext.destination)

  oscillator.type = "sine" // 'sine', 'triangle', 'square', 'sawtooth'
  oscillator.frequency.setValueAtTime(800, audioContext.currentTime) // Bell-like frequency

  gainNode.gain.setValueAtTime(1, audioContext.currentTime)
  gainNode.gain.exponentialRampToValueAtTime(
    0.001,
    audioContext.currentTime + 1
  ) // Fade out

  oscillator.start(audioContext.currentTime)
  oscillator.stop(audioContext.currentTime + 1) // Stop after 1 second
}
