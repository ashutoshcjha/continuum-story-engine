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

Each entity has a stable ID, type, name, summary, notes, tags, images, links, and canvas position.

## Chapters

A chapter is a first-class entity:

```json
{
  "id": "chapter_...",
  "type": "chapter",
  "name": "Chapter 4 — The Crossing",
  "summary": "The expedition leaves the protected settlement.",
  "chapter": {
    "order": 4,
    "objective": "Force Maya to choose between safety and evidence.",
    "openingState": "The team believes the route is secure.",
    "closingState": "The expedition is isolated and Elias has the only working transmitter.",
    "ghostwriterNotes": "Preserve uncertainty about who damaged the relay."
  }
}
```

## Scenes and chapter membership

A scene belongs to a chapter through `scene.chapterId` and has an order within that chapter:

```json
{
  "id": "scene_...",
  "type": "scene",
  "name": "The broken relay",
  "scene": {
    "chapterId": "chapter_...",
    "order": 2,
    "povCharacterId": "character_maya",
    "locationId": "location_ridge",
    "participantIds": ["character_maya", "character_elias"],
    "purpose": "Remove the expedition's safe route home.",
    "conflict": "Maya wants to turn back; Elias insists they continue.",
    "turningPoint": "The relay damage is revealed to be deliberate.",
    "outcome": "The team continues without outside contact.",
    "emotionalStart": "Unease",
    "emotionalEnd": "Isolation",
    "reveal": "The failure was caused from inside the team.",
    "conceal": "Who damaged the relay.",
    "ghostwriterNotes": "End on the missing tool rather than an accusation."
  }
}
```

Continuum derives a protected visual relationship:

```text
Chapter → contains → Scene
```

That edge is not duplicated in the `relationships` array. `chapterId` is the source of truth for chapter membership, while `relationships` stores author-defined connections among story objects.

Legacy version-1 files that used a free-text scene chapter label are normalized during import. Continuum creates matching chapter entities and assigns the scenes without discarding the original story material.

## Relationships

Relationships connect any two entities with a human-readable label. Chapter correlation views include:

- chapter membership derived from `chapterId`
- direct chapter relationships
- scene relationships
- POV, location, and participant references
- one-hop world entities connected to chapter scenes

## Future compatibility

The app must inspect `formatVersion` before import. Future migrations will convert older versions rather than silently discarding unknown data.

When the project format moves to a compressed package, the same `project.json` structure can live inside a ZIP-based `.continuum` file alongside a `media/` folder.
