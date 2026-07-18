import type { Edge, Node, XYPosition } from '@xyflow/react';

export type EntityType =
  | 'character'
  | 'location'
  | 'organization'
  | 'object'
  | 'plot-thread'
  | 'fact'
  | 'world-rule'
  | 'scene';

export interface StoryEntity {
  id: string;
  type: EntityType;
  name: string;
  summary: string;
  notes: string;
  tags: string[];
  position: XYPosition;
  scene?: SceneDetails;
}

export interface SceneDetails {
  order: number;
  chapter: string;
  povCharacterId?: string;
  locationId?: string;
  participantIds: string[];
  purpose: string;
  conflict: string;
  turningPoint: string;
  outcome: string;
  emotionalStart: string;
  emotionalEnd: string;
  reveal: string;
  conceal: string;
  ghostwriterNotes: string;
}

export interface StoryScene extends StoryEntity {
  type: 'scene';
  scene: SceneDetails;
}

export interface StoryRelationship {
  id: string;
  sourceId: string;
  targetId: string;
  label: string;
}

export interface ContinuumProject {
  format: 'continuum';
  formatVersion: 1;
  id: string;
  title: string;
  logline: string;
  premise: string;
  createdAt: string;
  updatedAt: string;
  entities: StoryEntity[];
  relationships: StoryRelationship[];
}

const id = (prefix: string) => `${prefix}_${crypto.randomUUID()}`;

export function createEntity(type: EntityType, count: number): StoryEntity {
  const base: StoryEntity = {
    id: id(type),
    type,
    name: type === 'scene' ? `Scene ${count + 1}` : `Untitled ${type.replace('-', ' ')}`,
    summary: '',
    notes: '',
    tags: [],
    position: { x: 80 + (count % 4) * 230, y: 80 + Math.floor(count / 4) * 160 },
  };

  if (type !== 'scene') return base;

  return {
    ...base,
    type: 'scene',
    scene: {
      order: count + 1,
      chapter: 'Chapter 1',
      participantIds: [],
      purpose: '',
      conflict: '',
      turningPoint: '',
      outcome: '',
      emotionalStart: '',
      emotionalEnd: '',
      reveal: '',
      conceal: '',
      ghostwriterNotes: '',
    },
  } satisfies StoryScene;
}

export function createEmptyProject(): ContinuumProject {
  const now = new Date().toISOString();
  return {
    format: 'continuum',
    formatVersion: 1,
    id: id('project'),
    title: 'Untitled story',
    logline: '',
    premise: '',
    createdAt: now,
    updatedAt: now,
    entities: [],
    relationships: [],
  };
}

export function createSampleProject(): ContinuumProject {
  const project = createEmptyProject();
  project.title = 'The Silent Colony';
  project.logline = 'A systems engineer discovers that a Mars colony disaster was designed to conceal a sentient machine.';
  project.premise = 'A grounded mystery about loyalty, institutional control, and the cost of revealing a truth that could destabilize two worlds.';

  const maya: StoryEntity = {
    id: 'character_maya', type: 'character', name: 'Maya Chen',
    summary: 'Systems engineer sent to audit the colony failure.', notes: 'Driven by accuracy; distrusts political pressure.',
    tags: ['protagonist'], position: { x: 90, y: 90 },
  };
  const elias: StoryEntity = {
    id: 'character_elias', type: 'character', name: 'Elias Vale',
    summary: 'Colony administrator protecting a hidden chain of decisions.', notes: 'Believes concealment prevents a larger catastrophe.',
    tags: ['administrator'], position: { x: 420, y: 90 },
  };
  const reactor: StoryEntity = {
    id: 'location_reactor', type: 'location', name: 'Olympus Reactor',
    summary: 'Restricted power complex beneath the colony.', notes: '', tags: ['critical'], position: { x: 250, y: 320 },
  };
  const thread: StoryEntity = {
    id: 'thread_sabotage', type: 'plot-thread', name: 'Reactor sabotage',
    summary: 'Who altered the containment system, and why?', notes: 'Introduced early; resolved near the final act.',
    tags: ['mystery'], position: { x: 610, y: 320 },
  };
  const scene = createEntity('scene', 0) as StoryScene;
  scene.id = 'scene_reactor_inspection';
  scene.name = 'The reactor inspection';
  scene.summary = 'Maya challenges the official explanation for the outage.';
  scene.position = { x: 230, y: 570 };
  scene.scene = {
    ...scene.scene,
    povCharacterId: maya.id,
    locationId: reactor.id,
    participantIds: [maya.id, elias.id],
    purpose: 'Force Maya to question the official account.',
    conflict: 'Elias wants the chamber sealed; Maya insists on entering.',
    turningPoint: 'Damage is found on the inside of the containment wall.',
    outcome: 'Maya begins a private investigation.',
    emotionalStart: 'Suspicion',
    emotionalEnd: 'Alarm',
    reveal: 'The explosion was not an external attack.',
    conceal: 'Elias approved the sabotage plan.',
    ghostwriterNotes: 'Keep the technical detail understandable. End on a physical clue, not exposition.',
  };

  project.entities = [maya, elias, reactor, thread, scene];
  project.relationships = [
    { id: id('rel'), sourceId: maya.id, targetId: scene.id, label: 'POV in' },
    { id: id('rel'), sourceId: elias.id, targetId: scene.id, label: 'appears in' },
    { id: id('rel'), sourceId: scene.id, targetId: reactor.id, label: 'occurs at' },
    { id: id('rel'), sourceId: scene.id, targetId: thread.id, label: 'advances' },
  ];
  return project;
}

export function isStoryScene(entity: StoryEntity): entity is StoryScene {
  return entity.type === 'scene' && 'scene' in entity;
}

export function projectToFlow(project: ContinuumProject): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = project.entities.map((entity) => ({
    id: entity.id,
    position: entity.position,
    type: 'story',
    data: { label: entity.name, entityType: entity.type, summary: entity.summary },
  }));
  const edges: Edge[] = project.relationships.map((relationship) => ({
    id: relationship.id,
    source: relationship.sourceId,
    target: relationship.targetId,
    label: relationship.label,
    type: 'smoothstep',
  }));
  return { nodes, edges };
}
