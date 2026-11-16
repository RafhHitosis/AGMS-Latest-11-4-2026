import React from "react";
import { AlertCircle, Award, TrendingUp } from "lucide-react";
import clsx from "clsx";

export default function SmartPerformanceRibbon({
  analytics,
  isSemestral = false,
  semestralRows = [],
}) {
  if (!analytics || !analytics.totalStudents) return null;

  const {
    average,
    gradedStudents,
    counts = {},
    highestGrade,
    lowestGrade,
    highestStudents = [],
    lowestStudents = [],
    hasDistinctLowest = false,
    mostImproved,
  } = analytics;

  const passedCount = Math.max(0, (gradedStudents || 0) - (counts.failed || 0));
  const passingRateRatio = gradedStudents ? passedCount / gradedStudents : null;
  const passingRate = passingRateRatio !== null
    ? `${(passingRateRatio * 100).toFixed(1)}%`
    : "-";
  const isPassingGood = passingRateRatio !== null && passingRateRatio >= 0.75;

  const hasHighest = highestGrade !== null && highestStudents.length > 0;
  const hasLowest = hasDistinctLowest && lowestGrade !== null && lowestStudents.length > 0;
  const semestralCounts = isSemestral
    ? semestralRows.reduce(
        (result, row) => {
          if (row.remarks === "AW" || row.remarks === "UW") {
            result.withdrawn += 1;
          } else if (typeof row.semGrade !== "number") {
            result.pending += 1;
          } else if (row.semGrade < 75 || row.equivGrade === "5.00") {
            result.failed += 1;
          } else {
            result.passed += 1;
          }
          return result;
        },
        { passed: 0, failed: 0, pending: 0, withdrawn: 0 }
      )
    : null;

  return (
    <div className="flex min-h-9 flex-nowrap items-center gap-2 overflow-x-auto border-b border-outline-variant/60 bg-surface/95 px-3 py-1.5 text-xs text-on-surface-variant backdrop-blur-sm dark:bg-surface-container-low/95 select-none">
      {/* Class Average Chip */}
      <div
        className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-outline-variant/60 bg-surface-container-high/40 px-2.5 py-1 text-xs"
        title="Class Average Grade"
      >
        <span className="text-[11px] font-medium text-on-surface-variant">Class Avg</span>
        <strong className="font-bold font-mono text-on-surface">
          {average > 0 ? average.toFixed(2) : "-"}
        </strong>
      </div>

      {/* Passing Rate Chip (The Percent Metric) */}
      <div
        className={clsx(
          "inline-flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold transition-colors",
          isPassingGood
            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300"
            : "border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-300"
        )}
        title={`Passing rate: ${passedCount} of ${gradedStudents || 0} students with grade >= 75.00`}
      >
        <span className="text-[11px] font-medium opacity-90">Passing</span>
        <strong className="font-bold font-mono">{passingRate}</strong>
      </div>

      {/* Top Student Chip */}
      {hasHighest && (
        <div
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-primary/25 bg-primary/8 px-2.5 py-1 text-xs text-on-surface"
          title={`${isSemestral ? "Semester" : "Term"} highest: ${highestStudents.map((student) => student.name).join(", ")} (${highestGrade.toFixed(2)})`}
        >
          <Award className="h-3.5 w-3.5 shrink-0 text-primary" />
          <span className="text-[11px] font-medium text-on-surface-variant">Top:</span>
          <span className="max-w-[160px] truncate font-medium text-on-surface">
            {highestStudents.length > 1
              ? `${highestStudents[0].name} (+${highestStudents.length - 1} tied)`
              : highestStudents[0].name}
          </span>
          <strong className="font-bold font-mono text-primary">{highestGrade.toFixed(2)}</strong>
        </div>
      )}

      {/* Lowest Student Chip */}
      {hasLowest && (
        <div
          className={clsx(
            "inline-flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs",
            lowestGrade < 75
              ? "border-rose-500/30 bg-rose-500/10 text-rose-800 dark:text-rose-300"
              : "border-outline-variant/60 bg-surface-container-high/40 text-on-surface-variant"
          )}
          title={`${isSemestral ? "Semester" : "Term"} lowest: ${lowestStudents.map((student) => student.name).join(", ")} (${lowestGrade.toFixed(2)})`}
        >
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          <span className="text-[11px] font-medium opacity-90">Lowest:</span>
          <span className="max-w-[140px] truncate font-medium">
            {lowestStudents.length > 1
              ? `${lowestStudents[0].name} (+${lowestStudents.length - 1} tied)`
              : lowestStudents[0].name}
          </span>
          <strong className="font-bold font-mono">{lowestGrade.toFixed(2)}</strong>
        </div>
      )}

      {/* Most Improved Chip (Semestral) */}
      {isSemestral && mostImproved?.delta > 0 && (
        <div
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-primary/20 bg-primary/5 px-2.5 py-1 text-xs text-on-surface"
          title="Largest improvement from midterm to final"
        >
          <TrendingUp className="h-3.5 w-3.5 text-primary" />
          <span className="text-[11px] font-medium text-on-surface-variant">Most Improved:</span>
          <span className="max-w-[130px] truncate font-medium">{mostImproved.name}</span>
          <strong className="font-bold font-mono text-primary">+{mostImproved.delta.toFixed(2)}</strong>
        </div>
      )}

      {/* Semestral Outcome Breakdown */}
      {semestralCounts && (
        <div className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-outline-variant/50 bg-surface-container-high/30 p-0.5 text-xs">
          <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-800 dark:text-emerald-300">
            Passed: <strong className="font-mono">{semestralCounts.passed}</strong>
          </span>
          {semestralCounts.failed > 0 && (
            <span className="inline-flex items-center gap-1 rounded-md bg-rose-500/10 px-2 py-0.5 text-[11px] font-semibold text-rose-800 dark:text-rose-300">
              Failed: <strong className="font-mono">{semestralCounts.failed}</strong>
            </span>
          )}
          {semestralCounts.pending > 0 && (
            <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/10 px-2 py-0.5 text-[11px] font-semibold text-amber-800 dark:text-amber-300">
              Pending: <strong className="font-mono">{semestralCounts.pending}</strong>
            </span>
          )}
          {semestralCounts.withdrawn > 0 && (
            <span className="inline-flex items-center gap-1 rounded-md bg-surface-container-high px-2 py-0.5 text-[11px] font-semibold text-on-surface-variant">
              Withdrawn: <strong className="font-mono">{semestralCounts.withdrawn}</strong>
            </span>
          )}
        </div>
      )}
    </div>
  );
}
