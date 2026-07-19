import type { Edge, Node } from '@xyflow/react';
import type { ContinuumProject } from './model';
import {
  buildWorldProjection as buildBaseProjection,
  type WorldNodeData,
  type WorldProjection,
  type WorldProjectionOptions,
} from './worldProjection';

export function buildWorldProjection(project: ContinuumProject, options: WorldProjectionOptions): WorldProjection {
  if (options.lens !== 'power') return buildBaseProjection(project, options);

  const sanitized: ContinuumProject = {
    ...project,
    entities: project.entities.map((entity) => entity.organizationProfile
      ? {
        ...entity,
        organizationProfile: {
          ...entity.organizationProfile,
          controlledResources: [],
        },
      }
      : entity),
  };
  const projection = buildBaseProjection(sanitized, options);
  const nodes: Node<WorldNodeData>[] = [...projection.nodes];
  const edges: Edge[] = [...projection.edges];
  let resourceCount = 0;

  for (const organization of project.entities.filter((entity) => entity.type === 'organization')) {
    const organizationNode = nodes.find((node) => node.id === organization.id);
    if (!organizationNode) continue;
    const resources = organization.organizationProfile?.controlledResources ?? [];
    resources.slice(0, 5).forEach((resource, index) => {
      const id = `resource:${organization.id}:${index}`;
      nodes.push({
        id,
        type: 'cluster',
        position: {
          x: organizationNode.position.x + 225,
          y: organizationNode.position.y + 10 + index * 48,
        },
        draggable: false,
        selectable: false,
        deletable: false,
        data: {
          label: resource,
          virtualKind: 'resource',
          summary: 'Controlled resource',
        },
      });
      edges.push({
        id: `resource-edge:${organization.id}:${index}`,
        source: organization.id,
        target: id,
        label: 'controls',
        type: 'default',
        deletable: false,
        selectable: false,
        data: { virtual: true, semanticDomain: 'power' },
      });
      resourceCount += 1;
    });
  }

  return {
    ...projection,
    nodes,
    edges,
    subtitle: resourceCount
      ? `${projection.subtitle} ${resourceCount} controlled resource${resourceCount === 1 ? '' : 's'} are expanded from organization profiles.`
      : projection.subtitle,
  };
}
