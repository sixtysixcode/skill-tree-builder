'use client';

import { motion } from 'framer-motion';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { SkillNode } from './skillTypes';

export function SkillNodeComponent({ data, id }: NodeProps<SkillNode>) {
  const {
    name,
    description,
    cost,
    level,
    unlocked,
    onReset,
    searchMatch,
    searchPath,
    searchDimmed,
  } = data;

  const baseBackgroundClass = unlocked ? 'bg-white' : 'bg-zinc-200';
  const defaultBorderClass = unlocked ? 'border-3 border-green-400' : 'border-3 border-zinc-400';

  const lockedOpacityClass =
    !unlocked && !(searchMatch || searchPath) ? 'opacity-70' : '';

  const searchDimClass = searchDimmed ? 'opacity-40 saturate-50' : '';

  const searchBorderClass = searchMatch
    ? 'border-[3px] border-amber-400'
    : searchPath
      ? 'border-[2px] border-amber-200'
      : defaultBorderClass;

  return (
    <motion.div
      initial={{ scale: 1, opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className={`
        relative max-w-[240px] rounded-lg px-3 py-2
        text-black transition
        ${baseBackgroundClass} ${lockedOpacityClass}
        ${searchDimClass} ${searchBorderClass}
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
            absolute top-1 right-1 text-[8px] p-1
            bg-red-600 text-white rounded-[2px] shadow leading-none
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
