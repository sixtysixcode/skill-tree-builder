import { Position } from '@xyflow/react';
import { DEFAULT_NODE_STYLE, initialEdges, initialNodes } from '../constants/canvasConstants';
import { AppEdge, AppNode, SkillData, SkillEdgeRow, SkillNode, SkillNodeRow } from '../types/skillTypes';

// Type guard to ensure we only treat `skill` nodes as SkillNode.
export const isSkillNode = (node: AppNode): boolean => node.type === 'skill';

// Very small helper to reduce rerenders when comparing selection arrays.
export const shallowEqual = (a: string[], b: string[]) =>
  a.length === b.length && a.every((id, i) => id === b[i]);

// Shared ID generator (crypto if available, else random string).
export const generateId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2);
};

// Build a starter set of nodes/edges, mapping template IDs to fresh ones.
export const buildSeedGraph = () => {
  const idMap = new Map<string, string>();
  const seededNodes = initialNodes.map((node) => {
    const newId = generateId();
    idMap.set(node.id, newId);
    const data = node.data as SkillData;
    return {
      ...node,
      id: newId,
      data: {
        ...data,
        unlocked: Boolean(data.unlocked),
      },
    } as SkillNode;
  });

  const seededEdges = initialEdges.map((edge) => ({
    id: generateId(),
    source: idMap.get(edge.source) ?? edge.source,
    target: idMap.get(edge.target) ?? edge.target,
    animated: edge.animated,
  }));

  return { seededNodes, seededEdges };
};

// Map a row from Supabase into a SkillNode, with optional position fallback.
export const mapNodeRow = (row: SkillNodeRow, fallbackPosition?: { x: number; y: number }): SkillNode =>
  ({
    id: row.id,
    type: 'skill',
    position: row.position ?? fallbackPosition ?? { x: 0, y: 0 },
    data: {
      name: row.name,
      description: row.description ?? undefined,
      cost: row.cost ?? undefined,
      level: row.level ?? undefined,
      unlocked: row.unlocked,
    },
    sourcePosition: Position.Right,
    targetPosition: Position.Left,
    style: { ...DEFAULT_NODE_STYLE },
  }) as SkillNode;

// Map a raw DB edge row into an AppEdge ReactFlow understands.
export const mapEdgeRow = (row: SkillEdgeRow): AppEdge => ({
  id: row.id,
  source: row.source,
  target: row.target,
  animated: row.animated ?? true,
});
