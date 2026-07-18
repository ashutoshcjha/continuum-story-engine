import type { Edge, Node, XYPosition } from '@xyflow/react';

export type EntityType =
  | 'chapter'
  | 'character'
  | 'location'
  | 'organization'
  | 'object'
  | 'plot-thread'
  | 'fact'
  | 'world-rule'
  | 'scene';

export interface StoryImage {
  id: string;
  name: string;
  dataUrl: string;
  thumbnailUrl?: string;
}

export interface ExternalLink {
  id: string;
  label: string;
  url: string;
}

export interface ChapterDetails {
  order: number;
  objective: string;
  openingState: string;
  closingState: string;
  ghostwriterNotes: string;
}

export interface SceneDetails {
  order: number;
  chapterId?: string;
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

export interface StoryEntity {
  id: string;
  type: EntityType;
  name: string;
  summary: string;
  notes: string;
  tags: string[];
  images: StoryImage[];
  links: ExternalLink[];
  position: XYPosition;
  chapter?: ChapterDetails;
  scene?: SceneDetails;
}

export interface StoryChapter extends StoryEntity {
  type: 'chapter';
  chapter: ChapterDetails;
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
const slug = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'chapter';

const defaultChapterDetails = (order: number): ChapterDetails => ({
  order,
  objective: '',
  openingState: '',
  closingState: '',
  ghostwriterNotes: '',
});

const defaultSceneDetails = (order: number): SceneDetails => ({
  order,
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
});

export function isStoryChapter(entity: StoryEntity): entity is StoryChapter {
  return entity.type === 'chapter' && Boolean(entity.chapter);
}

export function isStoryScene(entity: StoryEntity): entity is StoryScene {
  return entity.type === 'scene' && Boolean(entity.scene);
}

export function getChapters(project: ContinuumProject): StoryChapter[] {
  return project.entities.filter(isStoryChapter).sort((a, b) => a.chapter.order - b.chapter.order);
}

export function getScenesForChapter(project: ContinuumProject, chapterId?: string): StoryScene[] {
  return project.entities
    .filter(isStoryScene)
    .filter((scene) => !chapterId || scene.scene.chapterId === chapterId)
    .sort((a, b) => {
      const chapterOrder = (id?: string) => getChapters(project).find((chapter) => chapter.id === id)?.chapter.order ?? Number.MAX_SAFE_INTEGER;
      return chapterOrder(a.scene.chapterId) - chapterOrder(b.scene.chapterId) || a.scene.order - b.scene.order;
    });
}

export function getChapterForScene(project: ContinuumProject, scene: StoryScene): StoryChapter | undefined {
  return getChapters(project).find((chapter) => chapter.id === scene.scene.chapterId);
}

export function getChapterRelatedEntities(project: ContinuumProject, chapterId: string): StoryEntity[] {
  const scenes = getScenesForChapter(project, chapterId);
  const relatedIds = new Set<string>([chapterId, ...scenes.map((scene) => scene.id)]);

  for (const scene of scenes) {
    if (scene.scene.povCharacterId) relatedIds.add(scene.scene.povCharacterId);
    if (scene.scene.locationId) relatedIds.add(scene.scene.locationId);
    scene.scene.participantIds.forEach((participantId) => relatedIds.add(participantId));
  }

  for (const relationship of project.relationships) {
    if (relatedIds.has(relationship.sourceId)) relatedIds.add(relationship.targetId);
    if (relatedIds.has(relationship.targetId)) relatedIds.add(relationship.sourceId);
  }

  return project.entities.filter((entity) => relatedIds.has(entity.id));
}

export function normalizeProject(project: ContinuumProject): ContinuumProject {
  const normalizedEntities: StoryEntity[] = project.entities.map((entity) => ({
    ...entity,
    images: entity.images ?? [],
    links: entity.links ?? [],
  }));

  const chapters: StoryChapter[] = normalizedEntities
    .filter((entity) => entity.type === 'chapter')
    .map((entity, index) => ({
      ...entity,
      type: 'chapter',
      chapter: { ...defaultChapterDetails(index + 1), ...(entity.chapter ?? {}) },
    }));

  const chapterByName = new Map(chapters.map((chapter) => [chapter.name.trim().toLowerCase(), chapter]));
  const usedChapterIds = new Set(chapters.map((chapter) => chapter.id));

  const ensureLegacyChapter = (label: string, order: number): StoryChapter => {
    const normalizedLabel = label.trim() || `Chapter ${order}`;
    const existing = chapterByName.get(normalizedLabel.toLowerCase());
    if (existing) return existing;

    let chapterId = `chapter_${slug(normalizedLabel)}`;
    let suffix = 2;
    while (usedChapterIds.has(chapterId)) chapterId = `chapter_${slug(normalizedLabel)}_${suffix++}`;
    usedChapterIds.add(chapterId);

    const chapter: StoryChapter = {
      id: chapterId,
      type: 'chapter',
      name: normalizedLabel,
      summary: '',
      notes: '',
      tags: [],
      images: [],
      links: [],
      position: { x: 40, y: 70 + chapters.length * 210 },
      chapter: defaultChapterDetails(chapters.length + 1),
    };
    chapters.push(chapter);
    chapterByName.set(normalizedLabel.toLowerCase(), chapter);
    return chapter;
  };

  const rawScenes = normalizedEntities.filter((entity) => entity.type === 'scene');
  if (!chapters.length && !rawScenes.length) ensureLegacyChapter('Chapter 1', 1);

  const scenes: StoryScene[] = rawScenes.map((entity, index) => {
    const raw = entity.scene as (Partial<SceneDetails> & { chapter?: string }) | undefined;
    const legacyLabel = raw?.chapter?.trim();
    let chapterId = raw?.chapterId;

    if (!chapterId || !chapters.some((chapter) => chapter.id === chapterId)) {
      const chapter = legacyLabel
        ? ensureLegacyChapter(legacyLabel, chapters.length + 1)
        : chapters[0] ?? ensureLegacyChapter('Chapter 1', 1);
      chapterId = chapter.id;
    }

    return {
      ...entity,
      type: 'scene',
      scene: {
        ...defaultSceneDetails(index + 1),
        ...raw,
        chapterId,
        participantIds: raw?.participantIds ?? [],
      },
    };
  });

  const nonChapterOrScene = normalizedEntities.filter((entity) => entity.type !== 'chapter' && entity.type !== 'scene');

  return {
    ...project,
    entities: [...chapters, ...nonChapterOrScene, ...scenes],
  };
}

export function createEntity(type: EntityType, count: number): StoryEntity {
  const base: StoryEntity = {
    id: id(type),
    type,
    name: type === 'scene' ? `Scene ${count + 1}` : type === 'chapter' ? `Chapter ${count + 1}` : `Untitled ${type.replace('-', ' ')}`,
    summary: '',
    notes: '',
    tags: [],
    images: [],
    links: [],
    position: type === 'chapter'
      ? { x: 40, y: 70 + count * 210 }
      : { x: 280 + (count % 4) * 230, y: 80 + Math.floor(count / 4) * 160 },
  };

  if (type === 'chapter') {
    return {
      ...base,
      type: 'chapter',
      chapter: defaultChapterDetails(count + 1),
    } satisfies StoryChapter;
  }

  if (type === 'scene') {
    return {
      ...base,
      type: 'scene',
      scene: defaultSceneDetails(count + 1),
    } satisfies StoryScene;
  }

  return base;
}

export function createEmptyProject(): ContinuumProject {
  const now = new Date().toISOString();
  const firstChapter = createEntity('chapter', 0) as StoryChapter;
  return {
    format: 'continuum',
    formatVersion: 1,
    id: id('project'),
    title: 'Untitled story',
    logline: '',
    premise: '',
    createdAt: now,
    updatedAt: now,
    entities: [firstChapter],
    relationships: [],
  };
}

export function createSampleProject(): ContinuumProject {
  const project = createEmptyProject();
  project.title = 'The Silent Colony';
  project.logline = 'A systems engineer discovers that a Mars colony disaster was designed to conceal a sentient machine.';
  project.premise = 'A grounded mystery about loyalty, institutional control, and the cost of revealing a truth that could destabilize two worlds.';

  const chapter = project.entities.find(isStoryChapter)!;
  chapter.name = 'Chapter 1 — The Audit';
  chapter.summary = 'Maya arrives, tests the official explanation, and chooses to investigate privately.';
  chapter.chapter.objective = 'Break Maya’s confidence in the official account.';
  chapter.chapter.openingState = 'Maya expects a difficult but routine technical audit.';
  chapter.chapter.closingState = 'Maya believes the report is false and no longer trusts Elias.';
  chapter.chapter.ghostwriterNotes = 'Keep the chapter grounded in physical evidence rather than exposition.';

  const maya: StoryEntity = {
    id: 'character_maya', type: 'character', name: 'Maya Chen',
    summary: 'Systems engineer sent to audit the colony failure.', notes: 'Driven by accuracy; distrusts political pressure.',
    tags: ['protagonist'], images: [], links: [], position: { x: 330, y: 90 },
  };
  const elias: StoryEntity = {
    id: 'character_elias', type: 'character', name: 'Elias Vale',
    summary: 'Colony administrator protecting a hidden chain of decisions.', notes: 'Believes concealment prevents a larger catastrophe.',
    tags: ['administrator'], images: [], links: [], position: { x: 660, y: 90 },
  };
  const reactor: StoryEntity = {
    id: 'location_reactor', type: 'location', name: 'Olympus Reactor',
    summary: 'Restricted power complex beneath the colony.', notes: '', tags: ['critical'], images: [], links: [], position: { x: 490, y: 320 },
  };
  const thread: StoryEntity = {
    id: 'thread_sabotage', type: 'plot-thread', name: 'Reactor sabotage',
    summary: 'Who altered the containment system, and why?', notes: 'Introduced early; resolved near the final act.',
    tags: ['mystery'], images: [], links: [], position: { x: 850, y: 320 },
  };
  const scene = createEntity('scene', 0) as StoryScene;
  scene.id = 'scene_reactor_inspection';
  scene.name = 'The reactor inspection';
  scene.summary = 'Maya challenges the official explanation for the outage.';
  scene.position = { x: 470, y: 570 };
  scene.scene = {
    ...scene.scene,
    chapterId: chapter.id,
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

  project.entities = [chapter, maya, elias, reactor, thread, scene];
  project.relationships = [
    { id: id('rel'), sourceId: maya.id, targetId: scene.id, label: 'POV in' },
    { id: id('rel'), sourceId: elias.id, targetId: scene.id, label: 'appears in' },
    { id: id('rel'), sourceId: scene.id, targetId: reactor.id, label: 'occurs at' },
    { id: id('rel'), sourceId: scene.id, targetId: thread.id, label: 'advances' },
  ];
  return project;
}

export function projectToFlow(project: ContinuumProject): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = project.entities.map((entity) => ({
    id: entity.id,
    position: entity.position,
    type: 'story',
    data: {
      label: entity.name,
      entityType: entity.type,
      summary: entity.summary,
      imageUrl: entity.images?.[0]?.thumbnailUrl ?? entity.images?.[0]?.dataUrl,
      linkCount: entity.links?.length ?? 0,
    },
  }));

  const explicitEdges: Edge[] = project.relationships.map((relationship) => ({
    id: relationship.id,
    source: relationship.sourceId,
    target: relationship.targetId,
    label: relationship.label,
    type: 'straight',
  }));

  const chapterEdges: Edge[] = project.entities
    .filter(isStoryScene)
    .filter((scene) => Boolean(scene.scene.chapterId))
    .map((scene) => ({
      id: `chapter-membership_${scene.id}`,
      source: scene.scene.chapterId!,
      target: scene.id,
      label: 'contains',
      type: 'straight',
      animated: false,
      style: { strokeDasharray: '5 4' },
    }));

  return { nodes, edges: [...chapterEdges, ...explicitEdges] };
}
