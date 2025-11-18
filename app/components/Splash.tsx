type SplashProps = {
  title?: string;
  description?: string;
  author?: string;
  ctaLabel?: string;
  onStart: () => void;
  onReset?: () => void;
  visible: boolean;
  loading?: boolean;
};

export function Splash({
  title = 'Skill Tree Builder',
  description = 'Create detailed skill trees for any subject.',
  author = 'Made by Alex Barnes',
  ctaLabel = 'Start building my tree',
  onStart,
  onReset,
  visible,
  loading = false,
}: SplashProps) {
  if (!visible) return null;

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center overflow-hidden bg-gradient-to-br from-black via-slate-950 to-blue-900 text-white">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-30"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='320' height='320' fill='none'%3E%3Cg stroke='rgba(255,255,255,0.16)' stroke-width='2' stroke-dasharray='14 18' stroke-linecap='round'%3E%3Cpath d='M-60 200 Q 10 80 80 200 T 220 200 T 360 200'/%3E%3Cpath d='M-60 200 Q 10 80 80 200 T 220 200 T 360 200' transform='rotate(40 160 160)'/%3E%3C/g%3E%3C/svg%3E\")",
          backgroundSize: '420px 420px',
        }}
      />
      <div className="relative mx-4 max-w-2xl rounded-[10px] bg-black/60 p-14 text-center backdrop-blur">
        <p className="mb-5 text-sm uppercase tracking-[0.4em] text-white/80">{author}</p>
        <h1 className="text-5xl font-semibold leading-tight">{title}</h1>
        <p className="mt-6 text-lg leading-relaxed text-white/80">{description}</p>
        {loading ? (
          <div className="mt-10 flex w-full flex-col items-center gap-3">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/40 border-t-white" />
            <p className="text-sm text-white/70">Checking your saved trees…</p>
          </div>
        ) : (
          <>
            <button
              className="mt-10 w-full rounded-[10px] bg-white px-8 py-4 text-base font-semibold text-indigo-700 shadow-lg transition hover:-translate-y-0.5 hover:bg-amber-50"
              onClick={onStart}
              type="button"
            >
              {ctaLabel}
            </button>
            {onReset && (
              <button
                className="mt-4 w-full rounded-[10px] border border-white/60 px-8 py-3 text-sm font-semibold text-white/80 transition hover:bg-white/10"
                onClick={onReset}
                type="button"
              >
                Start a new tree
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
