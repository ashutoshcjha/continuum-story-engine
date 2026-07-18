import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Background,
  Controls,
  Handle,
  MiniMap,
  Position,
  ReactFlow,
  type Connection,
  type NodeProps,
  type NodeTypes,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import './styles.css';
import { loadLastLocalProject, saveLocalProject } from './db';
import { exportProject, exportStoryboardHtml, importProject } from './io';
import {
  createEmptyProject,
  createEntity,
  createSampleProject,
  isStoryScene,
  normalizeProject,
  projectToFlow,
  type ContinuumProject,
  type EntityType,
  type StoryEntity,
  type StoryScene,
} from './model';

type View = 'world' | 'storyboard' | 'brief';

const entityLabels: Record<EntityType, string> = {
  character: 'Character', location: 'Location', organization: 'Organization', object: 'Object',
  'plot-thread': 'Plot thread', fact: 'Fact', 'world-rule': 'World rule', scene: 'Scene',
};

function StoryNode({ data, selected }: NodeProps) {
  const values = data as { label: string; entityType: EntityType; summary: string; imageUrl?: string; linkCount: number };
  return (
    <div className={`story-node story-node--${values.entityType} ${selected ? 'is-selected' : ''}`}>
      <Handle type="target" position={Position.Left} />
      {values.imageUrl && <img className="node-image" src={values.imageUrl} alt="" />}
      <span className="node-type">{entityLabels[values.entityType]}</span>
      <strong>{values.label}</strong>
      {values.summary && <small>{values.summary}</small>}
      {values.linkCount > 0 && <span className="node-link-count">↗ {values.linkCount} link{values.linkCount === 1 ? '' : 's'}</span>}
      <Handle type="source" position={Position.Right} />
    </div>
  );
}

const nodeTypes: NodeTypes = { story: StoryNode };

function TextField({ label, value, onChange, multiline = false }: { label: string; value: string; onChange: (value: string) => void; multiline?: boolean }) {
  return <label className="field"><span>{label}</span>{multiline
    ? <textarea value={value} onChange={(event) => onChange(event.target.value)} />
    : <input value={value} onChange={(event) => onChange(event.target.value)} />}</label>;
}

function EntityInspector({ entity, project, updateEntity, removeEntity }: {
  entity?: StoryEntity;
  project: ContinuumProject;
  updateEntity: (entity: StoryEntity) => void;
  removeEntity: (id: string) => void;
}) {
  const imageRef = useRef<HTMLInputElement>(null);
  const [linkLabel, setLinkLabel] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  if (!entity) return <aside className="inspector empty-panel"><span>Selection</span><h2>Choose an object</h2><p>Select a card or node to edit its structured story cues.</p></aside>;
  const patch = (changes: Partial<StoryEntity>) => updateEntity({ ...entity, ...changes });
  const scene = isStoryScene(entity) ? entity : undefined;
  const patchScene = (changes: Partial<StoryScene['scene']>) => scene && updateEntity({ ...scene, scene: { ...scene.scene, ...changes } });
  const characters = project.entities.filter((item) => item.type === 'character');
  const locations = project.entities.filter((item) => item.type === 'location');
  const images = entity.images ?? [];
  const links = entity.links ?? [];

  const addImages = async (files: FileList | null) => {
    if (!files?.length) return;
    const accepted = Array.from(files).filter((file) => file.type.startsWith('image/'));
    const additions = await Promise.all(accepted.map((file) => new Promise<{ id: string; name: string; dataUrl: string }>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve({ id: `image_${crypto.randomUUID()}`, name: file.name, dataUrl: String(reader.result) });
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    })));
    patch({ images: [...images, ...additions] });
  };

  const addLink = () => {
    const raw = linkUrl.trim();
    if (!raw) return;
    let url: URL;
    try { url = new URL(raw); } catch { window.alert('Enter a complete URL such as https://example.com.'); return; }
    if (!['http:', 'https:'].includes(url.protocol)) { window.alert('Only http and https links are supported.'); return; }
    patch({ links: [...links, { id: `link_${crypto.randomUUID()}`, label: linkLabel.trim() || url.hostname, url: url.toString() }] });
    setLinkLabel('');
    setLinkUrl('');
  };

  return <aside className="inspector">
    <div className="inspector-heading"><span>{entityLabels[entity.type]}</span><button className="danger-link" onClick={() => removeEntity(entity.id)}>Delete</button></div>
    <TextField label="Name" value={entity.name} onChange={(name) => patch({ name })} />
    <TextField label="Summary" value={entity.summary} multiline onChange={(summary) => patch({ summary })} />
    <TextField label="Tags (comma separated)" value={entity.tags.join(', ')} onChange={(tags) => patch({ tags: tags.split(',').map((tag) => tag.trim()).filter(Boolean) })} />

    <section className="attachment-section">
      <div className="attachment-heading"><span>Images</span><button onClick={() => imageRef.current?.click()}>Add image</button></div>
      <input ref={imageRef} hidden type="file" accept="image/*" multiple onChange={async (event) => { await addImages(event.target.files); event.target.value = ''; }} />
      {images.length > 0 ? <div className="image-grid">{images.map((image, index) => <figure key={image.id}>
        <img src={image.dataUrl} alt={image.name} />
        <figcaption><span>{index === 0 ? 'Cover · ' : ''}{image.name}</span><button onClick={() => patch({ images: images.filter((item) => item.id !== image.id) })}>×</button></figcaption>
      </figure>)}</div> : <p className="attachment-empty">The first image becomes the node thumbnail and appears in exports.</p>}
    </section>

    <section className="attachment-section">
      <div className="attachment-heading"><span>External links</span></div>
      <div className="link-form"><input aria-label="Link label" placeholder="Label" value={linkLabel} onChange={(event) => setLinkLabel(event.target.value)} /><input aria-label="URL" placeholder="https://…" value={linkUrl} onChange={(event) => setLinkUrl(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') addLink(); }} /><button onClick={addLink}>Add</button></div>
      {links.length > 0 ? <ul className="link-list">{links.map((link) => <li key={link.id}><a href={link.url} target="_blank" rel="noreferrer">{link.label}</a><button onClick={() => patch({ links: links.filter((item) => item.id !== link.id) })}>×</button></li>)}</ul> : <p className="attachment-empty">Link research, maps, reference pages, playlists, or source material to this node.</p>}
    </section>

    {scene && <div className="scene-fields">
      <div className="two-fields">
        <label className="field"><span>Order</span><input type="number" value={scene.scene.order} onChange={(event) => patchScene({ order: Number(event.target.value) })} /></label>
        <TextField label="Chapter" value={scene.scene.chapter} onChange={(chapter) => patchScene({ chapter })} />
      </div>
      <label className="field"><span>POV character</span><select value={scene.scene.povCharacterId ?? ''} onChange={(event) => patchScene({ povCharacterId: event.target.value || undefined })}><option value="">Not set</option>{characters.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      <label className="field"><span>Location</span><select value={scene.scene.locationId ?? ''} onChange={(event) => patchScene({ locationId: event.target.value || undefined })}><option value="">Not set</option>{locations.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      <TextField label="Purpose" value={scene.scene.purpose} multiline onChange={(purpose) => patchScene({ purpose })} />
      <TextField label="Conflict" value={scene.scene.conflict} multiline onChange={(conflict) => patchScene({ conflict })} />
      <TextField label="Turning point" value={scene.scene.turningPoint} multiline onChange={(turningPoint) => patchScene({ turningPoint })} />
      <TextField label="Outcome" value={scene.scene.outcome} multiline onChange={(outcome) => patchScene({ outcome })} />
      <div className="two-fields"><TextField label="Emotion in" value={scene.scene.emotionalStart} onChange={(emotionalStart) => patchScene({ emotionalStart })} /><TextField label="Emotion out" value={scene.scene.emotionalEnd} onChange={(emotionalEnd) => patchScene({ emotionalEnd })} /></div>
      <TextField label="Reveal" value={scene.scene.reveal} multiline onChange={(reveal) => patchScene({ reveal })} />
      <TextField label="Keep concealed" value={scene.scene.conceal} multiline onChange={(conceal) => patchScene({ conceal })} />
      <TextField label="Ghostwriter notes" value={scene.scene.ghostwriterNotes} multiline onChange={(ghostwriterNotes) => patchScene({ ghostwriterNotes })} />
    </div>}
    {!scene && <TextField label="Notes" value={entity.notes} multiline onChange={(notes) => patch({ notes })} />}
  </aside>;
}

function Storyboard({ project, select }: { project: ContinuumProject; select: (id: string) => void }) {
  const scenes = project.entities.filter(isStoryScene).sort((a, b) => a.scene.order - b.scene.order);
  const entityName = (id?: string) => project.entities.find((entity) => entity.id === id)?.name ?? 'Not set';
  return <section className="storyboard"><div className="section-intro"><span>Story stream</span><h2>Scene storyboard</h2><p>Arrange the narrative as cues, decisions, reveals, and consequences—not manuscript prose.</p></div>
    <div className="scene-grid">{scenes.map((scene) => <button key={scene.id} className="scene-card" onClick={() => select(scene.id)}>
      {scene.images?.[0] && <img className="scene-card-image" src={scene.images[0].dataUrl} alt="" />}
      <div className="scene-card-top"><span>{scene.scene.chapter}</span><b>{String(scene.scene.order).padStart(2, '0')}</b></div>
      <h3>{scene.name}</h3><p>{scene.summary || 'Add a one-sentence scene summary.'}</p>
      <dl><dt>POV</dt><dd>{entityName(scene.scene.povCharacterId)}</dd><dt>Location</dt><dd>{entityName(scene.scene.locationId)}</dd><dt>Movement</dt><dd>{scene.scene.emotionalStart || '—'} → {scene.scene.emotionalEnd || '—'}</dd></dl>
      <div className="scene-turn"><span>Turn</span>{scene.scene.turningPoint || 'Define the turning point.'}</div>
      {(scene.links?.length ?? 0) > 0 && <div className="scene-link-note">↗ {scene.links.length} linked reference{scene.links.length === 1 ? '' : 's'}</div>}
    </button>)}</div>
    {!scenes.length && <div className="empty-canvas">Create your first scene from the left sidebar.</div>}
  </section>;
}

function Brief({ project }: { project: ContinuumProject }) {
  const scenes = project.entities.filter(isStoryScene).sort((a, b) => a.scene.order - b.scene.order);
  return <section className="brief"><div className="brief-paper"><span className="eyebrow">Ghostwriter briefing document</span><h1>{project.title}</h1><h2>{project.logline || 'Add a logline to frame the assignment.'}</h2><p className="premise">{project.premise}</p>
    {scenes.map((scene) => <article key={scene.id}>{scene.images?.[0] && <img className="brief-image" src={scene.images[0].dataUrl} alt="" />}<header><b>Scene {scene.scene.order}</b><span>{scene.scene.chapter}</span></header><h3>{scene.name}</h3><p>{scene.summary}</p><div className="brief-grid"><div><small>Purpose</small>{scene.scene.purpose || '—'}</div><div><small>Conflict</small>{scene.scene.conflict || '—'}</div><div><small>Turning point</small>{scene.scene.turningPoint || '—'}</div><div><small>Outcome</small>{scene.scene.outcome || '—'}</div><div><small>Reveal</small>{scene.scene.reveal || '—'}</div><div><small>Keep concealed</small>{scene.scene.conceal || '—'}</div></div>{scene.scene.ghostwriterNotes && <blockquote><b>Direction</b>{scene.scene.ghostwriterNotes}</blockquote>}{(scene.links?.length ?? 0) > 0 && <div className="brief-links"><b>References</b>{scene.links.map((link) => <a key={link.id} href={link.url} target="_blank" rel="noreferrer">{link.label}</a>)}</div>}</article>)}
  </div></section>;
}

export default function App() {
  const [project, setProject] = useState<ContinuumProject>(() => createSampleProject());
  const [selectedId, setSelectedId] = useState<string>();
  const [view, setView] = useState<View>('world');
  const [saveState, setSaveState] = useState('Loading local project…');
  const importRef = useRef<HTMLInputElement>(null);

  useEffect(() => { loadLastLocalProject().then((stored) => { if (stored) setProject(normalizeProject(stored)); setSaveState('Saved locally'); }); }, []);
  useEffect(() => {
    const handle = window.setTimeout(() => {
      const updated = { ...project, updatedAt: new Date().toISOString() };
      saveLocalProject(updated).then(() => setSaveState(`Saved locally · ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`));
    }, 500);
    setSaveState('Saving…');
    return () => window.clearTimeout(handle);
  }, [project]);

  const selected = project.entities.find((entity) => entity.id === selectedId);
  const { nodes, edges } = useMemo(() => projectToFlow(project), [project]);

  const updateProject = (patch: Partial<ContinuumProject>) => setProject((current) => ({ ...current, ...patch }));
  const updateEntity = (entity: StoryEntity) => updateProject({ entities: project.entities.map((item) => item.id === entity.id ? entity : item) });
  const addEntity = (type: EntityType) => {
    const entity = createEntity(type, project.entities.filter((item) => item.type === type).length);
    updateProject({ entities: [...project.entities, entity] }); setSelectedId(entity.id); if (type === 'scene') setView('storyboard');
  };
  const removeEntity = (id: string) => { updateProject({ entities: project.entities.filter((item) => item.id !== id), relationships: project.relationships.filter((item) => item.sourceId !== id && item.targetId !== id) }); setSelectedId(undefined); };
  const onConnect = (connection: Connection) => { if (!connection.source || !connection.target) return; const label = window.prompt('How are these story objects connected?', 'relates to') || 'relates to'; updateProject({ relationships: [...project.relationships, { id: `rel_${crypto.randomUUID()}`, sourceId: connection.source, targetId: connection.target, label }] }); };

  return <div className="app-shell">
    <header className="topbar"><div className="brand"><div className="brand-mark">C</div><div><b>Continuum</b><span>Story Engine</span></div></div>
      <nav>{(['world', 'storyboard', 'brief'] as View[]).map((item) => <button key={item} className={view === item ? 'active' : ''} onClick={() => setView(item)}>{item === 'world' ? 'World' : item === 'storyboard' ? 'Storyboard' : 'Brief'}</button>)}</nav>
      <div className="top-actions"><span className="save-state">{saveState}</span><button onClick={() => importRef.current?.click()}>Open</button><button onClick={() => exportProject(project)}>Save file</button><button className="primary" onClick={() => exportStoryboardHtml(project)}>Export storyboard</button><input hidden ref={importRef} type="file" accept=".continuum,application/json" onChange={async (event) => { const file = event.target.files?.[0]; if (!file) return; try { const imported = await importProject(file); setProject(imported); setSelectedId(undefined); } catch (error) { window.alert(error instanceof Error ? error.message : 'Could not open the file.'); } event.target.value = ''; }} /></div>
    </header>
    <aside className="left-rail"><div className="project-fields"><label><span>Project</span><input value={project.title} onChange={(event) => updateProject({ title: event.target.value })} /></label><label><span>Logline</span><textarea value={project.logline} onChange={(event) => updateProject({ logline: event.target.value })} /></label></div>
      <div className="add-menu"><span>Add to world</span>{(Object.keys(entityLabels) as EntityType[]).map((type) => <button key={type} onClick={() => addEntity(type)}><i>{entityLabels[type].slice(0, 1)}</i>{entityLabels[type]}<b>＋</b></button>)}</div>
      <button className="new-project" onClick={() => { if (window.confirm('Start a new blank project? Export the current project first if needed.')) { setProject(createEmptyProject()); setSelectedId(undefined); } }}>New blank project</button>
    </aside>
    <main className="workspace">{view === 'world' && <ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes} fitView onNodeClick={(_, node) => setSelectedId(node.id)} onNodeDragStop={(_, node) => { const entity = project.entities.find((item) => item.id === node.id); if (entity) updateEntity({ ...entity, position: node.position }); }} onConnect={onConnect} deleteKeyCode={null}><Background gap={22} size={1} /><MiniMap pannable zoomable /><Controls /></ReactFlow>}{view === 'storyboard' && <Storyboard project={project} select={setSelectedId} />}{view === 'brief' && <Brief project={project} />}</main>
    <EntityInspector entity={selected} project={project} updateEntity={updateEntity} removeEntity={removeEntity} />
  </div>;
}
