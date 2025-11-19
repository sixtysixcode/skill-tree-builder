'use client';

type ShareTreeModalProps = {
  visible: boolean;
  shareLink: string;
  treeId: string;
  shareCopied: boolean;
  hasTreePassword: boolean;
  newPasswordInput: string;
  passwordSaving: boolean;
  passwordMessage: string | null;
  lastSharedPassword: string | null;
  onCopyLink: () => void;
  onChangePasswordInput: (value: string) => void;
  onUpdatePassword: () => void;
  onRemovePassword: () => void;
  onClose: () => void;
};

export function ShareTreeModal({
  visible,
  shareLink,
  treeId,
  shareCopied,
  hasTreePassword,
  newPasswordInput,
  passwordSaving,
  passwordMessage,
  lastSharedPassword,
  onCopyLink,
  onChangePasswordInput,
  onUpdatePassword,
  onRemovePassword,
  onClose,
}: ShareTreeModalProps) {
  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-2xl bg-zinc-900 p-6 text-white shadow-xl">
        <h2 className="text-xl font-semibold">Share this tree</h2>
        <p className="mt-1 text-sm text-white/70">Give collaborators the link and password (if set).</p>
        <div className="mt-4">
          <label className="text-xs uppercase text-white/60">Tree link</label>
          <div className="mt-1 flex items-center gap-2 rounded border border-white/20 bg-black/30 px-3 py-2 text-sm">
            <span className="flex-1 truncate font-mono">{shareLink}</span>
            <button
              type="button"
              onClick={onCopyLink}
              className="rounded bg-white/10 px-2 py-1 text-xs"
            >
              {shareCopied ? 'Copied' : 'Copy'}
            </button>
          </div>
        </div>
        <div className="mt-4">
          <label className="text-xs uppercase text-white/60">Tree ID</label>
          <div className="mt-1 rounded border border-white/20 bg-black/30 px-3 py-2 font-mono text-sm">{treeId}</div>
        </div>
        <div className="mt-4">
          <label className="text-xs uppercase text-white/60">Password</label>
          <input
            type="text"
            value={newPasswordInput}
            onChange={(e) => onChangePasswordInput(e.target.value)}
            placeholder={hasTreePassword ? 'Enter new password to replace current' : 'Set optional password'}
            className="mt-1 w-full rounded border border-white/20 bg-black/30 px-3 py-2 text-sm"
          />
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onUpdatePassword}
              disabled={passwordSaving}
              className="rounded bg-white px-3 py-2 text-xs font-semibold text-black disabled:opacity-60"
            >
              {passwordSaving ? 'Saving…' : hasTreePassword ? 'Update password' : 'Set password'}
            </button>
            <button
              type="button"
              onClick={onRemovePassword}
              disabled={passwordSaving || !hasTreePassword}
              className="rounded border border-white/30 px-3 py-2 text-xs text-white/80 disabled:opacity-40"
            >
              Remove password
            </button>
            <button
              type="button"
              onClick={onClose}
              className="ml-auto rounded border border-white/30 px-3 py-2 text-xs text-white/80"
            >
              Close
            </button>
          </div>
          {lastSharedPassword && (
            <p className="mt-2 text-xs text-emerald-300">
              Share this password: <span className="font-mono">{lastSharedPassword}</span>
            </p>
          )}
          {passwordMessage && <p className="mt-2 text-xs text-white/70">{passwordMessage}</p>}
          {hasTreePassword && !lastSharedPassword && (
            <p className="mt-2 text-xs text-amber-300">
              A password is already set. Enter a new one above if you need to share it with someone.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
