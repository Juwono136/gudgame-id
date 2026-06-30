"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import type { DashboardSportOption } from "@/lib/dashboard/types";

type DashboardSportContextValue = {
  sportSlug: string;
  availableSports: DashboardSportOption[];
  setSportSlug: (slug: string) => void;
};

const DashboardSportContext = createContext<DashboardSportContextValue | null>(null);

type DashboardSportProviderProps = {
  initialSportSlug: string;
  initialAvailableSports: DashboardSportOption[];
  children: ReactNode;
};

export function DashboardSportProvider({
  initialSportSlug,
  initialAvailableSports,
  children,
}: DashboardSportProviderProps) {
  const router = useRouter();
  const [sportSlug, setSportSlugState] = useState(initialSportSlug);
  const [availableSports, setAvailableSports] = useState(initialAvailableSports);

  useEffect(() => {
    setSportSlugState(initialSportSlug);
    setAvailableSports(initialAvailableSports);
  }, [initialSportSlug, initialAvailableSports]);

  const value = useMemo(
    () => ({
      sportSlug,
      availableSports,
      setSportSlug: (slug: string) => {
        setSportSlugState(slug);
        router.refresh();
      },
    }),
    [sportSlug, availableSports, router],
  );

  return (
    <DashboardSportContext.Provider value={value}>{children}</DashboardSportContext.Provider>
  );
}

export function useDashboardSport(): DashboardSportContextValue {
  const ctx = useContext(DashboardSportContext);
  if (!ctx) {
    throw new Error("useDashboardSport must be used within DashboardSportProvider");
  }
  return ctx;
}

export function useDashboardSportOptional(): DashboardSportContextValue | null {
  return useContext(DashboardSportContext);
}
