import type { AppendAnalysis, AppendApplyResult } from './aiExchange';
import {
  isStoryScene,
  normalizeProject,
  type ContinuumProject,
  type ExternalLink,
  type StoryEntity,
  type StoryImage,
  type StoryRelationship,
} from './model';
import { normalizeStoryLogic } from './storyLogic';
import { normalizeScifiProject } from './scifi';

function clone<T>(value: T): T {
  return structuredClone(value);
}

function remapId(id: string | undefined, idMap: Map<string, string>): string | undefined {
  return id ? idMap.get(id) ?? id : undefined;
}

function meaningful(value: unknown): boolean {
  if (value === undefined || value === null || value === '') return false;
  if (Array.isArray(value)) return value.length > 0;
  return true;
}

function mergeNonEmpty(base: unknown, update: unknown): unknown {
  if (!meaningful(update)) return clone(base);
  if (Array.isArray(update)) return clone(update);
  if (typeof update !== 'object' || update === null) return update;
  if (typeof base !== 'object' || base === null || Array.isArray(base)) return clone(update);
  const result = clone(base as Record<string, unknown>);
  Object.entries(update as Record<string, unknown>).forEach(([key, value]) => {
    result[key] = mergeNonEmpty(result[key], value);
  });
  return result;
}

function mergeImages(existing: StoryImage[], incoming: StoryImage[]): StoryImage[] {
  const result = new Map(existing.map((image) => [image.id || image.name, image]));
  incoming
    .filter((image) => typeof image.dataUrl === 'string' && image.dataUrl.startsWith('data:'))
    .forEach((image) => result.set(image.id || image.name, image));
  return [...result.values()];
}

function mergeLinks(existing: ExternalLink[], incoming: ExternalLink[]): ExternalLink[] {
  const result = new Map(existing.map((link) => [link.id || link.url, link]));
  incoming.forEach((link) => result.set(link.id || link.url, link));
  return [...result.values()];
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
    result.locationProfile = { ...result.locationProfile, parentLocationId: remapId(result.locationProfile.parentLocationId, idMap) };
  }
  if (result.technology) {
    result.technology = { ...result.technology, operatorOrganizationId: remapId(result.technology.operatorOrganizationId, idMap) };
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

function mergeEntity(existing: StoryEntity, incoming: StoryEntity): StoryEntity {
  const merged = mergeNonEmpty(existing, incoming) as StoryEntity;
  return {
    ...merged,
    id: existing.id,
    type: existing.type,
    position: existing.position,
    tags: [...new Set([...(existing.tags ?? []), ...(incoming.tags ?? [])])],
    images: mergeImages(existing.images ?? [], incoming.images ?? []),
    links: mergeLinks(existing.links ?? [], incoming.links ?? []),
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
    } else if (updateMatches) {
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
    } else if (updateMatches) {
      const existing = relationships.get(plan.targetId);
      if (existing) {
        relationships.set(plan.targetId, mergeNonEmpty(existing, incoming) as StoryRelationship);
        updatedRelationships += 1;
      }
    }
  });

  const next = normalizeScifiProject(normalizeStoryLogic(normalizeProject({
    ...project,
    updatedAt: new Date().toISOString(),
    entities: [...entities.values()],
    relationships: [...relationships.values()],
  })));

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
