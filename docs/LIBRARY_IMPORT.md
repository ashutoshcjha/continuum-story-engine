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
  "exportedAt": "2026-07-19T00:00:00.000Z",
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
    },
    {
      "id": "thread_sabotage",
      "type": "plot-thread",
      "name": "Reactor sabotage",
      "plotThread": {
        "centralQuestion": "Who altered containment and why?",
        "stakes": "The colony may have been deliberately endangered.",
        "status": "active",
        "plannedPayoff": "Maya proves the disaster was authorized internally."
      }
    },
    {
      "id": "fact_internal_damage",
      "type": "fact",
      "name": "Damage originated internally",
      "fact": {
        "proposition": "The blast began inside containment.",
        "truthStatus": "true",
        "sensitivity": "secret"
      }
    },
    {
      "id": "rule_post_breach",
      "type": "world-rule",
      "name": "Post-breach entry protocol",
      "worldRule": {
        "statement": "No human may enter after containment is breached.",
        "category": "legal",
        "rigidity": "soft",
        "consequence": "Radiation exposure and criminal liability.",
        "exceptionNotes": "Remote machines may enter."
      }
    }
  ]
}
```

Structured Plot thread, Fact, and World rule properties are preserved during JSON and CSV round trips.

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
      "summary": "Who altered the containment system, and why?",
      "plotThread": {
        "centralQuestion": "Who altered containment and why?",
        "status": "active"
      }
    }
  ],
  "facts": [
    {
      "name": "Damage originated internally",
      "fact": {
        "proposition": "The blast began inside containment.",
        "truthStatus": "true",
        "sensitivity": "secret"
      }
    }
  ],
  "worldRules": [
    {
      "name": "Post-breach entry protocol",
      "worldRule": {
        "statement": "No human may enter after containment is breached.",
        "category": "legal",
        "rigidity": "soft"
      }
    }
  ]
}
```

Recognized aliases include `people`, `places`, `factions`, `artifacts`, `threads`, `propositions`, `rules`, and their singular forms.

## CSV format

Required column:

```text
name
```

Generic columns:

```text
id,type,name,summary,notes,tags,links
```

Example:

```csv
id,type,name,summary,notes,tags,links
character_maya,character,Maya Chen,Systems engineer sent to audit the colony failure.,Driven by accuracy.,protagonist|engineer,Visual reference=https://example.com/maya
location_reactor,location,Olympus Reactor,Restricted power complex beneath the colony.,,critical,Map=https://example.com/reactor-map
```

### Plot-thread columns

```text
centralQuestion,stakes,status,plannedPayoff
```

Allowed status values: `planned`, `active`, `dormant`, `resolved`.

### Fact columns

```text
proposition,truthStatus,sensitivity,validFromSceneId,validUntilSceneId
```

Allowed truth states: `true`, `false`, `uncertain`, `disputed`.

Allowed sensitivities: `normal`, `secret`, `author-only`.

Scene validity IDs are optional. The target scenes must exist in the final `.continuum` project for those references to be meaningful.

### World-rule columns

```text
statement,category,rigidity,consequence,exceptionNotes
```

Allowed categories: `physical`, `technological`, `magical`, `legal`, `cultural`, `religious`, `institutional`, `social`.

Allowed rigidity values: `hard`, `soft`.

The Library downloads a type-specific CSV template containing the relevant structured columns.

Rules:

- Separate tags with `|` or `;`.
- Separate multiple links with `;`.
- Write links as `Label=https://example.com`.
- Quote CSV cells containing commas, quotation marks, or line breaks.
- When importing from a type tab, a blank `type` value defaults to the selected tab.
- Unknown structured enum values are normalized to safe defaults rather than trusted blindly.

## Duplicate handling

The import preview matches records in this order:

1. Exact `id`
2. Same entity `type` and case-insensitive `name`

The review screen lets the user decide whether matches should update existing entities or be skipped.

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
- Plot-thread logic
- Fact logic
- World-rule logic

Invalid rows and duplicate type/name rows inside the same import file are shown before import and skipped.

## Guidance for external AI sessions

An AI preparing a Library import should:

1. Use only facts explicitly present in the supplied notes.
2. Avoid inventing names or details.
3. Use one stable record per real story entity.
4. Put uncertain information in `notes`, or use a Fact with `truthStatus: "uncertain"` or `"disputed"`.
5. Return valid JSON using the grouped or `entities` form above.
6. Exclude Chapters and Scenes unless the session is producing a full `.continuum` project under a separate schema.
7. Avoid generating Scene Effects in a Library package; semantic relationships belong in a complete `.continuum` project.
