import { useMemo, useState, type MouseEvent } from 'react';
import { InlineEdit } from './InlineEdit';
import {
  describeEffect,
  effectActionOptions,
  effectKindLabels,
  getChapterEffects,
  getEffectCharacter,
  getEffectTarget,
  getSceneEffects,
  relationshipKind,
  updateEffectAction,
  type EffectRelationshipKind,
  type RelationshipAction,
  type SceneEffectInput,
} from './storyLogic';
import type { ContinuumProject, EntityType, StoryRelationship, StoryScene } from './model';

export type EffectTargetType = Extract<EntityType, 'plot-thread' | 'fact' | 'world-rule'>;

interface EffectCallbacks {
  onAddEffect: (sceneId: string, input: SceneEffectInput) => void;
  onUpdateRelationship: (relationship: StoryRelationship) => void;
  onDeleteRelationship: (relationshipId: string) => void;
  onCreateEffectTarget: (
    sceneId: string,
    type: EffectTargetType,
    name: string,
    input: Omit<SceneEffectInput, 'targetId'>,
  ) => void;
}

interface SceneEffectsEditorProps extends EffectCallbacks {
  project: ContinuumProject;
  scene: StoryScene;
  variant?: 'card' | 'inspector';
}

const targetTypeByKind: Record<EffectRelationshipKind, EffectTargetType> = {
  'scene-thread': 'plot-thread',
  'scene-fact': 'fact',
  'scene-rule': 'world-rule',
  'character-fact': 'fact',
};

const defaultActionByKind: Record<EffectRelationshipKind, RelationshipAction> = {
  'scene-thread': 'advance',
  'scene-fact': 'reveal-reader',
  'scene-rule': 'demonstrate',
  'character-fact': 'learn',
};

function stop(event: MouseEvent<HTMLElement>) {
  event.stopPropagation();
}

function EffectRow({
  project,
  relationship,
  onUpdateRelationship,
  onDeleteRelationship,
}: {
  project: ContinuumProject;
  relationship: StoryRelationship;
  onUpdateRelationship: (relationship: StoryRelationship) => void;
  onDeleteRelationship: (relationshipId: string) => void;
}) {
  const kind = relationshipKind(relationship) as EffectRelationshipKind;
  const target = getEffectTarget(project, relationship);
  const character = getEffectCharacter(project, relationship);
  const options = effectActionOptions[kind];

  return (
    <div className={`scene-effect-row scene-effect-row--${kind}`}>
      <div className="scene-effect-route">
        {character && <b>{character.name}</b>}
        <select
          aria-label="Effect action"
          value={relationship.action ?? options[0].value}
          onChange={(event) => onUpdateRelationship(updateEffectAction(relationship, event.target.value as RelationshipAction))}
        >
          {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
        <strong>{target?.name ?? 'Missing entity'}</strong>
      </div>

      <InlineEdit
        value={relationship.note ?? ''}
        multiline
        placeholder="Double-click to explain what changes"
        ariaLabel="Effect explanation"
        onCommit={(note) => onUpdateRelationship({ ...relationship, note })}
      />

      <div className="scene-effect-metadata">
        {kind === 'scene-thread' && (
          <label>
            <span>Weight</span>
            <select
              value={relationship.importance ?? 'major'}
              onChange={(event) => onUpdateRelationship({ ...relationship, importance: event.target.value as 'minor' | 'major' })}
            >
              <option value="minor">Minor beat</option>
              <option value="major">Major beat</option>
            </select>
          </label>
        )}
        {kind === 'character-fact' && (
          <label>
            <span>Confidence</span>
            <select
              value={relationship.confidence ?? 'high'}
              onChange={(event) => onUpdateRelationship({
                ...relationship,
                confidence: event.target.value as 'low' | 'medium' | 'high' | 'certain',
              })}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="certain">Certain</option>
            </select>
          </label>
        )}
        {kind === 'scene-rule' && (
          <label className="scene-effect-check">
            <input
              type="checkbox"
              checked={relationship.consequenceOccurs ?? false}
              onChange={(event) => onUpdateRelationship({ ...relationship, consequenceOccurs: event.target.checked })}
            />
            <span>Consequence occurs in this scene</span>
          </label>
        )}
        <button className="scene-effect-remove" onClick={() => onDeleteRelationship(relationship.id)}>Remove</button>
      </div>
    </div>
  );
}

function AddEffectRow({
  project,
  scene,
  kind,
  onAddEffect,
  onCreateEffectTarget,
}: {
  project: ContinuumProject;
  scene: StoryScene;
  kind: EffectRelationshipKind;
  onAddEffect: (sceneId: string, input: SceneEffectInput) => void;
  onCreateEffectTarget: SceneEffectsEditorProps['onCreateEffectTarget'];
}) {
  const targetType = targetTypeByKind[kind];
  const targets = project.entities
    .filter((entity) => entity.type === targetType)
    .sort((first, second) => first.name.localeCompare(second.name));
  const characters = project.entities
    .filter((entity) => entity.type === 'character')
    .sort((first, second) => first.name.localeCompare(second.name));
  const [targetId, setTargetId] = useState('');
  const [characterId, setCharacterId] = useState(scene.scene.povCharacterId ?? scene.scene.participantIds[0] ?? '');
  const [action, setAction] = useState<RelationshipAction>(defaultActionByKind[kind]);
  const [newName, setNewName] = useState('');

  const add = () => {
    if (!targetId || (kind === 'character-fact' && !characterId)) return;
    onAddEffect(scene.id, {
      kind,
      action,
      targetId,
      characterId: kind === 'character-fact' ? characterId : undefined,
      importance: kind === 'scene-thread' ? 'major' : undefined,
      confidence: kind === 'character-fact' ? 'high' : undefined,
      consequenceOccurs: kind === 'scene-rule' ? false : undefined,
    });
    setTargetId('');
  };

  const create = () => {
    const name = newName.trim();
    if (!name || (kind === 'character-fact' && !characterId)) return;
    onCreateEffectTarget(scene.id, targetType, name, {
      kind,
      action,
      characterId: kind === 'character-fact' ? characterId : undefined,
      importance: kind === 'scene-thread' ? 'major' : undefined,
      confidence: kind === 'character-fact' ? 'high' : undefined,
      consequenceOccurs: kind === 'scene-rule' ? false : undefined,
    });
    setNewName('');
  };

  return (
    <div className="scene-effect-add">
      <div className="scene-effect-add-fields">
        {kind === 'character-fact' && (
          <select aria-label="Character" value={characterId} onChange={(event) => setCharacterId(event.target.value)}>
            <option value="">Choose character</option>
            {characters.map((character) => <option key={character.id} value={character.id}>{character.name}</option>)}
          </select>
        )}
        <select aria-label="Effect action" value={action} onChange={(event) => setAction(event.target.value as RelationshipAction)}>
          {effectActionOptions[kind].map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
        <select aria-label="Effect target" value={targetId} onChange={(event) => setTargetId(event.target.value)}>
          <option value="">Choose {targetType.replace('-', ' ')}</option>
          {targets.map((target) => <option key={target.id} value={target.id}>{target.name}</option>)}
        </select>
        <button disabled={!targetId || (kind === 'character-fact' && !characterId)} onClick={add}>Add</button>
      </div>
      <div className="scene-effect-create">
        <input
          value={newName}
          onChange={(event) => setNewName(event.target.value)}
          onKeyDown={(event) => {
            event.stopPropagation();
            if (event.key === 'Enter') {
              event.preventDefault();
              create();
            }
          }}
          placeholder={`Or create a new ${targetType.replace('-', ' ')}…`}
        />
        <button disabled={!newName.trim() || (kind === 'character-fact' && !characterId)} onClick={create}>Create & add</button>
      </div>
    </div>
  );
}

function EffectSection({
  project,
  scene,
  kind,
  effects,
  onAddEffect,
  onUpdateRelationship,
  onDeleteRelationship,
  onCreateEffectTarget,
}: SceneEffectsEditorProps & { kind: EffectRelationshipKind; effects: StoryRelationship[] }) {
  return (
    <section className={`scene-effect-section scene-effect-section--${kind}`}>
      <header>
        <div><span>Story logic</span><h4>{effectKindLabels[kind]}</h4></div>
        <b>{effects.length}</b>
      </header>
      {effects.map((relationship) => (
        <EffectRow
          key={relationship.id}
          project={project}
          relationship={relationship}
          onUpdateRelationship={onUpdateRelationship}
          onDeleteRelationship={onDeleteRelationship}
        />
      ))}
      <AddEffectRow
        project={project}
        scene={scene}
        kind={kind}
        onAddEffect={onAddEffect}
        onCreateEffectTarget={onCreateEffectTarget}
      />
    </section>
  );
}

export function SceneEffectsEditor({
  project,
  scene,
  variant = 'card',
  onAddEffect,
  onUpdateRelationship,
  onDeleteRelationship,
  onCreateEffectTarget,
}: SceneEffectsEditorProps) {
  const effects = useMemo(() => getSceneEffects(project, scene.id), [project, scene.id]);
  const byKind = (kind: EffectRelationshipKind) => effects.filter((relationship) => relationshipKind(relationship) === kind);

  return (
    <details
      className={`scene-effects-editor scene-effects-editor--${variant}`}
      defaultOpen={variant === 'inspector'}
      onClick={stop}
      onDoubleClick={stop}
    >
      <summary>
        <span>Story effects</span>
        <b>{effects.length}</b>
        <small>{effects.length ? 'Structured changes in this scene' : 'Add thread, fact, rule, or knowledge changes'}</small>
      </summary>
      <div className="scene-effects-body">
        {(['scene-thread', 'scene-fact', 'scene-rule', 'character-fact'] as EffectRelationshipKind[]).map((kind) => (
          <EffectSection
            key={kind}
            project={project}
            scene={scene}
            variant={variant}
            kind={kind}
            effects={byKind(kind)}
            onAddEffect={onAddEffect}
            onUpdateRelationship={onUpdateRelationship}
            onDeleteRelationship={onDeleteRelationship}
            onCreateEffectTarget={onCreateEffectTarget}
          />
        ))}
      </div>
    </details>
  );
}

export function SceneEffectsSummary({ project, scene }: { project: ContinuumProject; scene: StoryScene }) {
  const effects = getSceneEffects(project, scene.id);
  if (!effects.length) return null;

  return (
    <section className="scene-effects-summary">
      <header><span>Derived from structured relationships</span><h4>Story effects</h4></header>
      <div>
        {(['scene-thread', 'scene-fact', 'scene-rule', 'character-fact'] as EffectRelationshipKind[]).map((kind) => {
          const grouped = effects.filter((relationship) => relationshipKind(relationship) === kind);
          if (!grouped.length) return null;
          return (
            <section key={kind}>
              <b>{effectKindLabels[kind]}</b>
              <ul>{grouped.map((relationship) => <li key={relationship.id}>{describeEffect(project, relationship)}</li>)}</ul>
            </section>
          );
        })}
      </div>
    </section>
  );
}

export function ChapterEffectsSummary({
  project,
  chapterId,
  onSelectEntity,
}: {
  project: ContinuumProject;
  chapterId: string;
  onSelectEntity?: (entityId: string) => void;
}) {
  const effects = getChapterEffects(project, chapterId);
  const sceneName = (relationship: StoryRelationship) => {
    const sceneId = relationship.sceneId ?? (relationshipKind(relationship).startsWith('scene-') ? relationship.sourceId : undefined);
    return project.entities.find((entity) => entity.id === sceneId)?.name ?? 'Unknown scene';
  };

  if (!effects.length) {
    return <p className="chapter-placeholder">Add structured effects to scenes to track thread movement, revelations, rules, and knowledge across this chapter.</p>;
  }

  return (
    <div className="chapter-effects-groups">
      {(['scene-thread', 'scene-fact', 'scene-rule', 'character-fact'] as EffectRelationshipKind[]).map((kind) => {
        const grouped = effects.filter((relationship) => relationshipKind(relationship) === kind);
        if (!grouped.length) return null;
        return (
          <section key={kind}>
            <h3>{effectKindLabels[kind]}</h3>
            {grouped.map((relationship) => {
              const sceneId = relationship.sceneId ?? relationship.sourceId;
              return (
                <button key={relationship.id} onClick={() => onSelectEntity?.(sceneId)}>
                  <span>{sceneName(relationship)}</span>
                  <b>{describeEffect(project, relationship)}</b>
                </button>
              );
            })}
          </section>
        );
      })}
    </div>
  );
}
