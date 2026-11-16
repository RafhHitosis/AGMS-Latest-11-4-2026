import React from "react";
import { Eye, Lock } from "lucide-react";
import clsx from "clsx";

export default function ReadModeToggle({ enabled, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={enabled}
      className={clsx(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl border px-2.5 py-1 text-xs font-semibold shadow-xs transition-all cursor-pointer select-none",
        enabled
          ? "border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-300 hover:bg-amber-500/20"
          : "border-outline-variant/60 bg-surface text-on-surface hover:bg-surface-container-high dark:bg-surface-container"
      )}
      title={enabled ? "Read-only mode active: click to unlock editing" : "Edit mode active: click to lock table against accidental edits"}
    >
      {enabled ? (
        <>
          <Lock className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
          <span>Read-Only</span>
        </>
      ) : (
        <>
          <Eye className="h-3.5 w-3.5 text-on-surface-variant" />
          <span>Read Mode Off</span>
        </>
      )}
    </button>
  );
}
