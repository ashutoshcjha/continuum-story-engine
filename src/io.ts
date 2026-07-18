import type { ContinuumProject, StoryEntity } from './model';
import { isStoryScene } from './model';

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
  download(`${fileName(project.title)}.continuum`, JSON.stringify(project, null, 2), 'application/json');
}

export async function importProject(file: File): Promise<ContinuumProject> {
  const value = JSON.parse(await file.text()) as Partial<ContinuumProject>;
  if (value.format !== 'continuum' || value.formatVersion !== 1 || !Array.isArray(value.entities)) {
    throw new Error('This is not a supported Continuum project file.');
  }
  return value as ContinuumProject;
}

const escapeHtml = (value: string) => value
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;');

const nameOf = (entities: StoryEntity[], id?: string) => entities.find((entity) => entity.id === id)?.name ?? '—';

export function exportStoryboardHtml(project: ContinuumProject): void {
  const scenes = project.entities.filter(isStoryScene).sort((a, b) => a.scene.order - b.scene.order);
  const sceneCards = scenes.map((scene) => {
    const people = scene.scene.participantIds.map((id) => nameOf(project.entities, id)).join(', ') || '—';
    return `
      <article class="scene">
        <header><span>${escapeHtml(scene.scene.chapter)}</span><strong>Scene ${scene.scene.order}</strong></header>
        <h2>${escapeHtml(scene.name)}</h2>
        <p class="summary">${escapeHtml(scene.summary || 'No summary yet.')}</p>
        <dl>
          <dt>POV</dt><dd>${escapeHtml(nameOf(project.entities, scene.scene.povCharacterId))}</dd>
          <dt>Location</dt><dd>${escapeHtml(nameOf(project.entities, scene.scene.locationId))}</dd>
          <dt>Participants</dt><dd>${escapeHtml(people)}</dd>
          <dt>Purpose</dt><dd>${escapeHtml(scene.scene.purpose || '—')}</dd>
          <dt>Conflict</dt><dd>${escapeHtml(scene.scene.conflict || '—')}</dd>
          <dt>Turning point</dt><dd>${escapeHtml(scene.scene.turningPoint || '—')}</dd>
          <dt>Outcome</dt><dd>${escapeHtml(scene.scene.outcome || '—')}</dd>
          <dt>Emotional movement</dt><dd>${escapeHtml(`${scene.scene.emotionalStart || '—'} → ${scene.scene.emotionalEnd || '—'}`)}</dd>
          <dt>Reveal</dt><dd>${escapeHtml(scene.scene.reveal || '—')}</dd>
          <dt>Keep concealed</dt><dd>${escapeHtml(scene.scene.conceal || '—')}</dd>
        </dl>
        ${scene.scene.ghostwriterNotes ? `<aside><b>Ghostwriter notes</b><p>${escapeHtml(scene.scene.ghostwriterNotes)}</p></aside>` : ''}
      </article>`;
  }).join('');

  const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${escapeHtml(project.title)} — Storyboard</title><style>
    :root{font-family:Inter,ui-sans-serif,system-ui,sans-serif;color:#172126;background:#edf0ea}body{margin:0}main{max-width:1040px;margin:auto;padding:56px 24px 80px}.eyebrow{letter-spacing:.16em;text-transform:uppercase;font-size:12px;color:#60706f}h1{font-family:Georgia,serif;font-size:52px;margin:10px 0 12px}.intro{max-width:760px;font-size:18px;line-height:1.6;color:#4c5a5c}.scene{background:#fff;border:1px solid #d8ddd7;border-radius:20px;padding:26px;margin-top:22px;box-shadow:0 8px 24px #1b2b2710}.scene header{display:flex;justify-content:space-between;color:#657573;font-size:13px;text-transform:uppercase;letter-spacing:.08em}.scene h2{font-family:Georgia,serif;font-size:30px;margin:16px 0 8px}.summary{color:#53615f;font-size:16px}dl{display:grid;grid-template-columns:160px 1fr;gap:10px 20px;border-top:1px solid #e4e8e3;padding-top:20px}dt{font-weight:700;color:#5d6d69}dd{margin:0;line-height:1.5}aside{background:#f4efe4;border-radius:12px;padding:16px 18px;margin-top:20px}aside p{margin:6px 0 0;line-height:1.5}@media(max-width:640px){h1{font-size:38px}dl{grid-template-columns:1fr;gap:3px}dd{margin-bottom:10px}}
  </style></head><body><main><div class="eyebrow">Continuum storyboard</div><h1>${escapeHtml(project.title)}</h1><p class="intro"><b>${escapeHtml(project.logline)}</b><br>${escapeHtml(project.premise)}</p>${sceneCards || '<p>No scenes have been created.</p>'}</main></body></html>`;
  download(`${fileName(project.title)}-storyboard.html`, html, 'text/html');
}
