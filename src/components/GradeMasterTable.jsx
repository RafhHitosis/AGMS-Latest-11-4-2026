import React from "react";
import { Download, RefreshCw, Edit3 } from "lucide-react";
import clsx from "clsx";

export default function GradeMasterTable({
  computedRows = [],
  config = {},
  grades = {},
  onUpdateScore,
  onUpdateRtMax,
  onUpdateAtMax,
  onSyncAttendance,
  activeFilter = "ALL",
  onClearFilter,
}) {
  const peMax = Number(config?.pe_max) || 0;
  const meMax = Number(config?.me_max) || 50;
  const metMax = Math.max(1, peMax + meMax || 50);
  const quizItems = config?.quiz_items || [];
  const sumQuiz = quizItems.reduce((acc, it) => acc + (Number(it.max) || 0), 0);
  const totalQuizMax = sumQuiz > 0 ? sumQuiz : 225;
  const rtMax = config?.rt_max !== undefined && config?.rt_max !== null ? config.rt_max : 50;
  const atMax = config?.at_max !== undefined && config?.at_max !== null ? config.at_max : 36;

  const weights = config?.weights || {};
  const meW = ((Number(weights.me) || 0.40) * 100).toFixed(0);
  const qW = ((Number(weights.quiz) || 0.25) * 100).toFixed(0);
  const rW = ((Number(weights.rec) || 0.25) * 100).toFixed(0);
  const dW = ((Number(weights.dep) || 0.05) * 100).toFixed(0);
  const aW = ((Number(weights.att) || 0.05) * 100).toFixed(0);

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-slate-900">
      {/* Top ribbon */}
      <div className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 py-2 flex items-center justify-between text-xs text-slate-700 dark:text-slate-300">
        <div className="flex items-center gap-2">
          <span className="font-bold text-slate-800 dark:text-slate-100">
            Master Grade Sheet
          </span>
          {activeFilter && activeFilter !== "ALL" && (
            <div className="flex items-center gap-1.5 bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-300 px-2 py-0.5 rounded-full text-[11px] font-bold border border-amber-300 dark:border-amber-700">
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
          {onSyncAttendance && (
            <button
              onClick={onSyncAttendance}
              className="flex items-center gap-1.5 px-2.5 py-1 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded border border-slate-300 dark:border-slate-700 font-semibold text-xs cursor-pointer shadow-2xs transition-colors"
              title="Copy present days from daily attendance logs into AT for this section"
            >
              <RefreshCw className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
              Sync Attendance
            </button>
          )}
          <span className="font-semibold text-slate-500 dark:text-slate-400">
            Total Students: {computedRows.length}
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <table className="w-full border-collapse text-xs select-none">
          <thead className="sticky top-0 z-20 shadow-sm bg-white dark:bg-slate-900">
            {/* Top Categories Row strictly matching Image 1 */}
            <tr className="border-b border-slate-300 dark:border-slate-700 font-bold text-center">
              <th
                rowSpan={2}
                className="w-10 px-2 py-2 bg-slate-100 dark:bg-slate-800 border-r border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200"
              >
                NO
              </th>
              <th
                rowSpan={2}
                className="min-w-[220px] max-w-[320px] px-4 py-2 bg-slate-100 dark:bg-slate-800 border-r border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-left"
              >
                NAME
              </th>

              {/* Major Exam Category (Matching Image 1: MET, MER, MEP) */}
              <th
                colSpan={3}
                className="py-1.5 px-2 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border-r border-slate-300 dark:border-slate-700 tracking-wider uppercase text-[11px]"
              >
                Major Exam
              </th>

              {/* Quiz Category (Matching Image 1: QT, QR, QP) */}
              <th
                colSpan={3}
                className="py-1.5 px-2 bg-rose-50 dark:bg-rose-950/40 text-slate-900 dark:text-rose-200 border-r border-slate-300 dark:border-slate-700 tracking-wider uppercase text-[11px]"
              >
                Quiz
              </th>

              {/* Recitation Category (Matching Image 1: RT, RR, RP) */}
              <th
                colSpan={3}
                className="py-1.5 px-2 bg-emerald-50 dark:bg-emerald-950/40 text-slate-900 dark:text-emerald-200 border-r border-slate-300 dark:border-slate-700 tracking-wider uppercase text-[11px]"
              >
                Recitation
              </th>

              {/* Deportment Category (Matching Image 1: DR, DP) */}
              <th
                colSpan={2}
                className="py-1.5 px-2 bg-orange-50 dark:bg-orange-950/40 text-slate-900 dark:text-orange-200 border-r border-slate-300 dark:border-slate-700 tracking-wider uppercase text-[11px]"
              >
                Deportment
              </th>

              {/* Attendance Category (Matching Image 1: AT, AR, AP) */}
              <th
                colSpan={3}
                className="py-1.5 px-2 bg-rose-100 dark:bg-rose-950/60 text-slate-900 dark:text-rose-200 border-r border-slate-300 dark:border-slate-700 tracking-wider uppercase text-[11px]"
              >
                Attendance
              </th>

              {/* CS Category */}
              <th
                rowSpan={2}
                className="w-16 px-2 py-2 bg-sky-200 dark:bg-sky-900 text-sky-950 dark:text-sky-100 border-r border-slate-300 dark:border-slate-700 tracking-wider font-extrabold uppercase"
              >
                CS
              </th>

              {/* Final Grade Category */}
              <th
                rowSpan={2}
                className="w-20 px-2 py-2 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border-r border-slate-300 dark:border-slate-700 tracking-wider font-black uppercase text-xs"
              >
                G<br/>R<br/>A<br/>D<br/>E
              </th>

              {/* Smart Judgement Category */}
              <th
                rowSpan={2}
                className="w-28 px-2 py-2 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border-r border-slate-300 dark:border-slate-700 tracking-wider font-black uppercase text-xs"
              >
                SMART<br/>STATUS
              </th>

              {/* Index Column at end (matching Image 1) */}
              <th
                rowSpan={2}
                className="w-10 px-2 py-2 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-semibold"
              >
                #
              </th>
            </tr>

            {/* Sub-column Codes Row */}
            <tr className="border-b border-slate-300 dark:border-slate-700 text-center font-bold text-[11px]">
              {/* Major Exam */}
              <th className="w-12 py-1 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-r border-slate-200 dark:border-slate-700">MET</th>
              <th className="w-12 py-1 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-r border-slate-200 dark:border-slate-700">MER</th>
              <th className="w-14 py-1 bg-sky-200 dark:bg-sky-950/80 text-sky-950 dark:text-sky-200 border-r border-slate-300 dark:border-slate-700">MEP</th>

              {/* Quiz */}
              <th className="w-12 py-1 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-r border-slate-200 dark:border-slate-700">QT</th>
              <th className="w-12 py-1 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-r border-slate-200 dark:border-slate-700">QR</th>
              <th className="w-14 py-1 bg-amber-100 dark:bg-amber-950/80 text-amber-950 dark:text-amber-200 border-r border-slate-300 dark:border-slate-700">QP</th>

              {/* Recitation */}
              <th className="w-12 py-1 bg-emerald-100/50 dark:bg-emerald-950/50 text-slate-800 dark:text-emerald-200 border-r border-slate-200 dark:border-slate-700" title="Directly editable recitation total">RT</th>
              <th className="w-12 py-1 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-r border-slate-200 dark:border-slate-700">RR</th>
              <th className="w-14 py-1 bg-emerald-100 dark:bg-emerald-950/80 text-emerald-950 dark:text-emerald-200 border-r border-slate-300 dark:border-slate-700">RP</th>

              {/* Deportment */}
              <th className="w-12 py-1 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-r border-slate-200 dark:border-slate-700">DR</th>
              <th className="w-14 py-1 bg-orange-100 dark:bg-orange-950/80 text-orange-950 dark:text-orange-200 border-r border-slate-300 dark:border-slate-700">DP</th>

              {/* Attendance */}
              <th className="w-12 py-1 bg-rose-100/50 dark:bg-rose-950/50 text-slate-800 dark:text-rose-200 border-r border-slate-200 dark:border-slate-700" title="Directly editable attendance present days">AT</th>
              <th className="w-12 py-1 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-r border-slate-200 dark:border-slate-700">AR</th>
              <th className="w-14 py-1 bg-rose-200 dark:bg-rose-950/80 text-rose-950 dark:text-rose-200 border-r border-slate-300 dark:border-slate-700">AP</th>
            </tr>

            {/* Weights and Max Points Spec Row matching Image 1 */}
            <tr className="border-b-2 border-slate-400 dark:border-slate-600 bg-white dark:bg-slate-900 text-center text-[10px] font-bold text-slate-700 dark:text-slate-300">
              <td className="border-r border-slate-300 dark:border-slate-700 py-1 bg-slate-50 dark:bg-slate-800"></td>
              <td className="border-r border-slate-300 dark:border-slate-700 py-1 px-4 text-left uppercase text-slate-400"></td>

              {/* Major Exam MET Max */}
              <td className="border-r border-slate-200 dark:border-slate-700 py-1 text-slate-800 dark:text-slate-200 font-bold text-center">
                {metMax}
              </td>
              <td className="border-r border-slate-200 dark:border-slate-700 py-1"></td>
              <td className="border-r border-slate-300 dark:border-slate-700 py-1 font-bold text-sky-950 dark:text-sky-200 bg-sky-200 dark:bg-sky-950/80">{meW}%</td>

              {/* Quiz */}
              <td className="border-r border-slate-200 dark:border-slate-700 py-1 text-slate-800 dark:text-slate-200">{totalQuizMax}</td>
              <td className="border-r border-slate-200 dark:border-slate-700 py-1"></td>
              <td className="border-r border-slate-300 dark:border-slate-700 py-1 font-bold text-amber-950 dark:text-amber-200 bg-amber-100 dark:bg-amber-950/80">{qW}%</td>

              {/* Recitation */}
              <td className="border-r border-slate-200 dark:border-slate-700 py-1 text-slate-800 dark:text-slate-200">
                <input
                  type="text"
                  inputMode="decimal"
                  value={rtMax}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v === "" || /^[0-9]*\.?[0-9]*$/.test(v)) {
                      onUpdateRtMax && onUpdateRtMax(v);
                    }
                  }}
                  className="w-10 h-6 text-center font-bold bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-700 rounded text-xs text-emerald-950 dark:text-emerald-200 focus:ring-1 focus:ring-emerald-500 outline-none"
                  title="Recitation Max Points"
                />
              </td>
              <td className="border-r border-slate-200 dark:border-slate-700 py-1"></td>
              <td className="border-r border-slate-300 dark:border-slate-700 py-1 font-bold text-emerald-950 dark:text-emerald-200 bg-emerald-100 dark:bg-emerald-950/80">{rW}%</td>

              {/* Deportment */}
              <td className="border-r border-slate-200 dark:border-slate-700 py-1"></td>
              <td className="border-r border-slate-300 dark:border-slate-700 py-1 font-bold text-orange-950 dark:text-orange-200 bg-orange-100 dark:bg-orange-950/80">{dW}%</td>

              {/* Attendance */}
              <td className="border-r border-slate-200 dark:border-slate-700 py-1 text-slate-800 dark:text-slate-200">
                <input
                  type="text"
                  inputMode="decimal"
                  value={atMax}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v === "" || /^[0-9]*\.?[0-9]*$/.test(v)) {
                      onUpdateAtMax && onUpdateAtMax(v);
                    }
                  }}
                  className="w-10 h-6 text-center font-bold bg-rose-50 dark:bg-rose-950/80 border border-rose-300 dark:border-rose-700 rounded text-xs text-rose-950 dark:text-rose-200 focus:ring-1 focus:ring-rose-500 outline-none"
                  title="Attendance Max Sessions"
                />
              </td>
              <td className="border-r border-slate-200 dark:border-slate-700 py-1"></td>
              <td className="border-r border-slate-300 dark:border-slate-700 py-1 font-bold text-rose-950 dark:text-rose-200 bg-rose-200 dark:bg-rose-950/80">{aW}%</td>

              {/* CS */}
              <td className="border-r border-slate-300 dark:border-slate-700 py-1 font-extrabold text-sky-950 dark:text-sky-200 bg-sky-200 dark:bg-sky-950/80">60%</td>

              {/* Final Grade */}
              <td className="border-r border-slate-300 dark:border-slate-700 py-1 font-black text-slate-800 dark:text-slate-100 bg-slate-100 dark:bg-slate-800">100%</td>

              {/* Smart Status Header */}
              <td className="border-r border-slate-300 dark:border-slate-700 py-1 font-bold text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 text-[10px]">JUDGEMENT</td>

              {/* End Column */}
              <td className="py-1 bg-slate-50 dark:bg-slate-800"></td>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
            {computedRows.length === 0 ? (
              <tr>
                <td colSpan={20} className="py-16 text-center text-slate-400 italic font-sans">
                  {activeFilter && activeFilter !== "ALL"
                    ? `No students found matching filter "${activeFilter.replace("_", " ")}".`
                    : "No students in this section. Add or import students to start grading."}
                </td>
              </tr>
            ) : (
              computedRows.map((row, idx) => {
                const isAWorUW = row.remarks === "AW" || row.remarks === "UW";
                const isPassing = typeof row.finalGrade === "number" && row.finalGrade >= 75.0;
                const s = grades[row.studentId] || {};

                return (
                  <tr
                    key={row.studentId}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/60 transition-colors font-mono"
                  >
                    {/* NO */}
                    <td className="text-center py-1.5 px-1 border-r border-slate-200 dark:border-slate-800 font-sans font-semibold text-slate-500 dark:text-slate-400 bg-slate-50/50 dark:bg-slate-850/50">
                      {idx + 1}
                    </td>

                    {/* NAME */}
                    <td className="py-1.5 px-3 border-r border-slate-300 dark:border-slate-700 font-sans font-bold text-slate-800 dark:text-slate-100">
                      <div className="flex items-center justify-between gap-1.5">
                        <span className="truncate max-w-[200px] sm:max-w-[280px]" title={row.name}>{row.name}</span>
                        <div className="flex items-center gap-1 shrink-0">
                          {row.remarks && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] bg-red-100 dark:bg-red-950/80 text-red-700 dark:text-red-300 font-extrabold border border-red-200 dark:border-red-800">
                              {row.remarks}
                            </span>
                          )}
                          {row.smartJudgement?.isHighest && (
                            <span
                              className="px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 text-[10px] font-black shrink-0"
                              title={`#1 Highest Grade in Section (${typeof row.finalGrade === "number" ? row.finalGrade.toFixed(2) : row.finalGrade})`}
                            >
                              Top 1
                            </span>
                          )}
                          {row.smartJudgement?.isLowest && row.smartJudgement?.category === "FAILED" && (
                            <span
                              className="px-1.5 py-0.5 rounded bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-800 text-[10px] font-black shrink-0"
                              title={`Lowest Grade in Section (${typeof row.finalGrade === "number" ? row.finalGrade.toFixed(2) : row.finalGrade})`}
                            >
                              Lowest
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* MET (from Input Ground) */}
                    <td className="text-center py-1.5 border-r border-slate-200 dark:border-slate-800 font-medium text-slate-700 dark:text-slate-300">
                      {row.met !== "" ? row.met : "-"}
                    </td>

                    {/* MER */}
                    <td className="text-center py-1.5 border-r border-slate-200 dark:border-slate-800 font-medium text-slate-700 dark:text-slate-300">
                      {row.mer !== "" ? row.mer : "-"}
                    </td>

                    {/* MEP (40%) */}
                    <td className="text-center py-1.5 border-r border-slate-300 dark:border-slate-700 font-bold bg-sky-200/50 dark:bg-sky-950/50 text-sky-950 dark:text-sky-300">
                      {row.mep !== "" ? Number(row.mep).toFixed(2) : "-"}
                    </td>

                    {/* QT (from Input Ground) */}
                    <td className="text-center py-1.5 border-r border-slate-200 dark:border-slate-800 font-medium text-slate-700 dark:text-slate-300">
                      {row.qt !== "" ? row.qt : "-"}
                    </td>

                    {/* QR */}
                    <td className="text-center py-1.5 border-r border-slate-200 dark:border-slate-800 font-medium text-slate-700 dark:text-slate-300">
                      {row.qr !== "" ? row.qr : "-"}
                    </td>

                    {/* QP (25%) */}
                    <td className="text-center py-1.5 border-r border-slate-300 dark:border-slate-700 font-bold bg-amber-100/50 dark:bg-amber-950/50 text-amber-950 dark:text-amber-300">
                      {row.qp !== "" ? Number(row.qp).toFixed(2) : "-"}
                    </td>

                    {/* RT (Recitation Total - Directly editable in Main Sheet) */}
                    <td className="p-0 border-r border-slate-200 dark:border-slate-800">
                      {onUpdateScore ? (
                        <input
                          type="text"
                          inputMode="decimal"
                          className="w-full h-8 text-center text-xs font-semibold focus:bg-emerald-50 dark:focus:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none"
                          value={s.rt !== undefined && s.rt !== null ? s.rt : ""}
                          onFocus={(e) => e.target.select()}
                          onChange={(e) => {
                            const v = e.target.value;
                            if (v === "" || /^[0-9]*\.?[0-9]*$/.test(v)) {
                              onUpdateScore(row.studentId, "rt", v);
                            }
                          }}
                          placeholder="-"
                        />
                      ) : (
                        <div className="text-center py-1.5 text-slate-700 dark:text-slate-300">{row.rt !== "" ? row.rt : "-"}</div>
                      )}
                    </td>

                    {/* RR */}
                    <td className="text-center py-1.5 border-r border-slate-200 dark:border-slate-800 font-medium text-slate-700 dark:text-slate-300">
                      {row.rr !== "" ? row.rr : "-"}
                    </td>

                    {/* RP (25%) */}
                    <td className="text-center py-1.5 border-r border-slate-300 dark:border-slate-700 font-bold bg-emerald-100/50 dark:bg-emerald-950/50 text-emerald-950 dark:text-emerald-300">
                      {row.rp !== "" ? Number(row.rp).toFixed(2) : "-"}
                    </td>

                    {/* DR */}
                    <td className="text-center py-1.5 border-r border-slate-200 dark:border-slate-800 font-medium text-slate-700 dark:text-slate-300">
                      {row.dr !== "" ? Number(row.dr).toFixed(2) : "-"}
                    </td>

                    {/* DP (5%) */}
                    <td className="text-center py-1.5 border-r border-slate-300 dark:border-slate-700 font-bold bg-orange-100/50 dark:bg-orange-950/50 text-orange-950 dark:text-orange-300">
                      {row.dp !== "" ? Number(row.dp).toFixed(2) : "-"}
                    </td>

                    {/* AT (Attendance Total - Directly editable in Main Sheet) */}
                    <td className="p-0 border-r border-slate-200 dark:border-slate-800">
                      {onUpdateScore ? (
                        <input
                          type="text"
                          inputMode="decimal"
                          className="w-full h-8 text-center text-xs font-semibold focus:bg-rose-50 dark:focus:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none"
                          value={s.at !== undefined && s.at !== null ? s.at : ""}
                          onFocus={(e) => e.target.select()}
                          onChange={(e) => {
                            const v = e.target.value;
                            if (v === "" || /^[0-9]*\.?[0-9]*$/.test(v)) {
                              onUpdateScore(row.studentId, "at", v);
                            }
                          }}
                          placeholder="-"
                        />
                      ) : (
                        <div className="text-center py-1.5 text-slate-700 dark:text-slate-300">{row.at !== "" ? row.at : "-"}</div>
                      )}
                    </td>

                    {/* AR */}
                    <td className="text-center py-1.5 border-r border-slate-200 dark:border-slate-800 font-medium text-slate-700 dark:text-slate-300">
                      {row.ar !== "" ? Number(row.ar).toFixed(2) : "-"}
                    </td>

                    {/* AP (5%) */}
                    <td className="text-center py-1.5 border-r border-slate-300 dark:border-slate-700 font-bold bg-rose-200/50 dark:bg-rose-950/50 text-rose-950 dark:text-rose-300">
                      {row.ap !== "" ? Number(row.ap).toFixed(2) : "-"}
                    </td>

                    {/* CS (60%) */}
                    <td className="text-center py-1.5 border-r border-slate-300 dark:border-slate-700 font-black bg-sky-100 dark:bg-sky-950/80 text-sky-950 dark:text-sky-200 text-[13px]">
                      {row.cs !== "" ? Number(row.cs).toFixed(2) : "-"}
                    </td>

                    {/* FINAL GRADE */}
                    <td
                      className={clsx(
                        "text-center py-1.5 font-black text-sm border-r border-slate-300 dark:border-slate-700",
                        isAWorUW
                          ? "bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300"
                          : !isPassing && row.finalGrade !== ""
                          ? "bg-rose-100/80 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400"
                          : isPassing
                          ? "bg-emerald-50/70 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300"
                          : "text-slate-400 dark:text-slate-500"
                      )}
                    >
                      {row.finalGrade !== ""
                        ? typeof row.finalGrade === "number"
                          ? row.finalGrade.toFixed(2)
                          : row.finalGrade
                        : "-"}
                    </td>

                    {/* SMART JUDGEMENT STATUS */}
                    <td className="text-center py-1 px-2 border-r border-slate-300 dark:border-slate-700 font-sans">
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
                          {row.smartJudgement.rank && row.smartJudgement.category !== "FAILED" && (
                            <span className="text-[9px] text-slate-400 dark:text-slate-500 font-medium font-sans">
                              Rank #{row.smartJudgement.rank}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400 dark:text-slate-500">-</span>
                      )}
                    </td>

                    {/* Index column at end (matching Image 1) */}
                    <td className="text-center py-1.5 px-1 font-sans text-slate-400 dark:text-slate-500 bg-slate-50/50 dark:bg-slate-850/50 text-[11px]">
                      {idx + 1}
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
