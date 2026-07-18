import type { ContinuumProject, StoryRelationship, StoryScene } from './model';

interface RelationshipInspectorProps {
  project: ContinuumProject;
  relationship?: StoryRelationship;
  membershipScene?: StoryScene;
  onUpdateLabel: (relationshipId: string, label: string) => void;
  onDelete: (relationshipId: string) => void;
  onSelectEntity: (entityId: string) => void;
}

export function RelationshipInspector({
  project,
  relationship,
  membershipScene,
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

  const relationshipId = relationship?.id ?? `chapter-membership_${membershipScene!.id}`;
  const sourceId = relationship?.sourceId ?? membershipScene?.scene.chapterId;
  const targetId = relationship?.targetId ?? membershipScene?.id;
  const source = project.entities.find((entity) => entity.id === sourceId);
  const target = project.entities.find((entity) => entity.id === targetId);
  const isMembership = Boolean(membershipScene);
  const label = relationship?.label ?? 'contains';

  return (
    <aside className="inspector relationship-inspector">
      <div className="inspector-heading">
        <span>{isMembership ? 'Chapter relationship' : 'Relationship'}</span>
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

      {isMembership ? (
        <div className="relationship-note">
          <b>Structural relationship</b>
          <p>This arrow is generated from the scene’s Chapter field. Deleting it removes the scene from the chapter without deleting either entity.</p>
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
