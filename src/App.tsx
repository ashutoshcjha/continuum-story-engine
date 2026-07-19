import { useEffect, useRef, useState } from 'react';
import '@xyflow/react/dist/style.css';
import './styles.css';
import './world-lenses.css';
import './scifi-continuity.css';
import { ChapterWorkspace } from './ChapterWorkspace';
import { EditableBrief, EditableStoryboard } from './EditableViews';
import { EntityInspector } from './EntityInspector';
import { loadLastLocalProject, saveLocalProject } from './db';
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
  getScenesForChapter,
  isStoryChapter,
  isStoryScene,
  normalizeProject,
  type ContinuumProject,
  type EntityType,
  type StoryEntity,
  type StoryRelationship,
  type StoryScene,
} from './model';
import { RelationshipInspector } from './RelationshipInspector';
import type { EffectTargetType } from './SceneEffectsEditor';
import {
  createSceneEffectRelationship,
  effectRelationshipKey,
  initializeStoryLogicEntity,
  normalizeStoryLogic,
  type SceneEffectInput,
} from './storyLogic';
import {
  createSemanticRelationship,
  normalizeScifiProject,
  type SemanticDomain,
  type TechnologyDetails,
} from './scifi';
import { WorldCanvas } from './WorldCanvas';

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

function normalizeContinuum(project: ContinuumProject): ContinuumProject {
  return normalizeScifiProject(normalizeStoryLogic(normalizeProject(project)));
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
  const [project, setProject] = useState<ContinuumProject>(() => normalizeContinuum(createSampleProject()));
  const [selectedId, setSelectedId] = useState<string>();
  const [selectedRelationshipId, setSelectedRelationshipId] = useState<string>();
  const [selectedChapterId, setSelectedChapterId] = useState<string>();
  const [view, setView] = useState<View>('world');
  const [saveState, setSaveState] = useState('Loading local project…');
  const importRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadLastLocalProject().then((stored) => {
      const loaded = normalizeContinuum(stored ?? project);
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
  const selectedRelationship = project.relationships.find((relationship) => relationship.id === selectedRelationshipId);
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
    const logicNormalized = initializeStoryLogicEntity(entity);
    setProject((current) => normalizeScifiProject({
      ...current,
      entities: current.entities.map((item) => item.id === logicNormalized.id ? logicNormalized : item),
    }));
    if (isStoryChapter(logicNormalized)) setSelectedChapterId(logicNormalized.id);
    if (isStoryScene(logicNormalized) && logicNormalized.scene.chapterId) setSelectedChapterId(logicNormalized.scene.chapterId);
  };

  const updateRelationship = (relationship: StoryRelationship) => {
    setProject((current) => ({
      ...current,
      relationships: current.relationships.map((item) => item.id === relationship.id ? relationship : item),
    }));
  };

  const moveEntity = (id: string, position: { x: number; y: number }) => {
    setProject((current) => ({
      ...current,
      entities: current.entities.map((item) => item.id === id ? { ...item, position } : item),
    }));
  };

  const addEntity = (type: EntityType) => {
    const typeCount = project.entities.filter((item) => item.type === type).length;
    const entity = initializeStoryLogicEntity(createEntity(type, typeCount));

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

    setProject((current) => normalizeScifiProject({ ...current, entities: [...current.entities, entity] }));
    setSelectedId(entity.id);
    setSelectedRelationshipId(undefined);
  };

  const addTechnology = () => {
    const entity = createEntity('object', project.entities.filter((item) => item.type === 'object').length);
    const technology: TechnologyDetails = {
      domain: 'general',
      purpose: '',
      operatingPrinciple: '',
      inputs: '',
      outputs: '',
      dependencies: '',
      limitations: '',
      failureModes: '',
      environmentalRequirements: '',
      researchNotes: '',
    };
    entity.name = 'Untitled technology';
    entity.tags = ['technology'];
    entity.technology = technology;
    setProject((current) => normalizeScifiProject({ ...current, entities: [...current.entities, entity] }));
    setSelectedId(entity.id);
    setSelectedRelationshipId(undefined);
    setView('library');
  };

  const addLibraryEntity = (type: LibraryEntityType) => addEntity(type);

  const applyLibraryRecords = (candidates: LibraryImportCandidate[], updateMatches: boolean): LibraryImportResult => {
    const result = applyLibraryImport(project, candidates, updateMatches);
    const normalizedProject = normalizeContinuum(result.project);
    setProject(normalizedProject);
    return { ...result, project: normalizedProject };
  };

  const createCharacterForScene = (sceneId: string, name: string) => {
    const trimmedName = name.trim();
    if (!trimmedName) return;

    setProject((current) => normalizeScifiProject((() => {
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
    })()));
  };

  const addSceneEffect = (sceneId: string, input: SceneEffectInput) => {
    if (!input.targetId || (input.kind === 'character-fact' && !input.characterId)) return;
    setProject((current) => {
      const relationship = createSceneEffectRelationship(sceneId, input);
      const key = effectRelationshipKey(relationship);
      if (current.relationships.some((candidate) => effectRelationshipKey(candidate) === key)) return current;
      return { ...current, relationships: [...current.relationships, relationship] };
    });
  };

  const createEffectTarget = (
    sceneId: string,
    type: EffectTargetType,
    name: string,
    input: Omit<SceneEffectInput, 'targetId'>,
  ) => {
    const trimmedName = name.trim();
    if (!trimmedName) return;
    setProject((current) => normalizeScifiProject((() => {
      let entity = initializeStoryLogicEntity(createEntity(type, current.entities.filter((item) => item.type === type).length));
      entity = { ...entity, name: trimmedName };
      if (type === 'plot-thread' && entity.plotThread) {
        entity = { ...entity, plotThread: { ...entity.plotThread, centralQuestion: trimmedName } };
      }
      if (type === 'fact' && entity.fact) {
        entity = { ...entity, fact: { ...entity.fact, proposition: trimmedName } };
      }
      if (type === 'world-rule' && entity.worldRule) {
        entity = { ...entity, worldRule: { ...entity.worldRule, statement: trimmedName } };
      }
      const relationship = createSceneEffectRelationship(sceneId, { ...input, targetId: entity.id });
      return {
        ...current,
        entities: [...current.entities, entity],
        relationships: [...current.relationships, relationship],
      };
    })()));
  };

  const createSemanticRelationshipRecord = (
    sourceId: string,
    targetId: string,
    domain: SemanticDomain,
    action: string,
    note: string,
  ) => {
    const relationship = createSemanticRelationship(sourceId, targetId, domain, action, note);
    setProject((current) => ({ ...current, relationships: [...current.relationships, relationship] }));
    setSelectedRelationshipId(relationship.id);
    setSelectedId(undefined);
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
              travel: item.scene.travel
                ? {
                  ...item.scene.travel,
                  originId: item.scene.travel.originId === id ? undefined : item.scene.travel.originId,
                  destinationId: item.scene.travel.destinationId === id ? undefined : item.scene.travel.destinationId,
                }
                : item.scene.travel,
            },
          };
        }),
      relationships: current.relationships.filter((item) => (
        item.sourceId !== id && item.targetId !== id && item.sceneId !== id
      )),
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
    const relationship: StoryRelationship = {
      id: `rel_${crypto.randomUUID()}`,
      sourceId,
      targetId,
      label,
      kind: 'custom',
      note: '',
    };
    setProject((current) => ({ ...current, relationships: [...current.relationships, relationship] }));
    setSelectedId(undefined);
    setSelectedRelationshipId(relationship.id);
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
                const imported = normalizeContinuum(await importProject(file));
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
          <button onClick={addTechnology}><i>T</i>Technology / System<b>＋</b></button>
        </div>
        <button
          className="new-project"
          onClick={() => {
            if (window.confirm('Start a new blank project? Export the current project first if needed.')) {
              const blank = normalizeContinuum(createEmptyProject());
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
            selectedChapterId={selectedChapterId}
            onSelectEntity={selectEntity}
            onSelectRelationship={selectRelationship}
            onSelectChapter={selectChapter}
            onClearSelection={clearSelection}
            onMoveEntity={moveEntity}
            onCreateRelationship={createRelationship}
            onDeleteRelationship={deleteRelationship}
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
            onAddEffect={addSceneEffect}
            onUpdateRelationship={updateRelationship}
            onDeleteRelationship={deleteRelationship}
            onCreateEffectTarget={createEffectTarget}
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
          onUpdateRelationship={updateRelationship}
          onDelete={deleteRelationship}
          onSelectEntity={selectEntity}
        />
      ) : (
        <EntityInspector
          entity={selected}
          project={project}
          updateEntity={updateEntity}
          removeEntity={removeEntity}
          onAddEffect={addSceneEffect}
          onUpdateRelationship={updateRelationship}
          onDeleteRelationship={deleteRelationship}
          onCreateSemanticRelationship={createSemanticRelationshipRecord}
          onCreateEffectTarget={createEffectTarget}
        />
      )}
    </div>
  );
}
