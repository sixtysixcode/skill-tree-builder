'use client';

import { useEffect, useRef, useState } from 'react';

export function useLocalStorage<T>(key: string, initialValue: T) {
  const hadStoredValueRef = useRef(false);
  const initializedRef = useRef(false);

  const [value, setValue] = useState<T>(() => {
    if (typeof window === 'undefined') return initialValue;
    try {
      const stored = window.localStorage.getItem(key);
      if (stored !== null) {
        hadStoredValueRef.current = true;
        initializedRef.current = true;
        return JSON.parse(stored) as T;
      }
    } catch {
      // ignore parse errors
    }
    hadStoredValueRef.current = false;
    initializedRef.current = true;
    return initialValue;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // ignore write errors (e.g. storage disabled)
    }
  }, [key, value]);

  return [value, setValue, hadStoredValueRef.current, initializedRef.current] as const;
}
