import {
  getChapters,
  getScenesForChapter,
  isStoryChapter,
  isStoryScene,
  type ContinuumProject,
  type StoryEntity,
  type StoryRelationship,
  type StoryScene,
} from './model';
import {
  describeEffect,
  getSceneEffects,
  isEffectRelationship,
  normalizeStoryLogic,
} from './storyLogic';
import {
  chapterContinuityWarnings,
  conceptLoadForChapter,
  normalizeScifiProject,
} from './scifi';

const standardProjectKeys = new Set([
  'format',
  'formatVersion',
  'id',
  'title',
  'logline',
  'premise',
  'createdAt',
  'updatedAt',
  'entities',
  'relationships',
  'worldSettings',
]);

function normalize(project: ContinuumProject): ContinuumProject {
  return normalizeScifiProject(normalizeStoryLogic(project));
}

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function fileSlug(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'continuum';
}

function download(name: string, content: string, type: string): void {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

function hasValue(value: unknown): boolean {
  if (value === undefined || value === null || value === '') return false;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'object') return Object.values(value as Record<string, unknown>).some(hasValue);
  return true;
}

function printableValue(value: unknown, names: Map<string, string>): string {
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (Array.isArray(value)) {
    return value.map((item) => typeof item === 'string' ? names.get(item) ?? item : printableValue(item, names)).join(', ');
  }
  if (value && typeof value === 'object') return JSON.stringify(value, null, 2);
  if (typeof value === 'string') return names.get(value) ?? value;
  return String(value ?? '');
}

function renderTextBlock(title: string, value: string | undefined, className = ''): string {
  if (!value?.trim()) return '';
  return `<section class="text-block ${className}"><h4>${escapeHtml(title)}</h4><div class="prewrap">${escapeHtml(value.trim())}</div></section>`;
}

function renderField(label: string, value: unknown, names: Map<string, string>): string {
  if (!hasValue(value)) return '';
  return `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(printableValue(value, names))}</dd></div>`;
}

function renderObjectDetails(title: string, value: unknown, names: Map<string, string>): string {
  if (!value || typeof value !== 'object') return '';
  const rows = Object.entries(value as Record<string, unknown>)
    .filter(([, fieldValue]) => hasValue(fieldValue))
    .map(([key, fieldValue]) => renderField(key.replace(/([A-Z])/g, ' $1').replace(/^./, (character) => character.toUpperCase()), fieldValue, names))
    .join('');
  if (!rows) return '';
  return `<section class="detail-card"><h4>${escapeHtml(title)}</h4><dl>${rows}</dl></section>`;
}

function entityImages(entity: StoryEntity): string {
  if (!entity.images?.length) return '';
  return `<div class="entity-images">${entity.images.map((image) => `<figure><img src="${escapeHtml(image.dataUrl)}" alt="${escapeHtml(image.name)}"><figcaption>${escapeHtml(image.name)}</figcaption></figure>`).join('')}</div>`;
}

function entityLinks(entity: StoryEntity): string {
  if (!entity.links?.length) return '';
  return `<div class="entity-links"><b>References</b>${entity.links.map((link) => `<a href="${escapeHtml(link.url)}" target="_blank" rel="noreferrer">${escapeHtml(link.label)}</a>`).join('')}</div>`;
}

function relationshipSentence(relationship: StoryRelationship, names: Map<string, string>): string {
  const source = names.get(relationship.sourceId) ?? relationship.sourceId;
  const target = names.get(relationship.targetId) ?? relationship.targetId;
  const suffix = relationship.note?.trim() ? ` — ${relationship.note.trim()}` : '';
  return `${source} → ${relationship.label || relationship.semanticAction || relationship.action || 'relates to'} → ${target}${suffix}`;
}

function renderScene(
  project: ContinuumProject,
  scene: StoryScene,
  chapterName: string,
  names: Map<string, string>,
): string {
  const effects = getSceneEffects(project, scene.id);
  const customRelationships = project.relationships.filter((relationship) => (
    !isEffectRelationship(relationship)
      && (relationship.sourceId === scene.id || relationship.targetId === scene.id || relationship.sceneId === scene.id)
  ));
  const warnings = chapterContinuityWarnings(project, scene.scene.chapterId ?? '')
    .filter((warning) => warning.sceneId === scene.id);
  const environment = scene.scene.environment;
  const travel = scene.scene.travel;
  const participants = scene.scene.participantIds.map((id) => names.get(id) ?? id);
  const draft = scene.scene.draft?.trim();

  return `
    <article class="scene" id="${escapeHtml(scene.id)}">
      ${entityImages(scene)}
      <header><span>${escapeHtml(chapterName)}</span><b>Scene ${scene.scene.order}</b></header>
      <h3>${escapeHtml(scene.name)}</h3>
      <p class="summary">${escapeHtml(scene.summary || 'No scene summary.')}</p>
      <dl class="scene-grid">
        ${renderField('POV', names.get(scene.scene.povCharacterId ?? '') ?? scene.scene.povCharacterId, names)}
        ${renderField('Location', names.get(scene.scene.locationId ?? '') ?? scene.scene.locationId, names)}
        ${renderField('Participants', participants, names)}
        ${renderField('Purpose', scene.scene.purpose, names)}
        ${renderField('Conflict', scene.scene.conflict, names)}
        ${renderField('Turning point', scene.scene.turningPoint, names)}
        ${renderField('Outcome', scene.scene.outcome, names)}
        ${renderField('Emotional start', scene.scene.emotionalStart, names)}
        ${renderField('Emotional end', scene.scene.emotionalEnd, names)}
        ${renderField('Reveal', scene.scene.reveal, names)}
        ${renderField('Keep concealed', scene.scene.conceal, names)}
        ${renderField('Ghostwriter direction', scene.scene.ghostwriterNotes, names)}
      </dl>
      ${draft ? renderTextBlock('Scene manuscript / draft', draft, 'manuscript') : ''}
      ${renderObjectDetails('Environment', environment, names)}
      ${renderObjectDetails('Travel into this scene', travel, names)}
      ${effects.length ? `<section class="relationship-block"><h4>Structured story effects</h4><ul>${effects.map((relationship) => `<li>${escapeHtml(describeEffect(project, relationship))}</li>`).join('')}</ul></section>` : ''}
      ${customRelationships.length ? `<section class="relationship-block"><h4>Other scene relationships</h4><ul>${customRelationships.map((relationship) => `<li>${escapeHtml(relationshipSentence(relationship, names))}</li>`).join('')}</ul></section>` : ''}
      ${warnings.length ? `<section class="warning-block"><h4>Continuity checks</h4><ul>${warnings.map((warning) => `<li><b>${escapeHtml(warning.severity)}</b> ${escapeHtml(warning.message)}</li>`).join('')}</ul></section>` : ''}
      ${renderTextBlock('Full scene notes / source material', scene.notes, 'source-notes')}
      ${entityLinks(scene)}
    </article>`;
}

function renderChapter(project: ContinuumProject, chapter: StoryEntity, names: Map<string, string>): string {
  if (!isStoryChapter(chapter)) return '';
  const scenes = getScenesForChapter(project, chapter.id);
  const load = conceptLoadForChapter(project, chapter.id);
  const warnings = chapterContinuityWarnings(project, chapter.id);
  const draft = chapter.chapter.draft?.trim();

  return `
    <section class="chapter" id="${escapeHtml(chapter.id)}">
      <header class="chapter-header">
        <div><span>Chapter ${chapter.chapter.order}</span><h2>${escapeHtml(chapter.name)}</h2><p>${escapeHtml(chapter.summary || 'No chapter summary.')}</p></div>
        <a href="#top">Back to contents</a>
      </header>
      ${entityImages(chapter)}
      <section class="chapter-contract">
        <div><b>Opening state</b><p>${escapeHtml(chapter.chapter.openingState || 'Not defined')}</p></div>
        <div><b>Objective</b><p>${escapeHtml(chapter.chapter.objective || 'Not defined')}</p></div>
        <div><b>Required closing state</b><p>${escapeHtml(chapter.chapter.closingState || 'Not defined')}</p></div>
        <div><b>Concept load</b><p>${escapeHtml(`${load.severity} · score ${load.score}`)}</p></div>
      </section>
      ${renderTextBlock('Chapter direction', chapter.chapter.ghostwriterNotes)}
      ${draft ? renderTextBlock('Chapter manuscript / complete draft', draft, 'manuscript') : ''}
      ${renderTextBlock('Full chapter notes / source brief', chapter.notes, 'source-notes')}
      ${warnings.length ? `<section class="warning-block"><h4>Chapter continuity checks</h4><ul>${warnings.map((warning) => `<li><b>${escapeHtml(warning.severity)}</b> ${escapeHtml(names.get(warning.sceneId) ?? warning.sceneId)} — ${escapeHtml(warning.message)}</li>`).join('')}</ul></section>` : ''}
      ${entityLinks(chapter)}
      <div class="scene-list">${scenes.map((scene) => renderScene(project, scene, chapter.name, names)).join('') || '<p class="empty">No scenes are assigned to this chapter.</p>'}</div>
    </section>`;
}

function renderWorldEntity(entity: StoryEntity, names: Map<string, string>): string {
  const specialDetails = [
    ['Plot thread', entity.plotThread],
    ['Fact / claim', entity.fact],
    ['World rule', entity.worldRule],
    ['Technology / system', entity.technology],
    ['Organization profile', entity.organizationProfile],
    ['Identity profile', entity.identityProfile],
    ['Location profile', entity.locationProfile],
    ['Presentation', entity.presentation],
  ] as Array<[string, unknown]>;

  return `
    <article class="world-entity" id="${escapeHtml(entity.id)}">
      ${entityImages(entity)}
      <span>${escapeHtml(entity.type)}</span>
      <h3>${escapeHtml(entity.name)}</h3>
      <p>${escapeHtml(entity.summary || 'No summary.')}</p>
      ${entity.tags?.length ? `<div class="tags">${entity.tags.map((tag) => `<i>${escapeHtml(tag)}</i>`).join('')}</div>` : ''}
      ${specialDetails.map(([label, value]) => renderObjectDetails(label, value, names)).join('')}
      ${renderTextBlock('Complete notes', entity.notes, 'source-notes')}
      ${entityLinks(entity)}
    </article>`;
}

function renderProjectMetadata(project: ContinuumProject): string {
  const extra = Object.entries(project as unknown as Record<string, unknown>)
    .filter(([key, value]) => !standardProjectKeys.has(key) && hasValue(value));
  if (!extra.length) return '';
  return `<section class="project-metadata"><h2>Project metadata and provenance</h2>${extra.map(([key, value]) => `<article><h4>${escapeHtml(key)}</h4><div class="prewrap">${escapeHtml(typeof value === 'string' ? value : JSON.stringify(value, null, 2))}</div></article>`).join('')}</section>`;
}

export function exportHumanProject(input: ContinuumProject): void {
  const project = normalize(input);
  const chapters = getChapters(project);
  const names = new Map(project.entities.map((entity) => [entity.id, entity.name]));
  const worldEntities = project.entities.filter((entity) => !isStoryChapter(entity) && !isStoryScene(entity));
  const groups = worldEntities.reduce<Record<string, StoryEntity[]>>((result, entity) => {
    (result[entity.type] ??= []).push(entity);
    return result;
  }, {});
  const tableOfContents = chapters.map((chapter) => `<a href="#${escapeHtml(chapter.id)}"><span>Chapter ${chapter.chapter.order}</span><b>${escapeHtml(chapter.name)}</b><small>${getScenesForChapter(project, chapter.id).length} scenes</small></a>`).join('');
  const worldContents = Object.entries(groups).map(([type, entities]) => `<a href="#world-${escapeHtml(type)}"><span>World library</span><b>${escapeHtml(type.replace('-', ' '))}</b><small>${entities.length} items</small></a>`).join('');
  const allRelationships = project.relationships.map((relationship) => `<li>${escapeHtml(relationshipSentence(relationship, names))}<small>${escapeHtml([relationship.kind, relationship.semanticDomain, relationship.action ?? relationship.semanticAction].filter(Boolean).join(' · '))}</small></li>`).join('');

  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(project.title)} — Complete Continuum Export</title>
<style>
:root{font-family:Inter,ui-sans-serif,system-ui,sans-serif;color:#182326;background:#edf0ea}*{box-sizing:border-box}body{margin:0}main{max-width:1180px;margin:auto;padding:58px 26px 110px}h1,h2,h3,h4{font-family:Georgia,serif}.eyebrow,.chapter-header span,.world-entity>span{font-size:10px;text-transform:uppercase;letter-spacing:.15em;color:#78847f}h1{font-size:56px;margin:8px 0 12px}.intro{font-size:17px;line-height:1.65;color:#53615f;max-width:900px}.contents{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:10px;margin:32px 0 76px}.contents a{display:grid;gap:4px;text-decoration:none;color:#23302e;background:#fff;border:1px solid #d6dcd5;border-radius:12px;padding:14px}.contents small{font-size:11px;color:#7a8783}.chapter{margin-top:82px;scroll-margin-top:24px}.chapter-header{display:flex;justify-content:space-between;gap:24px;border-bottom:1px solid #d5dbd4;padding-bottom:20px}.chapter-header h2{font-size:40px;margin:5px 0}.chapter-header p{max-width:840px;color:#596865;line-height:1.55}.chapter-header a{font-size:12px;color:#2f6670;text-decoration:none;white-space:nowrap}.chapter-contract{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin:20px 0}.chapter-contract>div,.detail-card{background:#f8f9f5;border:1px solid #dce1db;border-radius:12px;padding:14px}.chapter-contract b,.detail-card h4,.text-block h4,.relationship-block h4,.warning-block h4{font-size:10px;text-transform:uppercase;letter-spacing:.09em;color:#788681}.chapter-contract p{font-size:13px;line-height:1.5}.scene{background:#fff;border:1px solid #d7ddd6;border-radius:20px;padding:27px;margin-top:24px;box-shadow:0 8px 24px #20302b0e;overflow:hidden}.scene>header{display:flex;justify-content:space-between;font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:#697875}.scene h3,.world-entity h3{font-size:30px;margin:12px 0 7px}.summary,.world-entity p{color:#596765;line-height:1.55}.scene-grid,.detail-card dl{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:18px 0}.scene-grid>div,.detail-card dl>div{background:#f5f7f3;border-radius:10px;padding:12px}.scene-grid dt,.detail-card dt{font-size:9px;text-transform:uppercase;letter-spacing:.08em;color:#83908c;font-weight:700}.scene-grid dd,.detail-card dd{margin:5px 0 0;white-space:pre-wrap;font-size:12px;line-height:1.5}.text-block,.relationship-block,.warning-block{border-top:1px solid #e0e5df;margin-top:20px;padding-top:16px}.prewrap{white-space:pre-wrap;font-size:12px;line-height:1.58;color:#3f4d49}.manuscript{background:#fffdf6;border:1px solid #e5d9bb;border-radius:13px;padding:16px;margin-top:20px}.manuscript h4{color:#8d6b36}.source-notes{background:#f4f6f2;border:1px solid #dce3dc;border-radius:13px;padding:16px}.relationship-block ul,.warning-block ul,.all-relationships ul{padding-left:20px}.relationship-block li,.warning-block li,.all-relationships li{margin:7px 0;line-height:1.5;font-size:12px}.warning-block{color:#7c4e2f}.entity-images{display:flex;gap:10px;overflow:auto;margin:14px 0}.entity-images figure{margin:0;min-width:180px}.entity-images img{display:block;width:100%;height:130px;object-fit:cover;border-radius:10px}.entity-images figcaption{font-size:10px;color:#6d7a76;margin-top:4px}.entity-links{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:15px}.entity-links a{font-size:11px;color:#2f6670;text-decoration:none;border:1px solid #cfd9d5;border-radius:999px;padding:6px 9px}.world-library,.project-metadata,.all-relationships{margin-top:90px}.world-group{margin-top:48px}.world-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:14px}.world-entity{background:#fff;border:1px solid #d7ddd6;border-radius:16px;padding:18px;overflow:hidden}.world-entity h3{font-size:24px}.tags{display:flex;gap:5px;flex-wrap:wrap}.tags i{font-style:normal;font-size:10px;background:#edf1ec;border-radius:999px;padding:5px 8px}.world-entity .detail-card{margin-top:10px}.world-entity .detail-card dl{grid-template-columns:1fr}.all-relationships li{background:#fff;border:1px solid #dce1db;border-radius:9px;padding:10px;list-style:none}.all-relationships small{display:block;color:#7d8985;margin-top:4px}.project-metadata article{background:#fff;border:1px solid #dce1db;border-radius:12px;padding:16px;margin-top:10px}.empty{color:#78847f}@media print{body{background:#fff}main{max-width:none;padding:20px}.contents,.chapter-header a{display:none}.scene,.world-entity{break-inside:avoid;box-shadow:none}.chapter{break-before:page}}@media(max-width:760px){h1{font-size:40px}.chapter-header{display:block}.chapter-contract,.scene-grid{grid-template-columns:1fr}}
</style></head>
<body><main id="top"><span class="eyebrow">Complete Continuum human export</span><h1>${escapeHtml(project.title)}</h1><p class="intro"><b>${escapeHtml(project.logline)}</b><br>${escapeHtml(project.premise)}</p><p class="intro">Generated ${escapeHtml(new Date().toLocaleString())}. This export includes manuscript fields, complete chapter and scene source notes, structured briefs, world entities, story logic, continuity information, references, and relationships.</p><nav class="contents">${tableOfContents}${worldContents}<a href="#relationships"><span>Complete project</span><b>Relationships</b><small>${project.relationships.length} records</small></a></nav>${chapters.map((chapter) => renderChapter(project, chapter, names)).join('')}${renderProjectMetadata(project)}<section class="world-library"><span class="eyebrow">Complete story bible</span><h1>World library</h1>${Object.entries(groups).map(([type, entities]) => `<section class="world-group" id="world-${escapeHtml(type)}"><h2>${escapeHtml(type.replace('-', ' '))}</h2><div class="world-grid">${entities.sort((first, second) => first.name.localeCompare(second.name)).map((entity) => renderWorldEntity(entity, names)).join('')}</div></section>`).join('')}</section><section class="all-relationships" id="relationships"><span class="eyebrow">Complete graph data</span><h1>Relationships</h1><ul>${allRelationships || '<li>No relationships recorded.</li>'}</ul></section></main></body></html>`;

  download(`${fileSlug(project.title)}-complete-human-export.html`, html, 'text/html;charset=utf-8');
}
