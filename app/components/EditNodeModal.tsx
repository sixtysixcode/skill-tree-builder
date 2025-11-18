'use client';

type EditNodeModalProps = {
  visible: boolean;
  name: string;
  description: string;
  cost: string;
  level: string;
  onChangeName: (value: string) => void;
  onChangeDescription: (value: string) => void;
  onChangeCost: (value: string) => void;
  onChangeLevel: (value: string) => void;
  onCancel: () => void;
  onSave: () => void;
};

export function EditNodeModal({
  visible,
  name,
  description,
  cost,
  level,
  onChangeName,
  onChangeDescription,
  onChangeCost,
  onChangeLevel,
  onCancel,
  onSave,
}: EditNodeModalProps) {
  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-6">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
        <h2 className="text-xl font-semibold text-zinc-900">Edit skill</h2>
        <p className="mt-1 text-sm text-zinc-500">Update the details for this node.</p>
        <div className="mt-4 space-y-3">
          <div>
            <label className="text-xs tracking-wide text-zinc-500">Name</label>
            <input
              className="mt-1 w-full rounded border border-zinc-300 px-2 py-1 text-sm"
              value={name}
              onChange={(e) => onChangeName(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs tracking-wide text-zinc-500">Description</label>
            <textarea
              className="mt-1 w-full rounded border border-zinc-300 px-2 py-1 text-sm"
              value={description}
              onChange={(e) => onChangeDescription(e.target.value)}
              rows={2}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs tracking-wide text-zinc-500">Cost</label>
              <input
                className="mt-1 w-full rounded border border-zinc-300 px-2 py-1 text-sm"
                value={cost}
                onChange={(e) => onChangeCost(e.target.value.replace(/[^0-9]/g, ''))}
              />
            </div>
            <div>
              <label className="text-xs tracking-wide text-zinc-500">Level</label>
              <input
                className="mt-1 w-full rounded border border-zinc-300 px-2 py-1 text-sm"
                value={level}
                onChange={(e) => onChangeLevel(e.target.value.replace(/[^0-9]/g, ''))}
              />
            </div>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            className="rounded bg-zinc-200 px-3 py-1.5 text-sm font-medium text-zinc-700"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            type="button"
            className="rounded bg-indigo-600 px-4 py-1.5 text-sm font-semibold text-white"
            onClick={onSave}
          >
            Save changes
          </button>
        </div>
      </div>
    </div>
  );
}
