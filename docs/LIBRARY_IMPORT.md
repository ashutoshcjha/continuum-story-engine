# World Library bulk import and export

The **Library** workspace manages reusable world entities separately from Chapters and Scenes.

Supported library types:

- `character`
- `location`
- `organization`
- `object`
- `plot-thread`
- `fact`
- `world-rule`

Chapters and Scenes are intentionally excluded from Library bulk import because they carry structural ordering, references, and continuity state.

## JSON package

Continuum exports this portable format:

```json
{
  "format": "continuum-library",
  "formatVersion": 1,
  "exportedAt": "2026-07-18T00:00:00.000Z",
  "entities": [
    {
      "id": "character_maya",
      "type": "character",
      "name": "Maya Chen",
      "summary": "Systems engineer sent to audit the colony failure.",
      "notes": "Driven by accuracy and distrustful of political pressure.",
      "tags": ["protagonist", "engineer"],
      "links": [
        {
          "label": "Visual reference",
          "url": "https://example.com/maya"
        }
      ]
    }
  ]
}
```

The importer also accepts:

### A plain array

```json
[
  {
    "type": "location",
    "name": "Olympus Reactor",
    "summary": "Restricted power complex beneath the colony."
  }
]
```

### Grouped entity lists

This form is convenient for external AI sessions and hand-authored files:

```json
{
  "characters": [
    {
      "name": "Maya Chen",
      "summary": "Systems engineer and reluctant investigator."
    }
  ],
  "locations": [
    {
      "name": "Olympus Reactor",
      "summary": "Restricted power complex beneath the colony."
    }
  ],
  "plotThreads": [
    {
      "name": "Reactor sabotage",
      "summary": "Who altered the containment system, and why?"
    }
  ]
}
```

Recognized aliases include `people`, `places`, `factions`, `artifacts`, `threads`, `rules`, and their singular forms.

## CSV format

Required column:

```text
name
```

Recommended columns:

```text
id,type,name,summary,notes,tags,links
```

Example:

```csv
id,type,name,summary,notes,tags,links
character_maya,character,Maya Chen,Systems engineer sent to audit the colony failure.,Driven by accuracy.,protagonist|engineer,Visual reference=https://example.com/maya
location_reactor,location,Olympus Reactor,Restricted power complex beneath the colony.,,critical,Map=https://example.com/reactor-map
```

Rules:

- Separate tags with `|` or `;`.
- Separate multiple links with `;`.
- Write links as `Label=https://example.com`.
- Quote CSV cells containing commas, quotation marks, or line breaks.
- When importing from a type tab, a blank `type` value defaults to the selected tab.

## Duplicate handling

The import preview matches records in this order:

1. Exact `id`
2. Same entity `type` and case-insensitive `name`

The review screen lets the user decide whether matches should update existing records or be skipped.

Updates preserve:

- entity ID
- canvas position
- images

Imported values can update:

- name
- summary
- notes
- tags
- external links

Invalid rows and duplicate type/name rows inside the same import file are shown before import and skipped.

## Guidance for external AI sessions

An AI preparing a Library import should:

1. Use only facts explicitly present in the supplied notes.
2. Avoid inventing names or details.
3. Use one stable record per real story entity.
4. Put uncertain information in `notes` rather than presenting it as canonical fact.
5. Return valid JSON using the grouped or `entities` form above.
6. Exclude Chapters and Scenes unless the session is producing a full `.continuum` project under a separate schema.
