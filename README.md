# Continuum Story Engine

A local-first visual workspace for creators who design a fictional world and hand structured story cues to a human ghostwriter.

Continuum does **not** generate prose. It organizes chapters, scenes, characters, locations, plot threads, facts, world rules, relationships, reveals, knowledge changes, and continuity cues.

## Current prototype

- World Library tabs for Characters, Locations, Organizations, Objects, Plot threads, Facts, and World rules
- Single-item creation plus duplicate-aware bulk CSV/JSON import and export
- First-class chapters with objectives, opening states, closing states, and chapter-level ghostwriter direction
- Manual and inherited scene membership inside chapters
- Scene-to-scene relationships can carry unassigned scenes into an unambiguous chapter hierarchy
- Chapter workspace that correlates scenes, world entities, custom relationships, structured effects, and the writing brief
- Chapter-scoped Storyboard and ghostwriter Brief views
- Structured Scene Effects for plot movement, fact movement, world-rule interaction, and character knowledge changes
- Reusable Plot thread, Fact, and World rule nodes with specialized fields
- Derived Story Effects in the Brief and exported HTML storyboard
- Typed, color-coded semantic relationships in the World graph
- Visual world graph with smooth relationships and distinct manual/inherited Chapter → Scene edges
- Automatic World arrangement and drag-to-delete
- Direct editing inside Storyboard, Brief, Chapters, and Library views
- Images attached to any node and embedded inside the local project file
- Labeled external links attached to any node
- IndexedDB autosave on the local machine
- Portable `.continuum` project import/export
- Self-contained chapter-organized HTML storyboard export
- Safe legacy migration for free-text chapter labels and unambiguous relationship verbs
- Sample project included on first launch
- No accounts, server, cloud database, or AI dependency

## Run locally

Requires Node.js 22 or newer.

```bash
git clone https://github.com/ashutoshcjha/continuum-story-engine.git
cd continuum-story-engine
git switch agent/scene-effects-engine
npm install
npm run dev
```

Open the local URL shown by Vite, normally `http://localhost:5173`.

## Production build

```bash
npm run build
npm run preview
```

## Data ownership

The browser keeps an automatic recovery copy in IndexedDB. The permanent portable source is the `.continuum` file exported with **Save file**. Keep that file in any folder or sync provider you choose.

Uploaded images are optimized locally and encoded directly into the `.continuum` file so the project remains portable and does not depend on the original image path. External links remain ordinary `http` or `https` references.

See:

- [`docs/FILE_FORMAT.md`](docs/FILE_FORMAT.md) for the editable project contract
- [`docs/STORY_LOGIC.md`](docs/STORY_LOGIC.md) for typed Plot threads, Facts, World rules, and Scene Effects
- [`docs/LIBRARY_IMPORT.md`](docs/LIBRARY_IMPORT.md) for bulk CSV/JSON interchange
