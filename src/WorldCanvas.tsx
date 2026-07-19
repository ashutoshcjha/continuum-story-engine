import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Background,
  ConnectionLineType,
  Controls,
  Handle,
  MarkerType,
  Panel,
  Position,
  ReactFlow,
  useNodesState,
  type Connection,
  type Edge,
  type NodeProps,
  type NodeTypes,
  type ReactFlowInstance,
} from '@xyflow/react';
import {
  getChapters,
  isStoryScene,
  type ContinuumProject,
  type EntityType,
} from './model';
import {
  worldLenses,
  worldLensLabels,
  type WorldLens,
} from './scifi';
import {
  buildWorldProjection,
  isVirtualEdge,
  type WorldNodeData,
  type WorldScope,
} from './worldProjection';

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

const edgeColors: Record<string, string> = {
  custom: '#607a76',
  story: '#607a76',
  geography: '#9a7651',
  travel: '#567b91',
  power: '#a85c4a',
  knowledge: '#4d7e91',
  evidence: '#4d7e91',
  technology: '#6f6293',
  'scene-thread': '#765b86',
  'scene-fact': '#5682a0',
  'scene-rule': '#b88744',
  'character-fact': '#4f7e79',
  derived: '#8b9692',
};

const StoryNode = memo(function StoryNode({ data, selected }: NodeProps) {
  const values = data as WorldNodeData;
  const entityType = values.entityType;
  return (
    <div className={`story-node ${entityType ? `story-node--${entityType}` : ''} ${selected ? 'is-selected' : ''} importance-${values.importance ?? 'supporting'}`}>
      <Handle type="target" position={Position.Left} />
      {values.imageUrl && (
        <img className="node-image" src={values.imageUrl} alt="" loading="lazy" decoding="async" draggable={false} />
      )}
      <span className="node-type">{entityType ? entityLabels[entityType] : 'Story entity'}</span>
      <strong>{values.label}</strong>
      {values.badge && <span className="world-node-badge">{values.badge}</span>}
      {values.summary && <small>{values.summary}</small>}
      {(values.linkCount ?? 0) > 0 && (
        <span className="node-link-count">↗ {values.linkCount} link{values.linkCount === 1 ? '' : 's'}</span>
      )}
      <Handle type="source" position={Position.Right} />
    </div>
  );
});

const ChapterFrameNode = memo(function ChapterFrameNode({ data, selected }: NodeProps) {
  const values = data as WorldNodeData;
  return (
    <div className={`world-chapter-frame ${selected ? 'is-selected' : ''}`}>
      <Handle type="target" position={Position.Left} />
      <header>
        <span>Chapter container</span>
        <b>{values.label}</b>
        <small>{values.count ?? 0} scene{values.count === 1 ? '' : 's'}</small>
      </header>
      {values.summary && <p>{values.summary}</p>}
      <Handle type="source" position={Position.Right} />
    </div>
  );
});

const ClusterNode = memo(function ClusterNode({ data }: NodeProps) {
  const values = data as WorldNodeData;
  return (
    <div className={`world-cluster-node ${values.virtualKind === 'resource' ? 'is-resource' : ''}`}>
      <b>{values.label}</b>
      {values.summary && <small>{values.summary}</small>}
    </div>
  );
});

const nodeTypes: NodeTypes = {
  story: StoryNode,
  chapterFrame: ChapterFrameNode,
  cluster: ClusterNode,
};

interface WorldCanvasProps {
  project: ContinuumProject;
  selectedEntityId?: string;
  selectedRelationshipId?: string;
  selectedChapterId?: string;
  onSelectEntity: (id: string) => void;
  onSelectRelationship: (id: string) => void;
  onSelectChapter: (id: string) => void;
  onClearSelection: () => void;
  onMoveEntity: (id: string, position: { x: number; y: number }) => void;
  onCreateRelationship: (sourceId: string, targetId: string, label: string) => void;
  onDeleteRelationship: (relationshipId: string) => void;
  onRequestDeleteEntity: (entityId: string) => boolean;
}

type PointerEventLike = MouseEvent | TouchEvent;

function pointerCoordinates(event: PointerEventLike): { clientX: number; clientY: number } | undefined {
  if ('clientX' in event) return { clientX: event.clientX, clientY: event.clientY };
  const touch = event.touches[0] ?? event.changedTouches[0];
  return touch ? { clientX: touch.clientX, clientY: touch.clientY } : undefined;
}

function edgeDomain(edge: Edge): string {
  const data = edge.data as Record<string, unknown> | undefined;
  return String(data?.semanticDomain ?? data?.relationshipKind ?? 'custom');
}

export function WorldCanvas({
  project,
  selectedEntityId,
  selectedRelationshipId,
  selectedChapterId,
  onSelectEntity,
  onSelectRelationship,
  onSelectChapter,
  onClearSelection,
  onMoveEntity,
  onCreateRelationship,
  onDeleteRelationship,
  onRequestDeleteEntity,
}: WorldCanvasProps) {
  const [lens, setLens] = useState<WorldLens>(project.worldSettings?.defaultLens ?? 'story');
  const [scope, setScope] = useState<WorldScope>('book');
  const [showReference, setShowReference] = useState(project.worldSettings?.showReference ?? false);
  const [maxNodes, setMaxNodes] = useState(project.worldSettings?.maxVisibleNodes ?? 42);
  const [cutoffChapterId, setCutoffChapterId] = useState<string | undefined>(selectedChapterId);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(() => new Set());
  const [isMoving, setIsMoving] = useState(false);
  const [draggingNodeId, setDraggingNodeId] = useState<string>();
  const [isOverDeleteTarget, setIsOverDeleteTarget] = useState(false);
  const deleteTargetRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef<{ id: string; position: { x: number; y: number } } | undefined>(undefined);
  const flowInstanceRef = useRef<ReactFlowInstance | null>(null);
  const chapters = getChapters(project);
  const selectedIsScene = project.entities.some((entity) => entity.id === selectedEntityId && isStoryScene(entity));

  useEffect(() => {
    if (!cutoffChapterId && selectedChapterId) setCutoffChapterId(selectedChapterId);
  }, [cutoffChapterId, selectedChapterId]);

  const projection = useMemo(() => buildWorldProjection(project, {
    lens,
    scope,
    selectedChapterId,
    selectedEntityId,
    showReference,
    maxNodes,
    cutoffChapterId,
    expandedGroups,
  }), [project, lens, scope, selectedChapterId, selectedEntityId, showReference, maxNodes, cutoffChapterId, expandedGroups]);

  const [nodes, setNodes, onNodesChange] = useNodesState(projection.nodes);

  const edges = useMemo<Edge[]>(() => projection.edges.map((edge) => {
    const domain = edgeDomain(edge);
    const stroke = edgeColors[domain] ?? edgeColors.custom;
    const virtual = Boolean((edge.data as Record<string, unknown> | undefined)?.virtual) || isVirtualEdge(edge.id);
    return {
      ...edge,
      type: 'default',
      pathOptions: { curvature: virtual ? 0.22 : 0.35 },
      selected: !virtual && edge.id === selectedRelationshipId,
      deletable: !virtual,
      selectable: !virtual,
      interactionWidth: virtual ? 12 : 28,
      className: `relationship-edge relationship-edge--${domain} ${virtual ? 'is-derived' : ''}`,
      style: {
        ...edge.style,
        stroke,
        strokeWidth: !virtual && edge.id === selectedRelationshipId ? 2.8 : virtual ? 1.25 : 1.8,
        strokeDasharray: virtual ? '5 5' : edge.style?.strokeDasharray,
        opacity: virtual ? 0.72 : 1,
      },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: stroke,
        width: virtual ? 14 : 18,
        height: virtual ? 14 : 18,
      },
      labelBgPadding: [7, 4] as [number, number],
      labelBgBorderRadius: 6,
      labelBgStyle: { fill: '#f8f8f4', fillOpacity: 0.94 },
      labelStyle: { fill: stroke, fontSize: virtual ? 9 : 10, fontWeight: 650 },
    };
  }), [projection.edges, selectedRelationshipId]);

  useEffect(() => {
    setNodes(projection.nodes.map((node) => ({
      ...node,
      selected: node.data.entityId === selectedEntityId || node.id === selectedEntityId,
      deletable: false,
    })));
  }, [projection.nodes, selectedEntityId, setNodes]);

  useEffect(() => {
    requestAnimationFrame(() => flowInstanceRef.current?.fitView({ padding: 0.14, duration: 280 }));
  }, [lens, scope, selectedChapterId, cutoffChapterId, expandedGroups]);

  const handleConnect = useCallback((connection: Connection) => {
    if (!connection.source || !connection.target) return;
    if (connection.source.startsWith('cluster:') || connection.target.startsWith('cluster:') || connection.source.startsWith('resource:') || connection.target.startsWith('resource:')) return;
    const label = window.prompt('How are these story objects connected?', 'relates to') || 'relates to';
    onCreateRelationship(connection.source, connection.target, label);
  }, [onCreateRelationship]);

  const isPointInsideDeleteTarget = (event: PointerEventLike) => {
    const point = pointerCoordinates(event);
    const bounds = deleteTargetRef.current?.getBoundingClientRect();
    return Boolean(point && bounds
      && point.clientX >= bounds.left
      && point.clientX <= bounds.right
      && point.clientY >= bounds.top
      && point.clientY <= bounds.bottom);
  };

  const resetAndFit = () => {
    setNodes(projection.nodes);
    requestAnimationFrame(() => flowInstanceRef.current?.fitView({ padding: 0.14, duration: 420 }));
  };

  const chooseLens = (nextLens: WorldLens) => {
    setLens(nextLens);
    setExpandedGroups(new Set());
    if (nextLens === 'story') setScope('book');
    else if (selectedChapterId) setScope('chapter');
    else setScope('book');
  };

  const selectNode = (node: { id: string; data: WorldNodeData }) => {
    if (node.data.virtualKind === 'cluster' && node.data.groupId) {
      setExpandedGroups((current) => {
        const next = new Set(current);
        if (next.has(node.data.groupId!)) next.delete(node.data.groupId!);
        else next.add(node.data.groupId!);
        return next;
      });
      return;
    }
    const entityId = node.data.entityId ?? node.id;
    const entity = project.entities.find((candidate) => candidate.id === entityId);
    if (!entity) return;
    if (entity.type === 'chapter') onSelectChapter(entity.id);
    else onSelectEntity(entity.id);
  };

  return (
    <div className="world-lens-shell">
      <div className="world-lens-header">
        <div>
          <span>Focused world projection</span>
          <h2>{projection.title}</h2>
          <p>{projection.subtitle}</p>
        </div>
        <div className="world-lens-stats">
          <b>{projection.visibleEntityIds.size}</b><span>entities shown</span>
          <b>{projection.hiddenCount}</b><span>collapsed or hidden</span>
        </div>
      </div>
      <ReactFlow
        className={`world-flow world-flow--${lens} ${isMoving ? 'is-moving' : ''} ${draggingNodeId ? 'is-dragging-node' : ''}`}
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onInit={(instance) => { flowInstanceRef.current = instance; }}
        onNodesChange={onNodesChange}
        onNodeClick={(_, node) => selectNode(node as { id: string; data: WorldNodeData })}
        onEdgeClick={(event, edge) => {
          event.stopPropagation();
          if (!isVirtualEdge(edge.id)) onSelectRelationship(edge.id);
        }}
        onPaneClick={onClearSelection}
        onNodeDragStart={(_, node) => {
          const entityId = (node.data as WorldNodeData).entityId;
          if (!entityId) return;
          setIsMoving(true);
          setDraggingNodeId(entityId);
          dragStartRef.current = { id: entityId, position: { ...node.position } };
        }}
        onNodeDrag={(event, node) => {
          if (!(node.data as WorldNodeData).entityId) return;
          setIsOverDeleteTarget(isPointInsideDeleteTarget(event));
        }}
        onNodeDragStop={(event, node) => {
          const entityId = (node.data as WorldNodeData).entityId;
          if (!entityId) return;
          const droppedOnDelete = isPointInsideDeleteTarget(event);
          if (droppedOnDelete) {
            const deleted = onRequestDeleteEntity(entityId);
            if (!deleted && dragStartRef.current?.id === entityId) {
              const originalPosition = dragStartRef.current.position;
              setNodes((current) => current.map((item) => (
                item.id === node.id ? { ...item, position: originalPosition } : item
              )));
            }
          } else if (!node.parentId) {
            onMoveEntity(entityId, node.position);
          }
          setIsMoving(false);
          setDraggingNodeId(undefined);
          setIsOverDeleteTarget(false);
          dragStartRef.current = undefined;
        }}
        onMoveStart={() => setIsMoving(true)}
        onMoveEnd={() => { if (!draggingNodeId) setIsMoving(false); }}
        onConnect={handleConnect}
        onEdgesDelete={(deletedEdges) => deletedEdges.filter((edge) => !isVirtualEdge(edge.id)).forEach((edge) => onDeleteRelationship(edge.id))}
        fitView
        fitViewOptions={{ padding: 0.16, duration: 0 }}
        minZoom={0.12}
        maxZoom={2}
        nodeDragThreshold={1}
        onlyRenderVisibleElements
        elevateNodesOnSelect={false}
        zoomOnDoubleClick={false}
        edgesReconnectable={false}
        deleteKeyCode={['Backspace', 'Delete']}
        connectionLineType={ConnectionLineType.Bezier}
      >
        <Background gap={22} size={1} />
        <Controls showInteractive={false} />
        <Panel position="top-left" className="world-lens-panel">
          <nav aria-label="World lenses">
            {worldLenses.map((item) => (
              <button key={item} className={lens === item ? 'active' : ''} onClick={() => chooseLens(item)}>{worldLensLabels[item]}</button>
            ))}
          </nav>
          <div className="world-scope-controls">
            <label>
              <span>Scope</span>
              <select value={scope} onChange={(event) => setScope(event.target.value as WorldScope)}>
                <option value="book">Book overview</option>
                <option value="chapter">Current chapter</option>
                <option value="scene" disabled={!selectedIsScene}>Selected scene</option>
                <option value="selection" disabled={!selectedEntityId}>Selected entity</option>
              </select>
            </label>
            <label>
              <span>Chapter</span>
              <select value={selectedChapterId ?? ''} onChange={(event) => onSelectChapter(event.target.value)}>
                {chapters.map((chapter) => <option key={chapter.id} value={chapter.id}>{chapter.name}</option>)}
              </select>
            </label>
            {lens === 'knowledge' && (
              <label>
                <span>Knowledge cutoff</span>
                <select value={cutoffChapterId ?? ''} onChange={(event) => setCutoffChapterId(event.target.value || undefined)}>
                  <option value="">End of story</option>
                  {chapters.map((chapter) => <option key={chapter.id} value={chapter.id}>{chapter.name}</option>)}
                </select>
              </label>
            )}
            <label className="world-reference-toggle">
              <input type="checkbox" checked={showReference} onChange={(event) => setShowReference(event.target.checked)} />
              <span>Include reference-only data</span>
            </label>
            <label>
              <span>Node budget</span>
              <select value={maxNodes} onChange={(event) => setMaxNodes(Number(event.target.value))}>
                <option value={28}>28 · focused</option>
                <option value={42}>42 · balanced</option>
                <option value={64}>64 · expanded</option>
              </select>
            </label>
          </div>
          {projection.warnings.map((warning) => <p className="world-lens-warning" key={warning}>{warning}</p>)}
        </Panel>
        <Panel position="top-right" className="world-layout-panel">
          <button type="button" onClick={resetAndFit}>Recenter lens</button>
        </Panel>
        <Panel position="bottom-center" className="world-delete-panel">
          <div
            ref={deleteTargetRef}
            className={`world-delete-target ${draggingNodeId ? 'is-visible' : ''} ${isOverDeleteTarget ? 'is-over' : ''}`}
          >
            <b>⌫</b>
            <span>{isOverDeleteTarget ? 'Release to delete' : 'Drag entity here to delete'}</span>
          </div>
        </Panel>
      </ReactFlow>
    </div>
  );
}
