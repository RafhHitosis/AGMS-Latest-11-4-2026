import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Award,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  BarChart2,
  CheckCircle2,
  Target,
  ArrowRight,
  Info,
} from "lucide-react";
import clsx from "clsx";

/**
 * Adaptive Info Tooltip using createPortal and dynamic viewport boundary flipping.
 * Automatically checks available space above, below, and to the sides so that the tooltip
 * is NEVER clipped by modal overflow or viewport edges.
 */
function AdaptiveInfoTooltip({
  title,
  explanation,
  dataNote,
  triggerIcon,
  className = "",
  buttonClassName = "",
  placement = "auto", // "auto", "top", "bottom"
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState(null);
  const triggerRef = useRef(null);
  const timeoutRef = useRef(null);

  const calculatePosition = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Check if trigger is offscreen
    if (rect.bottom < 0 || rect.top > viewportHeight || rect.right < 0 || rect.left > viewportWidth) {
      setIsOpen(false);
      return;
    }

    const tooltipWidth = Math.min(290, viewportWidth - 24);
    const triggerCenter = rect.left + rect.width / 2;

    // Vertical positioning:
    const spaceBelow = viewportHeight - rect.bottom;
    const spaceAbove = rect.top;

    // If space below is less than ~200px and space above is larger, flip upward!
    const placeAbove =
      placement === "top" ||
      (placement === "auto" && spaceBelow < 200 && spaceAbove > spaceBelow);

    const top = placeAbove ? rect.top - 8 : rect.bottom + 8;

    // Horizontal positioning:
    // Center relative to trigger, then clamp within viewport margins
    let left = triggerCenter - tooltipWidth / 2;
    const minLeft = 12;
    const maxLeft = viewportWidth - tooltipWidth - 12;
    left = Math.max(minLeft, Math.min(left, maxLeft));

    // Arrow offset inside the tooltip so it aligns with triggerCenter
    const arrowLeft = Math.max(16, Math.min(triggerCenter - left, tooltipWidth - 16));

    setCoords({
      top,
      left,
      width: tooltipWidth,
      placeAbove,
      arrowLeft,
    });
  };

  const handleOpen = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    calculatePosition();
    setIsOpen(true);
  };

  const handleClose = () => {
    timeoutRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 120);
  };

  // Recalculate on scroll (including modal scroll) and resize
  useEffect(() => {
    if (!isOpen) return;
    const handleScrollOrResize = () => {
      calculatePosition();
    };
    window.addEventListener("scroll", handleScrollOrResize, true);
    window.addEventListener("resize", handleScrollOrResize);
    return () => {
      window.removeEventListener("scroll", handleScrollOrResize, true);
      window.removeEventListener("resize", handleScrollOrResize);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [isOpen]);

  return (
    <div
      className={clsx("relative inline-flex items-center", className)}
      onMouseEnter={handleOpen}
      onMouseLeave={handleClose}
    >
      <button
        ref={triggerRef}
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          if (isOpen) {
            setIsOpen(false);
          } else {
            handleOpen();
          }
        }}
        className={clsx(
          "p-1 rounded-md transition-colors cursor-pointer select-none",
          isOpen
            ? "text-emerald-700 dark:text-emerald-400 bg-emerald-100/80 dark:bg-emerald-900/60"
            : "text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800",
          buttonClassName
        )}
        aria-label={`About ${title}`}
        title="Hover or click for explanation"
      >
        {triggerIcon || <Info className="w-3.5 h-3.5" />}
      </button>

      {isOpen &&
        coords &&
        createPortal(
          <div
            style={{
              position: "fixed",
              top: `${coords.top}px`,
              left: `${coords.left}px`,
              width: `${coords.width}px`,
              transform: coords.placeAbove ? "translateY(-100%)" : "none",
              zIndex: 99999,
            }}
            className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 p-3.5 text-left pointer-events-auto animate-in fade-in zoom-in-95 duration-150 select-none"
            onMouseEnter={() => {
              if (timeoutRef.current) clearTimeout(timeoutRef.current);
            }}
            onMouseLeave={handleClose}
          >
            {/* Arrow pointer */}
            <div
              style={{
                left: `${coords.arrowLeft}px`,
                ...(coords.placeAbove
                  ? { bottom: "-6px", borderBottom: "1px solid", borderRight: "1px solid" }
                  : { top: "-6px", borderTop: "1px solid", borderLeft: "1px solid" }),
                transform: "translateX(-50%) rotate(45deg)",
              }}
              className="absolute w-3 h-3 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700"
            />
            <div className="relative z-10">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-100 pb-1.5 border-b border-slate-100 dark:border-slate-800">
                <Info className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>{title}</span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed mt-2 font-normal normal-case">
                {explanation}
              </p>
              {dataNote && (
                <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-500 dark:text-slate-400 font-medium normal-case">
                  <span className="font-bold text-slate-700 dark:text-slate-300">Data: </span>
                  {dataNote}
                </div>
              )}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}

/**
 * Reusable Benchmark Card with hover/click plain-English explanation tooltip
 */
function BenchmarkCard({
  title,
  value,
  valueColor,
  subtitle,
  subtitleTitle,
  infoTitle,
  explanation,
  dataNote,
  position = "col-1",
  color = "slate",
}) {
  return (
    <div
      className={clsx(
        "relative rounded-xl p-3 border transition-all cursor-default select-none",
        color === "emerald"
          ? "bg-emerald-50/60 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/80 hover:border-emerald-300 dark:hover:border-emerald-700 hover:shadow-2xs"
          : "bg-slate-50 dark:bg-slate-850 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-2xs"
      )}
    >
      <div className="flex items-center justify-between gap-1">
        <span
          className={clsx(
            "text-[10px] font-bold uppercase tracking-wider",
            color === "emerald" ? "text-emerald-800 dark:text-emerald-300" : "text-slate-700 dark:text-slate-300"
          )}
        >
          {title}
        </span>
        <AdaptiveInfoTooltip
          title={infoTitle || title}
          explanation={explanation}
          dataNote={dataNote}
          buttonClassName="p-0.5"
        />
      </div>

      <div
        className={clsx(
          "text-xl font-black mt-0.5",
          valueColor || (color === "emerald" ? "text-emerald-700 dark:text-emerald-400" : "text-slate-800 dark:text-slate-100")
        )}
      >
        {value}
      </div>

      <div
        className="text-[11px] text-slate-700 dark:text-slate-400 font-medium truncate mt-1"
        title={subtitleTitle || subtitle}
      >
        {subtitle}
      </div>
    </div>
  );
}

/**
 * Reusable Section Header Info Tooltip for leaderboard and trajectory cards
 */
function HeaderInfoTooltip({ title, explanation, dataNote }) {
  return (
    <AdaptiveInfoTooltip
      title={title}
      explanation={explanation}
      dataNote={dataNote}
    />
  );
}

export default function SmartGradeAnalyticsModal({
  isOpen,
  onClose,
  sectionId,
  currentTerm = "midterm",
  termAnalytics,
  semestralAnalytics,
}) {
  const [activeTab, setActiveTab] = useState(
    currentTerm === "semestral" ? "semestral" : "term"
  );

  if (!isOpen) return null;

  const tData = termAnalytics || {};
  const sData = semestralAnalytics || {};
  const showingSemestral = currentTerm === "semestral" || activeTab === "semestral";

  // For term leaderboard: top 5 strictly PASSING students (never failed)
  const termTopPerformers = (tData.enrichedRows || [])
    .filter(
      (r) =>
        r.smartJudgement?.rank !== null &&
        r.smartJudgement?.category !== "FAILED" &&
        (typeof r.finalGrade === "number" ? r.finalGrade >= 75.0 : false)
    )
    .sort((a, b) => (a.smartJudgement?.rank || 999) - (b.smartJudgement?.rank || 999))
    .slice(0, 5);

  // For term at-risk / failing students
  const termAtRisk = (tData.enrichedRows || []).filter(
    (r) =>
      r.smartJudgement?.category === "FAILED" ||
      r.smartJudgement?.category === "NEEDS_IMPROVEMENT"
  );

  // For semestral leaderboard: top 5 strictly PASSING students (never failed)
  const semTopPerformers = (sData.enrichedRows || [])
    .filter(
      (r) =>
        r.smartJudgement?.rank !== null &&
        r.smartJudgement?.category !== "FAILED" &&
        r.equivGrade !== "5.00" &&
        (typeof r.semGrade === "number" ? r.semGrade >= 75.0 : false)
    )
    .sort((a, b) => (a.smartJudgement?.rank || 999) - (b.smartJudgement?.rank || 999))
    .slice(0, 5);

  // Semestral at-risk / failing
  const semAtRisk = (sData.enrichedRows || []).filter(
    (r) =>
      r.smartJudgement?.category === "FAILED" ||
      r.smartJudgement?.category === "NEEDS_IMPROVEMENT"
  );

  // Students who improved in Finals compared to Midterm
  const improvedStudents = (sData.enrichedRows || [])
    .filter((r) => typeof r.smartJudgement?.delta === "number" && r.smartJudgement.delta >= 3.0)
    .slice(0, 6);

  // Students who dropped in Finals compared to Midterm
  const declinedStudents = (sData.enrichedRows || [])
    .filter((r) => typeof r.smartJudgement?.delta === "number" && r.smartJudgement.delta <= -3.0)
    .slice(0, 6);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center shadow-2xs">
              <BarChart2 className="w-5 h-5 text-emerald-700 dark:text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">
                  Grade Insights &amp; Performance
                </h2>
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                  Section {sectionId}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Performance breakdown and student progress based on grade records
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-slate-50 dark:bg-slate-850 border-b border-slate-200 dark:border-slate-800 px-6 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab("term")}
              className={clsx(
                "px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5",
                !showingSemestral
                  ? "bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-2xs border border-slate-200 dark:border-slate-700"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              )}
            >
              <Target className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>{currentTerm === "semestral" ? "Selected Term Insights" : `${currentTerm.toUpperCase()} Term`}</span>
            </button>
            <button
              onClick={() => setActiveTab("semestral")}
              className={clsx(
                "px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5",
                showingSemestral
                  ? "bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-2xs border border-slate-200 dark:border-slate-700"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              )}
            >
              <Award className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Full Semester Overview</span>
            </button>
          </div>

          <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
            {showingSemestral ? sData.totalStudents || 0 : tData.totalStudents || 0} Total Students
          </div>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5 bg-white dark:bg-slate-900">
          {!showingSemestral ? (
            <>
              {/* Top Statistics Benchmark Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <BenchmarkCard
                  title="Highest in Section"
                  value={tData.highestGrade !== null ? tData.highestGrade.toFixed(2) : "—"}
                  subtitle={tData.highestStudents?.[0]?.name || "—"}
                  subtitleTitle={tData.highestStudents?.[0]?.name || "None"}
                  color="emerald"
                  position="col-1"
                  infoTitle="Highest Term Grade"
                  explanation="Shows the student with the highest total grade recorded in this section for this term."
                  dataNote="Based on all entered grades for this term. If students tie for first place, the top student is shown."
                />

                <BenchmarkCard
                  title="Lowest in Section"
                  value={tData.hasDistinctLowest && tData.lowestGrade !== null ? tData.lowestGrade.toFixed(2) : "—"}
                  subtitle={tData.hasDistinctLowest ? tData.lowestStudents?.[0]?.name : "—"}
                  subtitleTitle={tData.hasDistinctLowest ? tData.lowestStudents?.[0]?.name : "No lower grade"}
                  color="slate"
                  position="col-2"
                  infoTitle="Lowest Term Grade"
                  explanation="Shows the student with the lowest total grade in this section for this term."
                  dataNote="Only shows a name if there are at least two students with different grades. Stays blank if only one student exists or grades are tied."
                />

                <BenchmarkCard
                  title="Section Average"
                  value={tData.average ? tData.average.toFixed(2) : "—"}
                  subtitle={`Median: ${tData.median ? tData.median.toFixed(2) : "—"}`}
                  color="slate"
                  position="col-3"
                  infoTitle="Term Class Average"
                  explanation="The general class average grade across all graded students in this term."
                  dataNote="Calculated by adding all student term grades divided by total graded students. Also shows the median (middle score)."
                />

                <BenchmarkCard
                  title="Passing Rate"
                  value={
                    tData.gradedStudents > 0
                      ? `${(((tData.gradedStudents - (tData.counts?.failed || 0)) / tData.gradedStudents) * 100).toFixed(1)}%`
                      : "—"
                  }
                  valueColor="text-blue-700 dark:text-blue-400"
                  subtitle={`${tData.gradedStudents - (tData.counts?.failed || 0)} Passed • ${tData.counts?.failed || 0} Failed`}
                  color="slate"
                  position="col-4"
                  infoTitle="Term Passing Rate"
                  explanation="The percentage of students who scored 75.00 or higher in this term."
                  dataNote="Shows the overall pass percentage and the exact breakdown of passing vs failing students."
                />
              </div>

              {/* Performance Distribution */}
              <div className="bg-slate-50/70 dark:bg-slate-850/70 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold text-slate-800 dark:text-slate-100 text-xs uppercase tracking-wider">
                    Grade Distribution
                  </h3>
                  <span className="text-slate-500 dark:text-slate-400 text-[11px]">
                    {tData.gradedStudents || 0} Graded Students
                  </span>
                </div>

                <div className="space-y-2">
                  {/* Best */}
                  <div>
                    <div className="flex justify-between text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      <span className="text-emerald-800 dark:text-emerald-300 font-bold">
                        Best (90.00 - 100.00 or Rank 1)
                      </span>
                      <span>
                        {tData.counts?.best || 0} students (
                        {tData.gradedStudents
                          ? `${(((tData.counts?.best || 0) / tData.gradedStudents) * 100).toFixed(0)}%`
                          : "0%"}
                        )
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                        style={{
                          width: `${tData.gradedStudents ? ((tData.counts?.best || 0) / tData.gradedStudents) * 100 : 0}%`,
                        }}
                      />
                    </div>
                  </div>

                  {/* Good */}
                  <div>
                    <div className="flex justify-between text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      <span className="text-sky-800 dark:text-sky-300 font-bold">
                        Good Standing (80.00 - 89.99)
                      </span>
                      <span>
                        {tData.counts?.satisfactory || 0} students (
                        {tData.gradedStudents
                          ? `${(((tData.counts?.satisfactory || 0) / tData.gradedStudents) * 100).toFixed(0)}%`
                          : "0%"}
                        )
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-sky-500 h-full rounded-full transition-all duration-300"
                        style={{
                          width: `${tData.gradedStudents ? ((tData.counts?.satisfactory || 0) / tData.gradedStudents) * 100 : 0}%`,
                        }}
                      />
                    </div>
                  </div>

                  {/* Needs Improvement */}
                  <div>
                    <div className="flex justify-between text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      <span className="text-amber-800 dark:text-amber-300 font-bold">
                        Needs Improvement (75.00 - 79.99)
                      </span>
                      <span>
                        {tData.counts?.needsImprovement || 0} students (
                        {tData.gradedStudents
                          ? `${(((tData.counts?.needsImprovement || 0) / tData.gradedStudents) * 100).toFixed(0)}%`
                          : "0%"}
                        )
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-amber-500 h-full rounded-full transition-all duration-300"
                        style={{
                          width: `${tData.gradedStudents ? ((tData.counts?.needsImprovement || 0) / tData.gradedStudents) * 100 : 0}%`,
                        }}
                      />
                    </div>
                  </div>

                  {/* Failed */}
                  <div>
                    <div className="flex justify-between text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      <span className="text-rose-800 dark:text-rose-300 font-bold">
                        Failed (&lt; 75.00)
                      </span>
                      <span>
                        {tData.counts?.failed || 0} students (
                        {tData.gradedStudents
                          ? `${(((tData.counts?.failed || 0) / tData.gradedStudents) * 100).toFixed(0)}%`
                          : "0%"}
                        )
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-rose-500 h-full rounded-full transition-all duration-300"
                        style={{
                          width: `${tData.gradedStudents ? ((tData.counts?.failed || 0) / tData.gradedStudents) * 100 : 0}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Leaderboard vs Needs Attention */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Top Performers */}
                <div className="bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-2xs">
                  <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <Award className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
                      <h4 className="font-bold text-slate-800 dark:text-slate-100 text-xs uppercase tracking-wider">
                        Top Performers
                      </h4>
                      <HeaderInfoTooltip
                        title="Top Performers"
                        explanation="The top 5 students in this section based on their total grade for this term."
                        dataNote="Shows class rank (1 to 5) and term total grade."
                      />
                    </div>
                    <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                      Ranked 1 - 5
                    </span>
                  </div>

                  <div className="divide-y divide-slate-100 dark:divide-slate-800 mt-1">
                    {termTopPerformers.length === 0 ? (
                      <div className="py-6 text-center text-slate-400 dark:text-slate-500 text-xs italic">
                        No graded students yet
                      </div>
                    ) : (
                      termTopPerformers.map((st, i) => (
                        <div key={st.studentId} className="py-2.5 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="w-5 h-5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center justify-center shrink-0">
                              {st.smartJudgement?.rank || i + 1}
                            </span>
                            <div className="min-w-0">
                              <div
                                className="font-bold text-slate-900 dark:text-slate-100 text-xs truncate max-w-[180px] sm:max-w-[240px]"
                                title={st.name}
                              >
                                {st.name}
                              </div>
                              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                                {st.smartJudgement?.reason}
                              </div>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="font-black text-emerald-800 dark:text-emerald-300 text-xs px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/60 rounded border border-emerald-200 dark:border-emerald-800">
                              {typeof st.finalGrade === "number" ? st.finalGrade.toFixed(2) : st.finalGrade}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Students Needing Support */}
                <div className="bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-2xs">
                  <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                      <h4 className="font-bold text-slate-800 dark:text-slate-100 text-xs uppercase tracking-wider">
                        Needs Attention ({termAtRisk.length})
                      </h4>
                      <HeaderInfoTooltip
                        title="Needs Attention"
                        explanation="Students who are currently failing (below 75.00) or borderline (75.00 to 79.99) for this term."
                        dataNote="Identifies students who may need academic follow-up or intervention."
                      />
                    </div>
                    <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                      Borderline / Failing
                    </span>
                  </div>

                  <div className="divide-y divide-slate-100 dark:divide-slate-800 mt-1 max-h-[260px] overflow-y-auto">
                    {termAtRisk.length === 0 ? (
                      <div className="py-6 text-center text-emerald-700 dark:text-emerald-400 text-xs font-semibold flex items-center justify-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        <span>All graded students are passing comfortably</span>
                      </div>
                    ) : (
                      termAtRisk.map((st) => (
                        <div key={st.studentId} className="py-2.5 flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span
                                className="font-bold text-slate-900 dark:text-slate-100 text-xs truncate max-w-[160px] sm:max-w-[220px]"
                                title={st.name}
                              >
                                {st.name}
                              </span>
                              <span
                                className={clsx(
                                  "text-[10px] font-bold px-1.5 py-0.2 rounded border shrink-0",
                                  st.smartJudgement?.badgeColor
                                )}
                              >
                                {st.smartJudgement?.badge}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                              {st.smartJudgement?.reason}
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <span
                              className={clsx(
                                "font-black text-xs px-2 py-0.5 rounded border",
                                st.smartJudgement?.category === "FAILED"
                                  ? "bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-800"
                                  : "bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800"
                              )}
                            >
                              {typeof st.finalGrade === "number" ? st.finalGrade.toFixed(2) : st.finalGrade}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </>
          ) : (
            /* Semestral Overview Tab */
            <>
              {/* Semester Spotlight Benchmarks */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <BenchmarkCard
                  title="Highest Semestral"
                  value={sData.highestGrade !== null ? sData.highestGrade.toFixed(2) : "—"}
                  subtitle={sData.highestStudents?.[0]?.name || "—"}
                  subtitleTitle={sData.highestStudents?.[0]?.name || "None"}
                  color="emerald"
                  position="col-1"
                  infoTitle="Highest Semestral Grade"
                  explanation="Shows the student with the highest semestral score in this section for the whole semester."
                  dataNote="Calculated from 50% Midterm + 50% Finals. If students tie for first place, the top student is shown."
                />

                <BenchmarkCard
                  title="Lowest Semestral"
                  value={sData.hasDistinctLowest && sData.lowestGrade !== null ? sData.lowestGrade.toFixed(2) : "—"}
                  subtitle={sData.hasDistinctLowest ? sData.lowestStudents?.[0]?.name : "—"}
                  subtitleTitle={sData.hasDistinctLowest ? sData.lowestStudents?.[0]?.name : "No lower grade"}
                  color="slate"
                  position="col-2"
                  infoTitle="Lowest Semestral Grade"
                  explanation="Shows the student with the lowest semestral grade in this section."
                  dataNote="Only shows a name if there are at least two students with different grades. Stays blank if grades are equal or only one student exists."
                />

                <BenchmarkCard
                  title="Most Improved"
                  value={
                    sData.mostImproved && sData.mostImproved.delta > 0
                      ? `+${sData.mostImproved.delta.toFixed(2)}`
                      : "—"
                  }
                  valueColor="text-emerald-700 dark:text-emerald-400"
                  subtitle={sData.mostImproved ? sData.mostImproved.name : "—"}
                  subtitleTitle={sData.mostImproved ? sData.mostImproved.name : "None"}
                  color="slate"
                  position="col-3"
                  infoTitle="Most Improved Student"
                  explanation="Shows the student whose score increased the most between Midterm and Finals."
                  dataNote="Calculated as (Finals Grade − Midterm Grade). For example, +5.00 means their grade increased by 5 points in Finals."
                />

                <BenchmarkCard
                  title="Semestral Average"
                  value={sData.average ? sData.average.toFixed(2) : "—"}
                  subtitle={`Median: ${sData.median ? sData.median.toFixed(2) : "—"}`}
                  color="slate"
                  position="col-4"
                  infoTitle="Semestral Class Average"
                  explanation="The overall average semestral grade of all students in this section for the full semester."
                  dataNote="Calculated across all student semestral grades. Also shows the median (the middle score of the class)."
                />
              </div>

              {/* Trajectory: Improved vs Declined */}
              {(improvedStudents.length > 0 || declinedStudents.length > 0) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Improved */}
                  {improvedStudents.length > 0 && (
                    <div className="bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-2xs">
                      <div className="flex items-center justify-between gap-1.5 mb-2.5 pb-2 border-b border-slate-100 dark:border-slate-800">
                        <div className="flex items-center gap-1.5">
                          <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                          <h4 className="font-bold text-slate-800 dark:text-slate-100 text-xs uppercase tracking-wider">
                            Improved in Finals
                          </h4>
                        </div>
                        <HeaderInfoTooltip
                          title="Improved in Finals"
                          explanation="Students whose performance increased by 3 or more points in the Final Term compared to their Midterm grade."
                          dataNote="Displays Midterm grade, Final Term grade, and the points gained (+)."
                        />
                      </div>
                      <div className="space-y-1.5">
                        {improvedStudents.map((st) => (
                          <div
                            key={st.studentId}
                            className="bg-slate-50/80 dark:bg-slate-800/80 p-2 rounded-lg border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between gap-2 text-xs"
                          >
                            <span
                              className="font-bold text-slate-800 dark:text-slate-100 truncate max-w-[170px] sm:max-w-[240px]"
                              title={st.name}
                            >
                              {st.name}
                            </span>
                            <div className="flex items-center gap-2 text-[11px] shrink-0">
                              <span className="text-slate-500 dark:text-slate-400 font-medium">Mid: {st.midtermGrade?.toFixed(1)}</span>
                              <ArrowRight className="w-3 h-3 text-slate-400" />
                              <span className="text-emerald-700 dark:text-emerald-400 font-bold">Fin: {st.finalGrade?.toFixed(1)}</span>
                              <span className="font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 px-1.5 py-0.2 rounded">
                                +{st.smartJudgement?.delta?.toFixed(1)}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Declined */}
                  {declinedStudents.length > 0 && (
                    <div className="bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-2xs">
                      <div className="flex items-center justify-between gap-1.5 mb-2.5 pb-2 border-b border-slate-100 dark:border-slate-800">
                        <div className="flex items-center gap-1.5">
                          <TrendingDown className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                          <h4 className="font-bold text-slate-800 dark:text-slate-100 text-xs uppercase tracking-wider">
                            Declined in Finals
                          </h4>
                        </div>
                        <HeaderInfoTooltip
                          title="Declined in Finals"
                          explanation="Students whose score dropped by 3 or more points in the Final Term compared to their Midterm grade, highlighting who may need review or follow-up."
                          dataNote="Displays Midterm grade, Final Term grade, and the points dropped (−)."
                        />
                      </div>
                      <div className="space-y-1.5">
                        {declinedStudents.map((st) => (
                          <div
                            key={st.studentId}
                            className="bg-slate-50/80 dark:bg-slate-800/80 p-2 rounded-lg border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between gap-2 text-xs"
                          >
                            <span
                              className="font-bold text-slate-800 dark:text-slate-100 truncate max-w-[170px] sm:max-w-[240px]"
                              title={st.name}
                            >
                              {st.name}
                            </span>
                            <div className="flex items-center gap-2 text-[11px] shrink-0">
                              <span className="text-slate-500 dark:text-slate-400 font-medium">Mid: {st.midtermGrade?.toFixed(1)}</span>
                              <ArrowRight className="w-3 h-3 text-slate-400" />
                              <span className="text-rose-700 dark:text-rose-400 font-bold">Fin: {st.finalGrade?.toFixed(1)}</span>
                              <span className="font-bold text-rose-800 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 px-1.5 py-0.2 rounded">
                                {st.smartJudgement?.delta?.toFixed(1)}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Semestral Top Performers vs Academic Risk */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Semestral Top Performers */}
                <div className="bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-2xs">
                  <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <Award className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
                      <h4 className="font-bold text-slate-800 dark:text-slate-100 text-xs uppercase tracking-wider">
                        Semestral Top Performers
                      </h4>
                      <HeaderInfoTooltip
                        title="Semestral Top Performers"
                        explanation="The top 5 students in this section based on their final semestral grade."
                        dataNote="Shows class rank (1 to 5), final semestral percentage, and university equivalent grade (e.g. 1.00)."
                      />
                    </div>
                    <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                      Ranked 1 - 5
                    </span>
                  </div>

                  <div className="divide-y divide-slate-100 dark:divide-slate-800 mt-1">
                    {semTopPerformers.length === 0 ? (
                      <div className="py-6 text-center text-slate-400 dark:text-slate-500 text-xs italic">
                        No semestral grade calculations yet
                      </div>
                    ) : (
                      semTopPerformers.map((st, i) => (
                        <div key={st.studentId} className="py-2.5 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="w-5 h-5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center justify-center shrink-0">
                              {st.smartJudgement?.rank || i + 1}
                            </span>
                            <div className="min-w-0">
                              <div
                                className="font-bold text-slate-900 dark:text-slate-100 text-xs truncate max-w-[180px] sm:max-w-[240px]"
                                title={st.name}
                              >
                                {st.name}
                              </div>
                              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                                Equiv: {st.equivGrade} • {st.smartJudgement?.trajectoryLabel}
                              </div>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="font-black text-emerald-800 dark:text-emerald-300 text-xs px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/60 rounded border border-emerald-200 dark:border-emerald-800">
                              {typeof st.semGrade === "number" ? st.semGrade.toFixed(2) : st.semGrade}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Semestral Failing / Needs Improvement */}
                <div className="bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-2xs">
                  <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                      <h4 className="font-bold text-slate-800 dark:text-slate-100 text-xs uppercase tracking-wider">
                        Semestral Risk List ({semAtRisk.length})
                      </h4>
                      <HeaderInfoTooltip
                        title="Semestral Risk List"
                        explanation="Students who have a failing semestral grade (below 75.00) or are near the passing line (75.00 to 79.99) and may need academic intervention."
                        dataNote="Flags students as Failed (< 75.00) or Needs Improvement (75.00 - 79.99)."
                      />
                    </div>
                    <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                      Borderline / Failed
                    </span>
                  </div>

                  <div className="divide-y divide-slate-100 dark:divide-slate-800 mt-1 max-h-[260px] overflow-y-auto">
                    {semAtRisk.length === 0 ? (
                      <div className="py-6 text-center text-emerald-700 dark:text-emerald-400 text-xs font-semibold flex items-center justify-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        <span>All students have passing semestral marks</span>
                      </div>
                    ) : (
                      semAtRisk.map((st) => (
                        <div key={st.studentId} className="py-2.5 flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span
                                className="font-bold text-slate-900 dark:text-slate-100 text-xs truncate max-w-[160px] sm:max-w-[220px]"
                                title={st.name}
                              >
                                {st.name}
                              </span>
                              <span
                                className={clsx(
                                  "text-[10px] font-bold px-1.5 py-0.2 rounded border shrink-0",
                                  st.smartJudgement?.badgeColor
                                )}
                              >
                                {st.smartJudgement?.badge}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                              {st.smartJudgement?.reason}
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <span
                              className={clsx(
                                "font-black text-xs px-2 py-0.5 rounded border",
                                st.smartJudgement?.category === "FAILED"
                                  ? "bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-800"
                                  : "bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800"
                              )}
                            >
                              {typeof st.semGrade === "number" ? st.semGrade.toFixed(2) : st.semGrade} ({st.equivGrade})
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 dark:bg-slate-850 border-t border-slate-200 dark:border-slate-800 px-6 py-2.5 flex items-center justify-between">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            Real-time section calculation based on entered grades
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 dark:bg-slate-750 text-white hover:bg-slate-900 dark:hover:bg-slate-700 font-bold text-xs transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
