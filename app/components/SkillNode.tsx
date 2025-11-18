'use client';

import { motion } from 'framer-motion';
import { Handle, NodeResizeControl, Position, type NodeProps } from '@xyflow/react';
import type { SkillNode } from '../types/skillTypes';

export function SkillNodeComponent({ data }: NodeProps<SkillNode>) {
  const {
    name,
    description,
    cost,
    level,
    unlocked,
    onReset,
    onEdit,
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
        relative rounded-lg px-3 py-2
        text-black transition
        ${baseBackgroundClass} ${lockedOpacityClass}
        ${searchDimClass} ${searchBorderClass}
      `}
      style={{ minHeight: 60 }}
    >
      <NodeResizeControl
        position="bottom-right"
        minWidth={150}
        minHeight={60}
        className="skill-node-resize-control"
      />
        <div className="absolute top-1 right-1 flex gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit?.();
            }}
            className="rounded-[2px] bg-white/80 px-1.5 py-1 text-[8px] text-zinc-800 shadow leading-none"
          >
            Edit
          </button>
          {unlocked && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onReset?.();
            }}
            className="
              text-[8px] px-1.5 py-1
              bg-red-600 text-white rounded-[2px] shadow leading-none
            "
          >
            Reset
          </button>
      )}
        </div>

      <div className="max-w-[300px] pr-14 text-sm font-medium leading-tight break-words">
        {name}
      </div>
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

export const nodeTypes = {
  skill: SkillNodeComponent,
};
