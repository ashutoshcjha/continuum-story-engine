import { useMemo, useRef, useState } from 'react';
import { InlineEdit } from './InlineEdit';
import {
  analyzeLibraryImport,
  exportLibraryCsv,
  exportLibraryJson,
  exportLibraryTemplate,
  libraryEntityTypes,
  libraryTypeLabels,
  parseLibraryFile,
  type LibraryEntityType,
  type LibraryImportCandidate,
  type LibraryImportResult,
} from './libraryIO';
import type { ContinuumProject, StoryEntity } from './model';

interface LibraryWorkspaceProps {
  project: ContinuumProject;
  onAddEntity: (type: LibraryEntityType) => void;
  onSelectEntity: (entityId: string) => void;
  onUpdateEntity: (entity: StoryEntity) => void;
  onApplyImport: (candidates: LibraryImportCandidate[], updateMatches: boolean) => LibraryImportResult;
}

function countStatus(candidates: LibraryImportCandidate[], status: LibraryImportCandidate['status']) {
  return candidates.filter((candidate) => candidate.status === status).length;
}

export function LibraryWorkspace({
  project,
  onAddEntity,
  onSelectEntity,
  onUpdateEntity,
  onApplyImport,
}: LibraryWorkspaceProps) {
  const [activeType, setActiveType] = useState<LibraryEntityType>('character');
  const [query, setQuery] = useState('');
  const [candidates, setCandidates] = useState<LibraryImportCandidate[]>();
  const [importName, setImportName] = useState('');
  const [updateMatches, setUpdateMatches] = useState(true);
  const [message, setMessage] = useState('');
  const importRef = useRef<HTMLInputElement>(null);

  const entities = useMemo(() => project.entities
    .filter((entity) => entity.type === activeType)
    .filter((entity) => {
      const normalized = query.trim().toLowerCase();
      return !normalized || [entity.name, entity.summary, entity.notes, entity.tags.join(' ')]
        .some((value) => value.toLowerCase().includes(normalized));
    })
    .sort((first, second) => first.name.localeCompare(second.name)), [project, activeType, query]);

  const importFile = async (file: File) => {
    try {
      const records = await parseLibraryFile(file, activeType);
      const analyzed = analyzeLibraryImport(project, records);
      setCandidates(analyzed);
      setImportName(file.name);
      setMessage('');
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Could not read the library import file.');
    }
  };

  const applyImport = () => {
    if (!candidates) return;
    const result = onApplyImport(candidates, updateMatches);
    setCandidates(undefined);
    setImportName('');
    setMessage(`Imported ${result.added} new and updated ${result.updated}; skipped ${result.skipped}.`);
  };

  const labels = libraryTypeLabels[activeType];
  const newCount = candidates ? countStatus(candidates, 'new') : 0;
  const updateCount = candidates ? countStatus(candidates, 'update') : 0;
  const invalidCount = candidates ? countStatus(candidates, 'invalid') : 0;

  return (
    <section className="library-workspace">
      <header className="library-hero">
        <div>
          <span className="eyebrow">World library</span>
          <h1>Build and exchange story entities</h1>
          <p>Add one item at a time, or move a whole cast, location list, plot map, or ruleset through CSV and JSON.</p>
        </div>
        <div className="library-hero-actions">
          <button className="primary" onClick={() => onAddEntity(activeType)}>＋ Add {labels.singular.toLowerCase()}</button>
          <button onClick={() => importRef.current?.click()}>Import bulk</button>
          <input
            ref={importRef}
            hidden
            type="file"
            accept=".csv,.json,.continuum,text/csv,application/json"
            onChange={async (event) => {
              const file = event.target.files?.[0];
              if (file) await importFile(file);
              event.target.value = '';
            }}
          />
        </div>
      </header>

      <nav className="library-type-tabs" aria-label="World entity types">
        {libraryEntityTypes.map((type) => {
          const count = project.entities.filter((entity) => entity.type === type).length;
          return (
            <button key={type} className={activeType === type ? 'active' : ''} onClick={() => { setActiveType(type); setQuery(''); }}>
              <b>{libraryTypeLabels[type].plural}</b>
              <span>{count}</span>
            </button>
          );
        })}
      </nav>

      <div className="library-toolbar">
        <label className="library-search">
          <span>Search {labels.plural.toLowerCase()}</span>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Search ${labels.plural.toLowerCase()}…`} />
        </label>
        <div>
          <button onClick={() => exportLibraryCsv(project, activeType)}>Export type CSV</button>
          <button onClick={() => exportLibraryJson(project, activeType)}>Export type JSON</button>
          <button onClick={() => exportLibraryJson(project)}>Export all JSON</button>
          <button onClick={() => exportLibraryTemplate(activeType)}>CSV template</button>
        </div>
      </div>

      {message && <div className="library-message">{message}</div>}

      {candidates && (
        <section className="library-import-review">
          <header>
            <div>
              <span>Import review</span>
              <h2>{importName}</h2>
              <p>Review the detected types and duplicate matches before changing the project.</p>
            </div>
            <button onClick={() => { setCandidates(undefined); setImportName(''); }}>Cancel</button>
          </header>
          <div className="library-import-metrics">
            <div><b>{newCount}</b><span>New</span></div>
            <div><b>{updateCount}</b><span>Matches</span></div>
            <div><b>{invalidCount}</b><span>Invalid</span></div>
          </div>
          <label className="library-update-toggle">
            <input type="checkbox" checked={updateMatches} onChange={(event) => setUpdateMatches(event.target.checked)} />
            <span>Update existing entities when type and name—or ID—match</span>
          </label>
          <div className="library-import-table-wrap">
            <table className="library-import-table">
              <thead><tr><th>Row</th><th>Type</th><th>Name</th><th>Action</th><th>Notes</th></tr></thead>
              <tbody>
                {candidates.slice(0, 100).map((candidate) => (
                  <tr key={candidate.key} className={`is-${candidate.status}`}>
                    <td>{candidate.record.sourceRow}</td>
                    <td>{candidate.record.type ? libraryTypeLabels[candidate.record.type].singular : candidate.record.rawType || 'Unknown'}</td>
                    <td>{candidate.record.name || 'Missing name'}</td>
                    <td>{candidate.status === 'new' ? 'Add' : candidate.status === 'update' ? (updateMatches ? 'Update' : 'Skip') : 'Invalid'}</td>
                    <td>{candidate.issue ?? (candidate.status === 'update' ? 'Matches an existing entity.' : '')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {candidates.length > 100 && <p>Showing the first 100 of {candidates.length} records.</p>}
          </div>
          <footer>
            <span>{invalidCount ? `${invalidCount} invalid record${invalidCount === 1 ? '' : 's'} will be skipped.` : 'All records are valid.'}</span>
            <button className="primary" disabled={newCount + (updateMatches ? updateCount : 0) === 0} onClick={applyImport}>
              Import {newCount + (updateMatches ? updateCount : 0)} record{newCount + (updateMatches ? updateCount : 0) === 1 ? '' : 's'}
            </button>
          </footer>
        </section>
      )}

      <div className="library-list-heading">
        <div><span>{labels.plural}</span><h2>{entities.length} shown</h2></div>
        <small>Double-click text to edit. Select a card for images, links, tags, and full notes.</small>
      </div>

      {entities.length ? (
        <div className="library-grid">
          {entities.map((entity) => (
            <article key={entity.id} className="library-card" onClick={() => onSelectEntity(entity.id)}>
              {entity.images?.[0] ? (
                <img src={entity.images[0].thumbnailUrl ?? entity.images[0].dataUrl} alt="" loading="lazy" />
              ) : (
                <div className="library-card-mark">{labels.singular.slice(0, 1)}</div>
              )}
              <div className="library-card-content">
                <span className="library-card-type">{labels.singular}</span>
                <h3>
                  <InlineEdit value={entity.name} placeholder={`Name this ${labels.singular.toLowerCase()}`} onCommit={(name) => onUpdateEntity({ ...entity, name })} />
                </h3>
                <p>
                  <InlineEdit
                    value={entity.summary}
                    multiline
                    placeholder="Double-click to add a concise summary"
                    onCommit={(summary) => onUpdateEntity({ ...entity, summary })}
                  />
                </p>
                <div className="library-card-tags">
                  <InlineEdit
                    value={entity.tags.join(', ')}
                    placeholder="Double-click to add tags"
                    onCommit={(tags) => onUpdateEntity({ ...entity, tags: tags.split(',').map((tag) => tag.trim()).filter(Boolean) })}
                  />
                </div>
                <footer><span>{entity.links.length} link{entity.links.length === 1 ? '' : 's'}</span><span>{entity.notes ? 'Notes added' : 'No notes'}</span></footer>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="library-empty">
          <h2>No {labels.plural.toLowerCase()} found</h2>
          <p>{query ? 'Try a different search.' : `Add a ${labels.singular.toLowerCase()} or import a CSV/JSON collection.`}</p>
          {!query && <button className="primary" onClick={() => onAddEntity(activeType)}>Add first {labels.singular.toLowerCase()}</button>}
        </div>
      )}
    </section>
  );
}
