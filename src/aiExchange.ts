import {
  createEntity,
  isStoryChapter,
  isStoryScene,
  normalizeProject,
  type ContinuumProject,
  type EntityType,
  type ExternalLink,
  type StoryEntity,
  type StoryImage,
  type StoryRelationship,
} from './model';
import {
  effectActionOptions,
  normalizeStoryLogic,
  relationshipKinds,
} from './storyLogic';
import {
  normalizeScifiProject,
  semanticActionOptions,
  semanticDomains,
} from './scifi';

const entityTypes: EntityType[] = [
  'chapter',
  'character',
  'location',
  'organization',
  'object',
  'plot-thread',
  'fact',
  'world-rule',
  'scene',
];

export interface ContinuumAppendPackage {
  format: 'continuum-append';
  formatVersion: 1;
  baseProjectId?: string;
  changeSetId?: string;
  label?: string;
  generatedAt?: string;
  generatedBy?: string;
  notes?: string;
  entities: StoryEntity[];
  relationships: StoryRelationship[];
}

export interface AppendSource {
  sourceFormat: 'continuum-append' | 'continuum';
  sourceFileName: string;
  label: string;
  baseProjectId?: string;
  entities: StoryEntity[];
  relationships: StoryRelationship[];
}

export type AppendPlanStatus = 'add' | 'update' | 'skip';

export interface AppendEntityPlan {
  key: string;
  status: AppendPlanStatus;
  incoming: StoryEntity;
  targetId: string;
  matchReason?: 'id' | 'type-name';
  issue?: string;
}

export interface AppendRelationshipPlan {
  key: string;
  status: AppendPlanStatus;
  incoming: StoryRelationship;
  targetId: string;
  matchReason?: 'id' | 'signature';
  issue?: string;
}

export interface AppendAnalysis {
  source: AppendSource;
  entityPlans: AppendEntityPlan[];
  relationshipPlans: AppendRelationshipPlan[];
  idMap: Map<string, string>;
  warnings: string[];
  stats: {
    entityAdds: number;
    entityUpdates: number;
    relationshipAdds: number;
    relationshipUpdates: number;
    skipped: number;
  };
}

export interface AppendApplyResult {
  project: ContinuumProject;
  addedEntities: number;
  updatedEntities: number;
  addedRelationships: number;
  updatedRelationships: number;
  skipped: number;
}

function normalize(project: ContinuumProject): ContinuumProject {
  return normalizeScifiProject(normalizeStoryLogic(normalizeProject(project)));
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function fileSlug(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'continuum';
}

function download(name: string, content: string, type: string): void {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

function cleanImages(images: unknown): StoryImage[] {
  if (!Array.isArray(images)) return [];
  return images.flatMap((candidate) => {
    if (!candidate || typeof candidate !== 'object') return [];
    const image = candidate as Partial<StoryImage>;
    if (typeof image.dataUrl !== 'string' || !image.dataUrl.startsWith('data:')) return [];
    return [{
      id: typeof image.id === 'string' && image.id ? image.id : `image_${crypto.randomUUID()}`,
      name: typeof image.name === 'string' && image.name ? image.name : 'Imported image',
      dataUrl: image.dataUrl,
      thumbnailUrl: typeof image.thumbnailUrl === 'string' ? image.thumbnailUrl : undefined,
    }];
  });
}

function cleanLinks(links: unknown): ExternalLink[] {
  if (!Array.isArray(links)) return [];
  return links.flatMap((candidate) => {
    if (!candidate || typeof candidate !== 'object') return [];
    const link = candidate as Partial<ExternalLink>;
    if (typeof link.url !== 'string') return [];
    try {
      const parsed = new URL(link.url);
      if (!['http:', 'https:'].includes(parsed.protocol)) return [];
      return [{
        id: typeof link.id === 'string' && link.id ? link.id : `link_${crypto.randomUUID()}`,
        label: typeof link.label === 'string' && link.label.trim() ? link.label.trim() : parsed.hostname,
        url: parsed.toString(),
      }];
    } catch {
      return [];
    }
  });
}

function validPosition(value: unknown): value is { x: number; y: number } {
  return Boolean(value && typeof value === 'object'
    && typeof (value as { x?: unknown }).x === 'number'
    && typeof (value as { y?: unknown }).y === 'number');
}

function materializeEntity(raw: unknown, count: number): StoryEntity | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const candidate = raw as Partial<StoryEntity>;
  if (!candidate.type || !entityTypes.includes(candidate.type)) return undefined;
  const base = createEntity(candidate.type, count);
  const entity: StoryEntity = {
    ...base,
    ...candidate,
    id: typeof candidate.id === 'string' && candidate.id.trim() ? candidate.id.trim() : base.id,
    type: candidate.type,
    name: typeof candidate.name === 'string' && candidate.name.trim() ? candidate.name.trim() : base.name,
    summary: typeof candidate.summary === 'string' ? candidate.summary : base.summary,
    notes: typeof candidate.notes === 'string' ? candidate.notes : base.notes,
    tags: Array.isArray(candidate.tags) ? candidate.tags.map(String).map((tag) => tag.trim()).filter(Boolean) : base.tags,
    images: cleanImages(candidate.images),
    links: cleanLinks(candidate.links),
    position: validPosition(candidate.position) ? candidate.position : base.position,
  };

  if (isStoryChapter(base)) {
    return {
      ...entity,
      type: 'chapter',
      chapter: { ...base.chapter, ...(candidate.chapter ?? {}) },
    };
  }
  if (isStoryScene(base)) {
    return {
      ...entity,
      type: 'scene',
      scene: {
        ...base.scene,
        ...(candidate.scene ?? {}),
        participantIds: Array.isArray(candidate.scene?.participantIds)
          ? candidate.scene.participantIds.map(String)
          : base.scene.participantIds,
      },
    };
  }
  return entity;
}

function materializeRelationship(raw: unknown): StoryRelationship | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const candidate = raw as Partial<StoryRelationship>;
  if (typeof candidate.sourceId !== 'string' || typeof candidate.targetId !== 'string') return undefined;
  return {
    ...candidate,
    id: typeof candidate.id === 'string' && candidate.id.trim() ? candidate.id.trim() : `rel_${crypto.randomUUID()}`,
    sourceId: candidate.sourceId,
    targetId: candidate.targetId,
    label: typeof candidate.label === 'string' && candidate.label.trim() ? candidate.label.trim() : 'relates to',
  } as StoryRelationship;
}

function nameKey(entity: StoryEntity): string {
  return `${entity.type}:${entity.name.trim().toLowerCase()}`;
}

function relationshipSignature(relationship: StoryRelationship): string {
  return [
    relationship.sourceId,
    relationship.targetId,
    relationship.kind ?? 'custom',
    relationship.action ?? '',
    relationship.semanticDomain ?? '',
    relationship.semanticAction ?? '',
    relationship.label.trim().toLowerCase(),
    relationship.sceneId ?? '',
  ].join('|');
}

function uniqueId(prefix: string, used: Set<string>): string {
  let id = `${prefix}_${crypto.randomUUID()}`;
  while (used.has(id)) id = `${prefix}_${crypto.randomUUID()}`;
  used.add(id);
  return id;
}

function mergeArrays<T>(first: T[] | undefined, second: T[] | undefined, key: (value: T) => string): T[] {
  const result = new Map<string, T>();
  (first ?? []).forEach((value) => result.set(key(value), value));
  (second ?? []).forEach((value) => result.set(key(value), value));
  return [...result.values()];
}

function mergeNonEmpty(base: unknown, update: unknown): unknown {
  if (update === undefined || update === null || update === '') return clone(base);
  if (Array.isArray(update)) return update.length ? clone(update) : clone(base);
  if (typeof update !== 'object') return update;
  if (Array.isArray(base) || typeof base !== 'object' || base === null) return clone(update);
  const result: Record<string, unknown> = clone(base as Record<string, unknown>);
  Object.entries(update as Record<string, unknown>).forEach(([key, value]) => {
    result[key] = mergeNonEmpty(result[key], value);
  });
  return result;
}

function mergeEntity(existing: StoryEntity, incoming: StoryEntity): StoryEntity {
  const merged = mergeNonEmpty(existing, incoming) as StoryEntity;
  const incomingImages = cleanImages(incoming.images);
  const incomingLinks = cleanLinks(incoming.links);
  return {
    ...merged,
    id: existing.id,
    type: existing.type,
    name: incoming.name.trim() || existing.name,
    tags: [...new Set([...(existing.tags ?? []), ...(incoming.tags ?? [])])],
    images: incomingImages.length
      ? mergeArrays(existing.images, incomingImages, (image) => image.id || image.name)
      : existing.images,
    links: incomingLinks.length
      ? mergeArrays(existing.links, incomingLinks, (link) => link.id || link.url)
      : existing.links,
    position: validPosition(incoming.position) ? incoming.position : existing.position,
  };
}

function remapId(id: string | undefined, idMap: Map<string, string>): string | undefined {
  return id ? idMap.get(id) ?? id : undefined;
}

function remapEntityReferences(entity: StoryEntity, idMap: Map<string, string>): StoryEntity {
  const result = clone(entity);
  if (isStoryScene(result)) {
    result.scene = {
      ...result.scene,
      chapterId: remapId(result.scene.chapterId, idMap),
      povCharacterId: remapId(result.scene.povCharacterId, idMap),
      locationId: remapId(result.scene.locationId, idMap),
      participantIds: result.scene.participantIds.map((id) => remapId(id, idMap) ?? id),
      travel: result.scene.travel ? {
        ...result.scene.travel,
        originId: remapId(result.scene.travel.originId, idMap),
        destinationId: remapId(result.scene.travel.destinationId, idMap),
      } : result.scene.travel,
    };
  }
  if (result.locationProfile) {
    result.locationProfile = {
      ...result.locationProfile,
      parentLocationId: remapId(result.locationProfile.parentLocationId, idMap),
    };
  }
  if (result.technology) {
    result.technology = {
      ...result.technology,
      operatorOrganizationId: remapId(result.technology.operatorOrganizationId, idMap),
    };
  }
  if (result.organizationProfile) {
    result.organizationProfile = {
      ...result.organizationProfile,
      territoryIds: result.organizationProfile.territoryIds.map((id) => remapId(id, idMap) ?? id),
    };
  }
  if (result.fact) {
    result.fact = {
      ...result.fact,
      validFromSceneId: remapId(result.fact.validFromSceneId, idMap),
      validUntilSceneId: remapId(result.fact.validUntilSceneId, idMap),
      sourceEntityId: remapId(result.fact.sourceEntityId, idMap),
    };
  }
  return result;
}

function remapRelationship(relationship: StoryRelationship, idMap: Map<string, string>): StoryRelationship {
  return {
    ...relationship,
    sourceId: remapId(relationship.sourceId, idMap) ?? relationship.sourceId,
    targetId: remapId(relationship.targetId, idMap) ?? relationship.targetId,
    sceneId: remapId(relationship.sceneId, idMap),
  };
}

async function parseAppendSource(file: File): Promise<AppendSource> {
  const raw = JSON.parse(await file.text()) as Record<string, unknown>;
  if (raw.format === 'continuum-append' && raw.formatVersion === 1) {
    return {
      sourceFormat: 'continuum-append',
      sourceFileName: file.name,
      label: typeof raw.label === 'string' && raw.label.trim() ? raw.label.trim() : file.name,
      baseProjectId: typeof raw.baseProjectId === 'string' ? raw.baseProjectId : undefined,
      entities: Array.isArray(raw.entities) ? raw.entities as StoryEntity[] : [],
      relationships: Array.isArray(raw.relationships) ? raw.relationships as StoryRelationship[] : [],
    };
  }

  const projectCandidate = raw.format === 'continuum'
    ? raw
    : raw.format === 'continuum-ai-context' && raw.project && typeof raw.project === 'object'
      ? raw.project as Record<string, unknown>
      : undefined;

  if (projectCandidate?.format === 'continuum' && projectCandidate.formatVersion === 1 && Array.isArray(projectCandidate.entities)) {
    const project = normalize(projectCandidate as unknown as ContinuumProject);
    return {
      sourceFormat: 'continuum',
      sourceFileName: file.name,
      label: typeof project.title === 'string' ? `Append from ${project.title}` : file.name,
      baseProjectId: project.id,
      entities: project.entities,
      relationships: project.relationships ?? [],
    };
  }

  throw new Error('Append accepts a Continuum project or a version-1 continuum-append package.');
}

export async function prepareAppendImport(file: File, project: ContinuumProject): Promise<AppendAnalysis> {
  const source = await parseAppendSource(file);
  const existingById = new Map(project.entities.map((entity) => [entity.id, entity]));
  const existingByName = new Map(project.entities.map((entity) => [nameKey(entity), entity]));
  const usedEntityIds = new Set(project.entities.map((entity) => entity.id));
  const incomingEntityIds = new Set<string>();
  const idMap = new Map<string, string>();
  const warnings: string[] = [];
  const entityPlans: AppendEntityPlan[] = [];

  if (source.baseProjectId && source.sourceFormat === 'continuum-append' && source.baseProjectId !== project.id) {
    warnings.push(`This change set was prepared for project ${source.baseProjectId}, not ${project.id}. Review matches carefully.`);
  }

  source.entities.forEach((raw, index) => {
    const incoming = materializeEntity(raw, project.entities.length + index);
    const key = `entity-${index}`;
    if (!incoming) {
      entityPlans.push({ key, status: 'skip', incoming: raw, targetId: '', issue: 'Invalid or unsupported entity.' });
      return;
    }
    if (incomingEntityIds.has(incoming.id)) {
      entityPlans.push({ key, status: 'skip', incoming, targetId: '', issue: `Duplicate incoming entity ID ${incoming.id}.` });
      return;
    }
    incomingEntityIds.add(incoming.id);

    const idMatch = existingById.get(incoming.id);
    if (idMatch && idMatch.type !== incoming.type) {
      entityPlans.push({ key, status: 'skip', incoming, targetId: '', issue: `ID ${incoming.id} belongs to an existing ${idMatch.type}, not a ${incoming.type}.` });
      return;
    }
    if (idMatch) {
      idMap.set(incoming.id, idMatch.id);
      entityPlans.push({ key, status: 'update', incoming, targetId: idMatch.id, matchReason: 'id' });
      return;
    }

    const nameMatch = existingByName.get(nameKey(incoming));
    if (nameMatch) {
      idMap.set(incoming.id, nameMatch.id);
      entityPlans.push({ key, status: 'update', incoming, targetId: nameMatch.id, matchReason: 'type-name' });
      return;
    }

    let targetId = incoming.id;
    if (usedEntityIds.has(targetId)) targetId = uniqueId(incoming.type, usedEntityIds);
    else usedEntityIds.add(targetId);
    idMap.set(incoming.id, targetId);
    entityPlans.push({ key, status: 'add', incoming: { ...incoming, id: targetId }, targetId });
  });

  const finalEntityIds = new Set([...project.entities.map((entity) => entity.id), ...entityPlans.filter((plan) => plan.status === 'add').map((plan) => plan.targetId)]);
  const existingRelationshipsById = new Map(project.relationships.map((relationship) => [relationship.id, relationship]));
  const existingRelationshipsBySignature = new Map(project.relationships.map((relationship) => [relationshipSignature(relationship), relationship]));
  const usedRelationshipIds = new Set(project.relationships.map((relationship) => relationship.id));
  const seenRelationshipSignatures = new Set<string>();
  const relationshipPlans: AppendRelationshipPlan[] = [];

  source.relationships.forEach((raw, index) => {
    const incomingRaw = materializeRelationship(raw);
    const key = `relationship-${index}`;
    if (!incomingRaw) {
      relationshipPlans.push({ key, status: 'skip', incoming: raw, targetId: '', issue: 'Invalid relationship.' });
      return;
    }
    const incoming = remapRelationship(incomingRaw, idMap);
    if (!finalEntityIds.has(incoming.sourceId) || !finalEntityIds.has(incoming.targetId)) {
      relationshipPlans.push({ key, status: 'skip', incoming, targetId: '', issue: 'Relationship references an entity that is not present after append.' });
      return;
    }
    const signature = relationshipSignature(incoming);
    if (seenRelationshipSignatures.has(signature)) {
      relationshipPlans.push({ key, status: 'skip', incoming, targetId: '', issue: 'Duplicate relationship inside the appended file.' });
      return;
    }
    seenRelationshipSignatures.add(signature);

    const idMatch = existingRelationshipsById.get(incoming.id);
    if (idMatch) {
      relationshipPlans.push({ key, status: 'update', incoming, targetId: idMatch.id, matchReason: 'id' });
      return;
    }
    const signatureMatch = existingRelationshipsBySignature.get(signature);
    if (signatureMatch) {
      relationshipPlans.push({ key, status: 'update', incoming, targetId: signatureMatch.id, matchReason: 'signature' });
      return;
    }

    let targetId = incoming.id;
    if (usedRelationshipIds.has(targetId)) targetId = uniqueId('rel', usedRelationshipIds);
    else usedRelationshipIds.add(targetId);
    relationshipPlans.push({ key, status: 'add', incoming: { ...incoming, id: targetId }, targetId });
  });

  const skipped = [...entityPlans, ...relationshipPlans].filter((plan) => plan.status === 'skip').length;
  return {
    source,
    entityPlans,
    relationshipPlans,
    idMap,
    warnings,
    stats: {
      entityAdds: entityPlans.filter((plan) => plan.status === 'add').length,
      entityUpdates: entityPlans.filter((plan) => plan.status === 'update').length,
      relationshipAdds: relationshipPlans.filter((plan) => plan.status === 'add').length,
      relationshipUpdates: relationshipPlans.filter((plan) => plan.status === 'update').length,
      skipped,
    },
  };
}

export function applyAppendImport(
  project: ContinuumProject,
  analysis: AppendAnalysis,
  updateMatches: boolean,
): AppendApplyResult {
  const entities = new Map(project.entities.map((entity) => [entity.id, clone(entity)]));
  let addedEntities = 0;
  let updatedEntities = 0;

  analysis.entityPlans.forEach((plan) => {
    if (plan.status === 'skip') return;
    const incoming = remapEntityReferences({ ...plan.incoming, id: plan.targetId }, analysis.idMap);
    if (plan.status === 'add') {
      entities.set(plan.targetId, incoming);
      addedEntities += 1;
      return;
    }
    if (updateMatches) {
      const existing = entities.get(plan.targetId);
      if (existing) {
        entities.set(plan.targetId, mergeEntity(existing, incoming));
        updatedEntities += 1;
      }
    }
  });

  const relationships = new Map(project.relationships.map((relationship) => [relationship.id, clone(relationship)]));
  let addedRelationships = 0;
  let updatedRelationships = 0;
  analysis.relationshipPlans.forEach((plan) => {
    if (plan.status === 'skip') return;
    const incoming = { ...remapRelationship(plan.incoming, analysis.idMap), id: plan.targetId };
    if (plan.status === 'add') {
      relationships.set(plan.targetId, incoming);
      addedRelationships += 1;
      return;
    }
    if (updateMatches) {
      const existing = relationships.get(plan.targetId);
      if (existing) {
        relationships.set(plan.targetId, mergeNonEmpty(existing, incoming) as StoryRelationship);
        updatedRelationships += 1;
      }
    }
  });

  const next = normalize({
    ...project,
    updatedAt: new Date().toISOString(),
    entities: [...entities.values()],
    relationships: [...relationships.values()],
  });

  return {
    project: next,
    addedEntities,
    updatedEntities,
    addedRelationships,
    updatedRelationships,
    skipped: analysis.stats.skipped
      + (updateMatches ? 0 : analysis.stats.entityUpdates + analysis.stats.relationshipUpdates),
  };
}

function projectForAI(project: ContinuumProject): Record<string, unknown> {
  const normalized = normalize(project);
  return {
    ...normalized,
    entities: normalized.entities.map((entity) => ({
      ...entity,
      images: (entity.images ?? []).map((image) => ({
        id: image.id,
        name: image.name,
        embeddedDataOmitted: true,
        instruction: 'Preserve this image by ID. Do not replace or delete it in an append package.',
      })),
    })),
  };
}

export function exportAIContext(project: ContinuumProject): void {
  const normalized = normalize(project);
  const packageValue = {
    format: 'continuum-ai-context',
    formatVersion: 1,
    exportedAt: new Date().toISOString(),
    purpose: 'Give an AI the complete structured story context and a deterministic contract for returning directly importable Continuum updates.',
    authoringBoundary: [
      'Do not invent story facts, names, motives, events, or prose unless the user explicitly asks for proposals.',
      'When proposing plot points, mark them as proposals in notes and add the tag ai-proposed.',
      'Preserve all existing IDs. Use existing IDs when updating an entity or relationship.',
      'Do not remove entities or relationships in a version-1 append package.',
      'Do not include markdown fences or explanatory text around the returned JSON object.',
      'Prefer continuum-append for incremental work. Return a complete continuum project only when the user explicitly asks for a replacement file.',
    ],
    outputContracts: {
      recommendedAppend: {
        format: 'continuum-append',
        formatVersion: 1,
        baseProjectId: normalized.id,
        changeSetId: 'changeset_unique-id',
        label: 'Human-readable description of the update',
        generatedAt: 'ISO-8601 timestamp',
        generatedBy: 'AI session or model name',
        notes: 'Assumptions, unresolved references, and review guidance',
        entities: 'Only new or changed full entity objects',
        relationships: 'Only new or changed full relationship objects',
      },
      fullReplacement: {
        format: 'continuum',
        formatVersion: 1,
        instruction: 'Return the complete project with every existing entity and relationship preserved unless the user explicitly requested removal.',
      },
    },
    mergeRules: {
      entityMatchOrder: ['exact id', 'same type plus case-insensitive name'],
      relationshipMatchOrder: ['exact id', 'same source, target, kind/domain, action, label, and scene anchor'],
      images: 'AI context omits base64 image data. Append import preserves existing images unless valid embedded images are explicitly supplied.',
      rollback: 'Continuum stores one exact pre-append snapshot so the user can undo the last append.',
    },
    schemas: {
      entityTypes,
      sceneEntity: {
        id: 'stable unique string',
        type: 'scene',
        name: 'scene title',
        summary: 'one-sentence scene summary',
        notes: 'complete source notes or working notes',
        tags: ['tag'],
        images: [],
        links: [],
        position: { x: 0, y: 0 },
        scene: {
          order: 1,
          chapterId: 'existing chapter id',
          chapterInheritanceBlocked: false,
          povCharacterId: 'character id or omitted',
          locationId: 'location id or omitted',
          participantIds: ['character id'],
          purpose: '',
          conflict: '',
          turningPoint: '',
          outcome: '',
          emotionalStart: '',
          emotionalEnd: '',
          reveal: '',
          conceal: '',
          ghostwriterNotes: '',
          draft: 'optional manuscript text',
          environment: {
            setting: 'unknown | interior | exterior | mixed',
            atmosphere: 'unknown | breathable | thin | non-breathable | vacuum',
            gravity: 'unknown | earth | mars | microgravity | artificial | variable',
            radiation: 'unknown | normal | elevated | high | extreme',
            temperature: '',
            suitRequired: false,
            airlockRequired: false,
            communications: 'unknown | online | degraded | blackout',
            visibility: 'unknown | clear | reduced | zero',
            localTime: '',
            weather: '',
            notes: '',
          },
          travel: {
            originId: 'location id or omitted',
            destinationId: 'location id or omitted',
            mode: '',
            route: '',
            durationMinutes: 0,
            authorization: '',
            environmentalExposure: '',
            complications: '',
          },
        },
      },
      chapterEntity: {
        type: 'chapter',
        chapter: {
          order: 1,
          objective: '',
          openingState: '',
          closingState: '',
          ghostwriterNotes: '',
          draft: 'optional complete chapter manuscript',
        },
      },
      relationship: {
        id: 'stable unique string',
        sourceId: 'entity id',
        targetId: 'entity id',
        label: 'human-readable verb',
        kind: relationshipKinds,
        actionByEffectKind: effectActionOptions,
        semanticDomains,
        semanticActions: semanticActionOptions,
        sceneId: 'scene anchor when applicable',
        note: 'specific meaning or story change',
      },
    },
    exampleAppend: {
      format: 'continuum-append',
      formatVersion: 1,
      baseProjectId: normalized.id,
      changeSetId: 'changeset_example',
      label: 'Add a proposed clue to an existing scene',
      generatedAt: new Date().toISOString(),
      generatedBy: 'external-ai',
      notes: 'Example only. Preserve IDs and review all ai-proposed material.',
      entities: [
        {
          id: 'fact_new-clue',
          type: 'fact',
          name: 'Proposed clue',
          summary: 'A proposed clue extracted or suggested from the user request.',
          notes: 'AI proposal; not canonical until reviewed.',
          tags: ['ai-proposed', 'unreviewed'],
          images: [],
          links: [],
          position: { x: 0, y: 0 },
          fact: {
            proposition: 'State the proposed clue precisely.',
            truthStatus: 'uncertain',
            sensitivity: 'author-only',
            factType: 'hypothesis',
            confidence: 'low',
            sourceReliability: 'unknown',
          },
        },
      ],
      relationships: [],
    },
    idIndex: normalized.entities.map((entity) => ({ id: entity.id, type: entity.type, name: entity.name })),
    project: projectForAI(normalized),
  };

  download(`${fileSlug(normalized.title)}-ai-context.json`, JSON.stringify(packageValue, null, 2), 'application/json');
}
