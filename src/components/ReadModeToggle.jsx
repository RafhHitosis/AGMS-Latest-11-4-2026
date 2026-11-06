import React from "react";
import { Eye, EyeOff } from "lucide-react";

export default function ReadModeToggle({ enabled, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={enabled}
      className={`flex items-center gap-1.5 px-2.5 py-1 rounded border font-semibold text-xs transition-colors ${
        enabled
          ? "bg-indigo-100 text-indigo-800 border-indigo-300 hover:bg-indigo-200 dark:bg-indigo-950/70 dark:text-indigo-200 dark:border-indigo-800 dark:hover:bg-indigo-900/70"
          : "bg-white text-slate-700 border-slate-300 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700 dark:hover:bg-slate-700"
      }`}
      title={enabled ? "Turn off read mode to edit this table" : "Turn on read mode to prevent edits"}
    >
      {enabled ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
      Read Mode {enabled ? "On" : "Off"}
    </button>
  );
}
