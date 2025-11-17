// app/components/SkillNode.tsx
'use client';

import { motion } from 'framer-motion';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { SkillNode } from './skillTypes';

export function SkillNodeComponent({ data, id }: NodeProps<SkillNode>) {
  const { name, description, cost, level, unlocked, onReset } = data;

  return (
    <motion.div
      initial={{ scale: 1, opacity: 0 }}
      animate={{
        opacity: 1,
        boxShadow: unlocked
          ? ['0 0 0px rgba(0,255,90,0)', '0 0 12px rgba(0,255,90,0.6)', '0 0 0px rgba(0,255,90,0)']
          : '0 0 0 rgba(0,0,0,0)',
      }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className={`
        relative max-w-[240px] rounded-lg border px-3 py-2 shadow-sm
        text-black
        ${unlocked ? 'bg-white border-green-400' : 'bg-zinc-200 border-zinc-400 opacity-70'}
      `}
    >
      {/* Uncomplete button (only when unlocked) */}
      {unlocked && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onReset?.();
          }}
          className="
            absolute top-1 right-1 text-[8px] px-0.5 py-0
            bg-red-600 text-white rounded-[2px] shadow
          "
        >
          Reset
        </button>
      )}

      <div className="text-sm font-medium leading-tight">{name}</div>
      {description && (
        <div className="mt-0.5 text-[11px] leading-snug text-zinc-600">{description}</div>
      )}

      {(cost ?? level) !== undefined && (
        <div className="mt-1 flex flex-wrap items-center gap-1">
          {typeof cost === 'number' && (
            <span className="rounded border border-amber-200 bg-amber-100 px-1.5 py-0.5 text-[10px]">
              Cost: {cost}
            </span>
          )}
          {typeof level === 'number' && (
            <span className="rounded border border-blue-200 bg-blue-100 px-1.5 py-0.5 text-[10px]">
              Lv {level}
            </span>
          )}
        </div>
      )}

      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />
    </motion.div>
  );
}

// export nodeTypes map
export const nodeTypes = {
  skill: SkillNodeComponent,
};
