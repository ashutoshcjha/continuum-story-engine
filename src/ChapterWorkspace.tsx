import {
  getChapterRelatedEntities,
  getChapters,
  getScenesForChapter,
  type ContinuumProject,
  type EntityType,
  type StoryChapter,
} from './model';

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

export function ChapterTabs({
  project,
  selectedChapterId,
  onSelect,
}: {
  project: ContinuumProject;
  selectedChapterId?: string;
  onSelect: (chapterId: string) => void;
}) {
  const chapters = getChapters(project);
  return (
    <div className="chapter-tabs" aria-label="Chapter selection">
      {chapters.map((chapter) => {
        const sceneCount = getScenesForChapter(project, chapter.id).length;
        return (
          <button
            key={chapter.id}
            className={chapter.id === selectedChapterId ? 'active' : ''}
            onClick={() => onSelect(chapter.id)}
          >
            <span>{String(chapter.chapter.order).padStart(2, '0')}</span>
            <b>{chapter.name}</b>
            <small>{sceneCount} scene{sceneCount === 1 ? '' : 's'}</small>
          </button>
        );
      })}
    </div>
  );
}

function ChapterHeader({
  chapter,
  sceneCount,
  relatedCount,
  onOpenStoryboard,
  onOpenBrief,
}: {
  chapter: StoryChapter;
  sceneCount: number;
  relatedCount: number;
  onOpenStoryboard: () => void;
  onOpenBrief: () => void;
}) {
  return (
    <header className="chapter-hero">
      <div>
        <span className="eyebrow">Chapter {chapter.chapter.order}</span>
        <h1>{chapter.name}</h1>
        <p>{chapter.summary || 'Add a concise description of this chapter’s narrative movement.'}</p>
      </div>
      <div className="chapter-actions">
        <button onClick={onOpenStoryboard}>Open storyboard</button>
        <button className="primary" onClick={onOpenBrief}>Open brief</button>
      </div>
      <dl className="chapter-metrics">
        <div><dt>Scenes</dt><dd>{sceneCount}</dd></div>
        <div><dt>Related entities</dt><dd>{relatedCount}</dd></div>
        <div><dt>Objective</dt><dd>{chapter.chapter.objective ? 'Defined' : 'Missing'}</dd></div>
      </dl>
    </header>
  );
}

export function ChapterWorkspace({
  project,
  selectedChapterId,
  onSelectChapter,
  onSelectEntity,
  onOpenStoryboard,
  onOpenBrief,
}: {
  project: ContinuumProject;
  selectedChapterId?: string;
  onSelectChapter: (chapterId: string) => void;
  onSelectEntity: (entityId: string) => void;
  onOpenStoryboard: () => void;
  onOpenBrief: () => void;
}) {
  const chapters = getChapters(project);
  const chapter = chapters.find((item) => item.id === selectedChapterId) ?? chapters[0];

  if (!chapter) {
    return <section className="chapter-empty">Create a chapter to begin organizing the story.</section>;
  }

  const scenes = getScenesForChapter(project, chapter.id);
  const related = getChapterRelatedEntities(project, chapter.id);
  const relatedWorldEntities = related.filter((entity) => entity.type !== 'chapter' && entity.type !== 'scene');
  const scopeIds = new Set(related.map((entity) => entity.id));
  const names = new Map(project.entities.map((entity) => [entity.id, entity.name]));
  const relationships = project.relationships.filter(
    (relationship) => scopeIds.has(relationship.sourceId) && scopeIds.has(relationship.targetId),
  );

  const groups = relatedWorldEntities.reduce<Record<string, typeof relatedWorldEntities>>((result, entity) => {
    (result[entity.type] ??= []).push(entity);
    return result;
  }, {});

  return (
    <section className="chapter-workspace">
      <aside className="chapter-navigation">
        <div className="chapter-navigation-heading">
          <span>Story structure</span>
          <b>{chapters.length} chapter{chapters.length === 1 ? '' : 's'}</b>
        </div>
        {chapters.map((item) => (
          <button
            key={item.id}
            className={item.id === chapter.id ? 'active' : ''}
            onClick={() => onSelectChapter(item.id)}
          >
            <span>{String(item.chapter.order).padStart(2, '0')}</span>
            <div><b>{item.name}</b><small>{getScenesForChapter(project, item.id).length} scenes</small></div>
          </button>
        ))}
      </aside>

      <div className="chapter-detail">
        <ChapterHeader
          chapter={chapter}
          sceneCount={scenes.length}
          relatedCount={relatedWorldEntities.length}
          onOpenStoryboard={onOpenStoryboard}
          onOpenBrief={onOpenBrief}
        />

        <div className="chapter-detail-grid">
          <section className="chapter-panel chapter-scene-panel">
            <header><div><span>Sequence</span><h2>Scenes in this chapter</h2></div><b>{scenes.length}</b></header>
            {scenes.length ? (
              <ol className="chapter-scene-list">
                {scenes.map((scene) => (
                  <li key={scene.id}>
                    <button onClick={() => onSelectEntity(scene.id)}>
                      <span>{String(scene.scene.order).padStart(2, '0')}</span>
                      <div>
                        <b>{scene.name}</b>
                        <small>{scene.scene.purpose || scene.summary || 'Purpose not defined'}</small>
                      </div>
                      <i>{scene.scene.emotionalStart || '—'} → {scene.scene.emotionalEnd || '—'}</i>
                    </button>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="chapter-placeholder">No scenes are assigned to this chapter yet.</p>
            )}
          </section>

          <section className="chapter-panel chapter-brief-card">
            <header><div><span>Writing contract</span><h2>Chapter brief</h2></div></header>
            <dl>
              <div><dt>Opening state</dt><dd>{chapter.chapter.openingState || 'Not defined'}</dd></div>
              <div><dt>Chapter objective</dt><dd>{chapter.chapter.objective || 'Not defined'}</dd></div>
              <div><dt>Closing state</dt><dd>{chapter.chapter.closingState || 'Not defined'}</dd></div>
            </dl>
            {chapter.chapter.ghostwriterNotes && <blockquote>{chapter.chapter.ghostwriterNotes}</blockquote>}
            <button onClick={onOpenBrief}>Review full brief →</button>
          </section>

          <section className="chapter-panel chapter-entities-panel">
            <header><div><span>World correlation</span><h2>Related entities</h2></div><b>{relatedWorldEntities.length}</b></header>
            {relatedWorldEntities.length ? (
              <div className="chapter-entity-groups">
                {Object.entries(groups).map(([type, entities]) => (
                  <div key={type}>
                    <h3>{entityLabels[type as EntityType]}</h3>
                    <div>
                      {entities.map((entity) => (
                        <button key={entity.id} onClick={() => onSelectEntity(entity.id)}>
                          {entity.images?.[0] && <img src={entity.images[0].thumbnailUrl ?? entity.images[0].dataUrl} alt="" loading="lazy" />}
                          <span><b>{entity.name}</b><small>{entity.summary || entityLabels[entity.type]}</small></span>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="chapter-placeholder">Connect scenes to characters, locations, threads, facts, or objects to populate this view.</p>
            )}
          </section>

          <section className="chapter-panel chapter-relationships-panel">
            <header><div><span>Network</span><h2>Relationships in scope</h2></div><b>{relationships.length + scenes.length}</b></header>
            <div className="chapter-relationship-list">
              {scenes.map((scene) => (
                <button key={`contains-${scene.id}`} onClick={() => onSelectEntity(scene.id)}>
                  <b>{chapter.name}</b><span>contains</span><b>{scene.name}</b>
                </button>
              ))}
              {relationships.map((relationship) => (
                <button key={relationship.id} onClick={() => onSelectEntity(relationship.sourceId)}>
                  <b>{names.get(relationship.sourceId) ?? 'Unknown'}</b>
                  <span>{relationship.label}</span>
                  <b>{names.get(relationship.targetId) ?? 'Unknown'}</b>
                </button>
              ))}
              {!scenes.length && !relationships.length && <p className="chapter-placeholder">No relationships are available yet.</p>}
            </div>
          </section>
        </div>
      </div>
    </section>
  );
}
