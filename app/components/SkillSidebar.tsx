'use client';

import { motion } from 'framer-motion';

type SkillSidebarProps = {
  name: string;
  description: string;
  cost: string;
  level: string;
  searchQuery: string;
  placeMode: boolean;
  autoConnect: boolean;
  canSubmit: boolean;
  hasSelection: boolean;
  hasSelectedNodes: boolean;
  onNameChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onCostChange: (value: string) => void;
  onLevelChange: (value: string) => void;
  onSearchChange: (value: string) => void;
  onTogglePlaceMode: () => void;
  onAddAtCenter: () => void;
  onDeleteSelected: () => void;
  onDetachSelected: () => void;
  onToggleAutoConnect: (value: boolean) => void;
  closeSidebarForMobile: () => void; // included because it's passed from Flow
  onClose?: () => void;
};

export function SkillSidebar({
  name,
  description,
  cost,
  level,
  searchQuery,
  placeMode,
  autoConnect,
  canSubmit,
  hasSelection,
  hasSelectedNodes,
  onNameChange,
  onDescriptionChange,
  onCostChange,
  onLevelChange,
  onSearchChange,
  onTogglePlaceMode,
  onAddAtCenter,
  onDeleteSelected,
  onDetachSelected,
  onToggleAutoConnect,
  closeSidebarForMobile,
  onClose,
}: SkillSidebarProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="h-full w-full overflow-y-auto bg-zinc-900 text-white p-4 border-r border-zinc-800"
    >
      {/* Stagger container */}
      <motion.div
        initial="hidden"
        animate="show"
        variants={{
          hidden: {},
          show: {
            transition: { staggerChildren: 0.08 },
          },
        }}
        className="flex flex-col gap-4"
      >
        <div className="flex items-center justify-between">
          <h1 className="text-2xl">Skill Tree Builder</h1>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="md:hidden rounded bg-zinc-800 px-2 py-1 text-sm text-white shadow"
            >
              Close
            </button>
          )}
        </div>
        {/* Each input animated */}
        <motion.div variants={{ hidden: { opacity: 0 }, show: { opacity: 1 } }}>
          <label className="text-xs text-white">Name *</label>
          <input
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            placeholder="Skill name"
            className="h-8 w-full rounded border border-zinc-300 bg-white/10 px-2 text-sm placeholder-white"
          />
        </motion.div>

        <motion.div variants={{ hidden: { opacity: 0 }, show: { opacity: 1 } }}>
          <label className="text-xs text-white">Description</label>
          <input
            value={description}
            onChange={(e) => onDescriptionChange(e.target.value)}
            placeholder="Optional description"
            className="h-8 w-full rounded border border-zinc-300 bg-white/10 px-2 text-sm placeholder-white"
          />
        </motion.div>

        <motion.div variants={{ hidden: { opacity: 0 }, show: { opacity: 1 } }}>
          <label className="text-xs text-white">Cost</label>
          <input
            value={cost}
            onChange={(e) => onCostChange(e.target.value)}
            placeholder="e.g. 2"
            inputMode="numeric"
            className="h-8 w-full rounded border border-zinc-300 bg-white/10 px-2 text-sm placeholder-white"
          />
        </motion.div>

        <motion.div variants={{ hidden: { opacity: 0 }, show: { opacity: 1 } }}>
          <label className="text-xs text-white">Level</label>
          <input
            value={level}
            onChange={(e) => onLevelChange(e.target.value)}
            placeholder="e.g. 3"
            inputMode="numeric"
            className="h-8 w-full rounded border border-zinc-300 bg-white/10 px-2 text-sm placeholder-white"
          />
        </motion.div>

        <motion.div variants={{ hidden: { opacity: 0 }, show: { opacity: 1 } }}>
          <label className="text-xs text-white">Search</label>
          <input
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Find skill by name or description"
            className="h-8 w-full rounded border border-amber-200 bg-white/5 px-2 text-sm placeholder-white/70 focus:border-amber-300 focus:outline-none"
          />
          <p className="mt-1 text-[11px] text-white/60">
            Highlights matching skills and their prerequisite paths.
          </p>
        </motion.div>

        {/* Buttons */}
        <motion.button
          variants={{ hidden: { opacity: 0 }, show: { opacity: 1 } }}
          onClick={onTogglePlaceMode}
          className={`h-9 rounded-lg text-sm transition-colors ${
            placeMode ? 'bg-blue-600 text-white' : 'bg-white text-black'
          }`}
          whileTap={{ scale: 0.94 }}
        >
          {placeMode ? 'Click to place…' : 'Add (click to place)'}
        </motion.button>

        <motion.button
          variants={{ hidden: { opacity: 0 }, show: { opacity: 1 } }}
          onClick={onAddAtCenter}
          className="h-9 rounded-lg bg-white text-black text-sm"
          whileTap={{ scale: 0.94 }}
        >
          Add at center
        </motion.button>

        <motion.button
          variants={{ hidden: { opacity: 0 }, show: { opacity: 1 } }}
          onClick={onDeleteSelected}
          disabled={!hasSelection}
          className="h-9 rounded-lg bg-red-600 text-white text-sm disabled:opacity-50"
          whileTap={{ scale: 0.94 }}
        >
          Delete selected
        </motion.button>

        <motion.button
          variants={{ hidden: { opacity: 0 }, show: { opacity: 1 } }}
          disabled={!hasSelectedNodes}
          onClick={onDetachSelected}
          className="h-9 rounded-lg bg-white text-black text-sm disabled:opacity-50"
          whileTap={{ scale: 0.94 }}
        >
          Detach selected nodes
        </motion.button>

        <motion.label
          variants={{ hidden: { opacity: 0 }, show: { opacity: 1 } }}
          className="flex items-center gap-2 text-xs text-white"
        >
          <input
            type="checkbox"
            checked={autoConnect}
            onChange={(e) => onToggleAutoConnect(e.target.checked)}
          />
          Auto-connect from selected
        </motion.label>
      </motion.div>
    </motion.div>
  );
}
