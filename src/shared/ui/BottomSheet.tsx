"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { ReactNode } from "react";

import { ru } from "@/shared/i18n";

export function BottomSheet({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-30 flex items-end justify-center bg-black/40"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            role="dialog"
            aria-label={title}
            className="max-h-[85dvh] w-full max-w-[480px] overflow-auto rounded-t-3xl bg-tg-bg p-4 pb-[max(1rem,env(safe-area-inset-bottom))] text-tg-text"
            initial={{ y: 40 }}
            animate={{ y: 0 }}
            exit={{ y: 40 }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold">{title}</h2>
              <button
                type="button"
                className="min-h-11 px-2 text-tg-link"
                onClick={onClose}
              >
                {ru.catalog.close}
              </button>
            </div>
            {children}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
