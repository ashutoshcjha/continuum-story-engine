import {
  getScenesForChapter,
  type ContinuumProject,
  type StoryEntity,
  type StoryRelationship,
} from './model';

export const plotThreadStatuses = ['planned', 'active', 'dormant', 'resolved'] as const;
export type PlotThreadStatus = (typeof plotThreadStatuses)[number];

export const factTruthStatuses = ['true', 'false', 'uncertain', 'disputed'] as const;
export type FactTruthStatus = (typeof factTruthStatuses)[number];

export const factSensitivities = ['normal', 'secret', 'author-only'] as const;
export type FactSensitivity = (typeof factSensitivities)[number];

export const worldRuleCategories = [
  'physical',
  'technological',
  'magical',
  'legal',
  'cultural',
  'religious',
  'institutional',
  'social',
] as const;
export type WorldRuleCategory = (typeof worldRuleCategories)[number];

export const worldRuleRigidities = ['hard', 'soft'] as const;
export type WorldRuleRigidity = (typeof worldRuleRigidities)[number];

export interface PlotThreadDetails {
  centralQuestion: string;
  stakes: string;
  status: PlotThreadStatus;
  plannedPayoff: string;
}

export interface FactDetails {
  proposition: string;
  truthStatus: FactTruthStatus;
  sensitivity: FactSensitivity;
  validFromSceneId?: string;
  validUntilSceneId?: string;
}

export interface WorldRuleDetails {
  statement: string;
  category: WorldRuleCategory;
  rigidity: WorldRuleRigidity;
  consequence: string;
  exceptionNotes: string;
}

export const relationshipKinds = [
  'custom',
  'scene-thread',
  'scene-fact',
  'scene-rule',
  'character-fact',
] as const;
export type RelationshipKind = (typeof relationshipKinds)[number];
export type EffectRelationshipKind = Exclude<RelationshipKind, 'custom'>;

export const plotThreadActions = ['introduce', 'advance', 'complicate', 'pause', 'payoff', 'resolve'] as const;
export type PlotThreadAction = (typeof plotThreadActions)[number];

export const sceneFactActions = ['establish', 'reveal-reader', 'conceal-reader', 'contradict', 'invalidate'] as const;
export type SceneFactAction = (typeof sceneFactActions)[number];

export const sceneRuleActions = ['demonstrate', 'test', 'violate', 'establish-exception', 'enforce'] as const;
export type SceneRuleAction = (typeof sceneRuleActions)[number];

export const knowledgeActions = ['know', 'learn', 'suspect', 'believe', 'doubt', 'deny', 'forget'] as const;
export type KnowledgeAction = (typeof knowledgeActions)[number];

export type RelationshipAction = PlotThreadAction | SceneFactAction | SceneRuleAction | KnowledgeAction;
export type EffectImportance = 'minor' | 'major';
export type KnowledgeConfidence = 'low' | 'medium' | 'high' | 'certain';

export interface SceneEffectInput {
  kind: EffectRelationshipKind;
  action: RelationshipAction;
  targetId: string;
  characterId?: string;
  note?: string;
  importance?: EffectImportance;
  confidence?: KnowledgeConfidence;
  consequenceOccurs?: boolean;
}

declare module './model' {
  interface StoryEntity {
    plotThread?: PlotThreadDetails;
    fact?: FactDetails;
    worldRule?: WorldRuleDetails;
  }

  interface StoryRelationship {
    kind?: RelationshipKind;
    action?: RelationshipAction;
    note?: string;
    sceneId?: string;
    importance?: EffectImportance;
    confidence?: KnowledgeConfidence;
    consequenceOccurs?: boolean;
  }
}

export const effectKindLabels: Record<EffectRelationshipKind, string> = {
  'scene-thread': 'Plot movement',
  'scene-fact': 'Fact movement',
  'scene-rule': 'World-rule interaction',
  'character-fact': 'Knowledge change',
};

const actionLabels: Record<RelationshipAction, string> = {
  introduce: 'introduces',
  advance: 'advances',
  complicate: 'complicates',
  pause: 'pauses',
  payoff: 'pays off',
  resolve: 'resolves',
  establish: 'establishes',
  'reveal-reader': 'reveals to reader',
  'conceal-reader': 'keeps concealed from reader',
  contradict: 'contradicts',
  invalidate: 'invalidates',
  demonstrate: 'demonstrates',
  test: 'tests',
  violate: 'violates',
  'establish-exception': 'establishes exception to',
  enforce: 'enforces',
  know: 'knows',
  learn: 'learns',
  suspect: 'suspects',
  believe: 'believes',
  doubt: 'doubts',
  deny: 'denies',
  forget: 'forgets',
};

export const effectActionOptions: Record<EffectRelationshipKind, Array<{ value: RelationshipAction; label: string }>> = {
  'scene-thread': plotThreadActions.map((value) => ({ value, label: actionLabels[value] })),
  'scene-fact': sceneFactActions.map((value) => ({ value, label: actionLabels[value] })),
  'scene-rule': sceneRuleActions.map((value) => ({ value, label: actionLabels[value] })),
  'character-fact': knowledgeActions.map((value) => ({ value, label: actionLabels[value] })),
};

export function relationshipKind(relationship: StoryRelationship): RelationshipKind {
  return relationship.kind ?? 'custom';
}

export function effectActionLabel(action?: RelationshipAction): string {
  return action ? actionLabels[action] : 'relates to';
}

export function isEffectRelationship(relationship: StoryRelationship): boolean {
  return relationshipKind(relationship) !== 'custom';
}

export function isSceneEffectRelationship(relationship: StoryRelationship): boolean {
  const kind = relationshipKind(relationship);
  return kind === 'scene-thread' || kind === 'scene-fact' || kind === 'scene-rule' || kind === 'character-fact';
}

export function defaultPlotThreadDetails(summary = ''): PlotThreadDetails {
  return {
    centralQuestion: summary,
    stakes: '',
    status: 'planned',
    plannedPayoff: '',
  };
}

export function defaultFactDetails(summary = ''): FactDetails {
  return {
    proposition: summary,
    truthStatus: 'true',
    sensitivity: 'normal',
  };
}

export function defaultWorldRuleDetails(summary = ''): WorldRuleDetails {
  return {
    statement: summary,
    category: 'physical',
    rigidity: 'hard',
    consequence: '',
    exceptionNotes: '',
  };
}

function enumValue<T extends readonly string[]>(value: unknown, allowed: T, fallback: T[number]): T[number] {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value) ? value as T[number] : fallback;
}

export function initializeStoryLogicEntity(entity: StoryEntity): StoryEntity {
  if (entity.type === 'plot-thread') {
    return {
      ...entity,
      plotThread: {
        ...defaultPlotThreadDetails(entity.summary),
        ...(entity.plotThread ?? {}),
        status: enumValue(entity.plotThread?.status, plotThreadStatuses, 'planned'),
      },
    };
  }

  if (entity.type === 'fact') {
    return {
      ...entity,
      fact: {
        ...defaultFactDetails(entity.summary),
        ...(entity.fact ?? {}),
        truthStatus: enumValue(entity.fact?.truthStatus, factTruthStatuses, 'true'),
        sensitivity: enumValue(entity.fact?.sensitivity, factSensitivities, 'normal'),
      },
    };
  }

  if (entity.type === 'world-rule') {
    return {
      ...entity,
      worldRule: {
        ...defaultWorldRuleDetails(entity.summary),
        ...(entity.worldRule ?? {}),
        category: enumValue(entity.worldRule?.category, worldRuleCategories, 'physical'),
        rigidity: enumValue(entity.worldRule?.rigidity, worldRuleRigidities, 'hard'),
      },
    };
  }

  return entity;
}

const threadActionAliases: Record<string, PlotThreadAction> = {
  introduce: 'introduce', introduces: 'introduce', introduced: 'introduce',
  advance: 'advance', advances: 'advance', advanced: 'advance',
  complicate: 'complicate', complicates: 'complicate', complicated: 'complicate',
  pause: 'pause', pauses: 'pause', paused: 'pause', dormant: 'pause',
  payoff: 'payoff', 'pays-off': 'payoff', 'pays-off-in': 'payoff',
  resolve: 'resolve', resolves: 'resolve', resolved: 'resolve',
};

const factActionAliases: Record<string, SceneFactAction> = {
  establish: 'establish', establishes: 'establish', established: 'establish',
  reveal: 'reveal-reader', reveals: 'reveal-reader', 'reveals-to-reader': 'reveal-reader',
  conceal: 'conceal-reader', conceals: 'conceal-reader', 'keeps-concealed': 'conceal-reader',
  contradict: 'contradict', contradicts: 'contradict', contradicted: 'contradict',
  invalidate: 'invalidate', invalidates: 'invalidate', disproves: 'invalidate',
};

const ruleActionAliases: Record<string, SceneRuleAction> = {
  demonstrate: 'demonstrate', demonstrates: 'demonstrate', demonstrated: 'demonstrate',
  test: 'test', tests: 'test', tested: 'test',
  violate: 'violate', violates: 'violate', violated: 'violate', breaks: 'violate',
  exception: 'establish-exception', 'establishes-exception': 'establish-exception',
  enforce: 'enforce', enforces: 'enforce', enforced: 'enforce',
};

const knowledgeActionAliases: Record<string, KnowledgeAction> = {
  know: 'know', knows: 'know', knew: 'know',
  learn: 'learn', learns: 'learn', learned: 'learn',
  suspect: 'suspect', suspects: 'suspect', suspected: 'suspect',
  believe: 'believe', believes: 'believe', believed: 'believe',
  doubt: 'doubt', doubts: 'doubt', doubted: 'doubt',
  deny: 'deny', denies: 'deny', denied: 'deny',
  forget: 'forget', forgets: 'forget', forgot: 'forget',
};

function verbKey(label: string): string {
  return label.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function inferLegacyRelationship(
  relationship: StoryRelationship,
  entityById: Map<string, StoryEntity>,
): { kind: RelationshipKind; action?: RelationshipAction; sceneId?: string } {
  const source = entityById.get(relationship.sourceId);
  const target = entityById.get(relationship.targetId);
  const key = verbKey(relationship.label);

  if (source?.type === 'scene' && target?.type === 'plot-thread' && threadActionAliases[key]) {
    return { kind: 'scene-thread', action: threadActionAliases[key], sceneId: source.id };
  }
  if (source?.type === 'scene' && target?.type === 'fact' && factActionAliases[key]) {
    return { kind: 'scene-fact', action: factActionAliases[key], sceneId: source.id };
  }
  if (source?.type === 'scene' && target?.type === 'world-rule' && ruleActionAliases[key]) {
    return { kind: 'scene-rule', action: ruleActionAliases[key], sceneId: source.id };
  }
  if (source?.type === 'character' && target?.type === 'fact' && knowledgeActionAliases[key]) {
    return { kind: 'character-fact', action: knowledgeActionAliases[key], sceneId: relationship.sceneId };
  }
  return { kind: 'custom' };
}

export function normalizeStoryLogic(project: ContinuumProject): ContinuumProject {
  const entities = project.entities.map(initializeStoryLogicEntity);
  const entityById = new Map(entities.map((entity) => [entity.id, entity]));
  const relationships = (project.relationships ?? []).map((relationship) => {
    const inferred = relationship.kind
      ? { kind: relationship.kind, action: relationship.action, sceneId: relationship.sceneId }
      : inferLegacyRelationship(relationship, entityById);
    const kind = inferred.kind ?? 'custom';
    const action = relationship.action ?? inferred.action;
    return {
      ...relationship,
      kind,
      action,
      sceneId: relationship.sceneId ?? inferred.sceneId,
      note: relationship.note ?? '',
      label: relationship.label?.trim() || effectActionLabel(action),
    };
  });
  return { ...project, entities, relationships };
}

export function createSceneEffectRelationship(sceneId: string, input: SceneEffectInput): StoryRelationship {
  const sourceId = input.kind === 'character-fact' ? input.characterId ?? '' : sceneId;
  return {
    id: `rel_${crypto.randomUUID()}`,
    sourceId,
    targetId: input.targetId,
    label: effectActionLabel(input.action),
    kind: input.kind,
    action: input.action,
    sceneId,
    note: input.note?.trim() ?? '',
    importance: input.importance,
    confidence: input.confidence,
    consequenceOccurs: input.consequenceOccurs,
  };
}

export function effectRelationshipKey(relationship: StoryRelationship): string {
  return [
    relationshipKind(relationship),
    relationship.sceneId ?? '',
    relationship.sourceId,
    relationship.targetId,
    relationship.action ?? '',
  ].join('|');
}

export function getSceneEffects(project: ContinuumProject, sceneId: string): StoryRelationship[] {
  return project.relationships.filter((relationship) => {
    const kind = relationshipKind(relationship);
    if (kind === 'scene-thread' || kind === 'scene-fact' || kind === 'scene-rule') {
      return relationship.sourceId === sceneId || relationship.sceneId === sceneId;
    }
    return kind === 'character-fact' && relationship.sceneId === sceneId;
  });
}

export function getChapterEffects(project: ContinuumProject, chapterId: string): StoryRelationship[] {
  const sceneIds = new Set(getScenesForChapter(project, chapterId).map((scene) => scene.id));
  return project.relationships.filter((relationship) => {
    const kind = relationshipKind(relationship);
    if (kind === 'scene-thread' || kind === 'scene-fact' || kind === 'scene-rule') {
      return sceneIds.has(relationship.sceneId ?? relationship.sourceId);
    }
    return kind === 'character-fact' && Boolean(relationship.sceneId && sceneIds.has(relationship.sceneId));
  });
}

export function getEffectTarget(project: ContinuumProject, relationship: StoryRelationship): StoryEntity | undefined {
  return project.entities.find((entity) => entity.id === relationship.targetId);
}

export function getEffectCharacter(project: ContinuumProject, relationship: StoryRelationship): StoryEntity | undefined {
  return relationshipKind(relationship) === 'character-fact'
    ? project.entities.find((entity) => entity.id === relationship.sourceId)
    : undefined;
}

export function describeEffect(project: ContinuumProject, relationship: StoryRelationship): string {
  const target = getEffectTarget(project, relationship);
  const action = effectActionLabel(relationship.action);
  const note = relationship.note?.trim();
  if (relationshipKind(relationship) === 'character-fact') {
    const character = getEffectCharacter(project, relationship);
    return `${character?.name ?? 'Character'} ${action} ${target?.name ?? 'missing fact'}${note ? ` — ${note}` : ''}`;
  }
  return `${action} ${target?.name ?? 'missing entity'}${note ? ` — ${note}` : ''}`;
}

export function updateEffectAction(
  relationship: StoryRelationship,
  action: RelationshipAction,
): StoryRelationship {
  return {
    ...relationship,
    action,
    label: effectActionLabel(action),
  };
}
