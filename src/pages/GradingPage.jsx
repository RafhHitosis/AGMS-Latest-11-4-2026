import React, { useState, useMemo } from "react";
import {
  ArrowLeft,
  ArrowRight,
  FileSpreadsheet,
  Settings,
  LogOut,
  Users,
  RotateCcw,
  Plus,
  TableProperties,
  Edit3,
  Award,
  TrendingUp,
  Percent,
  Sparkles,
  HelpCircle,
  Calendar,
  GraduationCap,
  BookOpen,
  School,
  CheckSquare,
} from "lucide-react";
import useGrades from "../hooks/useGrades";
import useSettings from "../hooks/useSettings";
import GradeMasterTable from "../components/GradeMasterTable";
import GradeInputGround from "../components/GradeInputGround";
import SemestralGradeTable from "../components/SemestralGradeTable";
import GradeConfigModal from "../components/GradeConfigModal";
import GradeComputationGuideModal from "../components/GradeComputationGuideModal";
import ImportStudentsModal from "../components/ImportStudentsModal";
import ConfirmModal from "../components/ConfirmModal";
import InputModal from "../components/InputModal";
import SmartPerformanceRibbon from "../components/SmartPerformanceRibbon";
import SmartGradeAnalyticsModal from "../components/SmartGradeAnalyticsModal";
import { exportGradesToExcel, exportSemestralGradesToExcel } from "../utils/gradeExportUtils";
import { analyzeTermGrades, analyzeSemestralGrades } from "../utils/gradeAnalytics";

export default function GradingPage({ sectionId, onBack, onSwitchToAttendance, onSignOut, appConfig: propAppConfig }) {
  const { appConfig: hookAppConfig } = useSettings();
  const appConfig = propAppConfig || hookAppConfig;
  const [term, setTerm] = useState("midterm");
  const [activeSheet, setActiveSheet] = useState("master"); // 'master' | 'input' | 'semestral'
  const [isReadMode, setIsReadMode] = useState(false);

  const {
    students,
    config,
    grades,
    loading,
    computedRows,
    semestralRows,
    stats,
    updateScore,
    updateQuizScore,
    updateConfig,
    updatePeMax,
    updateMeMax,
    updatePlusMax,
    updateMinusMax,
    updateQuizItemMax,
    updateRtMax,
    updateAtMax,
    addQuizItem,
    removeQuizItem,
    addStudent,
    batchAddStudents,
    resetTermGrades,
    syncAttendanceFromTracker,
  } = useGrades(sectionId, term);

  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [isGuideModalOpen, setIsGuideModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isAddStudentModalOpen, setIsAddStudentModalOpen] = useState(false);
  const [isAnalyticsModalOpen, setIsAnalyticsModalOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState("ALL");
  const [resetConfirmModal, setResetConfirmModal] = useState({
    isOpen: false,
    title: "",
    message: "",
  });

  // Smart Analytics Computations (100% deterministic, zero paid API or AI)
  const termAnalytics = useMemo(() => analyzeTermGrades(computedRows), [computedRows]);
  const semestralAnalytics = useMemo(() => analyzeSemestralGrades(semestralRows), [semestralRows]);

  const currentAnalytics = activeSheet === "semestral" ? semestralAnalytics : termAnalytics;

  // Filtered rows for displaying in tables based on active Smart Judgement category
  const filteredComputedRows = useMemo(() => {
    if (!activeFilter || activeFilter === "ALL") return termAnalytics.enrichedRows;
    return termAnalytics.enrichedRows.filter(
      (r) => r.smartJudgement?.category === activeFilter
    );
  }, [termAnalytics.enrichedRows, activeFilter]);

  const filteredSemestralRows = useMemo(() => {
    if (!activeFilter || activeFilter === "ALL") return semestralAnalytics.enrichedRows;
    return semestralAnalytics.enrichedRows.filter(
      (r) => r.smartJudgement?.category === activeFilter
    );
  }, [semestralAnalytics.enrichedRows, activeFilter]);

  const handleTermChange = (newTerm) => {
    setTerm(newTerm);
    setActiveFilter("ALL");
  };

  const handleSheetChange = (newSheet) => {
    setActiveSheet(newSheet);
    setActiveFilter("ALL");
  };

  const handleExport = () => {
    if (activeSheet === "semestral") {
      exportSemestralGradesToExcel({
        sectionId,
        semestralRows: semestralAnalytics.enrichedRows?.length ? semestralAnalytics.enrichedRows : semestralRows,
      });
    } else {
      exportGradesToExcel({
        sectionId,
        term,
        students,
        computedRows: termAnalytics.enrichedRows?.length ? termAnalytics.enrichedRows : computedRows,
        config,
      });
    }
  };

  const handleResetRequest = () => {
    setResetConfirmModal({
      isOpen: true,
      title: `Reset ${term === "midterm" ? "Midterm" : "Final"} Grades?`,
      message: `Are you sure you want to clear all grade inputs for Section ${sectionId} in ${term.toUpperCase()}? This cannot be undone.`,
    });
  };

  return (
    <div className="flex flex-col h-screen bg-slate-100 dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100 select-none">
      {/* Modals */}
      <GradeComputationGuideModal
        isOpen={isGuideModalOpen}
        onClose={() => setIsGuideModalOpen(false)}
      />

      <GradeConfigModal
        isOpen={isConfigModalOpen}
        onClose={() => setIsConfigModalOpen(false)}
        config={config}
        onSaveConfig={updateConfig}
      />

      <SmartGradeAnalyticsModal
        isOpen={isAnalyticsModalOpen}
        onClose={() => setIsAnalyticsModalOpen(false)}
        sectionId={sectionId}
        currentTerm={activeSheet === "semestral" ? "semestral" : term}
        termAnalytics={termAnalytics}
        semestralAnalytics={semestralAnalytics}
      />

      <ImportStudentsModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImport={(names) => {
          batchAddStudents(names);
          setIsImportModalOpen(false);
        }}
        sectionId={sectionId}
        appConfig={appConfig}
      />

      <InputModal
        isOpen={isAddStudentModalOpen}
        title="Add New Student"
        defaultValue=""
        onConfirm={(name) => {
          if (name?.trim()) addStudent(name.trim());
          setIsAddStudentModalOpen(false);
        }}
        onCancel={() => setIsAddStudentModalOpen(false)}
      />

      <ConfirmModal
        isOpen={resetConfirmModal.isOpen}
        title={resetConfirmModal.title}
        message={resetConfirmModal.message}
        isDestructive={true}
        onConfirm={() => {
          resetTermGrades();
          setResetConfirmModal({ isOpen: false, title: "", message: "" });
        }}
        onCancel={() => setResetConfirmModal({ isOpen: false, title: "", message: "" })}
      />

      {/* Main Top Header */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 py-2.5 flex items-center justify-between shadow-xs sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
            title="Back to Section Selection"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className="bg-emerald-600 text-white p-2 rounded-xl shadow-sm w-9 h-9 flex items-center justify-center overflow-hidden shrink-0">
              {appConfig?.logo && (appConfig.logo.startsWith("data:") || appConfig.logo.startsWith("http") || appConfig.logo.startsWith("/")) ? (
                <img src={appConfig.logo} alt="Logo" className="w-5 h-5 object-contain rounded" />
              ) : appConfig?.logo === "GraduationCap" ? (
                <GraduationCap className="w-5 h-5 text-white" />
              ) : appConfig?.logo === "Award" ? (
                <Award className="w-5 h-5 text-white" />
              ) : appConfig?.logo === "BookOpen" ? (
                <BookOpen className="w-5 h-5 text-white" />
              ) : appConfig?.logo === "School" ? (
                <School className="w-5 h-5 text-white" />
              ) : appConfig?.logo === "Sparkles" ? (
                <Sparkles className="w-5 h-5 text-white" />
              ) : appConfig?.logo === "CheckSquare" ? (
                <CheckSquare className="w-5 h-5 text-white" />
              ) : (
                <Award className="w-5 h-5 text-white" />
              )}
            </div>
            <div className="flex items-center gap-2.5">
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-base font-black text-slate-800 dark:text-slate-100 tracking-tight leading-tight">
                    Section {sectionId}
                  </h1>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-extrabold uppercase border border-blue-200 dark:border-blue-800">
                    Grading
                  </span>
                </div>
                {appConfig?.title && (
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium truncate max-w-[140px] sm:max-w-xs">
                    {appConfig.title}
                  </p>
                )}
              </div>

              {/* Solo Switch to Attendance Button */}
              {onSwitchToAttendance && (
                <button
                  type="button"
                  onClick={onSwitchToAttendance}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 transition-all cursor-pointer shadow-2xs hover:shadow-xs group ml-1"
                  title={`Switch directly to Attendance for Section ${sectionId}`}
                >
                  <Calendar className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform" />
                  <span className="hidden sm:inline">Go to Attendance</span>
                  <span className="sm:hidden">Attendance</span>
                  <ArrowRight className="w-3.5 h-3.5 text-emerald-500 group-hover:translate-x-0.5 transition-transform" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Term Tabs Switcher */}
        <div role="group" aria-label="Grading term" className="flex items-center gap-1 rounded-xl border border-slate-300 bg-slate-200 p-1 dark:border-slate-700 dark:bg-slate-800">
          {activeSheet === "semestral" ? (
            <span className="px-3 py-1 rounded-lg text-xs font-bold bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 shadow-xs border border-slate-200 dark:border-slate-700">
              Semestral (Midterm 50% + Final 50%)
            </span>
          ) : (
            <>
              <button
                type="button"
                aria-pressed={term === "midterm"}
                onClick={() => handleTermChange("midterm")}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  term === "midterm"
                    ? "bg-emerald-700 text-white shadow-sm ring-1 ring-emerald-800 dark:bg-emerald-500 dark:text-slate-950 dark:ring-emerald-400"
                    : "text-slate-600 hover:bg-white/70 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-white"
                }`}
              >
                Midterm
              </button>
              <button
                type="button"
                aria-pressed={term === "finals"}
                onClick={() => handleTermChange("finals")}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  term === "finals"
                    ? "bg-emerald-700 text-white shadow-sm ring-1 ring-emerald-800 dark:bg-emerald-500 dark:text-slate-950 dark:ring-emerald-400"
                    : "text-slate-600 hover:bg-white/70 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-white"
                }`}
              >
                Finals
              </button>
            </>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsAddStudentModalOpen(true)}
            className="flex items-center gap-1.5 text-xs bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 font-bold hover:bg-slate-50 dark:hover:bg-slate-700/60 transition-colors cursor-pointer shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span className="hidden sm:inline">Add Student</span>
          </button>
          <button
            type="button"
            onClick={() => setIsImportModalOpen(true)}
            className="flex items-center gap-1.5 text-xs bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 font-bold hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer shadow-2xs"
          >
            <Users className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span className="hidden sm:inline">Import</span>
          </button>
          <button
            type="button"
            onClick={handleExport}
            disabled={computedRows.length === 0 && semestralRows.length === 0}
            className="flex items-center gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg font-bold transition-colors shadow-2xs disabled:opacity-50 cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Export</span>
          </button>
          <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 mx-0.5" />
          <button
            type="button"
            onClick={() => setIsGuideModalOpen(true)}
            className="p-1.5 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-emerald-600 rounded-lg transition-colors cursor-pointer"
            title="Grade Computation Guide"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setIsConfigModalOpen(true)}
            className="p-1.5 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-200 rounded-lg transition-colors cursor-pointer"
            title="Grading Configuration (Weights & Scales)"
          >
            <Settings className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleResetRequest}
            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors cursor-pointer"
            title="Reset Grades"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onSignOut}
            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors cursor-pointer"
            title="Sign out"
            aria-label="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Class Statistics Ribbon */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 py-2 flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 dark:text-slate-500 font-medium">Class Avg:</span>
            <span className="font-extrabold text-slate-800 dark:text-slate-200">
              {currentAnalytics.average > 0 ? currentAnalytics.average.toFixed(2) : "-"}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 dark:text-slate-500 font-medium">Passing Rate:</span>
            <span className="font-extrabold text-blue-700 dark:text-blue-400">
              {currentAnalytics.gradedStudents > 0
                ? `${(((currentAnalytics.gradedStudents - (currentAnalytics.counts?.failed || 0)) / currentAnalytics.gradedStudents) * 100).toFixed(1)}%`
                : "-"}
            </span>
            <span className="text-[11px] text-slate-400 dark:text-slate-500">
              ({Math.max(0, (currentAnalytics.gradedStudents || 0) - (currentAnalytics.counts?.failed || 0))} Passed, {currentAnalytics.counts?.failed || 0} Failed)
            </span>
          </div>
        </div>

        {/* Excel Sheet Navigation Tabs */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700">
          <button
            onClick={() => handleSheetChange("master")}
            className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
              activeSheet === "master"
                ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs border border-slate-200/80 dark:border-slate-700"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            <TableProperties className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
            Main Grade Sheet
          </button>
          <button
            onClick={() => handleSheetChange("input")}
            className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
              activeSheet === "input"
                ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs border border-slate-200/80 dark:border-slate-700"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            <Edit3 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            Grade Input Ground
          </button>
          <button
            onClick={() => handleSheetChange("semestral")}
            className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
              activeSheet === "semestral"
                ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs border border-slate-200/80 dark:border-slate-700"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            <Award className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
            Semestral Grade
          </button>
        </div>
      </div>

      {/* Smart Performance & Automatic Best/Lowest Judgement Ribbon */}
      <SmartPerformanceRibbon
        analytics={currentAnalytics}
        activeFilter={activeFilter}
        onSelectFilter={(filt) => setActiveFilter(filt)}
        onOpenAnalyticsModal={() => setIsAnalyticsModalOpen(true)}
        isSemestral={activeSheet === "semestral"}
        termName={term === "midterm" ? "Midterm" : "Finals"}
      />

      {/* Main Content Area */}
      <main className="flex-1 overflow-hidden flex flex-col p-2 md:p-3">
        <div className="flex-1 bg-white dark:bg-slate-900 rounded-xl shadow-xs border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden relative">
          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : activeSheet === "master" ? (
            <GradeMasterTable
              computedRows={filteredComputedRows}
              config={config}
              grades={grades}
              onUpdateScore={updateScore}
              onUpdateRtMax={updateRtMax}
              onUpdateAtMax={updateAtMax}
              onSyncAttendance={syncAttendanceFromTracker}
              activeFilter={activeFilter}
              onClearFilter={() => setActiveFilter("ALL")}
              readMode={isReadMode}
              onToggleReadMode={() => setIsReadMode((enabled) => !enabled)}
            />
          ) : activeSheet === "input" ? (
            <GradeInputGround
              students={students}
              computedRows={filteredComputedRows}
              config={config}
              grades={grades}
              onUpdateScore={updateScore}
              onUpdateQuizScore={updateQuizScore}
              onUpdatePeMax={updatePeMax}
              onUpdateMeMax={updateMeMax}
              onUpdatePlusMax={updatePlusMax}
              onUpdateMinusMax={updateMinusMax}
              onUpdateQuizItemMax={updateQuizItemMax}
              onAddQuizItem={addQuizItem}
              onRemoveQuizItem={removeQuizItem}
              activeFilter={activeFilter}
              onClearFilter={() => setActiveFilter("ALL")}
              readMode={isReadMode}
              onToggleReadMode={() => setIsReadMode((enabled) => !enabled)}
            />
          ) : (
            <SemestralGradeTable
              semestralRows={filteredSemestralRows}
              activeFilter={activeFilter}
              onClearFilter={() => setActiveFilter("ALL")}
              readMode={isReadMode}
              onToggleReadMode={() => setIsReadMode((enabled) => !enabled)}
            />
          )}
        </div>
      </main>
    </div>
  );
}
