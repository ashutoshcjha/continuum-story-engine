import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import {
  Background,
  Controls,
  Handle,
  Position,
  ReactFlow,
  useNodesState,
  type Connection,
  type NodeProps,
  type NodeTypes,
} from '@xyflow/react';
import type { ContinuumProject, EntityType } from './model';
import { projectToFlow } from './model';

const entityLabels: Record<EntityType, string> = {
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
  selectedId?: string;
  onSelect: (id: string) => void;
  onMoveEntity: (id: string, position: { x: number; y: number }) => void;
  onCreateRelationship: (sourceId: string, targetId: string, label: string) => void;
}

export function WorldCanvas({
  project,
  selectedId,
  onSelect,
  onMoveEntity,
  onCreateRelationship,
}: WorldCanvasProps) {
  const flow = useMemo(() => projectToFlow(project), [project]);
  const [nodes, setNodes, onNodesChange] = useNodesState(flow.nodes);
  const [isMoving, setIsMoving] = useState(false);

  useEffect(() => {
    setNodes(flow.nodes.map((node) => ({ ...node, selected: node.id === selectedId })));
  }, [flow.nodes, selectedId, setNodes]);

  const handleConnect = useCallback((connection: Connection) => {
    if (!connection.source || !connection.target) return;
    const label = window.prompt('How are these story objects connected?', 'relates to') || 'relates to';
    onCreateRelationship(connection.source, connection.target, label);
  }, [onCreateRelationship]);

  return (
    <ReactFlow
      className={`world-flow ${isMoving ? 'is-moving' : ''}`}
      nodes={nodes}
      edges={flow.edges}
      nodeTypes={nodeTypes}
      onNodesChange={onNodesChange}
      onNodeClick={(_, node) => onSelect(node.id)}
      onNodeDragStart={() => setIsMoving(true)}
      onNodeDragStop={(_, node) => {
        setIsMoving(false);
        onMoveEntity(node.id, node.position);
      }}
      onMoveStart={() => setIsMoving(true)}
      onMoveEnd={() => setIsMoving(false)}
      onConnect={handleConnect}
      fitView
      fitViewOptions={{ padding: 0.2, duration: 0 }}
      minZoom={0.2}
      maxZoom={2}
      nodeDragThreshold={1}
      onlyRenderVisibleElements
      elevateNodesOnSelect={false}
      zoomOnDoubleClick={false}
      deleteKeyCode={null}
    >
      <Background gap={22} size={1} />
      <Controls showInteractive={false} />
    </ReactFlow>
  );
}
