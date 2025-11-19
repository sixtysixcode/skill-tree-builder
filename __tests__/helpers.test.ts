import { describe, expect, it, vi } from 'vitest';

import { buildSeedGraph, isSkillNode, mapNodeRow, shallowEqual } from '../app/utils/helpers';
import type { AppNode, SkillNode, SkillNodeRow } from '../app/types/skillTypes';
import { initialNodes } from '../app/constants/canvasConstants';

const buildSkillNode = (overrides?: Partial<SkillNode>): SkillNode =>
  ({
    id: 'skill-1',
    type: 'skill',
    position: { x: 0, y: 0 },
    data: {
      name: 'Test Skill',
      unlocked: false,
      onReset: vi.fn(),
      ...overrides?.data,
    },
    ...overrides,
  }) as SkillNode;

const buildGenericNode = (): AppNode =>
  ({
    id: 'generic-1',
    type: 'input',
    position: { x: 0, y: 0 },
    data: { label: 'Start' },
  }) as AppNode;

describe('isSkillNode', () => {
  it('returns true for nodes marked as skill', () => {
    const node = buildSkillNode();
    expect(isSkillNode(node)).toBe(true);
  });

  it('returns false for other node types', () => {
    const node = buildGenericNode();
    expect(isSkillNode(node)).toBe(false);
  });
});

describe('shallowEqual', () => {
  it('compares arrays by index', () => {
    expect(shallowEqual(['a', 'b'], ['a', 'b'])).toBe(true);
  });

  it('returns false for different lengths', () => {
    expect(shallowEqual(['a'], ['a', 'b'])).toBe(false);
  });

  it('returns false when at least one index differs', () => {
    expect(shallowEqual(['a', 'b'], ['b', 'a'])).toBe(false);
  });
});

describe('buildSeedGraph', () => {
  it('creates a new node id for every seed node', () => {
    const { seededNodes } = buildSeedGraph();
    expect(seededNodes).toHaveLength(initialNodes.length);
    const originalIds = new Set(initialNodes.map((n) => n.id));
    seededNodes.forEach((node) => {
      expect(originalIds.has(node.id)).toBe(false);
    });
  });

  it('maps edges to the new ids', () => {
    const { seededNodes, seededEdges } = buildSeedGraph();
    const newIds = new Set(seededNodes.map((n) => n.id));
    seededEdges.forEach((edge) => {
      expect(newIds.has(edge.source)).toBe(true);
      expect(newIds.has(edge.target)).toBe(true);
    });
  });
});

describe('mapNodeRow', () => {
  it('falls back to provided position when row is missing coordinates', () => {
    const fallback = { x: 42, y: 7 };
    const row = {
      id: 'node-1',
      tree_id: 'tree',
      name: 'Fallback',
      description: null,
      cost: null,
      level: null,
      unlocked: false,
      position: null,
    } satisfies SkillNodeRow;

    const mapped = mapNodeRow(row, fallback);
    expect(mapped.position).toEqual(fallback);
  });
});
