import {
  getChapterForScene,
  getChapters,
  getScenesForChapter,
  isStoryScene,
  type ContinuumProject,
  type StoryEntity,
  type StoryRelationship,
  type StoryScene,
} from './model';

export const worldLenses = ['story', 'geography', 'power', 'knowledge', 'technology'] as const;
export type WorldLens = (typeof worldLenses)[number];
export const worldLensLabels: Record<WorldLens, string> = {
  story: 'Story Map',
  geography: 'Geography',
  power: 'Power',
  knowledge: 'Knowledge',
  technology: 'Technology',
};

export const entityVisibilities = ['auto', 'always', 'hidden'] as const;
export type EntityVisibility = (typeof entityVisibilities)[number];
export const entityImportances = ['core', 'supporting', 'reference'] as const;
export type EntityImportance = (typeof entityImportances)[number];

export interface EntityPresentation {
  visibility: EntityVisibility;
  importance: EntityImportance;
  layerHints: WorldLens[];
  pinned: boolean;
}

export const locationKinds = ['generic', 'region', 'dome', 'launch-site', 'facility', 'district', 'terrain', 'orbit'] as const;
export type LocationKind = (typeof locationKinds)[number];
export interface LocationProfile {
  kind: LocationKind;
  parentLocationId?: string;
  coordinates: string;
  environmentNotes: string;
}

export const technologyDomains = [
  'transport',
  'energy',
  'life-support',
  'computing',
  'communications',
  'surveillance',
  'terraforming',
  'biotechnology',
  'weapons',
  'research',
  'general',
] as const;
export type TechnologyDomain = (typeof technologyDomains)[number];
export interface TechnologyDetails {
  domain: TechnologyDomain;
  purpose: string;
  operatingPrinciple: string;
  inputs: string;
  outputs: string;
  dependencies: string;
  limitations: string;
  failureModes: string;
  operatorOrganizationId?: string;
  environmentalRequirements: string;
  researchNotes: string;
}

export const organizationTypes = ['corporation', 'government', 'intelligence', 'religious', 'cult', 'collective', 'criminal', 'research', 'other'] as const;
export type OrganizationType = (typeof organizationTypes)[number];
export const capabilityLevels = ['unknown', 'none', 'low', 'medium', 'high', 'extreme'] as const;
export type CapabilityLevel = (typeof capabilityLevels)[number];
export interface OrganizationProfile {
  organizationType: OrganizationType;
  publicIdentity: string;
  hiddenIdentity: string;
  controlledResources: string[];
  territoryIds: string[];
  surveillanceCapability: CapabilityLevel;
  militaryCapability: CapabilityLevel;
  dataAccess: CapabilityLevel;
  leverageNotes: string;
}

export const identityTypes = ['human', 'robot', 'automaton', 'distributed-ai', 'cyborg', 'unknown'] as const;
export type IdentityType = (typeof identityTypes)[number];
export const awarenessLevels = ['none', 'limited', 'emergent', 'confirmed', 'unknown'] as const;
export type AwarenessLevel = (typeof awarenessLevels)[number];
export interface IdentityProfile {
  identityType: IdentityType;
  manufacturer: string;
  model: string;
  ageYears?: number;
  bodyOrChassis: string;
  damage: string;
  selfAwareness: AwarenessLevel;
  autonomy: CapabilityLevel;
  networkAccess: CapabilityLevel;
  legalStatus: string;
  allegiance: string;
  programmingConstraints: string;
  aliases: string[];
}

export const sceneSettings = ['unknown', 'interior', 'exterior', 'mixed'] as const;
export type SceneSetting = (typeof sceneSettings)[number];
export const atmosphereStates = ['unknown', 'breathable', 'thin', 'non-breathable', 'vacuum'] as const;
export type AtmosphereState = (typeof atmosphereStates)[number];
export const gravityStates = ['unknown', 'earth', 'mars', 'microgravity', 'artificial', 'variable'] as const;
export type GravityState = (typeof gravityStates)[number];
export const radiationStates = ['unknown', 'normal', 'elevated', 'high', 'extreme'] as const;
export type RadiationState = (typeof radiationStates)[number];
export const communicationStates = ['unknown', 'online', 'degraded', 'blackout'] as const;
export type CommunicationState = (typeof communicationStates)[number];
export const visibilityStates = ['unknown', 'clear', 'reduced', 'zero'] as const;
export type VisibilityState = (typeof visibilityStates)[number];

export interface SceneEnvironment {
  setting: SceneSetting;
  atmosphere: AtmosphereState;
  gravity: GravityState;
  radiation: RadiationState;
  temperature: string;
  suitRequired: boolean;
  airlockRequired: boolean;
  communications: CommunicationState;
  visibility: VisibilityState;
  localTime: string;
  weather: string;
  notes: string;
}

export interface TravelSegment {
  originId?: string;
  destinationId?: string;
  mode: string;
  route: string;
  durationMinutes?: number;
  authorization: string;
  environmentalExposure: string;
  complications: string;
}

export const factTypes = ['canonical', 'claim', 'hypothesis', 'evidence', 'rumor'] as const;
export type FactType = (typeof factTypes)[number];
export const claimConfidences = ['unknown', 'low', 'medium', 'high', 'certain'] as const;
export type ClaimConfidence = (typeof claimConfidences)[number];
export const sourceReliabilities = ['unknown', 'poor', 'mixed', 'reliable', 'verified'] as const;
export type SourceReliability = (typeof sourceReliabilities)[number];

export const semanticDomains = ['power', 'technology', 'evidence', 'travel'] as const;
export type SemanticDomain = (typeof semanticDomains)[number];
export const semanticActionOptions: Record<SemanticDomain, Array<{ value: string; label: string }>> = {
  power: [
    { value: 'controls', label: 'controls' },
    { value: 'operates', label: 'operates' },
    { value: 'owns', label: 'owns' },
    { value: 'supplies', label: 'supplies' },
    { value: 'regulates', label: 'regulates' },
    { value: 'surveils', label: 'surveils' },
    { value: 'depends-on', label: 'depends on' },
    { value: 'opposes', label: 'opposes' },
    { value: 'allied-with', label: 'allied with' },
    { value: 'infiltrates', label: 'infiltrates' },
  ],
  technology: [
    { value: 'requires', label: 'requires' },
    { value: 'powers', label: 'powers' },
    { value: 'feeds-data-to', label: 'feeds data to' },
    { value: 'operated-by', label: 'operated by' },
    { value: 'protected-by', label: 'protected by' },
    { value: 'fails-under', label: 'fails under' },
    { value: 'interferes-with', label: 'interferes with' },
    { value: 'communicates-with', label: 'communicates with' },
  ],
  evidence: [
    { value: 'supports', label: 'supports' },
    { value: 'contradicts', label: 'contradicts' },
    { value: 'sourced-by', label: 'is sourced by' },
    { value: 'corroborates', label: 'corroborates' },
    { value: 'weakens', label: 'weakens' },
  ],
  travel: [
    { value: 'connects', label: 'connects' },
    { value: 'serves', label: 'serves' },
    { value: 'route-to', label: 'routes to' },
    { value: 'transfers-to', label: 'transfers to' },
  ],
};

declare module './model' {
  interface StoryEntity {
    presentation?: EntityPresentation;
    locationProfile?: LocationProfile;
    technology?: TechnologyDetails;
    organizationProfile?: OrganizationProfile;
    identityProfile?: IdentityProfile;
  }

  interface SceneDetails {
    environment?: SceneEnvironment;
    travel?: TravelSegment;
  }

  interface StoryRelationship {
    semanticDomain?: SemanticDomain;
    semanticAction?: string;
  }

  interface ContinuumProject {
    worldSettings?: {
      defaultLens?: WorldLens;
      showReference?: boolean;
      maxVisibleNodes?: number;
    };
  }
}

declare module './storyLogic' {
  interface FactDetails {
    factType?: FactType;
    confidence?: ClaimConfidence;
    sourceReliability?: SourceReliability;
    sourceEntityId?: string;
  }
}

const defaultEnvironment = (): SceneEnvironment => ({
  setting: 'unknown',
  atmosphere: 'unknown',
  gravity: 'unknown',
  radiation: 'unknown',
  temperature: '',
  suitRequired: false,
  airlockRequired: false,
  communications: 'unknown',
  visibility: 'unknown',
  localTime: '',
  weather: '',
  notes: '',
});

const defaultTravel = (): TravelSegment => ({
  mode: '',
  route: '',
  authorization: '',
  environmentalExposure: '',
  complications: '',
});

function defaultPresentation(entity: StoryEntity): EntityPresentation {
  const tagText = entity.tags.join(' ').toLowerCase();
  const importance: EntityImportance = tagText.includes('atlas') || tagText.includes('reference')
    ? 'reference'
    : ['chapter', 'scene', 'character', 'plot-thread'].includes(entity.type)
      ? 'core'
      : ['fact', 'world-rule'].includes(entity.type)
        ? 'supporting'
        : 'reference';
  return {
    visibility: 'auto',
    importance,
    layerHints: inferLayerHints(entity),
    pinned: false,
  };
}

function inferLayerHints(entity: StoryEntity): WorldLens[] {
  if (entity.type === 'location') return ['story', 'geography'];
  if (entity.type === 'organization') return ['story', 'power'];
  if (entity.type === 'fact' || entity.type === 'world-rule') return ['story', 'knowledge'];
  if (entity.technology) return ['story', 'technology'];
  return ['story'];
}

function inferLocationKind(entity: StoryEntity): LocationKind {
  const text = `${entity.name} ${entity.summary} ${entity.tags.join(' ')}`.toLowerCase();
  if (/launch|spaceport|landing site|helipad/.test(text)) return 'launch-site';
  if (/region|planitia|highlands|quadrangle|belt/.test(text)) return 'region';
  if (/dome|spire|hub/.test(text)) return 'dome';
  if (/orbit|orbital|station/.test(text)) return 'orbit';
  if (/district|square|plaza|run|ring/.test(text)) return 'district';
  if (/crater|pole|icecap|desert|ridge|terrain|wasteland/.test(text)) return 'terrain';
  if (/compound|facility|lab|accelerator|bunker|hotel|office|hangar/.test(text)) return 'facility';
  return 'generic';
}

function technologyDomainFromText(text: string): TechnologyDomain {
  if (/(vehicle|craft|ship|maglev|transit|drive)/.test(text)) return 'transport';
  if (/(oxygen|water|air|habitat|life support)/.test(text)) return 'life-support';
  if (/(computer|network|yggdrasil|data|quantum)/.test(text)) return 'computing';
  if (/(surveillance|scanner|sensor)/.test(text)) return 'surveillance';
  if (/(terraform|nuclear|detonation|greenhouse)/.test(text)) return 'terraforming';
  if (/(accelerator|collider|research|projector)/.test(text)) return 'research';
  if (/(power|reactor|energy)/.test(text)) return 'energy';
  return 'general';
}

function inferTechnology(entity: StoryEntity): TechnologyDetails | undefined {
  if (entity.technology) return entity.technology;
  if (entity.type !== 'object') return undefined;
  const text = `${entity.name} ${entity.summary} ${entity.notes} ${entity.tags.join(' ')}`.toLowerCase();
  if (!/(technology|system|vehicle|craft|ship|accelerator|maglev|network|computer|projector|drive|reactor|yggdrasil|mtv|plasma|shield|scanner|satellite|rig)/.test(text)) return undefined;
  return {
    domain: technologyDomainFromText(text),
    purpose: entity.summary,
    operatingPrinciple: '',
    inputs: '',
    outputs: '',
    dependencies: '',
    limitations: '',
    failureModes: '',
    environmentalRequirements: '',
    researchNotes: entity.notes,
  };
}

function inferIdentity(entity: StoryEntity): IdentityProfile | undefined {
  if (entity.identityProfile) return entity.identityProfile;
  if (entity.type !== 'character') return undefined;
  const text = `${entity.name} ${entity.summary} ${entity.notes} ${entity.tags.join(' ')}`.toLowerCase();
  if (!/(robot|automaton|android|artificial intelligence|\bai\b|cyborg|machine)/.test(text)) return undefined;
  const identityType: IdentityType = /automaton/.test(text)
    ? 'automaton'
    : /cyborg/.test(text)
      ? 'cyborg'
      : /distributed|networked ai/.test(text)
        ? 'distributed-ai'
        : 'robot';
  return {
    identityType,
    manufacturer: '',
    model: '',
    bodyOrChassis: '',
    damage: '',
    selfAwareness: /self-aware|sentient/.test(text) ? 'confirmed' : 'unknown',
    autonomy: 'unknown',
    networkAccess: 'unknown',
    legalStatus: '',
    allegiance: '',
    programmingConstraints: '',
    aliases: [],
  };
}

function normalizeOrganizationProfile(entity: StoryEntity): OrganizationProfile | undefined {
  if (entity.type !== 'organization') return entity.organizationProfile;
  return {
    organizationType: entity.organizationProfile?.organizationType ?? 'other',
    publicIdentity: entity.organizationProfile?.publicIdentity ?? entity.summary,
    hiddenIdentity: entity.organizationProfile?.hiddenIdentity ?? '',
    controlledResources: entity.organizationProfile?.controlledResources ?? [],
    territoryIds: entity.organizationProfile?.territoryIds ?? [],
    surveillanceCapability: entity.organizationProfile?.surveillanceCapability ?? 'unknown',
    militaryCapability: entity.organizationProfile?.militaryCapability ?? 'unknown',
    dataAccess: entity.organizationProfile?.dataAccess ?? 'unknown',
    leverageNotes: entity.organizationProfile?.leverageNotes ?? '',
  };
}

export function normalizeScifiProject(project: ContinuumProject): ContinuumProject {
  const entities = project.entities.map((original) => {
    const technology = inferTechnology(original);
    const base: StoryEntity = {
      ...original,
      technology,
      presentation: {
        ...defaultPresentation({ ...original, technology }),
        ...(original.presentation ?? {}),
        layerHints: original.presentation?.layerHints?.length
          ? original.presentation.layerHints
          : inferLayerHints({ ...original, technology }),
      },
      locationProfile: original.type === 'location'
        ? {
          kind: original.locationProfile?.kind ?? inferLocationKind(original),
          parentLocationId: original.locationProfile?.parentLocationId,
          coordinates: original.locationProfile?.coordinates ?? '',
          environmentNotes: original.locationProfile?.environmentNotes ?? '',
        }
        : original.locationProfile,
      organizationProfile: normalizeOrganizationProfile(original),
      identityProfile: inferIdentity(original),
    };

    if (isStoryScene(base)) {
      return {
        ...base,
        scene: {
          ...base.scene,
          environment: { ...defaultEnvironment(), ...(base.scene.environment ?? {}) },
          travel: { ...defaultTravel(), ...(base.scene.travel ?? {}) },
        },
      };
    }

    if (base.type === 'fact' && base.fact) {
      return {
        ...base,
        fact: {
          ...base.fact,
          factType: base.fact.factType ?? (base.fact.truthStatus === 'true' ? 'canonical' : 'claim'),
          confidence: base.fact.confidence ?? 'unknown',
          sourceReliability: base.fact.sourceReliability ?? 'unknown',
          sourceEntityId: base.fact.sourceEntityId,
        },
      };
    }
    return base;
  });

  return {
    ...project,
    entities,
    worldSettings: {
      defaultLens: project.worldSettings?.defaultLens ?? 'story',
      showReference: project.worldSettings?.showReference ?? false,
      maxVisibleNodes: project.worldSettings?.maxVisibleNodes ?? 42,
    },
  };
}

export function presentationOf(entity: StoryEntity): EntityPresentation {
  return entity.presentation ?? defaultPresentation(entity);
}

export function isTechnologyEntity(entity: StoryEntity): boolean {
  return Boolean(entity.technology);
}

export function relationshipDomain(relationship: StoryRelationship): SemanticDomain | undefined {
  if (relationship.semanticDomain) return relationship.semanticDomain;
  const label = `${relationship.semanticAction ?? ''} ${relationship.label}`.toLowerCase();
  if (/(controls|operates|owns|supplies|regulates|surveils|depends on|opposes|allied|infiltrates|governs)/.test(label)) return 'power';
  if (/(requires|powers|feeds data|operated by|protected by|fails under|interferes|communicates|uses technology)/.test(label)) return 'technology';
  if (/(supports|contradicts|sourced by|corroborates|weakens|evidence)/.test(label)) return 'evidence';
  if (/(maglev|route|serves|connects|transfers|travels)/.test(label)) return 'travel';
  return undefined;
}

export function createSemanticRelationship(
  sourceId: string,
  targetId: string,
  domain: SemanticDomain,
  action: string,
  note = '',
): StoryRelationship {
  return {
    id: `rel_${crypto.randomUUID()}`,
    sourceId,
    targetId,
    label: semanticActionOptions[domain].find((option) => option.value === action)?.label ?? action,
    kind: 'custom',
    note: note.trim(),
    semanticDomain: domain,
    semanticAction: action,
  };
}

export interface ContinuityWarning {
  severity: 'error' | 'warning' | 'info';
  sceneId: string;
  message: string;
}

function orderedScenes(project: ContinuumProject): StoryScene[] {
  return getChapters(project).flatMap((chapter) => getScenesForChapter(project, chapter.id));
}

export function sceneContinuityWarnings(project: ContinuumProject, scene: StoryScene): ContinuityWarning[] {
  const warnings: ContinuityWarning[] = [];
  const environment = scene.scene.environment ?? defaultEnvironment();
  const travel = scene.scene.travel ?? defaultTravel();
  const sequence = orderedScenes(project);
  const index = sequence.findIndex((candidate) => candidate.id === scene.id);
  const previous = index > 0 ? sequence[index - 1] : undefined;

  if (environment.setting === 'exterior' && ['thin', 'non-breathable', 'vacuum'].includes(environment.atmosphere) && !environment.suitRequired) {
    warnings.push({ severity: 'error', sceneId: scene.id, message: 'Exterior non-breathable scene has no suit requirement recorded.' });
  }
  if (['high', 'extreme'].includes(environment.radiation) && !environment.suitRequired && !/shield|vest|protected/i.test(environment.notes)) {
    warnings.push({ severity: 'warning', sceneId: scene.id, message: 'High radiation is recorded without protective equipment or shielding notes.' });
  }
  if (travel.destinationId && scene.scene.locationId && travel.destinationId !== scene.scene.locationId) {
    warnings.push({ severity: 'warning', sceneId: scene.id, message: 'Travel destination does not match the scene location.' });
  }
  if (travel.originId && previous?.scene.locationId && travel.originId !== previous.scene.locationId) {
    warnings.push({ severity: 'warning', sceneId: scene.id, message: 'Travel origin does not match the previous scene location.' });
  }
  const locationChanged = Boolean(previous?.scene.locationId && scene.scene.locationId && previous.scene.locationId !== scene.scene.locationId);
  if (locationChanged && !travel.mode && !travel.originId && !travel.destinationId) {
    warnings.push({ severity: 'info', sceneId: scene.id, message: 'Location changes from the previous scene, but no travel segment is recorded.' });
  }
  if (travel.mode && !travel.durationMinutes) {
    warnings.push({ severity: 'info', sceneId: scene.id, message: 'Travel mode is recorded without an estimated duration.' });
  }
  if (environment.airlockRequired && environment.setting === 'interior' && !travel.mode && locationChanged) {
    warnings.push({ severity: 'info', sceneId: scene.id, message: 'An airlock transition is required; record it in travel or environmental notes.' });
  }
  return warnings;
}

export function chapterContinuityWarnings(project: ContinuumProject, chapterId: string): ContinuityWarning[] {
  return getScenesForChapter(project, chapterId).flatMap((scene) => sceneContinuityWarnings(project, scene));
}

export interface ConceptLoad {
  score: number;
  severity: 'low' | 'moderate' | 'high' | 'extreme';
  groups: Record<string, number>;
  entityIds: string[];
}

function sceneReferencedIds(project: ContinuumProject, scene: StoryScene): Set<string> {
  const ids = new Set<string>();
  if (scene.scene.povCharacterId) ids.add(scene.scene.povCharacterId);
  if (scene.scene.locationId) ids.add(scene.scene.locationId);
  scene.scene.participantIds.forEach((id) => ids.add(id));
  if (scene.scene.travel?.originId) ids.add(scene.scene.travel.originId);
  if (scene.scene.travel?.destinationId) ids.add(scene.scene.travel.destinationId);
  project.relationships.forEach((relationship) => {
    if (relationship.sceneId === scene.id || relationship.sourceId === scene.id || relationship.targetId === scene.id) {
      if (relationship.sourceId !== scene.id) ids.add(relationship.sourceId);
      if (relationship.targetId !== scene.id) ids.add(relationship.targetId);
    }
  });
  return ids;
}

export function conceptLoadForChapter(project: ContinuumProject, chapterId: string): ConceptLoad {
  const firstSceneByEntity = new Map<string, string>();
  for (const scene of orderedScenes(project)) {
    for (const entityId of sceneReferencedIds(project, scene)) {
      if (!firstSceneByEntity.has(entityId)) firstSceneByEntity.set(entityId, scene.id);
    }
  }
  const chapterSceneIds = new Set(getScenesForChapter(project, chapterId).map((scene) => scene.id));
  const entityIds = [...firstSceneByEntity.entries()]
    .filter(([, sceneId]) => chapterSceneIds.has(sceneId))
    .map(([entityId]) => entityId);
  const groups: Record<string, number> = {};
  const weights: Record<string, number> = {
    character: 3,
    location: 2,
    organization: 2,
    technology: 2,
    'plot-thread': 2,
    fact: 1,
    'world-rule': 1,
    object: 1,
  };
  let score = 0;
  for (const entityId of entityIds) {
    const entity = project.entities.find((candidate) => candidate.id === entityId);
    if (!entity || entity.type === 'chapter' || entity.type === 'scene') continue;
    const group = isTechnologyEntity(entity) ? 'technology' : entity.type;
    groups[group] = (groups[group] ?? 0) + 1;
    score += weights[group] ?? 1;
  }
  const severity: ConceptLoad['severity'] = score <= 7 ? 'low' : score <= 14 ? 'moderate' : score <= 22 ? 'high' : 'extreme';
  return { score, severity, groups, entityIds };
}

export function sceneAtOrBeforeChapter(project: ContinuumProject, sceneId: string | undefined, chapterId: string | undefined): boolean {
  if (!sceneId || !chapterId) return true;
  const target = getChapters(project).find((chapter) => chapter.id === chapterId);
  const scene = project.entities.find((entity): entity is StoryScene => entity.id === sceneId && isStoryScene(entity));
  const sceneChapter = scene ? getChapterForScene(project, scene) : undefined;
  return !target || !sceneChapter || sceneChapter.chapter.order <= target.chapter.order;
}
