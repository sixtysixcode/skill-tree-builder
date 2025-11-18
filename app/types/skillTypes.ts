import type {
    Node,
    BuiltInNode,
    BuiltInEdge,
  } from '@xyflow/react';
  
  /** Data stored on each skill node */
  export type SkillData = {
    name: string;
    description?: string;
    cost?: number;
    level?: number;
    /** true = unlocked, false = locked */
    unlocked: boolean;
    onReset: () => void;
    onEdit?: () => void;
    /** UI-only flags for search highlighting */
    searchMatch?: boolean;
    searchPath?: boolean;
    searchDimmed?: boolean;
  };
  
  /** Custom node type for skills */
  export type SkillNode = Node<SkillData, 'skill'>;
  
  export type AppNode = BuiltInNode | SkillNode;
  export type AppEdge = BuiltInEdge;
  
