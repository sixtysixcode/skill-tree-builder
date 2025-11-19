'use client';

import { FormEvent, useCallback, useState } from 'react';
import { motion } from 'framer-motion';

type SkillSidebarProps = {
  treeId: string;
  treeTitle: string;
  onTreeTitleChange: (value: string) => void;
  name: string;
  description: string;
  cost: string;
  level: string;
  searchQuery: string;
  placeMode: boolean;
  autoConnect: boolean;
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
  onResetTree?: () => void;
  canResetTree?: boolean;
  onOpenShareModal: () => void;
  onClose?: () => void;
};

export function SkillSidebar({
  treeId,
  treeTitle,
  onTreeTitleChange,
  name,
  description,
  cost,
  level,
  searchQuery,
  placeMode,
  autoConnect,
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
  onResetTree,
  canResetTree = false,
  onOpenShareModal,
  onClose,
}: SkillSidebarProps) {
  const [errors, setErrors] = useState<{ name?: string; description?: string }>({});
  const [copied, setCopied] = useState(false);

  const validateForm = useCallback(() => {
    const nextErrors: { name?: string; description?: string } = {};
    if (!name.trim()) nextErrors.name = 'Name is required';
    if (!description.trim()) nextErrors.description = 'Description is required';
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }, [name, description]);

  const handleSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!validateForm()) return;
      onAddAtCenter();
    },
    [validateForm, onAddAtCenter],
  );

  const handleTogglePlaceMode = () => {
    if (!validateForm()) return;
    onTogglePlaceMode();
  };

  const handleNameChange = (value: string) => {
    onNameChange(value);
    if (errors.name && value.trim()) {
      setErrors((prev) => ({ ...prev, name: undefined }));
    }
  };

  const handleDescriptionChange = (value: string) => {
    onDescriptionChange(value);
    if (errors.description && value.trim()) {
      setErrors((prev) => ({ ...prev, description: undefined }));
    }
  };

  const digitsOnly = (value: string) => value.replace(/[^0-9]/g, '');

  const handleCopyLink = async () => {
    try {
      const url = `${window.location.origin}/tree/${treeId}`;
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="h-full w-full overflow-y-auto bg-zinc-900 text-white p-4 border-r border-zinc-800"
    >
      {/* Stagger container */}
      <motion.form
        initial="hidden"
        animate="show"
        variants={{
          hidden: {},
          show: {
            transition: { staggerChildren: 0.08 },
          },
        }}
        className="flex flex-col gap-4"
        onSubmit={handleSubmit}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <label className="text-xs uppercase text-white/40" htmlFor="tree-title-input">
              Tree title
            </label>
            <div className="mt-1 flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  id="tree-title-input"
                  value={treeTitle}
                  onChange={(e) => onTreeTitleChange(e.target.value)}
                  className="w-full rounded bg-white/10 border border-white/20 px-3 py-1.5 text-lg font-semibold text-white pr-10 focus:border-white/40 focus:outline-none"
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-white/60 text-sm">
                  ✎
                </span>
              </div>
            </div>
            <p className="mt-1 text-xs text-white/60">
              ID: <span className="font-mono">{treeId}</span>
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleCopyLink}
                className="rounded bg-white/10 px-2 py-1 text-xs"
              >
                {copied ? 'Link copied!' : 'Copy link'}
              </button>
              <button
                type="button"
                onClick={onOpenShareModal}
                className="rounded border border-white/30 px-2 py-1 text-xs text-white/80"
              >
                Share settings
              </button>
            </div>
            {onResetTree && (
              <button
                type="button"
                onClick={onResetTree}
                disabled={!canResetTree}
                className="mt-2 rounded border border-white/20 px-2 py-1 text-xs text-white/80 disabled:opacity-50"
              >
                Reset tree
              </button>
            )}
          </div>
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
          <label className="text-sm text-white" htmlFor="skill-name-input">
            Name *
          </label>
          <input
            id="skill-name-input"
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder="Skill name"
            required
            aria-invalid={Boolean(errors.name)}
            className={`h-8 w-full rounded border px-2 text-sm placeholder-white ${
              errors.name ? 'border-red-400 bg-red-500/10' : 'border-zinc-300 bg-white/10'
            }`}
          />
          {errors.name && <p className="mt-1 text-xs text-red-300">{errors.name}</p>}
        </motion.div>

        <motion.div variants={{ hidden: { opacity: 0 }, show: { opacity: 1 } }}>
          <label className="text-sm text-white" htmlFor="skill-description-input">
            Description *
          </label>
          <input
            id="skill-description-input"
            value={description}
            onChange={(e) => handleDescriptionChange(e.target.value)}
            placeholder="Description"
            required
            aria-invalid={Boolean(errors.description)}
            className={`h-8 w-full rounded border px-2 text-sm placeholder-white ${
              errors.description ? 'border-red-400 bg-red-500/10' : 'border-zinc-300 bg-white/10'
            }`}
          />
          {errors.description && <p className="mt-1 text-xs text-red-300">{errors.description}</p>}
        </motion.div>

        <motion.div variants={{ hidden: { opacity: 0 }, show: { opacity: 1 } }}>
          <label className="text-sm text-white">Cost</label>
          <input
            value={cost}
            onChange={(e) => onCostChange(digitsOnly(e.target.value))}
            placeholder="e.g. 2"
            inputMode="numeric"
            className="h-8 w-full rounded border border-zinc-300 bg-white/10 px-2 text-sm placeholder-white"
          />
        </motion.div>

        <motion.div variants={{ hidden: { opacity: 0 }, show: { opacity: 1 } }}>
          <label className="text-sm text-white">Level</label>
          <input
            value={level}
            onChange={(e) => onLevelChange(digitsOnly(e.target.value))}
            placeholder="e.g. 3"
            inputMode="numeric"
            className="h-8 w-full rounded border border-zinc-300 bg-white/10 px-2 text-sm placeholder-white"
          />
        </motion.div>

        {/* Buttons */}
        <motion.button
          type="button"
          variants={{ hidden: { opacity: 0 }, show: { opacity: 1 } }}
          onClick={handleTogglePlaceMode}
          className={`h-9 rounded-lg text-sm transition-colors ${
            placeMode ? 'bg-blue-600 text-white' : 'bg-white text-black'
          }`}
          whileTap={{ scale: 0.94 }}
        >
          {placeMode ? 'Click to place…' : 'Add (click to place)'}
        </motion.button>

        <motion.button
          type="submit"
          variants={{ hidden: { opacity: 0 }, show: { opacity: 1 } }}
          className="h-9 rounded-lg bg-white text-black text-sm"
          whileTap={{ scale: 0.94 }}
        >
          Add at center
        </motion.button>

        <motion.button
          type="button"
          variants={{ hidden: { opacity: 0 }, show: { opacity: 1 } }}
          onClick={onDeleteSelected}
          disabled={!hasSelection}
          className="h-9 rounded-lg bg-red-600 text-white text-sm disabled:opacity-50"
          whileTap={{ scale: 0.94 }}
        >
          Delete selected
        </motion.button>

        <motion.button
          type="button"
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
          className="flex items-center gap-2 text-sm text-white"
        >
          <input
            type="checkbox"
            checked={autoConnect}
            onChange={(e) => onToggleAutoConnect(e.target.checked)}
          />
          Auto-connect from selected
        </motion.label>
      </motion.form>

      <div className="my-4 border-t border-white/30" />

      <motion.div variants={{ hidden: { opacity: 0 }, show: { opacity: 1 } }}>
          <label className="text-md text-white">Search</label>
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
    </motion.div>
  );
}
