import type {
    Node,
    BuiltInNode,
    BuiltInEdge,
    Connection,
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

  export type EdgeConnection = Connection & Partial<Pick<AppEdge, 'id' | 'animated'>>;

export type FlowProps = {
  treeId: string;
};

export type SkillNodeRow = {
  id: string;
  tree_id: string;
  name: string;
  description: string | null;
  cost: number | null;
  level: number | null;
  unlocked: boolean;
  position: { x: number; y: number } | null;
};

export type SkillEdgeRow = {
  id: string;
  tree_id: string;
  source: string;
  target: string;
  animated: boolean | null;
};

export type RemoteCursor = {
  id: string;
  flowX?: number;
  flowY?: number;
  color: string;
  label: string;
  lastUpdated: number;
  action?: string;
};
  
  /** Custom node type for skills */
  export type SkillNode = Node<SkillData, 'skill'>;
  
  export type AppNode = BuiltInNode | SkillNode;
  export type AppEdge = BuiltInEdge;
  
