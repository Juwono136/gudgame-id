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

type AdminSportContextValue = {
  sportSlug: string;
  setSportSlug: (slug: string) => void;
};

const AdminSportContext = createContext<AdminSportContextValue | null>(null);

type AdminSportProviderProps = {
  initialSportSlug: string;
  children: ReactNode;
};

export function AdminSportProvider({ initialSportSlug, children }: AdminSportProviderProps) {
  const router = useRouter();
  const [sportSlug, setSportSlugState] = useState(initialSportSlug);

  useEffect(() => {
    setSportSlugState(initialSportSlug);
  }, [initialSportSlug]);

  const value = useMemo(
    () => ({
      sportSlug,
      setSportSlug: (slug: string) => {
        setSportSlugState(slug);
        router.refresh();
      },
    }),
    [sportSlug, router],
  );

  return <AdminSportContext.Provider value={value}>{children}</AdminSportContext.Provider>;
}

export function useAdminSport(): AdminSportContextValue {
  const ctx = useContext(AdminSportContext);
  if (!ctx) {
    throw new Error("useAdminSport must be used within AdminSportProvider");
  }
  return ctx;
}
