import React, { useState } from "react";
import { Award } from "lucide-react";
import clsx from "clsx";
import EquivalenceScaleModal from "./EquivalenceScaleModal";

export default function SemestralGradeTable({
  semestralRows = [],
  activeFilter = "ALL",
  onClearFilter,
}) {
  const [showEquivModal, setShowEquivModal] = useState(false);

  const passedCount = semestralRows.filter(
    (r) => typeof r.semGrade === "number" && r.semGrade >= 75.0 && r.equivGrade !== "5.00"
  ).length;
  const failedCount = semestralRows.filter(
    (r) => typeof r.semGrade === "number" && (r.semGrade < 75.0 || r.equivGrade === "5.00")
  ).length;
  const pendingCount = semestralRows.filter(
    (r) => typeof r.semGrade !== "number" && r.remarks !== "AW" && r.remarks !== "UW"
  ).length;
  const withdrawnCount = semestralRows.filter(
    (r) => r.remarks === "AW" || r.remarks === "UW"
  ).length;

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-slate-900">
      {/* Equivalence Modal */}
      <EquivalenceScaleModal
        isOpen={showEquivModal}
        onClose={() => setShowEquivModal(false)}
      />

      {/* Top action / info bar */}
      <div className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 py-2 flex items-center justify-between text-xs text-slate-700 dark:text-slate-300">
        <div className="flex items-center gap-2">
          <span className="font-bold text-slate-800 dark:text-slate-100 text-sm">
            Final Semestral Summary
          </span>
          <span className="text-slate-400 dark:text-slate-500">|</span>
          <span className="text-slate-500 dark:text-slate-400 font-medium">
            Read-only • 50% Midterm + 50% Final Term
          </span>
          {activeFilter && activeFilter !== "ALL" && (
            <div className="flex items-center gap-1.5 bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-300 px-2 py-0.5 rounded-full text-[11px] font-bold border border-amber-300 dark:border-amber-700 ml-2">
              <span>Filtered: {activeFilter.replace("_", " ")}</span>
              {onClearFilter && (
                <button
                  onClick={onClearFilter}
                  className="hover:text-red-700 dark:hover:text-red-400 cursor-pointer ml-1 font-black"
                  title="Clear filter"
                >
                  ✕
                </button>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowEquivModal(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded border border-slate-300 dark:border-slate-700 font-semibold text-xs cursor-pointer shadow-2xs transition-colors"
            title="View Official 50–100 to 1.00–5.00 Equivalence Scale"
          >
            <Award className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
            Equivalence Scale
          </button>

          <span className="font-semibold text-slate-500 dark:text-slate-400">
            Total Students: {semestralRows.length}
          </span>
          <span className="text-emerald-700 dark:text-emerald-400 font-bold">
            Passed: {passedCount}
          </span>
          <span className="text-red-600 dark:text-red-400 font-bold">
            Failed: {failedCount}
          </span>
          <span className="font-bold text-slate-500 dark:text-slate-400">
            Pending: {pendingCount}
          </span>
          {withdrawnCount > 0 && (
            <span className="font-bold text-purple-700 dark:text-purple-300">
              Withdrawn: {withdrawnCount}
            </span>
          )}
        </div>
      </div>

      {/* Spreadsheet Table strictly matching Image 1 */}
      <div className="flex-1 overflow-auto">
        <table className="w-full border-collapse text-xs select-none">
          <thead className="sticky top-0 z-20 shadow-sm bg-white dark:bg-slate-900">
            {/* Header Row 1 */}
            <tr className="border-b border-slate-300 dark:border-slate-700 font-bold text-center text-slate-800 dark:text-slate-200">
              <th
                rowSpan={2}
                className="w-12 px-2 py-2 bg-slate-100 dark:bg-slate-800 border-r border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200"
              >
                #
              </th>
              <th
                className="min-w-[260px] px-4 pt-2 pb-0.5 bg-slate-100 dark:bg-slate-800 border-r border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100 text-center uppercase tracking-wide font-extrabold text-[13px]"
              >
                Names
              </th>
              <th
                rowSpan={2}
                className="w-14 px-2 py-2 bg-slate-100 dark:bg-slate-800 border-r border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200"
              >
                M.I.
              </th>
              <th
                className="w-28 px-3 pt-2 pb-0.5 bg-white dark:bg-slate-900 border-r border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-center uppercase tracking-wider font-extrabold text-[12px]"
              >
                MIDTERM TERM
              </th>
              <th
                className="w-28 px-3 pt-2 pb-0.5 bg-white dark:bg-slate-900 border-r border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-center uppercase tracking-wider font-extrabold text-[12px]"
              >
                FINAL TERM
              </th>
              <th
                rowSpan={2}
                className="w-28 px-3 py-2 bg-white dark:bg-slate-900 border-r border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-center uppercase tracking-wider font-extrabold text-[12px]"
              >
                SEM. GRADE
              </th>
              <th
                rowSpan={2}
                className="w-28 px-3 py-2 bg-white dark:bg-slate-900 border-r border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-center uppercase tracking-wider font-extrabold text-[12px]"
              >
                EQUIV.<br />GRADE
              </th>
              <th
                rowSpan={2}
                className="w-28 px-3 py-2 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-center uppercase tracking-wider font-extrabold text-[12px] border-r border-slate-300 dark:border-slate-700"
              >
                Remarks
              </th>
              <th
                rowSpan={2}
                className="w-36 px-3 py-2 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-center uppercase tracking-wider font-extrabold text-[12px]"
              >
                SMART<br />STATUS &amp; TREND
              </th>
            </tr>

            {/* Sub-header Row 2 matching Image 1 */}
            <tr className="border-b-2 border-slate-400 dark:border-slate-600 font-normal text-center text-[10px] text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-850">
              <th className="px-4 pb-1 pt-0 italic text-slate-500 dark:text-slate-400 font-sans border-r border-slate-300 dark:border-slate-700">
                (Strictly alphabetical order irrespective of sex)
              </th>
              <th className="py-1 font-bold text-slate-700 dark:text-slate-300 border-r border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900">
                50%
              </th>
              <th className="py-1 font-bold text-slate-700 dark:text-slate-300 border-r border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900">
                50%
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-mono">
            {semestralRows.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-16 text-center text-slate-400 dark:text-slate-500 italic font-sans">
                  {activeFilter && activeFilter !== "ALL"
                    ? `No students found matching filter "${activeFilter.replace("_", " ")}".`
                    : "No students in this section. Add or import students to generate semestral grades."}
                </td>
              </tr>
            ) : (
              semestralRows.map((row, idx) => {
                const isFailedFinal = typeof row.finalGrade === "number" && row.finalGrade < 75.0;
                const isFailedMidterm = typeof row.midtermGrade === "number" && row.midtermGrade < 75.0;
                const isFailedSem = typeof row.semGrade === "number" && (row.semGrade < 75.0 || row.equivGrade === "5.00");
                const isAWorUW = row.remarks === "AW" || row.remarks === "UW";

                return (
                  <tr
                    key={row.studentId}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/60 transition-colors"
                  >
                    {/* # Index */}
                    <td className="text-center py-2 px-1 border-r border-slate-200 dark:border-slate-800 font-sans font-semibold text-slate-500 dark:text-slate-400 bg-slate-50/50 dark:bg-slate-850/50 text-xs">
                      {idx + 1}
                    </td>

                    {/* NAMES */}
                    <td className="py-2 px-4 border-r border-slate-300 dark:border-slate-700 font-sans font-bold text-slate-800 dark:text-slate-100 text-[13px] uppercase">
                      <div className="flex items-center justify-between gap-1.5">
                        <span className="truncate max-w-[220px] sm:max-w-[280px]" title={row.name}>{row.name}</span>
                        <div className="flex items-center gap-1 shrink-0">
                          {isAWorUW && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] bg-red-100 dark:bg-red-950/80 text-red-700 dark:text-red-300 font-extrabold border border-red-200 dark:border-red-800">
                              {row.remarks}
                            </span>
                          )}
                          {row.smartJudgement?.isHighest && (
                            <span
                              className="px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 text-[10px] font-black shrink-0"
                              title={`#1 Highest Semestral Grade in Section (${typeof row.semGrade === "number" ? row.semGrade.toFixed(2) : row.semGrade})`}
                            >
                              Top 1
                            </span>
                          )}
                          {row.smartJudgement?.isLowest && (isFailedSem || row.equivGrade === "5.00") && (
                            <span
                              className="px-1.5 py-0.5 rounded bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-800 text-[10px] font-black shrink-0"
                              title={`Lowest Semestral Grade (${typeof row.semGrade === "number" ? row.semGrade.toFixed(2) : row.semGrade})`}
                            >
                              Lowest
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* M.I. (Middle Initial) */}
                    <td className="border-r border-slate-300 py-2 text-center font-bold text-slate-800 dark:border-slate-700 dark:text-slate-200">
                      {row.mi || "-"}
                    </td>

                    {/* MIDTERM TERM (50%) */}
                    <td
                      className={clsx(
                        "border-r border-slate-300 py-2 text-center text-xs dark:border-slate-700",
                        isFailedMidterm ? "font-bold text-red-600 dark:text-red-400" : "font-semibold text-slate-800 dark:text-slate-200"
                      )}
                      title="Calculated from the Midterm grade sheet"
                    >
                      {typeof row.midtermGrade === "number" ? row.midtermGrade.toFixed(2) : "-"}
                    </td>

                    {/* FINAL TERM (50%) - Highlights red if < 75.00 matching Image 1 */}
                    <td
                      className={clsx(
                        "border-r border-slate-300 py-2 text-center text-xs dark:border-slate-700",
                        isFailedFinal ? "font-bold text-red-600 dark:text-red-400" : "font-semibold text-slate-800 dark:text-slate-200"
                      )}
                      title="Calculated from the Final Term grade sheet"
                    >
                      {typeof row.finalGrade === "number" ? row.finalGrade.toFixed(2) : "-"}
                    </td>

                    {/* SEM. GRADE - Highlights bold red if < 75.00 matching Image 1 */}
                    <td
                      className={clsx(
                        "text-center py-2 border-r border-slate-300 dark:border-slate-700 font-black text-sm",
                        isFailedSem
                          ? "text-red-600 dark:text-red-400 font-extrabold bg-rose-50/50 dark:bg-rose-950/40"
                          : row.semGrade !== ""
                          ? "text-emerald-700 dark:text-emerald-400 font-extrabold bg-emerald-50/40 dark:bg-emerald-950/30"
                          : "text-slate-900 dark:text-slate-100"
                      )}
                    >
                      {row.semGrade !== "" && row.semGrade !== undefined
                        ? (typeof row.semGrade === "number" ? row.semGrade.toFixed(2) : row.semGrade)
                        : "-"}
                    </td>

                    {/* EQUIV. GRADE - Highlights bold red if 5.00 matching Image 1 */}
                    <td
                      className={clsx(
                        "text-center py-2 border-r border-slate-300 dark:border-slate-700 font-black text-xs md:text-sm",
                        row.equivGrade === "5.00" ? "text-red-600 dark:text-red-400 font-extrabold bg-rose-50/50 dark:bg-rose-950/40" : "text-slate-900 dark:text-slate-100 font-bold"
                      )}
                    >
                      {row.equivGrade || "-"}
                    </td>

                    {/* Remarks - Displays 'Failed' in RED text matching Image 1 */}
                    <td
                      className={clsx(
                        "text-center py-2 font-sans font-bold text-xs border-r border-slate-300 dark:border-slate-700",
                        isFailedSem || row.equivGrade === "5.00"
                          ? "text-red-600 dark:text-red-400"
                          : row.remarks === "Passed" || (!row.remarks && row.equivGrade && row.equivGrade !== "5.00")
                          ? "text-emerald-700 dark:text-emerald-400"
                          : "text-slate-400 dark:text-slate-500"
                      )}
                    >
                      {row.remarks || (row.equivGrade === "5.00" ? "Failed" : row.semGrade !== "" ? "Passed" : "-")}
                    </td>

                    {/* SMART JUDGEMENT & TREND */}
                    <td className="text-center py-1.5 px-2 font-sans">
                      {row.smartJudgement ? (
                        <div className="flex flex-col items-center gap-0.5">
                          <span
                            className={clsx(
                              "inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-black border tracking-tight shadow-2xs whitespace-nowrap",
                              row.smartJudgement.badgeColor
                            )}
                            title={`${row.smartJudgement.title}${row.smartJudgement.rank && row.smartJudgement.category !== "FAILED" ? ` (Rank #${row.smartJudgement.rank})` : ""}\n${row.smartJudgement.reason}\n${row.smartJudgement.actionAdvice || ""}`}
                          >
                            {row.smartJudgement.badge}
                          </span>
                          {row.smartJudgement.trajectoryType !== "NONE" && (
                            <span
                              className={clsx(
                                "text-[10px] font-bold whitespace-nowrap",
                                row.smartJudgement.trajectoryColor
                              )}
                              title={`Delta from Midterm to Finals: ${row.smartJudgement.delta !== null ? (row.smartJudgement.delta > 0 ? `+${row.smartJudgement.delta}` : row.smartJudgement.delta) : "N/A"}`}
                            >
                              {row.smartJudgement.trajectoryLabel}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400 dark:text-slate-500">-</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
