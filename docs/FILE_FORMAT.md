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

A scene can have a manual chapter assignment through `scene.chapterId`:

```json
{
  "id": "scene_...",
  "type": "scene",
  "name": "The broken relay",
  "scene": {
    "chapterId": "chapter_...",
    "chapterInheritanceBlocked": false,
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

Continuum derives chapter membership in two ways.

### Manual membership

When `chapterId` is present and valid:

```text
Chapter → contains → Scene
```

### Inherited membership

When a scene has no manual `chapterId`, Continuum examines explicit relationships between scenes as an undirected scene hierarchy.

An unassigned scene inherits a chapter when its connected scene component contains exactly one distinct manual chapter anchor:

```text
Chapter 1 → contains → Scene 1
Scene 1 → leads to → Scene 2

Therefore:
Chapter 1 → contains via scenes → Scene 2
```

Rules:

- A manual `chapterId` always wins.
- Inheritance can travel through multiple scene-to-scene links.
- If linked scenes are manually anchored in more than one chapter, unassigned scenes in that component are marked ambiguous and are not assigned automatically.
- `chapterInheritanceBlocked: true` keeps the scene intentionally unassigned even if its scene links would otherwise provide a chapter.
- Deleting a manual or inherited chapter arrow clears the manual chapter and sets `chapterInheritanceBlocked: true`.
- Choosing **Use scene hierarchy** in the scene inspector clears the block and allows the derived assignment again.

Derived chapter edges are not duplicated in the `relationships` array. The array stores author-defined connections, while chapter membership is resolved from scene fields and scene-to-scene relationships.

Legacy version-1 files that used a free-text scene chapter label are normalized during import. Continuum creates matching chapter entities and assigns the scenes without discarding the original story material.

## Relationships

Relationships connect any two entities with a human-readable label. Chapter correlation views include:

- manual chapter membership derived from `chapterId`
- inherited chapter membership derived from scene-to-scene relationships
- direct chapter relationships
- scene relationships
- POV, location, and participant references
- connected world entities associated with chapter scenes

## World Library interchange

Bulk Character, Location, Organization, Object, Plot thread, Fact, and World rule interchange uses a separate `continuum-library` JSON or CSV format. See [`LIBRARY_IMPORT.md`](LIBRARY_IMPORT.md).

## Future compatibility

The app must inspect `formatVersion` before import. Future migrations will convert older versions rather than silently discarding unknown data.

When the project format moves to a compressed package, the same `project.json` structure can live inside a ZIP-based `.continuum` file alongside a `media/` folder.
