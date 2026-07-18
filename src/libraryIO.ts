import {
  createEntity,
  type ContinuumProject,
  type EntityType,
  type ExternalLink,
  type StoryEntity,
} from './model';

export const libraryEntityTypes = [
  'character',
  'location',
  'organization',
  'object',
  'plot-thread',
  'fact',
  'world-rule',
] as const;

export type LibraryEntityType = (typeof libraryEntityTypes)[number];

export const libraryTypeLabels: Record<LibraryEntityType, { singular: string; plural: string }> = {
  character: { singular: 'Character', plural: 'Characters' },
  location: { singular: 'Location', plural: 'Locations' },
  organization: { singular: 'Organization', plural: 'Organizations' },
  object: { singular: 'Object', plural: 'Objects' },
  'plot-thread': { singular: 'Plot thread', plural: 'Plot threads' },
  fact: { singular: 'Fact', plural: 'Facts' },
  'world-rule': { singular: 'World rule', plural: 'World rules' },
};

export interface ParsedLibraryRecord {
  sourceRow: number;
  id?: string;
  type?: LibraryEntityType;
  rawType?: string;
  name: string;
  summary?: string;
  notes?: string;
  tags?: string[];
  links?: Array<{ label: string; url: string }>;
}

export type LibraryImportStatus = 'new' | 'update' | 'invalid';

export interface LibraryImportCandidate {
  key: string;
  record: ParsedLibraryRecord;
  status: LibraryImportStatus;
  existingId?: string;
  issue?: string;
}

export interface LibraryImportResult {
  project: ContinuumProject;
  added: number;
  updated: number;
  skipped: number;
}

export function isLibraryEntityType(type: EntityType | string): type is LibraryEntityType {
  return (libraryEntityTypes as readonly string[]).includes(type);
}

const typeAliases: Record<string, LibraryEntityType> = {
  character: 'character',
  characters: 'character',
  person: 'character',
  people: 'character',
  location: 'location',
  locations: 'location',
  place: 'location',
  places: 'location',
  organization: 'organization',
  organizations: 'organization',
  organisation: 'organization',
  organisations: 'organization',
  faction: 'organization',
  factions: 'organization',
  object: 'object',
  objects: 'object',
  artifact: 'object',
  artifacts: 'object',
  item: 'object',
  items: 'object',
  plot: 'plot-thread',
  plots: 'plot-thread',
  'plot-thread': 'plot-thread',
  'plot-threads': 'plot-thread',
  plotthread: 'plot-thread',
  plotthreads: 'plot-thread',
  thread: 'plot-thread',
  threads: 'plot-thread',
  fact: 'fact',
  facts: 'fact',
  'world-rule': 'world-rule',
  'world-rules': 'world-rule',
  worldrule: 'world-rule',
  worldrules: 'world-rule',
  rule: 'world-rule',
  rules: 'world-rule',
};

function normalizeType(value: unknown, fallback?: LibraryEntityType): LibraryEntityType | undefined {
  if (typeof value !== 'string' || !value.trim()) return fallback;
  const key = value.trim().toLowerCase().replace(/[ _]+/g, '-');
  return typeAliases[key] ?? typeAliases[key.replaceAll('-', '')];
}

function normalizeTags(value: unknown): string[] | undefined {
  if (Array.isArray(value)) {
    return value.map((tag) => String(tag).trim()).filter(Boolean);
  }
  if (typeof value === 'string') {
    return value.split(/[|;]/).map((tag) => tag.trim()).filter(Boolean);
  }
  return undefined;
}

function normalizeUrl(value: string): string | undefined {
  try {
    const url = new URL(value.trim());
    return ['http:', 'https:'].includes(url.protocol) ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}

function normalizeLinks(value: unknown): Array<{ label: string; url: string }> | undefined {
  if (Array.isArray(value)) {
    const links = value.flatMap((entry) => {
      if (typeof entry === 'string') {
        const url = normalizeUrl(entry);
        return url ? [{ label: new URL(url).hostname, url }] : [];
      }
      if (!entry || typeof entry !== 'object') return [];
      const candidate = entry as { label?: unknown; url?: unknown };
      if (typeof candidate.url !== 'string') return [];
      const url = normalizeUrl(candidate.url);
      if (!url) return [];
      return [{ label: typeof candidate.label === 'string' && candidate.label.trim() ? candidate.label.trim() : new URL(url).hostname, url }];
    });
    return links;
  }

  if (typeof value !== 'string' || !value.trim()) return undefined;
  const links = value.split(';').flatMap((part) => {
    const entry = part.trim();
    if (!entry) return [];
    const separator = entry.indexOf('=');
    const possibleUrl = separator >= 0 ? entry.slice(separator + 1).trim() : entry;
    const url = normalizeUrl(possibleUrl);
    if (!url) return [];
    const label = separator >= 0 ? entry.slice(0, separator).trim() : new URL(url).hostname;
    return [{ label: label || new URL(url).hostname, url }];
  });
  return links;
}

function recordFromUnknown(value: unknown, sourceRow: number, fallbackType?: LibraryEntityType): ParsedLibraryRecord {
  const raw = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  const rawType = typeof raw.type === 'string' ? raw.type : undefined;
  return {
    sourceRow,
    id: typeof raw.id === 'string' && raw.id.trim() ? raw.id.trim() : undefined,
    type: normalizeType(raw.type, fallbackType),
    rawType,
    name: typeof raw.name === 'string' ? raw.name.trim() : '',
    summary: typeof raw.summary === 'string' ? raw.summary : undefined,
    notes: typeof raw.notes === 'string' ? raw.notes : undefined,
    tags: normalizeTags(raw.tags),
    links: normalizeLinks(raw.links),
  };
}

function parseCsvRows(input: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;

  for (let index = 0; index < input.length; index += 1) {
    const character = input[index];
    if (quoted) {
      if (character === '"') {
        if (input[index + 1] === '"') {
          field += '"';
          index += 1;
        } else {
          quoted = false;
        }
      } else {
        field += character;
      }
      continue;
    }

    if (character === '"') {
      quoted = true;
    } else if (character === ',') {
      row.push(field);
      field = '';
    } else if (character === '\n') {
      row.push(field.replace(/\r$/, ''));
      if (row.some((value) => value.trim())) rows.push(row);
      row = [];
      field = '';
    } else {
      field += character;
    }
  }

  row.push(field.replace(/\r$/, ''));
  if (row.some((value) => value.trim())) rows.push(row);
  return rows;
}

function parseCsv(text: string, fallbackType?: LibraryEntityType): ParsedLibraryRecord[] {
  const rows = parseCsvRows(text);
  if (!rows.length) return [];
  const headers = rows[0].map((header) => header.trim().toLowerCase().replace(/[ _-]+/g, ''));
  const indexOf = (...names: string[]) => headers.findIndex((header) => names.includes(header));
  const indexes = {
    id: indexOf('id'),
    type: indexOf('type', 'entitytype'),
    name: indexOf('name', 'title'),
    summary: indexOf('summary', 'description'),
    notes: indexOf('notes', 'note'),
    tags: indexOf('tags', 'tag'),
    links: indexOf('links', 'references', 'urls'),
  };

  if (indexes.name < 0) throw new Error('CSV import requires a “name” column.');

  return rows.slice(1).map((row, rowIndex) => recordFromUnknown({
    id: indexes.id >= 0 ? row[indexes.id] : undefined,
    type: indexes.type >= 0 ? row[indexes.type] : fallbackType,
    name: row[indexes.name],
    summary: indexes.summary >= 0 ? row[indexes.summary] : undefined,
    notes: indexes.notes >= 0 ? row[indexes.notes] : undefined,
    tags: indexes.tags >= 0 ? row[indexes.tags] : undefined,
    links: indexes.links >= 0 ? row[indexes.links] : undefined,
  }, rowIndex + 2, fallbackType));
}

function recordsFromJson(value: unknown, fallbackType?: LibraryEntityType): ParsedLibraryRecord[] {
  if (Array.isArray(value)) return value.map((entry, index) => recordFromUnknown(entry, index + 1, fallbackType));
  if (!value || typeof value !== 'object') throw new Error('JSON import must contain an array or an object with entities.');

  const root = value as Record<string, unknown>;
  if (Array.isArray(root.entities)) {
    return root.entities.map((entry, index) => recordFromUnknown(entry, index + 1, fallbackType));
  }

  const records: ParsedLibraryRecord[] = [];
  let sourceRow = 1;
  for (const [key, entries] of Object.entries(root)) {
    if (!Array.isArray(entries)) continue;
    const type = normalizeType(key, fallbackType);
    if (!type) continue;
    for (const entry of entries) records.push(recordFromUnknown(entry, sourceRow++, type));
  }
  if (!records.length) throw new Error('JSON import did not contain supported library entities.');
  return records;
}

export async function parseLibraryFile(file: File, fallbackType?: LibraryEntityType): Promise<ParsedLibraryRecord[]> {
  const text = await file.text();
  const isJson = file.name.toLowerCase().endsWith('.json') || file.type.includes('json');
  return isJson ? recordsFromJson(JSON.parse(text), fallbackType) : parseCsv(text, fallbackType);
}

export function analyzeLibraryImport(project: ContinuumProject, records: ParsedLibraryRecord[]): LibraryImportCandidate[] {
  const existingLibraryEntities = project.entities.filter((entity) => isLibraryEntityType(entity.type));
  const entityById = new Map(project.entities.map((entity) => [entity.id, entity]));
  const entityByName = new Map(existingLibraryEntities.map((entity) => [`${entity.type}:${entity.name.trim().toLowerCase()}`, entity]));
  const seen = new Set<string>();

  return records.map((record, index) => {
    const key = `${record.sourceRow}-${index}`;
    if (!record.type) {
      return { key, record, status: 'invalid', issue: `Unsupported or missing type${record.rawType ? ` “${record.rawType}”` : ''}.` };
    }
    if (!record.name.trim()) return { key, record, status: 'invalid', issue: 'Name is required.' };

    const importKey = `${record.type}:${record.name.trim().toLowerCase()}`;
    if (seen.has(importKey)) return { key, record, status: 'invalid', issue: 'Duplicate type and name inside this import file.' };
    seen.add(importKey);

    const idMatch = record.id ? entityById.get(record.id) : undefined;
    if (idMatch && !isLibraryEntityType(idMatch.type)) {
      return { key, record, status: 'invalid', issue: `ID “${record.id}” belongs to a ${idMatch.type}, which cannot be updated here.` };
    }
    if (idMatch && idMatch.type !== record.type) {
      return { key, record, status: 'invalid', issue: `ID “${record.id}” already belongs to a different library type.` };
    }

    const match = idMatch ?? entityByName.get(importKey);
    return match
      ? { key, record, status: 'update', existingId: match.id }
      : { key, record, status: 'new' };
  });
}

function importedLinks(links: ParsedLibraryRecord['links']): ExternalLink[] | undefined {
  return links?.map((link) => ({ id: `link_${crypto.randomUUID()}`, ...link }));
}

export function applyLibraryImport(
  project: ContinuumProject,
  candidates: LibraryImportCandidate[],
  updateMatches: boolean,
): LibraryImportResult {
  const valid = candidates.filter((candidate) => candidate.status !== 'invalid');
  const updates = new Map(valid.filter((candidate) => candidate.status === 'update' && updateMatches).map((candidate) => [candidate.existingId!, candidate.record]));
  const usedIds = new Set(project.entities.map((entity) => entity.id));
  const counts = new Map<LibraryEntityType, number>(libraryEntityTypes.map((type) => [
    type,
    project.entities.filter((entity) => entity.type === type).length,
  ]));

  const updatedEntities = project.entities.map((entity) => {
    const record = updates.get(entity.id);
    if (!record || !isLibraryEntityType(entity.type)) return entity;
    return {
      ...entity,
      name: record.name,
      summary: record.summary ?? entity.summary,
      notes: record.notes ?? entity.notes,
      tags: record.tags ?? entity.tags,
      links: importedLinks(record.links) ?? entity.links,
    };
  });

  const additions: StoryEntity[] = [];
  for (const candidate of valid) {
    if (candidate.status !== 'new') continue;
    const record = candidate.record;
    const type = record.type!;
    const entity = createEntity(type, counts.get(type) ?? 0);
    counts.set(type, (counts.get(type) ?? 0) + 1);
    if (record.id && !usedIds.has(record.id)) entity.id = record.id;
    usedIds.add(entity.id);
    entity.name = record.name;
    entity.summary = record.summary ?? '';
    entity.notes = record.notes ?? '';
    entity.tags = record.tags ?? [];
    entity.links = importedLinks(record.links) ?? [];
    additions.push(entity);
  }

  const added = additions.length;
  const updated = updates.size;
  const skipped = candidates.length - added - updated;
  return {
    project: { ...project, entities: [...updatedEntities, ...additions] },
    added,
    updated,
    skipped,
  };
}

function fileSlug(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'continuum';
}

function download(name: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

function recordForExport(entity: StoryEntity) {
  return {
    id: entity.id,
    type: entity.type,
    name: entity.name,
    summary: entity.summary,
    notes: entity.notes,
    tags: entity.tags,
    links: entity.links.map(({ label, url }) => ({ label, url })),
  };
}

function selectedLibraryEntities(project: ContinuumProject, type?: LibraryEntityType): StoryEntity[] {
  return project.entities.filter((entity) => isLibraryEntityType(entity.type) && (!type || entity.type === type));
}

export function exportLibraryJson(project: ContinuumProject, type?: LibraryEntityType) {
  const label = type ? fileSlug(libraryTypeLabels[type].plural) : 'world-library';
  download(`${fileSlug(project.title)}-${label}.json`, JSON.stringify({
    format: 'continuum-library',
    formatVersion: 1,
    exportedAt: new Date().toISOString(),
    entities: selectedLibraryEntities(project, type).map(recordForExport),
  }, null, 2), 'application/json');
}

function csvEscape(value: unknown): string {
  const text = String(value ?? '');
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function exportLibraryCsv(project: ContinuumProject, type?: LibraryEntityType) {
  const header = ['id', 'type', 'name', 'summary', 'notes', 'tags', 'links'];
  const rows = selectedLibraryEntities(project, type).map((entity) => [
    entity.id,
    entity.type,
    entity.name,
    entity.summary,
    entity.notes,
    entity.tags.join('|'),
    entity.links.map((link) => `${link.label}=${link.url}`).join(';'),
  ]);
  const csv = [header, ...rows].map((row) => row.map(csvEscape).join(',')).join('\n');
  const label = type ? fileSlug(libraryTypeLabels[type].plural) : 'world-library';
  download(`${fileSlug(project.title)}-${label}.csv`, csv, 'text/csv;charset=utf-8');
}

export function exportLibraryTemplate(type: LibraryEntityType) {
  const header = ['id', 'type', 'name', 'summary', 'notes', 'tags', 'links'];
  const blank = ['', type, '', '', '', '', ''];
  download(`${fileSlug(libraryTypeLabels[type].plural)}-template.csv`, [header, blank].map((row) => row.map(csvEscape).join(',')).join('\n'), 'text/csv;charset=utf-8');
}
