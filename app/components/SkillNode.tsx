// app/components/SkillNode.tsx
'use client';

import { Handle, Position, type NodeProps, type NodeTypes } from '@xyflow/react';
import type { SkillNode } from './SkillTypes';

export function SkillNodeComponent({ data }: NodeProps<SkillNode>) {
  const { name, description, cost, level, unlocked } = data;

  const base =
    'relative max-w-[240px] rounded-lg border px-3 py-2 shadow-sm transition-colors';
  const unlockedClasses = 'border-emerald-500 bg-emerald-50 text-black';
  const lockedClasses = 'border-zinc-500 bg-zinc-800 text-zinc-200';

  return (
    <div className={`${base} ${unlocked ? unlockedClasses : lockedClasses}`}>
      <div className="text-sm font-medium leading-tight">{name}</div>
      {description && (
        <div className="mt-0.5 text-[11px] leading-snug text-zinc-400">
          {description}
        </div>
      )}
      {(cost ?? level) !== undefined && (
        <div className="mt-1 flex flex-wrap items-center gap-1">
          {typeof cost === 'number' && (
            <span className="rounded border border-amber-200 bg-amber-100 px-1.5 py-0.5 text-[10px] text-amber-900">
              Cost: {cost}
            </span>
          )}
          {typeof level === 'number' && (
            <span className="rounded border border-blue-200 bg-blue-100 px-1.5 py-0.5 text-[10px] text-blue-900">
              Lv {level}
            </span>
          )}
        </div>
      )}

      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />
    </div>
  );
}

export const nodeTypes: NodeTypes = {
  skill: SkillNodeComponent,
};
