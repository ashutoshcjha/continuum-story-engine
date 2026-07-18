import Dexie, { type EntityTable } from 'dexie';
import type { ContinuumProject } from './model';

interface StoredProject {
  id: string;
  updatedAt: string;
  data: ContinuumProject;
}

const database = new Dexie('continuum-story-engine') as Dexie & {
  projects: EntityTable<StoredProject, 'id'>;
};

database.version(1).stores({
  projects: 'id, updatedAt',
});

export async function saveLocalProject(project: ContinuumProject): Promise<void> {
  await database.projects.put({ id: project.id, updatedAt: project.updatedAt, data: project });
  localStorage.setItem('continuum:last-project-id', project.id);
}

export async function loadLastLocalProject(): Promise<ContinuumProject | undefined> {
  const lastId = localStorage.getItem('continuum:last-project-id');
  if (lastId) return (await database.projects.get(lastId))?.data;
  const newest = await database.projects.orderBy('updatedAt').last();
  return newest?.data;
}
