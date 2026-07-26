import Dexie, { type EntityTable } from 'dexie';
import type { ContinuumProject } from './model';

interface StoredProject {
  id: string;
  updatedAt: string;
  data: ContinuumProject;
}

export interface AppendRollbackSnapshot {
  id: 'last-append';
  projectId: string;
  label: string;
  sourceFileName: string;
  createdAt: string;
  data: ContinuumProject;
}

const database = new Dexie('continuum-story-engine') as Dexie & {
  projects: EntityTable<StoredProject, 'id'>;
  appendSnapshots: EntityTable<AppendRollbackSnapshot, 'id'>;
};

database.version(1).stores({
  projects: 'id, updatedAt',
});

database.version(2).stores({
  projects: 'id, updatedAt',
  appendSnapshots: 'id, projectId, createdAt',
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

export async function saveAppendRollbackSnapshot(
  project: ContinuumProject,
  label: string,
  sourceFileName: string,
): Promise<AppendRollbackSnapshot> {
  const snapshot: AppendRollbackSnapshot = {
    id: 'last-append',
    projectId: project.id,
    label,
    sourceFileName,
    createdAt: new Date().toISOString(),
    data: project,
  };
  await database.appendSnapshots.put(snapshot);
  return snapshot;
}

export async function loadAppendRollbackSnapshot(): Promise<AppendRollbackSnapshot | undefined> {
  return database.appendSnapshots.get('last-append');
}

export async function clearAppendRollbackSnapshot(): Promise<void> {
  await database.appendSnapshots.delete('last-append');
}
