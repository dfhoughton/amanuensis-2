import { Phrase } from "../types/common"
import { distance } from "fastest-levenshtein"

/** encapsulates the mechanism by which we find a limited number of similar phrases */
export class SimilaritySorter {
  private key: string
  private store: [Phrase, number][]
  private limit: number
  constructor(key: string, limit: number = 10) {
    if (limit < 1) throw new Error("limit must be a positive integer")

    this.key = key.replace(/^\s+|\s+$/g, "").replace(/\s+/g, " ")
    this.limit = limit
    this.store = []
  }

  // inserts phrase via binary search; maybe a min-max heap would be better?
  add(p: Phrase): void {
    let d = distance(this.key, p.lemma)
    for (const c of p.citations) {
      const d2 = distance(this.key, c.phrase)
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
