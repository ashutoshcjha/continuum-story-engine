# Continuum file format — version 1

A `.continuum` file is UTF-8 JSON in the first prototype. The extension distinguishes an editable Continuum project from a generic JSON export.

Top-level fields:

```json
{
  "format": "continuum",
  "formatVersion": 1,
  "id": "project_...",
  "title": "Story title",
  "logline": "One-sentence dramatic frame",
  "premise": "Longer project framing",
  "createdAt": "ISO-8601 timestamp",
  "updatedAt": "ISO-8601 timestamp",
  "entities": [],
  "relationships": []
}
```

Each entity has a stable ID, type, name, summary, notes, tags, and canvas position. Scenes add structured scene fields such as order, chapter, POV, location, purpose, conflict, turning point, outcome, reveal, concealed information, and ghostwriter direction.

Relationships connect any two entities with a human-readable label.

## Future compatibility

The app must inspect `formatVersion` before import. Future migrations will convert older versions rather than silently discarding unknown data.

When media attachments are introduced, the same `project.json` structure can live inside a ZIP-based `.continuum` package alongside a `media/` folder.
