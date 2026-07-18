# Continuum Story Engine

A local-first visual workspace for creators who design a fictional world and hand structured story cues to a human ghostwriter.

Continuum does **not** generate prose. It organizes characters, locations, facts, rules, plot threads, scenes, relationships, reveals, and continuity cues.

## Current prototype

- Visual world graph with connectable story objects
- Structured scene storyboard
- Ghostwriter brief preview
- IndexedDB autosave on the local machine
- Portable `.continuum` project import/export
- Self-contained HTML storyboard export
- Sample project included on first launch
- No accounts, server, cloud database, or AI dependency

## Run locally

Requires Node.js 22 or newer.

```bash
git clone https://github.com/ashutoshcjha/continuum-story-engine.git
cd continuum-story-engine
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

See [`docs/FILE_FORMAT.md`](docs/FILE_FORMAT.md) for the first file-format contract.
