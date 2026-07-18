import { useEffect, useRef, useState } from 'react';
import '@xyflow/react/dist/style.css';
import './styles.css';
import { ChapterWorkspace } from './ChapterWorkspace';
import { EditableBrief, EditableStoryboard } from './EditableViews';
import { loadLastLocalProject, saveLocalProject } from './db';
import { prepareStoryImage } from './imageProcessing';
import { exportProject, exportStoryboardHtml, importProject } from './io';
import { LibraryWorkspace } from './LibraryWorkspace';
import {
  applyLibraryImport,
  type LibraryEntityType,
  type LibraryImportCandidate,
  type LibraryImportResult,
} from './libraryIO';
import {
  chapterInheritedPrefix,
  chapterMembershipPrefix,
  createEmptyProject,
  createEntity,
  createSampleProject,
  getChapterForScene,
  getChapters,
  getSceneChapterResolution,
  getScenesForChapter,
  isStoryChapter,
  isStoryScene,
  normalizeProject,
  type ContinuumProject,
  type EntityType,
  type StoryChapter,
  type StoryEntity,
  type StoryRelationship,
  type StoryScene,
} from './model';
import { RelationshipInspector } from './RelationshipInspector';
import { WorldCanvas } from './WorldCanvas';
import { createWorldLayout } from './worldLayout';

type View = 'library' | 'world' | 'chapters' | 'storyboard' | 'brief';

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

function TextField({
  label,
  value,
  onChange,
  multiline = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  multiline?: boolean;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {multiline ? (
        <textarea value={value} onChange={(event) => onChange(event.target.value)} />
      ) : (
        <input value={value} onChange={(event) => onChange(event.target.value)} />
      )}
    </label>
  );
}

function EntityInspector({
  entity,
  project,
  updateEntity,
  removeEntity,
}: {
  entity?: StoryEntity;
  project: ContinuumProject;
  updateEntity: (entity: StoryEntity) => void;
  removeEntity: (id: string) => void;
}) {
  const imageRef = useRef<HTMLInputElement>(null);
  const [linkLabel, setLinkLabel] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [isAddingImages, setIsAddingImages] = useState(false);

  if (!entity) {
    return (
      <aside className="inspector empty-panel">
        <span>Selection</span>
        <h2>Choose an object</h2>
        <p>Select a chapter, scene, relationship, card, or library item to edit it.</p>
      </aside>
    );
  }

  const patch = (changes: Partial<StoryEntity>) => updateEntity({ ...entity, ...changes });
  const scene = isStoryScene(entity) ? entity : undefined;
  const chapter = isStoryChapter(entity) ? entity : undefined;
  const patchScene = (changes: Partial<StoryScene['scene']>) => {
    if (scene) updateEntity({ ...scene, scene: { ...scene.scene, ...changes } });
  };
  const patchChapter = (changes: Partial<StoryChapter['chapter']>) => {
    if (chapter) updateEntity({ ...chapter, chapter: { ...chapter.chapter, ...changes } });
  };
  const characters = project.entities.filter((item) => item.type === 'character');
  const locations = project.entities.filter((item) => item.type === 'location');
  const chapters = getChapters(project);
  const images = entity.images ?? [];
  const links = entity.links ?? [];
  const chapterResolution = scene ? getSceneChapterResolution(project, scene.id) : undefined;
  const resolvedChapter = chapterResolution?.chapterId
    ? chapters.find((item) => item.id === chapterResolution.chapterId)
    : undefined;
  const sourceSceneNames = chapterResolution?.sourceSceneIds
    .map((sceneId) => project.entities.find((item) => item.id === sceneId)?.name)
    .filter((name): name is string => Boolean(name)) ?? [];
  const conflictingChapters = chapterResolution?.conflictingChapterIds
    .map((chapterId) => chapters.find((item) => item.id === chapterId)?.name)
    .filter((name): name is string => Boolean(name)) ?? [];

  const addImages = async (files: FileList | null) => {
    if (!files?.length) return;
    const accepted = Array.from(files).filter((file) => file.type.startsWith('image/'));
    if (!accepted.length) return;
    setIsAddingImages(true);
    try {
      const additions = await Promise.all(accepted.map(prepareStoryImage));
      patch({ images: [...images, ...additions] });
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Could not add the selected image.');
    } finally {
      setIsAddingImages(false);
    }
  };

  const addLink = () => {
    const raw = linkUrl.trim();
    if (!raw) return;
    let url: URL;
    try {
      url = new URL(raw);
    } catch {
      window.alert('Enter a complete URL such as https://example.com.');
      return;
    }
    if (!['http:', 'https:'].includes(url.protocol)) {
      window.alert('Only http and https links are supported.');
      return;
    }
    patch({
      links: [
        ...links,
        {
          id: `link_${crypto.randomUUID()}`,
          label: linkLabel.trim() || url.hostname,
          url: url.toString(),
        },
      ],
    });
    setLinkLabel('');
    setLinkUrl('');
  };

  const requestEntityDeletion = () => {
    const confirmed = window.confirm(`Delete the ${entityLabels[entity.type].toLowerCase()} “${entity.name}” and all of its story relationships?`);
    if (confirmed) removeEntity(entity.id);
  };

  return (
    <aside className="inspector">
      <div className="inspector-heading">
        <span>{entityLabels[entity.type]}</span>
        <button className="danger-link" onClick={requestEntityDeletion}>Delete entity</button>
      </div>
      <TextField label="Name" value={entity.name} onChange={(name) => patch({ name })} />
      <TextField label="Summary" value={entity.summary} multiline onChange={(summary) => patch({ summary })} />
      <TextField
        label="Tags (comma separated)"
        value={entity.tags.join(', ')}
        onChange={(tags) => patch({ tags: tags.split(',').map((tag) => tag.trim()).filter(Boolean) })}
      />

      <section className="attachment-section">
        <div className="attachment-heading">
          <span>Images</span>
          <button disabled={isAddingImages} onClick={() => imageRef.current?.click()}>
            {isAddingImages ? 'Optimizing…' : 'Add image'}
          </button>
        </div>
        <input
          ref={imageRef}
          hidden
          type="file"
          accept="image/*"
          multiple
          onChange={async (event) => {
            await addImages(event.target.files);
            event.target.value = '';
          }}
        />
        {images.length > 0 ? (
          <div className="image-grid">
            {images.map((image, index) => (
              <figure key={image.id}>
                <img src={image.thumbnailUrl ?? image.dataUrl} alt={image.name} loading="lazy" decoding="async" />
                <figcaption>
                  <span>{index === 0 ? 'Cover · ' : ''}{image.name}</span>
                  <button onClick={() => patch({ images: images.filter((item) => item.id !== image.id) })}>×</button>
                </figcaption>
              </figure>
            ))}
          </div>
        ) : (
          <p className="attachment-empty">The first image becomes the node thumbnail and appears in exports.</p>
        )}
      </section>

      <section className="attachment-section">
        <div className="attachment-heading"><span>External links</span></div>
        <div className="link-form">
          <input aria-label="Link label" placeholder="Label" value={linkLabel} onChange={(event) => setLinkLabel(event.target.value)} />
          <input
            aria-label="URL"
            placeholder="https://…"
            value={linkUrl}
            onChange={(event) => setLinkUrl(event.target.value)}
            onKeyDown={(event) => { if (event.key === 'Enter') addLink(); }}
          />
          <button onClick={addLink}>Add</button>
        </div>
        {links.length > 0 ? (
          <ul className="link-list">
            {links.map((link) => (
              <li key={link.id}>
                <a href={link.url} target="_blank" rel="noreferrer">{link.label}</a>
                <button onClick={() => patch({ links: links.filter((item) => item.id !== link.id) })}>×</button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="attachment-empty">Link research, maps, reference pages, playlists, or source material to this node.</p>
        )}
      </section>

      {chapter && (
        <div className="scene-fields">
          <label className="field">
            <span>Chapter order</span>
            <input type="number" min="1" value={chapter.chapter.order} onChange={(event) => patchChapter({ order: Number(event.target.value) })} />
          </label>
          <TextField label="Chapter objective" value={chapter.chapter.objective} multiline onChange={(objective) => patchChapter({ objective })} />
          <TextField label="Opening state" value={chapter.chapter.openingState} multiline onChange={(openingState) => patchChapter({ openingState })} />
          <TextField label="Closing state" value={chapter.chapter.closingState} multiline onChange={(closingState) => patchChapter({ closingState })} />
          <TextField label="Ghostwriter notes" value={chapter.chapter.ghostwriterNotes} multiline onChange={(ghostwriterNotes) => patchChapter({ ghostwriterNotes })} />
        </div>
      )}

      {scene && chapterResolution && (
        <div className="scene-fields">
          <div className="two-fields">
            <label className="field">
              <span>Order in chapter</span>
              <input type="number" min="1" value={scene.scene.order} onChange={(event) => patchScene({ order: Number(event.target.value) })} />
            </label>
            <label className="field">
              <span>Chapter</span>
              <select
                value={scene.scene.chapterId ?? (scene.scene.chapterInheritanceBlocked ? '__blocked__' : '__inherit__')}
                onChange={(event) => {
                  const value = event.target.value;
                  if (value === '__inherit__') {
                    patchScene({ chapterId: undefined, chapterInheritanceBlocked: false });
                  } else if (value === '__blocked__') {
                    patchScene({ chapterId: undefined, chapterInheritanceBlocked: true });
                  } else {
                    patchScene({ chapterId: value || undefined, chapterInheritanceBlocked: false });
                  }
                }}
              >
                <option value="__inherit__">
                  {chapterResolution.mode === 'inherited' && resolvedChapter
                    ? `Use scene hierarchy — ${resolvedChapter.name}`
                    : 'Use scene hierarchy'}
                </option>
                <option value="__blocked__">Keep unassigned</option>
                {chapters.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
            </label>
          </div>
          {chapterResolution.mode === 'inherited' && resolvedChapter && (
            <div className="chapter-resolution-note is-inherited">
              <b>Inherited chapter</b>
              <p>{resolvedChapter.name}, through {sourceSceneNames.length ? sourceSceneNames.join(', ') : 'linked scenes'}.</p>
            </div>
          )}
          {chapterResolution.mode === 'ambiguous' && (
            <div className="chapter-resolution-note is-warning">
              <b>Hierarchy conflict</b>
              <p>Linked scenes are anchored in {conflictingChapters.join(' and ')}. Choose a chapter manually or keep this scene unassigned.</p>
            </div>
          )}
          {scene.scene.chapterInheritanceBlocked && (
            <div className="chapter-resolution-note">
              <b>Inheritance disabled</b>
              <p>This scene stays unassigned even when it is linked to scenes in a chapter.</p>
            </div>
          )}
          <label className="field">
            <span>POV character</span>
            <select
              value={scene.scene.povCharacterId ?? ''}
              onChange={(event) => {
                const povCharacterId = event.target.value || undefined;
                patchScene({
                  povCharacterId,
                  participantIds: povCharacterId && !scene.scene.participantIds.includes(povCharacterId)
                    ? [...scene.scene.participantIds, povCharacterId]
                    : scene.scene.participantIds,
                });
              }}
            >
              <option value="">Not set</option>
              {characters.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </label>
          <label className="field">
            <span>Location</span>
            <select value={scene.scene.locationId ?? ''} onChange={(event) => patchScene({ locationId: event.target.value || undefined })}>
              <option value="">Not set</option>
              {locations.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </label>
          <TextField label="Purpose" value={scene.scene.purpose} multiline onChange={(purpose) => patchScene({ purpose })} />
          <TextField label="Conflict" value={scene.scene.conflict} multiline onChange={(conflict) => patchScene({ conflict })} />
          <TextField label="Turning point" value={scene.scene.turningPoint} multiline onChange={(turningPoint) => patchScene({ turningPoint })} />
          <TextField label="Outcome" value={scene.scene.outcome} multiline onChange={(outcome) => patchScene({ outcome })} />
          <div className="two-fields">
            <TextField label="Emotion in" value={scene.scene.emotionalStart} onChange={(emotionalStart) => patchScene({ emotionalStart })} />
            <TextField label="Emotion out" value={scene.scene.emotionalEnd} onChange={(emotionalEnd) => patchScene({ emotionalEnd })} />
          </div>
          <TextField label="Reveal" value={scene.scene.reveal} multiline onChange={(reveal) => patchScene({ reveal })} />
          <TextField label="Keep concealed" value={scene.scene.conceal} multiline onChange={(conceal) => patchScene({ conceal })} />
          <TextField label="Ghostwriter notes" value={scene.scene.ghostwriterNotes} multiline onChange={(ghostwriterNotes) => patchScene({ ghostwriterNotes })} />
        </div>
      )}

      {!scene && !chapter && <TextField label="Notes" value={entity.notes} multiline onChange={(notes) => patch({ notes })} />}
    </aside>
  );
}

function isChapterMembershipRelationship(relationshipId?: string): boolean {
  return Boolean(relationshipId?.startsWith(chapterMembershipPrefix) || relationshipId?.startsWith(chapterInheritedPrefix));
}

function membershipSceneId(relationshipId?: string): string | undefined {
  if (relationshipId?.startsWith(chapterMembershipPrefix)) return relationshipId.slice(chapterMembershipPrefix.length);
  if (relationshipId?.startsWith(chapterInheritedPrefix)) return relationshipId.slice(chapterInheritedPrefix.length);
  return undefined;
}

export default function App() {
  const [project, setProject] = useState<ContinuumProject>(() => createSampleProject());
  const [selectedId, setSelectedId] = useState<string>();
  const [selectedRelationshipId, setSelectedRelationshipId] = useState<string>();
  const [selectedChapterId, setSelectedChapterId] = useState<string>();
  const [view, setView] = useState<View>('world');
  const [saveState, setSaveState] = useState('Loading local project…');
  const importRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadLastLocalProject().then((stored) => {
      const loaded = stored ? normalizeProject(stored) : normalizeProject(project);
      setProject(loaded);
      setSelectedChapterId(getChapters(loaded)[0]?.id);
      setSaveState('Saved locally');
    });
  }, []);

  useEffect(() => {
    const chapters = getChapters(project);
    if (!chapters.some((chapter) => chapter.id === selectedChapterId)) {
      setSelectedChapterId(chapters[0]?.id);
    }
  }, [project, selectedChapterId]);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      const updated = { ...project, updatedAt: new Date().toISOString() };
      saveLocalProject(updated).then(() => {
        setSaveState(`Saved locally · ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`);
      });
    }, 1200);
    setSaveState('Unsaved changes');
    return () => window.clearTimeout(handle);
  }, [project]);

  const selected = project.entities.find((entity) => entity.id === selectedId);
  const selectedRelationship: StoryRelationship | undefined = project.relationships.find((relationship) => relationship.id === selectedRelationshipId);
  const selectedMembershipSceneId = membershipSceneId(selectedRelationshipId);
  const selectedMembershipScene = selectedMembershipSceneId
    ? project.entities.find((entity): entity is StoryScene => entity.id === selectedMembershipSceneId && isStoryScene(entity))
    : undefined;
  const selectedMembershipInherited = Boolean(selectedRelationshipId?.startsWith(chapterInheritedPrefix));

  const clearSelection = () => {
    setSelectedId(undefined);
    setSelectedRelationshipId(undefined);
  };

  const selectChapter = (chapterId: string) => {
    setSelectedChapterId(chapterId);
    setSelectedId(chapterId);
    setSelectedRelationshipId(undefined);
  };

  const selectEntity = (entityId: string) => {
    const entity = project.entities.find((item) => item.id === entityId);
    setSelectedId(entityId);
    setSelectedRelationshipId(undefined);
    if (entity && isStoryChapter(entity)) setSelectedChapterId(entity.id);
    if (entity && isStoryScene(entity)) {
      const chapter = getChapterForScene(project, entity);
      if (chapter) setSelectedChapterId(chapter.id);
    }
  };

  const selectRelationship = (relationshipId: string) => {
    setSelectedRelationshipId(relationshipId);
    setSelectedId(undefined);
  };

  const updateProject = (patch: Partial<ContinuumProject>) => {
    setProject((current) => ({ ...current, ...patch }));
  };

  const updateEntity = (entity: StoryEntity) => {
    setProject((current) => ({
      ...current,
      entities: current.entities.map((item) => item.id === entity.id ? entity : item),
    }));
    if (isStoryChapter(entity)) setSelectedChapterId(entity.id);
    if (isStoryScene(entity) && entity.scene.chapterId) setSelectedChapterId(entity.scene.chapterId);
  };

  const moveEntity = (id: string, position: { x: number; y: number }) => {
    setProject((current) => ({
      ...current,
      entities: current.entities.map((item) => item.id === id ? { ...item, position } : item),
    }));
  };

  const arrangeWorld = () => {
    setProject((current) => {
      const positions = createWorldLayout(current);
      return {
        ...current,
        entities: current.entities.map((entity) => ({
          ...entity,
          position: positions[entity.id] ?? entity.position,
        })),
      };
    });
  };

  const addEntity = (type: EntityType) => {
    const typeCount = project.entities.filter((item) => item.type === type).length;
    const entity = createEntity(type, typeCount);

    if (isStoryScene(entity)) {
      const chapterId = selectedChapterId ?? getChapters(project)[0]?.id;
      entity.scene.chapterId = chapterId;
      entity.scene.chapterInheritanceBlocked = false;
      entity.scene.order = getScenesForChapter(project, chapterId).length + 1;
      if (chapterId) setSelectedChapterId(chapterId);
      setView('storyboard');
    }

    if (isStoryChapter(entity)) {
      setSelectedChapterId(entity.id);
      setView('chapters');
    }

    setProject((current) => ({ ...current, entities: [...current.entities, entity] }));
    setSelectedId(entity.id);
    setSelectedRelationshipId(undefined);
  };

  const addLibraryEntity = (type: LibraryEntityType) => addEntity(type);

  const applyLibraryRecords = (candidates: LibraryImportCandidate[], updateMatches: boolean): LibraryImportResult => {
    const result = applyLibraryImport(project, candidates, updateMatches);
    setProject(result.project);
    return result;
  };

  const createCharacterForScene = (sceneId: string, name: string) => {
    const trimmedName = name.trim();
    if (!trimmedName) return;

    setProject((current) => {
      const scene = current.entities.find((entity): entity is StoryScene => entity.id === sceneId && isStoryScene(entity));
      const character = createEntity('character', current.entities.filter((entity) => entity.type === 'character').length);
      character.name = trimmedName;
      if (scene) {
        character.position = {
          x: scene.position.x + 280,
          y: scene.position.y + Math.max(0, scene.scene.participantIds.length - 1) * 120,
        };
      }

      return {
        ...current,
        entities: [
          ...current.entities.map((entity) => (
            entity.id === sceneId && isStoryScene(entity)
              ? {
                ...entity,
                scene: {
                  ...entity.scene,
                  participantIds: [...new Set([...entity.scene.participantIds, character.id])],
                },
              }
              : entity
          )),
          character,
        ],
      };
    });
  };

  const deletionBlocker = (entity: StoryEntity): string | undefined => {
    if (!isStoryChapter(entity)) return undefined;
    if (getChapters(project).length === 1) return 'A project must keep at least one chapter.';
    const sceneCount = getScenesForChapter(project, entity.id).length;
    if (sceneCount > 0) return `Move, detach, or delete the ${sceneCount} scene${sceneCount === 1 ? '' : 's'} in this chapter before deleting it.`;
    return undefined;
  };

  const removeEntity = (id: string): boolean => {
    const entity = project.entities.find((item) => item.id === id);
    if (!entity) return false;
    const blocker = deletionBlocker(entity);
    if (blocker) {
      window.alert(blocker);
      return false;
    }

    setProject((current) => ({
      ...current,
      entities: current.entities
        .filter((item) => item.id !== id)
        .map((item) => {
          if (!isStoryScene(item)) return item;
          return {
            ...item,
            scene: {
              ...item.scene,
              chapterId: item.scene.chapterId === id ? undefined : item.scene.chapterId,
              povCharacterId: item.scene.povCharacterId === id ? undefined : item.scene.povCharacterId,
              locationId: item.scene.locationId === id ? undefined : item.scene.locationId,
              participantIds: item.scene.participantIds.filter((participantId) => participantId !== id),
            },
          };
        }),
      relationships: current.relationships.filter((item) => item.sourceId !== id && item.targetId !== id),
    }));
    clearSelection();
    return true;
  };

  const requestDeleteEntity = (id: string): boolean => {
    const entity = project.entities.find((item) => item.id === id);
    if (!entity) return false;
    const blocker = deletionBlocker(entity);
    if (blocker) {
      window.alert(blocker);
      return false;
    }
    const confirmed = window.confirm(`Delete the ${entityLabels[entity.type].toLowerCase()} “${entity.name}” and all of its story relationships?`);
    return confirmed ? removeEntity(id) : false;
  };

  const createRelationship = (sourceId: string, targetId: string, label: string) => {
    const relationshipId = `rel_${crypto.randomUUID()}`;
    setProject((current) => ({
      ...current,
      relationships: [
        ...current.relationships,
        { id: relationshipId, sourceId, targetId, label },
      ],
    }));
    setSelectedId(undefined);
    setSelectedRelationshipId(relationshipId);
  };

  const updateRelationshipLabel = (relationshipId: string, label: string) => {
    setProject((current) => ({
      ...current,
      relationships: current.relationships.map((relationship) => (
        relationship.id === relationshipId ? { ...relationship, label } : relationship
      )),
    }));
  };

  const deleteRelationship = (relationshipId: string) => {
    if (isChapterMembershipRelationship(relationshipId)) {
      const sceneId = membershipSceneId(relationshipId);
      setProject((current) => ({
        ...current,
        entities: current.entities.map((entity) => (
          entity.id === sceneId && isStoryScene(entity)
            ? {
              ...entity,
              scene: {
                ...entity.scene,
                chapterId: undefined,
                chapterInheritanceBlocked: true,
              },
            }
            : entity
        )),
      }));
    } else {
      setProject((current) => ({
        ...current,
        relationships: current.relationships.filter((relationship) => relationship.id !== relationshipId),
      }));
    }
    setSelectedRelationshipId(undefined);
  };

  const viewLabels: Record<View, string> = {
    library: 'Library',
    world: 'World',
    chapters: 'Chapters',
    storyboard: 'Storyboard',
    brief: 'Brief',
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">C</div>
          <div><b>Continuum</b><span>Story Engine</span></div>
        </div>
        <nav>
          {(['library', 'world', 'chapters', 'storyboard', 'brief'] as View[]).map((item) => (
            <button key={item} className={view === item ? 'active' : ''} onClick={() => setView(item)}>{viewLabels[item]}</button>
          ))}
        </nav>
        <div className="top-actions">
          <span className="save-state">{saveState}</span>
          <button onClick={() => importRef.current?.click()}>Open</button>
          <button onClick={() => exportProject(project)}>Save file</button>
          <button className="primary" onClick={() => exportStoryboardHtml(project)}>Export storyboard</button>
          <input
            hidden
            ref={importRef}
            type="file"
            accept=".continuum,application/json"
            onChange={async (event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              try {
                const imported = await importProject(file);
                setProject(imported);
                setSelectedChapterId(getChapters(imported)[0]?.id);
                clearSelection();
              } catch (error) {
                window.alert(error instanceof Error ? error.message : 'Could not open the file.');
              }
              event.target.value = '';
            }}
          />
        </div>
      </header>

      <aside className="left-rail">
        <div className="project-fields">
          <label><span>Project</span><input value={project.title} onChange={(event) => updateProject({ title: event.target.value })} /></label>
          <label><span>Logline</span><textarea value={project.logline} onChange={(event) => updateProject({ logline: event.target.value })} /></label>
        </div>
        <div className="add-menu">
          <span>Add to story</span>
          {(Object.keys(entityLabels) as EntityType[]).map((type) => (
            <button key={type} onClick={() => addEntity(type)}>
              <i>{entityLabels[type].slice(0, 1)}</i>{entityLabels[type]}<b>＋</b>
            </button>
          ))}
        </div>
        <button
          className="new-project"
          onClick={() => {
            if (window.confirm('Start a new blank project? Export the current project first if needed.')) {
              const blank = createEmptyProject();
              setProject(blank);
              setSelectedChapterId(getChapters(blank)[0]?.id);
              clearSelection();
            }
          }}
        >
          New blank project
        </button>
      </aside>

      <main className="workspace">
        {view === 'library' && (
          <LibraryWorkspace
            project={project}
            onAddEntity={addLibraryEntity}
            onSelectEntity={selectEntity}
            onUpdateEntity={updateEntity}
            onApplyImport={applyLibraryRecords}
          />
        )}
        {view === 'world' && (
          <WorldCanvas
            project={project}
            selectedEntityId={selectedId}
            selectedRelationshipId={selectedRelationshipId}
            onSelectEntity={selectEntity}
            onSelectRelationship={selectRelationship}
            onClearSelection={clearSelection}
            onMoveEntity={moveEntity}
            onCreateRelationship={createRelationship}
            onDeleteRelationship={deleteRelationship}
            onArrangeWorld={arrangeWorld}
            onRequestDeleteEntity={requestDeleteEntity}
          />
        )}
        {view === 'chapters' && (
          <ChapterWorkspace
            project={project}
            selectedChapterId={selectedChapterId}
            onSelectChapter={selectChapter}
            onSelectEntity={selectEntity}
            onOpenStoryboard={() => setView('storyboard')}
            onOpenBrief={() => setView('brief')}
            onUpdateEntity={updateEntity}
          />
        )}
        {view === 'storyboard' && (
          <EditableStoryboard
            project={project}
            selectedChapterId={selectedChapterId}
            onSelectChapter={selectChapter}
            onSelectEntity={selectEntity}
            onUpdateEntity={updateEntity}
            onCreateCharacter={createCharacterForScene}
          />
        )}
        {view === 'brief' && (
          <EditableBrief
            project={project}
            selectedChapterId={selectedChapterId}
            onSelectChapter={selectChapter}
            onUpdateEntity={updateEntity}
            onUpdateProject={updateProject}
          />
        )}
      </main>

      {selectedRelationshipId ? (
        <RelationshipInspector
          project={project}
          relationship={selectedRelationship}
          membershipScene={selectedMembershipScene}
          membershipInherited={selectedMembershipInherited}
          onUpdateLabel={updateRelationshipLabel}
          onDelete={deleteRelationship}
          onSelectEntity={selectEntity}
        />
      ) : (
        <EntityInspector entity={selected} project={project} updateEntity={updateEntity} removeEntity={removeEntity} />
      )}
    </div>
  );
}
