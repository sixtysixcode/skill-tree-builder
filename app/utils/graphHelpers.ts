'use client';

import type { AppEdge, AppNode } from '../types/skillTypes';
import type { SkillNode } from '../types/skillTypes';
import type { SkillData } from '../types/skillTypes';
import { isSkillNode } from './helpers';

export type SearchInfo = {
  query: string;
  matchedNodeIds: Set<string>;
  pathNodeIds: Set<string>;
  pathEdgeIds: Set<string>;
};

// Determine if adding an edge would introduce a cycle.
export const graphWouldCreateCycle = (edges: AppEdge[], sourceId?: string | null, targetId?: string | null) => {
  if (!sourceId || !targetId) return false;
  if (sourceId === targetId) return true;

  const adjacency = new Map<string, string[]>();
  edges.forEach(({ source, target }) => {
    if (!source || !target) return;
    const list = adjacency.get(source);
    if (list) {
      list.push(target);
    } else {
      adjacency.set(source, [target]);
    }
  });

  const stack = [targetId];
  const visited = new Set<string>();

  while (stack.length > 0) {
    const current = stack.pop();
    if (!current || visited.has(current)) continue;
    if (current === sourceId) return true;
    visited.add(current);
    const next = adjacency.get(current);
    if (next) stack.push(...next);
  }

  return false;
};

// Compute matched nodes + prerequisite paths for a search query.
export const computeSearchInfo = (nodes: AppNode[], edges: AppEdge[], rawQuery: string): SearchInfo => {
  const query = rawQuery.trim().toLowerCase();
  if (!query) {
    return {
      query,
      matchedNodeIds: new Set<string>(),
      pathNodeIds: new Set<string>(),
      pathEdgeIds: new Set<string>(),
    };
  }

  const matchedNodeIds = new Set<string>();
  nodes.forEach((node) => {
    if (!isSkillNode(node)) return;
    const data = node.data as SkillData;
    const haystack = `${data.name} ${data.description ?? ''}`.toLowerCase();
    if (haystack.includes(query)) matchedNodeIds.add(node.id);
  });

  const pathNodeIds = new Set<string>(matchedNodeIds);
  const pathEdgeIds = new Set<string>();

  if (matchedNodeIds.size > 0) {
    const incomingMap = new Map<string, AppEdge[]>();
    edges.forEach((edge) => {
      const list = incomingMap.get(edge.target);
      if (list) {
        list.push(edge);
      } else {
        incomingMap.set(edge.target, [edge]);
      }
    });

    const stack = Array.from(matchedNodeIds);
    while (stack.length > 0) {
      const current = stack.pop();
      if (!current) continue;
      const incoming = incomingMap.get(current);
      if (!incoming) continue;
      incoming.forEach((edge) => {
        pathEdgeIds.add(edge.id);
        if (!pathNodeIds.has(edge.source)) {
          pathNodeIds.add(edge.source);
          stack.push(edge.source);
        }
      });
    }
  }

  return {
    query,
    matchedNodeIds,
    pathNodeIds,
    pathEdgeIds,
  };
};
