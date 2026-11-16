import React, { useMemo, useRef, useState } from "react";
import AttendanceTable from "../components/AttendanceTable";
import ConfirmModal from "../components/ConfirmModal";
import { useAttendance } from "../hooks/useAttendance";
import { useSettings } from "../hooks/useSettings";
import { generateDates } from "../utils/dateUtils";
import {
  Calendar,
  CalendarDays,
  RotateCcw,
  LogOut,
  Plus,
  Users,
} from "lucide-react";
import InputModal from "../components/InputModal";
import { exportToExcel } from "../utils/exportUtils";
import ExportConfigurationModal from "../components/ExportConfigurationModal";
import SettingsModal from "../components/SettingsModal";
import ImportStudentsModal from "../components/ImportStudentsModal";
import SectionPageHeader, { SectionTermToggle } from "../components/SectionPageHeader";
import { useToast } from "../context/ToastContext";
import { getTermDateRange } from "../../shared/termDates.js";

export default function AttendancePage({ sectionId, currentUser, onBack, onSwitchToGrading, onSwitchToAssessments, onSignOut }) {
  const [term, setTerm] = useState("midterm");
  const canEditSection = currentUser?.role === "admin" || currentUser?.role === "teacher";

  const {
    termDates,
    appConfig,
    saveSectionSettings,
    loading: settingsLoading,
    error: settingsError,
    refreshConfig,
  } = useSettings();
  const toast = useToast();

  const attendancePeriod = useMemo(
    () => getTermDateRange(term, termDates),
    [term, termDates]
  );
  const dates = useMemo(
    () => attendancePeriod
      ? generateDates(attendancePeriod.startDate, attendancePeriod.endDate)
      : [],
    [attendancePeriod]
  );

  const scheduleConfig = useMemo(() => {
    return appConfig?.schedules?.[sectionId];
  }, [appConfig?.schedules, sectionId]);

  const {
    students,
    attendance,
    customHolidays,
    holidaysLoading,
    holidaysError,
    loading,
    addStudent,
    updateStudent,
    deleteStudent,
    deleteAllStudents,
    toggleAttendance,
    resetAttendance,
    batchAddStudents,
    replaceCustomHolidays,
    stats,
    totalSchoolDays,
    saveStatus: attendanceSaveStatus,
    saveError: attendanceSaveError,
    error,
    refreshData,
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
  const [settingsSaveStatus, setSettingsSaveStatus] = useState("saved");
  const [settingsSaveError, setSettingsSaveError] = useState(null);
  const addStudentInputRef = useRef(null);

  const saveStatus = attendanceSaveStatus === "saving" || settingsSaveStatus === "saving"
    ? "saving"
    : attendanceSaveError || settingsSaveError
      ? "error"
      : "saved";
  const saveErrorMessage = settingsSaveError || attendanceSaveError;

  const closeModal = () => setModal((prev) => ({ ...prev, isOpen: false }));
  const closeInputModal = () =>
    setInputModal((prev) => ({ ...prev, isOpen: false }));

  const handleResetRequest = () => {
    if (!attendancePeriod) {
      toast.error("Set valid start and end dates for this term before resetting attendance.");
      return;
    }

    setModal({
      isOpen: true,
      title: "Reset Attendance?",
      message: `Are you sure you want to clear all attendance records for Section ${sectionId} in ${term.toUpperCase()}? This cannot be undone.`,
      isDestructive: true,
      onConfirm: async () => {
        try {
          await resetAttendance(attendancePeriod.startDate, attendancePeriod.endDate);
          closeModal();
        } catch (err) {
          toast.error(err.message || "Failed to reset attendance.");
        }
      },
    });
  };

  const handleDeleteAllStudentsRequest = () => {
    setModal({
      isOpen: true,
      title: "Delete All Students?",
      message: `Are you sure you want to delete ALL ${students.length} students in Section ${sectionId}? This cannot be undone.`,
      isDestructive: true,
      onConfirm: async () => {
        try {
          await deleteAllStudents();
          closeModal();
        } catch (err) {
          toast.error(err.message || "Failed to delete students.");
        }
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
      onConfirm: async () => {
        try {
          await deleteStudent(id);
          closeModal();
        } catch (err) {
          toast.error(err.message || "Failed to delete student.");
        }
      },
    });
  };

  const handleEditStudentRequest = (student) => {
    setInputModal({
      isOpen: true,
      title: "Edit Student Name",
      defaultValue: student.name,
      onConfirm: async (newName) => {
        try {
          await updateStudent(student.id, newName);
          closeInputModal();
        } catch (err) {
          toast.error(err.message || "Failed to update student.");
        }
      },
    });
  };

  const handleSaveSectionSettings = async (settings) => {
    setSettingsSaveError(null);
    setSettingsSaveStatus("saving");
    try {
      const result = await saveSectionSettings(sectionId, settings);
      if (result.holidays) replaceCustomHolidays(result.holidays);
      setSettingsSaveStatus("saved");
      return result;
    } catch (saveError) {
      setSettingsSaveError(saveError);
      setSettingsSaveStatus("error");
      throw saveError;
    }
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
        onImport={async (names) => {
          await batchAddStudents(names);
        }}
        sectionId={sectionId}
        appConfig={appConfig}
        existingNames={students.map((student) => student.name)}
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
        termDates={termDates}
        currentSchedule={appConfig?.schedules?.[sectionId]}
        onSaveSettings={handleSaveSectionSettings}
        onDeleteAllStudents={handleDeleteAllStudentsRequest}
        hasStudents={students.length > 0}
        currentUser={currentUser}
      />

      <SectionPageHeader
        sectionId={sectionId}
        appConfig={appConfig}
        onBack={onBack}
        workspace="Attendance"
        onSwitchWorkspace={(ws) => {
          if (ws === "grading" && onSwitchToGrading) onSwitchToGrading();
          if (ws === "assessments" && onSwitchToAssessments) onSwitchToAssessments();
        }}
        saveStatus={saveStatus}
        saveErrorMessage={saveErrorMessage?.message || saveErrorMessage}
        badge={
          !settingsLoading &&
          !holidaysLoading &&
          !loading &&
          !settingsError &&
          !holidaysError &&
          !error ? (
            <div
              role="note"
              className="inline-flex items-center gap-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-md border border-slate-200/70 dark:border-slate-700 font-medium text-[11px]"
              aria-label={`${totalSchoolDays} class days`}
              title={`Total registered attendance sessions: ${totalSchoolDays} Days`}
            >
              <Calendar className="w-3 h-3 text-slate-500 dark:text-slate-400" />
              <span>{totalSchoolDays} Days</span>
            </div>
          ) : null
        }
        termControl={<SectionTermToggle term={term} onChange={setTerm} />}
        addActions={[
          {
            label: "Add Student",
            icon: Plus,
            onSelect: () => addStudentInputRef.current?.focus(),
            disabled: !canEditSection || loading || holidaysLoading || Boolean(error) || Boolean(holidaysError) || settingsLoading || Boolean(settingsError),
          },
          {
            label: "Import",
            icon: Users,
            onSelect: () => setIsImportModalOpen(true),
            disabled: !canEditSection || loading || holidaysLoading || Boolean(error) || Boolean(holidaysError) || settingsLoading || Boolean(settingsError),
          },
        ]}
        onExport={handleExportRequest}
        exportDisabled={students.length === 0 || loading || holidaysLoading || Boolean(error) || Boolean(holidaysError) || settingsLoading || Boolean(settingsError)}
        settingsAction={{
          onClick: () => setIsSettingsModalOpen(true),
          disabled: loading || holidaysLoading || Boolean(error) || Boolean(holidaysError) || settingsLoading || Boolean(settingsError),
          title: "Attendance Settings (Schedules & Holidays)",
          ariaLabel: "Attendance settings",
        }}
        overflowActions={[
          ...(canEditSection ? [{
            label: "Reset attendance",
            icon: RotateCcw,
            onSelect: handleResetRequest,
            disabled: !attendancePeriod || loading || Boolean(error) || settingsLoading || Boolean(settingsError),
            danger: true,
          }] : []),
          { label: "Sign out", icon: LogOut, onSelect: onSignOut, danger: true },
        ]}
        overflowLabel="More attendance actions"
      />

      {settingsError || error || holidaysError ? (
        <main className="flex-1 flex items-center justify-center p-4">
          <div className="max-w-xl rounded-2xl border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/30 p-6 text-center text-red-800 dark:text-red-200" role="alert">
            <h2 className="text-base font-bold">Section data could not be loaded</h2>
            <p className="mt-2 text-sm">
              {settingsError
                ? `Application settings: ${settingsError.message || "Unable to load settings."}`
                : error
                  ? `Attendance data: ${error.message || "Unable to load attendance data."}`
                  : `Holiday data: ${holidaysError.message || "Unable to load holiday data."}`}
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
        </main>
      ) : loading || holidaysLoading || settingsLoading ? (
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
              schedules={appConfig?.schedules}
              addStudentInputRef={addStudentInputRef}
            />
          </div>
        </main>
      )}
    </div>
  );
}
