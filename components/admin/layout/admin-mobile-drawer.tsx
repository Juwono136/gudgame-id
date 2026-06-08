"use client";

import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AdminSidebar } from "./admin-sidebar";
import type { AdminSessionContext } from "@/lib/admin/types";

type AdminMobileDrawerProps = {
  open: boolean;
  onClose: () => void;
  context: AdminSessionContext;
};

export function AdminMobileDrawer({
  open,
  onClose,
  context,
}: AdminMobileDrawerProps) {
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <AnimatePresence>
      {open ? (
        <>
          <motion.button
            type="button"
            aria-label="Close menu"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[90] bg-black/60 backdrop-blur-sm lg:hidden"
            onClick={onClose}
          />
          <motion.aside
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 320 }}
            className="fixed top-0 left-0 z-[100] flex h-[100dvh] w-[min(100vw-2.5rem,20rem)] flex-col shadow-2xl lg:hidden"
          >
            <AdminSidebar
              context={context}
              onNavigate={onClose}
              embedded
              onClose={onClose}
            />
          </motion.aside>
        </>
      ) : null}
    </AnimatePresence>
  );
}
