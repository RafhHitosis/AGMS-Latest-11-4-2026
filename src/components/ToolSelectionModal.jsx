import React from "react";
import { X, Calendar, FileSpreadsheet, ArrowRight, CheckCircle2, GraduationCap } from "lucide-react";

export default function ToolSelectionModal({
  isOpen,
  onClose,
  sectionId,
  onSelectTool,
}) {
  if (!isOpen || !sectionId) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-850/50">
          <div>
            <h2 className="text-xl font-black text-slate-800 dark:text-slate-100">
              Section {sectionId}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Select a tool to open for this section:
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Options Grid */}
        <div className="p-6 grid sm:grid-cols-2 gap-4">
          {/* Tool 1: Attendance */}
          <button
            onClick={() => {
              onSelectTool(sectionId, "attendance");
              onClose();
            }}
            className="flex flex-col text-left p-5 rounded-2xl border-2 border-emerald-100 dark:border-emerald-900/60 bg-emerald-50/30 dark:bg-emerald-950/30 hover:border-emerald-500 dark:hover:border-emerald-500 hover:bg-emerald-50/70 dark:hover:bg-emerald-900/40 hover:shadow-md transition-all group cursor-pointer relative"
          >
            <div className="w-12 h-12 rounded-xl bg-emerald-600 text-white flex items-center justify-center mb-4 group-hover:scale-105 transition-transform shadow-xs">
              <Calendar className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-base text-slate-900 dark:text-slate-100 group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">
              Attendance System
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed flex-1">
              Track daily classroom attendance, mark absences, view holiday schedules, and export reports.
            </p>
            <div className="mt-4 pt-3 border-t border-emerald-100/80 dark:border-emerald-900/60 flex items-center justify-between text-xs font-bold text-emerald-700 dark:text-emerald-400 group-hover:translate-x-0.5 transition-transform">
              <span>Open Attendance</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </button>

          {/* Tool 2: Grading System */}
          <button
            onClick={() => {
              onSelectTool(sectionId, "grading");
              onClose();
            }}
            className="flex flex-col text-left p-5 rounded-2xl border-2 border-sky-100 dark:border-sky-900/60 bg-sky-50/30 dark:bg-sky-950/30 hover:border-sky-500 dark:hover:border-sky-500 hover:bg-sky-50/70 dark:hover:bg-sky-900/40 hover:shadow-md transition-all group cursor-pointer relative"
          >
            <div className="w-12 h-12 rounded-xl bg-sky-600 text-white flex items-center justify-center mb-4 group-hover:scale-105 transition-transform shadow-xs">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-base text-slate-900 dark:text-slate-100 group-hover:text-sky-700 dark:group-hover:text-sky-400 transition-colors">
              Grading System
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed flex-1">
              Excel-like grading sheet with Major Exams, Quizzes, Recitation, auto-transmuted grades, and reports.
            </p>
            <div className="mt-4 pt-3 border-t border-sky-100/80 dark:border-sky-900/60 flex items-center justify-between text-xs font-bold text-sky-700 dark:text-sky-400 group-hover:translate-x-0.5 transition-transform">
              <span>Open Grading</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
