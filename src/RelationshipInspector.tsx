import {
  chapterInheritedPrefix,
  chapterMembershipPrefix,
  getChapterForScene,
  type ContinuumProject,
  type StoryRelationship,
  type StoryScene,
} from './model';
import {
  effectActionOptions,
  effectKindLabels,
  relationshipKind,
  updateEffectAction,
  type EffectRelationshipKind,
  type RelationshipAction,
} from './storyLogic';

interface RelationshipInspectorProps {
  project: ContinuumProject;
  relationship?: StoryRelationship;
  membershipScene?: StoryScene;
  membershipInherited?: boolean;
  onUpdateRelationship: (relationship: StoryRelationship) => void;
  onDelete: (relationshipId: string) => void;
  onSelectEntity: (entityId: string) => void;
}

export function RelationshipInspector({
  project,
  relationship,
  membershipScene,
  membershipInherited = false,
  onUpdateRelationship,
  onDelete,
  onSelectEntity,
}: RelationshipInspectorProps) {
  if (!relationship && !membershipScene) {
    return (
      <aside className="inspector empty-panel">
        <span>Selection</span>
        <h2>Choose an object</h2>
        <p>Select a chapter, scene, relationship, card, or node to edit it.</p>
      </aside>
    );
  }

  const relationshipId = relationship?.id
    ?? `${membershipInherited ? chapterInheritedPrefix : chapterMembershipPrefix}${membershipScene!.id}`;
  const sourceId = relationship?.sourceId ?? (membershipScene ? getChapterForScene(project, membershipScene)?.id : undefined);
  const targetId = relationship?.targetId ?? membershipScene?.id;
  const source = project.entities.find((entity) => entity.id === sourceId);
  const target = project.entities.find((entity) => entity.id === targetId);
  const isMembership = Boolean(membershipScene);
  const kind = relationship ? relationshipKind(relationship) : 'custom';
  const isEffect = relationship && kind !== 'custom';
  const label = relationship?.label ?? (membershipInherited ? 'contains via scenes' : 'contains');
  const anchoredScene = relationship?.sceneId
    ? project.entities.find((entity) => entity.id === relationship.sceneId)
    : undefined;

  return (
    <aside className="inspector relationship-inspector">
      <div className="inspector-heading">
        <span>{membershipInherited ? 'Inherited chapter relationship' : isMembership ? 'Chapter relationship' : isEffect ? 'Story effect' : 'Relationship'}</span>
        <button className="danger-link" onClick={() => onDelete(relationshipId)}>Delete relationship</button>
      </div>

      <div className="relationship-route" aria-label="Relationship route">
        <button onClick={() => source && onSelectEntity(source.id)} disabled={!source}>
          <small>From</small>
          <strong>{source?.name ?? 'Missing entity'}</strong>
        </button>
        <span aria-hidden="true">→</span>
        <button onClick={() => target && onSelectEntity(target.id)} disabled={!target}>
          <small>To</small>
          <strong>{target?.name ?? 'Missing entity'}</strong>
        </button>
      </div>

      {isEffect && relationship ? (
        <>
          <div className="relationship-note is-effect">
            <b>{effectKindLabels[kind as EffectRelationshipKind]}</b>
            <p>{anchoredScene ? `Anchored in ${anchoredScene.name}.` : 'Structured story relationship.'} Continuum uses this relationship in scene and chapter summaries.</p>
          </div>
          <label className="field">
            <span>Effect action</span>
            <select
              value={relationship.action ?? effectActionOptions[kind as EffectRelationshipKind][0].value}
              onChange={(event) => onUpdateRelationship(updateEffectAction(relationship, event.target.value as RelationshipAction))}
            >
              {effectActionOptions[kind as EffectRelationshipKind].map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>What changes</span>
            <textarea
              value={relationship.note ?? ''}
              onChange={(event) => onUpdateRelationship({ ...relationship, note: event.target.value })}
              placeholder="Explain the specific narrative change"
            />
          </label>
          {kind === 'scene-thread' && (
            <label className="field">
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
            <label className="field">
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
            <label className="relationship-effect-check">
              <input
                type="checkbox"
                checked={relationship.consequenceOccurs ?? false}
                onChange={(event) => onUpdateRelationship({ ...relationship, consequenceOccurs: event.target.checked })}
              />
              <span>Consequence occurs in this scene</span>
            </label>
          )}
        </>
      ) : (
        <label className="field">
          <span>Relationship label</span>
          <input
            value={label}
            readOnly={isMembership}
            onChange={(event) => relationship && onUpdateRelationship({ ...relationship, label: event.target.value })}
          />
        </label>
      )}

      {membershipInherited ? (
        <div className="relationship-note">
          <b>Inherited structural relationship</b>
          <p>This scene belongs to the chapter because it is linked to another scene with a manual chapter assignment. Deleting this arrow keeps the scene and its links but marks the scene as intentionally unassigned.</p>
        </div>
      ) : isMembership ? (
        <div className="relationship-note">
          <b>Manual structural relationship</b>
          <p>This arrow is generated from the scene’s manual Chapter field. Deleting it keeps the scene but marks it as intentionally unassigned, so scene links will not immediately reattach it.</p>
        </div>
      ) : !isEffect ? (
        <div className="relationship-note">
          <b>Custom story relationship</b>
          <p>Custom labels remain flexible. Press Delete or Backspace while the arrow is selected, or use Delete relationship above.</p>
        </div>
      ) : null}
    </aside>
  );
}
