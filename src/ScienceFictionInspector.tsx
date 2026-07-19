import { useMemo, useState } from 'react';
import {
  awarenessLevels,
  capabilityLevels,
  claimConfidences,
  entityImportances,
  entityVisibilities,
  factTypes,
  identityTypes,
  locationKinds,
  organizationTypes,
  semanticActionOptions,
  sourceReliabilities,
  technologyDomains,
  worldLenses,
  worldLensLabels,
  type EntityPresentation,
  type IdentityProfile,
  type LocationProfile,
  type OrganizationProfile,
  type SemanticDomain,
  type TechnologyDetails,
} from './scifi';
import type { ContinuumProject, StoryEntity, StoryRelationship } from './model';

interface ScienceFictionInspectorProps {
  project: ContinuumProject;
  entity: StoryEntity;
  onUpdateEntity: (entity: StoryEntity) => void;
  onCreateSemanticRelationship: (sourceId: string, targetId: string, domain: SemanticDomain, action: string, note: string) => void;
  onUpdateRelationship: (relationship: StoryRelationship) => void;
  onDeleteRelationship: (relationshipId: string) => void;
}

const humanize = (value: string) => value.replaceAll('-', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="scifi-inspector-section"><h3>{title}</h3>{children}</section>;
}

function SemanticRelationshipEditor({
  project,
  entity,
  domain,
  onCreate,
  onUpdate,
  onDelete,
}: {
  project: ContinuumProject;
  entity: StoryEntity;
  domain: SemanticDomain;
  onCreate: ScienceFictionInspectorProps['onCreateSemanticRelationship'];
  onUpdate: ScienceFictionInspectorProps['onUpdateRelationship'];
  onDelete: ScienceFictionInspectorProps['onDeleteRelationship'];
}) {
  const [direction, setDirection] = useState<'outgoing' | 'incoming'>(domain === 'evidence' ? 'incoming' : 'outgoing');
  const [targetId, setTargetId] = useState('');
  const [action, setAction] = useState(semanticActionOptions[domain][0]?.value ?? 'relates-to');
  const [note, setNote] = useState('');
  const related = project.relationships.filter((relationship) => relationship.semanticDomain === domain && (relationship.sourceId === entity.id || relationship.targetId === entity.id));
  const targets = project.entities.filter((candidate) => candidate.id !== entity.id).sort((a, b) => a.name.localeCompare(b.name));
  const nameOf = (id: string) => project.entities.find((candidate) => candidate.id === id)?.name ?? 'Missing entity';

  const add = () => {
    if (!targetId) return;
    const sourceId = direction === 'outgoing' ? entity.id : targetId;
    const relationshipTargetId = direction === 'outgoing' ? targetId : entity.id;
    onCreate(sourceId, relationshipTargetId, domain, action, note);
    setTargetId('');
    setNote('');
  };

  return (
    <div className="semantic-relationship-editor">
      {related.length > 0 && (
        <div className="semantic-relationship-list">
          {related.map((relationship) => (
            <article key={relationship.id}>
              <div>
                <b>{nameOf(relationship.sourceId)}</b>
                <span>→</span>
                <b>{nameOf(relationship.targetId)}</b>
              </div>
              <select value={relationship.semanticAction ?? ''} onChange={(event) => onUpdate({ ...relationship, semanticAction: event.target.value, label: semanticActionOptions[domain].find((option) => option.value === event.target.value)?.label ?? event.target.value })}>
                {semanticActionOptions[domain].map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
              <input value={relationship.note ?? ''} placeholder="Why this relationship matters" onChange={(event) => onUpdate({ ...relationship, note: event.target.value })} />
              <button onClick={() => onDelete(relationship.id)}>×</button>
            </article>
          ))}
        </div>
      )}
      <div className="semantic-add-row">
        <select value={direction} onChange={(event) => setDirection(event.target.value as typeof direction)}>
          <option value="outgoing">This entity → target</option>
          <option value="incoming">Source → this entity</option>
        </select>
        <select value={targetId} onChange={(event) => setTargetId(event.target.value)}>
          <option value="">Choose entity…</option>
          {targets.map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.name} · {humanize(candidate.type)}</option>)}
        </select>
        <select value={action} onChange={(event) => setAction(event.target.value)}>
          {semanticActionOptions[domain].map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
        <input value={note} placeholder="Optional explanation" onChange={(event) => setNote(event.target.value)} />
        <button disabled={!targetId} onClick={add}>Add</button>
      </div>
    </div>
  );
}

export function ScienceFictionInspector({
  project,
  entity,
  onUpdateEntity,
  onCreateSemanticRelationship,
  onUpdateRelationship,
  onDeleteRelationship,
}: ScienceFictionInspectorProps) {
  const locations = project.entities.filter((candidate) => candidate.type === 'location').sort((a, b) => a.name.localeCompare(b.name));
  const organizations = project.entities.filter((candidate) => candidate.type === 'organization').sort((a, b) => a.name.localeCompare(b.name));
  const presentation: EntityPresentation = entity.presentation ?? { visibility: 'auto', importance: 'supporting', layerHints: ['story'], pinned: false };
  const patch = (changes: Partial<StoryEntity>) => onUpdateEntity({ ...entity, ...changes });
  const patchPresentation = (changes: Partial<EntityPresentation>) => patch({ presentation: { ...presentation, ...changes } });
  const relevantDomains = useMemo<SemanticDomain[]>(() => {
    const domains: SemanticDomain[] = [];
    if (entity.type === 'organization') domains.push('power');
    if (entity.technology) domains.push('technology');
    if (entity.type === 'fact') domains.push('evidence');
    if (entity.type === 'location') domains.push('travel');
    return domains;
  }, [entity]);

  return (
    <>
      <Section title="World presentation">
        <div className="scifi-grid">
          <label><span>Visibility</span><select value={presentation.visibility} onChange={(event) => patchPresentation({ visibility: event.target.value as EntityPresentation['visibility'] })}>{entityVisibilities.map((value) => <option key={value} value={value}>{humanize(value)}</option>)}</select></label>
          <label><span>Importance</span><select value={presentation.importance} onChange={(event) => patchPresentation({ importance: event.target.value as EntityPresentation['importance'] })}>{entityImportances.map((value) => <option key={value} value={value}>{humanize(value)}</option>)}</select></label>
          <label className="scifi-check"><input type="checkbox" checked={presentation.pinned} onChange={(event) => patchPresentation({ pinned: event.target.checked })} /><span>Pin in relevant lenses</span></label>
        </div>
        <div className="lens-hint-list">
          {worldLenses.map((lens) => (
            <label key={lens}><input type="checkbox" checked={presentation.layerHints.includes(lens)} onChange={(event) => patchPresentation({ layerHints: event.target.checked ? [...new Set([...presentation.layerHints, lens])] : presentation.layerHints.filter((item) => item !== lens) })} /><span>{worldLensLabels[lens]}</span></label>
          ))}
        </div>
        <p className="scifi-help">Automatic visibility keeps reference data out of the Story Map until a scene, relationship, selection, or lens makes it relevant.</p>
      </Section>

      {entity.type === 'location' && (() => {
        const profile: LocationProfile = entity.locationProfile ?? { kind: 'generic', coordinates: '', environmentNotes: '' };
        const update = (changes: Partial<LocationProfile>) => patch({ locationProfile: { ...profile, ...changes } });
        return (
          <Section title="Geography profile">
            <div className="scifi-grid">
              <label><span>Location kind</span><select value={profile.kind} onChange={(event) => update({ kind: event.target.value as LocationProfile['kind'] })}>{locationKinds.map((value) => <option key={value} value={value}>{humanize(value)}</option>)}</select></label>
              <label><span>Parent region / location</span><select value={profile.parentLocationId ?? ''} onChange={(event) => update({ parentLocationId: event.target.value || undefined })}><option value="">None</option>{locations.filter((candidate) => candidate.id !== entity.id).map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.name}</option>)}</select></label>
              <label className="scifi-wide"><span>Coordinates</span><input value={profile.coordinates} placeholder="Latitude, longitude, orbital position…" onChange={(event) => update({ coordinates: event.target.value })} /></label>
              <label className="scifi-wide"><span>Environmental notes</span><textarea value={profile.environmentNotes} placeholder="Pressure, terrain, artificial atmosphere, local hazards…" onChange={(event) => update({ environmentNotes: event.target.value })} /></label>
            </div>
          </Section>
        );
      })()}

      {entity.type === 'character' && (() => {
        const profile: IdentityProfile = entity.identityProfile ?? {
          identityType: 'human', manufacturer: '', model: '', bodyOrChassis: '', damage: '', selfAwareness: 'unknown', autonomy: 'unknown', networkAccess: 'unknown', legalStatus: '', allegiance: '', programmingConstraints: '', aliases: [],
        };
        const update = (changes: Partial<IdentityProfile>) => patch({ identityProfile: { ...profile, ...changes } });
        return (
          <Section title="Identity, robot & AI profile">
            <div className="scifi-grid">
              <label><span>Identity type</span><select value={profile.identityType} onChange={(event) => update({ identityType: event.target.value as IdentityProfile['identityType'] })}>{identityTypes.map((value) => <option key={value} value={value}>{humanize(value)}</option>)}</select></label>
              <label><span>Self-awareness</span><select value={profile.selfAwareness} onChange={(event) => update({ selfAwareness: event.target.value as IdentityProfile['selfAwareness'] })}>{awarenessLevels.map((value) => <option key={value} value={value}>{humanize(value)}</option>)}</select></label>
              <label><span>Autonomy</span><select value={profile.autonomy} onChange={(event) => update({ autonomy: event.target.value as IdentityProfile['autonomy'] })}>{capabilityLevels.map((value) => <option key={value} value={value}>{humanize(value)}</option>)}</select></label>
              <label><span>Network access</span><select value={profile.networkAccess} onChange={(event) => update({ networkAccess: event.target.value as IdentityProfile['networkAccess'] })}>{capabilityLevels.map((value) => <option key={value} value={value}>{humanize(value)}</option>)}</select></label>
              <label><span>Manufacturer</span><input value={profile.manufacturer} onChange={(event) => update({ manufacturer: event.target.value })} /></label>
              <label><span>Model</span><input value={profile.model} onChange={(event) => update({ model: event.target.value })} /></label>
              <label><span>Age in years</span><input type="number" min="0" value={profile.ageYears ?? ''} onChange={(event) => update({ ageYears: event.target.value ? Number(event.target.value) : undefined })} /></label>
              <label><span>Legal status</span><input value={profile.legalStatus} onChange={(event) => update({ legalStatus: event.target.value })} /></label>
              <label className="scifi-wide"><span>Aliases</span><input value={profile.aliases.join(', ')} placeholder="Blade, Credo…" onChange={(event) => update({ aliases: event.target.value.split(',').map((item) => item.trim()).filter(Boolean) })} /></label>
              <label className="scifi-wide"><span>Body or chassis</span><textarea value={profile.bodyOrChassis} onChange={(event) => update({ bodyOrChassis: event.target.value })} /></label>
              <label className="scifi-wide"><span>Damage / modifications</span><textarea value={profile.damage} onChange={(event) => update({ damage: event.target.value })} /></label>
              <label className="scifi-wide"><span>Allegiance</span><input value={profile.allegiance} onChange={(event) => update({ allegiance: event.target.value })} /></label>
              <label className="scifi-wide"><span>Programming constraints</span><textarea value={profile.programmingConstraints} onChange={(event) => update({ programmingConstraints: event.target.value })} /></label>
            </div>
          </Section>
        );
      })()}

      {entity.type === 'organization' && (() => {
        const profile: OrganizationProfile = entity.organizationProfile ?? { organizationType: 'other', publicIdentity: '', hiddenIdentity: '', controlledResources: [], territoryIds: [], surveillanceCapability: 'unknown', militaryCapability: 'unknown', dataAccess: 'unknown', leverageNotes: '' };
        const update = (changes: Partial<OrganizationProfile>) => patch({ organizationProfile: { ...profile, ...changes } });
        return (
          <Section title="Power and resource profile">
            <div className="scifi-grid">
              <label><span>Organization type</span><select value={profile.organizationType} onChange={(event) => update({ organizationType: event.target.value as OrganizationProfile['organizationType'] })}>{organizationTypes.map((value) => <option key={value} value={value}>{humanize(value)}</option>)}</select></label>
              <label><span>Surveillance</span><select value={profile.surveillanceCapability} onChange={(event) => update({ surveillanceCapability: event.target.value as OrganizationProfile['surveillanceCapability'] })}>{capabilityLevels.map((value) => <option key={value} value={value}>{humanize(value)}</option>)}</select></label>
              <label><span>Military capability</span><select value={profile.militaryCapability} onChange={(event) => update({ militaryCapability: event.target.value as OrganizationProfile['militaryCapability'] })}>{capabilityLevels.map((value) => <option key={value} value={value}>{humanize(value)}</option>)}</select></label>
              <label><span>Data access</span><select value={profile.dataAccess} onChange={(event) => update({ dataAccess: event.target.value as OrganizationProfile['dataAccess'] })}>{capabilityLevels.map((value) => <option key={value} value={value}>{humanize(value)}</option>)}</select></label>
              <label className="scifi-wide"><span>Public identity</span><textarea value={profile.publicIdentity} onChange={(event) => update({ publicIdentity: event.target.value })} /></label>
              <label className="scifi-wide"><span>Hidden identity / agenda</span><textarea value={profile.hiddenIdentity} onChange={(event) => update({ hiddenIdentity: event.target.value })} /></label>
              <label className="scifi-wide"><span>Controlled resources</span><input value={profile.controlledResources.join(', ')} placeholder="oxygen, water, transport, surveillance…" onChange={(event) => update({ controlledResources: event.target.value.split(',').map((item) => item.trim()).filter(Boolean) })} /></label>
              <label className="scifi-wide"><span>Territory</span><select multiple value={profile.territoryIds} onChange={(event) => update({ territoryIds: Array.from(event.target.selectedOptions).map((option) => option.value) })}>{locations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}</select></label>
              <label className="scifi-wide"><span>Leverage notes</span><textarea value={profile.leverageNotes} onChange={(event) => update({ leverageNotes: event.target.value })} /></label>
            </div>
          </Section>
        );
      })()}

      {entity.type === 'object' && (() => {
        const technology = entity.technology;
        if (!technology) {
          return <Section title="Technology ledger"><button className="scifi-promote-button" onClick={() => patch({ technology: { domain: 'general', purpose: entity.summary, operatingPrinciple: '', inputs: '', outputs: '', dependencies: '', limitations: '', failureModes: '', environmentalRequirements: '', researchNotes: entity.notes } })}>Track this object as a Technology / System</button></Section>;
        }
        const update = (changes: Partial<TechnologyDetails>) => patch({ technology: { ...technology, ...changes } });
        return (
          <Section title="Technology / system ledger">
            <div className="scifi-grid">
              <label><span>Domain</span><select value={technology.domain} onChange={(event) => update({ domain: event.target.value as TechnologyDetails['domain'] })}>{technologyDomains.map((value) => <option key={value} value={value}>{humanize(value)}</option>)}</select></label>
              <label><span>Operator</span><select value={technology.operatorOrganizationId ?? ''} onChange={(event) => update({ operatorOrganizationId: event.target.value || undefined })}><option value="">Not assigned</option>{organizations.map((organization) => <option key={organization.id} value={organization.id}>{organization.name}</option>)}</select></label>
              <label className="scifi-wide"><span>Purpose</span><textarea value={technology.purpose} onChange={(event) => update({ purpose: event.target.value })} /></label>
              <label className="scifi-wide"><span>Operating principle</span><textarea value={technology.operatingPrinciple} onChange={(event) => update({ operatingPrinciple: event.target.value })} /></label>
              <label className="scifi-wide"><span>Inputs</span><input value={technology.inputs} onChange={(event) => update({ inputs: event.target.value })} /></label>
              <label className="scifi-wide"><span>Outputs</span><input value={technology.outputs} onChange={(event) => update({ outputs: event.target.value })} /></label>
              <label className="scifi-wide"><span>Dependencies</span><textarea value={technology.dependencies} onChange={(event) => update({ dependencies: event.target.value })} /></label>
              <label className="scifi-wide"><span>Environmental requirements</span><textarea value={technology.environmentalRequirements} onChange={(event) => update({ environmentalRequirements: event.target.value })} /></label>
              <label className="scifi-wide"><span>Limitations</span><textarea value={technology.limitations} onChange={(event) => update({ limitations: event.target.value })} /></label>
              <label className="scifi-wide"><span>Failure modes</span><textarea value={technology.failureModes} onChange={(event) => update({ failureModes: event.target.value })} /></label>
              <label className="scifi-wide"><span>Research / plausibility notes</span><textarea value={technology.researchNotes} onChange={(event) => update({ researchNotes: event.target.value })} /></label>
            </div>
          </Section>
        );
      })()}

      {entity.type === 'fact' && entity.fact && (
        <Section title="Evidence and hypothesis profile">
          <div className="scifi-grid">
            <label><span>Fact type</span><select value={entity.fact.factType ?? 'canonical'} onChange={(event) => patch({ fact: { ...entity.fact!, factType: event.target.value as NonNullable<typeof entity.fact>['factType'] } })}>{factTypes.map((value) => <option key={value} value={value}>{humanize(value)}</option>)}</select></label>
            <label><span>Confidence</span><select value={entity.fact.confidence ?? 'unknown'} onChange={(event) => patch({ fact: { ...entity.fact!, confidence: event.target.value as NonNullable<typeof entity.fact>['confidence'] } })}>{claimConfidences.map((value) => <option key={value} value={value}>{humanize(value)}</option>)}</select></label>
            <label><span>Source reliability</span><select value={entity.fact.sourceReliability ?? 'unknown'} onChange={(event) => patch({ fact: { ...entity.fact!, sourceReliability: event.target.value as NonNullable<typeof entity.fact>['sourceReliability'] } })}>{sourceReliabilities.map((value) => <option key={value} value={value}>{humanize(value)}</option>)}</select></label>
            <label><span>Primary source</span><select value={entity.fact.sourceEntityId ?? ''} onChange={(event) => patch({ fact: { ...entity.fact!, sourceEntityId: event.target.value || undefined } })}><option value="">Not assigned</option>{project.entities.filter((candidate) => candidate.id !== entity.id).map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.name}</option>)}</select></label>
          </div>
        </Section>
      )}

      {relevantDomains.map((domain) => (
        <Section key={domain} title={`${humanize(domain)} relationships`}>
          <SemanticRelationshipEditor project={project} entity={entity} domain={domain} onCreate={onCreateSemanticRelationship} onUpdate={onUpdateRelationship} onDelete={onDeleteRelationship} />
        </Section>
      ))}
    </>
  );
}
