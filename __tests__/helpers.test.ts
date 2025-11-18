import { describe, expect, it, vi } from 'vitest';

import { isSkillNode, shallowEqual } from '../app/utils/helpers';
import type { AppNode, SkillNode } from '../app/types/skillTypes';

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
