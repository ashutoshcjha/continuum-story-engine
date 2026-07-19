import {
  getScenesForChapter,
  type ContinuumProject,
  type StoryEntity,
} from './model';
import { presentationOf, relationshipDomain } from './scifi';
import { relationshipKind } from './storyLogic';

export function getFocusedChapterEntities(project: ContinuumProject, chapterId: string): StoryEntity[] {
  const scenes = getScenesForChapter(project, chapterId);
  const sceneIds = new Set(scenes.map((scene) => scene.id));
  const primaryIds = new Set<string>([chapterId, ...sceneIds]);

  for (const scene of scenes) {
    if (scene.scene.povCharacterId) primaryIds.add(scene.scene.povCharacterId);
    if (scene.scene.locationId) primaryIds.add(scene.scene.locationId);
    scene.scene.participantIds.forEach((participantId) => primaryIds.add(participantId));
    if (scene.scene.travel?.originId) primaryIds.add(scene.scene.travel.originId);
    if (scene.scene.travel?.destinationId) primaryIds.add(scene.scene.travel.destinationId);
  }

  for (const relationship of project.relationships) {
    if (relationship.sceneId && sceneIds.has(relationship.sceneId)) {
      primaryIds.add(relationship.sourceId);
      primaryIds.add(relationship.targetId);
      continue;
    }
    if (sceneIds.has(relationship.sourceId) || relationship.sourceId === chapterId) primaryIds.add(relationship.targetId);
    if (sceneIds.has(relationship.targetId) || relationship.targetId === chapterId) primaryIds.add(relationship.sourceId);
  }

  const relatedIds = new Set(primaryIds);
  for (const relationship of project.relationships) {
    const sourceIsPrimary = primaryIds.has(relationship.sourceId);
    const targetIsPrimary = primaryIds.has(relationship.targetId);
    if (sourceIsPrimary === targetIsPrimary) continue;
    const candidateId = sourceIsPrimary ? relationship.targetId : relationship.sourceId;
    const candidate = project.entities.find((entity) => entity.id === candidateId);
    if (!candidate) continue;
    const presentation = presentationOf(candidate);
    const structured = relationshipKind(relationship) !== 'custom' || Boolean(relationshipDomain(relationship));
    if (presentation.visibility === 'always' || presentation.pinned || presentation.importance !== 'reference' || structured) {
      relatedIds.add(candidateId);
    }
  }

  return project.entities.filter((entity) => relatedIds.has(entity.id));
}
