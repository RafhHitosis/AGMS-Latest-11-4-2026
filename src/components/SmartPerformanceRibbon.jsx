import React from "react";
import {
  Award,
  AlertCircle,
  TrendingUp,
  BarChart2,
} from "lucide-react";
import clsx from "clsx";

export default function SmartPerformanceRibbon({
  analytics,
  activeFilter,
  onSelectFilter,
  onOpenAnalyticsModal,
  isSemestral = false,
  termName = "Midterm",
}) {
  if (!analytics || !analytics.totalStudents) {
    return null;
  }

  const {
    highestGrade,
    lowestGrade,
    highestStudents = [],
    lowestStudents = [],
    hasDistinctLowest = false,
    counts = {},
    mostImproved,
  } = analytics;

  const hasHighest = highestGrade !== null && highestStudents.length > 0;
  // Strictly enforce that lowest only shows if there is a distinct lowest student (at least 2 students and highest > lowest)
  const hasLowest = hasDistinctLowest && lowestGrade !== null && lowestStudents.length > 0;

  const highestFullName = hasHighest ? highestStudents.map((s) => s.name).join(", ") : "";
  const lowestFullName = hasLowest ? lowestStudents.map((s) => s.name).join(", ") : "";

  return (
    <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 py-2 flex flex-wrap items-center justify-between gap-2.5 text-xs">
      {/* Left: Highest & Lowest Smart Spotlights */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Highest Performer Card */}
        <div className="flex items-center gap-2 bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200/90 dark:border-emerald-800/80 px-2.5 py-1 rounded-lg">
          <div className="w-6 h-6 rounded-md bg-emerald-100 dark:bg-emerald-900/60 flex items-center justify-center text-emerald-700 dark:text-emerald-400 shrink-0">
            <Award className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1 leading-none">
              <span className="text-[10px] uppercase font-bold text-emerald-800 dark:text-emerald-300">
                {isSemestral ? "Semester Best" : `Top in ${termName}`}
              </span>
              <span className="px-1 py-0.2 rounded bg-emerald-200/70 dark:bg-emerald-800/60 text-emerald-900 dark:text-emerald-200 text-[9px] font-black">
                #1
              </span>
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span
                className="font-bold text-slate-800 dark:text-slate-100 text-xs truncate max-w-[150px] sm:max-w-[220px] md:max-w-[280px]"
                title={highestFullName || "No graded student yet"}
              >
                {hasHighest
                  ? highestStudents.length > 1
                    ? `${highestStudents[0].name} (+${highestStudents.length - 1} tied)`
                    : highestStudents[0].name
                  : "—"}
              </span>
              <span className="font-black text-emerald-800 dark:text-emerald-300 text-xs bg-emerald-100 dark:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-800 px-1.5 py-0.2 rounded shrink-0">
                {hasHighest ? highestGrade.toFixed(2) : "—"}
              </span>
            </div>
          </div>
        </div>

        {/* Lowest Performer Card - Strictly only populates if distinct lowest student exists */}
        <div
          className={clsx(
            "flex items-center gap-2 px-2.5 py-1 rounded-lg border",
            hasLowest && lowestGrade < 75.0
              ? "bg-rose-50/80 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-slate-800 dark:text-slate-100"
              : "bg-slate-50 dark:bg-slate-850 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300"
          )}
        >
          <div
            className={clsx(
              "w-6 h-6 rounded-md flex items-center justify-center shrink-0",
              hasLowest && lowestGrade < 75.0
                ? "bg-rose-100 dark:bg-rose-900/60 text-rose-600 dark:text-rose-400"
                : "bg-slate-200 dark:bg-slate-750 text-slate-600 dark:text-slate-300"
            )}
          >
            <AlertCircle className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1 leading-none">
              <span
                className={clsx(
                  "text-[10px] uppercase font-bold",
                  hasLowest && lowestGrade < 75.0
                    ? "text-rose-800 dark:text-rose-300"
                    : "text-slate-600 dark:text-slate-400"
                )}
              >
                {isSemestral ? "Semester Lowest" : `Lowest in ${termName}`}
              </span>
              {hasLowest && lowestGrade < 75.0 && (
                <span className="px-1 py-0.2 rounded bg-rose-200 dark:bg-rose-900/80 text-rose-900 dark:text-rose-200 text-[9px] font-black">
                  Failing
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span
                className={clsx(
                  "font-bold text-xs truncate max-w-[150px] sm:max-w-[220px] md:max-w-[280px]",
                  hasLowest ? "text-slate-800 dark:text-slate-100" : "text-slate-400 dark:text-slate-500"
                )}
                title={hasLowest ? lowestFullName : "No lower grade exists in this section"}
              >
                {hasLowest
                  ? lowestStudents.length > 1
                    ? `${lowestStudents[0].name} (+${lowestStudents.length - 1} tied)`
                    : lowestStudents[0].name
                  : "—"}
              </span>
              <span
                className={clsx(
                  "font-black text-xs px-1.5 py-0.2 rounded border shrink-0",
                  hasLowest
                    ? lowestGrade < 75.0
                      ? "bg-rose-100 dark:bg-rose-900/60 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300"
                      : "bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200"
                    : "bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500"
                )}
              >
                {hasLowest ? lowestGrade.toFixed(2) : "—"}
              </span>
            </div>
          </div>
        </div>

        {/* Semestral Most Improved Badge if available */}
        {isSemestral && mostImproved && mostImproved.delta > 0 && (
          <div className="hidden lg:flex items-center gap-2 bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 px-2.5 py-1 rounded-lg">
            <div className="w-6 h-6 rounded-md bg-sky-100 dark:bg-sky-900/60 text-sky-700 dark:text-sky-300 flex items-center justify-center shrink-0">
              <TrendingUp className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] uppercase font-bold text-sky-800 dark:text-sky-300 leading-none">
                Most Improved
              </div>
              <div className="font-bold text-slate-800 dark:text-slate-100 text-xs flex items-center gap-1 mt-0.5">
                <span
                  className="truncate max-w-[130px] sm:max-w-[180px]"
                  title={mostImproved.name}
                >
                  {mostImproved.name}
                </span>
                <span className="text-emerald-700 dark:text-emerald-400 font-black shrink-0">
                  +{mostImproved.delta.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Right: Smart Categorization Filter Pills & Analytics Trigger */}
      <div className="flex items-center gap-2">
        <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
          <button
            onClick={() => onSelectFilter(activeFilter === "ALL" ? null : "ALL")}
            className={clsx(
              "px-2.5 py-1 rounded text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1",
              activeFilter === "ALL" || !activeFilter
                ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xs border border-slate-200/80 dark:border-slate-700"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
            )}
            title="Show All Students"
          >
            <span>All</span>
            <span className="text-[10px] opacity-75 font-mono">({counts.total || 0})</span>
          </button>

          <button
            onClick={() => onSelectFilter(activeFilter === "BEST" ? "ALL" : "BEST")}
            className={clsx(
              "px-2.5 py-1 rounded text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1",
              activeFilter === "BEST"
                ? "bg-emerald-600 text-white shadow-2xs"
                : "text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/50"
            )}
            title="Filter to Best Performing Students"
          >
            <span>Best</span>
            <span className="text-[10px] opacity-80 font-mono">({counts.best || 0})</span>
          </button>

          <button
            onClick={() => onSelectFilter(activeFilter === "SATISFACTORY" ? "ALL" : "SATISFACTORY")}
            className={clsx(
              "px-2.5 py-1 rounded text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1",
              activeFilter === "SATISFACTORY"
                ? "bg-sky-600 text-white shadow-2xs"
                : "text-sky-700 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-950/50"
            )}
            title="Filter to Good / Passing Students"
          >
            <span>Good</span>
            <span className="text-[10px] opacity-80 font-mono">({counts.satisfactory || 0})</span>
          </button>

          <button
            onClick={() => onSelectFilter(activeFilter === "NEEDS_IMPROVEMENT" ? "ALL" : "NEEDS_IMPROVEMENT")}
            className={clsx(
              "px-2.5 py-1 rounded text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1",
              activeFilter === "NEEDS_IMPROVEMENT"
                ? "bg-amber-600 text-white shadow-2xs"
                : "text-amber-800 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/50"
            )}
            title="Filter to Students Needing Improvement (75-79)"
          >
            <span>Needs Imprv</span>
            <span className="text-[10px] opacity-80 font-mono">({counts.needsImprovement || 0})</span>
          </button>

          <button
            onClick={() => onSelectFilter(activeFilter === "FAILED" ? "ALL" : "FAILED")}
            className={clsx(
              "px-2.5 py-1 rounded text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1",
              activeFilter === "FAILED"
                ? "bg-rose-600 text-white shadow-2xs"
                : "text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50"
            )}
            title="Filter to Failing Students (< 75.00)"
          >
            <span>Failed</span>
            <span className="text-[10px] opacity-80 font-mono">({counts.failed || 0})</span>
          </button>
        </div>

        {/* Smart Insights Modal Trigger Button */}
        <button
          onClick={onOpenAnalyticsModal}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 font-bold text-xs shadow-2xs transition-all cursor-pointer"
          title="Open Section Grade Insights"
        >
          <BarChart2 className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
          <span>Insights</span>
        </button>
      </div>
    </div>
  );
}
