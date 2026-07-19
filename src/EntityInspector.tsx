import { useRef, useState } from 'react';
import { prepareStoryImage } from './imageProcessing';
import { StoryLogicInspector } from './StoryLogicInspector';
import type { EffectTargetType } from './SceneEffectsEditor';
import type { SceneEffectInput } from './storyLogic';
import {
  getChapters,
  getSceneChapterResolution,
  isStoryChapter,
  isStoryScene,
  type ContinuumProject,
  type EntityType,
  type StoryChapter,
  type StoryEntity,
  type StoryRelationship,
  type StoryScene,
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

function TextField({
  label,
  value,
  onChange,
  multiline = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  multiline?: boolean;
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

interface EntityInspectorProps {
  entity?: StoryEntity;
  project: ContinuumProject;
  updateEntity: (entity: StoryEntity) => void;
  removeEntity: (id: string) => void;
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

export function EntityInspector({
  entity,
  project,
  updateEntity,
  removeEntity,
  onAddEffect,
  onUpdateRelationship,
  onDeleteRelationship,
  onCreateEffectTarget,
}: EntityInspectorProps) {
  const imageRef = useRef<HTMLInputElement>(null);
  const [linkLabel, setLinkLabel] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [isAddingImages, setIsAddingImages] = useState(false);

  if (!entity) {
    return (
      <aside className="inspector empty-panel">
        <span>Selection</span>
        <h2>Choose an object</h2>
        <p>Select a chapter, scene, relationship, card, or library item to edit it.</p>
      </aside>
    );
  }

  const patch = (changes: Partial<StoryEntity>) => updateEntity({ ...entity, ...changes });
  const scene = isStoryScene(entity) ? entity : undefined;
  const chapter = isStoryChapter(entity) ? entity : undefined;
  const patchScene = (changes: Partial<StoryScene['scene']>) => {
    if (scene) updateEntity({ ...scene, scene: { ...scene.scene, ...changes } });
  };
  const patchChapter = (changes: Partial<StoryChapter['chapter']>) => {
    if (chapter) updateEntity({ ...chapter, chapter: { ...chapter.chapter, ...changes } });
  };
  const characters = project.entities.filter((item) => item.type === 'character');
  const locations = project.entities.filter((item) => item.type === 'location');
  const chapters = getChapters(project);
  const images = entity.images ?? [];
  const links = entity.links ?? [];
  const chapterResolution = scene ? getSceneChapterResolution(project, scene.id) : undefined;
  const resolvedChapter = chapterResolution?.chapterId
    ? chapters.find((item) => item.id === chapterResolution.chapterId)
    : undefined;
  const sourceSceneNames = chapterResolution?.sourceSceneIds
    .map((sceneId) => project.entities.find((item) => item.id === sceneId)?.name)
    .filter((name): name is string => Boolean(name)) ?? [];
  const conflictingChapters = chapterResolution?.conflictingChapterIds
    .map((chapterId) => chapters.find((item) => item.id === chapterId)?.name)
    .filter((name): name is string => Boolean(name)) ?? [];

  const addImages = async (files: FileList | null) => {
    if (!files?.length) return;
    const accepted = Array.from(files).filter((file) => file.type.startsWith('image/'));
    if (!accepted.length) return;
    setIsAddingImages(true);
    try {
      const additions = await Promise.all(accepted.map(prepareStoryImage));
      patch({ images: [...images, ...additions] });
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Could not add the selected image.');
    } finally {
      setIsAddingImages(false);
    }
  };

  const addLink = () => {
    const raw = linkUrl.trim();
    if (!raw) return;
    let url: URL;
    try {
      url = new URL(raw);
    } catch {
      window.alert('Enter a complete URL such as https://example.com.');
      return;
    }
    if (!['http:', 'https:'].includes(url.protocol)) {
      window.alert('Only http and https links are supported.');
      return;
    }
    patch({
      links: [
        ...links,
        {
          id: `link_${crypto.randomUUID()}`,
          label: linkLabel.trim() || url.hostname,
          url: url.toString(),
        },
      ],
    });
    setLinkLabel('');
    setLinkUrl('');
  };

  const requestEntityDeletion = () => {
    const confirmed = window.confirm(`Delete the ${entityLabels[entity.type].toLowerCase()} “${entity.name}” and all of its story relationships?`);
    if (confirmed) removeEntity(entity.id);
  };

  const logicProps = {
    project,
    entity,
    onUpdateEntity: updateEntity,
    onAddEffect,
    onUpdateRelationship,
    onDeleteRelationship,
    onCreateEffectTarget,
  };

  return (
    <aside className="inspector">
      <div className="inspector-heading">
        <span>{entityLabels[entity.type]}</span>
        <button className="danger-link" onClick={requestEntityDeletion}>Delete entity</button>
      </div>
      <TextField label="Name" value={entity.name} onChange={(name) => patch({ name })} />
      <TextField label="Summary" value={entity.summary} multiline onChange={(summary) => patch({ summary })} />
      <TextField
        label="Tags (comma separated)"
        value={entity.tags.join(', ')}
        onChange={(tags) => patch({ tags: tags.split(',').map((tag) => tag.trim()).filter(Boolean) })}
      />

      {!scene && !chapter && <StoryLogicInspector {...logicProps} />}

      <section className="attachment-section">
        <div className="attachment-heading">
          <span>Images</span>
          <button disabled={isAddingImages} onClick={() => imageRef.current?.click()}>
            {isAddingImages ? 'Optimizing…' : 'Add image'}
          </button>
        </div>
        <input
          ref={imageRef}
          hidden
          type="file"
          accept="image/*"
          multiple
          onChange={async (event) => {
            await addImages(event.target.files);
            event.target.value = '';
          }}
        />
        {images.length > 0 ? (
          <div className="image-grid">
            {images.map((image, index) => (
              <figure key={image.id}>
                <img src={image.thumbnailUrl ?? image.dataUrl} alt={image.name} loading="lazy" decoding="async" />
                <figcaption>
                  <span>{index === 0 ? 'Cover · ' : ''}{image.name}</span>
                  <button onClick={() => patch({ images: images.filter((item) => item.id !== image.id) })}>×</button>
                </figcaption>
              </figure>
            ))}
          </div>
        ) : (
          <p className="attachment-empty">The first image becomes the node thumbnail and appears in exports.</p>
        )}
      </section>

      <section className="attachment-section">
        <div className="attachment-heading"><span>External links</span></div>
        <div className="link-form">
          <input aria-label="Link label" placeholder="Label" value={linkLabel} onChange={(event) => setLinkLabel(event.target.value)} />
          <input
            aria-label="URL"
            placeholder="https://…"
            value={linkUrl}
            onChange={(event) => setLinkUrl(event.target.value)}
            onKeyDown={(event) => { if (event.key === 'Enter') addLink(); }}
          />
          <button onClick={addLink}>Add</button>
        </div>
        {links.length > 0 ? (
          <ul className="link-list">
            {links.map((link) => (
              <li key={link.id}>
                <a href={link.url} target="_blank" rel="noreferrer">{link.label}</a>
                <button onClick={() => patch({ links: links.filter((item) => item.id !== link.id) })}>×</button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="attachment-empty">Link research, maps, reference pages, playlists, or source material to this node.</p>
        )}
      </section>

      {chapter && (
        <div className="scene-fields">
          <label className="field">
            <span>Chapter order</span>
            <input type="number" min="1" value={chapter.chapter.order} onChange={(event) => patchChapter({ order: Number(event.target.value) })} />
          </label>
          <TextField label="Chapter objective" value={chapter.chapter.objective} multiline onChange={(objective) => patchChapter({ objective })} />
          <TextField label="Opening state" value={chapter.chapter.openingState} multiline onChange={(openingState) => patchChapter({ openingState })} />
          <TextField label="Closing state" value={chapter.chapter.closingState} multiline onChange={(closingState) => patchChapter({ closingState })} />
          <TextField label="Ghostwriter notes" value={chapter.chapter.ghostwriterNotes} multiline onChange={(ghostwriterNotes) => patchChapter({ ghostwriterNotes })} />
        </div>
      )}

      {scene && chapterResolution && (
        <div className="scene-fields">
          <div className="two-fields">
            <label className="field">
              <span>Order in chapter</span>
              <input type="number" min="1" value={scene.scene.order} onChange={(event) => patchScene({ order: Number(event.target.value) })} />
            </label>
            <label className="field">
              <span>Chapter</span>
              <select
                value={scene.scene.chapterId ?? (scene.scene.chapterInheritanceBlocked ? '__blocked__' : '__inherit__')}
                onChange={(event) => {
                  const value = event.target.value;
                  if (value === '__inherit__') {
                    patchScene({ chapterId: undefined, chapterInheritanceBlocked: false });
                  } else if (value === '__blocked__') {
                    patchScene({ chapterId: undefined, chapterInheritanceBlocked: true });
                  } else {
                    patchScene({ chapterId: value || undefined, chapterInheritanceBlocked: false });
                  }
                }}
              >
                <option value="__inherit__">
                  {chapterResolution.mode === 'inherited' && resolvedChapter
                    ? `Use scene hierarchy — ${resolvedChapter.name}`
                    : 'Use scene hierarchy'}
                </option>
                <option value="__blocked__">Keep unassigned</option>
                {chapters.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
            </label>
          </div>
          {chapterResolution.mode === 'inherited' && resolvedChapter && (
            <div className="chapter-resolution-note is-inherited">
              <b>Inherited chapter</b>
              <p>{resolvedChapter.name}, through {sourceSceneNames.length ? sourceSceneNames.join(', ') : 'linked scenes'}.</p>
            </div>
          )}
          {chapterResolution.mode === 'ambiguous' && (
            <div className="chapter-resolution-note is-warning">
              <b>Hierarchy conflict</b>
              <p>Linked scenes are anchored in {conflictingChapters.join(' and ')}. Choose a chapter manually or keep this scene unassigned.</p>
            </div>
          )}
          {scene.scene.chapterInheritanceBlocked && (
            <div className="chapter-resolution-note">
              <b>Inheritance disabled</b>
              <p>This scene stays unassigned even when it is linked to scenes in a chapter.</p>
            </div>
          )}
          <label className="field">
            <span>POV character</span>
            <select
              value={scene.scene.povCharacterId ?? ''}
              onChange={(event) => {
                const povCharacterId = event.target.value || undefined;
                patchScene({
                  povCharacterId,
                  participantIds: povCharacterId && !scene.scene.participantIds.includes(povCharacterId)
                    ? [...scene.scene.participantIds, povCharacterId]
                    : scene.scene.participantIds,
                });
              }}
            >
              <option value="">Not set</option>
              {characters.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </label>
          <label className="field">
            <span>Location</span>
            <select value={scene.scene.locationId ?? ''} onChange={(event) => patchScene({ locationId: event.target.value || undefined })}>
              <option value="">Not set</option>
              {locations.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </label>
          <TextField label="Purpose" value={scene.scene.purpose} multiline onChange={(purpose) => patchScene({ purpose })} />
          <TextField label="Conflict" value={scene.scene.conflict} multiline onChange={(conflict) => patchScene({ conflict })} />
          <TextField label="Turning point" value={scene.scene.turningPoint} multiline onChange={(turningPoint) => patchScene({ turningPoint })} />
          <TextField label="Outcome" value={scene.scene.outcome} multiline onChange={(outcome) => patchScene({ outcome })} />
          <div className="two-fields">
            <TextField label="Emotion in" value={scene.scene.emotionalStart} onChange={(emotionalStart) => patchScene({ emotionalStart })} />
            <TextField label="Emotion out" value={scene.scene.emotionalEnd} onChange={(emotionalEnd) => patchScene({ emotionalEnd })} />
          </div>
          <TextField label="Reveal" value={scene.scene.reveal} multiline onChange={(reveal) => patchScene({ reveal })} />
          <TextField label="Keep concealed" value={scene.scene.conceal} multiline onChange={(conceal) => patchScene({ conceal })} />
          <TextField label="Ghostwriter notes" value={scene.scene.ghostwriterNotes} multiline onChange={(ghostwriterNotes) => patchScene({ ghostwriterNotes })} />
        </div>
      )}

      {scene && <StoryLogicInspector {...logicProps} />}
      {!scene && !chapter && <TextField label="Notes" value={entity.notes} multiline onChange={(notes) => patch({ notes })} />}
    </aside>
  );
}
