// app/components/skillTypes.ts
import type {
    Node,
    Edge,
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
  };
  
  /** Custom node type for skills */
  export type SkillNode = Node<SkillData, 'skill'>;
  
  /** Unions for the whole app (so you can add more node/edge types later) */
  export type AppNode = BuiltInNode | SkillNode;
  export type AppEdge = BuiltInEdge;
  