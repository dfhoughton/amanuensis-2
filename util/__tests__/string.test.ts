import { normalizer } from "../string"
import { Language } from "../../types/common"

/**
 * Helper to build a minimal Language object for testing.
 */
function makeLanguage(
  name: string,
  equivalenceClasses?: Language["graphemeEquivalenceClasses"]
): Language {
  return {
    name,
    locales: {},
    count: 0,
    graphemeEquivalenceClasses: equivalenceClasses,
  }
}

describe("normalizer", () => {
  describe("English (no equivalence classes)", () => {
    const english = makeLanguage("English")
    const normalize = normalizer(english)

    it("lowercases text", () => {
      expect(normalize("Hello")).toBe("hello")
    })

    it("strips and condenses whitespace", () => {
      expect(normalize("  good   morning  ")).toBe("good morning")
    })

    it("returns an empty string for empty input", () => {
      expect(normalize("")).toBe("")
    })

    it("leaves already-normalized text unchanged", () => {
      expect(normalize("cat")).toBe("cat")
    })

    it("does not alter non-ASCII characters", () => {
      // English has no equivalence classes, so diacritics pass through
      expect(normalize("naïve")).toBe("naïve")
      expect(normalize("café")).toBe("café")
    })
  })

  describe("Finnish (vowel harmony equivalence classes)", () => {
    // Finnish vowel harmony: back vowels a, o, u pair with front vowels ä, ö, y
    const finnish = makeLanguage("Finnish", [
      ["a", ["ä"]],
      ["o", ["ö"]],
      ["u", ["y"]],
    ])
    const normalize = normalizer(finnish)

    // --- ä → a ---

    it("normalizes 'älä' → 'ala' (do not / imperative negation)", () => {
      expect(normalize("älä")).toBe("ala")
    })

    it("normalizes 'käsi' → 'kasi' (hand)", () => {
      expect(normalize("käsi")).toBe("kasi")
    })

    it("normalizes 'päivä' → 'paiva' (day)", () => {
      expect(normalize("päivä")).toBe("paiva")
    })

    it("normalizes 'mäki' → 'maki' (hill)", () => {
      expect(normalize("mäki")).toBe("maki")
    })

    it("normalizes 'jää' → 'jaa' (ice)", () => {
      expect(normalize("jää")).toBe("jaa")
    })

    it("normalizes 'väri' → 'vari' (color)", () => {
      expect(normalize("väri")).toBe("vari")
    })

    // --- ö → o ---

    it("normalizes 'öljy' → 'olju' (oil — also y→u)", () => {
      // öljy has both ö→o and y→u
      expect(normalize("öljy")).toBe("olju")
    })

    it("normalizes 'pöytä' → 'pouta' (table — ö→o, y→u, ä→a)", () => {
      expect(normalize("pöytä")).toBe("pouta")
    })

    it("normalizes 'töyhtö' → 'touhto' (crest/tuft)", () => {
      expect(normalize("töyhtö")).toBe("touhto")
    })

    // --- y → u ---

    it("normalizes 'yö' → 'uo' (night — y→u, ö→o)", () => {
      expect(normalize("yö")).toBe("uo")
    })

    it("normalizes 'syy' → 'suu' (reason — note: 'suu' also means mouth)", () => {
      expect(normalize("syy")).toBe("suu")
    })

    it("normalizes 'kylä' → 'kula' (village — y→u, ä→a)", () => {
      expect(normalize("kylä")).toBe("kula")
    })

    it("normalizes 'hyvä' → 'huva' (good — y→u, ä→a)", () => {
      expect(normalize("hyvä")).toBe("huva")
    })

    // --- words with no front vowels should be unchanged ---

    it("leaves 'talo' unchanged (house — back vowels only)", () => {
      expect(normalize("talo")).toBe("talo")
    })

    it("leaves 'koulu' unchanged (school — back vowels only)", () => {
      expect(normalize("koulu")).toBe("koulu")
    })

    it("leaves 'musta' unchanged (black — back vowels only)", () => {
      expect(normalize("musta")).toBe("musta")
    })

    // --- case insensitivity ---

    it("normalizes uppercase 'KÄSI' → 'kasi'", () => {
      expect(normalize("KÄSI")).toBe("kasi")
    })

    it("normalizes mixed case 'Pöytä' → 'pouta'", () => {
      expect(normalize("Pöytä")).toBe("pouta")
    })

    // --- whitespace handling ---

    it("strips and condenses whitespace in Finnish text", () => {
      expect(normalize("  hyvä   päivä  ")).toBe("huva paiva")
    })
  })

  describe("Hebrew (nikkud/diacritics stripping)", () => {
    // All Hebrew nikkud (vowel points and reading aids) mapped to "" to strip them
    const hebrewNikkud: string[] = [
      "\u05B0", // shva
      "\u05B1", // hataf segol
      "\u05B2", // hataf patah
      "\u05B3", // hataf qamats
      "\u05B4", // hiriq
      "\u05B5", // tsere
      "\u05B6", // segol
      "\u05B7", // patah
      "\u05B8", // qamats
      "\u05B9", // holam
      "\u05BB", // qubuts
      "\u05BC", // dagesh / mapiq
      "\u05BD", // meteg
      "\u05BF", // rafe
      "\u05C1", // shin dot
      "\u05C2", // sin dot
    ]
    const hebrew = makeLanguage("Hebrew", [["", hebrewNikkud]])
    const normalize = normalizer(hebrew)

    // --- pointed → unpointed ---

    it("strips nikkud from שָׁלוֹם → שלום (shalom — peace)", () => {
      // shin+shin_dot+qamats + lamed + vav+holam + final_mem
      expect(normalize("\u05E9\u05C1\u05B8\u05DC\u05D5\u05B9\u05DD")).toBe("שלום")
    })

    it("strips nikkud from בְּרֵאשִׁית → בראשית (bereshit — in the beginning)", () => {
      // bet+shva+dagesh + resh+tsere + alef + shin+hiriq+shin_dot + yod + tav
      expect(normalize("\u05D1\u05B0\u05BC\u05E8\u05B5\u05D0\u05E9\u05C1\u05B4\u05D9\u05EA")).toBe("בראשית")
    })

    it("strips nikkud from תּוֹרָה → תורה (torah — teaching)", () => {
      // tav+dagesh + vav+holam + resh+qamats + he
      expect(normalize("\u05EA\u05BC\u05D5\u05B9\u05E8\u05B8\u05D4")).toBe("תורה")
    })

    it("strips nikkud from שַׁבָּת → שבת (shabbat — Sabbath)", () => {
      // shin+shin_dot+patah + bet+dagesh+qamats + tav
      expect(normalize("\u05E9\u05C1\u05B7\u05D1\u05BC\u05B8\u05EA")).toBe("שבת")
    })

    it("strips nikkud from מִצְוָה → מצוה (mitzvah — commandment)", () => {
      // mem+hiriq + tsade+shva + vav+qamats + he
      expect(normalize("\u05DE\u05B4\u05E6\u05B0\u05D5\u05B8\u05D4")).toBe("מצוה")
    })

    it("strips nikkud from סֵפֶר → ספר (sefer — book)", () => {
      // samekh+tsere + pe+segol + resh
      expect(normalize("\u05E1\u05B5\u05E4\u05B6\u05E8")).toBe("ספר")
    })

    it("strips nikkud from מֶלֶךְ → מלך (melekh — king)", () => {
      // mem+segol + lamed+segol + final_kaf+shva
      expect(normalize("\u05DE\u05B6\u05DC\u05B6\u05DA\u05B0")).toBe("מלך")
    })

    it("strips nikkud from חֲנֻכָּה → חנכה (chanukah — Hanukkah)", () => {
      // het+hataf_patah + nun+qubuts + kaf+dagesh+qamats + he
      expect(normalize("\u05D7\u05B2\u05E0\u05BB\u05DB\u05BC\u05B8\u05D4")).toBe("חנכה")
    })

    // --- already-unpointed text should pass through unchanged ---

    it("leaves unpointed שלום unchanged", () => {
      expect(normalize("שלום")).toBe("שלום")
    })

    it("leaves unpointed ירושלים unchanged (yerushalayim — Jerusalem)", () => {
      expect(normalize("ירושלים")).toBe("ירושלים")
    })

    it("leaves unpointed אמת unchanged (emet — truth)", () => {
      expect(normalize("אמת")).toBe("אמת")
    })
  })
})
