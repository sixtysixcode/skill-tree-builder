'use client';

import { ReactFlowProvider } from '@xyflow/react';
import Link from 'next/link';
import bcrypt from 'bcryptjs';
import { FormEvent, useEffect, useState } from 'react';

import Flow from '../../components/Flow';
import { supabase } from '../../lib/supabaseClient';
import { useParams } from 'next/navigation';

type TreeMeta = {
  id: string;
  title: string | null;
  password_hash: string | null;
};

export default function TreePage() {
  const { treeId } = useParams<{ treeId: string }>();
  const [meta, setMeta] = useState<TreeMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [passwordInput, setPasswordInput] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    supabase
      .from('trees')
      .select('id,title,password_hash')
      .eq('id', treeId)
      .single()
      .then(({ data, error }) => {
        if (!active) return;
        if (error || !data) {
          setError(error?.message ?? 'Tree not found');
        } else {
          setMeta(data);
          if (!data.password_hash) {
            setAuthorized(true);
          } else {
            const cached = sessionStorage.getItem(`tree-auth:${treeId}`);
            setAuthorized(cached === 'granted');
          }
        }
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [treeId]);

  const requiresPassword = Boolean(meta?.password_hash);

  const handlePasswordSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!meta?.password_hash || verifying) return;
    setVerifying(true);
    try {
      const ok = await bcrypt.compare(passwordInput, meta.password_hash);
      if (!ok) {
        throw new Error('Incorrect password');
      }
      sessionStorage.setItem(`tree-auth:${treeId}`, 'granted');
      setAuthorized(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to verify password');
    } finally {
      setVerifying(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-white">
        Loading tree…
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 text-white">
        <p className="text-red-300">{error}</p>
        <Link href="/" className="mt-4 rounded bg-white px-3 py-2 text-sm text-black">
          Back home
        </Link>
      </div>
    );
  }

  if (requiresPassword && !authorized) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 text-white">
        <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-zinc-900/60 p-6">
          <h2 className="text-lg font-semibold">Password required</h2>
          <p className="mt-1 text-sm text-white/70">Enter the password set by the tree owner.</p>
          <form onSubmit={handlePasswordSubmit} className="mt-4 flex flex-col gap-3">
            <input
              type="password"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              className="rounded border border-white/20 bg-black/40 px-3 py-2 text-sm"
              placeholder="Password"
            />
            <button
              type="submit"
              disabled={verifying}
              className="rounded bg-white px-3 py-2 text-sm font-semibold text-black disabled:opacity-60"
            >
              {verifying ? 'Verifying…' : 'Unlock tree'}
            </button>
          </form>
          {error && <p className="mt-3 text-xs text-red-400">{error}</p>}
        </div>
      </div>
    );
  }

  return (
    <ReactFlowProvider>
      <div className="h-screen w-screen overflow-hidden bg-zinc-950">
        <Flow treeId={treeId} />
      </div>
    </ReactFlowProvider>
  );
}
