import { useEffect } from "react";

import { useGameStore } from "@/game/state/useGameStore";
import type { ToastType } from "@/types/game";

const toneByType: Record<ToastType, string> = {
  success: "border-emerald-500 bg-emerald-900/80 text-emerald-100",
  info: "border-sky-500 bg-sky-900/80 text-sky-100",
  warning: "border-amber-500 bg-amber-900/80 text-amber-100",
  error: "border-rose-500 bg-rose-900/80 text-rose-100"
};

export const ToastStack = () => {
  const toasts = useGameStore((state) => state.toasts);
  const dismissToast = useGameStore((state) => state.dismissToast);

  useEffect(() => {
    const timeouts = toasts.map((toast) =>
      window.setTimeout(() => {
        dismissToast(toast.id);
      }, toast.durationMs)
    );
    return () => {
      timeouts.forEach((timeoutId) => window.clearTimeout(timeoutId));
    };
  }, [toasts, dismissToast]);

  return (
    <div className="pointer-events-none fixed right-4 top-4 z-50 flex w-full max-w-sm flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto flex items-start justify-between gap-2 rounded border px-3 py-2 text-sm shadow-lg ${toneByType[toast.type]}`}
        >
          <span>{toast.message}</span>
          <button
            type="button"
            onClick={() => dismissToast(toast.id)}
            className="rounded px-1 text-xs opacity-80 hover:opacity-100"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
};
