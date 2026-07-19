# Continuum Story Engine

A local-first visual workspace for creators who design a fictional world and hand structured story cues to a human ghostwriter.

Continuum does **not** generate prose. It organizes chapters, scenes, characters, locations, plot threads, facts, world rules, relationships, reveals, knowledge changes, technology, environmental constraints, travel, and continuity cues.

## Current prototype

- World Library tabs for Characters, Locations, Organizations, Objects, Plot threads, Facts, and World rules
- Single-item creation plus duplicate-aware bulk CSV/JSON import and export
- First-class chapters with objectives, opening states, closing states, and chapter-level ghostwriter direction
- Manual and inherited scene membership inside chapters
- Scene-to-scene relationships can carry unassigned scenes into an unambiguous chapter hierarchy
- Chapter-scoped Storyboard and ghostwriter Brief views
- Structured Scene Effects for plot movement, fact movement, world-rule interaction, and character knowledge changes
- Reusable Plot thread, Fact, and World rule nodes with specialized fields
- Derived Story Effects and science-fiction continuity summaries in the Brief and exported HTML storyboard
- Five focused World lenses: Story Map, Geography, Power, Knowledge, and Technology
- Book, Chapter, Scene, and Selected-entity scopes with node budgets and progressive disclosure
- Chapter containers instead of a global mesh of Chapter → Scene arrows
- Automatic, Always show, Hidden, Core, Supporting, Reference, and Pinned presentation controls
- Collapsed atlas/reference data that expands only when requested or narratively relevant
- Structured scene environment fields for atmosphere, gravity, radiation, suits, airlocks, communications, visibility, weather, and Sol time
- Travel segments with route, transport mode, duration, access, exposure, and complications
- Deterministic environmental and travel continuity checks
- Technology/System ledger for operation, dependencies, limits, failure modes, and research notes
- Fact types for canonical truth, claims, hypotheses, evidence, and rumors with confidence and source reliability
- Organization power profiles for controlled resources, territory, surveillance, military capability, and data access
- Robot/AI profiles for self-awareness, autonomy, network access, chassis, damage, constraints, and aliases
- Chapter systems dashboard for concept load, travel sequence, evidence, power, technology, and artificial identities
- Smooth semantic relationships, drag-to-delete, and direct editing throughout the application
- Images and external links attached to any entity
- IndexedDB autosave on the local machine
- Portable `.continuum` project import/export
- Safe legacy migration for free-text chapter labels and unambiguous relationship verbs
- No accounts, server, cloud database, or AI dependency

## Run locally

Requires Node.js 22 or newer.

```bash
git clone https://github.com/ashutoshcjha/continuum-story-engine.git
cd continuum-story-engine
git switch agent/world-lenses-scifi-milestones
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

## Documentation

- [`docs/FILE_FORMAT.md`](docs/FILE_FORMAT.md) — editable project contract
- [`docs/STORY_LOGIC.md`](docs/STORY_LOGIC.md) — typed Plot threads, Facts, World rules, and Scene Effects
- [`docs/WORLD_LENSES.md`](docs/WORLD_LENSES.md) — focused projections and progressive disclosure
- [`docs/SCIFI_CONTINUITY.md`](docs/SCIFI_CONTINUITY.md) — environment, travel, technology, evidence, power, and artificial identities
- [`docs/LIBRARY_IMPORT.md`](docs/LIBRARY_IMPORT.md) — bulk CSV/JSON interchange
