import type { Edge, Node, XYPosition } from '@xyflow/react';
import {
  chapterInheritedPrefix,
  chapterMembershipPrefix,
  getChapterForScene,
  getChapters,
  getScenesForChapter,
  isStoryChapter,
  isStoryScene,
  type ContinuumProject,
  type EntityType,
  type StoryEntity,
  type StoryRelationship,
  type StoryScene,
} from './model';
import {
  isEffectRelationship,
  relationshipKind,
} from './storyLogic';
import {
  isTechnologyEntity,
  presentationOf,
  relationshipDomain,
  sceneAtOrBeforeChapter,
  type WorldLens,
} from './scifi';

export type WorldScope = 'book' | 'chapter' | 'scene' | 'selection';

export interface WorldProjectionOptions {
  lens: WorldLens;
  scope: WorldScope;
  selectedChapterId?: string;
  selectedEntityId?: string;
  showReference: boolean;
  maxNodes: number;
  cutoffChapterId?: string;
  expandedGroups: Set<string>;
}

export interface WorldNodeData extends Record<string, unknown> {
  label: string;
  entityType?: EntityType;
  summary?: string;
  imageUrl?: string;
  linkCount?: number;
  badge?: string;
  importance?: string;
  virtualKind?: 'cluster' | 'chapter-frame' | 'resource';
  groupId?: string;
  count?: number;
  entityId?: string;
}

export interface WorldProjection {
  nodes: Node<WorldNodeData>[];
  edges: Edge[];
  visibleEntityIds: Set<string>;
  hiddenCount: number;
  title: string;
  subtitle: string;
  warnings: string[];
}

const entityLabels: Record<EntityType, string> = {
  chapter: 'Chapter',
  character: 'Character',
  location: 'Location',
  organization: 'Organization',
  object: 'Object',
  'plot-thread': 'Plot thread',
  fact: 'Fact',
  'world-rule': 'World rule',
  scene: 'Scene',
};

const typePlural: Record<EntityType, string> = {
  chapter: 'chapters',
  character: 'characters',
  location: 'locations',
  organization: 'organizations',
  object: 'objects',
  'plot-thread': 'plot threads',
  fact: 'facts',
  'world-rule': 'world rules',
  scene: 'scenes',
};

function entityNode(entity: StoryEntity, position: XYPosition, extra: Partial<Node<WorldNodeData>> = {}): Node<WorldNodeData> {
  return {
    id: entity.id,
    type: 'story',
    position,
    data: {
      label: entity.name,
      entityType: entity.type,
      summary: entity.summary,
      imageUrl: entity.images?.[0]?.thumbnailUrl ?? entity.images?.[0]?.dataUrl,
      linkCount: entity.links?.length ?? 0,
      importance: presentationOf(entity).importance,
      entityId: entity.id,
      badge: entity.type === 'fact'
        ? [entity.fact?.factType, entity.fact?.truthStatus].filter(Boolean).join(' · ')
        : entity.type === 'plot-thread'
          ? entity.plotThread?.status
          : entity.type === 'world-rule'
            ? [entity.worldRule?.category, entity.worldRule?.rigidity].filter(Boolean).join(' · ')
            : isTechnologyEntity(entity)
              ? entity.technology?.domain
              : entity.identityProfile && entity.identityProfile.identityType !== 'human'
                ? entity.identityProfile.identityType
                : undefined,
    },
    draggable: true,
    deletable: false,
    ...extra,
  };
}

function clusterNode(groupId: string, label: string, count: number, position: XYPosition, entityType?: EntityType): Node<WorldNodeData> {
  return {
    id: `cluster:${groupId}`,
    type: 'cluster',
    position,
    draggable: false,
    selectable: true,
    deletable: false,
    data: {
      label,
      count,
      entityType,
      virtualKind: 'cluster',
      groupId,
      summary: 'Click to reveal this group.',
    },
  };
}

function chapterFrame(chapter: StoryEntity, sceneCount: number, position: XYPosition, width: number, height: number): Node<WorldNodeData> {
  return {
    id: chapter.id,
    type: 'chapterFrame',
    position,
    style: { width, height },
    draggable: true,
    deletable: false,
    data: {
      label: chapter.name,
      entityType: 'chapter',
      summary: chapter.summary,
      count: sceneCount,
      virtualKind: 'chapter-frame',
      entityId: chapter.id,
    },
  };
}

function edgeFromRelationship(relationship: StoryRelationship): Edge {
  return {
    id: relationship.id,
    source: relationship.sourceId,
    target: relationship.targetId,
    label: relationship.label,
    type: 'default',
    data: {
      relationshipKind: relationshipKind(relationship),
      semanticDomain: relationshipDomain(relationship),
      virtual: false,
    },
  };
}

function derivedEdge(id: string, source: string, target: string, label: string, domain = 'derived'): Edge {
  return {
    id,
    source,
    target,
    label,
    type: 'default',
    deletable: false,
    selectable: false,
    data: { virtual: true, semanticDomain: domain },
  };
}

function visibleByPresentation(entity: StoryEntity, options: WorldProjectionOptions, directlyRelevant = false): boolean {
  const presentation = presentationOf(entity);
  if (entity.id === options.selectedEntityId) return true;
  if (presentation.visibility === 'hidden') return false;
  if (presentation.visibility === 'always' || presentation.pinned) return true;
  if (presentation.importance === 'reference' && !options.showReference && !directlyRelevant) return false;
  return true;
}

function sceneContextIds(project: ContinuumProject, scenes: StoryScene[]): Set<string> {
  const sceneIds = new Set(scenes.map((scene) => scene.id));
  const ids = new Set<string>(sceneIds);
  scenes.forEach((scene) => {
    if (scene.scene.povCharacterId) ids.add(scene.scene.povCharacterId);
    if (scene.scene.locationId) ids.add(scene.scene.locationId);
    scene.scene.participantIds.forEach((id) => ids.add(id));
    if (scene.scene.travel?.originId) ids.add(scene.scene.travel.originId);
    if (scene.scene.travel?.destinationId) ids.add(scene.scene.travel.destinationId);
  });
  project.relationships.forEach((relationship) => {
    if (relationship.sceneId && sceneIds.has(relationship.sceneId)) {
      ids.add(relationship.sourceId);
      ids.add(relationship.targetId);
    }
    if (sceneIds.has(relationship.sourceId)) ids.add(relationship.targetId);
    if (sceneIds.has(relationship.targetId)) ids.add(relationship.sourceId);
  });
  return ids;
}

function entityScore(entity: StoryEntity, directIds: Set<string>, selectedEntityId?: string): number {
  let score = entity.id === selectedEntityId ? 1000 : 0;
  if (directIds.has(entity.id)) score += 200;
  const presentation = presentationOf(entity);
  if (presentation.visibility === 'always' || presentation.pinned) score += 180;
  if (presentation.importance === 'core') score += 80;
  if (presentation.importance === 'supporting') score += 40;
  if (entity.type === 'character' || entity.type === 'plot-thread') score += 20;
  return score;
}

function capEntities(
  entities: StoryEntity[],
  directIds: Set<string>,
  options: WorldProjectionOptions,
  reservedNodes: number,
): { visible: StoryEntity[]; hidden: StoryEntity[] } {
  const limit = Math.max(0, options.maxNodes - reservedNodes);
  const candidates = entities
    .filter((entity) => visibleByPresentation(entity, options, directIds.has(entity.id)))
    .sort((first, second) => entityScore(second, directIds, options.selectedEntityId) - entityScore(first, directIds, options.selectedEntityId) || first.name.localeCompare(second.name));
  return { visible: candidates.slice(0, limit), hidden: candidates.slice(limit) };
}

function addHiddenClusters(
  nodes: Node<WorldNodeData>[],
  hidden: StoryEntity[],
  options: WorldProjectionOptions,
  startX: number,
  startY: number,
  prefix: string,
): StoryEntity[] {
  const expanded: StoryEntity[] = [];
  const groups = new Map<EntityType, StoryEntity[]>();
  hidden.forEach((entity) => groups.set(entity.type, [...(groups.get(entity.type) ?? []), entity]));
  let index = 0;
  for (const [type, entities] of groups.entries()) {
    const groupId = `${prefix}:${type}`;
    if (options.expandedGroups.has(groupId)) {
      expanded.push(...entities);
      continue;
    }
    nodes.push(clusterNode(groupId, `+${entities.length} ${typePlural[type]}`, entities.length, {
      x: startX + (index % 3) * 220,
      y: startY + Math.floor(index / 3) * 100,
    }, type));
    index += 1;
  }
  return expanded;
}

function relationshipEdgesAmong(project: ContinuumProject, visibleIds: Set<string>): Edge[] {
  return project.relationships
    .filter((relationship) => visibleIds.has(relationship.sourceId) && visibleIds.has(relationship.targetId))
    .map(edgeFromRelationship);
}

function storyBookProjection(project: ContinuumProject, options: WorldProjectionOptions): WorldProjection {
  const nodes: Node<WorldNodeData>[] = [];
  const edges: Edge[] = [];
  const chapters = getChapters(project);
  const visibleEntityIds = new Set<string>();
  let rowY = 60;
  const rowWidth = 1780;
  let rowX = 60;
  let rowHeight = 0;

  for (const chapter of chapters) {
    const scenes = getScenesForChapter(project, chapter.id);
    const columns = Math.min(3, Math.max(1, scenes.length));
    const rows = Math.max(1, Math.ceil(scenes.length / columns));
    const width = columns * 235 + 45;
    const height = rows * 155 + 92;
    if (rowX + width > rowWidth) {
      rowX = 60;
      rowY += rowHeight + 80;
      rowHeight = 0;
    }
    nodes.push(chapterFrame(chapter, scenes.length, { x: rowX, y: rowY }, width, height));
    visibleEntityIds.add(chapter.id);
    scenes.forEach((scene, index) => {
      nodes.push(entityNode(scene, {
        x: 20 + (index % columns) * 235,
        y: 66 + Math.floor(index / columns) * 155,
      }, {
        parentId: chapter.id,
        extent: 'parent',
        draggable: true,
      }));
      visibleEntityIds.add(scene.id);
    });
    rowX += width + 80;
    rowHeight = Math.max(rowHeight, height);
  }

  const threadIds = new Set<string>();
  project.relationships.forEach((relationship) => {
    if (relationshipKind(relationship) === 'scene-thread') threadIds.add(relationship.targetId);
  });
  const threads = project.entities
    .filter((entity) => entity.type === 'plot-thread' && threadIds.has(entity.id))
    .filter((entity) => visibleByPresentation(entity, options, true));
  const threadX = 1880;
  threads.slice(0, 12).forEach((thread, index) => {
    nodes.push(entityNode(thread, { x: threadX, y: 80 + index * 150 }));
    visibleEntityIds.add(thread.id);
  });

  for (const chapter of chapters) {
    const sceneIds = new Set(getScenesForChapter(project, chapter.id).map((scene) => scene.id));
    const counts = new Map<string, number>();
    project.relationships.forEach((relationship) => {
      if (relationshipKind(relationship) === 'scene-thread' && relationship.sceneId && sceneIds.has(relationship.sceneId) && visibleEntityIds.has(relationship.targetId)) {
        counts.set(relationship.targetId, (counts.get(relationship.targetId) ?? 0) + 1);
      }
    });
    counts.forEach((count, threadId) => edges.push(derivedEdge(`bundle:${chapter.id}:${threadId}`, chapter.id, threadId, `${count} thread beat${count === 1 ? '' : 's'}`, 'story')));
  }

  const relatedIds = sceneContextIds(project, project.entities.filter(isStoryScene));
  const hiddenContext = project.entities.filter((entity) => relatedIds.has(entity.id) && !visibleEntityIds.has(entity.id) && entity.type !== 'chapter' && entity.type !== 'scene' && entity.type !== 'plot-thread');
  addHiddenClusters(nodes, hiddenContext, options, 1880, 80 + Math.min(12, threads.length) * 150 + 30, 'book');

  return {
    nodes,
    edges,
    visibleEntityIds,
    hiddenCount: Math.max(0, project.entities.length - visibleEntityIds.size),
    title: 'Book story map',
    subtitle: 'Chapters contain scenes. Supporting world data stays collapsed until a narrower scope needs it.',
    warnings: [],
  };
}

function storyFocusedProjection(project: ContinuumProject, options: WorldProjectionOptions): WorldProjection {
  const chapters = getChapters(project);
  let scenes: StoryScene[] = [];
  let title = 'Focused story map';
  if (options.scope === 'chapter') {
    const chapter = chapters.find((candidate) => candidate.id === options.selectedChapterId) ?? chapters[0];
    scenes = chapter ? getScenesForChapter(project, chapter.id) : [];
    title = chapter?.name ?? 'Chapter story map';
  } else if (options.scope === 'scene') {
    const selected = project.entities.find((entity): entity is StoryScene => entity.id === options.selectedEntityId && isStoryScene(entity));
    scenes = selected ? [selected] : [];
    title = selected?.name ?? 'Select a scene';
  } else {
    const selected = project.entities.find((entity) => entity.id === options.selectedEntityId);
    if (selected && isStoryScene(selected)) scenes = [selected];
    else if (selected && isStoryChapter(selected)) scenes = getScenesForChapter(project, selected.id);
    else {
      const relatedSceneIds = new Set<string>();
      project.relationships.forEach((relationship) => {
        if (relationship.sourceId === selected?.id && project.entities.some((entity) => entity.id === relationship.targetId && isStoryScene(entity))) relatedSceneIds.add(relationship.targetId);
        if (relationship.targetId === selected?.id && project.entities.some((entity) => entity.id === relationship.sourceId && isStoryScene(entity))) relatedSceneIds.add(relationship.sourceId);
        if (relationship.sceneId && (relationship.sourceId === selected?.id || relationship.targetId === selected?.id)) relatedSceneIds.add(relationship.sceneId);
      });
      scenes = project.entities.filter((entity): entity is StoryScene => isStoryScene(entity) && relatedSceneIds.has(entity.id));
    }
    title = selected ? `${selected.name} context` : 'Select an entity';
  }

  const directIds = sceneContextIds(project, scenes);
  if (options.selectedEntityId) directIds.add(options.selectedEntityId);
  const structuralCount = scenes.length + (options.scope === 'chapter' ? 1 : 0);
  const candidates = project.entities.filter((entity) => !directIds.has(entity.id) ? false : entity.type !== 'chapter' && entity.type !== 'scene');
  const { visible, hidden } = capEntities(candidates, directIds, options, structuralCount);
  const nodes: Node<WorldNodeData>[] = [];
  const edges: Edge[] = [];
  const visibleEntityIds = new Set<string>();

  let sceneOriginX = 80;
  if (options.scope === 'chapter') {
    const chapter = chapters.find((candidate) => candidate.id === options.selectedChapterId) ?? (scenes[0] ? getChapterForScene(project, scenes[0]) : undefined);
    if (chapter) {
      const columns = Math.min(3, Math.max(1, scenes.length));
      const rows = Math.max(1, Math.ceil(scenes.length / columns));
      const width = columns * 235 + 45;
      const height = rows * 155 + 92;
      nodes.push(chapterFrame(chapter, scenes.length, { x: 60, y: 80 }, width, height));
      visibleEntityIds.add(chapter.id);
      scenes.forEach((scene, index) => {
        nodes.push(entityNode(scene, { x: 20 + (index % columns) * 235, y: 66 + Math.floor(index / columns) * 155 }, { parentId: chapter.id, extent: 'parent' }));
        visibleEntityIds.add(scene.id);
      });
      sceneOriginX = 60 + width + 100;
    }
  } else {
    scenes.forEach((scene, index) => {
      nodes.push(entityNode(scene, { x: 380, y: 120 + index * 180 }));
      visibleEntityIds.add(scene.id);
    });
    sceneOriginX = 720;
  }

  const lanes: Array<{ types: EntityType[]; x: number }> = [
    { types: ['character', 'organization'], x: sceneOriginX },
    { types: ['location', 'object'], x: sceneOriginX + 270 },
    { types: ['plot-thread', 'fact', 'world-rule'], x: sceneOriginX + 540 },
  ];
  lanes.forEach((lane) => {
    const laneEntities = visible.filter((entity) => lane.types.includes(entity.type));
    laneEntities.forEach((entity, index) => {
      nodes.push(entityNode(entity, { x: lane.x, y: 80 + index * 145 }));
      visibleEntityIds.add(entity.id);
    });
  });

  const expanded = addHiddenClusters(nodes, hidden, options, sceneOriginX, 80 + Math.max(visible.length, 2) * 145 + 30, `story:${options.scope}`);
  expanded.slice(0, Math.max(0, options.maxNodes - nodes.length)).forEach((entity, index) => {
    nodes.push(entityNode(entity, { x: sceneOriginX + (index % 3) * 270, y: 420 + Math.floor(index / 3) * 145 }));
    visibleEntityIds.add(entity.id);
  });

  edges.push(...relationshipEdgesAmong(project, visibleEntityIds));
  scenes.forEach((scene) => {
    if (scene.scene.povCharacterId && visibleEntityIds.has(scene.scene.povCharacterId)) edges.push(derivedEdge(`derived:pov:${scene.id}`, scene.id, scene.scene.povCharacterId, 'POV', 'story'));
    if (scene.scene.locationId && visibleEntityIds.has(scene.scene.locationId)) edges.push(derivedEdge(`derived:location:${scene.id}`, scene.id, scene.scene.locationId, 'occurs at', 'geography'));
    scene.scene.participantIds.forEach((characterId) => {
      if (characterId !== scene.scene.povCharacterId && visibleEntityIds.has(characterId)) edges.push(derivedEdge(`derived:cast:${scene.id}:${characterId}`, scene.id, characterId, 'includes', 'story'));
    });
  });

  return {
    nodes,
    edges,
    visibleEntityIds,
    hiddenCount: hidden.length,
    title,
    subtitle: scenes.length ? `${scenes.length} scene${scenes.length === 1 ? '' : 's'} with only directly relevant story entities.` : 'Choose a chapter, scene, or entity to build a focused map.',
    warnings: [],
  };
}

function geographyProjection(project: ContinuumProject, options: WorldProjectionOptions): WorldProjection {
  const allLocations = project.entities.filter((entity) => entity.type === 'location');
  const regions = allLocations.filter((entity) => entity.locationProfile?.kind === 'region');
  const sceneLocations = new Set<string>();
  const scopedScenes = options.scope === 'chapter'
    ? getScenesForChapter(project, options.selectedChapterId)
    : options.scope === 'scene'
      ? project.entities.filter((entity): entity is StoryScene => entity.id === options.selectedEntityId && isStoryScene(entity))
      : project.entities.filter(isStoryScene);
  scopedScenes.forEach((scene) => {
    if (scene.scene.locationId) sceneLocations.add(scene.scene.locationId);
    if (scene.scene.travel?.originId) sceneLocations.add(scene.scene.travel.originId);
    if (scene.scene.travel?.destinationId) sceneLocations.add(scene.scene.travel.destinationId);
  });
  if (options.selectedEntityId) sceneLocations.add(options.selectedEntityId);

  const parentByChild = new Map<string, string>();
  allLocations.forEach((location) => {
    if (location.locationProfile?.parentLocationId) parentByChild.set(location.id, location.locationProfile.parentLocationId);
  });
  project.relationships.forEach((relationship) => {
    const source = project.entities.find((entity) => entity.id === relationship.sourceId);
    const target = project.entities.find((entity) => entity.id === relationship.targetId);
    if (source?.type === 'location' && target?.type === 'location' && /(contains|includes|within|part of)/i.test(relationship.label)) parentByChild.set(target.id, source.id);
  });

  const nodes: Node<WorldNodeData>[] = [];
  const edges: Edge[] = [];
  const visibleEntityIds = new Set<string>();
  const sortedRegions = regions.filter((region) => visibleByPresentation(region, options, sceneLocations.has(region.id))).sort((a, b) => a.name.localeCompare(b.name));
  sortedRegions.forEach((region, index) => {
    const x = 70 + (index % 4) * 390;
    const y = 70 + Math.floor(index / 4) * 290;
    nodes.push(entityNode(region, { x, y }));
    visibleEntityIds.add(region.id);
    const children = allLocations.filter((location) => parentByChild.get(location.id) === region.id);
    const directlyRelevant = children.filter((child) => sceneLocations.has(child.id) || presentationOf(child).visibility === 'always' || presentationOf(child).pinned);
    const groupId = `geo:${region.id}`;
    const expanded = options.expandedGroups.has(groupId) || options.selectedEntityId === region.id;
    const visibleChildren = expanded
      ? children.filter((child) => visibleByPresentation(child, options, sceneLocations.has(child.id))).slice(0, 24)
      : directlyRelevant.slice(0, 5);
    visibleChildren.forEach((child, childIndex) => {
      nodes.push(entityNode(child, { x: x + 210 + (childIndex % 2) * 220, y: y - 20 + Math.floor(childIndex / 2) * 120 }));
      visibleEntityIds.add(child.id);
      edges.push(derivedEdge(`geo-parent:${region.id}:${child.id}`, region.id, child.id, 'contains', 'geography'));
    });
    const hidden = children.length - visibleChildren.length;
    if (hidden > 0) nodes.push(clusterNode(groupId, `+${hidden} locations in ${region.name}`, hidden, { x: x + 15, y: y + 135 }, 'location'));
  });

  const standalone = allLocations.filter((location) => !parentByChild.has(location.id) && !regions.some((region) => region.id === location.id));
  const standaloneVisible = standalone.filter((location) => sceneLocations.has(location.id) || presentationOf(location).visibility === 'always' || presentationOf(location).pinned || options.showReference);
  standaloneVisible.slice(0, Math.max(0, options.maxNodes - nodes.length)).forEach((location, index) => {
    nodes.push(entityNode(location, { x: 70 + (index % 5) * 260, y: 980 + Math.floor(index / 5) * 145 }));
    visibleEntityIds.add(location.id);
  });

  project.relationships.forEach((relationship) => {
    if (!visibleEntityIds.has(relationship.sourceId) || !visibleEntityIds.has(relationship.targetId)) return;
    const domain = relationshipDomain(relationship);
    if (domain === 'travel' || /(maglev|route|connect|serves|contains)/i.test(relationship.label)) edges.push(edgeFromRelationship(relationship));
  });
  scopedScenes.forEach((scene) => {
    const travel = scene.scene.travel;
    if (travel?.originId && travel.destinationId && visibleEntityIds.has(travel.originId) && visibleEntityIds.has(travel.destinationId)) {
      edges.push(derivedEdge(`travel:${scene.id}`, travel.originId, travel.destinationId, travel.mode || 'travels', 'travel'));
    }
  });

  return {
    nodes,
    edges,
    visibleEntityIds,
    hiddenCount: Math.max(0, allLocations.length - visibleEntityIds.size),
    title: 'Geography and travel',
    subtitle: 'Regions remain compact. Expand only the region or route you are actively inspecting.',
    warnings: allLocations.length > options.maxNodes ? ['Reference locations are intentionally collapsed to keep the map readable.'] : [],
  };
}

function contextForScope(project: ContinuumProject, options: WorldProjectionOptions): Set<string> {
  if (options.scope === 'chapter') return sceneContextIds(project, getScenesForChapter(project, options.selectedChapterId));
  if (options.scope === 'scene') {
    const scene = project.entities.find((entity): entity is StoryScene => entity.id === options.selectedEntityId && isStoryScene(entity));
    return scene ? sceneContextIds(project, [scene]) : new Set();
  }
  if (options.scope === 'selection' && options.selectedEntityId) {
    const ids = new Set<string>([options.selectedEntityId]);
    project.relationships.forEach((relationship) => {
      if (relationship.sourceId === options.selectedEntityId) ids.add(relationship.targetId);
      if (relationship.targetId === options.selectedEntityId) ids.add(relationship.sourceId);
    });
    return ids;
  }
  return new Set(project.entities.map((entity) => entity.id));
}

function powerProjection(project: ContinuumProject, options: WorldProjectionOptions): WorldProjection {
  const contextIds = contextForScope(project, options);
  const powerRelationships = project.relationships.filter((relationship) => relationshipDomain(relationship) === 'power');
  const relatedIds = new Set<string>();
  powerRelationships.forEach((relationship) => {
    if (options.scope === 'book' || contextIds.has(relationship.sourceId) || contextIds.has(relationship.targetId)) {
      relatedIds.add(relationship.sourceId);
      relatedIds.add(relationship.targetId);
    }
  });
  project.entities.filter((entity) => entity.type === 'organization').forEach((organization) => {
    if (options.scope === 'book' || contextIds.has(organization.id) || presentationOf(organization).visibility === 'always') relatedIds.add(organization.id);
  });
  if (options.selectedEntityId) relatedIds.add(options.selectedEntityId);

  const candidates = project.entities.filter((entity) => relatedIds.has(entity.id));
  const { visible, hidden } = capEntities(candidates, contextIds, options, 0);
  const nodes: Node<WorldNodeData>[] = [];
  const visibleEntityIds = new Set<string>();
  const lanes: Array<{ predicate: (entity: StoryEntity) => boolean; x: number }> = [
    { predicate: (entity) => entity.type === 'organization', x: 80 },
    { predicate: (entity) => entity.type === 'location', x: 450 },
    { predicate: (entity) => isTechnologyEntity(entity) || entity.type === 'object', x: 820 },
    { predicate: (entity) => entity.type === 'character' || entity.type === 'fact' || entity.type === 'world-rule', x: 1190 },
  ];
  lanes.forEach((lane) => {
    const laneEntities = visible.filter(lane.predicate);
    laneEntities.forEach((entity, index) => {
      nodes.push(entityNode(entity, { x: lane.x, y: 70 + index * 145 }));
      visibleEntityIds.add(entity.id);
      if (entity.type === 'organization') {
        (entity.organizationProfile?.controlledResources ?? []).slice(0, 4).forEach((resource, resourceIndex) => {
          const id = `resource:${entity.id}:${resourceIndex}`;
          nodes.push({
            id,
            type: 'cluster',
            position: { x: lane.x + 225, y: 80 + index * 145 + resourceIndex * 45 },
            draggable: false,
            selectable: false,
            deletable: false,
            data: { label: resource, virtualKind: 'resource', summary: 'Controlled resource' },
          });
          edges.push(derivedEdge(`resource-edge:${entity.id}:${resourceIndex}`, entity.id, id, 'controls', 'power'));
        });
      }
    });
  });
  const edges = powerRelationships.filter((relationship) => visibleEntityIds.has(relationship.sourceId) && visibleEntityIds.has(relationship.targetId)).map(edgeFromRelationship);
  const expanded = addHiddenClusters(nodes, hidden, options, 80, 70 + Math.max(visible.length, 3) * 145, 'power');
  expanded.slice(0, Math.max(0, options.maxNodes - nodes.length)).forEach((entity, index) => {
    nodes.push(entityNode(entity, { x: 80 + (index % 4) * 320, y: 600 + Math.floor(index / 4) * 145 }));
    visibleEntityIds.add(entity.id);
  });

  return {
    nodes,
    edges,
    visibleEntityIds,
    hiddenCount: hidden.length,
    title: 'Power and resource control',
    subtitle: 'Organizations are separated from the places, systems, resources, and people they control or depend on.',
    warnings: powerRelationships.length ? [] : ['Add structured power relationships from an organization inspector, or label existing edges with actions such as controls, operates, supplies, or surveils.'],
  };
}

function knowledgeProjection(project: ContinuumProject, options: WorldProjectionOptions): WorldProjection {
  const contextIds = contextForScope(project, options);
  const cutoff = options.cutoffChapterId ?? options.selectedChapterId;
  const knowledgeRelationships = project.relationships.filter((relationship) => {
    const kind = relationshipKind(relationship);
    const relevantKind = kind === 'scene-fact' || kind === 'character-fact' || relationshipDomain(relationship) === 'evidence';
    return relevantKind && sceneAtOrBeforeChapter(project, relationship.sceneId, cutoff);
  });
  const relatedIds = new Set<string>();
  knowledgeRelationships.forEach((relationship) => {
    if (options.scope === 'book' || contextIds.has(relationship.sourceId) || contextIds.has(relationship.targetId) || (relationship.sceneId && contextIds.has(relationship.sceneId))) {
      relatedIds.add(relationship.sourceId);
      relatedIds.add(relationship.targetId);
      if (relationship.sceneId) relatedIds.add(relationship.sceneId);
    }
  });
  project.entities.filter((entity) => entity.type === 'fact' && (options.scope === 'book' || contextIds.has(entity.id))).forEach((fact) => relatedIds.add(fact.id));
  if (options.selectedEntityId) relatedIds.add(options.selectedEntityId);

  const candidates = project.entities.filter((entity) => relatedIds.has(entity.id));
  const { visible, hidden } = capEntities(candidates, contextIds, options, 0);
  const nodes: Node<WorldNodeData>[] = [];
  const visibleEntityIds = new Set<string>();
  const lanes: Array<{ types: EntityType[]; x: number }> = [
    { types: ['scene', 'object', 'location', 'organization'], x: 70 },
    { types: ['fact'], x: 480 },
    { types: ['character'], x: 900 },
    { types: ['plot-thread', 'world-rule'], x: 1250 },
  ];
  lanes.forEach((lane) => {
    const laneEntities = visible.filter((entity) => lane.types.includes(entity.type));
    laneEntities.forEach((entity, index) => {
      nodes.push(entityNode(entity, { x: lane.x, y: 70 + index * 150 }));
      visibleEntityIds.add(entity.id);
    });
  });
  const edges = knowledgeRelationships
    .filter((relationship) => visibleEntityIds.has(relationship.sourceId) && visibleEntityIds.has(relationship.targetId))
    .map(edgeFromRelationship);
  knowledgeRelationships.forEach((relationship) => {
    if (relationship.sceneId && visibleEntityIds.has(relationship.sceneId) && visibleEntityIds.has(relationship.targetId) && relationship.sourceId !== relationship.sceneId) {
      edges.push(derivedEdge(`knowledge-scene:${relationship.id}`, relationship.sceneId, relationship.targetId, 'changes here', 'knowledge'));
    }
  });
  const expanded = addHiddenClusters(nodes, hidden, options, 480, 70 + Math.max(visible.length, 3) * 150, 'knowledge');
  expanded.slice(0, Math.max(0, options.maxNodes - nodes.length)).forEach((entity, index) => {
    nodes.push(entityNode(entity, { x: 480 + (index % 3) * 320, y: 650 + Math.floor(index / 3) * 150 }));
    visibleEntityIds.add(entity.id);
  });

  return {
    nodes,
    edges,
    visibleEntityIds,
    hiddenCount: hidden.length,
    title: 'Knowledge and evidence',
    subtitle: cutoff ? `Showing evidence, beliefs, and reader-facing revelations through ${getChapters(project).find((chapter) => chapter.id === cutoff)?.name ?? 'the selected cutoff'}.` : 'Sources lead to claims and facts; characters and the reader acquire knowledge over time.',
    warnings: knowledgeRelationships.length ? [] : ['Add Fact movement, Knowledge change, or evidence relationships to populate this lens.'],
  };
}

function technologyProjection(project: ContinuumProject, options: WorldProjectionOptions): WorldProjection {
  const contextIds = contextForScope(project, options);
  const technologyEntities = project.entities.filter(isTechnologyEntity);
  const technologyIds = new Set(technologyEntities.map((entity) => entity.id));
  const technologyRelationships = project.relationships.filter((relationship) => relationshipDomain(relationship) === 'technology' || technologyIds.has(relationship.sourceId) || technologyIds.has(relationship.targetId));
  const relatedIds = new Set<string>();
  technologyEntities.forEach((entity) => {
    if (options.scope === 'book' || contextIds.has(entity.id) || presentationOf(entity).visibility === 'always' || presentationOf(entity).pinned) relatedIds.add(entity.id);
  });
  technologyRelationships.forEach((relationship) => {
    if (options.scope === 'book' || contextIds.has(relationship.sourceId) || contextIds.has(relationship.targetId) || relatedIds.has(relationship.sourceId) || relatedIds.has(relationship.targetId)) {
      relatedIds.add(relationship.sourceId);
      relatedIds.add(relationship.targetId);
    }
  });
  if (options.selectedEntityId) relatedIds.add(options.selectedEntityId);
  const candidates = project.entities.filter((entity) => relatedIds.has(entity.id));
  const { visible, hidden } = capEntities(candidates, contextIds, options, 0);
  const nodes: Node<WorldNodeData>[] = [];
  const visibleEntityIds = new Set<string>();
  const lanes: Array<{ predicate: (entity: StoryEntity) => boolean; x: number }> = [
    { predicate: (entity) => entity.type === 'organization' || entity.type === 'object' && !isTechnologyEntity(entity), x: 70 },
    { predicate: (entity) => isTechnologyEntity(entity), x: 500 },
    { predicate: (entity) => entity.type === 'location' || entity.type === 'scene', x: 930 },
    { predicate: (entity) => entity.type === 'fact' || entity.type === 'world-rule' || entity.type === 'character', x: 1280 },
  ];
  lanes.forEach((lane) => {
    const laneEntities = visible.filter(lane.predicate);
    laneEntities.forEach((entity, index) => {
      nodes.push(entityNode(entity, { x: lane.x, y: 70 + index * 155 }));
      visibleEntityIds.add(entity.id);
    });
  });
  const edges = technologyRelationships.filter((relationship) => visibleEntityIds.has(relationship.sourceId) && visibleEntityIds.has(relationship.targetId)).map(edgeFromRelationship);
  const expanded = addHiddenClusters(nodes, hidden, options, 500, 70 + Math.max(visible.length, 3) * 155, 'technology');
  expanded.slice(0, Math.max(0, options.maxNodes - nodes.length)).forEach((entity, index) => {
    nodes.push(entityNode(entity, { x: 500 + (index % 3) * 340, y: 650 + Math.floor(index / 3) * 155 }));
    visibleEntityIds.add(entity.id);
  });

  return {
    nodes,
    edges,
    visibleEntityIds,
    hiddenCount: hidden.length,
    title: 'Technology and system dependencies',
    subtitle: 'Systems sit between their operators, inputs, environments, outputs, limits, and failure conditions.',
    warnings: technologyEntities.length ? [] : ['Track an Object as a Technology/System in its inspector to populate this lens.'],
  };
}

export function buildWorldProjection(project: ContinuumProject, options: WorldProjectionOptions): WorldProjection {
  if (options.lens === 'geography') return geographyProjection(project, options);
  if (options.lens === 'power') return powerProjection(project, options);
  if (options.lens === 'knowledge') return knowledgeProjection(project, options);
  if (options.lens === 'technology') return technologyProjection(project, options);
  return options.scope === 'book' ? storyBookProjection(project, options) : storyFocusedProjection(project, options);
}

export function isVirtualEdge(edgeId: string): boolean {
  return edgeId.startsWith('bundle:')
    || edgeId.startsWith('derived:')
    || edgeId.startsWith('geo-parent:')
    || edgeId.startsWith('resource-edge:')
    || edgeId.startsWith('knowledge-scene:')
    || edgeId.startsWith('travel:');
}

export function isChapterEdge(edgeId: string): boolean {
  return edgeId.startsWith(chapterMembershipPrefix) || edgeId.startsWith(chapterInheritedPrefix);
}
