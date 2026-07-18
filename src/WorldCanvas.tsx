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
import type { ContinuumProject, EntityType } from './model';
import { projectToFlow } from './model';

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

const StoryNode = memo(function StoryNode({ data, selected }: NodeProps) {
  const values = data as {
    label: string;
    entityType: EntityType;
    summary: string;
    imageUrl?: string;
    linkCount: number;
  };

  return (
    <div className={`story-node story-node--${values.entityType} ${selected ? 'is-selected' : ''}`}>
      <Handle type="target" position={Position.Left} />
      {values.imageUrl && (
        <img className="node-image" src={values.imageUrl} alt="" loading="lazy" decoding="async" draggable={false} />
      )}
      <span className="node-type">{entityLabels[values.entityType]}</span>
      <strong>{values.label}</strong>
      {values.summary && <small>{values.summary}</small>}
      {values.linkCount > 0 && (
        <span className="node-link-count">↗ {values.linkCount} link{values.linkCount === 1 ? '' : 's'}</span>
      )}
      <Handle type="source" position={Position.Right} />
    </div>
  );
});

const nodeTypes: NodeTypes = { story: StoryNode };

interface WorldCanvasProps {
  project: ContinuumProject;
  selectedEntityId?: string;
  selectedRelationshipId?: string;
  onSelectEntity: (id: string) => void;
  onSelectRelationship: (id: string) => void;
  onClearSelection: () => void;
  onMoveEntity: (id: string, position: { x: number; y: number }) => void;
  onCreateRelationship: (sourceId: string, targetId: string, label: string) => void;
  onDeleteRelationship: (relationshipId: string) => void;
  onArrangeWorld: () => void;
  onRequestDeleteEntity: (entityId: string) => boolean;
}

type PointerEventLike = MouseEvent | TouchEvent;

function pointerCoordinates(event: PointerEventLike): { clientX: number; clientY: number } | undefined {
  if ('clientX' in event) return { clientX: event.clientX, clientY: event.clientY };
  const touch = event.touches[0] ?? event.changedTouches[0];
  return touch ? { clientX: touch.clientX, clientY: touch.clientY } : undefined;
}

export function WorldCanvas({
  project,
  selectedEntityId,
  selectedRelationshipId,
  onSelectEntity,
  onSelectRelationship,
  onClearSelection,
  onMoveEntity,
  onCreateRelationship,
  onDeleteRelationship,
  onArrangeWorld,
  onRequestDeleteEntity,
}: WorldCanvasProps) {
  const flow = useMemo(() => projectToFlow(project), [project]);
  const [nodes, setNodes, onNodesChange] = useNodesState(flow.nodes);
  const [isMoving, setIsMoving] = useState(false);
  const [draggingNodeId, setDraggingNodeId] = useState<string>();
  const [isOverDeleteTarget, setIsOverDeleteTarget] = useState(false);
  const deleteTargetRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef<{ id: string; position: { x: number; y: number } } | undefined>(undefined);
  const flowInstanceRef = useRef<ReactFlowInstance | null>(null);

  const edges = useMemo<Edge[]>(() => flow.edges.map((edge) => {
    const isMembership = edge.id.startsWith('chapter-membership_');
    const stroke = isMembership ? '#78918b' : '#607a76';
    return {
      ...edge,
      type: 'default',
      pathOptions: { curvature: 0.35 },
      selected: edge.id === selectedRelationshipId,
      deletable: true,
      interactionWidth: 28,
      className: isMembership ? 'chapter-membership-edge' : 'relationship-edge',
      style: {
        ...edge.style,
        stroke,
        strokeWidth: edge.id === selectedRelationshipId ? 2.8 : 1.8,
        strokeDasharray: isMembership ? '6 5' : undefined,
      },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: stroke,
        width: 18,
        height: 18,
      },
      labelBgPadding: [7, 4] as [number, number],
      labelBgBorderRadius: 6,
      labelBgStyle: { fill: '#f8f8f4', fillOpacity: 0.94 },
      labelStyle: { fill: '#53645f', fontSize: 10, fontWeight: 600 },
    };
  }), [flow.edges, selectedRelationshipId]);

  useEffect(() => {
    setNodes(flow.nodes.map((node) => ({
      ...node,
      selected: node.id === selectedEntityId,
      deletable: false,
    })));
  }, [flow.nodes, selectedEntityId, setNodes]);

  const handleConnect = useCallback((connection: Connection) => {
    if (!connection.source || !connection.target) return;
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

  const arrangeAndFit = () => {
    onArrangeWorld();
    requestAnimationFrame(() => requestAnimationFrame(() => {
      flowInstanceRef.current?.fitView({ padding: 0.16, duration: 450 });
    }));
  };

  return (
    <ReactFlow
      className={`world-flow ${isMoving ? 'is-moving' : ''} ${draggingNodeId ? 'is-dragging-node' : ''}`}
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      onInit={(instance) => { flowInstanceRef.current = instance; }}
      onNodesChange={onNodesChange}
      onNodeClick={(_, node) => onSelectEntity(node.id)}
      onEdgeClick={(event, edge) => {
        event.stopPropagation();
        onSelectRelationship(edge.id);
      }}
      onPaneClick={onClearSelection}
      onNodeDragStart={(_, node) => {
        setIsMoving(true);
        setDraggingNodeId(node.id);
        dragStartRef.current = { id: node.id, position: { ...node.position } };
      }}
      onNodeDrag={(event) => setIsOverDeleteTarget(isPointInsideDeleteTarget(event))}
      onNodeDragStop={(event, node) => {
        const droppedOnDelete = isPointInsideDeleteTarget(event);
        if (droppedOnDelete) {
          const deleted = onRequestDeleteEntity(node.id);
          if (!deleted && dragStartRef.current?.id === node.id) {
            const originalPosition = dragStartRef.current.position;
            setNodes((current) => current.map((item) => (
              item.id === node.id ? { ...item, position: originalPosition } : item
            )));
          }
        } else {
          onMoveEntity(node.id, node.position);
        }
        setIsMoving(false);
        setDraggingNodeId(undefined);
        setIsOverDeleteTarget(false);
        dragStartRef.current = undefined;
      }}
      onMoveStart={() => setIsMoving(true)}
      onMoveEnd={() => { if (!draggingNodeId) setIsMoving(false); }}
      onConnect={handleConnect}
      onEdgesDelete={(deletedEdges) => deletedEdges.forEach((edge) => onDeleteRelationship(edge.id))}
      fitView
      fitViewOptions={{ padding: 0.2, duration: 0 }}
      minZoom={0.2}
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
      <Panel position="top-right" className="world-layout-panel">
        <button type="button" onClick={arrangeAndFit}>Arrange world</button>
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
  );
}
