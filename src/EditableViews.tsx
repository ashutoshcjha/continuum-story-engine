import type { KeyboardEvent } from 'react';
import { ChapterTabs } from './ChapterWorkspace';
import { InlineEdit, InlineSelect } from './InlineEdit';
import { SceneCharacterEditor } from './SceneCharacterEditor';
import {
  getChapters,
  getScenesForChapter,
  type ContinuumProject,
  type StoryChapter,
  type StoryEntity,
  type StoryScene,
} from './model';

interface SharedViewProps {
  project: ContinuumProject;
  selectedChapterId?: string;
  onSelectChapter: (chapterId: string) => void;
  onUpdateEntity: (entity: StoryEntity) => void;
}

function updateChapterDetails(
  chapter: StoryChapter,
  changes: Partial<StoryChapter['chapter']>,
  onUpdateEntity: (entity: StoryEntity) => void,
) {
  onUpdateEntity({ ...chapter, chapter: { ...chapter.chapter, ...changes } });
}

function updateSceneDetails(
  scene: StoryScene,
  changes: Partial<StoryScene['scene']>,
  onUpdateEntity: (entity: StoryEntity) => void,
) {
  onUpdateEntity({ ...scene, scene: { ...scene.scene, ...changes } });
}

function activateCard(event: KeyboardEvent<HTMLElement>, onActivate: () => void) {
  if (event.target !== event.currentTarget) return;
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    onActivate();
  }
}

export function EditableStoryboard({
  project,
  selectedChapterId,
  onSelectChapter,
  onSelectEntity,
  onUpdateEntity,
  onCreateCharacter,
}: SharedViewProps & {
  onSelectEntity: (entityId: string) => void;
  onCreateCharacter: (sceneId: string, name: string) => void;
}) {
  const chapters = getChapters(project);
  const chapter = chapters.find((item) => item.id === selectedChapterId) ?? chapters[0];
  const scenes = chapter ? getScenesForChapter(project, chapter.id) : [];
  const characters = project.entities.filter((entity) => entity.type === 'character');
  const locations = project.entities.filter((entity) => entity.type === 'location');
  const characterOptions = characters.map((character) => ({ value: character.id, label: character.name }));
  const locationOptions = locations.map((location) => ({ value: location.id, label: location.name }));

  return (
    <section className="storyboard">
      <ChapterTabs project={project} selectedChapterId={chapter?.id} onSelect={onSelectChapter} />
      <div className="section-intro chapter-scoped-intro">
        <span>Story stream · Chapter {chapter?.chapter.order ?? '—'}</span>
        <h2>
          {chapter ? (
            <InlineEdit
              value={chapter.name}
              placeholder="Name this chapter"
              ariaLabel="Chapter name"
              onCommit={(name) => onUpdateEntity({ ...chapter, name })}
            />
          ) : 'No chapter selected'}
        </h2>
        {chapter && (
          <p>
            <InlineEdit
              value={chapter.chapter.objective}
              multiline
              placeholder="Double-click to define what this chapter must change"
              ariaLabel="Chapter objective"
              onCommit={(objective) => updateChapterDetails(chapter, { objective }, onUpdateEntity)}
            />
          </p>
        )}
        <span className="inline-edit-hint">Double-click text or selections to edit · Ctrl/⌘ + Enter saves multiline fields</span>
      </div>

      <div className="scene-grid">
        {scenes.map((scene) => (
          <article
            key={scene.id}
            className="scene-card"
            role="button"
            tabIndex={0}
            onClick={() => onSelectEntity(scene.id)}
            onKeyDown={(event) => activateCard(event, () => onSelectEntity(scene.id))}
          >
            {scene.images?.[0] && (
              <img
                className="scene-card-image"
                src={scene.images[0].thumbnailUrl ?? scene.images[0].dataUrl}
                alt=""
                loading="lazy"
                decoding="async"
              />
            )}
            <div className="scene-card-top">
              <span>{chapter?.name}</span>
              <b>{String(scene.scene.order).padStart(2, '0')}</b>
            </div>
            <h3>
              <InlineEdit
                value={scene.name}
                placeholder="Name this scene"
                ariaLabel="Scene name"
                onCommit={(name) => onUpdateEntity({ ...scene, name })}
              />
            </h3>
            <p>
              <InlineEdit
                value={scene.summary}
                multiline
                placeholder="Double-click to add a one-sentence scene summary"
                ariaLabel="Scene summary"
                onCommit={(summary) => onUpdateEntity({ ...scene, summary })}
              />
            </p>
            <dl>
              <dt>POV</dt>
              <dd>
                <InlineSelect
                  value={scene.scene.povCharacterId ?? ''}
                  options={characterOptions}
                  placeholder="Choose POV"
                  ariaLabel="POV character"
                  onCommit={(povCharacterId) => updateSceneDetails(scene, {
                    povCharacterId: povCharacterId || undefined,
                    participantIds: povCharacterId && !scene.scene.participantIds.includes(povCharacterId)
                      ? [...scene.scene.participantIds, povCharacterId]
                      : scene.scene.participantIds,
                  }, onUpdateEntity)}
                />
              </dd>
              <dt>Location</dt>
              <dd>
                <InlineSelect
                  value={scene.scene.locationId ?? ''}
                  options={locationOptions}
                  placeholder="Choose location"
                  ariaLabel="Scene location"
                  onCommit={(locationId) => updateSceneDetails(scene, { locationId: locationId || undefined }, onUpdateEntity)}
                />
              </dd>
              <dt>Characters</dt>
              <dd className="scene-cast-cell">
                <SceneCharacterEditor
                  scene={scene}
                  characters={characters}
                  onUpdateScene={(changes) => updateSceneDetails(scene, changes, onUpdateEntity)}
                  onCreateCharacter={onCreateCharacter}
                />
              </dd>
              <dt>Movement</dt>
              <dd className="emotion-inline">
                <InlineEdit
                  value={scene.scene.emotionalStart}
                  placeholder="Start"
                  ariaLabel="Starting emotion"
                  onCommit={(emotionalStart) => updateSceneDetails(scene, { emotionalStart }, onUpdateEntity)}
                />
                <span>→</span>
                <InlineEdit
                  value={scene.scene.emotionalEnd}
                  placeholder="End"
                  ariaLabel="Ending emotion"
                  onCommit={(emotionalEnd) => updateSceneDetails(scene, { emotionalEnd }, onUpdateEntity)}
                />
              </dd>
            </dl>
            <div className="scene-turn">
              <span>Turn</span>
              <InlineEdit
                value={scene.scene.turningPoint}
                multiline
                placeholder="Double-click to define the turning point"
                ariaLabel="Turning point"
                onCommit={(turningPoint) => updateSceneDetails(scene, { turningPoint }, onUpdateEntity)}
              />
            </div>
            {(scene.links?.length ?? 0) > 0 && (
              <div className="scene-link-note">↗ {scene.links.length} linked reference{scene.links.length === 1 ? '' : 's'}</div>
            )}
          </article>
        ))}
      </div>
      {!scenes.length && <div className="empty-canvas">Create a scene and assign it to this chapter.</div>}
    </section>
  );
}

function BriefField({
  label,
  value,
  placeholder,
  onCommit,
}: {
  label: string;
  value: string;
  placeholder?: string;
  onCommit: (value: string) => void;
}) {
  return (
    <div>
      <small>{label}</small>
      <InlineEdit
        value={value}
        multiline
        placeholder={placeholder ?? `Double-click to add ${label.toLowerCase()}`}
        ariaLabel={label}
        onCommit={onCommit}
      />
    </div>
  );
}

export function EditableBrief({
  project,
  selectedChapterId,
  onSelectChapter,
  onUpdateEntity,
  onUpdateProject,
}: SharedViewProps & { onUpdateProject: (patch: Partial<ContinuumProject>) => void }) {
  const chapters = getChapters(project);
  const chapter = chapters.find((item) => item.id === selectedChapterId) ?? chapters[0];
  const scenes = chapter ? getScenesForChapter(project, chapter.id) : [];

  return (
    <section className="brief">
      <ChapterTabs project={project} selectedChapterId={chapter?.id} onSelect={onSelectChapter} />
      <div className="brief-paper">
        <div className="brief-edit-notice">Double-click any outlined text to edit the source field directly.</div>
        <span className="eyebrow">Ghostwriter chapter briefing document</span>
        <h1>
          {chapter ? (
            <InlineEdit
              value={chapter.name}
              placeholder="Name this chapter"
              ariaLabel="Chapter name"
              onCommit={(name) => onUpdateEntity({ ...chapter, name })}
            />
          ) : (
            <InlineEdit
              value={project.title}
              placeholder="Name this project"
              ariaLabel="Project title"
              onCommit={(title) => onUpdateProject({ title })}
            />
          )}
        </h1>
        <h2>
          {chapter && (
            <InlineEdit
              value={chapter.chapter.objective}
              multiline
              placeholder="Double-click to define the chapter objective"
              ariaLabel="Chapter objective"
              onCommit={(objective) => updateChapterDetails(chapter, { objective }, onUpdateEntity)}
            />
          )}
        </h2>
        <p className="premise">
          <b>
            <InlineEdit
              value={project.title}
              placeholder="Project title"
              ariaLabel="Project title"
              onCommit={(title) => onUpdateProject({ title })}
            />
          </b>
          <br />
          <InlineEdit
            value={project.logline}
            multiline
            placeholder="Double-click to add the project logline"
            ariaLabel="Project logline"
            onCommit={(logline) => onUpdateProject({ logline })}
          />
        </p>

        {chapter && (
          <section className="chapter-state-brief">
            <BriefField
              label="Opening state"
              value={chapter.chapter.openingState}
              onCommit={(openingState) => updateChapterDetails(chapter, { openingState }, onUpdateEntity)}
            />
            <BriefField
              label="Required closing state"
              value={chapter.chapter.closingState}
              onCommit={(closingState) => updateChapterDetails(chapter, { closingState }, onUpdateEntity)}
            />
          </section>
        )}

        {scenes.map((scene) => (
          <article key={scene.id}>
            {scene.images?.[0] && (
              <img className="brief-image" src={scene.images[0].dataUrl} alt="" loading="lazy" decoding="async" />
            )}
            <header><b>Scene {scene.scene.order}</b><span>{chapter?.name}</span></header>
            <h3>
              <InlineEdit
                value={scene.name}
                placeholder="Name this scene"
                ariaLabel="Scene name"
                onCommit={(name) => onUpdateEntity({ ...scene, name })}
              />
            </h3>
            <p>
              <InlineEdit
                value={scene.summary}
                multiline
                placeholder="Double-click to add the scene summary"
                ariaLabel="Scene summary"
                onCommit={(summary) => onUpdateEntity({ ...scene, summary })}
              />
            </p>
            <div className="brief-grid">
              <BriefField
                label="Purpose"
                value={scene.scene.purpose}
                onCommit={(purpose) => updateSceneDetails(scene, { purpose }, onUpdateEntity)}
              />
              <BriefField
                label="Conflict"
                value={scene.scene.conflict}
                onCommit={(conflict) => updateSceneDetails(scene, { conflict }, onUpdateEntity)}
              />
              <BriefField
                label="Turning point"
                value={scene.scene.turningPoint}
                onCommit={(turningPoint) => updateSceneDetails(scene, { turningPoint }, onUpdateEntity)}
              />
              <BriefField
                label="Outcome"
                value={scene.scene.outcome}
                onCommit={(outcome) => updateSceneDetails(scene, { outcome }, onUpdateEntity)}
              />
              <BriefField
                label="Reveal"
                value={scene.scene.reveal}
                onCommit={(reveal) => updateSceneDetails(scene, { reveal }, onUpdateEntity)}
              />
              <BriefField
                label="Keep concealed"
                value={scene.scene.conceal}
                onCommit={(conceal) => updateSceneDetails(scene, { conceal }, onUpdateEntity)}
              />
            </div>
            <blockquote>
              <b>Scene direction</b>
              <InlineEdit
                value={scene.scene.ghostwriterNotes}
                multiline
                placeholder="Double-click to add scene direction"
                ariaLabel="Scene direction"
                onCommit={(ghostwriterNotes) => updateSceneDetails(scene, { ghostwriterNotes }, onUpdateEntity)}
              />
            </blockquote>
            {(scene.links?.length ?? 0) > 0 && (
              <div className="brief-links">
                <b>References</b>
                {scene.links.map((link) => <a key={link.id} href={link.url} target="_blank" rel="noreferrer">{link.label}</a>)}
              </div>
            )}
          </article>
        ))}

        {chapter && (
          <blockquote className="chapter-notes">
            <b>Chapter direction</b>
            <InlineEdit
              value={chapter.chapter.ghostwriterNotes}
              multiline
              placeholder="Double-click to add chapter direction"
              ariaLabel="Chapter direction"
              onCommit={(ghostwriterNotes) => updateChapterDetails(chapter, { ghostwriterNotes }, onUpdateEntity)}
            />
          </blockquote>
        )}
      </div>
    </section>
  );
}
