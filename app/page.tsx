'use client';

import { FormEvent, useState } from 'react';
import bcrypt from 'bcryptjs';
import { useRouter } from 'next/navigation';

import { supabase } from './lib/supabaseClient';

export default function Home() {
  const router = useRouter();
  const [createTitle, setCreateTitle] = useState('');
  const [createPassword, setCreatePassword] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [joinId, setJoinId] = useState('');
  const [joinPassword, setJoinPassword] = useState('');
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  const handleCreate = async (event: FormEvent) => {
    event.preventDefault();
    if (creating) return;
    setCreating(true);
    setCreateError(null);
    try {
      const trimmedTitle = createTitle.trim() || 'Untitled Skill Tree';
      const passwordHash = createPassword ? await bcrypt.hash(createPassword, 10) : null;
      const { data, error } = await supabase
        .from('trees')
        .insert([{ title: trimmedTitle, password_hash: passwordHash }])
        .select('id')
        .single();

      if (error || !data) {
        throw error ?? new Error('Failed to create tree');
      }
      if (passwordHash) {
        sessionStorage.setItem(`tree-auth:${data.id}`, 'granted');
      }
      router.push(`/tree/${data.id}`);
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Unable to create tree');
    } finally {
      setCreating(false);
    }
  };

  const handleJoin = async (event: FormEvent) => {
    event.preventDefault();
    if (joining) return;
    setJoining(true);
    setJoinError(null);
    try {
      const trimmedId = joinId.trim();
      if (!trimmedId) throw new Error('Enter a tree ID');
      const { data, error } = await supabase
        .from('trees')
        .select('id,password_hash')
        .eq('id', trimmedId)
        .single();
      if (error || !data) throw error ?? new Error('Tree not found');
      if (data.password_hash) {
        if (!joinPassword) throw new Error('Password required');
        const matches = await bcrypt.compare(joinPassword, data.password_hash);
        if (!matches) throw new Error('Incorrect password');
        sessionStorage.setItem(`tree-auth:${data.id}`, 'granted');
      }
      router.push(`/tree/${data.id}`);
    } catch (err) {
      setJoinError(err instanceof Error ? err.message : 'Unable to join tree');
    } finally {
      setJoining(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-black via-slate-950 to-blue-900 text-white">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-30"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='320' height='320' fill='none'%3E%3Cg stroke='rgba(255,255,255,0.16)' stroke-width='2' stroke-dasharray='14 18' stroke-linecap='round'%3E%3Cpath d='M-60 200 Q 10 80 80 200 T 220 200 T 360 200'/%3E%3Cpath d='M-60 200 Q 10 80 80 200 T 220 200 T 360 200' transform='rotate(40 160 160)'/%3E%3C/g%3E%3C/svg%3E\")",
          backgroundSize: '420px 420px',
        }}
      />
      <div className="relative flex min-h-screen flex-col items-center justify-center px-4">
        <div className="w-full max-w-xl rounded-2xl border border-white/10 bg-black/60 p-6 shadow-2xl backdrop-blur">
        <h1 className="text-center text-3xl font-semibold">Skill Tree Builder</h1>
        <p className="mt-2 text-center text-sm text-white/70">
          Start a new tree or join an existing one with its share ID.
        </p>

        <div className="mt-8 grid gap-8 md:grid-cols-2">
          <form onSubmit={handleCreate} className="flex flex-col gap-3 rounded-xl border border-white/10 bg-black/20 p-4">
            <h2 className="text-lg font-semibold">Create tree</h2>
            <label className="text-xs uppercase tracking-wide text-white/60">Title</label>
            <input
              value={createTitle}
              onChange={(e) => setCreateTitle(e.target.value)}
              className="rounded border border-white/20 bg-black/40 px-3 py-2 text-sm"
              placeholder="My awesome skill tree"
            />
            <label className="text-xs uppercase tracking-wide text-white/60">Password (optional)</label>
            <input
              type="password"
              value={createPassword}
              onChange={(e) => setCreatePassword(e.target.value)}
              className="rounded border border-white/20 bg-black/40 px-3 py-2 text-sm"
              placeholder="Set a password"
            />
            {createError && <p className="text-xs text-red-400">{createError}</p>}
            <button
              type="submit"
              disabled={creating}
              className="mt-2 rounded bg-emerald-500 px-3 py-2 text-sm font-semibold text-black disabled:opacity-60"
            >
              {creating ? 'Creating…' : 'Create & open'}
            </button>
          </form>

          <form onSubmit={handleJoin} className="flex flex-col gap-3 rounded-xl border border-white/10 bg-black/20 p-4">
            <h2 className="text-lg font-semibold">Join existing</h2>
            <label className="text-xs uppercase tracking-wide text-white/60">Tree ID</label>
            <input
              value={joinId}
              onChange={(e) => setJoinId(e.target.value)}
              className="rounded border border-white/20 bg-black/40 px-3 py-2 text-sm"
              placeholder="Paste shared ID"
            />
            <label className="text-xs uppercase tracking-wide text-white/60">Password</label>
            <input
              type="password"
              value={joinPassword}
              onChange={(e) => setJoinPassword(e.target.value)}
              className="rounded border border-white/20 bg-black/40 px-3 py-2 text-sm"
              placeholder="Required if creator set one"
            />
            {joinError && <p className="text-xs text-red-400">{joinError}</p>}
            <button
              type="submit"
              disabled={joining}
              className="mt-2 rounded bg-white px-3 py-2 text-sm font-semibold text-black disabled:opacity-60"
            >
              {joining ? 'Joining…' : 'Join tree'}
            </button>
          </form>
        </div>
        </div>
      </div>
    </div>
  );
}
