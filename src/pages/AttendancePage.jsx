import React, { useMemo, useState } from "react";
import AttendanceTable from "../components/AttendanceTable";
import ConfirmModal from "../components/ConfirmModal";
import { useAttendance } from "../hooks/useAttendance";
import { useSettings } from "../hooks/useSettings";
import { generateDates } from "../utils/dateUtils";
import {
  ArrowLeft,
  Calendar,
  Award,
  ArrowRight,
  BookOpen,
  RotateCcw,
  GraduationCap,
  School,
  Sparkles,
  CheckSquare,
  FileSpreadsheet,
  Settings,
  LogOut,
  Users,
} from "lucide-react";
import InputModal from "../components/InputModal";
import { exportToExcel } from "../utils/exportUtils";
import ExportConfigurationModal from "../components/ExportConfigurationModal";
import SettingsModal from "../components/SettingsModal";
import ImportStudentsModal from "../components/ImportStudentsModal";

export default function AttendancePage({ sectionId, onBack, onSwitchToGrading, onSignOut }) {
  const [term, setTerm] = useState("midterm");

  const { termDates, updateTermDates, appConfig, updateClassSchedules } = useSettings();

  const renderLogo = () => {
    const logo = appConfig?.logo;
    if (logo && (logo.startsWith("data:") || logo.startsWith("http") || logo.startsWith("/"))) {
      return <img src={logo} alt="Logo" className="w-5 h-5 object-contain rounded" />;
    }
    if (logo === "GraduationCap") return <GraduationCap className="w-5 h-5 text-white" />;
    if (logo === "Award") return <Award className="w-5 h-5 text-white" />;
    if (logo === "BookOpen") return <BookOpen className="w-5 h-5 text-white" />;
    if (logo === "School") return <School className="w-5 h-5 text-white" />;
    if (logo === "Sparkles") return <Sparkles className="w-5 h-5 text-white" />;
    if (logo === "CheckSquare") return <CheckSquare className="w-5 h-5 text-white" />;
    return <Calendar className="w-5 h-5 text-white" />;
  };

  const handleUpdateTermDates = (updateAction) => {
    const newDates =
      typeof updateAction === "function"
        ? updateAction(termDates)
        : updateAction;
    return updateTermDates(newDates);
  };

  const dates = useMemo(() => {
    const start = term === "midterm" ? termDates?.midtermStart : termDates?.finalsStart;
    const end = term === "midterm" ? termDates?.midtermEnd : termDates?.finalsEnd;

    if (!start || !end) {
      return [];
    }

    return generateDates(start, end);
  }, [term, termDates]);

  const scheduleConfig = useMemo(() => {
    return appConfig?.schedules?.[sectionId];
  }, [appConfig?.schedules, sectionId]);

  const {
    students,
    attendance,
    customHolidays,
    loading,
    addStudent,
    updateStudent,
    deleteStudent,
    deleteAllStudents,
    toggleAttendance,
    resetAttendance,
    batchAddStudents,
    addCustomHoliday,
    updateCustomHoliday,
    removeCustomHoliday,
    stats,
    totalSchoolDays,
    error,
  } = useAttendance(dates, sectionId, scheduleConfig);

  const [modal, setModal] = useState({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {},
    isDestructive: false,
  });

  const [inputModal, setInputModal] = useState({
    isOpen: false,
    title: "",
    defaultValue: "",
    onConfirm: () => {},
  });

  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  const closeModal = () => setModal((prev) => ({ ...prev, isOpen: false }));
  const closeInputModal = () =>
    setInputModal((prev) => ({ ...prev, isOpen: false }));

  const handleResetRequest = () => {
    setModal({
      isOpen: true,
      title: "Reset Attendance?",
      message: `Are you sure you want to clear all attendance records for Section ${sectionId} in ${term.toUpperCase()}? This cannot be undone.`,
      isDestructive: true,
      onConfirm: () => {
        resetAttendance();
        closeModal();
      },
    });
  };

  const handleDeleteAllStudentsRequest = () => {
    setModal({
      isOpen: true,
      title: "Delete All Students?",
      message: `Are you sure you want to delete ALL ${students.length} students in Section ${sectionId}? This cannot be undone.`,
      isDestructive: true,
      onConfirm: () => {
        deleteAllStudents();
        closeModal();
      },
    });
  };

  const handleDeleteStudentRequest = (id) => {
    const student = students.find((s) => s.id === id);
    setModal({
      isOpen: true,
      title: "Delete Student?",
      message: `Remove ${student?.name}?`,
      isDestructive: true,
      onConfirm: () => {
        deleteStudent(id);
        closeModal();
      },
    });
  };

  const handleEditStudentRequest = (student) => {
    setInputModal({
      isOpen: true,
      title: "Edit Student Name",
      defaultValue: student.name,
      onConfirm: (newName) => {
        updateStudent(student.id, newName);
        closeInputModal();
      },
    });
  };

  const handleSaveSectionSettings = (settings) => {
    const newSchedules = { ...appConfig?.schedules, [sectionId]: settings.schedule };
    return updateClassSchedules(newSchedules);
  };

  const handleExportRequest = () => {
    setIsExportModalOpen(true);
  };

  const executeExport = (headerInfo) => {
    exportToExcel({
      sectionId,
      term,
      dates,
      students,
      attendance,
      customHolidays,
      stats,
      totalSchoolDays,
      headerInfo,
      scheduleConfig,
    });
    setIsExportModalOpen(false);
  };

  return (
    <div className="flex flex-col h-screen bg-slate-50 dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100 select-none">
      <ExportConfigurationModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        onExport={executeExport}
        sectionId={sectionId}
        term={term}
        studentCount={students.length}
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
      <ConfirmModal {...modal} onCancel={closeModal} />
      <InputModal
        isOpen={inputModal.isOpen}
        title={inputModal.title}
        defaultValue={inputModal.defaultValue}
        onConfirm={inputModal.onConfirm}
        onCancel={closeInputModal}
      />
      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        sectionId={sectionId}
        customHolidays={customHolidays}
        addHoliday={addCustomHoliday}
        updateHoliday={updateCustomHoliday}
        removeHoliday={removeCustomHoliday}
        termDates={termDates}
        onUpdateTermDates={handleUpdateTermDates}
        currentSchedule={appConfig?.schedules?.[sectionId]}
        onSaveSchedule={handleSaveSectionSettings}
        onDeleteAllStudents={handleDeleteAllStudentsRequest}
        hasStudents={students.length > 0}
      />

      {/* Main Top Header - Unified & Aligned */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 py-2.5 flex items-center justify-between shadow-xs sticky top-0 z-30">
        {/* Left: Back, Logo, Section & Solo Switch Button */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
            title="Back to Section Selection"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div className="bg-emerald-600 text-white p-2 rounded-xl shadow-xs w-9 h-9 flex items-center justify-center overflow-hidden shrink-0">
            {renderLogo()}
          </div>

          <div className="flex items-center gap-2.5">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-black text-slate-800 dark:text-slate-100 tracking-tight leading-tight">
                  Section {sectionId}
                </h1>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-extrabold uppercase border border-emerald-200 dark:border-emerald-800">
                  Attendance
                </span>
              </div>
              {appConfig?.title && (
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium truncate max-w-[140px] sm:max-w-xs">
                  {appConfig.title}
                </p>
              )}
            </div>

            {/* Solo Switch to Grades Button */}
            {onSwitchToGrading && (
              <button
                type="button"
                onClick={onSwitchToGrading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 transition-all cursor-pointer shadow-2xs hover:shadow-xs group ml-1"
                title={`Switch directly to Grades for Section ${sectionId}`}
              >
                <Award className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform" />
                <span className="hidden sm:inline">Go to Grades</span>
                <span className="sm:hidden">Grades</span>
                <ArrowRight className="w-3.5 h-3.5 text-blue-500 group-hover:translate-x-0.5 transition-transform" />
              </button>
            )}
          </div>
        </div>

        {/* Center: Term Tabs Switcher */}
        <div role="group" aria-label="Attendance term" className="flex items-center gap-1 rounded-xl border border-slate-300 bg-slate-200 p-1 dark:border-slate-700 dark:bg-slate-800">
          <button
            type="button"
            aria-pressed={term === "midterm"}
            onClick={() => setTerm("midterm")}
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
            onClick={() => setTerm("finals")}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              term === "finals"
                ? "bg-emerald-700 text-white shadow-sm ring-1 ring-emerald-800 dark:bg-emerald-500 dark:text-slate-950 dark:ring-emerald-400"
                : "text-slate-600 hover:bg-white/70 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-white"
            }`}
          >
            Finals
          </button>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          {/* School Days Pill */}
          <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-bold">
            <BookOpen className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>{totalSchoolDays} Days</span>
          </div>

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
            onClick={handleExportRequest}
            disabled={students.length === 0}
            className="flex items-center gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg font-bold transition-colors shadow-2xs disabled:opacity-50 cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Export</span>
          </button>

          <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 mx-0.5" />

          <button
            type="button"
            onClick={() => setIsSettingsModalOpen(true)}
            className="p-1.5 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-200 rounded-lg transition-colors cursor-pointer"
            title="Attendance Settings (Schedules & Holidays)"
            aria-label="Attendance settings"
          >
            <Settings className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={handleResetRequest}
            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors cursor-pointer"
            title="Reset Attendance"
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

      {error && (
        <div className="bg-red-100 text-red-800 p-2 text-center text-xs font-bold">
          Database Error: {error.message || "Failed to communicate with PostgreSQL server."}
        </div>
      )}

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <main className="flex-1 overflow-hidden flex flex-col p-2 md:p-4 max-w-[1920px] mx-auto w-full">
          <div className="flex-1 bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden relative">
            <AttendanceTable
              dates={dates}
              students={students}
              attendance={attendance}
              toggleAttendance={toggleAttendance}
              addStudent={addStudent}
              deleteStudent={handleDeleteStudentRequest}
              editStudent={handleEditStudentRequest}
              stats={stats}
              sectionId={sectionId}
              customHolidays={customHolidays}
              totalSchoolDays={totalSchoolDays}
              schedules={appConfig?.schedules}
            />
          </div>
        </main>
      )}
    </div>
  );
}
