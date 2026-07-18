import type { XYPosition } from '@xyflow/react';
import {
  getChapters,
  getSceneChapterResolutions,
  isStoryChapter,
  isStoryScene,
  type ContinuumProject,
  type EntityType,
  type StoryEntity,
} from './model';

const laneByType: Record<EntityType, number> = {
  chapter: 0,
  scene: 1,
  character: 2,
  location: 3,
  organization: 4,
  'plot-thread': 4,
  object: 5,
  fact: 5,
  'world-rule': 5,
};

const laneGap = 300;
const rowGap = 230;
const componentGap = 170;
const leftMargin = 70;
const topMargin = 70;

function connect(adjacency: Map<string, Set<string>>, firstId?: string, secondId?: string) {
  if (!firstId || !secondId || firstId === secondId) return;
  adjacency.get(firstId)?.add(secondId);
  adjacency.get(secondId)?.add(firstId);
}

function entitySort(project: ContinuumProject, adjacency: Map<string, Set<string>>) {
  const chapterOrder = new Map(getChapters(project).map((chapter) => [chapter.id, chapter.chapter.order]));
  const sceneChapters = getSceneChapterResolutions(project);
  return (first: StoryEntity, second: StoryEntity) => {
    if (isStoryChapter(first) && isStoryChapter(second)) return first.chapter.order - second.chapter.order;
    if (isStoryScene(first) && isStoryScene(second)) {
      return (chapterOrder.get(sceneChapters.get(first.id)?.chapterId ?? '') ?? Number.MAX_SAFE_INTEGER)
        - (chapterOrder.get(sceneChapters.get(second.id)?.chapterId ?? '') ?? Number.MAX_SAFE_INTEGER)
        || first.scene.order - second.scene.order;
    }
    const degreeDifference = (adjacency.get(second.id)?.size ?? 0) - (adjacency.get(first.id)?.size ?? 0);
    return degreeDifference || first.name.localeCompare(second.name);
  };
}

export function createWorldLayout(project: ContinuumProject): Record<string, XYPosition> {
  const adjacency = new Map(project.entities.map((entity) => [entity.id, new Set<string>()]));
  const sceneChapters = getSceneChapterResolutions(project);

  for (const relationship of project.relationships) {
    connect(adjacency, relationship.sourceId, relationship.targetId);
  }

  for (const entity of project.entities) {
    if (!isStoryScene(entity)) continue;
    connect(adjacency, sceneChapters.get(entity.id)?.chapterId, entity.id);
    connect(adjacency, entity.id, entity.scene.povCharacterId);
    connect(adjacency, entity.id, entity.scene.locationId);
    entity.scene.participantIds.forEach((characterId) => connect(adjacency, entity.id, characterId));
  }

  const entityById = new Map(project.entities.map((entity) => [entity.id, entity]));
  const visited = new Set<string>();
  const components: StoryEntity[][] = [];

  for (const entity of project.entities) {
    if (visited.has(entity.id)) continue;
    const component: StoryEntity[] = [];
    const queue = [entity.id];
    visited.add(entity.id);

    while (queue.length) {
      const currentId = queue.shift()!;
      const current = entityById.get(currentId);
      if (current) component.push(current);
      for (const neighborId of adjacency.get(currentId) ?? []) {
        if (!visited.has(neighborId)) {
          visited.add(neighborId);
          queue.push(neighborId);
        }
      }
    }
    components.push(component);
  }

  const connectedComponents = components.filter((component) => component.length > 1);
  const isolated = components.filter((component) => component.length === 1).flat();
  if (isolated.length) connectedComponents.push(isolated);

  connectedComponents.sort((first, second) => {
    const firstChapters = first.filter(isStoryChapter).length;
    const secondChapters = second.filter(isStoryChapter).length;
    return secondChapters - firstChapters || second.length - first.length;
  });

  const positions: Record<string, XYPosition> = {};
  const sortEntities = entitySort(project, adjacency);
  let componentOffsetY = topMargin;

  for (const component of connectedComponents) {
    const lanes = new Map<number, StoryEntity[]>();
    for (const entity of component) {
      const lane = laneByType[entity.type];
      const laneEntities = lanes.get(lane) ?? [];
      laneEntities.push(entity);
      lanes.set(lane, laneEntities);
    }

    for (const laneEntities of lanes.values()) laneEntities.sort(sortEntities);
    const maximumRows = Math.max(1, ...Array.from(lanes.values()).map((laneEntities) => laneEntities.length));

    for (const [lane, laneEntities] of lanes.entries()) {
      const centeredStart = componentOffsetY + ((maximumRows - laneEntities.length) * rowGap) / 2;
      laneEntities.forEach((entity, index) => {
        positions[entity.id] = {
          x: leftMargin + lane * laneGap,
          y: centeredStart + index * rowGap,
        };
      });
    }

    componentOffsetY += maximumRows * rowGap + componentGap;
  }

  return positions;
}
