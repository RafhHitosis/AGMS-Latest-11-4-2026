import React, { useState } from "react";
import {
  X,
  Calendar,
  Calculator,
  ArrowRight,
  UserCheck,
  Award,
  Info,
  HelpCircle,
  FileSpreadsheet,
  CheckCircle2,
} from "lucide-react";

export default function GradeComputationGuideModal({ isOpen, onClose }) {
  const [guideFilter, setGuideFilter] = useState("all");

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[92vh] border border-slate-200 dark:border-slate-800">
        {/* Header */}
        <div className="bg-slate-800 dark:bg-slate-950 text-white px-6 py-4 flex items-center justify-between shrink-0 border-b border-slate-700/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
              <HelpCircle className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <h2 className="font-bold text-base sm:text-lg">Grade Computation Guide</h2>
              <p className="text-xs text-slate-300 dark:text-slate-400">
                Official MS Excel formulas, step-by-step calculations, and attendance/deportment rules
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-700 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-300 cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Navigation Pills */}
        <div className="border-b border-slate-200 dark:border-slate-800 px-6 py-2.5 bg-slate-50 dark:bg-slate-850 flex items-center gap-1.5 overflow-x-auto text-xs shrink-0 cursor-grab">
          <button
            onClick={() => setGuideFilter("all")}
            className={`px-3 py-1 rounded-full font-bold whitespace-nowrap transition-colors cursor-pointer ${guideFilter === "all"
              ? "bg-slate-800 dark:bg-emerald-600 text-white shadow-2xs"
              : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-750"
              }`}
          >
            All Topics
          </button>
          <button
            onClick={() => setGuideFilter("deportment")}
            className={`px-3 py-1 rounded-full font-bold whitespace-nowrap transition-colors cursor-pointer flex items-center gap-1 ${guideFilter === "deportment"
              ? "bg-emerald-700 dark:bg-emerald-600 text-white shadow-2xs"
              : "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/50"
              }`}
          >
            <Calendar className="w-3 h-3" />
            Deportment &amp; Attendance
          </button>
          <button
            onClick={() => setGuideFilter("ratings")}
            className={`px-3 py-1 rounded-full font-bold whitespace-nowrap transition-colors cursor-pointer flex items-center gap-1 ${guideFilter === "ratings"
              ? "bg-slate-800 dark:bg-emerald-600 text-white shadow-2xs"
              : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-750"
              }`}
          >
            <FileSpreadsheet className="w-3 h-3" />
            Ratings &amp; MS Excel Formulas
          </button>
          <button
            onClick={() => setGuideFilter("example")}
            className={`px-3 py-1 rounded-full font-bold whitespace-nowrap transition-colors cursor-pointer flex items-center gap-1 ${guideFilter === "example"
              ? "bg-slate-800 dark:bg-emerald-600 text-white shadow-2xs"
              : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-750"
              }`}
          >
            <Calculator className="w-3 h-3" />
            Sample Student Walkthrough
          </button>
          <button
            onClick={() => setGuideFilter("semestral")}
            className={`px-3 py-1 rounded-full font-bold whitespace-nowrap transition-colors cursor-pointer flex items-center gap-1 ${guideFilter === "semestral"
              ? "bg-slate-800 dark:bg-emerald-600 text-white shadow-2xs"
              : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-750"
              }`}
          >
            <Award className="w-3 h-3" />
            Semestral &amp; Official Grade Scale
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-5 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
          {/* FLOW SUMMARY BANNER */}
          {(guideFilter === "all" || guideFilter === "ratings") && (
            <div className="bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200 mb-2">
                <Calculator className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>How Grade Data Flows on the Main Grade Sheet (Left to Right)</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-[11px] font-medium text-slate-600 dark:text-slate-300">
                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 shadow-2xs">
                  <div className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase">Step 1 • Raw Input</div>
                  <div className="font-bold text-slate-800 dark:text-slate-100 mt-0.5">MET, QT, RT, AT</div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">Raw points entered by the teacher</div>
                </div>
                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 shadow-2xs">
                  <div className="text-[10px] font-bold text-sky-700 dark:text-sky-400 uppercase">Step 2 • Ratings</div>
                  <div className="font-bold text-slate-800 dark:text-slate-100 mt-0.5">MER, QR, RR, DR, AR</div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">Transmuted to 50–100 or 70–95 base</div>
                </div>
                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 shadow-2xs">
                  <div className="text-[10px] font-bold text-amber-700 dark:text-amber-400 uppercase">Step 3 • Percentages</div>
                  <div className="font-bold text-slate-800 dark:text-slate-100 mt-0.5">MEP (40%) + CS (60%)</div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">Weighted share per assessment</div>
                </div>
                <div className="bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-lg p-2.5 shadow-2xs">
                  <div className="text-[10px] font-bold text-emerald-800 dark:text-emerald-300 uppercase">Step 4 • Final Grade</div>
                  <div className="font-bold text-emerald-900 dark:text-emerald-200 mt-0.5">Term Grade (100%)</div>
                  <div className="text-[10px] text-emerald-700 dark:text-emerald-400 mt-1">50% Midterm + 50% Finals = Sem Grade</div>
                </div>
              </div>
            </div>
          )}

          {/* SECTION: DEPORTMENT & ATTENDANCE CONNECTION */}
          {(guideFilter === "all" || guideFilter === "deportment") && (
            <div className="bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-emerald-200/70 dark:border-emerald-800">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md bg-emerald-600 text-white flex items-center justify-center">
                    <Calendar className="w-3.5 h-3.5" />
                  </div>
                  <h3 className="font-bold text-xs sm:text-sm text-emerald-950 dark:text-emerald-200 uppercase tracking-wide">
                    Deportment &amp; Attendance Connection <br /> Paano Nakuha ang Deportment?
                  </h3>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                  10% Total Term Impact
                </span>
              </div>

              <div className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed space-y-2.5">
                <p>
                  In this grading system, <strong>Deportment (DR)</strong> is not an arbitrary or manually guessed conduct score.
                  Instead, <strong>it is computed automatically based on the student&apos;s attendance records</strong>.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* Attendance Card */}
                  <div className="bg-white dark:bg-slate-800 border border-emerald-200 dark:border-emerald-800 rounded-lg p-3 space-y-1.5 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-900 dark:text-emerald-300">
                        <UserCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        <span>1. Attendance Rating (AR)</span>
                      </div>
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                        5% Weight
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-300">
                      Measures actual presence. Scaled from <strong>70 (minimum base) to 95 (perfect attendance)</strong>.
                    </p>
                    <div className="bg-slate-50 dark:bg-slate-850 p-2 rounded border border-slate-200 dark:border-slate-700 space-y-1">
                      <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase flex items-center gap-1">
                        <FileSpreadsheet className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                        <span>MS Excel Formula:</span>
                      </div>
                      <code className="text-[11px] font-mono text-emerald-800 dark:text-emerald-300 block break-all font-semibold">
                        =ROUND((AT / TotalDays) * (95 - 70) + 70, 2)
                      </code>
                    </div>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">
                      <strong>Weighted Contribution (AP):</strong> <code>=ROUND(AR * 5%, 2)</code> (Max: 4.75%)
                    </p>
                  </div>

                  {/* Deportment Card */}
                  <div className="bg-white dark:bg-slate-800 border border-emerald-200 dark:border-emerald-800 rounded-lg p-3 space-y-1.5 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-900 dark:text-emerald-300">
                        <Award className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        <span>2. Deportment Rating (DR)</span>
                      </div>
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                        5% Weight
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-300">
                      Every student starts with a <strong>baseline score of 90.00</strong>. Each unexcused absence deducts points.
                    </p>
                    <div className="bg-slate-50 dark:bg-slate-850 p-2 rounded border border-slate-200 dark:border-slate-700 space-y-1">
                      <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase flex items-center gap-1">
                        <FileSpreadsheet className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                        <span>MS Excel Formula (Standard 36 Sessions):</span>
                      </div>
                      <code className="text-[11px] font-mono text-emerald-800 dark:text-emerald-300 block break-all font-semibold">
                        =90 - ((TotalDays - AT) * 1.5)
                      </code>
                    </div>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">
                      <strong>Weighted Contribution (DP):</strong> <code>=ROUND(DR * 5%, 2)</code> (Max: 4.50%)
                    </p>
                  </div>
                </div>

                {/* Absence Deductions Rule */}
                <div className="bg-white/90 dark:bg-slate-800/90 border border-emerald-200 dark:border-emerald-800 rounded-lg p-2.5 text-[11px] space-y-1">
                  <span className="font-bold text-slate-800 dark:text-slate-100">Official Absence Deduction Rules in MS Excel:</span>
                  <p className="text-slate-600 dark:text-slate-300 text-[10px]">
                    <code>=IF(TotalDays &lt;= 5, Absences * 4, IF(TotalDays &lt;= 10, Absences * 2.5, Absences * 1.5))</code>
                  </p>
                  <p className="text-slate-500 dark:text-slate-400 text-[10px]">
                    In a standard 36-session semester, each absence automatically subtracts <strong>1.5 points</strong> from the 90.00 base.
                  </p>
                </div>

                {/* Comparison Table */}
                <div className="overflow-x-auto pt-1">
                  <table className="w-full text-left text-[11px] border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                    <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold border-b border-slate-200 dark:border-slate-700">
                      <tr>
                        <th className="py-1.5 px-2.5">Days Present / 36</th>
                        <th className="py-1.5 px-2">Absences</th>
                        <th className="py-1.5 px-2">Attendance Rating (AR)</th>
                        <th className="py-1.5 px-2">AR 5%</th>
                        <th className="py-1.5 px-2">Deportment Rating (DR)</th>
                        <th className="py-1.5 px-2">DR 5%</th>
                        <th className="py-1.5 px-2 font-bold text-emerald-800 dark:text-emerald-300">Combined (10% Max)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-850 font-medium text-slate-600 dark:text-slate-300">
                      <tr>
                        <td className="py-1.5 px-2.5 font-bold text-slate-800 dark:text-slate-100">36 / 36</td>
                        <td className="py-1.5 px-2 text-emerald-700 dark:text-emerald-400 font-bold">0</td>
                        <td className="py-1.5 px-2">95.00</td>
                        <td className="py-1.5 px-2">4.75%</td>
                        <td className="py-1.5 px-2">90.00</td>
                        <td className="py-1.5 px-2">4.50%</td>
                        <td className="py-1.5 px-2 font-black text-emerald-700 dark:text-emerald-400">9.25%</td>
                      </tr>
                      <tr className="bg-slate-50/50 dark:bg-slate-800/40">
                        <td className="py-1.5 px-2.5 font-bold text-slate-800 dark:text-slate-100">34 / 36</td>
                        <td className="py-1.5 px-2 text-amber-700 dark:text-amber-400 font-bold">2</td>
                        <td className="py-1.5 px-2">93.61</td>
                        <td className="py-1.5 px-2">4.68%</td>
                        <td className="py-1.5 px-2">87.00</td>
                        <td className="py-1.5 px-2">4.35%</td>
                        <td className="py-1.5 px-2 font-black text-emerald-700 dark:text-emerald-400">9.03%</td>
                      </tr>
                      <tr>
                        <td className="py-1.5 px-2.5 font-bold text-slate-800 dark:text-slate-100">32 / 36</td>
                        <td className="py-1.5 px-2 text-amber-700 dark:text-amber-400 font-bold">4</td>
                        <td className="py-1.5 px-2">92.22</td>
                        <td className="py-1.5 px-2">4.61%</td>
                        <td className="py-1.5 px-2">84.00</td>
                        <td className="py-1.5 px-2">4.20%</td>
                        <td className="py-1.5 px-2 font-black text-emerald-700 dark:text-emerald-400">8.81%</td>
                      </tr>
                      <tr className="bg-slate-50/50 dark:bg-slate-800/40">
                        <td className="py-1.5 px-2.5 font-bold text-slate-800 dark:text-slate-100">30 / 36</td>
                        <td className="py-1.5 px-2 text-rose-700 dark:text-rose-400 font-bold">6</td>
                        <td className="py-1.5 px-2">90.83</td>
                        <td className="py-1.5 px-2">4.54%</td>
                        <td className="py-1.5 px-2">81.00</td>
                        <td className="py-1.5 px-2">4.05%</td>
                        <td className="py-1.5 px-2 font-black text-emerald-700 dark:text-emerald-400">8.59%</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <p className="text-[11px] text-slate-500 dark:text-slate-400 italic">
                  Takeaway: Consistent attendance safeguards both Attendance (5%) and Deportment (5%), directly securing 10% of the student&apos;s grade.
                </p>
              </div>
            </div>
          )}

          {/* SECTION: EVERY GRADE RATING COMPUTATION & MS EXCEL FORMULAS */}
          {(guideFilter === "all" || guideFilter === "ratings") && (
            <div className="space-y-3">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>How Every Rating is Calculated (with MS Excel Formulas)</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* 1. Major Exam */}
                <div className="border border-slate-200 dark:border-slate-700 rounded-xl p-3.5 bg-white dark:bg-slate-800 space-y-2 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-sky-950 dark:text-sky-300">1. Major Exam (MET, MER, MEP)</span>
                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
                      40% Weight
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-600 dark:text-slate-300 space-y-1">
                    <p>
                      <strong>Raw MET:</strong> <code>=(PE + ME + Plus) - Minus</code>
                    </p>
                    <p className="text-slate-500 dark:text-slate-400 text-[10px]">
                      Sum of preliminary exam, major exam, plus incentives, minus deductions.
                    </p>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-850 p-2 rounded border border-slate-200 dark:border-slate-700 space-y-1">
                    <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase block">MS Excel Formula (MER):</span>
                    <code className="text-[11px] font-mono text-sky-800 dark:text-sky-300 block break-all font-semibold">
                      =ROUND((MET / Max_MET) * (100 - 50) + 50, 0)
                    </code>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-850 p-2 rounded border border-slate-200 dark:border-slate-700 space-y-1">
                    <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase block">MS Excel Formula (MEP 40%):</span>
                    <code className="text-[11px] font-mono text-sky-800 dark:text-sky-300 block break-all font-semibold">
                      =ROUND(MER * 40%, 2)
                    </code>
                  </div>
                </div>

                {/* 2. Quizzes */}
                <div className="border border-slate-200 dark:border-slate-700 rounded-xl p-3.5 bg-white dark:bg-slate-800 space-y-2 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-amber-950 dark:text-amber-300">2. Quizzes (QT, QR, QP)</span>
                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                      25% Weight
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-600 dark:text-slate-300 space-y-1">
                    <p>
                      <strong>Raw QT:</strong> <code>=SUM(Q1:Q5)</code>
                    </p>
                    <p className="text-slate-500 dark:text-slate-400 text-[10px]">
                      Sum of individual quiz scores entered for this term.
                    </p>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-850 p-2 rounded border border-slate-200 dark:border-slate-700 space-y-1">
                    <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase block">MS Excel Formula (QR):</span>
                    <code className="text-[11px] font-mono text-amber-800 dark:text-amber-300 block break-all font-semibold">
                      =ROUND((QT / Max_QT) * (100 - 50) + 50, 0)
                    </code>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-850 p-2 rounded border border-slate-200 dark:border-slate-700 space-y-1">
                    <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase block">MS Excel Formula (QP 25%):</span>
                    <code className="text-[11px] font-mono text-amber-800 dark:text-amber-300 block break-all font-semibold">
                      =ROUND(QR * 25%, 2)
                    </code>
                  </div>
                </div>

                {/* 3. Recitation / Tasks */}
                <div className="border border-slate-200 dark:border-slate-700 rounded-xl p-3.5 bg-white dark:bg-slate-800 space-y-2 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-emerald-950 dark:text-emerald-300">3. Recitation / Tasks (RT, RR, RP)</span>
                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                      25% Weight
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-600 dark:text-slate-300 space-y-1">
                    <p>
                      <strong>Raw RT:</strong> Total recitation, performance task, or activity points.
                    </p>
                    <p className="text-slate-500 dark:text-slate-400 text-[10px]">
                      Transmuted on a Base-70 scale (70 minimum to 95 maximum).
                    </p>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-850 p-2 rounded border border-slate-200 dark:border-slate-700 space-y-1">
                    <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase block">MS Excel Formula (RR):</span>
                    <code className="text-[11px] font-mono text-emerald-800 dark:text-emerald-300 block break-all font-semibold">
                      =ROUND((RT / Max_RT) * (95 - 70) + 70, 0)
                    </code>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-850 p-2 rounded border border-slate-200 dark:border-slate-700 space-y-1">
                    <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase block">MS Excel Formula (RP 25%):</span>
                    <code className="text-[11px] font-mono text-emerald-800 dark:text-emerald-300 block break-all font-semibold">
                      =ROUND(RR * 25%, 2)
                    </code>
                  </div>
                </div>

                {/* 4. Class Standing & Final Term Grade */}
                <div className="border border-slate-200 dark:border-slate-700 rounded-xl p-3.5 bg-white dark:bg-slate-800 space-y-2 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-slate-900 dark:text-slate-100">4. Class Standing &amp; Final Grade</span>
                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-600">
                      60% CS + 40% Exam
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-600 dark:text-slate-300 space-y-1">
                    <p>
                      <strong>Class Standing (CS 60%):</strong> Quizzes + Recitation + Attendance + Deportment
                    </p>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-850 p-2 rounded border border-slate-200 dark:border-slate-700 space-y-1">
                    <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase block">MS Excel Formula (CS 60%):</span>
                    <code className="text-[11px] font-mono text-slate-800 dark:text-slate-200 block break-all font-semibold">
                      =ROUND(QP + RP + DP + AP, 2)
                    </code>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-850 p-2 rounded border border-slate-200 dark:border-slate-700 space-y-1">
                    <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase block">MS Excel Formula (Final Term Grade):</span>
                    <code className="text-[11px] font-mono text-emerald-800 dark:text-emerald-300 block break-all font-semibold">
                      =ROUND(MEP + CS, 2)
                    </code>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SECTION: STEP-BY-STEP SAMPLE STUDENT EXAMPLE */}
          {(guideFilter === "all" || guideFilter === "example") && (
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 sm:p-5 space-y-4 shadow-2xs">
              <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 dark:border-slate-700">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md bg-emerald-600 text-white flex items-center justify-center">
                    <Calculator className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-slate-100">
                      Sample Student Walkthrough: Juan Dela Cruz
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Follow step-by-step how Juan&apos;s raw scores produce his 90.28 Term Grade
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  Easy Example
                </span>
              </div>

              {/* Step by step cards */}
              <div className="space-y-2.5 text-xs">
                {/* Stage 1: Major Exam */}
                <div className="p-3 rounded-lg border border-sky-100 dark:border-sky-800 bg-sky-50/40 dark:bg-sky-950/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-black text-sky-900 dark:text-sky-300">Stage 1: Major Exam (40% Weight)</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-sky-100 dark:bg-sky-900/60 text-sky-800 dark:text-sky-200 font-bold">Raw: 40 / 50</span>
                    </div>
                    <div className="text-[11px] text-slate-600 dark:text-slate-300 mt-1 font-mono">
                      MS Excel: <code>=ROUND((40 / 50) * 50 + 50, 0)</code> ➔ <span className="font-bold text-slate-900 dark:text-slate-100">90.00 Rating</span>
                    </div>
                  </div>
                  <div className="text-right sm:border-l sm:border-sky-200 dark:sm:border-sky-800 sm:pl-3 shrink-0">
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block">40% Contribution:</span>
                    <span className="font-black text-sm text-sky-800 dark:text-sky-300">36.00%</span>
                  </div>
                </div>

                {/* Stage 2: Class Standing */}
                <div className="p-3 rounded-lg border border-amber-100 dark:border-amber-800 bg-amber-50/40 dark:bg-amber-950/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-black text-amber-950 dark:text-amber-300">Stage 2: Class Standing Components (60% Weight)</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-100 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200 font-bold">Sum of 4 Parts</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                    <div className="bg-white dark:bg-slate-800 p-2 rounded border border-amber-200/60 dark:border-amber-700/60">
                      <div className="font-bold text-slate-800 dark:text-slate-100">Quizzes (25% Weight)</div>
                      <div className="text-slate-500 dark:text-slate-400 text-[10px]">Scored 180 out of 225 total points</div>
                      <div className="font-mono text-[10px] text-slate-700 dark:text-slate-300 mt-1">
                        <code>=ROUND((180 / 225) * 50 + 50, 0)</code> = <strong>90.00</strong>
                      </div>
                      <div className="mt-1 text-right font-black text-amber-800 dark:text-amber-300">
                        90.00 * 25% = 22.50%
                      </div>
                    </div>

                    <div className="bg-white dark:bg-slate-800 p-2 rounded border border-amber-200/60 dark:border-amber-700/60">
                      <div className="font-bold text-slate-800 dark:text-slate-100">Recitation / Tasks (25% Weight)</div>
                      <div className="text-slate-500 dark:text-slate-400 text-[10px]">Scored 42 out of 50 total points</div>
                      <div className="font-mono text-[10px] text-slate-700 dark:text-slate-300 mt-1">
                        <code>=ROUND((42 / 50) * 25 + 70, 0)</code> = <strong>91.00</strong>
                      </div>
                      <div className="mt-1 text-right font-black text-amber-800 dark:text-amber-300">
                        91.00 * 25% = 22.75%
                      </div>
                    </div>

                    <div className="bg-white dark:bg-slate-800 p-2 rounded border border-amber-200/60 dark:border-amber-700/60">
                      <div className="font-bold text-slate-800 dark:text-slate-100">Attendance (5% Weight)</div>
                      <div className="text-slate-500 dark:text-slate-400 text-[10px]">Attended 34 out of 36 sessions</div>
                      <div className="font-mono text-[10px] text-slate-700 dark:text-slate-300 mt-1">
                        <code>=ROUND((34 / 36) * 25 + 70, 2)</code> = <strong>93.61</strong>
                      </div>
                      <div className="mt-1 text-right font-black text-amber-800 dark:text-amber-300">
                        93.61 * 5% = 4.68%
                      </div>
                    </div>

                    <div className="bg-white dark:bg-slate-800 p-2 rounded border border-amber-200/60 dark:border-amber-700/60">
                      <div className="font-bold text-slate-800 dark:text-slate-100">Deportment (5% Weight)</div>
                      <div className="text-slate-500 dark:text-slate-400 text-[10px]">2 Absences (36 days - 34 present)</div>
                      <div className="font-mono text-[10px] text-slate-700 dark:text-slate-300 mt-1">
                        <code>=90.00 - (2 absences * 1.5)</code> = <strong>87.00</strong>
                      </div>
                      <div className="mt-1 text-right font-black text-amber-800 dark:text-amber-300">
                        87.00 * 5% = 4.35%
                      </div>
                    </div>
                  </div>

                  <div className="pt-1.5 border-t border-amber-200/60 dark:border-amber-700/60 flex items-center justify-between font-bold text-slate-800 dark:text-slate-200">
                    <span>Class Standing Total (22.50 + 22.75 + 4.68 + 4.35):</span>
                    <span className="font-black text-sm text-amber-900 dark:text-amber-300">54.28%</span>
                  </div>
                </div>

                {/* Stage 3: Term Grade Total */}
                <div className="p-3.5 rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50/60 dark:bg-emerald-950/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-1.5 font-black text-emerald-950 dark:text-emerald-200">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      <span>Stage 3: Final Term Grade (100% Total)</span>
                    </div>
                    <div className="text-[11px] text-emerald-800 dark:text-emerald-300 mt-1 font-mono">
                      MS Excel: <code>=ROUND(36.00 (Exam) + 54.28 (CS), 2)</code>
                    </div>
                  </div>
                  <div className="text-right sm:border-l sm:border-emerald-300 dark:sm:border-emerald-800 sm:pl-3 shrink-0">
                    <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-bold block">Computed Term Grade:</span>
                    <span className="font-black text-lg text-emerald-700 dark:text-emerald-400">90.28</span>
                  </div>
                </div>
              </div>

              {/* Master Sheet Table Summary */}
              <div className="overflow-x-auto pt-1">
                <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  How Juan&apos;s Record Appears in the Master Grade Table:
                </span>
                <table className="w-full text-left text-xs border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                  <thead className="bg-slate-50 dark:bg-slate-850 text-slate-700 dark:text-slate-200 font-bold border-b border-slate-200 dark:border-slate-700 text-[11px]">
                    <tr>
                      <th className="py-1.5 px-2.5">Student</th>
                      <th className="py-1.5 px-2">MET (40%)</th>
                      <th className="py-1.5 px-2">QT (25%)</th>
                      <th className="py-1.5 px-2">RT (25%)</th>
                      <th className="py-1.5 px-2">AT (5%)</th>
                      <th className="py-1.5 px-2">DR (5%)</th>
                      <th className="py-1.5 px-2">CS (60%)</th>
                      <th className="py-1.5 px-2 font-bold text-emerald-800 dark:text-emerald-300">Term Grade</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-slate-800 font-medium text-slate-700 dark:text-slate-300 text-[11px]">
                    <tr>
                      <td className="py-2 px-2.5 font-bold text-slate-900 dark:text-slate-100">Dela Cruz, Juan</td>
                      <td className="py-2 px-2">36.00 (90)</td>
                      <td className="py-2 px-2">22.50 (90)</td>
                      <td className="py-2 px-2">22.75 (91)</td>
                      <td className="py-2 px-2">4.68 (94)</td>
                      <td className="py-2 px-2">4.35 (87)</td>
                      <td className="py-2 px-2 font-bold text-slate-900 dark:text-slate-100">54.28</td>
                      <td className="py-2 px-2 font-black text-emerald-700 dark:text-emerald-400 text-xs">90.28</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* SECTION: FULL SEMESTER COMPUTATION & OFFICIAL GRADE SCALE */}
          {(guideFilter === "all" || guideFilter === "semestral") && (
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 space-y-3 shadow-2xs">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-700">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
                  <Award className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Full Semester Grade &amp; Official Grade Scale</span>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  50% Midterm + 50% Finals
                </span>
              </div>

              <div className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed space-y-2.5">
                <p>
                  At the end of the semester, the student&apos;s semestral grade combines both terms equally (50% each):
                </p>

                <div className="bg-slate-50 dark:bg-slate-850 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 space-y-1">
                  <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase flex items-center gap-1">
                    <FileSpreadsheet className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                    <span>MS Excel Formula (Semestral Grade):</span>
                  </div>
                  <code className="text-xs font-mono text-emerald-800 dark:text-emerald-300 block break-all font-semibold">
                    =ROUND((Midterm_Grade * 50%) + (Final_Grade * 50%), 2)
                  </code>
                </div>

                <div className="bg-slate-50/70 dark:bg-slate-850/70 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 text-[11px] text-slate-600 dark:text-slate-300">
                  <strong>Example using Juan&apos;s grades:</strong>
                  <div className="font-mono mt-1 text-slate-800 dark:text-slate-200">
                    If Midterm = <strong>90.28</strong> and Finals = <strong>92.50</strong>: <br />
                    <code>=(90.28 * 0.50) + (92.50 * 0.50) = 45.14 + 46.25 = <strong className="text-emerald-700 dark:text-emerald-400">91.39%</strong></code>
                  </div>
                </div>

                <div className="pt-1">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-xs text-slate-800 dark:text-slate-200 block">
                      Official Grade Equivalence Scale
                    </span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                      =VLOOKUP(SemGrade, EquivScale, 2, TRUE)
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-1.5 text-[11px]">
                    <div className="p-1.5 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-850 flex justify-between items-center">
                      <span className="text-slate-600 dark:text-slate-400">99.00 - 100</span>
                      <span className="font-bold text-emerald-700 dark:text-emerald-400">1.00 (Excellent)</span>
                    </div>
                    <div className="p-1.5 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-850 flex justify-between items-center">
                      <span className="text-slate-600 dark:text-slate-400">96.00 - 98.99</span>
                      <span className="font-bold text-emerald-700 dark:text-emerald-400">1.10 - 1.25</span>
                    </div>
                    <div className="p-1.5 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-850 flex justify-between items-center">
                      <span className="text-slate-600 dark:text-slate-400">90.00 - 95.99</span>
                      <span className="font-bold text-emerald-700 dark:text-emerald-400">1.30 - 1.75</span>
                    </div>
                    <div className="p-1.5 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-850 flex justify-between items-center">
                      <span className="text-slate-600 dark:text-slate-400">80.00 - 89.99</span>
                      <span className="font-bold text-sky-700 dark:text-sky-400">1.80 - 2.60</span>
                    </div>
                    <div className="p-1.5 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-850 flex justify-between items-center">
                      <span className="text-slate-600 dark:text-slate-400">75.00 - 79.99</span>
                      <span className="font-bold text-amber-700 dark:text-amber-400">2.70 - 3.00</span>
                    </div>
                    <div className="p-1.5 rounded border border-rose-200 dark:border-rose-900 bg-rose-50/60 dark:bg-rose-950/40 flex justify-between items-center">
                      <span className="text-rose-700 dark:text-rose-300">Below 75.00</span>
                      <span className="font-bold text-rose-800 dark:text-rose-200">5.00 (Failed)</span>
                    </div>
                  </div>
                </div>

                <div className="pt-2 text-[11px] text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-700 flex items-center gap-3">
                  <span><strong>AW:</strong> Authorized Withdrawal (No Grade)</span>
                  <span>•</span>
                  <span><strong>UW:</strong> Unauthorized Withdrawal (No Grade)</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 dark:bg-slate-850 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            Formulas adhere strictly to the institution&apos;s official MS Excel grading rules.
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 dark:bg-slate-750 text-white rounded-lg text-xs font-bold hover:bg-slate-900 dark:hover:bg-slate-700 transition-colors cursor-pointer"
          >
            Close Guide
          </button>
        </div>
      </div>
    </div>
  );
}
