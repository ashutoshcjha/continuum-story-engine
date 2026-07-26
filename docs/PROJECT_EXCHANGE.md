# Complete project export, AI interchange, append, and rollback

Continuum has four distinct project-exchange actions.

## Save project

**Save file** downloads the editable source of truth:

```text
story-name.continuum
```

This is a version-1 Continuum JSON project containing every entity, chapter, scene, relationship, embedded image, link, and structured field.

## Export human

**Export human** downloads one self-contained HTML dossier:

```text
story-name-complete-human-export.html
```

It is intended for ghostwriters, editors, and collaborators who should be able to read the complete project without running Continuum.

The export includes:

- project title, logline, premise, and provenance metadata
- all chapters in order
- complete chapter manuscript fields when present
- complete chapter notes and original source briefs
- all scenes in order
- complete scene manuscript fields when present
- complete scene notes and original source blocks
- POV, location, participants, purpose, conflict, turn, outcome, emotional movement, reveals, and concealed information
- environment and travel constraints
- structured Story Effects and custom relationships
- continuity warnings and concept load
- images and external references
- the complete world library
- every project relationship

The file can be opened in a browser and printed or saved as PDF.

## Export AI

**Export AI** downloads:

```text
story-name-ai-context.json
```

The package contains the complete text and structured project context, but omits embedded base64 image bytes so that an AI context is not overwhelmed by binary data. Image IDs and names remain in the package, and append import preserves the original embedded images.

The AI package contains:

- authoring boundaries
- existing stable IDs
- the current project
- the complete scene structure
- entity and relationship vocabularies
- Story Effect actions
- Power, Technology, Evidence, and Travel relationship actions
- the preferred append contract
- a directly importable example

An AI should return exactly one JSON object with no Markdown fence or surrounding explanation.

### Preferred AI output: incremental append

Save the returned JSON as either `.continuum` or `.json`:

```json
{
  "format": "continuum-append",
  "formatVersion": 1,
  "baseProjectId": "project_existing-id",
  "changeSetId": "changeset_unique-id",
  "label": "Add Chapter 20 plot updates",
  "generatedAt": "2026-07-26T12:00:00.000Z",
  "generatedBy": "external-ai",
  "notes": "Assumptions and unresolved references",
  "entities": [],
  "relationships": []
}
```

Rules:

1. Reuse an existing ID when changing an existing record.
2. Use a unique stable ID for every new entity and relationship.
3. Include complete entity objects for every added or updated entity.
4. Include only added or updated records, not the entire project.
5. Do not delete records in version 1.
6. Mark speculative material with `ai-proposed` and `unreviewed` tags.
7. Preserve uncertainty in notes rather than silently treating it as canonical.

### Complete replacement output

An AI may return a normal complete version-1 `.continuum` project when the user explicitly wants a replacement project. **Open** replaces the current project. **Append update** treats the same file as an additive change set.

## Append update

**Append update** accepts:

- a complete version-1 `.continuum` project
- a version-1 `continuum-append` package
- the JSON equivalent of either format

Before changing the project, Continuum presents a review showing:

- new entities
- matching entity updates
- new relationships
- matching relationship updates
- skipped records
- warnings

Entity matching order:

1. exact entity ID
2. same entity type and case-insensitive name

Relationship matching order:

1. exact relationship ID
2. same source, target, relationship kind/domain, action, label, and scene anchor

References inside scenes, facts, locations, technologies, and organizations are remapped when an incoming ID matches an existing entity by name.

Existing embedded images are preserved unless the append package explicitly includes valid embedded replacement images.

The current project's title, ID, creation date, and project-level metadata are not replaced during append.

## Undo append

Immediately before append, Continuum stores one exact project snapshot in local IndexedDB.

**Undo append** restores that exact snapshot and then removes the rollback record.

Only one rollback snapshot is kept. A later append replaces the previous snapshot.

Important limitation:

```text
Undo restores the complete pre-append project.
```

Therefore, manual edits made after the append are also reverted. Use Undo before continuing substantial editing when an append is not acceptable.

The rollback snapshot remains available across a browser reload, but it is cleared when it belongs to a different project ID.
