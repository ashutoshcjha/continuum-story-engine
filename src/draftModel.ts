import type { ContinuumProject } from './model';

declare module './model' {
  interface ChapterDetails {
    draft?: string;
  }

  interface SceneDetails {
    draft?: string;
  }
}

export function normalizeDraftFields(project: ContinuumProject): ContinuumProject {
  return {
    ...project,
    entities: project.entities.map((entity) => {
      if (entity.type === 'chapter' && entity.chapter) {
        return { ...entity, chapter: { ...entity.chapter, draft: entity.chapter.draft ?? '' } };
      }
      if (entity.type === 'scene' && entity.scene) {
        return { ...entity, scene: { ...entity.scene, draft: entity.scene.draft ?? '' } };
      }
      return entity;
    }),
  };
}
