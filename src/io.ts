import type { ContinuumProject, StoryEntity, StoryRelationship } from './model';
import { getChapters, getScenesForChapter, normalizeProject } from './model';
import {
  describeEffect,
  effectKindLabels,
  getSceneEffects,
  normalizeStoryLogic,
  relationshipKind,
  type EffectRelationshipKind,
} from './storyLogic';

function download(name: string, content: string, type: string): void {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  URL.revokeObjectURL(url);
}

const fileName = (title: string) => title.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'story';

export function exportProject(project: ContinuumProject): void {
  const normalized = normalizeStoryLogic(normalizeProject(project));
  download(`${fileName(project.title)}.continuum`, JSON.stringify(normalized, null, 2), 'application/json');
}

export async function importProject(file: File): Promise<ContinuumProject> {
  const value = JSON.parse(await file.text()) as Partial<ContinuumProject>;
  if (value.format !== 'continuum' || value.formatVersion !== 1 || !Array.isArray(value.entities)) {
    throw new Error('This is not a supported Continuum project file.');
  }
  return normalizeStoryLogic(normalizeProject(value as ContinuumProject));
}

const escapeHtml = (value: string) => value
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;');

const nameOf = (entities: StoryEntity[], id?: string) => entities.find((entity) => entity.id === id)?.name ?? '—';

function effectGroupsHtml(project: ContinuumProject, relationships: StoryRelationship[]): string {
  if (!relationships.length) return '';
  const kinds: EffectRelationshipKind[] = ['scene-thread', 'scene-fact', 'scene-rule', 'character-fact'];
  const groups = kinds.map((kind) => {
    const effects = relationships.filter((relationship) => relationshipKind(relationship) === kind);
    if (!effects.length) return '';
    return `<section><b>${escapeHtml(effectKindLabels[kind])}</b><ul>${effects.map((relationship) => `<li>${escapeHtml(describeEffect(project, relationship))}</li>`).join('')}</ul></section>`;
  }).join('');
  return `<section class="story-effects"><header><span>Structured story logic</span><h4>Story effects</h4></header><div>${groups}</div></section>`;
}

export function exportStoryboardHtml(project: ContinuumProject): void {
  const normalized = normalizeStoryLogic(normalizeProject(project));
  const chapters = getChapters(normalized);

  const tableOfContents = chapters.map((chapter) => `
    <a href="#${escapeHtml(chapter.id)}">
      <span>Chapter ${chapter.chapter.order}</span>
      <b>${escapeHtml(chapter.name)}</b>
      <small>${getScenesForChapter(normalized, chapter.id).length} scenes</small>
    </a>`).join('');

  const chapterSections = chapters.map((chapter) => {
    const scenes = getScenesForChapter(normalized, chapter.id);
    const sceneCards = scenes.map((scene) => {
      const people = scene.scene.participantIds.map((id) => nameOf(normalized.entities, id)).join(', ') || '—';
      const image = scene.images?.[0]
        ? `<img class="scene-image" src="${escapeHtml(scene.images[0].dataUrl)}" alt="${escapeHtml(scene.images[0].name)}">`
        : '';
      const links = (scene.links ?? []).length
        ? `<section class="references"><b>References</b>${scene.links.map((link) => `<a href="${escapeHtml(link.url)}" target="_blank" rel="noreferrer">${escapeHtml(link.label)}</a>`).join('')}</section>`
        : '';
      const effects = effectGroupsHtml(normalized, getSceneEffects(normalized, scene.id));

      return `
        <article class="scene">
          ${image}
          <header><span>${escapeHtml(chapter.name)}</span><strong>Scene ${scene.scene.order}</strong></header>
          <h3>${escapeHtml(scene.name)}</h3>
          <p class="summary">${escapeHtml(scene.summary || 'No summary yet.')}</p>
          <dl>
            <dt>POV</dt><dd>${escapeHtml(nameOf(normalized.entities, scene.scene.povCharacterId))}</dd>
            <dt>Location</dt><dd>${escapeHtml(nameOf(normalized.entities, scene.scene.locationId))}</dd>
            <dt>Participants</dt><dd>${escapeHtml(people)}</dd>
            <dt>Purpose</dt><dd>${escapeHtml(scene.scene.purpose || '—')}</dd>
            <dt>Conflict</dt><dd>${escapeHtml(scene.scene.conflict || '—')}</dd>
            <dt>Turning point</dt><dd>${escapeHtml(scene.scene.turningPoint || '—')}</dd>
            <dt>Outcome</dt><dd>${escapeHtml(scene.scene.outcome || '—')}</dd>
            <dt>Emotional movement</dt><dd>${escapeHtml(`${scene.scene.emotionalStart || '—'} → ${scene.scene.emotionalEnd || '—'}`)}</dd>
            <dt>Reveal</dt><dd>${escapeHtml(scene.scene.reveal || '—')}</dd>
            <dt>Keep concealed</dt><dd>${escapeHtml(scene.scene.conceal || '—')}</dd>
          </dl>
          ${effects}
          ${scene.scene.ghostwriterNotes ? `<aside><b>Scene direction</b><p>${escapeHtml(scene.scene.ghostwriterNotes)}</p></aside>` : ''}
          ${links}
        </article>`;
    }).join('');

    return `
      <section class="chapter" id="${escapeHtml(chapter.id)}">
        <header class="chapter-header">
          <div><span>Chapter ${chapter.chapter.order}</span><h2>${escapeHtml(chapter.name)}</h2><p>${escapeHtml(chapter.summary || chapter.chapter.objective || 'No chapter summary yet.')}</p></div>
          <a href="#top">Back to contents</a>
        </header>
        <section class="chapter-contract">
          <div><b>Opening state</b><p>${escapeHtml(chapter.chapter.openingState || 'Not defined')}</p></div>
          <div><b>Objective</b><p>${escapeHtml(chapter.chapter.objective || 'Not defined')}</p></div>
          <div><b>Required closing state</b><p>${escapeHtml(chapter.chapter.closingState || 'Not defined')}</p></div>
        </section>
        ${chapter.chapter.ghostwriterNotes ? `<aside class="chapter-direction"><b>Chapter direction</b><p>${escapeHtml(chapter.chapter.ghostwriterNotes)}</p></aside>` : ''}
        ${sceneCards || '<p class="empty">No scenes are assigned to this chapter.</p>'}
      </section>`;
  }).join('');

  const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${escapeHtml(normalized.title)} — Storyboard</title><style>
    :root{font-family:Inter,ui-sans-serif,system-ui,sans-serif;color:#172126;background:#edf0ea}*{box-sizing:border-box}body{margin:0}main{max-width:1080px;margin:auto;padding:56px 24px 90px}.eyebrow{letter-spacing:.16em;text-transform:uppercase;font-size:12px;color:#60706f}h1,h2,h3,h4{font-family:Georgia,serif}h1{font-size:52px;margin:10px 0 12px}.intro{max-width:780px;font-size:18px;line-height:1.6;color:#4c5a5c}.contents{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:10px;margin:34px 0 70px}.contents a{display:grid;gap:3px;text-decoration:none;color:#24312f;background:#fff;border:1px solid #d8ddd7;border-radius:12px;padding:14px}.contents span,.chapter-header span{font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:#8a6d59}.contents small{font-size:11px;color:#798681}.chapter{scroll-margin-top:24px;margin-top:72px}.chapter-header{display:flex;justify-content:space-between;gap:24px;align-items:start;border-bottom:1px solid #d5dbd4;padding-bottom:20px}.chapter-header h2{font-size:38px;margin:6px 0}.chapter-header p{max-width:760px;color:#596865;line-height:1.55;margin:0}.chapter-header>a{font-size:12px;color:#35646a;text-decoration:none;white-space:nowrap}.chapter-contract{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin:18px 0}.chapter-contract>div{background:#f8f9f5;border:1px solid #dce1db;border-radius:12px;padding:14px}.chapter-contract b{font-size:10px;text-transform:uppercase;letter-spacing:.09em;color:#7e8a86}.chapter-contract p{font-size:13px;line-height:1.5;color:#44524f}.chapter-direction{background:#e9f0ed;border-left:3px solid #577f78;border-radius:9px;padding:15px 18px;margin:18px 0}.scene{background:#fff;border:1px solid #d8ddd7;border-radius:20px;padding:26px;margin-top:22px;box-shadow:0 8px 24px #1b2b2710;overflow:hidden}.scene-image{width:calc(100% + 52px);max-height:360px;object-fit:cover;margin:-26px -26px 24px}.scene>header{display:flex;justify-content:space-between;color:#657573;font-size:13px;text-transform:uppercase;letter-spacing:.08em}.scene h3{font-size:30px;margin:16px 0 8px}.summary{color:#53615f;font-size:16px}dl{display:grid;grid-template-columns:160px 1fr;gap:10px 20px;border-top:1px solid #e4e8e3;padding-top:20px}dt{font-weight:700;color:#5d6d69}dd{margin:0;line-height:1.5}.scene aside{background:#f4efe4;border-radius:12px;padding:16px 18px;margin-top:20px}.scene aside p,.chapter-direction p{margin:6px 0 0;line-height:1.5}.story-effects{border-top:1px solid #e1e5df;margin-top:22px;padding-top:18px}.story-effects>header span{font-size:9px;text-transform:uppercase;letter-spacing:.1em;color:#87928e}.story-effects h4{font-size:20px;margin:3px 0 10px}.story-effects>div{display:grid;grid-template-columns:1fr 1fr;gap:10px}.story-effects section{background:#f5f7f3;border-radius:10px;padding:12px}.story-effects section>b{font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:#657672}.story-effects ul{margin:8px 0 0;padding-left:18px}.story-effects li{font-size:12px;line-height:1.5;margin:4px 0}.references{display:flex;gap:10px;align-items:center;flex-wrap:wrap;border-top:1px solid #e4e8e3;margin-top:20px;padding-top:16px}.references a{color:#295f67;text-decoration:none;border:1px solid #cfd9d6;border-radius:999px;padding:7px 10px;font-size:13px}.empty{color:#75827e}@media(max-width:700px){h1{font-size:38px}.chapter-header{display:block}.chapter-header>a{display:inline-block;margin-top:12px}.chapter-contract,.story-effects>div{grid-template-columns:1fr}dl{grid-template-columns:1fr;gap:3px}dd{margin-bottom:10px}}
  </style></head><body><main id="top"><div class="eyebrow">Continuum storyboard</div><h1>${escapeHtml(normalized.title)}</h1><p class="intro"><b>${escapeHtml(normalized.logline)}</b><br>${escapeHtml(normalized.premise)}</p><nav class="contents">${tableOfContents}</nav>${chapterSections || '<p>No chapters have been created.</p>'}</main></body></html>`;

  download(`${fileName(normalized.title)}-storyboard.html`, html, 'text/html');
}
