/** a repository of string-related functions */

// strip and condense whitespace
export function squish(string: string) {
  if (string) {
    return string.replace(/^\s+|\s+$/g, "").replace(/\s+/g, " ")
  }
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

// splits a string up into bits that might be cited
export function sackOWords(s: string): string[] {
  return s.split(/((?:\p{L}-\p{L}|\p{L})+)/u)
}