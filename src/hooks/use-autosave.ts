'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Autosave hook for forms (notes, messages, intake).
 *
 * Saves to localStorage on debounce and restores on mount.
 * Provides a `clearDraft` callback for after successful submit.
 *
 * @param key     Unique storage key (e.g. `draft:note:${patientId}`)
 * @param delay   Debounce ms (default 1500)
 * @returns       [savedValue, saveValue, clearDraft, hasDraft]
 */
export function useAutosave<T>(
  key: string,
  delay = 1500,
): [T | null, (value: T) => void, () => void, boolean] {
  const [hasDraft, setHasDraft] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load from storage on mount.
  const [initial] = useState<T | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        setHasDraft(true);
        return JSON.parse(raw) as T;
      }
    } catch { /* ignore corrupt data */ }
    return null;
  });

  const save = useCallback(
    (value: T) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        try {
          localStorage.setItem(key, JSON.stringify(value));
          setHasDraft(true);
        } catch { /* quota exceeded, silently fail */ }
      }, delay);
    },
    [key, delay],
  );

  const clearDraft = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    try { localStorage.removeItem(key); } catch { /* ignore */ }
    setHasDraft(false);
  }, [key]);

  // Cleanup timer on unmount.
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return [initial, save, clearDraft, hasDraft];
}
