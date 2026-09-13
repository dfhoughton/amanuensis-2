# Change Log

## 2.1.0 _2026-09-13_

### Major features

- **grapheme equivalence classes** — configure custom character and grapheme equivalence rules per language (e.g., normalizing accented letters like `é, è, ê` → `e`, `ß` → `ss`, or stripping Hebrew vowel points)
  - equivalence rules normalize words before similarity distance calculation, ensuring accents, diacritics, or variant spellings do not interfere with similarity searches
  - dedicated modal editor in the Configuration tab to define and validate equivalence rules per language
  - visual indicator (dot badge) in the language table to quickly identify languages with configured equivalence classes

### Configuration changes

- **configurable daily new phrases** — added a "New Phrases" number input under Quiz configuration to adjust how many new phrases are introduced each day (defaults to 5)

### Database and storage

- **spaced repetition trials included in database import** — importing a database backup now preserves quiz trial history and learning progress
- **citation tag preservation** — citation tags are now properly remapped and preserved on import alongside note-level tags
- **smart tag merging on import** — tags matching existing names are merged rather than duplicated with disambiguators, and their associated languages are combined
- **improved database import UX** — streamlined file selection and drag-and-drop, added an in-progress loading indicator, and prevented interaction while importing
- **empty quiz signature cleanup** — importing data after viewing the quiz tab on an empty database cleans up empty quiz signatures so daily quizzes generate properly
- **reliable database reset** — database reset now properly clears all tables, re-initializes defaults, and clears compiled regex caches

### Browser compatibility and navigation

- **improved tab targeting** — queries now prioritize the active tab in the last focused window, improving behavior across multiple windows and non-Chrome Chromium/Firefox environments
- **cleaner citation capture** — streamlined tab title and URL resolution when receiving text selections from content scripts
- **citation title visibility** — fixed styling to ensure "(no title)" labels on citations are never clipped

### Technical

- added Jest testing framework and unit test suite for string normalization and language equivalence rules
- created reusable `HelpLink` component across tabs (Quiz, Tags, Configuration) for direct links to documentation
- transitioned database import to use `importDB` with isolated temporary database handling and cleanup

### Documentation

- moved documentation figure labels into figure captions to prevent labels from overlaying screenshots

## 2.0.0 _2026-06-06_

### Major features

- **spaced repetition quiz** — a complete flashcard-based spaced-repetition system
  - two quiz modes: lemma → gloss and gloss → lemma
  - cards are presented as a challenge/answer pair; click to flip
  - six self-evaluation outcomes (retry in this quiz, tomorrow, bad, okay, good, graduate)
  - auto-graduation after a configurable streak of "good" ratings
  - progress bar and outcome tallies shown during quiz
  - new and review cards mixed; skipped days accumulate due cards
- **elaboration** field added to notes for extended information (etymologies, analogies, etc.) that doesn't belong on a flashcard
- **similarity search tool on citations** — a magnifying glass icon on citations lets you search for similar notes directly from within the citation text
- **clickable words in citations** — cited words that match other notes appear as links; clicking them navigates to the corresponding note
- **navigation history** — ctrl-b takes you back to the previously visited note

### Renamed concepts

- "lemma note" renamed to **"gloss"** everywhere to better reflect its purpose as a short definition used on quiz cards

### Configuration changes

- configuration tab reorganized into **Dictionary**, **Quiz**, and **Database** subsections
- **auto-graduate threshold** — configurable number of consecutive "good" ratings before suggesting graduation
- **memory challenge** slider — tune quiz scheduling difficulty up or down
- string distance metric selector **moved from configuration to the similarity search form** itself

### Search and dictionary improvements

- similarity search and same-page search update automatically when the current note changes
- similarity metric switcher added directly to the similarity search form
- search results refresh after deleting a note
- changing max similar phrases immediately adjusts existing search results
- language used as a factor in search

### Notes and citations

- improved duplicate detection: lemma treated like citation forms when checking for duplicates
- when merging two saved notes, the younger is merged into the older
- linking two phrases now requires both to have been saved first
- toast notifications are now dismissable

### Technical

- upgraded React to 19
- added TypeScript configuration and fixed all type errors
- added ESLint integration and installed new React compiler
- upgraded all dependencies
- more resilient foreground script and communication with content scripts

### Documentation

- comprehensive documentation of the spaced repetition quiz
- added Caveats section
- expanded Installation section (Chrome Web Store, install from source, non-Chrome versions)
- added Oofla the Gloofoo section to Dedication
