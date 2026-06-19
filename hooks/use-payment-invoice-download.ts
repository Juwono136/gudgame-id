"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { openPaymentInvoicePrintWindow } from "@/components/payments/payment-invoice-view";

type DownloadState = {
  active: boolean;
  progress: number;
  label: string;
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function usePaymentInvoiceDownload() {
  const [state, setState] = useState<DownloadState>({
    active: false,
    progress: 0,
    label: "",
  });
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => clearTimer, [clearTimer]);

  const download = useCallback(
    async (container: HTMLElement, title: string) => {
      clearTimer();
      setState({ active: true, progress: 8, label: "Preparing receipt…" });

      let progress = 8;
      timerRef.current = setInterval(() => {
        progress = Math.min(progress + 4, 72);
        setState((prev) => ({ ...prev, progress }));
      }, 120);

      try {
        await sleep(280);
        setState((prev) => ({ ...prev, label: "Rendering document…", progress: 45 }));
        await sleep(220);
        setState((prev) => ({ ...prev, label: "Opening print dialog…", progress: 78 }));
        await openPaymentInvoicePrintWindow(container, title);
        clearTimer();
        setState({ active: true, progress: 100, label: "Save as PDF in the print dialog" });
        await sleep(1600);
      } finally {
        clearTimer();
        setState({ active: false, progress: 0, label: "" });
      }
    },
    [clearTimer],
  );

  return { ...state, download, isDownloading: state.active };
}
