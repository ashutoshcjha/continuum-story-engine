# Continuum Story Engine

A local-first visual workspace for creators who design a fictional world and hand structured story cues to a human ghostwriter.

Continuum does **not** generate prose. It organizes characters, locations, facts, rules, plot threads, scenes, relationships, reveals, and continuity cues.

## Current prototype

- Visual world graph with connectable story objects
- Images attached to any node and embedded inside the local project file
- Labeled external links attached to any node
- Structured scene storyboard
- Ghostwriter brief preview
- IndexedDB autosave on the local machine
- Portable `.continuum` project import/export
- Self-contained HTML storyboard export with scene images and reference links
- Sample project included on first launch
- No accounts, server, cloud database, or AI dependency

## Run locally

Requires Node.js 22 or newer.

```bash
git clone https://github.com/ashutoshcjha/continuum-story-engine.git
cd continuum-story-engine
git switch agent/prototype-v0-1
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

Uploaded images are encoded directly into the `.continuum` file so the project remains portable and does not depend on the original image path. This is convenient for the prototype, although large images will increase project-file size. External links remain ordinary `http` or `https` references.

See [`docs/FILE_FORMAT.md`](docs/FILE_FORMAT.md) for the first file-format contract.
