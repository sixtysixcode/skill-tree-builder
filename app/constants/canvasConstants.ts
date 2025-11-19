import { Position } from '@xyflow/react';
import { AppEdge, AppNode, SkillData, SkillNode } from '../types/skillTypes';

// Defaults shared across ReactFlow components.
export const DEFAULT_EDGE_OPTIONS = { animated: true } as const;
export const DELETE_KEYS = ['Delete', 'Backspace'] as const;
export const DEFAULT_NODE_STYLE = { width: 260, minHeight: 120 } as const;
export const CYCLE_ERROR_MESSAGE = 'Circular skill connections are not allowed.';

// Simple starter edges (used when seeding a new tree).
export const initialEdges: AppEdge[] = [{ id: 'e1-2', source: '1', target: '2', animated: true }];

// Palette for remote cursor indicators.
export const CURSOR_COLORS = ['#f97316', '#22d3ee', '#a855f7', '#facc15', '#34d399', '#fb7185', '#60a5fa'];

// Initial node set to give new trees a bit of structure.
export const initialNodes: AppNode[] = [
  {
    id: '1',
    type: 'skill',
    position: { x: 40, y: 40 },
    data: {
      name: 'HTML',
      description: 'HyperText Markup Language',
      cost: 1,
      level: 1,
      unlocked: true,
    } as SkillData,
    sourcePosition: Position.Right,
    targetPosition: Position.Left,
    style: { ...DEFAULT_NODE_STYLE },
  } as SkillNode,
  {
    id: '2',
    type: 'skill',
    position: { x: 280, y: 120 },
    data: {
      name: 'CSS',
      description: 'Cascading Style Sheets',
      unlocked: false,
    } as SkillData,
    sourcePosition: Position.Right,
    targetPosition: Position.Left,
    style: { ...DEFAULT_NODE_STYLE },
  } as SkillNode,
];
