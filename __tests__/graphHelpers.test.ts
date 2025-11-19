import { describe, expect, it } from 'vitest';

import { computeSearchInfo, graphWouldCreateCycle } from '../app/utils/graphHelpers';
import type { AppEdge, AppNode, SkillNode } from '../app/types/skillTypes';

const buildSkillNode = (id: string, overrides?: Partial<SkillNode>): SkillNode =>
  ({
    id,
    type: 'skill',
    position: { x: 0, y: 0 },
    data: {
      name: `Skill ${id}`,
      description: '',
      unlocked: false,
      ...overrides?.data,
    },
    ...overrides,
  }) as SkillNode;

describe('graphWouldCreateCycle', () => {
  const edges: AppEdge[] = [
    { id: '1', source: 'a', target: 'b', animated: true },
    { id: '2', source: 'b', target: 'c', animated: true },
  ];

  it('detects when connecting last node back to start', () => {
    expect(graphWouldCreateCycle(edges, 'c', 'a')).toBe(true);
  });

  it('allows edges that do not create loops', () => {
    expect(graphWouldCreateCycle(edges, 'c', 'd')).toBe(false);
  });
});

describe('computeSearchInfo', () => {
  const nodes: AppNode[] = [
    buildSkillNode('a', { data: { name: 'Root Skill', description: 'Basics', unlocked: true, onReset: () => {} } }),
    buildSkillNode('b', { data: { name: 'Advanced Topic', description: 'More depth', unlocked: false, onReset: () => {} } }),
    buildSkillNode('c', { data: { name: 'Irrelevant', description: 'Other path', unlocked: false, onReset: () => {} } }),
  ];
  const edges: AppEdge[] = [
    { id: 'edge-ab', source: 'a', target: 'b', animated: true },
    { id: 'edge-bc', source: 'b', target: 'c', animated: true },
  ];

  it('returns empty sets for blank query', () => {
    const info = computeSearchInfo(nodes, edges, '   ');
    expect(info.query).toBe('');
    expect(info.matchedNodeIds.size).toBe(0);
  });

  it('marks matched nodes and their prerequisite path', () => {
    const info = computeSearchInfo(nodes, edges, 'advanced');
    expect(info.matchedNodeIds.has('b')).toBe(true);
    expect(info.pathNodeIds.has('a')).toBe(true);
    expect(info.pathEdgeIds.has('edge-ab')).toBe(true);
    expect(info.pathNodeIds.has('c')).toBe(false);
  });
});
