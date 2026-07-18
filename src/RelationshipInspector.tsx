import {
  chapterInheritedPrefix,
  chapterMembershipPrefix,
  getChapterForScene,
  type ContinuumProject,
  type StoryRelationship,
  type StoryScene,
} from './model';

interface RelationshipInspectorProps {
  project: ContinuumProject;
  relationship?: StoryRelationship;
  membershipScene?: StoryScene;
  membershipInherited?: boolean;
  onUpdateLabel: (relationshipId: string, label: string) => void;
  onDelete: (relationshipId: string) => void;
  onSelectEntity: (entityId: string) => void;
}

export function RelationshipInspector({
  project,
  relationship,
  membershipScene,
  membershipInherited = false,
  onUpdateLabel,
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
  const label = relationship?.label ?? (membershipInherited ? 'contains via scenes' : 'contains');

  return (
    <aside className="inspector relationship-inspector">
      <div className="inspector-heading">
        <span>{membershipInherited ? 'Inherited chapter relationship' : isMembership ? 'Chapter relationship' : 'Relationship'}</span>
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

      <label className="field">
        <span>Relationship label</span>
        <input
          value={label}
          readOnly={isMembership}
          onChange={(event) => relationship && onUpdateLabel(relationship.id, event.target.value)}
        />
      </label>

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
      ) : (
        <div className="relationship-note">
          <b>Story relationship</b>
          <p>Edit the label here, press Delete or Backspace while the arrow is selected, or use Delete relationship above.</p>
        </div>
      )}
    </aside>
  );
}
