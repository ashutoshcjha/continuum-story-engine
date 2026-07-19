import {
  atmosphereStates,
  communicationStates,
  gravityStates,
  radiationStates,
  sceneContinuityWarnings,
  sceneSettings,
  visibilityStates,
  type SceneEnvironment,
  type TravelSegment,
} from './scifi';
import type { ContinuumProject, StoryScene } from './model';

interface SceneContinuityEditorProps {
  project: ContinuumProject;
  scene: StoryScene;
  onUpdateScene: (changes: Partial<StoryScene['scene']>) => void;
  compact?: boolean;
}

const label = (value: string) => value.replaceAll('-', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());

export function SceneContinuitySummary({ project, scene }: { project: ContinuumProject; scene: StoryScene }) {
  const environment = scene.scene.environment;
  const travel = scene.scene.travel;
  const warnings = sceneContinuityWarnings(project, scene);
  const locationName = (id?: string) => project.entities.find((entity) => entity.id === id)?.name;
  const environmentBits = environment
    ? [environment.setting !== 'unknown' ? label(environment.setting) : '', environment.atmosphere !== 'unknown' ? label(environment.atmosphere) : '', environment.gravity !== 'unknown' ? `${label(environment.gravity)} gravity` : '', environment.radiation !== 'unknown' ? `${label(environment.radiation)} radiation` : ''].filter(Boolean)
    : [];
  const travelText = travel?.mode
    ? `${locationName(travel.originId) ?? 'Origin'} → ${locationName(travel.destinationId) ?? locationName(scene.scene.locationId) ?? 'Destination'} · ${travel.mode}${travel.durationMinutes ? ` · ${travel.durationMinutes} min` : ''}`
    : '';
  if (!environmentBits.length && !travelText && !warnings.length) return null;
  return (
    <section className="scene-continuity-summary">
      <b>Continuity</b>
      {environmentBits.length > 0 && <span>{environmentBits.join(' · ')}</span>}
      {travelText && <span>{travelText}</span>}
      {warnings.length > 0 && <strong>{warnings.length} warning{warnings.length === 1 ? '' : 's'}</strong>}
    </section>
  );
}

export function SceneContinuityEditor({
  project,
  scene,
  onUpdateScene,
  compact = false,
}: SceneContinuityEditorProps) {
  const environment: SceneEnvironment = scene.scene.environment ?? {
    setting: 'unknown',
    atmosphere: 'unknown',
    gravity: 'unknown',
    radiation: 'unknown',
    temperature: '',
    suitRequired: false,
    airlockRequired: false,
    communications: 'unknown',
    visibility: 'unknown',
    localTime: '',
    weather: '',
    notes: '',
  };
  const travel: TravelSegment = scene.scene.travel ?? {
    mode: '',
    route: '',
    authorization: '',
    environmentalExposure: '',
    complications: '',
  };
  const locations = project.entities.filter((entity) => entity.type === 'location').sort((a, b) => a.name.localeCompare(b.name));
  const warnings = sceneContinuityWarnings(project, scene);
  const patchEnvironment = (changes: Partial<SceneEnvironment>) => onUpdateScene({ environment: { ...environment, ...changes } });
  const patchTravel = (changes: Partial<TravelSegment>) => onUpdateScene({ travel: { ...travel, ...changes } });

  return (
    <details className={`scene-continuity-editor ${compact ? 'is-compact' : ''}`} onClick={(event) => event.stopPropagation()}>
      <summary>
        <span>Environment & travel</span>
        <b>{warnings.length ? `${warnings.length} warning${warnings.length === 1 ? '' : 's'}` : 'Continuity ready'}</b>
      </summary>
      {warnings.length > 0 && (
        <div className="continuity-warning-list">
          {warnings.map((warning) => <p key={`${warning.severity}-${warning.message}`} className={`is-${warning.severity}`}>{warning.message}</p>)}
        </div>
      )}
      <section>
        <header><span>Scene environment</span><small>Pressure, gravity, radiation, weather, and operational constraints</small></header>
        <div className="continuity-grid">
          <label><span>Setting</span><select value={environment.setting} onChange={(event) => patchEnvironment({ setting: event.target.value as SceneEnvironment['setting'] })}>{sceneSettings.map((value) => <option key={value} value={value}>{label(value)}</option>)}</select></label>
          <label><span>Atmosphere</span><select value={environment.atmosphere} onChange={(event) => patchEnvironment({ atmosphere: event.target.value as SceneEnvironment['atmosphere'] })}>{atmosphereStates.map((value) => <option key={value} value={value}>{label(value)}</option>)}</select></label>
          <label><span>Gravity</span><select value={environment.gravity} onChange={(event) => patchEnvironment({ gravity: event.target.value as SceneEnvironment['gravity'] })}>{gravityStates.map((value) => <option key={value} value={value}>{label(value)}</option>)}</select></label>
          <label><span>Radiation</span><select value={environment.radiation} onChange={(event) => patchEnvironment({ radiation: event.target.value as SceneEnvironment['radiation'] })}>{radiationStates.map((value) => <option key={value} value={value}>{label(value)}</option>)}</select></label>
          <label><span>Communications</span><select value={environment.communications} onChange={(event) => patchEnvironment({ communications: event.target.value as SceneEnvironment['communications'] })}>{communicationStates.map((value) => <option key={value} value={value}>{label(value)}</option>)}</select></label>
          <label><span>Visibility</span><select value={environment.visibility} onChange={(event) => patchEnvironment({ visibility: event.target.value as SceneEnvironment['visibility'] })}>{visibilityStates.map((value) => <option key={value} value={value}>{label(value)}</option>)}</select></label>
          <label><span>Temperature</span><input value={environment.temperature} placeholder="e.g. −63°C exterior" onChange={(event) => patchEnvironment({ temperature: event.target.value })} /></label>
          <label><span>Local time / Sol</span><input value={environment.localTime} placeholder="e.g. Sol 18 · 06:40" onChange={(event) => patchEnvironment({ localTime: event.target.value })} /></label>
          <label className="continuity-wide"><span>Weather / visibility event</span><input value={environment.weather} placeholder="Dust storm, dry-ice fog, clear dome cycle…" onChange={(event) => patchEnvironment({ weather: event.target.value })} /></label>
          <label className="continuity-check"><input type="checkbox" checked={environment.suitRequired} onChange={(event) => patchEnvironment({ suitRequired: event.target.checked })} /><span>EVA or protective suit required</span></label>
          <label className="continuity-check"><input type="checkbox" checked={environment.airlockRequired} onChange={(event) => patchEnvironment({ airlockRequired: event.target.checked })} /><span>Airlock or decontamination transition required</span></label>
          <label className="continuity-wide"><span>Environmental notes</span><textarea value={environment.notes} placeholder="Shielding, pressure transition, life-support limits, artificial sky, exposure precautions…" onChange={(event) => patchEnvironment({ notes: event.target.value })} /></label>
        </div>
      </section>
      <section>
        <header><span>Travel from previous scene</span><small>Track route, duration, permissions, and exposure between story beats</small></header>
        <div className="continuity-grid">
          <label><span>Origin</span><select value={travel.originId ?? ''} onChange={(event) => patchTravel({ originId: event.target.value || undefined })}><option value="">Not recorded</option>{locations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}</select></label>
          <label><span>Destination</span><select value={travel.destinationId ?? ''} onChange={(event) => patchTravel({ destinationId: event.target.value || undefined })}><option value="">Use scene location</option>{locations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}</select></label>
          <label><span>Travel mode</span><input value={travel.mode} placeholder="MagLev, rover, MTV, plasma craft…" onChange={(event) => patchTravel({ mode: event.target.value })} /></label>
          <label><span>Duration (minutes)</span><input type="number" min="0" value={travel.durationMinutes ?? ''} onChange={(event) => patchTravel({ durationMinutes: event.target.value ? Number(event.target.value) : undefined })} /></label>
          <label className="continuity-wide"><span>Route</span><input value={travel.route} placeholder="Line 9, Elysium trunk, orbital transfer…" onChange={(event) => patchTravel({ route: event.target.value })} /></label>
          <label className="continuity-wide"><span>Authorization / access</span><input value={travel.authorization} placeholder="CIA clearance, private invitation, unauthorised…" onChange={(event) => patchTravel({ authorization: event.target.value })} /></label>
          <label className="continuity-wide"><span>Environmental exposure</span><input value={travel.environmentalExposure} placeholder="Radiation, dust storm, low gravity, vacuum transfer…" onChange={(event) => patchTravel({ environmentalExposure: event.target.value })} /></label>
          <label className="continuity-wide"><span>Travel complications</span><textarea value={travel.complications} placeholder="Delay, surveillance avoidance, turbulence, route conflict, equipment failure…" onChange={(event) => patchTravel({ complications: event.target.value })} /></label>
        </div>
      </section>
    </details>
  );
}
