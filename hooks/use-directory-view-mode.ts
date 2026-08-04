"use client";

import { useCallback, useEffect, useState } from "react";

export type DirectoryViewMode = "grid" | "list";

const STORAGE_PREFIX = "cp.directory.view.";

/**
 * Persist grid/list preference per directory surface (tournaments, leagues, …).
 */
export function useDirectoryViewMode(
  storageKey: string,
  defaultMode: DirectoryViewMode = "grid",
): [DirectoryViewMode, (mode: DirectoryViewMode) => void] {
  const key = `${STORAGE_PREFIX}${storageKey}`;
  const [mode, setModeState] = useState<DirectoryViewMode>(defaultMode);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(key);
      if (raw === "grid" || raw === "list") setModeState(raw);
    } catch {
      /* ignore private mode / blocked storage */
    }
  }, [key]);

  const setMode = useCallback(
    (next: DirectoryViewMode) => {
      setModeState(next);
      try {
        window.localStorage.setItem(key, next);
      } catch {
        /* ignore */
      }
    },
    [key],
  );

  return [mode, setMode];
}
