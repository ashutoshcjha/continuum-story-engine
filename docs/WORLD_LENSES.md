# World lenses and progressive disclosure

Continuum does not try to draw the entire project as one graph. The complete project remains in the `.continuum` file, while the **World** workspace generates a focused projection for the current question.

## Lenses

### Story Map

Shows narrative structure:

- chapters and ordered scenes
- POV and participating characters
- scene locations
- active Plot threads
- Facts, World rules, systems, organizations, and important Objects directly used by the selected scope

At Book scope, chapters are containers rather than ordinary nodes with a separate arrow to every scene. Supporting entities are collapsed into expandable groups.

### Geography

Shows:

- regions
- domes, districts, facilities, terrain, launch sites, and orbital locations
- parent-location containment
- selected routes and scene travel segments

Regions remain collapsed by default. A large atlas can therefore live in the project without dominating the Story Map.

### Power

Shows:

- organizations and factions
- controlled resources and territory
- ownership, operation, supply, regulation, surveillance, dependence, opposition, alliance, and infiltration
- locations, systems, people, and rules affected by those relationships

Organization profiles can record public identity, hidden identity, controlled resources, territory, surveillance, military capability, data access, and leverage.

### Knowledge

Shows:

- canonical Facts, claims, hypotheses, evidence, and rumors
- supporting and contradicting evidence
- sources and source reliability
- reader-facing revelations
- character knowledge and belief changes
- a selectable chapter cutoff

The cutoff prevents later revelations from appearing in an earlier chapter context.

### Technology

Shows:

- tracked Technology/System objects
- operators
- required inputs and dependencies
- environments where the system works
- outputs, limitations, and failure modes
- connected scenes, locations, organizations, Facts, and World rules

## Scope

Every lens supports a context scope:

- **Book overview** — structural summary with aggressive collapsing
- **Current chapter** — scenes and directly relevant entities
- **Selected scene** — one scene and its immediate context
- **Selected entity** — one entity and the scenes and relationships that explain it

## Presentation controls

Each entity can be configured as:

### Visibility

- `auto` — Continuum decides from context and relevance
- `always` — show whenever the selected lens supports the entity
- `hidden` — omit from World projections until the setting changes

### Importance

- `core` — survives the smallest node budgets
- `supporting` — shown when directly relevant
- `reference` — normally hidden from Story Map unless selected, pinned, used by a scene, or explicitly enabled

### Pinning

Pinned entities stay visible in relevant lenses even when automatic relevance would normally collapse them.

## Node budget

The visible-node budget is a presentation limit, not a data limit:

- Focused: 28
- Balanced: 42
- Expanded: 64

When the budget is exceeded, low-priority entities become expandable cluster nodes. Nothing is removed from the project.

## Derived and editable edges

Some edges are projections rather than saved relationships:

- chapter containers
- scene POV, location, and cast links
- bundled book-level Plot-thread beats
- parent-location containment derived from profiles
- scene travel segments
- organization resource chips

Derived edges cannot be deleted because they are generated from structured fields. Author-created relationships remain editable and deletable.

## Stability and limitations

The lenses intentionally reduce the number of simultaneous nodes and edges. They do not mathematically guarantee that every possible edge will avoid crossing another edge. The primary readability strategy is filtering, grouping, containers, and typed layouts before geometric arrangement.

Manual canvas positions remain part of the project for ordinary entity nodes. Generated chapter containers, clusters, and lens-specific positions are view state and can be recalculated safely.
