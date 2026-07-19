# Continuum story logic

Continuum separates **what exists** from **what happens to it**.

- Plot threads, facts, and world rules are reusable nodes.
- Scenes, characters, chapters, and other entities connect to those nodes through typed relationships.
- Properties describe the intrinsic state of a node or relationship.

This keeps one source of truth while allowing Storyboard, Chapters, Brief, World, exports, and future continuity checks to derive different views.

## Plot threads

A plot thread node stores:

```json
{
  "type": "plot-thread",
  "name": "Reactor sabotage",
  "plotThread": {
    "centralQuestion": "Who altered the containment system, and why?",
    "stakes": "The colony may have been deliberately endangered.",
    "status": "active",
    "plannedPayoff": "Maya proves the disaster was authorized internally."
  }
}
```

A scene affects the thread through a `scene-thread` relationship.

Supported actions:

- `introduce`
- `advance`
- `complicate`
- `pause`
- `payoff`
- `resolve`

Example:

```json
{
  "id": "rel_...",
  "sourceId": "scene_reactor_inspection",
  "targetId": "thread_sabotage",
  "kind": "scene-thread",
  "action": "advance",
  "label": "advances",
  "sceneId": "scene_reactor_inspection",
  "note": "Eliminates the external-attack explanation.",
  "importance": "major"
}
```

## Facts

A fact is a proposition that can be true, false, uncertain, disputed, secret, learned, concealed, contradicted, or invalidated.

```json
{
  "type": "fact",
  "name": "Damage originated internally",
  "fact": {
    "proposition": "The containment damage originated inside the reactor.",
    "truthStatus": "true",
    "sensitivity": "secret",
    "validFromSceneId": "scene_reactor_inspection"
  }
}
```

Scene-to-fact actions:

- `establish`
- `reveal-reader`
- `conceal-reader`
- `contradict`
- `invalidate`

Character knowledge is a separate `character-fact` relationship anchored to the scene where the knowledge state changes.

Knowledge actions:

- `know`
- `learn`
- `suspect`
- `believe`
- `doubt`
- `deny`
- `forget`

```json
{
  "sourceId": "character_maya",
  "targetId": "fact_internal_damage",
  "kind": "character-fact",
  "action": "learn",
  "label": "learns",
  "sceneId": "scene_reactor_inspection",
  "confidence": "certain",
  "note": "She confirms the blast pattern began inside the wall."
}
```

## World rules

A world-rule node stores a reusable constraint.

```json
{
  "type": "world-rule",
  "name": "Post-breach entry protocol",
  "worldRule": {
    "statement": "No human may enter a reactor chamber after containment is breached.",
    "category": "legal",
    "rigidity": "soft",
    "consequence": "The entrant faces radiation exposure and criminal liability.",
    "exceptionNotes": "Remote machines may enter."
  }
}
```

Scene-to-rule actions:

- `demonstrate`
- `test`
- `violate`
- `establish-exception`
- `enforce`

A relationship can also record whether the consequence occurs in the same scene.

## Custom relationships

Relationships that do not match a supported semantic type remain:

```json
{
  "kind": "custom",
  "label": "symbolically mirrors"
}
```

Custom relationships remain important for author-defined meaning. Algorithms must not guess their semantics.

## Safe migration

Older `.continuum` files may contain only a human-readable relationship label. During normalization, Continuum upgrades an edge only when both its endpoints and verb are unambiguous.

Examples:

- Scene → Plot thread, label `advances` becomes `scene-thread / advance`.
- Scene → Fact, label `reveals` becomes `scene-fact / reveal-reader`.
- Scene → World rule, label `violates` becomes `scene-rule / violate`.
- Character → Fact, label `learns` becomes `character-fact / learn`.

All other legacy relationships remain `custom`.

## Scene Effects editor

Every scene can edit four lanes:

1. Plot movement
2. Fact movement
3. World-rule interaction
4. Knowledge change

The editor can connect an existing node or create a new Plot thread, Fact, or World rule without leaving the scene.

The same relationships drive:

- colored World graph edges
- chapter-level effect rollups
- generated Brief sections
- HTML storyboard export
- relationship inspector controls
- future continuity validation

## Product boundary

Story logic describes structure and state. It does not generate manuscript prose. The human author or ghostwriter remains responsible for the written chapter.
