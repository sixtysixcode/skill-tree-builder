// app/components/SkillSidebar.tsx
'use client';

type SkillSidebarProps = {
  name: string;
  description: string;
  cost: string;
  level: string;
  placeMode: boolean;
  autoConnect: boolean;
  canSubmit: boolean;
  hasSelection: boolean;
  hasSelectedNodes: boolean;
  onNameChange: (v: string) => void;
  onDescriptionChange: (v: string) => void;
  onCostChange: (v: string) => void;
  onLevelChange: (v: string) => void;
  onTogglePlaceMode: () => void;
  onAddAtCenter: () => void;
  onDeleteSelected: () => void;
  onDetachSelected: () => void;
  onToggleAutoConnect: (v: boolean) => void;
};

export function SkillSidebar(props: SkillSidebarProps) {
  const {
    name,
    description,
    cost,
    level,
    placeMode,
    autoConnect,
    canSubmit,
    hasSelection,
    hasSelectedNodes,
    onNameChange,
    onDescriptionChange,
    onCostChange,
    onLevelChange,
    onTogglePlaceMode,
    onAddAtCenter,
    onDeleteSelected,
    onDetachSelected,
    onToggleAutoConnect,
  } = props;

  return (
    <aside className="flex h-full w-80 flex-col gap-4 border-r border-zinc-200 bg-zinc-900 p-4 text-white dark:border-zinc-800 dark:bg-zinc-900">
      <h2 className="text-sm font-semibold">Add Skill</h2>

      <div className="flex flex-1 flex-col gap-3 overflow-y-auto">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-white">Name *</label>
          <input
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            placeholder="Skill name"
            className="h-8 rounded border border-zinc-300 bg-white px-2 text-sm dark:bg-zinc-800"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-white">Description</label>
          <input
            value={description}
            onChange={(e) => onDescriptionChange(e.target.value)}
            placeholder="Optional description"
            className="h-8 rounded border border-zinc-300 bg-white px-2 text-sm dark:bg-zinc-800"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-white">Cost (optional)</label>
          <input
            value={cost}
            onChange={(e) => onCostChange(e.target.value)}
            placeholder="e.g. 2"
            inputMode="numeric"
            className="h-8 w-24 rounded border border-zinc-300 bg-white px-2 text-sm dark:bg-zinc-800"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-white">Level (optional)</label>
          <input
            value={level}
            onChange={(e) => onLevelChange(e.target.value)}
            placeholder="e.g. 3"
            inputMode="numeric"
            className="h-8 w-24 rounded border border-zinc-300 bg-white px-2 text-sm dark:bg-zinc-800"
          />
        </div>
      </div>

      {/* Buttons bottom, classes unchanged */}
      <div className="flex flex-col gap-2 pt-2">
        <div className="flex gap-2">
          <button
            onClick={onTogglePlaceMode}
            disabled={!canSubmit && !placeMode}
            className={[
              'h-8 flex-1 rounded-lg border px-3 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-60',
              placeMode
                ? 'border-blue-600 bg-blue-600 text-white'
                : 'border-zinc-300 bg-white text-zinc-900 hover:bg-blue-50',
            ].join(' ')}
          >
            Click to place…
          </button>

          <button
            onClick={onAddAtCenter}
            disabled={!canSubmit}
            className="h-8 flex-1 rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Add at center
          </button>
        </div>

        <div className="flex gap-2">
          <button
            onClick={onDeleteSelected}
            className="h-8 flex-1 rounded-lg border border-red-600 bg-red-600 px-3 text-sm text-white disabled:opacity-60"
            disabled={!hasSelection}
          >
            Delete selected
          </button>

          <button
            onClick={onDetachSelected}
            className="h-8 flex-1 rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 hover:bg-zinc-50 disabled:opacity-60"
            disabled={!hasSelectedNodes}
          >
            Detach selected
          </button>
        </div>

        <label className="mt-1 flex items-center gap-2 text-xs text-white">
          <input
            type="checkbox"
            checked={autoConnect}
            onChange={(e) => onToggleAutoConnect(e.target.checked)}
          />
          Auto-connect from selected
        </label>
      </div>
    </aside>
  );
}
