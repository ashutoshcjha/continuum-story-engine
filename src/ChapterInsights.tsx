import {
  chapterContinuityWarnings,
  conceptLoadForChapter,
  isTechnologyEntity,
  relationshipDomain,
  sceneContinuityWarnings,
} from './scifi';
import {
  getScenesForChapter,
  isStoryScene,
  type ContinuumProject,
  type StoryEntity,
} from './model';
import { relationshipKind } from './storyLogic';

interface ChapterInsightsProps {
  project: ContinuumProject;
  chapterId: string;
  onSelectEntity: (entityId: string) => void;
}

const humanize = (value: string) => value.replaceAll('-', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());

function relevantEntityIds(project: ContinuumProject, chapterId: string): Set<string> {
  const scenes = getScenesForChapter(project, chapterId);
  const sceneIds = new Set(scenes.map((scene) => scene.id));
  const ids = new Set<string>(sceneIds);
  scenes.forEach((scene) => {
    if (scene.scene.povCharacterId) ids.add(scene.scene.povCharacterId);
    if (scene.scene.locationId) ids.add(scene.scene.locationId);
    scene.scene.participantIds.forEach((id) => ids.add(id));
    if (scene.scene.travel?.originId) ids.add(scene.scene.travel.originId);
    if (scene.scene.travel?.destinationId) ids.add(scene.scene.travel.destinationId);
  });
  project.relationships.forEach((relationship) => {
    if (relationship.sceneId && sceneIds.has(relationship.sceneId)) {
      ids.add(relationship.sourceId);
      ids.add(relationship.targetId);
    }
    if (sceneIds.has(relationship.sourceId)) ids.add(relationship.targetId);
    if (sceneIds.has(relationship.targetId)) ids.add(relationship.sourceId);
  });
  return ids;
}

export function ChapterInsights({ project, chapterId, onSelectEntity }: ChapterInsightsProps) {
  const scenes = getScenesForChapter(project, chapterId);
  const warnings = chapterContinuityWarnings(project, chapterId);
  const load = conceptLoadForChapter(project, chapterId);
  const relevantIds = relevantEntityIds(project, chapterId);
  const related = project.entities.filter((entity) => relevantIds.has(entity.id));
  const facts = related.filter((entity) => entity.type === 'fact');
  const organizations = related.filter((entity) => entity.type === 'organization');
  const technologies = related.filter(isTechnologyEntity);
  const nonHumanCharacters = related.filter((entity) => entity.type === 'character' && entity.identityProfile && entity.identityProfile.identityType !== 'human');
  const nameOf = (id?: string) => project.entities.find((entity) => entity.id === id)?.name ?? '—';

  const evidenceCounts = new Map<string, { support: number; contradict: number }>();
  project.relationships.forEach((relationship) => {
    if (relationshipDomain(relationship) !== 'evidence') return;
    const factId = facts.some((fact) => fact.id === relationship.targetId) ? relationship.targetId : facts.some((fact) => fact.id === relationship.sourceId) ? relationship.sourceId : undefined;
    if (!factId) return;
    const current = evidenceCounts.get(factId) ?? { support: 0, contradict: 0 };
    const action = relationship.semanticAction ?? relationship.label.toLowerCase();
    if (/contradict|weaken/.test(action)) current.contradict += 1;
    else current.support += 1;
    evidenceCounts.set(factId, current);
  });

  const effectCounts = new Map<string, number>();
  project.relationships.forEach((relationship) => {
    if (!relationship.sceneId || !scenes.some((scene) => scene.id === relationship.sceneId)) return;
    const kind = relationshipKind(relationship);
    effectCounts.set(kind, (effectCounts.get(kind) ?? 0) + 1);
  });

  return (
    <section className="chapter-insights">
      <header>
        <div><span>Science-fiction continuity</span><h2>Chapter systems dashboard</h2></div>
        <div className={`concept-load-badge is-${load.severity}`}><b>{load.score}</b><span>{humanize(load.severity)} concept load</span></div>
      </header>

      <div className="chapter-insight-grid">
        <section className="chapter-insight-card continuity-card">
          <header><div><span>Continuity</span><h3>Environment and travel checks</h3></div><b>{warnings.length}</b></header>
          {warnings.length ? (
            <ul>
              {warnings.slice(0, 12).map((warning, index) => {
                const scene = project.entities.find((entity) => entity.id === warning.sceneId);
                return <li key={`${warning.sceneId}-${index}`} className={`is-${warning.severity}`}><button onClick={() => onSelectEntity(warning.sceneId)}>{scene?.name ?? 'Scene'}</button><span>{warning.message}</span></li>;
              })}
            </ul>
          ) : <p className="chapter-insight-empty">No environmental or travel contradictions are currently detected.</p>}
        </section>

        <section className="chapter-insight-card concept-card">
          <header><div><span>Reader load</span><h3>New concepts introduced</h3></div><b>{load.entityIds.length}</b></header>
          <div className="concept-load-groups">
            {Object.entries(load.groups).length ? Object.entries(load.groups).map(([group, count]) => <div key={group}><b>{count}</b><span>{humanize(group)}</span></div>) : <p className="chapter-insight-empty">No first appearances detected.</p>}
          </div>
          <p className="chapter-insight-note">The score weights new characters most heavily, then locations, organizations, systems, and plot threads. It does not judge the prose; it shows how much unfamiliar material the reader must absorb.</p>
        </section>

        <section className="chapter-insight-card travel-card">
          <header><div><span>Movement</span><h3>Travel and environmental sequence</h3></div><b>{scenes.length}</b></header>
          <ol>
            {scenes.map((scene) => {
              const travel = scene.scene.travel;
              const environment = scene.scene.environment;
              const sceneWarnings = sceneContinuityWarnings(project, scene);
              return (
                <li key={scene.id}>
                  <button onClick={() => onSelectEntity(scene.id)}>{String(scene.scene.order).padStart(2, '0')} · {scene.name}</button>
                  <span>{travel?.mode ? `${nameOf(travel.originId)} → ${nameOf(travel.destinationId ?? scene.scene.locationId)} · ${travel.mode}` : nameOf(scene.scene.locationId)}</span>
                  <small>{[environment?.setting !== 'unknown' ? environment?.setting : '', environment?.gravity !== 'unknown' ? `${environment?.gravity} gravity` : '', environment?.radiation !== 'unknown' ? `${environment?.radiation} radiation` : '', sceneWarnings.length ? `${sceneWarnings.length} warning${sceneWarnings.length === 1 ? '' : 's'}` : ''].filter(Boolean).join(' · ') || 'Environment not recorded'}</small>
                </li>
              );
            })}
          </ol>
        </section>

        <section className="chapter-insight-card evidence-card">
          <header><div><span>Mystery</span><h3>Claims, evidence, and hypotheses</h3></div><b>{facts.length}</b></header>
          {facts.length ? (
            <div className="insight-entity-list">
              {facts.map((fact) => {
                const counts = evidenceCounts.get(fact.id) ?? { support: 0, contradict: 0 };
                return (
                  <button key={fact.id} onClick={() => onSelectEntity(fact.id)}>
                    <b>{fact.name}</b>
                    <span>{humanize(fact.fact?.factType ?? 'canonical')} · {humanize(fact.fact?.confidence ?? 'unknown')} confidence · {humanize(fact.fact?.sourceReliability ?? 'unknown')} source</span>
                    <small>{counts.support} supporting · {counts.contradict} contradicting</small>
                  </button>
                );
              })}
            </div>
          ) : <p className="chapter-insight-empty">No structured claims or evidence are connected to this chapter.</p>}
        </section>

        <section className="chapter-insight-card power-card">
          <header><div><span>Power</span><h3>Organizations and resource control</h3></div><b>{organizations.length}</b></header>
          {organizations.length ? (
            <div className="insight-entity-list">
              {organizations.map((organization) => (
                <button key={organization.id} onClick={() => onSelectEntity(organization.id)}>
                  <b>{organization.name}</b>
                  <span>{humanize(organization.organizationProfile?.organizationType ?? 'other')} · surveillance {organization.organizationProfile?.surveillanceCapability ?? 'unknown'} · data {organization.organizationProfile?.dataAccess ?? 'unknown'}</span>
                  <small>{organization.organizationProfile?.controlledResources?.join(', ') || 'No controlled resources recorded'}</small>
                </button>
              ))}
            </div>
          ) : <p className="chapter-insight-empty">No organizations are directly connected to this chapter.</p>}
        </section>

        <section className="chapter-insight-card systems-card">
          <header><div><span>Systems</span><h3>Technology and artificial identities</h3></div><b>{technologies.length + nonHumanCharacters.length}</b></header>
          <div className="insight-entity-list">
            {technologies.map((technology) => (
              <button key={technology.id} onClick={() => onSelectEntity(technology.id)}>
                <b>{technology.name}</b>
                <span>{humanize(technology.technology?.domain ?? 'general')} system</span>
                <small>{technology.technology?.purpose || technology.summary || 'Purpose not recorded'}</small>
              </button>
            ))}
            {nonHumanCharacters.map((character) => (
              <button key={character.id} onClick={() => onSelectEntity(character.id)}>
                <b>{character.name}</b>
                <span>{humanize(character.identityProfile?.identityType ?? 'unknown')} · awareness {character.identityProfile?.selfAwareness ?? 'unknown'} · autonomy {character.identityProfile?.autonomy ?? 'unknown'}</span>
                <small>{character.identityProfile?.aliases.length ? `Aliases: ${character.identityProfile.aliases.join(', ')}` : character.identityProfile?.programmingConstraints || 'No constraints recorded'}</small>
              </button>
            ))}
            {!technologies.length && !nonHumanCharacters.length && <p className="chapter-insight-empty">No tracked systems or artificial identities are directly connected to this chapter.</p>}
          </div>
          <footer>
            <span>{effectCounts.get('scene-thread') ?? 0} plot beats</span>
            <span>{effectCounts.get('scene-fact') ?? 0} fact effects</span>
            <span>{effectCounts.get('character-fact') ?? 0} knowledge changes</span>
            <span>{effectCounts.get('scene-rule') ?? 0} rule interactions</span>
          </footer>
        </section>
      </div>
    </section>
  );
}
