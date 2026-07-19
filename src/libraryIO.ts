import {
  createEntity,
  type ContinuumProject,
  type EntityType,
  type ExternalLink,
  type StoryEntity,
} from './model';
import {
  initializeStoryLogicEntity,
  type FactDetails,
  type PlotThreadDetails,
  type WorldRuleDetails,
} from './storyLogic';

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
  plotThread?: Partial<PlotThreadDetails>;
  fact?: Partial<FactDetails>;
  worldRule?: Partial<WorldRuleDetails>;
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
  character: 'character', characters: 'character', person: 'character', people: 'character',
  location: 'location', locations: 'location', place: 'location', places: 'location',
  organization: 'organization', organizations: 'organization', organisation: 'organization', organisations: 'organization', faction: 'organization', factions: 'organization',
  object: 'object', objects: 'object', artifact: 'object', artifacts: 'object', item: 'object', items: 'object',
  plot: 'plot-thread', plots: 'plot-thread', 'plot-thread': 'plot-thread', 'plot-threads': 'plot-thread', plotthread: 'plot-thread', plotthreads: 'plot-thread', thread: 'plot-thread', threads: 'plot-thread',
  fact: 'fact', facts: 'fact', proposition: 'fact', propositions: 'fact',
  'world-rule': 'world-rule', 'world-rules': 'world-rule', worldrule: 'world-rule', worldrules: 'world-rule', rule: 'world-rule', rules: 'world-rule',
};

function normalizeType(value: unknown, fallback?: LibraryEntityType): LibraryEntityType | undefined {
  if (typeof value !== 'string' || !value.trim()) return fallback;
  const key = value.trim().toLowerCase().replace(/[ _]+/g, '-');
  return typeAliases[key] ?? typeAliases[key.replaceAll('-', '')];
}

function text(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function nonEmptyText(value: unknown): string | undefined {
  const result = text(value)?.trim();
  return result || undefined;
}

function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function definedObject<T extends object>(value: T): Partial<T> | undefined {
  const entries = Object.entries(value).filter(([, entry]) => entry !== undefined && entry !== '');
  return entries.length ? Object.fromEntries(entries) as Partial<T> : undefined;
}

function normalizeTags(value: unknown): string[] | undefined {
  if (Array.isArray(value)) return value.map((tag) => String(tag).trim()).filter(Boolean);
  if (typeof value === 'string') return value.split(/[|;]/).map((tag) => tag.trim()).filter(Boolean);
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
      const candidate = objectValue(entry);
      if (typeof candidate.url !== 'string') return [];
      const url = normalizeUrl(candidate.url);
      if (!url) return [];
      return [{
        label: typeof candidate.label === 'string' && candidate.label.trim() ? candidate.label.trim() : new URL(url).hostname,
        url,
      }];
    });
    return links;
  }

  if (typeof value !== 'string' || !value.trim()) return undefined;
  return value.split(';').flatMap((part) => {
    const entry = part.trim();
    if (!entry) return [];
    const separator = entry.indexOf('=');
    const possibleUrl = separator >= 0 ? entry.slice(separator + 1).trim() : entry;
    const url = normalizeUrl(possibleUrl);
    if (!url) return [];
    const label = separator >= 0 ? entry.slice(0, separator).trim() : new URL(url).hostname;
    return [{ label: label || new URL(url).hostname, url }];
  });
}

function structuredFields(raw: Record<string, unknown>, type?: LibraryEntityType) {
  if (type === 'plot-thread') {
    const nested = objectValue(raw.plotThread);
    return {
      plotThread: definedObject<Partial<PlotThreadDetails>>({
        centralQuestion: text(nested.centralQuestion ?? raw.centralQuestion),
        stakes: text(nested.stakes ?? raw.stakes),
        status: text(nested.status ?? raw.status) as PlotThreadDetails['status'] | undefined,
        plannedPayoff: text(nested.plannedPayoff ?? raw.plannedPayoff),
      }),
    };
  }

  if (type === 'fact') {
    const nested = objectValue(raw.fact);
    return {
      fact: definedObject<Partial<FactDetails>>({
        proposition: text(nested.proposition ?? raw.proposition),
        truthStatus: text(nested.truthStatus ?? raw.truthStatus) as FactDetails['truthStatus'] | undefined,
        sensitivity: text(nested.sensitivity ?? raw.sensitivity) as FactDetails['sensitivity'] | undefined,
        validFromSceneId: nonEmptyText(nested.validFromSceneId ?? raw.validFromSceneId),
        validUntilSceneId: nonEmptyText(nested.validUntilSceneId ?? raw.validUntilSceneId),
      }),
    };
  }

  if (type === 'world-rule') {
    const nested = objectValue(raw.worldRule);
    return {
      worldRule: definedObject<Partial<WorldRuleDetails>>({
        statement: text(nested.statement ?? raw.statement),
        category: text(nested.category ?? raw.category) as WorldRuleDetails['category'] | undefined,
        rigidity: text(nested.rigidity ?? raw.rigidity) as WorldRuleDetails['rigidity'] | undefined,
        consequence: text(nested.consequence ?? raw.consequence),
        exceptionNotes: text(nested.exceptionNotes ?? raw.exceptionNotes),
      }),
    };
  }

  return {};
}

function recordFromUnknown(value: unknown, sourceRow: number, fallbackType?: LibraryEntityType): ParsedLibraryRecord {
  const raw = objectValue(value);
  const rawType = typeof raw.type === 'string' ? raw.type : undefined;
  const type = normalizeType(raw.type, fallbackType);
  return {
    sourceRow,
    id: nonEmptyText(raw.id),
    type,
    rawType,
    name: typeof raw.name === 'string' ? raw.name.trim() : '',
    summary: text(raw.summary),
    notes: text(raw.notes),
    tags: normalizeTags(raw.tags),
    links: normalizeLinks(raw.links),
    ...structuredFields(raw, type),
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
      if (row.some((entry) => entry.trim())) rows.push(row);
      row = [];
      field = '';
    } else {
      field += character;
    }
  }

  row.push(field.replace(/\r$/, ''));
  if (row.some((entry) => entry.trim())) rows.push(row);
  return rows;
}

function parseCsv(textValue: string, fallbackType?: LibraryEntityType): ParsedLibraryRecord[] {
  const rows = parseCsvRows(textValue);
  if (!rows.length) return [];
  const headers = rows[0].map((header) => header.trim().toLowerCase().replace(/[ _-]+/g, ''));
  const indexOf = (...names: string[]) => headers.findIndex((header) => names.includes(header));
  const indexes = {
    id: indexOf('id'), type: indexOf('type', 'entitytype'), name: indexOf('name', 'title'),
    summary: indexOf('summary', 'description'), notes: indexOf('notes', 'note'), tags: indexOf('tags', 'tag'), links: indexOf('links', 'references', 'urls'),
    centralQuestion: indexOf('centralquestion'), stakes: indexOf('stakes'), status: indexOf('status'), plannedPayoff: indexOf('plannedpayoff', 'payoff'),
    proposition: indexOf('proposition'), truthStatus: indexOf('truthstatus'), sensitivity: indexOf('sensitivity'), validFromSceneId: indexOf('validfromsceneid'), validUntilSceneId: indexOf('validuntilsceneid'),
    statement: indexOf('statement', 'rulestatement'), category: indexOf('category'), rigidity: indexOf('rigidity'), consequence: indexOf('consequence'), exceptionNotes: indexOf('exceptionnotes', 'exceptions'),
  };

  if (indexes.name < 0) throw new Error('CSV import requires a “name” column.');
  const cell = (row: string[], index: number) => index >= 0 ? row[index] : undefined;

  return rows.slice(1).map((row, rowIndex) => recordFromUnknown({
    id: cell(row, indexes.id), type: cell(row, indexes.type) ?? fallbackType, name: cell(row, indexes.name),
    summary: cell(row, indexes.summary), notes: cell(row, indexes.notes), tags: cell(row, indexes.tags), links: cell(row, indexes.links),
    centralQuestion: cell(row, indexes.centralQuestion), stakes: cell(row, indexes.stakes), status: cell(row, indexes.status), plannedPayoff: cell(row, indexes.plannedPayoff),
    proposition: cell(row, indexes.proposition), truthStatus: cell(row, indexes.truthStatus), sensitivity: cell(row, indexes.sensitivity), validFromSceneId: cell(row, indexes.validFromSceneId), validUntilSceneId: cell(row, indexes.validUntilSceneId),
    statement: cell(row, indexes.statement), category: cell(row, indexes.category), rigidity: cell(row, indexes.rigidity), consequence: cell(row, indexes.consequence), exceptionNotes: cell(row, indexes.exceptionNotes),
  }, rowIndex + 2, fallbackType));
}

function recordsFromJson(value: unknown, fallbackType?: LibraryEntityType): ParsedLibraryRecord[] {
  if (Array.isArray(value)) return value.map((entry, index) => recordFromUnknown(entry, index + 1, fallbackType));
  if (!value || typeof value !== 'object') throw new Error('JSON import must contain an array or an object with entities.');

  const root = value as Record<string, unknown>;
  if (Array.isArray(root.entities)) return root.entities.map((entry, index) => recordFromUnknown(entry, index + 1, fallbackType));

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
  const fileText = await file.text();
  const isJson = file.name.toLowerCase().endsWith('.json') || file.type.includes('json');
  return isJson ? recordsFromJson(JSON.parse(fileText), fallbackType) : parseCsv(fileText, fallbackType);
}

export function analyzeLibraryImport(project: ContinuumProject, records: ParsedLibraryRecord[]): LibraryImportCandidate[] {
  const existingLibraryEntities = project.entities.filter((entity) => isLibraryEntityType(entity.type));
  const entityById = new Map(project.entities.map((entity) => [entity.id, entity]));
  const entityByName = new Map(existingLibraryEntities.map((entity) => [`${entity.type}:${entity.name.trim().toLowerCase()}`, entity]));
  const seen = new Set<string>();

  return records.map((record, index) => {
    const key = `${record.sourceRow}-${index}`;
    if (!record.type) return { key, record, status: 'invalid', issue: `Unsupported or missing type${record.rawType ? ` “${record.rawType}”` : ''}.` };
    if (!record.name.trim()) return { key, record, status: 'invalid', issue: 'Name is required.' };

    const importKey = `${record.type}:${record.name.trim().toLowerCase()}`;
    if (seen.has(importKey)) return { key, record, status: 'invalid', issue: 'Duplicate type and name inside this import file.' };
    seen.add(importKey);

    const idMatch = record.id ? entityById.get(record.id) : undefined;
    if (idMatch && !isLibraryEntityType(idMatch.type)) return { key, record, status: 'invalid', issue: `ID “${record.id}” belongs to a ${idMatch.type}, which cannot be updated here.` };
    if (idMatch && idMatch.type !== record.type) return { key, record, status: 'invalid', issue: `ID “${record.id}” already belongs to a different library type.` };

    const match = idMatch ?? entityByName.get(importKey);
    return match ? { key, record, status: 'update', existingId: match.id } : { key, record, status: 'new' };
  });
}

function importedLinks(links: ParsedLibraryRecord['links']): ExternalLink[] | undefined {
  return links?.map((link) => ({ id: `link_${crypto.randomUUID()}`, ...link }));
}

function mergeDefined<T extends object>(base: T | undefined, changes: Partial<T> | undefined): T | undefined {
  if (!changes) return base;
  const filtered = Object.fromEntries(Object.entries(changes).filter(([, value]) => value !== undefined && value !== '')) as Partial<T>;
  return { ...(base ?? {} as T), ...filtered };
}

function applyRecord(entity: StoryEntity, record: ParsedLibraryRecord): StoryEntity {
  return initializeStoryLogicEntity({
    ...entity,
    name: record.name,
    summary: record.summary ?? entity.summary,
    notes: record.notes ?? entity.notes,
    tags: record.tags ?? entity.tags,
    links: importedLinks(record.links) ?? entity.links,
    plotThread: mergeDefined(entity.plotThread, record.plotThread),
    fact: mergeDefined(entity.fact, record.fact),
    worldRule: mergeDefined(entity.worldRule, record.worldRule),
  });
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
    return record && isLibraryEntityType(entity.type) ? applyRecord(entity, record) : entity;
  });

  const additions: StoryEntity[] = [];
  for (const candidate of valid) {
    if (candidate.status !== 'new') continue;
    const record = candidate.record;
    const type = record.type!;
    let entity = createEntity(type, counts.get(type) ?? 0);
    counts.set(type, (counts.get(type) ?? 0) + 1);
    if (record.id && !usedIds.has(record.id)) entity.id = record.id;
    usedIds.add(entity.id);
    entity = applyRecord(entity, record);
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
    ...(entity.type === 'plot-thread' ? { plotThread: entity.plotThread } : {}),
    ...(entity.type === 'fact' ? { fact: entity.fact } : {}),
    ...(entity.type === 'world-rule' ? { worldRule: entity.worldRule } : {}),
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
  const output = String(value ?? '');
  return /[",\n\r]/.test(output) ? `"${output.replaceAll('"', '""')}"` : output;
}

const baseCsvHeader = ['id', 'type', 'name', 'summary', 'notes', 'tags', 'links'];
const structuredCsvHeaders: Partial<Record<LibraryEntityType, string[]>> = {
  'plot-thread': ['centralQuestion', 'stakes', 'status', 'plannedPayoff'],
  fact: ['proposition', 'truthStatus', 'sensitivity', 'validFromSceneId', 'validUntilSceneId'],
  'world-rule': ['statement', 'category', 'rigidity', 'consequence', 'exceptionNotes'],
};

function csvHeaders(type?: LibraryEntityType): string[] {
  return type
    ? [...baseCsvHeader, ...(structuredCsvHeaders[type] ?? [])]
    : [...baseCsvHeader, ...new Set(Object.values(structuredCsvHeaders).flat())];
}

function csvRecord(entity: StoryEntity, headers: string[]): unknown[] {
  const values: Record<string, unknown> = {
    id: entity.id,
    type: entity.type,
    name: entity.name,
    summary: entity.summary,
    notes: entity.notes,
    tags: entity.tags.join('|'),
    links: entity.links.map((link) => `${link.label}=${link.url}`).join(';'),
    ...(entity.plotThread ?? {}),
    ...(entity.fact ?? {}),
    ...(entity.worldRule ?? {}),
  };
  return headers.map((header) => values[header] ?? '');
}

export function exportLibraryCsv(project: ContinuumProject, type?: LibraryEntityType) {
  const header = csvHeaders(type);
  const rows = selectedLibraryEntities(project, type).map((entity) => csvRecord(entity, header));
  const csv = [header, ...rows].map((row) => row.map(csvEscape).join(',')).join('\n');
  const label = type ? fileSlug(libraryTypeLabels[type].plural) : 'world-library';
  download(`${fileSlug(project.title)}-${label}.csv`, csv, 'text/csv;charset=utf-8');
}

export function exportLibraryTemplate(type: LibraryEntityType) {
  const header = csvHeaders(type);
  const blankValues: Record<string, string> = { type };
  const blank = header.map((column) => blankValues[column] ?? '');
  download(`${fileSlug(libraryTypeLabels[type].plural)}-template.csv`, [header, blank].map((row) => row.map(csvEscape).join(',')).join('\n'), 'text/csv;charset=utf-8');
}
