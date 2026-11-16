import React, { useState, useMemo } from "react";
import clsx from "clsx";
import {
  LogOut,
  Users,
  RotateCcw,
  Plus,
  TableProperties,
  Edit3,
  Award,
  Sparkles,
  HelpCircle,
  GraduationCap,
  BookOpen,
  School,
  CheckSquare,
  RefreshCw,
  BarChart2,
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
import ReadModeToggle from "../components/ReadModeToggle";
import AddQuizItemControl from "../components/AddQuizItemControl";
import EquivalenceScaleModal from "../components/EquivalenceScaleModal";
import SectionPageHeader, { SectionTermToggle } from "../components/SectionPageHeader";
import { exportGradesToExcel, exportSemestralGradesToExcel } from "../utils/gradeExportUtils";
import { analyzeTermGrades, analyzeSemestralGrades } from "../utils/gradeAnalytics";

export default function GradingPage({ sectionId, currentUser, onBack, onSwitchToAttendance, onSwitchToAssessments, onSignOut, appConfig: propAppConfig }) {
  const {
    appConfig: hookAppConfig,
    termDates,
    loading: settingsLoading,
    error: settingsError,
    refreshConfig,
  } = useSettings();
  const appConfig = propAppConfig || hookAppConfig;
  const canEditSection = currentUser?.role === "admin" || currentUser?.role === "teacher";
  const [term, setTerm] = useState("midterm");
  const [activeSheet, setActiveSheet] = useState("master"); // 'master' | 'input' | 'semestral'
  const [isReadMode, setIsReadMode] = useState(!canEditSection);

  const {
    students,
    config,
    grades,
    loading,
    error,
    saving,
    saveError,
    configSaveStatus,
    configSaveError,
    computedRows,
    semestralRows,
    updateScore,
    updateQuizScore,
    updateConfig,
    retryFailedSaves,
    retryConfigSave,
    updatePeMax,
    updateMeMax,
    updateQuizItemMax,
    updateRtMax,
    updateAtMax,
    addQuizItem,
    removeQuizItem,
    addStudent,
    batchAddStudents,
    resetTermGrades,
    syncAttendanceFromTracker,
    refreshData,
  } = useGrades(sectionId, term, termDates);
  const pageError = settingsError || error;
  const pageLoading = settingsLoading || loading;

  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [isGuideModalOpen, setIsGuideModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isAddStudentModalOpen, setIsAddStudentModalOpen] = useState(false);
  const [isAnalyticsModalOpen, setIsAnalyticsModalOpen] = useState(false);
  const [isEquivalenceScaleOpen, setIsEquivalenceScaleOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState("ALL");
  const [resetConfirmModal, setResetConfirmModal] = useState({
    isOpen: false,
    title: "",
    message: "",
  });
  const [isSyncConfirmOpen, setIsSyncConfirmOpen] = useState(false);
  const [isSyncingAttendance, setIsSyncingAttendance] = useState(false);

  // Smart Analytics Computations (100% deterministic, zero paid API or AI)
  const termAnalytics = useMemo(() => analyzeTermGrades(computedRows), [computedRows]);
  const semestralAnalytics = useMemo(() => analyzeSemestralGrades(semestralRows), [semestralRows]);

  const currentAnalytics = activeSheet === "semestral" ? semestralAnalytics : termAnalytics;
  const hasSaveError = Boolean(saveError) || configSaveStatus === "error";
  const isSaving = saving || configSaveStatus === "saving";
  const hasUnsavedChanges = configSaveStatus === "pending";
  const saveStatus = hasSaveError
    ? "error"
    : isSaving
      ? "saving"
      : hasUnsavedChanges
        ? "unsaved"
        : "saved";
  const saveErrorDetails = canEditSection ? (
    <>
      {saveError && (
        <button type="button" onClick={retryFailedSaves} className="font-bold underline">
          Retry grades
        </button>
      )}
      {configSaveStatus === "error" && (
        <button type="button" onClick={retryConfigSave} className="font-bold underline">
          Retry settings
        </button>
      )}
    </>
  ) : (
    <span className="text-[11px] font-medium text-on-surface-variant">Read-only access</span>
  );

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

  const handleConfirmAttendanceSync = async () => {
    if (isSyncingAttendance) return;

    setIsSyncingAttendance(true);
    try {
      await syncAttendanceFromTracker();
    } finally {
      setIsSyncingAttendance(false);
      setIsSyncConfirmOpen(false);
    }
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

      {isAnalyticsModalOpen && (
        <SmartGradeAnalyticsModal
          isOpen={isAnalyticsModalOpen}
          onClose={() => setIsAnalyticsModalOpen(false)}
          sectionId={sectionId}
          currentTerm={activeSheet === "semestral" ? "semestral" : term}
          termAnalytics={termAnalytics}
          semestralAnalytics={semestralAnalytics}
        />
      )}

      <ImportStudentsModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImport={async (names) => {
          await batchAddStudents(names);
        }}
        sectionId={sectionId}
        appConfig={appConfig}
        existingNames={students.map((student) => student.name)}
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

      <ConfirmModal
        isOpen={isSyncConfirmOpen}
        title="Sync Attendance to Grades?"
        message={`This will overwrite the AT score for all ${students.length} students in Section ${sectionId} for ${term === "midterm" ? "Midterm" : "Finals"} using the daily attendance records. Continue?`}
        isDestructive
        confirmText={isSyncingAttendance ? "Syncing…" : "Sync Attendance"}
        isConfirming={isSyncingAttendance}
        onConfirm={handleConfirmAttendanceSync}
        onCancel={() => setIsSyncConfirmOpen(false)}
      />

      <EquivalenceScaleModal
        isOpen={isEquivalenceScaleOpen}
        onClose={() => setIsEquivalenceScaleOpen(false)}
      />

      <SectionPageHeader
        sectionId={sectionId}
        appConfig={appConfig}
        onBack={onBack}
        workspace="Grading"
        onSwitchWorkspace={(ws) => {
          if (ws === "attendance" && onSwitchToAttendance) onSwitchToAttendance();
          if (ws === "assessments" && onSwitchToAssessments) onSwitchToAssessments();
        }}
        saveStatus={saveStatus}
        saveErrorMessage={saveError || configSaveError}
        saveDetails={saveErrorDetails}
        termControl={
          activeSheet === "semestral" ? (
            <div className="bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200/90 dark:border-slate-700 flex items-center">
              <span className="bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 shadow-sm text-xs font-semibold px-3 py-1 rounded-md whitespace-nowrap">
                <span className="sm:hidden">Semestral</span>
                <span className="hidden sm:inline">Semestral (Midterm 50% + Final 50%)</span>
              </span>
            </div>
          ) : (
            <SectionTermToggle term={term} onChange={handleTermChange} />
          )
        }
        addActions={[
          {
            label: "Add Student",
            icon: Plus,
            onSelect: () => setIsAddStudentModalOpen(true),
            disabled: !canEditSection || pageLoading || Boolean(pageError),
          },
          {
            label: "Import",
            icon: Users,
            onSelect: () => setIsImportModalOpen(true),
            disabled: !canEditSection || pageLoading || Boolean(pageError),
          },
        ]}
        onExport={handleExport}
        exportDisabled={pageLoading || Boolean(pageError) || (computedRows.length === 0 && semestralRows.length === 0)}
        settingsAction={{
          onClick: () => setIsConfigModalOpen(true),
          disabled: !canEditSection || pageLoading || Boolean(pageError),
          title: "Grading Configuration (Weights & Scales)",
          ariaLabel: "Grading Configuration",
        }}
        overflowActions={[
          { label: "Help", icon: HelpCircle, onSelect: () => setIsGuideModalOpen(true) },
          ...(canEditSection ? [{ label: "Reset grades", icon: RotateCcw, onSelect: handleResetRequest, disabled: pageLoading || Boolean(pageError), danger: true }] : []),
          { label: "Sign out", icon: LogOut, onSelect: onSignOut, danger: true },
        ]}
        overflowLabel="More grading actions"
      >

        <SmartPerformanceRibbon
          analytics={currentAnalytics}
          isSemestral={activeSheet === "semestral"}
          semestralRows={filteredSemestralRows}
        />
        <div className="flex items-center justify-between gap-3 border-b border-outline-variant/60 bg-surface px-3 py-1.5 dark:bg-surface-container text-xs select-none min-h-[44px]">
          <div className="flex min-w-0 items-center gap-2 overflow-x-auto">
            {/* Sheet Mode Segmented Pills */}
            <div
              role="tablist"
              aria-label="Grade sheets"
              className="inline-flex shrink-0 flex-nowrap items-center gap-0.5 rounded-xl border border-outline-variant/50 bg-surface-container-high/60 p-0.5 dark:border-outline-variant/40 dark:bg-surface-container-high/40 shadow-xs"
            >
              {[
                { id: "master", label: "Main Grade Sheet", icon: TableProperties },
                { id: "input", label: "Grade Input Ground", icon: Edit3 },
                { id: "semestral", label: "Semestral Grade", icon: Award },
              ].map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={activeSheet === tab.id}
                    onClick={() => handleSheetChange(tab.id)}
                    className={clsx(
                      "inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 py-1 text-xs font-semibold transition-all duration-200 ease-out select-none cursor-pointer",
                      activeSheet === tab.id
                        ? "bg-surface text-primary shadow-xs ring-1 ring-outline-variant/50 dark:bg-surface-container dark:text-primary"
                        : "text-on-surface-variant hover:bg-surface/50 hover:text-on-surface"
                    )}
                  >
                    <Icon className={clsx("h-3.5 w-3.5", activeSheet === tab.id ? "text-primary" : "text-on-surface-variant")} />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Divider */}
            <div className="hidden md:block h-4 w-px bg-outline-variant/60 shrink-0" aria-hidden="true" />

            {/* Student Performance Filter Segmented Group */}
            <div
              role="group"
              aria-label="Student performance filters"
              className="inline-flex shrink-0 flex-nowrap items-center gap-0.5 rounded-xl border border-outline-variant/50 bg-surface-container-high/40 p-0.5 dark:border-outline-variant/40 shadow-xs"
            >
              {[
                { id: "ALL", label: "All", count: currentAnalytics.counts?.total || 0 },
                { id: "BEST", label: "Best", count: currentAnalytics.counts?.best || 0 },
                { id: "SATISFACTORY", label: "Good", count: currentAnalytics.counts?.satisfactory || 0 },
                { id: "NEEDS_IMPROVEMENT", label: "Needs Imprv", count: currentAnalytics.counts?.needsImprovement || 0 },
                { id: "FAILED", label: "Failed", count: currentAnalytics.counts?.failed || 0 },
              ].map(({ id, label, count }) => {
                const isActive = activeFilter === id;
                const activeStyles = id === "FAILED"
                  ? "border-rose-500/40 bg-rose-500/10 text-rose-800 dark:text-rose-300 shadow-xs"
                  : id === "NEEDS_IMPROVEMENT"
                    ? "border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-300 shadow-xs"
                    : id === "SATISFACTORY"
                      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 shadow-xs"
                      : id === "BEST"
                        ? "border-primary/40 bg-primary/10 text-primary shadow-xs"
                        : "border-outline-variant/60 bg-surface text-on-surface shadow-xs dark:bg-surface-container";

                return (
                  <button
                    key={id}
                    type="button"
                    aria-pressed={isActive}
                    onClick={() => setActiveFilter(isActive && id !== "ALL" ? "ALL" : id)}
                    className={clsx(
                      "whitespace-nowrap rounded-lg border px-2 py-1 text-xs font-semibold transition-all duration-200 ease-out select-none cursor-pointer",
                      isActive
                        ? activeStyles
                        : "border-transparent text-on-surface-variant hover:bg-surface/60 hover:text-on-surface",
                      count === 0 && !isActive && "opacity-50 hover:opacity-100"
                    )}
                    title={`Filter to ${label === "All" ? "all" : label.toLowerCase()} students`}
                  >
                    {label} <span className="font-mono text-[11px] opacity-75">({count})</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Action Buttons Right Group */}
          <div className="flex shrink-0 items-center gap-1.5 ml-auto">
            {activeSheet === "input" && canEditSection && (
              <AddQuizItemControl onAddQuizItem={addQuizItem} readMode={isReadMode} />
            )}
            {activeSheet === "semestral" && (
              <button
                type="button"
                onClick={() => setIsEquivalenceScaleOpen(true)}
                className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl border border-outline-variant/60 bg-surface px-2.5 py-1 text-xs font-semibold text-on-surface shadow-xs transition-colors hover:bg-surface-container-high dark:bg-surface-container cursor-pointer select-none"
                title="View Official 50–100 to 1.00–5.00 Equivalence Scale"
              >
                <Award className="h-3.5 w-3.5 text-primary" />
                <span>Equivalence Scale</span>
              </button>
            )}
            {activeSheet === "master" && canEditSection && (
              <button
                type="button"
                onClick={() => setIsSyncConfirmOpen(true)}
                disabled={isReadMode}
                className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl border border-outline-variant/60 bg-surface px-2.5 py-1 text-xs font-semibold text-on-surface shadow-xs transition-colors hover:bg-surface-container-high disabled:cursor-not-allowed disabled:opacity-50 dark:bg-surface-container cursor-pointer select-none"
                title={isReadMode ? "Turn off read mode to sync attendance" : "Copy present days from daily attendance logs into AT for this section"}
              >
                <RefreshCw className="h-3.5 w-3.5 text-primary" />
                <span>Sync Attendance</span>
              </button>
            )}
            {canEditSection && (
              <ReadModeToggle enabled={isReadMode} onToggle={() => setIsReadMode((enabled) => !enabled)} />
            )}
            {currentAnalytics.totalStudents > 0 && (
              <button
                type="button"
                onClick={() => setIsAnalyticsModalOpen(true)}
                className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl border border-outline-variant/60 bg-surface px-2.5 py-1 text-xs font-semibold text-on-surface shadow-xs transition-colors hover:bg-surface-container-high dark:bg-surface-container cursor-pointer select-none"
                title="Open Section Grade Insights"
              >
                <BarChart2 className="h-3.5 w-3.5 text-primary" />
                <span>Insights</span>
              </button>
            )}
          </div>
        </div>
      </SectionPageHeader>

      {/* Main Content Area */}
      <main className="flex-1 overflow-hidden flex flex-col p-2 md:p-3">
        <div className="flex-1 bg-white dark:bg-slate-900 rounded-xl shadow-xs border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden relative">
          {pageError ? (
            <div className="flex flex-1 items-center justify-center p-4">
              <div className="max-w-xl rounded-2xl border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/30 p-6 text-center text-red-800 dark:text-red-200" role="alert">
                <h2 className="text-base font-bold">Section data could not be loaded</h2>
                <p className="mt-2 text-sm">
                  {settingsError
                    ? `Application settings: ${settingsError.message || "Unable to load settings."}`
                    : `Grade data: ${error.message || "Unable to load grade data."}`}
                </p>
                <button
                  type="button"
                  onClick={settingsError ? refreshConfig : refreshData}
                  className="mt-4 inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
                >
                  <RotateCcw className="h-4 w-4" />
                  Retry loading
                </button>
              </div>
            </div>
          ) : pageLoading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : activeSheet === "master" ? (
            <GradeMasterTable
              computedRows={filteredComputedRows}
              totalStudents={students.length}
              config={config}
              grades={grades}
              onUpdateScore={updateScore}
              onUpdateRtMax={updateRtMax}
              onUpdateAtMax={updateAtMax}
              activeFilter={activeFilter}
              readMode={isReadMode}
            />
          ) : activeSheet === "input" ? (
            <GradeInputGround
              computedRows={filteredComputedRows}
              totalStudents={students.length}
              config={config}
              grades={grades}
              onUpdateScore={updateScore}
              onUpdateQuizScore={updateQuizScore}
              onUpdatePeMax={updatePeMax}
              onUpdateMeMax={updateMeMax}
              onUpdateQuizItemMax={updateQuizItemMax}
              onRemoveQuizItem={canEditSection ? removeQuizItem : undefined}
              activeFilter={activeFilter}
              readMode={isReadMode}
            />
          ) : (
            <SemestralGradeTable
              semestralRows={filteredSemestralRows}
              activeFilter={activeFilter}
              readMode={isReadMode}
            />
          )}
        </div>
      </main>
    </div>
  );
}
