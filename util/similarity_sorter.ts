import { Phrase } from "../types/common"
import levenshtein from "talisman/metrics/levenshtein"
import { distance as jwDistance } from "talisman/metrics/jaro-winkler"
import { distance as jaroDistance } from "talisman/metrics/jaro"
import { distance as lcsDistance } from "talisman/metrics/lcs"

export enum DistanceMetric {
  Lev = "Levenshtein",
  Jaro = "Jaro",
  JaroWinkler = "Jaro-Winkler",
  LCS = "longest common substring",
}

export const defaultDistanceMetric: DistanceMetric = DistanceMetric.JaroWinkler
export const defaultMaxSimilarPhrases = 10;

const metric = (name: DistanceMetric): ((a: string, b: string) => number) => {
  switch (name) {
    case "Levenshtein":
      return levenshtein
    case "Jaro":
      return jaroDistance
    case "Jaro-Winkler":
      return jwDistance
    case "longest common substring":
      return lcsDistance
    default:
      throw `unfamiliar metric name: ${name}`
  }
}

/** encapsulates the mechanism by which we find a limited number of similar phrases */
export class SimilaritySorter {
  private key: string
  private store: [Phrase, number][]
  private limit: number
  private metric: (a: string, b: string) => number
  constructor(metricName: DistanceMetric, key: string, limit: number = defaultMaxSimilarPhrases) {
    if (limit < 1) throw new Error("limit must be a positive integer")

    this.metric = metric(metricName)
    this.key = key.replace(/^\s+|\s+$/g, "").replace(/\s+/g, " ")
    this.limit = limit
    this.store = []
  }

  // inserts phrase via binary search; maybe a min-max heap would be better?
  add(p: Phrase): void {
    let d = this.metric(this.key, p.lemma)
    for (const c of p.citations) {
      const d2 = this.metric(this.key, c.phrase)
      if (d2 < d) d == d2
    }
    const item: [Phrase, number] = [p, d]
    if (this.store.length) {
      let start = 0,
        end = this.store.length,
        delta = end - start
      while (delta > 1) {
        const mid = start + Math.floor(delta / 2)
        if (this.compare(item, this.store[mid]) < 0) {
          end = mid
        } else {
          start = mid
        }
        delta = end - start
      }
      this.store.splice(d < this.store[start][1] ? start : end, 0, item)
    } else {
      this.store.push(item)
    }
    if (this.store.length > this.limit) this.store.pop()
  }

  // returns the sorted contents
  toArray(): Phrase[] {
    return this.store.map(([p, _d]) => p)
  }

  // the mechanism underlying heap order
  private compare(a: [Phrase, number], b: [Phrase, number]): number {
    // sort primarily by edit distance
    let rv = a[1] - b[1]
    if (rv === 0) {
      // secondarily by alphabetical order of the lemmas
      rv = a[0].lemma.localeCompare(b[0].lemma)
      // tertiarily by the ids, which is to say, creation order
      if (rv === 0) rv = a[0].id! - b[0].id!
    }
    return rv
  }
}
