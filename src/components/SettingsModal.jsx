import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  X,
  Calendar,
  Plus,
  Trash2,
  Edit2,
  Settings,
  Globe,
  MapPin,
  Save,
  Sun,
  Moon,
  Check,
  AlertCircle,
  Palette,
  Sparkles,
  Clock,
  ShieldAlert,
} from "lucide-react";
import clsx from "clsx";
import { format } from "date-fns";
import ConfirmModal from "./ConfirmModal";
import { useTheme } from "../context/ThemeContext";

const DAYS = [
  { id: 0, label: "Sunday" },
  { id: 1, label: "Monday" },
  { id: 2, label: "Tuesday" },
  { id: 3, label: "Wednesday" },
  { id: 4, label: "Thursday" },
  { id: 5, label: "Friday" },
  { id: 6, label: "Saturday" },
];

const formatDateForInput = (date) => {
  if (!date) return "";
  try {
    return format(new Date(date), "yyyy-MM-dd");
  } catch {
    return "";
  }
};

export default function SettingsModal({
  isOpen,
  onClose,
  sectionId,
  // Global Settings Props
  customHolidays = [],
  addHoliday,
  updateHoliday,
  removeHoliday,
  termDates = {},
  onUpdateTermDates,
  // Section Settings Props
  currentSchedule,
  onSaveSchedule,
  onDeleteAllStudents,
  hasStudents,
}) {
  const [activeTab, setActiveTab] = useState("schedule");
  const [date, setDate] = useState("");
  const [name, setName] = useState("");
  const [editingHolidayId, setEditingHolidayId] = useState(null);
  const { theme, setTheme } = useTheme();
  const [selectedTheme, setSelectedTheme] = useState(theme);
  const [localTermDates, setLocalTermDates] = useState(termDates || {});
  const [selectedDays, setSelectedDays] = useState([]);
  const [localHolidays, setLocalHolidays] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const isSavingRef = useRef(false);

  const [deleteHolidayModal, setDeleteHolidayModal] = useState({
    isOpen: false,
    holidayId: null,
    holidayName: "",
  });

  const initialSchedule = useMemo(() => {
    return Array.isArray(currentSchedule)
      ? [...currentSchedule].sort()
      : [1, 2, 3, 4, 5];
  }, [currentSchedule]);

  useEffect(() => {
    if (isSavingRef.current) return;
    if (isOpen) {
      if (currentSchedule && Array.isArray(currentSchedule)) {
        setSelectedDays([...currentSchedule].sort());
      } else {
        setSelectedDays([1, 2, 3, 4, 5]);
      }
      setLocalTermDates(termDates ? { ...termDates } : {});
      setLocalHolidays(
        Array.isArray(customHolidays)
          ? JSON.parse(JSON.stringify(customHolidays))
          : [],
      );
      setSelectedTheme(theme);
      setActiveTab("schedule");
      setIsSaving(false);
      setSaveError("");
      setDate("");
      setName("");
      setEditingHolidayId(null);
    }
  }, [isOpen, currentSchedule, termDates, customHolidays, theme]);

  const hasUnsavedSchedule = useMemo(() => {
    if (selectedDays.length !== initialSchedule.length) return true;
    const sorted = [...selectedDays].sort();
    return sorted.some((d, i) => d !== initialSchedule[i]);
  }, [selectedDays, initialSchedule]);

  const hasUnsavedDates = useMemo(() => {
    return JSON.stringify(localTermDates) !== JSON.stringify(termDates || {});
  }, [localTermDates, termDates]);

  const hasUnsavedHolidays = useMemo(() => {
    if (localHolidays.length !== customHolidays.length) return true;
    return localHolidays.some((local) => {
      if (local.isStagedNew || String(local.id).startsWith("temp_"))
        return true;
      const original = customHolidays.find(
        (holiday) => holiday.id === local.id,
      );
      return (
        !original ||
        original.name !== local.name ||
        formatDateForInput(original.date) !== formatDateForInput(local.date)
      );
    });
  }, [localHolidays, customHolidays]);

  const hasUnsavedTheme = selectedTheme !== theme;

  const hasUnsavedChanges =
    hasUnsavedSchedule ||
    hasUnsavedDates ||
    hasUnsavedHolidays ||
    hasUnsavedTheme;

  const handleClose = () => {
    // Reset staged values back to incoming props
    setSelectedTheme(theme);
    setLocalTermDates(termDates ? { ...termDates } : {});
    setSelectedDays(
      Array.isArray(currentSchedule)
        ? [...currentSchedule].sort()
        : [1, 2, 3, 4, 5],
    );
    setLocalHolidays(
      Array.isArray(customHolidays)
        ? JSON.parse(JSON.stringify(customHolidays))
        : [],
    );
    setDate("");
    setName("");
    setEditingHolidayId(null);
    onClose();
  };

  if (!isOpen) return null;

  // Holiday changes are staged locally and saved together with the other settings.
  const handleHolidaySubmit = (e) => {
    e.preventDefault();
    setSaveError("");
    const trimmedName = name.trim();
    if (date && trimmedName) {
      if (editingHolidayId !== null) {
        setLocalHolidays((prev) =>
          prev.map((holiday) =>
            holiday.id === editingHolidayId
              ? { ...holiday, date, name: trimmedName }
              : holiday,
          ),
        );
        setEditingHolidayId(null);
      } else {
        const newHoliday = {
          id: `temp_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
          date,
          name: trimmedName,
          isStagedNew: true,
        };
        setLocalHolidays((prev) => [...prev, newHoliday]);
      }
      setDate("");
      setName("");
    }
  };

  const handleEditHoliday = (holiday) => {
    setEditingHolidayId(holiday.id);
    setDate(formatDateForInput(holiday.date));
    setName(holiday.name);
    setSaveError("");
  };

  // Staged local holiday deletion - does NOT hit API until Save Changes
  const handleExecuteDeleteHoliday = (holidayId) => {
    setLocalHolidays((prev) => prev.filter((h) => h.id !== holidayId));
    if (editingHolidayId === holidayId) {
      setEditingHolidayId(null);
      setDate("");
      setName("");
    }
    setSaveError("");
    setDeleteHolidayModal({ isOpen: false, holidayId: null, holidayName: "" });
  };

  const handleDateChange = (key, value) => {
    setLocalTermDates((prev) => ({ ...prev, [key]: value }));
  };

  const toggleDay = (dayId) => {
    setSelectedDays((prev) =>
      prev.includes(dayId)
        ? prev.filter((d) => d !== dayId)
        : [...prev, dayId].sort(),
    );
  };

  const handleSave = async () => {
    isSavingRef.current = true;
    setIsSaving(true);
    setSaveError("");
    try {
      // 1. Save Term Dates if changed
      if (hasUnsavedDates) {
        await onUpdateTermDates(localTermDates);
      }
      // 2. Save Class Schedule if changed
      if (hasUnsavedSchedule) {
        const sortedSchedule = [...selectedDays].sort();
        await onSaveSchedule({ schedule: sortedSchedule });
      }
      // 3. Save Custom Holidays if changed
      if (hasUnsavedHolidays) {
        // Delete removed holidays
        const toDelete = customHolidays.filter(
          (orig) => !localHolidays.some((local) => local.id === orig.id),
        );
        for (const hol of toDelete) {
          await removeHoliday(hol.id);
        }
        const toUpdate = localHolidays.filter((local) => {
          if (local.isStagedNew || String(local.id).startsWith("temp_"))
            return false;
          const original = customHolidays.find(
            (holiday) => holiday.id === local.id,
          );
          return (
            original &&
            (original.name !== local.name ||
              formatDateForInput(original.date) !==
                formatDateForInput(local.date))
          );
        });
        for (const hol of toUpdate) {
          await updateHoliday(hol.id, hol.date, hol.name);
        }
        // Add newly staged holidays
        const toAdd = localHolidays.filter(
          (local) => local.isStagedNew || String(local.id).startsWith("temp_"),
        );
        for (const hol of toAdd) {
          await addHoliday(hol.date, hol.name);
        }
      }
      // 4. Apply Theme if changed
      if (hasUnsavedTheme) {
        setTheme(selectedTheme);
      }

      onClose();
    } catch (err) {
      console.error("Failed to save settings:", err);
      setSaveError("Some changes could not be saved. Please try again.");
    } finally {
      isSavingRef.current = false;
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
      <ConfirmModal
        isOpen={deleteHolidayModal.isOpen}
        title="Remove Custom Holiday?"
        message={`Remove "${deleteHolidayModal.holidayName}" from holidays? (Changes apply when clicking Save Changes)`}
        onConfirm={() =>
          handleExecuteDeleteHoliday(deleteHolidayModal.holidayId)
        }
        onCancel={() =>
          setDeleteHolidayModal({
            isOpen: false,
            holidayId: null,
            holidayName: "",
          })
        }
        isDestructive={true}
        confirmText="Remove"
      />

      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-200">
        {/* Header - Identical Design with Grading Configuration */}
        <div className="bg-slate-800 dark:bg-slate-950 text-white px-6 py-4 flex items-center justify-between border-b border-slate-700/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
              <Settings className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h2 className="font-bold text-lg leading-tight">
                Attendance &amp; Section Settings
              </h2>
              <p className="text-xs text-slate-300">
                Configuring Section {sectionId} schedule, term dates, and
                calendar
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 hover:bg-slate-700 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-300 cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs - Identical Design with Grading Configuration */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 px-6 bg-slate-50 dark:bg-slate-850 overflow-x-auto select-none cursor-grab">
          <button
            type="button"
            onClick={() => setActiveTab("schedule")}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === "schedule"
                ? "border-emerald-600 text-emerald-700 dark:text-emerald-400 bg-white dark:bg-slate-900"
                : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            Class Schedule
            {hasUnsavedSchedule && (
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("dates")}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === "dates"
                ? "border-emerald-600 text-emerald-700 dark:text-emerald-400 bg-white dark:bg-slate-900"
                : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            Term Dates
            {hasUnsavedDates && (
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("holidays")}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === "holidays"
                ? "border-emerald-600 text-emerald-700 dark:text-emerald-400 bg-white dark:bg-slate-900"
                : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            Custom Holidays
            {localHolidays.length > 0 && (
              <span className="text-[10px] bg-slate-200 dark:bg-slate-700 px-1.5 py-0.2 rounded-full font-bold">
                {localHolidays.length}
              </span>
            )}
            {hasUnsavedHolidays && (
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("appearance")}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === "appearance"
                ? "border-emerald-600 text-emerald-700 dark:text-emerald-400 bg-white dark:bg-slate-900"
                : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            <Palette className="w-3.5 h-3.5" />
            Appearance
            {hasUnsavedTheme && (
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("danger")}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === "danger"
                ? "border-red-600 text-red-600 dark:text-red-400 bg-white dark:bg-slate-900"
                : "border-transparent text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400"
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5 text-red-500" />
            Reset Data
          </button>
        </div>

        {/* Tab Body Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">
          {/* TAB 1: Class Schedule */}
          {activeTab === "schedule" && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-850/40">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    Section {sectionId} Meeting Days
                  </h4>
                  {hasUnsavedSchedule && (
                    <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800 flex items-center gap-1 animate-in fade-in">
                      <AlertCircle className="w-3 h-3" /> Schedule Modified
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Select the active weekly class meeting days for Section{" "}
                  {sectionId}. Days left unchecked will be marked as &quot;No
                  Class&quot; on the attendance sheet.
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {DAYS.map((day) => (
                  <label
                    key={day.id}
                    className={clsx(
                      "flex items-center gap-3 p-3.5 rounded-xl border cursor-pointer transition-all select-none",
                      selectedDays.includes(day.id)
                        ? "bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 shadow-2xs"
                        : "bg-slate-50 dark:bg-slate-850/50 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800",
                    )}
                  >
                    <input
                      type="checkbox"
                      className="rounded border-slate-300 dark:border-slate-600 text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                      checked={selectedDays.includes(day.id)}
                      onChange={() => toggleDay(day.id)}
                    />
                    <div className="flex flex-col">
                      <span
                        className={clsx(
                          "text-sm font-bold",
                          selectedDays.includes(day.id)
                            ? "text-emerald-800 dark:text-emerald-300"
                            : "text-slate-700 dark:text-slate-300",
                        )}
                      >
                        {day.label}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {selectedDays.includes(day.id)
                          ? "Active meeting day"
                          : "No class scheduled"}
                      </span>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: Term Dates */}
          {activeTab === "dates" && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-850/40">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    Academic Term Schedules
                  </h4>
                  {hasUnsavedDates && (
                    <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800 flex items-center gap-1 animate-in fade-in">
                      <AlertCircle className="w-3 h-3" /> Dates Modified
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Define start and end dates for Midterm and Finals periods.
                  Dates generate the calendar columns on the attendance sheet.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50/50 dark:bg-slate-850/40 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 block">
                    Midterm Start
                  </label>
                  <input
                    type="date"
                    className="w-full text-sm border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                    value={formatDateForInput(localTermDates?.midtermStart)}
                    onChange={(e) =>
                      handleDateChange("midtermStart", e.target.value)
                    }
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 block">
                    Midterm End
                  </label>
                  <input
                    type="date"
                    className="w-full text-sm border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                    value={formatDateForInput(localTermDates?.midtermEnd)}
                    onChange={(e) =>
                      handleDateChange("midtermEnd", e.target.value)
                    }
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 block">
                    Finals Start
                  </label>
                  <input
                    type="date"
                    className="w-full text-sm border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                    value={formatDateForInput(localTermDates?.finalsStart)}
                    onChange={(e) =>
                      handleDateChange("finalsStart", e.target.value)
                    }
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 block">
                    Finals End
                  </label>
                  <input
                    type="date"
                    className="w-full text-sm border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                    value={formatDateForInput(localTermDates?.finalsEnd)}
                    onChange={(e) =>
                      handleDateChange("finalsEnd", e.target.value)
                    }
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Custom Holidays (Staged locally!) */}
          {activeTab === "holidays" && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-850/40">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Globe className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    Manage Custom Holidays
                  </h4>
                  {hasUnsavedHolidays && (
                    <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800 flex items-center gap-1 animate-in fade-in">
                      <AlertCircle className="w-3 h-3" /> Holidays Modified
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Add local non-working holidays. Standard legal holidays are
                  automatically blocked. Changes will be saved to the database
                  only when you click &quot;Save Changes&quot;.
                </p>
              </div>

              {/* Add Holiday Form */}
              <form
                onSubmit={handleHolidaySubmit}
                className="grid grid-cols-1 items-center gap-2 sm:grid-cols-[11rem_minmax(0,1fr)_auto]"
              >
                <input
                  type="date"
                  required
                  className="h-10 min-w-0 w-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-lg px-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none shadow-2xs"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
                <input
                  type="text"
                  placeholder="Holiday Name (e.g. Foundation Day)"
                  required
                  className="h-10 min-w-0 w-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-lg px-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none shadow-2xs"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
                <div className="flex items-center gap-2">
                  <button
                    type="submit"
                    className="inline-flex h-10 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg bg-emerald-600 px-3 text-sm font-bold text-white shadow-xs transition-colors hover:bg-emerald-700"
                  >
                    {editingHolidayId !== null ? (
                      <Save className="h-4 w-4" />
                    ) : (
                      <Plus className="h-4 w-4" />
                    )}
                    {editingHolidayId !== null ? "Update" : "Add Holiday"}
                  </button>
                  {editingHolidayId !== null && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingHolidayId(null);
                        setDate("");
                        setName("");
                      }}
                      className="inline-flex h-10 shrink-0 items-center justify-center whitespace-nowrap rounded-lg border border-slate-300 px-3 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </form>

              {/* Holidays List */}
              <div className="bg-slate-50 dark:bg-slate-850/40 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-inner">
                <div className="px-4 py-2.5 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase border-b border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 flex items-center justify-between">
                  <span>Custom Holidays ({localHolidays.length})</span>
                  {hasUnsavedHolidays && (
                    <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold">
                      (Pending Save)
                    </span>
                  )}
                </div>
                <div className="max-h-[220px] overflow-y-auto">
                  {localHolidays.length === 0 ? (
                    <div className="p-6 text-center text-slate-400 italic text-xs">
                      No custom holidays added yet.
                    </div>
                  ) : (
                    <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                      {localHolidays.map((holiday) => (
                        <li
                          key={holiday.id}
                          className="flex items-center justify-between gap-3 p-3 hover:bg-emerald-50/50 dark:hover:bg-slate-800/80 transition-colors group bg-white dark:bg-slate-850"
                        >
                          <div className="flex min-w-0 flex-col">
                            <div className="flex items-center gap-2">
                              <span className="truncate font-bold text-slate-700 dark:text-slate-200 text-sm">
                                {holiday.name}
                              </span>
                              {holiday.isStagedNew && (
                                <span className="text-[10px] bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.2 rounded font-bold">
                                  New
                                </span>
                              )}
                            </div>
                            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                              {format(new Date(holiday.date), "MMMM d, yyyy")}
                            </span>
                          </div>
                          <div className="inline-flex shrink-0 items-center rounded-lg border border-slate-200 bg-slate-50 p-0.5 dark:border-slate-700 dark:bg-slate-800">
                            <button
                              type="button"
                              onClick={() => handleEditHoliday(holiday)}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-emerald-100 hover:text-emerald-700 dark:text-slate-400 dark:hover:bg-emerald-950/60 dark:hover:text-emerald-300"
                              title={`Edit ${holiday.name}`}
                              aria-label={`Edit ${holiday.name}`}
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setDeleteHolidayModal({
                                  isOpen: true,
                                  holidayId: holiday.id,
                                  holidayName: holiday.name,
                                })
                              }
                              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-red-100 hover:text-red-600 dark:text-slate-400 dark:hover:bg-red-950/50 dark:hover:text-red-400"
                              title="Remove Holiday"
                              aria-label={`Remove ${holiday.name}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: Appearance & Theme */}
          {activeTab === "appearance" && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-850/40">
                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Palette className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  Visual Theme Preferences
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Choose your preferred color theme. Changes will be saved and
                  applied across the app only after you click &quot;Save
                  Changes&quot; below.
                </p>
              </div>

              {/* Theme Pending Notification */}
              {selectedTheme !== theme && (
                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 text-xs text-amber-800 dark:text-amber-300 flex items-center gap-2 animate-in fade-in">
                  <Sparkles className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
                  <span>
                    Theme change pending (
                    {selectedTheme === "dark" ? "Dark Mode" : "Light Mode"}{" "}
                    selected). Click <strong>&quot;Save Changes&quot;</strong>{" "}
                    below to apply it.
                  </span>
                </div>
              )}

              {/* Theme Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Light Theme Card */}
                <div
                  onClick={() => setSelectedTheme("light")}
                  className={clsx(
                    "p-4 rounded-xl border-2 cursor-pointer transition-all flex flex-col justify-between select-none",
                    selectedTheme === "light"
                      ? "border-emerald-600 bg-emerald-50/30 dark:bg-emerald-950/20 shadow-xs"
                      : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850/60 hover:border-slate-300 dark:hover:border-slate-700",
                  )}
                >
                  <div className="flex items-start justify-between">
                    <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 border border-amber-200 flex items-center justify-center">
                      <Sun className="w-5 h-5 text-amber-500" />
                    </div>
                    {selectedTheme === "light" && (
                      <span className="flex items-center gap-1 text-[11px] font-black text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-300 dark:border-emerald-800">
                        <Check className="w-3 h-3" />{" "}
                        {theme === "light" ? "Active" : "Selected"}
                      </span>
                    )}
                  </div>
                  <div className="mt-3">
                    <h5 className="font-bold text-sm text-slate-800 dark:text-slate-100">
                      Light Mode
                    </h5>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Bright, high-clarity background ideal for well-lit
                      classrooms and daytime grading.
                    </p>
                  </div>
                </div>

                {/* Dark Theme Card */}
                <div
                  onClick={() => setSelectedTheme("dark")}
                  className={clsx(
                    "p-4 rounded-xl border-2 cursor-pointer transition-all flex flex-col justify-between select-none",
                    selectedTheme === "dark"
                      ? "border-emerald-600 bg-emerald-950/30 shadow-xs"
                      : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850/60 hover:border-slate-300 dark:hover:border-slate-700",
                  )}
                >
                  <div className="flex items-start justify-between">
                    <div className="w-10 h-10 rounded-xl bg-indigo-950 text-indigo-400 border border-indigo-800 flex items-center justify-center">
                      <Moon className="w-5 h-5 text-indigo-400" />
                    </div>
                    {selectedTheme === "dark" && (
                      <span className="flex items-center gap-1 text-[11px] font-black text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-800">
                        <Check className="w-3 h-3" />{" "}
                        {theme === "dark" ? "Active" : "Selected"}
                      </span>
                    )}
                  </div>
                  <div className="mt-3">
                    <h5 className="font-bold text-sm text-slate-800 dark:text-slate-100">
                      Dark Mode
                    </h5>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Deep midnight tones optimized for reduced eye strain
                      during evening workflows.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: Danger Zone */}
          {activeTab === "danger" && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="p-3.5 rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50/50 dark:bg-red-950/20">
                <h4 className="text-xs font-bold text-red-700 dark:text-red-400 uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-red-600 dark:text-red-400" />
                  Irreversible Data Actions
                </h4>
                <p className="text-xs text-red-600/90 dark:text-red-400/90 mt-1">
                  Actions in this area permanently remove data for Section{" "}
                  {sectionId}. Proceed with caution.
                </p>
              </div>

              <div className="bg-white dark:bg-slate-850 rounded-xl p-5 border border-red-100 dark:border-red-900/40 flex items-center justify-between shadow-2xs">
                <div>
                  <h6 className="font-bold text-red-700 dark:text-red-300 text-sm">
                    Reset Section Student Roster
                  </h6>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Permanently delete all{" "}
                    {hasStudents ? "enrolled students" : "data records"} in
                    Section {sectionId}.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onDeleteAllStudents();
                  }}
                  disabled={!hasStudents}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-xs font-bold transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shrink-0 ml-4"
                >
                  Delete All Students
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer - Identical Design with Grading Configuration */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-850 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="text-xs text-slate-400 dark:text-slate-500">
            {saveError ? (
              <span
                role="alert"
                className="font-semibold text-red-600 dark:text-red-400"
              >
                {saveError}
              </span>
            ) : hasUnsavedChanges ? (
              <span className="text-amber-600 dark:text-amber-400 font-bold flex items-center gap-1.5 animate-in fade-in">
                <AlertCircle className="w-3.5 h-3.5" /> Unsaved changes pending
                • Click Save Changes to commit
              </span>
            ) : (
              <span>All section schedules and settings saved to database</span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="px-5 py-2 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 transition-colors shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-75"
            >
              {isSaving ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
