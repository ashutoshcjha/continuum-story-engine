import type { Edge, Node } from '@xyflow/react';
import type { ContinuumProject, EntityType } from './model';
import { presentationOf } from './scifi';
import {
  buildWorldProjection as buildBaseProjection,
  type WorldNodeData,
  type WorldProjection,
  type WorldProjectionOptions,
} from './worldProjection';

function appendExpandedBookGroups(
  project: ContinuumProject,
  options: WorldProjectionOptions,
  projection: WorldProjection,
): WorldProjection {
  if (options.lens !== 'story' || options.scope !== 'book') return projection;
  const expandedTypes = [...options.expandedGroups]
    .filter((groupId) => groupId.startsWith('book:'))
    .map((groupId) => groupId.slice('book:'.length) as EntityType);
  if (!expandedTypes.length) return projection;

  const nodes: Node<WorldNodeData>[] = [...projection.nodes];
  const edges: Edge[] = [...projection.edges];
  const visibleIds = new Set(projection.visibleEntityIds);
  let added = 0;

  for (const type of expandedTypes) {
    const candidates = project.entities
      .filter((entity) => entity.type === type && !visibleIds.has(entity.id))
      .filter((entity) => presentationOf(entity).visibility !== 'hidden')
      .sort((first, second) => {
        const importance = { core: 0, supporting: 1, reference: 2 } as const;
        return importance[presentationOf(first).importance] - importance[presentationOf(second).importance]
          || first.name.localeCompare(second.name);
      })
      .slice(0, 12);

    candidates.forEach((entity) => {
      const index = added++;
      nodes.push({
        id: entity.id,
        type: 'story',
        position: {
          x: 1880 + (index % 3) * 250,
          y: 760 + Math.floor(index / 3) * 150,
        },
        data: {
          label: entity.name,
          entityType: entity.type,
          summary: entity.summary,
          imageUrl: entity.images?.[0]?.thumbnailUrl ?? entity.images?.[0]?.dataUrl,
          linkCount: entity.links?.length ?? 0,
          importance: presentationOf(entity).importance,
          entityId: entity.id,
        },
        deletable: false,
      });
      visibleIds.add(entity.id);
    });
  }

  const candidateEdges = project.relationships
    .filter((relationship) => visibleIds.has(relationship.sourceId) && visibleIds.has(relationship.targetId))
    .filter((relationship) => !edges.some((edge) => edge.id === relationship.id))
    .slice(0, 30)
    .map<Edge>((relationship) => ({
      id: relationship.id,
      source: relationship.sourceId,
      target: relationship.targetId,
      label: relationship.label,
      type: 'default',
      data: {
        relationshipKind: relationship.kind ?? 'custom',
        semanticDomain: relationship.semanticDomain,
        virtual: false,
      },
    }));
  edges.push(...candidateEdges);

  return {
    ...projection,
    nodes,
    edges,
    visibleEntityIds: visibleIds,
    hiddenCount: Math.max(0, projection.hiddenCount - added),
    subtitle: added
      ? `${projection.subtitle} ${added} item${added === 1 ? '' : 's'} from expanded book groups are now visible.`
      : projection.subtitle,
  };
}

function appendPowerResources(project: ContinuumProject, projection: WorldProjection): WorldProjection {
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

export function buildWorldProjection(project: ContinuumProject, options: WorldProjectionOptions): WorldProjection {
  if (options.lens === 'power') {
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
    return appendPowerResources(project, buildBaseProjection(sanitized, options));
  }

  const effectiveOptions: WorldProjectionOptions = options.lens === 'geography' || options.lens === 'technology'
    ? { ...options, showReference: true }
    : options;
  return appendExpandedBookGroups(project, effectiveOptions, buildBaseProjection(project, effectiveOptions));
}
