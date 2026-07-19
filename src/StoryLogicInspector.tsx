import { SceneEffectsEditor, type EffectTargetType } from './SceneEffectsEditor';
import {
  defaultFactDetails,
  defaultPlotThreadDetails,
  defaultWorldRuleDetails,
  factSensitivities,
  factTruthStatuses,
  plotThreadStatuses,
  worldRuleCategories,
  worldRuleRigidities,
  type SceneEffectInput,
} from './storyLogic';
import {
  getScenesForChapter,
  type ContinuumProject,
  type StoryEntity,
  type StoryRelationship,
} from './model';

interface StoryLogicInspectorProps {
  project: ContinuumProject;
  entity: StoryEntity;
  onUpdateEntity: (entity: StoryEntity) => void;
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

function Field({
  label,
  value,
  multiline = false,
  onChange,
}: {
  label: string;
  value: string;
  multiline?: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {multiline
        ? <textarea value={value} onChange={(event) => onChange(event.target.value)} />
        : <input value={value} onChange={(event) => onChange(event.target.value)} />}
    </label>
  );
}

export function StoryLogicInspector({
  project,
  entity,
  onUpdateEntity,
  onAddEffect,
  onUpdateRelationship,
  onDeleteRelationship,
  onCreateEffectTarget,
}: StoryLogicInspectorProps) {
  if (entity.type === 'plot-thread') {
    const details = entity.plotThread ?? defaultPlotThreadDetails(entity.summary);
    const patch = (changes: Partial<typeof details>) => onUpdateEntity({
      ...entity,
      plotThread: { ...details, ...changes },
    });
    return (
      <section className="scene-fields story-logic-inspector">
        <div className="story-logic-heading"><span>Plot-thread logic</span><b>{details.status}</b></div>
        <label className="field">
          <span>Status</span>
          <select value={details.status} onChange={(event) => patch({ status: event.target.value as typeof details.status })}>
            {plotThreadStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
          </select>
        </label>
        <Field label="Central question" value={details.centralQuestion} multiline onChange={(centralQuestion) => patch({ centralQuestion })} />
        <Field label="Stakes" value={details.stakes} multiline onChange={(stakes) => patch({ stakes })} />
        <Field label="Planned payoff" value={details.plannedPayoff} multiline onChange={(plannedPayoff) => patch({ plannedPayoff })} />
      </section>
    );
  }

  if (entity.type === 'fact') {
    const details = entity.fact ?? defaultFactDetails(entity.summary);
    const patch = (changes: Partial<typeof details>) => onUpdateEntity({
      ...entity,
      fact: { ...details, ...changes },
    });
    const scenes = project.entities
      .filter((candidate) => candidate.type === 'chapter')
      .flatMap((chapter) => getScenesForChapter(project, chapter.id));
    return (
      <section className="scene-fields story-logic-inspector">
        <div className="story-logic-heading"><span>Fact logic</span><b>{details.truthStatus}</b></div>
        <Field label="Proposition" value={details.proposition} multiline onChange={(proposition) => patch({ proposition })} />
        <div className="two-fields">
          <label className="field">
            <span>Truth status</span>
            <select value={details.truthStatus} onChange={(event) => patch({ truthStatus: event.target.value as typeof details.truthStatus })}>
              {factTruthStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
            </select>
          </label>
          <label className="field">
            <span>Sensitivity</span>
            <select value={details.sensitivity} onChange={(event) => patch({ sensitivity: event.target.value as typeof details.sensitivity })}>
              {factSensitivities.map((sensitivity) => <option key={sensitivity} value={sensitivity}>{sensitivity}</option>)}
            </select>
          </label>
        </div>
        <div className="two-fields">
          <label className="field">
            <span>Valid from</span>
            <select value={details.validFromSceneId ?? ''} onChange={(event) => patch({ validFromSceneId: event.target.value || undefined })}>
              <option value="">Beginning of story</option>
              {scenes.map((scene) => <option key={scene.id} value={scene.id}>{scene.name}</option>)}
            </select>
          </label>
          <label className="field">
            <span>Valid until</span>
            <select value={details.validUntilSceneId ?? ''} onChange={(event) => patch({ validUntilSceneId: event.target.value || undefined })}>
              <option value="">End of story</option>
              {scenes.map((scene) => <option key={scene.id} value={scene.id}>{scene.name}</option>)}
            </select>
          </label>
        </div>
      </section>
    );
  }

  if (entity.type === 'world-rule') {
    const details = entity.worldRule ?? defaultWorldRuleDetails(entity.summary);
    const patch = (changes: Partial<typeof details>) => onUpdateEntity({
      ...entity,
      worldRule: { ...details, ...changes },
    });
    return (
      <section className="scene-fields story-logic-inspector">
        <div className="story-logic-heading"><span>World-rule logic</span><b>{details.rigidity}</b></div>
        <Field label="Rule statement" value={details.statement} multiline onChange={(statement) => patch({ statement })} />
        <div className="two-fields">
          <label className="field">
            <span>Category</span>
            <select value={details.category} onChange={(event) => patch({ category: event.target.value as typeof details.category })}>
              {worldRuleCategories.map((category) => <option key={category} value={category}>{category}</option>)}
            </select>
          </label>
          <label className="field">
            <span>Rigidity</span>
            <select value={details.rigidity} onChange={(event) => patch({ rigidity: event.target.value as typeof details.rigidity })}>
              {worldRuleRigidities.map((rigidity) => <option key={rigidity} value={rigidity}>{rigidity}</option>)}
            </select>
          </label>
        </div>
        <Field label="Consequence" value={details.consequence} multiline onChange={(consequence) => patch({ consequence })} />
        <Field label="Exceptions" value={details.exceptionNotes} multiline onChange={(exceptionNotes) => patch({ exceptionNotes })} />
      </section>
    );
  }

  if (entity.type === 'scene' && entity.scene) {
    return (
      <SceneEffectsEditor
        project={project}
        scene={entity as typeof entity & { type: 'scene'; scene: NonNullable<typeof entity.scene> }}
        variant="inspector"
        onAddEffect={onAddEffect}
        onUpdateRelationship={onUpdateRelationship}
        onDeleteRelationship={onDeleteRelationship}
        onCreateEffectTarget={onCreateEffectTarget}
      />
    );
  }

  return null;
}
