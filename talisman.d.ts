/** Type declarations for talisman library modules */

declare module 'talisman/metrics/levenshtein' {
  /**
   * Computes the Levenshtein distance between two strings.
   * @param a - First string
   * @param b - Second string
   * @returns The Levenshtein distance (number of edits needed)
   */
  function levenshtein(a: string, b: string): number
  export default levenshtein
}

declare module 'talisman/metrics/jaro-winkler' {
  /**
   * Computes the Jaro-Winkler distance between two strings.
   * @param a - First string
   * @param b - Second string
   * @returns The Jaro-Winkler distance (0 = identical, 1 = completely different)
   */
  export function distance(a: string, b: string): number
}

declare module 'talisman/metrics/lcs' {
  /**
   * Computes the longest common substring distance between two strings.
   * @param a - First string
   * @param b - Second string
   * @returns The LCS distance
   */
  export function distance(a: string, b: string): number
}
