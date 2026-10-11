if (typeof self === "undefined") {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(global as any).self = global
}

import {
  findUnusedColorPair,
  normalizeHexColor,
  sortTags,
} from "../database"
import { Tag, TagGroup } from "../../types/common"

describe("Tag and TagGroup utilities", () => {
  describe("normalizeHexColor", () => {
    it("handles undefined or empty color by returning #000000", () => {
      expect(normalizeHexColor(undefined)).toBe("#000000")
      expect(normalizeHexColor("")).toBe("#000000")
    })

    it("lowercases and prepends # if missing", () => {
      expect(normalizeHexColor("FFFFFF")).toBe("#ffffff")
      expect(normalizeHexColor("#ABCDEF")).toBe("#abcdef")
    })

    it("expands 3-digit hex to 6-digit hex", () => {
      expect(normalizeHexColor("#fff")).toBe("#ffffff")
      expect(normalizeHexColor("f00")).toBe("#ff0000")
      expect(normalizeHexColor("#0a5")).toBe("#00aa55")
    })

    it("handles 4-digit and 8-digit hex by stripping alpha", () => {
      expect(normalizeHexColor("#ffff")).toBe("#ffffff")
      expect(normalizeHexColor("#ffecec88")).toBe("#ffecec")
    })

    it("parses rgb(...) strings to hex", () => {
      expect(normalizeHexColor("rgb(255, 236, 236)")).toBe("#ffecec")
      expect(normalizeHexColor("rgb(255, 255, 255)")).toBe("#ffffff")
      expect(normalizeHexColor("rgb(0, 0, 0)")).toBe("#000000")
      expect(normalizeHexColor("rgb(255 236 236)")).toBe("#ffecec")
      expect(normalizeHexColor("rgb(100%, 0%, 50%)")).toBe("#ff0080")
    })

    it("parses corrupted #rgb(...) and #rgba(...) strings created by previous bug", () => {
      expect(normalizeHexColor("#rgb(255, 236, 236)")).toBe("#ffecec")
      expect(normalizeHexColor("#rgb(255, 255, 255)")).toBe("#ffffff")
      expect(normalizeHexColor("#rgba(255, 236, 236, 1)")).toBe("#ffecec")
    })

    it("parses rgba(...) strings to hex", () => {
      expect(normalizeHexColor("rgba(255, 236, 236, 0.5)")).toBe("#ffecec")
      expect(normalizeHexColor("rgba(0, 0, 0, 1)")).toBe("#000000")
    })

    it("parses hsl(...) strings to hex", () => {
      expect(normalizeHexColor("hsl(0, 100%, 50%)")).toBe("#ff0000")
      expect(normalizeHexColor("hsl(120, 100%, 50%)")).toBe("#00ff00")
    })

    it("parses named colors", () => {
      expect(normalizeHexColor("white")).toBe("#ffffff")
      expect(normalizeHexColor("black")).toBe("#000000")
      expect(normalizeHexColor("red")).toBe("#ff0000")
    })

    it("falls back to provided fallback for invalid colors", () => {
      expect(normalizeHexColor("invalid-color", "#ffffff")).toBe("#ffffff")
      expect(normalizeHexColor(undefined, "#ffffff")).toBe("#ffffff")
      expect(normalizeHexColor("", "#123456")).toBe("#123456")
    })
  })

  describe("findUnusedColorPair", () => {
    it("returns the input colors if they do not collide", () => {
      const existing: TagGroup[] = [
        { name: "g1", color: "#000000", bgcolor: "#ffffff", order: 0 },
      ]
      const [c, bg] = findUnusedColorPair("#111111", "#222222", existing)
      expect(c).toBe("#111111")
      expect(bg).toBe("#222222")
    })

    it("adjusts the background color if there is an exact collision", () => {
      const existing: TagGroup[] = [
        { name: "g1", color: "#000000", bgcolor: "#ffffff", order: 0 },
      ]
      const [c, bg] = findUnusedColorPair("#000000", "#ffffff", existing)
      expect(c).toBe("#000000")
      expect(bg).not.toBe("#ffffff")
      expect(bg.startsWith("#")).toBe(true)
    })
  })

  describe("sortTags", () => {
    it("sorts tags by group order then tag name", () => {
      const groups: TagGroup[] = [
        { id: 1, name: "Second", color: "#000", bgcolor: "#fff", order: 2 },
        { id: 2, name: "First", color: "#111", bgcolor: "#222", order: 1 },
      ]
      const tags: Tag[] = [
        { id: 10, name: "Zeta", groupId: 2 },
        { id: 11, name: "Alpha", groupId: 2 },
        { id: 12, name: "Beta", groupId: 1 },
      ]
      const sorted = sortTags(tags, groups)
      expect(sorted.map((t) => t.name)).toEqual(["Alpha", "Zeta", "Beta"])
    })

    it("allows tags with the same name across different groups and sorts them by group order", () => {
      const groups: TagGroup[] = [
        { id: 1, name: "Group 1", color: "#000", bgcolor: "#fff", order: 1 },
        { id: 2, name: "Group 2", color: "#111", bgcolor: "#222", order: 2 },
      ]
      const tags: Tag[] = [
        { id: 10, name: "syntax", groupId: 2, groupOrder: 2 },
        { id: 11, name: "syntax", groupId: 1, groupOrder: 1 },
      ]
      const sorted = sortTags(tags, groups)
      expect(sorted[0].groupId).toBe(1)
      expect(sorted[1].groupId).toBe(2)
      expect(sorted[0].name).toBe("syntax")
      expect(sorted[1].name).toBe("syntax")
    })

    it("uses tag.groupOrder when groups map is not supplied", () => {
      const tags: Tag[] = [
        { id: 1, name: "Tag B", groupOrder: 2 },
        { id: 2, name: "Tag A", groupOrder: 2 },
        { id: 3, name: "Tag C", groupOrder: 0 },
      ]
      const sorted = sortTags(tags)
      expect(sorted.map((t) => t.name)).toEqual(["Tag C", "Tag A", "Tag B"])
    })
  })
})
