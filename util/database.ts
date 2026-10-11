import BaseDexie, { Table } from "dexie"
import {
  Citation,
  Configuration,
  DEFAULT_TAG_GROUP_DESCRIPTION,
  DEFAULT_TAG_GROUP_NAME,
  FreeFormSearch,
  Language,
  Phrase,
  Relation,
  SearchResults,
  SimilaritySearch,
  SortDirection,
  SortType,
  Tag,
  TagGroup,
  UrlSearch,
} from "../types/common"
import { matcher, shuffle } from "./general"
import every from "lodash/every"
import uniq from "lodash/uniq"
import { exportDB, importDB, ExportOptions } from "dexie-export-import"
import { SimilaritySorter } from "./similarity_sorter"
import {
  NonInitialOutcome,
  PreparedTrial,
  QuizSignature,
  Summary,
  Trial,
  trialsKey,
} from "./spaced_repetition"
import { regex } from "list-matcher"
import { defaultStringNormalizer, normalizer, snorm } from "./string"

type PhraseTable = {
  phrases: Table<Phrase>
}
const phrasesSchema = {
  phrases: "++id, lemma, languageId, updatedAt, createdAt",
}
type LanguageTable = {
  languages: Table<Language>
}
const languagesSchema = {
  languages: "++id, &name, &locale",
}
type TagTable = {
  tags: Table<Tag>
}
const tagsSchema = {
  tags: "++id, &name",
}
type TagGroupTable = {
  tagGroups: Table<TagGroup>
}
const tagGroupsSchema = {
  tagGroups: "++id, &name, order",
}
type RelationTable = {
  relations: Table<Relation>
}
const relationsSchema = {
  relations: "++id, p1, p2",
}
// just putting this here so the extension only manages stored data in the one way
type ConfigurationTable = {
  configuration: Table<Configuration>
}
const configurationSchema = {
  configuration: "id",
}
type TrialTable = {
  trials: Table<Trial>
}
const trialSchema = {
  trials: "phraseId",
}
type DexieTable = PhraseTable &
  LanguageTable &
  ConfigurationTable &
  TagTable &
  TagGroupTable &
  RelationTable &
  TrialTable
type Dexie<T extends DexieTable> = BaseDexie & T

const NAMED_COLORS: Record<string, string> = {
  black: "#000000",
  white: "#ffffff",
  silver: "#c0c0c0",
  gray: "#808080",
  grey: "#808080",
  maroon: "#800000",
  red: "#ff0000",
  purple: "#800080",
  fuchsia: "#ff00ff",
  magenta: "#ff00ff",
  green: "#008000",
  lime: "#00ff00",
  olive: "#808000",
  yellow: "#ffff00",
  navy: "#000080",
  blue: "#0000ff",
  teal: "#008080",
  aqua: "#00ffff",
  cyan: "#00ffff",
  orange: "#ffa500",
}

function parseColorChannel(val: string): number {
  val = val.trim()
  let num: number
  if (val.endsWith("%")) {
    num = (parseFloat(val) / 100) * 255
  } else {
    num = parseFloat(val)
  }
  if (isNaN(num)) return 0
  return Math.max(0, Math.min(255, Math.round(num)))
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  s /= 100
  l /= 100
  const k = (n: number) => (n + h / 30) % 12
  const a = s * Math.min(l, 1 - l)
  const f = (n: number) =>
    l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))
  return [
    Math.max(0, Math.min(255, Math.round(f(0) * 255))),
    Math.max(0, Math.min(255, Math.round(f(8) * 255))),
    Math.max(0, Math.min(255, Math.round(f(4) * 255))),
  ]
}

export function normalizeHexColor(c?: string, fallback = "#000000"): string {
  if (!c || typeof c !== "string") {
    return fallback && fallback !== c ? normalizeHexColor(fallback, "#000000") : "#000000"
  }
  let str = c.trim().toLowerCase()
  if (!str) {
    return fallback && fallback !== c ? normalizeHexColor(fallback, "#000000") : "#000000"
  }

  // If prefixed with '#' before an rgb/rgba/hsl/hsla function (e.g. '#rgb(255, 236, 236)')
  if (str.startsWith("#") && (str.startsWith("#rgb") || str.startsWith("#hsl"))) {
    str = str.slice(1).trim()
  }

  // rgb(...) or rgba(...)
  const rgbMatch = str.match(/^rgba?\(([^)]+)\)$/)
  if (rgbMatch) {
    const parts = rgbMatch[1].replace(/[,/]/g, " ").trim().split(/\s+/)
    if (parts.length >= 3) {
      const r = parseColorChannel(parts[0])
      const g = parseColorChannel(parts[1])
      const b = parseColorChannel(parts[2])
      return (
        "#" +
        r.toString(16).padStart(2, "0") +
        g.toString(16).padStart(2, "0") +
        b.toString(16).padStart(2, "0")
      )
    }
  }

  // hsl(...) or hsla(...)
  const hslMatch = str.match(/^hsla?\(([^)]+)\)$/)
  if (hslMatch) {
    const parts = hslMatch[1].replace(/[,/]/g, " ").trim().split(/\s+/)
    if (parts.length >= 3) {
      const h = parseFloat(parts[0]) || 0
      const s = parseFloat(parts[1]) || 0
      const l = parseFloat(parts[2]) || 0
      const [r, g, b] = hslToRgb(h, s, l)
      return (
        "#" +
        r.toString(16).padStart(2, "0") +
        g.toString(16).padStart(2, "0") +
        b.toString(16).padStart(2, "0")
      )
    }
  }

  // Named colors
  if (NAMED_COLORS[str]) {
    return NAMED_COLORS[str]
  }

  // Hex strings
  const hexClean = str.startsWith("#") ? str.slice(1) : str
  if (/^[0-9a-f]{3}$/i.test(hexClean)) {
    return (
      "#" +
      hexClean[0] +
      hexClean[0] +
      hexClean[1] +
      hexClean[1] +
      hexClean[2] +
      hexClean[2]
    )
  }
  if (/^[0-9a-f]{4}$/i.test(hexClean)) {
    return (
      "#" +
      hexClean[0] +
      hexClean[0] +
      hexClean[1] +
      hexClean[1] +
      hexClean[2] +
      hexClean[2]
    )
  }
  if (/^[0-9a-f]{6}$/i.test(hexClean)) {
    return "#" + hexClean
  }
  if (/^[0-9a-f]{8}$/i.test(hexClean)) {
    return "#" + hexClean.slice(0, 6)
  }

  if (fallback && fallback !== c) {
    return normalizeHexColor(fallback, "#000000")
  }
  return "#000000"
}

const db = new BaseDexie("amanuensis") as Dexie<DexieTable>
const schema = Object.assign(
  {},
  phrasesSchema,
  languagesSchema,
  tagsSchema,
  relationsSchema,
  configurationSchema,
  trialSchema,
)
db.version(1).stores(schema)
db.version(2)
  .stores(
    Object.assign({}, tagGroupsSchema, {
      tags: "++id, groupId, [groupId+name]",
    })
  )
  .upgrade(async (tx) => {
    const tagsTable = tx.table<Tag>("tags")
    const groupsTable = tx.table<TagGroup>("tagGroups")
    const existingTags = await tagsTable.toArray()

    type Cluster = {
      color: string
      bgcolor: string
      tags: Tag[]
    }
    const clusterMap = new Map<string, Cluster>()
    for (const t of existingTags) {
      const color = normalizeHexColor(t.color, "#000000")
      const bgcolor = normalizeHexColor(t.bgcolor, "#ffffff")
      const key = `${bgcolor}:${color}`
      let c = clusterMap.get(key)
      if (!c) {
        c = {
          color,
          bgcolor,
          tags: [],
        }
        clusterMap.set(key, c)
      }
      c.tags.push(t)
    }

    const defaultKey = "#ffffff:#000000"
    let defaultCluster = clusterMap.get(defaultKey)
    if (!defaultCluster) {
      defaultCluster = {
        color: "#000000",
        bgcolor: "#ffffff",
        tags: [],
      }
      clusterMap.set(defaultKey, defaultCluster)
    }

    // Always create default group first with order 0
    const defaultGroupId = (await groupsTable.add({
      name: DEFAULT_TAG_GROUP_NAME,
      description: DEFAULT_TAG_GROUP_DESCRIPTION,
      color: "#000000",
      bgcolor: "#ffffff",
      order: 0,
    })) as number

    for (const t of defaultCluster.tags) {
      t.groupId = defaultGroupId
      delete t.color
      delete t.bgcolor
      await tagsTable.put(t)
    }

    const usedGroupNames = new Set<string>([
      DEFAULT_TAG_GROUP_NAME.toLowerCase(),
    ])
    let nextOrder = 1

    for (const [key, cluster] of clusterMap.entries()) {
      if (key === defaultKey) continue
      cluster.tags.sort((a, b) => (a.id ?? 0) - (b.id ?? 0))
      const firstTag = cluster.tags[0]
      let groupName = (firstTag?.name || `group-${nextOrder}`).trim()
      if (usedGroupNames.has(groupName.toLowerCase())) {
        let suffix = 2
        while (usedGroupNames.has(`${groupName.toLowerCase()} (${suffix})`)) {
          suffix++
        }
        groupName = `${groupName} (${suffix})`
      }
      usedGroupNames.add(groupName.toLowerCase())

      const groupDesc = firstTag?.description

      // Find common intersection of languages
      let commonLanguages: number[] | undefined = undefined
      if (
        cluster.tags.length > 0 &&
        cluster.tags.every((t) => t.languages && t.languages.length > 0)
      ) {
        const firstLangs: number[] = cluster.tags[0].languages!
        const common = firstLangs.filter((langId: number) =>
          cluster.tags.every((t) => t.languages!.includes(langId))
        )
        if (common.length > 0) {
          commonLanguages = common
        }
      }

      const groupId = (await groupsTable.add({
        name: groupName,
        description: groupDesc,
        color: cluster.color,
        bgcolor: cluster.bgcolor,
        languages: commonLanguages,
        order: nextOrder++,
      })) as number

      for (const t of cluster.tags) {
        t.groupId = groupId
        delete t.color
        delete t.bgcolor
        if (
          commonLanguages &&
          t.languages &&
          t.languages.length === commonLanguages.length &&
          t.languages.every((l: number) => commonLanguages!.includes(l))
        ) {
          t.languages = undefined
        }
        await tagsTable.put(t)
      }
    }
  })

db.version(3)
  .stores(
    Object.assign({}, tagGroupsSchema, {
      tags: "++id, groupId, [groupId+name]",
    })
  )
  .upgrade(async (tx) => {
    const tagsTable = tx.table<Tag>("tags")
    const groupsTable = tx.table<TagGroup>("tagGroups")
    const existingGroups = await groupsTable.toArray()
    const existingTags = await tagsTable.toArray()

    let defaultGroup = existingGroups.find(
      (g) => g.name.toLowerCase() === DEFAULT_TAG_GROUP_NAME.toLowerCase()
    )
    if (!defaultGroup) {
      const defId = (await groupsTable.add({
        name: DEFAULT_TAG_GROUP_NAME,
        description: DEFAULT_TAG_GROUP_DESCRIPTION,
        color: "#000000",
        bgcolor: "#ffffff",
        order: 0,
      })) as number
      defaultGroup = {
        id: defId,
        name: DEFAULT_TAG_GROUP_NAME,
        description: DEFAULT_TAG_GROUP_DESCRIPTION,
        color: "#000000",
        bgcolor: "#ffffff",
        order: 0,
      }
      existingGroups.push(defaultGroup)
    } else {
      defaultGroup.color = "#000000"
      defaultGroup.bgcolor = "#ffffff"
      defaultGroup.order = 0
      await groupsTable.put(defaultGroup)
    }

    const defaultGroupId = defaultGroup.id!
    const rogueGroupIds = new Set<number>()
    const groupsToKeep: TagGroup[] = [defaultGroup]

    for (const g of existingGroups) {
      if (g.id === defaultGroupId) continue
      const normColor = normalizeHexColor(g.color, "#000000")
      const normBg = normalizeHexColor(g.bgcolor, "#ffffff")

      if (normColor === "#000000" && normBg === "#ffffff") {
        rogueGroupIds.add(g.id!)
        await groupsTable.delete(g.id!)
      } else {
        g.color = normColor
        g.bgcolor = normBg
        groupsToKeep.push(g)
      }
    }

    // Deduplicate color collisions
    const usedColorKeys = new Set<string>(["#ffffff:#000000"])
    for (const g of groupsToKeep) {
      if (g.id === defaultGroupId) continue
      let key = `${g.bgcolor}:${g.color}`
      if (usedColorKeys.has(key)) {
        const [c, bg] = findUnusedColorPair(g.color, g.bgcolor, groupsToKeep)
        g.color = c
        g.bgcolor = bg
        key = `${bg}:${c}`
      }
      usedColorKeys.add(key)
      await groupsTable.put(g)
    }

    const validGroupIds = new Set(groupsToKeep.map((g) => g.id!))
    for (const t of existingTags) {
      let needsPut = false
      if (
        t.groupId === undefined ||
        rogueGroupIds.has(t.groupId) ||
        !validGroupIds.has(t.groupId)
      ) {
        t.groupId = defaultGroupId
        needsPut = true
      }
      if (t.color !== undefined || t.bgcolor !== undefined) {
        delete t.color
        delete t.bgcolor
        needsPut = true
      }
      if (needsPut) {
        await tagsTable.put(t)
      }
    }
  })

async function init() {
  const l = await db.languages.get(0)
  if (!l) {
    await db.languages.add({
      id: 0,
      name: "unknown",
      locale: "und",
      locales: {},
      count: 0,
    })
  }
  const c = await db.configuration.get(0)
  if (!c) {
    await db.configuration.add({ id: 0 })
  }
  let defaultGroup = await db.tagGroups
    .where("name")
    .equalsIgnoreCase(DEFAULT_TAG_GROUP_NAME)
    .first()
  if (!defaultGroup) {
    const id = (await db.tagGroups.add({
      name: DEFAULT_TAG_GROUP_NAME,
      description: DEFAULT_TAG_GROUP_DESCRIPTION,
      color: "#000000",
      bgcolor: "#ffffff",
      order: 0,
    })) as number
    defaultGroup = {
      id,
      name: DEFAULT_TAG_GROUP_NAME,
      description: DEFAULT_TAG_GROUP_DESCRIPTION,
      color: "#000000",
      bgcolor: "#ffffff",
      order: 0,
    }
  } else if (
    defaultGroup.color !== "#000000" ||
    defaultGroup.bgcolor !== "#ffffff" ||
    defaultGroup.order !== 0
  ) {
    defaultGroup.color = "#000000"
    defaultGroup.bgcolor = "#ffffff"
    defaultGroup.order = 0
    await db.tagGroups.put(defaultGroup)
  }

  // Sanitize all groups and check for rogue duplicate default groups
  const allGroups = await db.tagGroups.toArray()
  const rogueIds: number[] = []
  for (const g of allGroups) {
    if (g.id === defaultGroup.id) continue
    const normColor = normalizeHexColor(g.color, "#000000")
    const normBg = normalizeHexColor(g.bgcolor, "#ffffff")
    if (normColor === "#000000" && normBg === "#ffffff") {
      rogueIds.push(g.id!)
    } else if (g.color !== normColor || g.bgcolor !== normBg) {
      g.color = normColor
      g.bgcolor = normBg
      await db.tagGroups.put(g)
    }
  }

  if (rogueIds.length > 0) {
    await db.transaction("rw", db.tags, db.tagGroups, async () => {
      for (const rogueId of rogueIds) {
        const rogueTags = await db.tags.where("groupId").equals(rogueId).toArray()
        for (const t of rogueTags) {
          t.groupId = defaultGroup!.id!
        }
        if (rogueTags.length > 0) {
          await db.tags.bulkPut(rogueTags)
        }
        await db.tagGroups.delete(rogueId)
      }
    })
  }
}
init().catch((e) => {
  if (typeof indexedDB !== "undefined") {
    console.warn("Failed to initialize database:", e)
  }
})

// clear everything
export function resetDatabase() {
  return db.transaction("rw", db.tables, async () => {
    await Promise.all(db.tables.map((table) => table.clear()))
    await init()
    regexCache.clear()
  })
}

export function configuration(): Promise<Configuration | undefined> {
  return db.configuration.get(0)
}

export function setConfiguration(
  configuration: Configuration,
): Promise<Configuration> {
  return db.configuration.put(configuration, 0)
}

// creates a relation between the two phrases (if one does not exist), returning the relation id
export function createRelation(p1: Phrase, p2: Phrase): Promise<number> {
  const [i1, i2] = [p1.id!, p2.id!].sort((a, b) => a - b)
  return db.transaction("rw", db.phrases, db.relations, async () => {
    let id = (
      await db.relations
        .where("p1")
        .equals(i1)
        .and((r) => r.p2 === i2)
        .first()
    )?.id
    if (id === undefined)
      id = (await db.relations.put({ p1: i1, p2: i2 })) as number
    // save *just this relation* into the record of both phrases
    const phrases = await db.phrases.where("id").anyOf([i1, i2]).toArray()
    phrases.forEach((p) => {
      p.relations = uniq([...(p.relations ?? []), id])
    })
    await db.phrases.bulkPut(phrases)
    return id!
  })
}

export async function getPhrase(id: number): Promise<Phrase | undefined> {
  return await db.phrases.get(id)
}

// this basically does a join and fetches down the related phrases
export function phrasesForRelations(
  ids: number[],
): Promise<Map<number, [number, Phrase]>> {
  return db.transaction("r", db.phrases, db.relations, async () => {
    const relations = await db.relations.where("id").anyOf(ids).toArray()
    const phraseIds: number[] = []
    for (const r of relations) {
      phraseIds.push(r.p1)
      phraseIds.push(r.p2)
    }
    const phrases = await db.phrases.where("id").anyOf(phraseIds).toArray()
    const map = new Map<number, [number, Phrase]>()
    for (const p of phrases) {
      const r = relations.find((r) => r.p1 === p.id || r.p2 === p.id)!
      map.set(p.id!, [r.id!, p])
    }
    return map
  })
}

export function deleteRelation(id: number): Promise<void> {
  return db.transaction("rw", db.relations, db.phrases, async () => {
    const relation = await db.relations.get(id)
    if (relation) {
      const phrases = await db.phrases
        .where("id")
        .anyOf([relation.p1, relation.p2])
        .toArray()
      for (const p of phrases) {
        p.relations = (p.relations ?? []).filter((r) => r !== id)
      }
      await db.phrases.bulkPut(phrases)
    }
    return await db.relations.delete(id)
  })
}

export function findUnusedColorPair(
  color: string,
  bgcolor: string,
  existingGroups: TagGroup[]
): [string, string] {
  const used = new Set(
    existingGroups.map(
      (g) =>
        `${normalizeHexColor(g.bgcolor, "#ffffff")}:${normalizeHexColor(
          g.color,
          "#000000"
        )}`
    )
  )
  const curColor = normalizeHexColor(color, "#000000")
  let curBg = normalizeHexColor(bgcolor, "#ffffff")
  let count = 0
  while (used.has(`${curBg}:${curColor}`) && count < 1000) {
    count++
    let bgNum = parseInt(curBg.replace("#", ""), 16)
    if (isNaN(bgNum)) bgNum = 0xffffff
    bgNum = (bgNum + 0x010203) & 0xffffff
    curBg = "#" + bgNum.toString(16).padStart(6, "0")
  }
  return [curColor, curBg]
}

export async function enrichTags(tags: Tag[]): Promise<Tag[]> {
  if (!tags.length) return tags
  const groupIds = Array.from(
    new Set(
      tags.map((t) => t.groupId).filter((id): id is number => id !== undefined)
    )
  )
  const groups = groupIds.length
    ? await db.tagGroups.where("id").anyOf(groupIds).toArray()
    : []
  const groupMap = new Map(groups.map((g) => [g.id!, g]))
  for (const t of tags) {
    const g = t.groupId !== undefined ? groupMap.get(t.groupId) : undefined
    if (g) {
      t.color = g.color
      t.bgcolor = g.bgcolor
      t.groupOrder = g.order
      t.effectiveLanguages = t.languages ?? g.languages ?? []
    } else {
      t.color = "#000000"
      t.bgcolor = "#ffffff"
      t.groupOrder = 0
      t.effectiveLanguages = t.languages ?? []
    }
  }
  return tags
}

export function sortTags(tags: Tag[], groups?: TagGroup[]): Tag[] {
  const groupOrderMap = groups
    ? new Map(groups.map((g) => [g.id!, g.order]))
    : undefined

  return [...tags].sort((a, b) => {
    const orderA =
      a.groupOrder ??
      (a.groupId !== undefined ? groupOrderMap?.get(a.groupId) ?? 0 : 0)
    const orderB =
      b.groupOrder ??
      (b.groupId !== undefined ? groupOrderMap?.get(b.groupId) ?? 0 : 0)
    if (orderA !== orderB) {
      return orderA - orderB
    }
    return a.name.localeCompare(b.name)
  })
}

export async function knownTags(): Promise<Tag[]> {
  const [tags, groups] = await Promise.all([
    db.tags.toArray(),
    db.tagGroups.toArray(),
  ])
  const groupMap = new Map(groups.map((g) => [g.id!, g]))
  for (const t of tags) {
    const g = t.groupId !== undefined ? groupMap.get(t.groupId) : undefined
    if (g) {
      t.color = g.color
      t.bgcolor = g.bgcolor
      t.groupOrder = g.order
      t.effectiveLanguages = t.languages ?? g.languages ?? []
    } else {
      t.color = "#000000"
      t.bgcolor = "#ffffff"
      t.groupOrder = 0
      t.effectiveLanguages = t.languages ?? []
    }
  }
  return sortTags(tags, groups)
}

export async function saveTag(tag: Tag): Promise<void> {
  let groupId = tag.groupId
  if (groupId === undefined) {
    const defaultGroup = await db.tagGroups
      .where("name")
      .equalsIgnoreCase(DEFAULT_TAG_GROUP_NAME)
      .first()
    groupId = defaultGroup?.id ?? 1
  }
  const cleanTag: Tag = {
    id: tag.id,
    name: tag.name,
    description: tag.description,
    groupId,
    languages: tag.languages,
  }
  await db.tags.put(cleanTag)
}

// deletes a tag and all its uses, returning the number of phrases affected
export function deleteTag(tag: Tag): Promise<number> {
  return db.transaction("rw", db.tags, db.phrases, async () => {
    let count = 0
    const mutated: Phrase[] = []
    await db.phrases.each((p) => {
      let changed = false
      if (p.tags) {
        const newTags: number[] = []
        for (const t of p.tags) {
          if (t === tag.id) {
            changed = true
          } else {
            newTags.push(t)
          }
        }
        if (changed) p.tags = newTags
      }
      for (const c of p.citations) {
        let citationChanged = false
        if (c.tags) {
          const newTags: number[] = []
          for (const t of c.tags) {
            if (t === tag.id) {
              citationChanged = true
            } else {
              newTags.push(t)
            }
          }
          if (citationChanged) c.tags = newTags
        }
        changed ||= citationChanged
      }
      if (changed) {
        mutated.push(p)
        count++
      }
    })
    if (mutated.length) await db.phrases.bulkPut(mutated)
    await db.tags.delete(tag.id)
    return count
  })
}

export async function knownTagGroups(): Promise<TagGroup[]> {
  const groups = await db.tagGroups.toArray()
  return groups.sort((a, b) => a.order - b.order || a.name.localeCompare(b.name))
}

export async function saveTagGroup(group: TagGroup): Promise<number> {
  if (!group.name || !group.name.trim()) {
    throw new Error("Tag group name is required")
  }
  const trimmedName = group.name.trim()
  const allGroups = await db.tagGroups.toArray()

  // Default group cannot be edited
  const defaultGroup = allGroups.find(
    (g) => g.name.toLowerCase() === DEFAULT_TAG_GROUP_NAME.toLowerCase()
  )
  if (
    group.id !== undefined &&
    defaultGroup &&
    defaultGroup.id === group.id
  ) {
    throw new Error("The default tag group cannot be edited")
  }
  if (
    group.id === undefined &&
    trimmedName.toLowerCase() === DEFAULT_TAG_GROUP_NAME.toLowerCase()
  ) {
    throw new Error("Cannot create a group named 'default'")
  }

  // Name uniqueness
  const nameConflict = allGroups.find(
    (g) =>
      g.id !== group.id && g.name.toLowerCase() === trimmedName.toLowerCase()
  )
  if (nameConflict) {
    throw new Error(`A tag group named "${nameConflict.name}" already exists`)
  }

  // Color uniqueness
  const normColor = normalizeHexColor(group.color, "#000000")
  const normBg = normalizeHexColor(group.bgcolor, "#ffffff")
  const colorConflict = allGroups.find(
    (g) =>
      g.id !== group.id &&
      normalizeHexColor(g.color, "#000000") === normColor &&
      normalizeHexColor(g.bgcolor, "#ffffff") === normBg
  )
  if (colorConflict) {
    throw new Error(
      `A tag group with these colors already exists ("${colorConflict.name}")`
    )
  }

  const toSave: TagGroup = {
    ...group,
    name: trimmedName,
    color: normColor,
    bgcolor: normBg,
  }
  return (await db.tagGroups.put(toSave)) as number
}

export async function checkGroupDeletionConflicts(
  groupId: number
): Promise<string[]> {
  const defaultGroup = await db.tagGroups
    .where("name")
    .equalsIgnoreCase(DEFAULT_TAG_GROUP_NAME)
    .first()
  if (!defaultGroup || defaultGroup.id === groupId) {
    throw new Error("The default group cannot be deleted")
  }
  const defaultTags = await db.tags
    .where("groupId")
    .equals(defaultGroup.id!)
    .toArray()
  const defaultTagNames = new Set(
    defaultTags.map((t) => t.name.toLowerCase())
  )
  const groupTags = await db.tags.where("groupId").equals(groupId).toArray()
  return groupTags
    .filter((t) => defaultTagNames.has(t.name.toLowerCase()))
    .map((t) => t.name)
}

export async function deleteTagGroup(group: TagGroup): Promise<number> {
  const defaultGroup = await db.tagGroups
    .where("name")
    .equalsIgnoreCase(DEFAULT_TAG_GROUP_NAME)
    .first()
  if (!defaultGroup || defaultGroup.id === group.id) {
    throw new Error("The default group cannot be deleted")
  }
  return db.transaction("rw", db.tags, db.tagGroups, async () => {
    const conflicts = await checkGroupDeletionConflicts(group.id!)
    if (conflicts.length > 0) {
      throw new Error(
        `Cannot delete group: tags [${conflicts.join(", ")}] conflict with tags in the default group`
      )
    }
    const tags = await db.tags.where("groupId").equals(group.id!).toArray()
    for (const t of tags) {
      t.groupId = defaultGroup.id!
    }
    if (tags.length > 0) {
      await db.tags.bulkPut(tags)
    }
    await db.tagGroups.delete(group.id!)
    return tags.length
  })
}

async function remapTagsInPhrases(remapMap: Map<number, number>) {
  if (remapMap.size === 0) return
  const mutated: Phrase[] = []
  await db.phrases.each((p) => {
    let changed = false
    if (p.tags) {
      const nextTags: number[] = []
      for (const t of p.tags) {
        const remapped = remapMap.get(t)
        if (remapped !== undefined) {
          nextTags.push(remapped)
          changed = true
        } else {
          nextTags.push(t)
        }
      }
      if (changed) p.tags = uniq(nextTags)
    }
    for (const c of p.citations) {
      if (c.tags) {
        let citationChanged = false
        const nextTags: number[] = []
        for (const t of c.tags) {
          const remapped = remapMap.get(t)
          if (remapped !== undefined) {
            nextTags.push(remapped)
            citationChanged = true
          } else {
            nextTags.push(t)
          }
        }
        if (citationChanged) {
          c.tags = uniq(nextTags)
          changed = true
        }
      }
    }
    if (changed) mutated.push(p)
  })
  if (mutated.length > 0) {
    await db.phrases.bulkPut(mutated)
  }
}

export async function mergeTagGroups(
  sourceGroupId: number,
  targetGroupId: number
): Promise<void> {
  if (sourceGroupId === targetGroupId) {
    throw new Error("Cannot merge a tag group into itself")
  }
  const defaultGroup = await db.tagGroups
    .where("name")
    .equalsIgnoreCase(DEFAULT_TAG_GROUP_NAME)
    .first()
  if (defaultGroup && defaultGroup.id === sourceGroupId) {
    throw new Error("The default group cannot be merged into another group")
  }

  return db.transaction("rw", db.tags, db.tagGroups, db.phrases, async () => {
    const sourceTags = await db.tags
      .where("groupId")
      .equals(sourceGroupId)
      .toArray()
    const targetTags = await db.tags
      .where("groupId")
      .equals(targetGroupId)
      .toArray()

    const targetTagsByName = new Map(
      targetTags.map((t) => [t.name.toLowerCase(), t])
    )
    const tagRemap = new Map<number, number>()
    const tagsToUpdate: Tag[] = []
    const tagIdsToDelete: number[] = []

    for (const st of sourceTags) {
      const match = targetTagsByName.get(st.name.toLowerCase())
      if (match) {
        // Merge st into match
        tagRemap.set(st.id!, match.id!)
        if (st.languages && st.languages.length > 0) {
          const merged = uniq([...(match.languages ?? []), ...st.languages])
          if (merged.length !== (match.languages?.length ?? 0)) {
            match.languages = merged
            tagsToUpdate.push(match)
          }
        }
        tagIdsToDelete.push(st.id!)
      } else {
        st.groupId = targetGroupId
        tagsToUpdate.push(st)
      }
    }

    if (tagRemap.size > 0) {
      await remapTagsInPhrases(tagRemap)
    }
    if (tagsToUpdate.length > 0) {
      await db.tags.bulkPut(tagsToUpdate)
    }
    if (tagIdsToDelete.length > 0) {
      await db.tags.bulkDelete(tagIdsToDelete)
    }
    await db.tagGroups.delete(sourceGroupId)
  })
}

export async function reorderTagGroups(
  orderedGroupIds: number[]
): Promise<void> {
  return db.transaction("rw", db.tagGroups, async () => {
    const groups = await db.tagGroups.where("id").anyOf(orderedGroupIds).toArray()
    const groupMap = new Map(groups.map((g) => [g.id!, g]))
    const updated: TagGroup[] = []
    orderedGroupIds.forEach((id, index) => {
      const g = groupMap.get(id)
      if (g && g.order !== index) {
        g.order = index
        updated.push(g)
      }
    })
    if (updated.length > 0) {
      await db.tagGroups.bulkPut(updated)
    }
  })
}

// TODO fix this so it knows about elaborations
export function mergePhrases(to: Phrase, from: Phrase): Promise<Phrase> {
  return db.transaction("rw", db.phrases, db.relations, db.trials, async () => {
    // merge citations
    to.citations = [...to.citations, ...from.citations]
    // make sure we have at most one canonical citation
    let anyCanonical = false
    for (const c of to.citations) {
      if (c.canonical) {
        if (anyCanonical) {
          c.canonical = false
        } else {
          anyCanonical = true
        }
      }
    }
    // merge tags if merging didn't happen in the merging modal
    if (!to.tags?.length) to.tags = from.tags
    // fix relations
    const allRelations = [...(to.relations ?? []), ...(from.relations ?? [])]
    if (allRelations.length) {
      // we just delete these all and create replacements
      const relations = await db.relations
        .where("id")
        .anyOf(allRelations)
        .toArray()
      const allPhraseIds = new Set<number>()
      for (const r of relations) {
        for (const i of [r.p1, r.p2])
          if (!(i === from.id || i === to.id)) allPhraseIds.add(i)
      }
      // phrases other than from or to for which we need to recreate relations
      const phrases = await db.phrases
        .where("id")
        .anyOf(Array.from(allPhraseIds))
        .toArray()
      const delenda = new Set(relations.map((r) => r.id))
      const newRelations: number[] = []
      for (const p of phrases) {
        const [i1, i2] = [to.id!, p.id!].sort()
        const r: number = await db.relations.put({ p1: i1, p2: i2 })
        newRelations.push(r)
        const rs = p.relations!.filter((i) => !delenda.has(i))
        const modifiedPhrase = {
          ...p,
          relations: [...rs, r],
        }
        await db.phrases.put(modifiedPhrase)
      }
      await db.relations.bulkDelete(Array.from(delenda))
      to.relations = newRelations
    }
    // fix trials
    const fromTrials = from.id == null ? null : await db.trials.get(from.id)
    if (fromTrials) {
      // this is the one we're going to merge into the other
      await db.trials.delete(from.id)
      const toTrials = to.id == null ? null : await db.trials.get(to.id)
      if (toTrials) {
        // first merge phrase trials
        const toPhraseTrials = toTrials.phraseTrials
        if (toPhraseTrials) {
          const fromPhraseTrials = fromTrials.phraseTrials
          if (fromPhraseTrials) {
            // if one of them *isn't* done, don't mark it as done
            toPhraseTrials.done &&= fromPhraseTrials.done
            if (toPhraseTrials.nextTime > fromPhraseTrials.nextTime)
              toPhraseTrials.nextTime = fromPhraseTrials.nextTime
            // keep the earlier start time
            const start1 = fromPhraseTrials.times.shift()!
            const start2 = toPhraseTrials.times.shift()!
            fromPhraseTrials.times = [
              start1[0] < start2[0] ? start1 : start2,
              ...fromPhraseTrials.times,
              ...toPhraseTrials.times,
            ].sort((a, b) => {
              return a[0]! < b[0]! ? -1 : 1
            })
          }
        } else {
          toTrials.phraseTrials = fromTrials.phraseTrials
        }
        // then merge gloss trials
        const toGlossTrials = toTrials.glossTrials
        if (toGlossTrials) {
          const fromGlossTrials = fromTrials.glossTrials
          if (fromGlossTrials) {
            // if one of them *isn't* done, don't mark it as done
            toGlossTrials.done &&= fromGlossTrials.done
            if (toGlossTrials.nextTime > fromGlossTrials.nextTime)
              toGlossTrials.nextTime = fromGlossTrials.nextTime
            // keep the earlier start time
            const start1 = fromGlossTrials.times.shift()!
            const start2 = toGlossTrials.times.shift()!
            fromGlossTrials.times = [
              start1[0] < start2[0] ? start1 : start2,
              ...fromGlossTrials.times,
              ...toGlossTrials.times,
            ].sort((a, b) => {
              return a[0]! < b[0]! ? -1 : 1
            })
          }
        } else {
          toTrials.glossTrials = fromTrials.glossTrials
        }
      } else {
        fromTrials.phraseId = to.id!
        await db.trials.put(fromTrials)
      }
    }
    // reduce things down to just one phrase
    if (from.updatedAt > to.updatedAt) to.updatedAt = from.updatedAt // the most recentl updatedAt wins
    if (from.id) await db.phrases.delete(from.id)
    await db.phrases.put(to, to.id!)
    knownLanguages() // recalculate cached information
    return to
  })
}

// TODO fix this so it also deletes trials
export function deletePhrase(phrase: Phrase): Promise<void> {
  return db.transaction("rw", db.phrases, db.relations, async () => {
    if (phrase.relations?.length) {
      // safely delete all relations
      const relations = await db.relations
        .where("id")
        .anyOf(phrase.relations)
        .toArray()
      const phraseIds: number[] = []
      for (const r of relations)
        for (const i of [r.p1, r.p2]) if (i !== phrase.id) phraseIds.push(i)
      const phrases = await db.phrases.where("id").anyOf(phraseIds).toArray()
      for (const p of phrases) {
        p.relations = p.relations!.filter(
          (i) => !relations.some((r) => r.id === i),
        )
      }
      await db.phrases.bulkPut(phrases)
      await db.relations.bulkDelete(relations.map((r) => r.id))
    }
    await db.phrases.delete(phrase.id)
  })
}

// returns languages and frequencies for display in configuration
export function knownLanguages(): Promise<Language[]> {
  return db.transaction("rw", db.languages, db.phrases, async () => {
    void (await db.languages.toCollection().modify({ count: 0, locales: {} }))
    const languages = await db.languages.toArray()
    db.phrases.each((p) => {
      const language = languages.find((l) => l.id === p.languageId)!
      language.count++
      for (const c of p.citations) {
        if (c.locale) {
          language.locales[c.locale] ??= 0
          language.locales[c.locale]++
        }
      }
    })
    void (await db.languages.bulkPut(languages))
    // sort them primarily most used to least used and secondarily alphabetically
    return languages.sort((la, lb) => {
      if (la.id === 0) return -1
      if (lb.id === 0) return 1
      const delta = lb.count - la.count
      if (delta) return delta
      return la.name < lb.name ? -1 : la.name > lb.name ? 1 : 0
    })
  })
}

// cheaper version of knownLanguages which doesn't promise accurate locales or counts
export function perhapsStaleLanguages(): Promise<Language[]> {
  return db.languages.toArray()
}

export function addLanguage(
  name: string,
  locale: string,
  moveExisting: boolean,
): Promise<Language> {
  return db.transaction("rw", db.phrases, db.languages, async () => {
    const language: Language = { name, locale, locales: {}, count: 0 }
    language.id = await db.languages.put(language)
    if (moveExisting) {
      const phrasesToModify = await db.phrases
        .filter((p) => every(p.citations, (c) => c.locale === locale))
        .toArray()
      const updates = phrasesToModify.map((p: Phrase) => ({
        key: p.id,
        changes: { languageId: language.id },
      }))
      void (await db.phrases.bulkUpdate(updates))
    }
    return language
  })
}

// count the number of phrases all of whose citations have the given locale
export function countPhrasesWithLocale(locale: string): Promise<number> {
  return db.transaction("r", db.phrases, async () => {
    return db.phrases
      .filter((p) => every(p.citations, (c) => c.locale === locale))
      .count()
  })
}

export function removeLanguage(
  language: Language,
  moveExisting: boolean,
): Promise<void> {
  return db.transaction("rw", db.phrases, db.languages, async () => {
    if (moveExisting) {
      void (await db.phrases
        .where("languageId")
        .equals(language.id!)
        .modify({ languageId: 0 }))
    } else {
      void (await db.phrases.where("languageId").equals(language.id!).delete())
    }
    db.languages.bulkDelete([language.id!])
    return
  })
}

// save an existing language (e.g. after editing equivalence classes)
export function saveLanguage(language: Language): Promise<void> {
  return db.languages.put(language).then(() => {
    regexCache.delete(language.id!) // force recompilation
  })
}

// generate a new *unsaved* phrase and return the phrase a list of phrases it might be merged with
export function citationToPhrase(
  c: Citation,
  locale: string,
): Promise<[Phrase, Phrase[]]> {
  return db.transaction("rw", db.languages, db.phrases, async () => {
    const languages = (await db.languages.toArray()).filter(
      (l) => l.locale === locale || l.locales[locale],
    )
    let languageId = 0
    if (languages.length > 1) {
      languageId = languages.sort((a, b) => {
        if (a.locale === locale) return -1
        if (b.locale === locale) return 1
        return (a.locales[locale] ?? 0) - (b.locales[locale] ?? 0)
      })[0].id!
    } else if (languages.length === 1) languageId = languages[0].id!
    const languageIds = languages.length ? languages.map((l) => l.id!) : [0]
    const key = snorm(c.phrase)
    const others = await db.phrases
      .where("languageId")
      .anyOf(languageIds)
      .filter(
        (p) =>
          snorm(p.lemma) === key ||
          p.citations.some((o) => snorm(o.phrase) === key),
      )
      .toArray()
    c.locale = locale
    const phrase: Phrase = {
      lemma: c.phrase,
      languageId,
      citations: [c],
      updatedAt: new Date(),
      createdAt: new Date(),
    }
    return [phrase, others]
  })
}

/** really it's citations associated with a particular URL */
export async function phrasesOnPage(search: UrlSearch): Promise<SearchResults> {
  const { url, page = 1, pageSize = 10 } = search
  const rs = await db.phrases
    .toCollection()
    .filter((p) => p.citations.some((c) => c.url?.startsWith(url)))
    .toArray()
  const offset = (page - 1) * pageSize
  const phrases = rs.slice(offset, offset + pageSize)
  const total = rs.length
  const pages = Math.ceil(total / pageSize)
  return { selected: -1, phrases, page, pages, pageSize, total }
}

// basically an upsert; returns the phrase with its database id
export async function savePhrase(phrase: Phrase): Promise<Phrase> {
  const p = { ...phrase, relatedPhrases: undefined } // we don't cache these in the database
  p.createdAt ??= new Date()
  const id = await db.phrases.put(p, phrase.id)
  if (id) phrase.id = id
  regexCache.delete(phrase.languageId!) // force recompilation of the language's regex
  return phrase
}

/** search for phrases that might be merged with a phrase/citation */
export async function similaritySearch(
  search: SimilaritySearch,
): Promise<SearchResults> {
  const {
    phrase,
    limit,
    metric,
    languages = [],
    page = 1,
    pageSize = 10,
  } = search
  const rs = await db.transaction("r", db.phrases, db.languages, async () => {
    if (!search.phrase) return []
    let norm: (s: string) => string
    if (languages.length === 1) {
      const l = await db.languages.get(languages[0])
      if (l) norm = normalizer(l)
    }
    norm ??= defaultStringNormalizer
    const scope = languages.length
      ? db.phrases.where("languageId").anyOf(languages)
      : db.phrases.toCollection()
    const sims = new SimilaritySorter(metric, phrase, norm, limit)
    void (await scope.each((p) => sims.add(p)))
    return sims.toArray()
  })
  const offset = (page - 1) * pageSize
  const phrases = rs.slice(offset, offset + pageSize)
  const total = rs.length
  const pages = Math.ceil(total / pageSize)
  return { selected: -1, phrases, page, pages, pageSize, total }
}

/** general search */
export async function phraseSearch(
  search: FreeFormSearch,
): Promise<SearchResults> {
  const {
    lemma,
    text,
    tags = [],
    languages = [],
    sort = { type: SortType.Lemma, direction: SortDirection.Ascending },
    // these defaults should be redundant
    page = 1,
    pageSize = 10,
  } = search
  const rv: { phrases: Phrase[]; total: number } = await db.transaction(
    "r",
    db.phrases,
    db.tags,
    async () => {
      let scope = languages.length
        ? db.phrases.where("languageId").anyOf(languages)
        : db.phrases.toCollection()
      if (text && /\S/.test(text.text)) {
        const { whole, exact, caseSensitive } = text
        const rx = matcher(text.text, !!whole, !exact, !caseSensitive)
        scope = scope.filter((p: Phrase) => {
          if (rx.test(p.lemma)) return true
          if (p.note && rx.test(p.note)) return true
          if (p.elaboration && rx.test(p.elaboration)) return true
          for (const c of p.citations) {
            if (rx.test(c.phrase)) return true
            if (rx.test(c.before)) return true
            if (rx.test(c.after)) return true
            if (c.note && rx.test(c.note)) return true
          }
          return false
        })
      }
      if (lemma && /\S/.test(lemma.text)) {
        const { whole, exact, caseSensitive } = lemma
        const rx = matcher(lemma.text, !!whole, !exact, !caseSensitive)
        scope = scope.filter((p: Phrase) => rx.test(p.lemma))
      }
      if (tags.length) {
        const tagSet = new Set(tags)
        scope = scope.filter((p: Phrase) => {
          if (p.tags) {
            for (const t of p.tags) {
              if (tagSet.has(t)) return true
            }
            for (const c of p.citations) {
              if (c.tags) {
                for (const t of c.tags) {
                  if (tagSet.has(t)) return true
                }
              }
            }
          }
          return false
        })
      }
      const sortKey =
        sort.type === SortType.Lemma
          ? "lemma"
          : sort.type === SortType.Creation
            ? "created_at"
            : "updated_at"
      const offset = (page - 1) * pageSize
      const rs: Phrase[] = await scope
        .sortBy(sortKey)
        .then((phrases) =>
          sort.direction === SortDirection.Descending
            ? phrases.reverse()
            : phrases,
        )
      const phrases = rs.slice(offset, offset + pageSize)
      const total = rs.length
      return { phrases, total }
    },
  )
  const { phrases, total } = rv
  const pages = Math.ceil(total / pageSize)
  return { selected: -1, phrases, page, pages, pageSize, total }
}

/** import export functionality */

export async function exportDb(options?: ExportOptions) {
  return exportDB(db, options)
}

export async function importDb(file: Blob) {
  // Ensure any previous orphaned "tmp" database is cleaned up
  try {
    await BaseDexie.delete("tmp")
  } catch {
    // ignore if doesn't exist
  }

  let tmp: Dexie<DexieTable> | undefined
  try {
    tmp = (await importDB(file, { name: "tmp" })) as Dexie<DexieTable>
    const languageMap = await mergeLanguages(tmp)
    const tagMap = await importTags(tmp, languageMap)
    await importPhrasesAndTrials(tmp, languageMap, tagMap)
    regexCache.clear()

    const config = (await db.configuration.get(0)) ?? { id: 0 }
    // if either of the current quizzes has no phrases, remove it; this prevents
    // an obscure bug that arises if you look at the quizzes with an empty DB and then
    // import data
    if (!config.currentPhraseQuiz?.phrases.length)
      delete config.currentPhraseQuiz
    if (!config.currentGlossQuiz?.phrases.length) delete config.currentGlossQuiz
    await db.configuration.put(config, 0)
    return config
  } finally {
    if (tmp) {
      try {
        await tmp.delete()
      } catch (e) {
        console.warn("Failed to delete tmp database:", e)
      }
    }
  }
}

// import phrases, relations, and trials, converting all foreign keys to those appropriate after import
async function importPhrasesAndTrials(
  tmp: Dexie<DexieTable>,
  languageMap: Map<number, number>,
  tagMap: Map<number, number>,
) {
  const phraseNumberMap = new Map<number, number>()
  const phraseMap = new Map<number, Phrase>()

  // 1. Add the phrases minus relations
  const phrases = await tmp.phrases.toArray()
  for (let p of phrases) {
    const oldId = p.id
    delete p.id
    if (p.languageId !== undefined) {
      p.languageId = languageMap.get(p.languageId)
    }
    const newTags: number[] = []
    for (const t of p.tags ?? []) {
      const remapped = tagMap.get(t)
      if (remapped !== undefined) {
        newTags.push(remapped)
      }
    }
    // Remap tags in citations
    for (const c of p.citations ?? []) {
      if (c.tags) {
        c.tags = c.tags
          .map((t) => tagMap.get(t))
          .filter((t): t is number => t !== undefined)
      }
    }
    p = { ...p, tags: newTags, relations: [] }
    const id = (await db.phrases.put(p)) as number
    if (oldId !== undefined) {
      phraseNumberMap.set(oldId, id)
    }
    phraseMap.set(id, { ...p, id })
  }

  // 2. Restore relations
  const relations = await tmp.relations.toArray()
  for (const { p1: p1id, p2: p2id } of relations) {
    if (!phraseNumberMap.has(p1id)) continue
    if (!phraseNumberMap.has(p2id)) continue
    const p1 = phraseMap.get(phraseNumberMap.get(p1id)!)!
    const p2 = phraseMap.get(phraseNumberMap.get(p2id)!)!
    await createRelation(p1, p2)
  }

  // 3. Restore spaced repetition trials
  const trials = await tmp.trials.toArray()
  const trialsToInsert: Trial[] = []
  for (const trial of trials) {
    const newPhraseId = phraseNumberMap.get(trial.phraseId)
    if (newPhraseId !== undefined) {
      trialsToInsert.push({
        ...trial,
        phraseId: newPhraseId,
      })
    }
  }
  if (trialsToInsert.length > 0) {
    await db.trials.bulkPut(trialsToInsert)
  }
}

// import the tags and tag groups from tmp, merging existing tags/groups and remapping IDs
async function importTags(
  tmp: Dexie<DexieTable>,
  languageMap: Map<number, number>,
): Promise<Map<number, number>> {
  const tagMap = new Map<number, number>()
  const importedTags = await tmp.tags.toArray()

  let importedGroups: TagGroup[] = []
  if (tmp.tables.some((t) => t.name === "tagGroups")) {
    importedGroups = await tmp.table<TagGroup>("tagGroups").toArray()
  }

  // Fallback for v1 database export without tagGroups table
  if (importedGroups.length === 0 && importedTags.length > 0) {
    const clusterMap = new Map<
      string,
      { color: string; bgcolor: string; tags: Tag[] }
    >()
    for (const t of importedTags) {
      const color = normalizeHexColor(t.color, "#000000")
      const bgcolor = normalizeHexColor(t.bgcolor, "#ffffff")
      const key = `${bgcolor}:${color}`
      let c = clusterMap.get(key)
      if (!c) {
        c = { color, bgcolor, tags: [] }
        clusterMap.set(key, c)
      }
      c.tags.push(t)
    }

    const defaultKey = "#ffffff:#000000"
    let defaultCluster = clusterMap.get(defaultKey)
    if (!defaultCluster) {
      defaultCluster = {
        color: "#000000",
        bgcolor: "#ffffff",
        tags: [],
      }
      clusterMap.set(defaultKey, defaultCluster)
    }

    let simId = 1
    const defGroupId = simId++
    importedGroups.push({
      id: defGroupId,
      name: DEFAULT_TAG_GROUP_NAME,
      description: DEFAULT_TAG_GROUP_DESCRIPTION,
      color: "#000000",
      bgcolor: "#ffffff",
      order: 0,
    })
    for (const t of defaultCluster.tags) {
      t.groupId = defGroupId
    }

    for (const [key, cluster] of clusterMap.entries()) {
      if (key === defaultKey) continue
      cluster.tags.sort((a, b) => (a.id ?? 0) - (b.id ?? 0))
      const firstTag = cluster.tags[0]
      const name = (firstTag?.name || `group-${simId}`).trim()
      const desc = firstTag?.description
      const groupId = simId++

      // Common languages
      let commonLanguages: number[] | undefined = undefined
      if (
        cluster.tags.length > 0 &&
        cluster.tags.every((t) => t.languages && t.languages.length > 0)
      ) {
        const firstLangs: number[] = cluster.tags[0].languages!
        const common = firstLangs.filter((langId: number) =>
          cluster.tags.every((t) => t.languages!.includes(langId))
        )
        if (common.length > 0) {
          commonLanguages = common
        }
      }

      importedGroups.push({
        id: groupId,
        name,
        description: desc,
        color: cluster.color,
        bgcolor: cluster.bgcolor,
        languages: commonLanguages,
        order: simId,
      })
      for (const t of cluster.tags) {
        t.groupId = groupId
        if (
          commonLanguages &&
          t.languages &&
          t.languages.length === commonLanguages.length &&
          t.languages.every((l: number) => commonLanguages!.includes(l))
        ) {
          t.languages = undefined
        }
      }
    }
  }

  await db.transaction("rw", db.tags, db.tagGroups, async () => {
    const existingGroups = await db.tagGroups.toArray()
    let defaultGroup = existingGroups.find(
      (g) => g.name.toLowerCase() === DEFAULT_TAG_GROUP_NAME.toLowerCase()
    )
    if (!defaultGroup) {
      const defId = (await db.tagGroups.add({
        name: DEFAULT_TAG_GROUP_NAME,
        description: DEFAULT_TAG_GROUP_DESCRIPTION,
        color: "#000000",
        bgcolor: "#ffffff",
        order: 0,
      })) as number
      defaultGroup = {
        id: defId,
        name: DEFAULT_TAG_GROUP_NAME,
        description: DEFAULT_TAG_GROUP_DESCRIPTION,
        color: "#000000",
        bgcolor: "#ffffff",
        order: 0,
      }
      existingGroups.push(defaultGroup)
    }
    const defaultGroupId = defaultGroup.id!

    const groupMap = new Map<number, number>() // importedGroupId -> activeGroupId

    for (const impG of importedGroups) {
      const oldGroupId = impG.id!
      const normColor = normalizeHexColor(impG.color, "#000000")
      const normBg = normalizeHexColor(impG.bgcolor, "#ffffff")

      // If imported group is the default group (by name or default colors)
      if (
        impG.name.toLowerCase() === DEFAULT_TAG_GROUP_NAME.toLowerCase() ||
        (normColor === "#000000" && normBg === "#ffffff")
      ) {
        groupMap.set(oldGroupId, defaultGroupId)
        continue
      }

      // Rule 1: Same name and same colors -> exact match!
      const exactMatch = existingGroups.find(
        (exG) =>
          exG.name.toLowerCase() === impG.name.toLowerCase() &&
          normalizeHexColor(exG.color, "#000000") === normColor &&
          normalizeHexColor(exG.bgcolor, "#ffffff") === normBg
      )

      if (exactMatch) {
        groupMap.set(oldGroupId, exactMatch.id!)
        if (impG.languages && impG.languages.length > 0) {
          const remappedLangs = impG.languages
            .map((lid) => languageMap.get(lid))
            .filter((lid): lid is number => lid !== undefined)
          const mergedLangs = uniq([
            ...(exactMatch.languages ?? []),
            ...remappedLangs,
          ])
          if (mergedLangs.length !== (exactMatch.languages?.length ?? 0)) {
            exactMatch.languages = mergedLangs
            await db.tagGroups.put(exactMatch)
          }
        }
      } else {
        // Name conflict?
        let newName = impG.name.trim()
        const descNotes: string[] = []
        if (
          existingGroups.some(
            (exG) => exG.name.toLowerCase() === newName.toLowerCase()
          )
        ) {
          const origName = newName
          let suffix = 2
          while (
            existingGroups.some(
              (exG) =>
                exG.name.toLowerCase() === `${origName} (${suffix})`.toLowerCase()
            )
          ) {
            suffix++
          }
          newName = `${origName} (${suffix})`
          descNotes.push(
            `[modifications during merging: renamed from '${origName}' due to name conflict with an existing group]`
          )
        }

        // Color conflict?
        let adjColor = normColor
        let adjBg = normBg
        const colorConflict = existingGroups.find(
          (exG) =>
            normalizeHexColor(exG.color, "#000000") === normColor &&
            normalizeHexColor(exG.bgcolor, "#ffffff") === normBg
        )
        if (colorConflict) {
          const [c, bg] = findUnusedColorPair(normColor, normBg, existingGroups)
          adjColor = c
          adjBg = bg
          descNotes.push(
            `[modifications during merging: colors adjusted from ${impG.bgcolor}/${impG.color} to ${adjBg}/${adjColor} due to conflict with '${colorConflict.name}']`
          )
        }

        const newDesc = [impG.description, ...descNotes]
          .filter(Boolean)
          .join(" ")

        let newLanguages = impG.languages
        if (newLanguages && newLanguages.length > 0) {
          newLanguages = newLanguages
            .map((lid) => languageMap.get(lid))
            .filter((lid): lid is number => lid !== undefined)
        }

        delete impG.id
        const newGroupRecord: TagGroup = {
          name: newName,
          description: newDesc || undefined,
          color: adjColor,
          bgcolor: adjBg,
          languages: newLanguages,
          order: existingGroups.length,
        }
        const newGroupId = (await db.tagGroups.add(newGroupRecord)) as number
        newGroupRecord.id = newGroupId
        groupMap.set(oldGroupId, newGroupId)
        existingGroups.push(newGroupRecord)
      }
    }

    // Now import tags
    for (const t of importedTags) {
      const oldId = t.id!
      const targetGroupId =
        (t.groupId !== undefined ? groupMap.get(t.groupId) : undefined) ??
        defaultGroupId

      // Check for tag name collision within the target group
      const existing = await db.tags
        .where("groupId")
        .equals(targetGroupId)
        .and((tag) => tag.name.toLowerCase() === t.name.toLowerCase())
        .first()

      if (existing) {
        if (t.languages && t.languages.length > 0) {
          const remappedLangs = t.languages
            .map((lid) => languageMap.get(lid))
            .filter((lid): lid is number => lid !== undefined)
          const mergedLangs = uniq([
            ...(existing.languages ?? []),
            ...remappedLangs,
          ])
          if (mergedLangs.length !== (existing.languages?.length ?? 0)) {
            existing.languages = mergedLangs
            await db.tags.put(existing)
          }
        }
        tagMap.set(oldId, existing.id!)
      } else {
        delete t.id
        t.groupId = targetGroupId
        delete t.color
        delete t.bgcolor
        if (t.languages) {
          t.languages = t.languages
            .map((lid) => languageMap.get(lid))
            .filter((lid): lid is number => lid !== undefined)
        }
        const newId = (await db.tags.put(t)) as number
        tagMap.set(oldId, newId)
      }
    }
  })

  return tagMap
}

// merge an imported set of languages into the existing languages table
async function mergeLanguages(
  tmp: Dexie<DexieTable>,
): Promise<Map<number, number>> {
  const newLanguages = await tmp.languages.toArray()
  const oldLanguages = await db.languages.toArray()
  const oldLanguagesByLocale = new Map<string, Language>()
  for (const l of oldLanguages) {
    if (l.locale) oldLanguagesByLocale.set(l.locale, l)
  }

  const languageMap = new Map<number, number>()

  await db.transaction("rw", db.languages, async () => {
    for (const newLang of newLanguages) {
      if (!newLang.locale) continue
      const oldLang = oldLanguagesByLocale.get(newLang.locale)
      if (oldLang) {
        oldLang.count = (oldLang.count || 0) + (newLang.count || 0)
        if (newLang.locales) {
          oldLang.locales ??= {}
          for (const [subLocale, count] of Object.entries(newLang.locales)) {
            oldLang.locales[subLocale] =
              (oldLang.locales[subLocale] || 0) + count
          }
        }
        await db.languages.put(oldLang)
        languageMap.set(newLang.id!, oldLang.id!)
      } else {
        const oldId = newLang.id!
        delete newLang.id
        const newId = (await db.languages.put(newLang)) as number
        languageMap.set(oldId, newId)
      }
    }
  })

  return languageMap
}

// functions relating to spaced repetition quizzes

// collect the information necessary to start a spaced repetition quiz
export async function makeQuiz(
  // the maximum number of new phrases to include
  newPhrases: number,
  // whether questions concern the lemma or the gloss
  phrasesAreQuestionsAndGlossesAreAnswers: boolean,
): Promise<QuizSignature> {
  const startTime = new Date()
  const phrases: number[] = []
  return db.transaction("r", db.phrases, db.trials, async () => {
    const trials = await db.trials.toArray()
    const trialMap = new Map<number, Trial>()
    trials.forEach((t) => trialMap.set(t.phraseId, t))
    const phraseIds: number[] = await db.phrases.toCollection().primaryKeys()
    // shuffle these so the new phrases aren't chosen in order
    shuffle(phraseIds)
    let newCount = 0
    const key = phrasesAreQuestionsAndGlossesAreAnswers
      ? "phraseTrials"
      : "glossTrials"
    for (const i of phraseIds) {
      const t = trialMap.get(i)
      if (t) {
        const times = t[key]
        if (times) {
          if (times.done) continue
          if (times.nextTime < startTime) {
            phrases.push(i)
          }
        } else {
          if (newCount < newPhrases) {
            newCount++
            phrases.push(i)
          }
        }
      } else {
        if (newCount < newPhrases) {
          newCount++
          phrases.push(i)
        }
      }
    }
    // I have not figured out why the second shuffle is necessary, but without it all the new
    // phrases appear first in the quiz
    shuffle(phrases)
    return {
      startTime,
      phrasesAreQuestionsAndGlossesAreAnswers,
      phrases,
      index: 0,
    }
  })
}

// gather the information necessary to display a single flashcard
export async function prepareTrial(phraseId: number): Promise<PreparedTrial> {
  return db.transaction(
    "r",
    db.phrases,
    db.languages,
    db.tags,
    db.tagGroups,
    db.trials,
    async () => {
      const phrase = (await db.phrases.get(phraseId)) as Phrase
      if (!phrase.languageId)
        throw `note for "${phrase.lemma}" has no language specified`
      const language = (await db.languages.get(phrase.languageId!)) as Language
      const tags: Tag[] = phrase.tags?.length
        ? await enrichTags(
            await db.tags.where("id").anyOf(phrase.tags).toArray()
          )
        : []
      const trial = (await db.trials.get(phraseId)) ?? { phraseId }
      return { phrase, trial, tags, language }
    },
  )
}

// save the outcome of a single flash card trial
export async function saveTrial(trial: Trial): Promise<void> {
  return db.trials.put(trial, trial.phraseId)
}

// returns a summary of how a quiz is going
export async function howTheQuizIsGoingSoFar(
  phrases: number[],
  startTime: Date,
  quizzingOnLemmas: boolean,
): Promise<Summary> {
  return db.transaction("r", db.trials, async () => {
    const allTrials = await db.trials.where("phraseId").anyOf(phrases).toArray()
    const trialsWithinPeriod: NonInitialOutcome[] = []
    const field = trialsKey(quizzingOnLemmas)
    // preliminary counts
    let old = allTrials.length // if we have any trials, it's probably old
    let remaining = phrases.length // we have to review them all
    for (const trial of allTrials) {
      const previous = trial[field]
      // we might have trials, but not for this type of quiz
      if (previous?.times.length) {
        // reduce it to just today's trials
        const times = previous.times.filter(([time, outcome]) => {
          const usableTime = time > startTime
          const usableOutcome = outcome !== "first"
          return usableTime && usableOutcome
        })
        // do we have any left?
        if (times.length) {
          // store these outcomes
          for (const [_time, outcome] of times) {
            trialsWithinPeriod.push(outcome as NonInitialOutcome)
          }
          // did all trials happen today? if so, we miscounted it as old
          if (times.length + 1 === previous.times.length) old--
          // do we have any left after removing 'again'? if so, we've miscounted remaining
          if (times.filter(([_time, outcome]) => outcome !== "again").length)
            remaining--
        }
      } else {
        // no trials of this type, so it's new
        old--
      }
    }
    return {
      old,
      new: phrases.length - old,
      remaining,
      outcomes: trialsWithinPeriod,
    }
  })
}

// count the number of phrases that might show up as new phrases in a quiz
export async function newPhraseCount(
  quizzingOnLemmas: boolean,
): Promise<number> {
  return db.transaction("r", db.phrases, db.trials, async () => {
    const phraseIds = (await db.phrases
      .toCollection()
      .primaryKeys()) as number[]
    let count = phraseIds.length
    const key = trialsKey(quizzingOnLemmas)
    await db.trials
      .where("phraseId")
      .anyOf(phraseIds)
      .each((t) => {
        if (t[key]) count--
      })
    return count
  })
}

const regexCache: Map<number, RegExp> = new Map()

const unicodeLetter = /[\p{L}\p{N}_]/u

// convert s into a new string with boundary markers as appropriate
function regexify(c1: string, s: string, c4: string): string {
  const c2 = s.charAt(0),
    c3 = s.charAt(s.length - 1)
  const b1 = unicodeLetter.test(c2) && !unicodeLetter.test(c1) ? "\0" : ""
  const b2 = unicodeLetter.test(c3) && !unicodeLetter.test(c4) ? "\x01" : ""
  return `${b1}${s}${b2}`
}

// obtain a capturing regular expression that matches all the lemmas and cited phrases
// for a particular language
async function regexForLanguage(language: Language): Promise<RegExp> {
  let rx = regexCache.get(language.id!)
  if (rx) return rx
  const phrases: string[] = []
  await db.phrases
    .where("languageId")
    .equals(language.id!)
    .each((p) => {
      phrases.push(regexify(" ", p.lemma, " "))
      for (const c of p.citations) {
        const c1 = c.before ? c.before.charAt(c.before.length - 1) : " "
        const c2 = c.after ? c.after.charAt(0) : " "
        phrases.push(regexify(c1, c.phrase, c2))
      }
    })
  rx = regex(phrases, {
    capture: true,
    flags: "ui",
    // unicode-safe word boundaries
    substitutions: {
      "\0": "(?<![\\p{L}\\p{N}_])",
      "\x01": "(?![\\p{L}\\p{N}_])",
    },
    normalizeWhitespace: true,
  })
  regexCache.set(language.id!, rx)
  return rx
}

// for converting text into text with links to known phrases
export async function splitText(
  text: string,
  language: Language,
): Promise<{ parts: string[]; map: Map<string, Phrase> }> {
  const splitter = await regexForLanguage(language)
  const parts: string[] = []
  let lookups: string[] = []
  const map: Map<string, Phrase> = new Map()
  text.split(splitter).forEach((s, i) => {
    if (s) {
      // skip empty strings
      parts.push(s)
      if (i % 2 === 1) lookups.push(s) // odd indices are matches
    }
  })
  lookups = uniq(lookups) // filter out duplicates
  // a new regex that will let us match mapped parts to phrases
  // TODO get this to handle homonyms
  const rx = regex(lookups, {
    bound: true,
    flags: "i",
    normalizeWhitespace: true,
  })
  // some utility closures...
  // see if a particular lemma or citation is one of our matches
  const testPhrase = function (s: string): boolean {
    const r = rx.exec(s)
    return !!r && r[0] === s // does the whole word match?
  }
  // map a match back to the lookup words it corresponds to
  const findMatches = function (s: string): string[] {
    const rx = regex([s], {
      bound: true,
      flags: "i",
      normalizeWhitespace: true,
    })
    return lookups.filter((s) => {
      const r = rx.exec(s)
      return !!r && r[0] === s // again, does the whole word match?
    })
  }
  // scan through the phrases in the language and populate the map
  await db.phrases
    .where("languageId")
    .equals(language.id!)
    .each((p) => {
      // lemmas override anything already in the map
      // this way we can have enties for both "tapa" and "tapaan", a form of "tapa", and provide the
      // note for the latter when appropriate even if the "tapa" note has a "tapaan" citation
      if (testPhrase(p.lemma)) {
        for (const word of findMatches(p.lemma))
          map.set(word.toLocaleLowerCase(language.locale), p)
        return
      }
      const normalizedLemma = p.lemma.toLocaleLowerCase(language.locale)
      for (const c of p.citations) {
        if (c.phrase.toLocaleLowerCase(language.locale) === normalizedLemma)
          continue // we've done this one already
        if (testPhrase(c.phrase)) {
          for (const word of findMatches(c.phrase)) {
            // citations only fill in blanks in the map
            const key = word.toLocaleLowerCase(language.locale)
            if (!map.has(key)) map.set(key, p)
          }
          return
        }
      }
    })
  return { parts, map }
}
