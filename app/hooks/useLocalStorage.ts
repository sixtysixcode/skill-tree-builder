'use client';

import { useCallback, useEffect, useState } from 'react';

type LocalStorageState<T> = {
  value: T;
  hadStoredValue: boolean;
  initialized: boolean;
};

export function useLocalStorage<T>(key: string, initialValue: T) {
  const [state, setState] = useState<LocalStorageState<T>>(() => {
    if (typeof window === 'undefined') {
      return { value: initialValue, hadStoredValue: false, initialized: true };
    }
    try {
      const stored = window.localStorage.getItem(key);
      if (stored !== null) {
        return {
          value: JSON.parse(stored) as T,
          hadStoredValue: true,
          initialized: true,
        };
      }
    } catch {
      // ignore parse errors
    }
    return { value: initialValue, hadStoredValue: false, initialized: true };
  });

  const setValue = useCallback(
    (updater: T | ((prev: T) => T)) => {
      setState((prev) => {
        const nextValue = typeof updater === 'function' ? (updater as (prev: T) => T)(prev.value) : updater;
        return { ...prev, value: nextValue };
      });
    },
    [],
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(key, JSON.stringify(state.value));
    } catch {
      // ignore write errors (e.g. storage disabled)
    }
  }, [key, state.value]);

  return [state.value, setValue, state.hadStoredValue, state.initialized] as const;
}
