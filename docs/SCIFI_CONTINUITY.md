# Science-fiction continuity, evidence, power, and artificial identities

Continuum stores these fields as optional structured data inside the local `.continuum` file. They support organization and validation; they do not generate manuscript prose.

## Scene environment

A scene can record:

- interior, exterior, or mixed setting
- breathable, thin, non-breathable, or vacuum atmosphere
- Earth, Mars, microgravity, artificial, or variable gravity
- normal, elevated, high, or extreme radiation
- temperature
- suit requirement
- airlock or decontamination requirement
- communications state
- visibility
- local Sol time
- weather
- environmental notes

Continuum can warn when, for example:

- an exterior non-breathable scene has no suit requirement
- high radiation is recorded without shielding or protective equipment
- an airlock transition appears necessary but is not explained

Warnings are deterministic checks against the structured fields. They are not claims that the science or story is wrong.

## Travel segments

Each scene can describe movement from the previous scene:

- origin and destination
- travel mode
- named route
- duration
- authorization or access
- environmental exposure
- complications

Checks include:

- destination versus scene-location mismatch
- origin versus previous-scene-location mismatch
- unexplained location changes
- travel without an estimated duration

The Geography lens can render recorded travel between locations.

## Technology / System ledger

An Object can be promoted to a Technology/System and receive:

- domain
- purpose
- operating principle
- inputs
- outputs
- dependencies
- operator organization
- environmental requirements
- limitations
- failure modes
- research or plausibility notes

Technology domains include transport, energy, life support, computing, communications, surveillance, terraforming, biotechnology, weapons, and research.

Semantic technology relationships include:

- requires
- powers
- feeds data to
- operated by
- protected by
- fails under
- interferes with
- communicates with

## Evidence and hypotheses

Facts can be classified as:

- canonical
- claim
- hypothesis
- evidence
- rumor

Additional fields include:

- confidence
- source reliability
- primary source
- truth status
- sensitivity
- validity range

Evidence relationships can support, contradict, corroborate, weaken, or identify the source of another Fact or claim. The Knowledge lens combines those edges with Scene Effects and character knowledge changes.

## Power and resources

Organizations can record:

- organization type
- public identity
- hidden identity or agenda
- controlled resources
- territory
- surveillance capability
- military capability
- data access
- leverage notes

Power relationships include:

- controls
- operates
- owns
- supplies
- regulates
- surveils
- depends on
- opposes
- allied with
- infiltrates

The Power lens separates organizations from the places, systems, resources, and people affected by their control.

## Robots, automata, and AI

Character identity profiles can record:

- identity type: human, robot, automaton, distributed AI, cyborg, or unknown
- manufacturer and model
- age
- body or chassis
- damage and modifications
- self-awareness
- autonomy
- network access
- legal status
- allegiance
- programming constraints
- aliases

This keeps identity conflicts and naming issues explicit rather than burying them in freeform notes.

## Concept load

The chapter dashboard estimates how much unfamiliar structured material first enters the story in a chapter.

The score weights:

- new Characters most heavily
- then Locations, Organizations, Technologies, and Plot threads
- then Facts, World rules, and Objects

The result is Low, Moderate, High, or Extreme. It is an organizational signal, not a prose-quality judgment.

## Chapter systems dashboard

Each chapter receives a derived dashboard covering:

- environment and travel warnings
- travel sequence
- concept load
- claims and evidence
- organizations and resource control
- technologies and artificial identities
- counts of Plot-thread, Fact, Rule, and Knowledge effects

The dashboard is derived from the same entities, scenes, and relationships used by Storyboard, Brief, World, and exports.

## Data compatibility

All new fields are optional. Older version-1 projects normalize to conservative defaults when opened. The saved file remains version 1 while the prototype evolves additively.

The HTML storyboard export includes Story Effects plus structured environment, travel, and warning summaries when those fields are present.
