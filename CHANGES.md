# Change Log

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
