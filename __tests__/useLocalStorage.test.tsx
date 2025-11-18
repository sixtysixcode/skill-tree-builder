import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { useLocalStorage } from '../app/hooks/useLocalStorage';

const TEST_KEY = 'vitest-local-storage';

describe('useLocalStorage', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    window.localStorage.clear();
  });

  it('returns the provided initial value when no stored value exists', () => {
    const { result } = renderHook(() => useLocalStorage(TEST_KEY, ['initial']));

    expect(result.current[0]).toEqual(['initial']);
    expect(result.current[2]).toBe(false); // hadStoredValue
    expect(result.current[3]).toBe(true); // initialized flag
  });

  it('uses a previously stored value from localStorage', () => {
    window.localStorage.setItem(TEST_KEY, JSON.stringify(['from storage']));

    const { result } = renderHook(() => useLocalStorage(TEST_KEY, ['initial']));

    expect(result.current[0]).toEqual(['from storage']);
    expect(result.current[2]).toBe(true);
  });

  it('persists updates back to localStorage', () => {
    const { result } = renderHook(() => useLocalStorage(TEST_KEY, ['initial']));

    act(() => {
      result.current[1]((prev) => prev.concat('next'));
    });

    expect(window.localStorage.getItem(TEST_KEY)).toEqual(JSON.stringify(['initial', 'next']));
    expect(result.current[0]).toEqual(['initial', 'next']);
  });
});
