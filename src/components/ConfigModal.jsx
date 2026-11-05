import React, { useState } from "react";
import {
  X,
  Plus,
  Trash2,
  Save,
  Edit2,
  Settings,
  Calendar,
  CheckSquare,
  Sun,
  Moon,
  Upload,
  Image,
  GraduationCap,
  Award,
  BookOpen,
  School,
  Sparkles,
  RotateCcw,
  Check,
  Clock,
  Layers,
  Palette,
} from "lucide-react";
import clsx from "clsx";
import ConfirmModal from "./ConfirmModal";
import { useTheme } from "../context/ThemeContext";
import { useToast } from "../context/ToastContext";
import api from "../lib/api";
import {
  getExpectedYearLevelPrefix,
  getSectionNamingError,
  getSectionNamingErrors,
} from "../../shared/sectionNaming.js";

const DAY_SHORT_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function ConfigModal({ isOpen, onClose, config, onSave }) {
  const [localConfig, setLocalConfig] = useState(config);
  const initializedForOpen = React.useRef(false);
  const [sectionCopies, setSectionCopies] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [archivedSections, setArchivedSections] = useState([]);
  const [pendingRestores, setPendingRestores] = useState([]);
  const [isLoadingArchives, setIsLoadingArchives] = useState(false);
  const [activeTab, setActiveTab] = useState("sections"); // "sections" is default active tab
  const { theme, isDark, setTheme } = useTheme();
  const toast = useToast();
  const [selectedTheme, setSelectedTheme] = useState(theme);

  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => { },
  });

  const [inputModal, setInputModal] = useState({
    isOpen: false,
    title: "",
    defaultValue: "",
    onConfirm: () => { },
  });

  const [scheduleModal, setScheduleModal] = useState({
    isOpen: false,
    sectionId: "",
    days: [], // [0, 1, 2...]
  });

  React.useEffect(() => {
    if (!isOpen) {
      initializedForOpen.current = false;
      return;
    }
    if (config && !initializedForOpen.current) {
      setLocalConfig(JSON.parse(JSON.stringify(config))); // Deep copy
      setSectionCopies([]);
      setPendingRestores([]);
      setActiveTab("sections"); // Always start on sections tab when opened
      setSelectedTheme(theme); // Reset theme selection to current active theme
      initializedForOpen.current = true;
    }
  }, [isOpen, config, theme]);

  React.useEffect(() => {
    if (!isOpen) return undefined;
    let isCurrent = true;
    setIsLoadingArchives(true);
    api.getSectionArchives()
      .then((archives) => {
        if (isCurrent) setArchivedSections(archives);
      })
      .catch((error) => {
        console.error("Failed to load section archives:", error);
        if (isCurrent) {
          toast.error(`Could not load deleted sections: ${error.message || "Please try again."}`);
        }
      })
      .finally(() => {
        if (isCurrent) setIsLoadingArchives(false);
      });
    return () => {
      isCurrent = false;
    };
  }, [isOpen, toast]);

  if (!isOpen) return null;

  const closeConfirmModal = () =>
    setDeleteModal((prev) => ({ ...prev, isOpen: false }));
  const closeInputModal = () =>
    setInputModal((prev) => ({ ...prev, isOpen: false }));
  const closeScheduleModal = () =>
    setScheduleModal((prev) => ({ ...prev, isOpen: false }));

  const handleEditScheduleRequest = (sectionId) => {
    const currentSchedule = localConfig.schedules?.[sectionId] || [];
    setScheduleModal({
      isOpen: true,
      sectionId,
      days: currentSchedule,
    });
  };

  const handleScheduleToggle = (dayIndex) => {
    setScheduleModal((prev) => {
      const currentDays = prev.days;
      if (currentDays.includes(dayIndex)) {
        return {
          ...prev,
          days: currentDays.filter((d) => d !== dayIndex).sort(),
        };
      } else {
        return { ...prev, days: [...currentDays, dayIndex].sort() };
      }
    });
  };

  const executeSaveSchedule = () => {
    const { sectionId, days } = scheduleModal;
    setLocalConfig((prev) => ({
      ...prev,
      schedules: {
        ...prev.schedules,
        [sectionId]: days,
      },
    }));
    closeScheduleModal();
  };

  const handleSubtitleChange = (e) => {
    setLocalConfig((prev) => ({ ...prev, subtitle: e.target.value }));
  };

  const handleTitleChange = (e) => {
    setLocalConfig((prev) => ({ ...prev, title: e.target.value }));
  };

  const handleLogoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size limit: warn if > 2MB
    if (file.size > 2 * 1024 * 1024) {
      toast.warn("This image is larger than 2 MB. Choose a smaller image so the app stays quick and responsive.");
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result;
      if (dataUrl) {
        setLocalConfig((prev) => ({ ...prev, logo: dataUrl }));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSelectPresetLogo = (presetName) => {
    setLocalConfig((prev) => ({ ...prev, logo: presetName }));
  };

  const handleResetLogo = () => {
    setLocalConfig((prev) => ({ ...prev, logo: "" }));
  };

  const handleSectionChange = (yearName, newSections) => {
    setLocalConfig((prev) => ({
      ...prev,
      sections: {
        ...prev.sections,
        [yearName]: newSections,
      },
    }));
  };

  const removeInvalidSectionCopies = (sections) => {
    const activeSections = new Set(Object.values(sections).flat());
    setSectionCopies((current) =>
      current.filter(
        ({ sourceSectionId, targetSectionId }) =>
          activeSections.has(sourceSectionId) && activeSections.has(targetSectionId),
      ),
    );
  };

  const executeRenameYear = (oldName, newName) => {
    if (oldName === newName) return;
    if (Object.keys(localConfig.sections).some(
      (yearName) => yearName !== oldName && yearName.toLowerCase() === newName.toLowerCase(),
    )) {
      toast.warn("That year level already exists. Choose a different name to keep your sections organized.");
      return;
    }
    const renamedSections = { ...localConfig.sections };
    const sectionsToRename = renamedSections[oldName] || [];
    delete renamedSections[oldName];
    renamedSections[newName] = sectionsToRename;
    const namingError = getSectionNamingErrors(renamedSections, localConfig.sections)[0];
    if (namingError) {
      toast.warn(namingError);
      return;
    }
    setLocalConfig((prev) => ({ ...prev, sections: renamedSections }));
    closeInputModal();
  };

  const handleRenameYearRequest = (yearName) => {
    setInputModal({
      isOpen: true,
      title: "Rename Year Level",
      defaultValue: yearName,
      onConfirm: (newName) => executeRenameYear(yearName, newName),
    });
  };

  const handleAddYear = () => {
    const newName = "New Year Level";
    if (localConfig.sections[newName]) {
      let i = 1;
      while (localConfig.sections[`${newName} ${i}`]) i++;
      const uniqueName = `${newName} ${i}`;
      setLocalConfig((prev) => ({
        ...prev,
        sections: { ...prev.sections, [uniqueName]: [] },
      }));
    } else {
      setLocalConfig((prev) => ({
        ...prev,
        sections: { ...prev.sections, [newName]: [] },
      }));
    }
  };

  const executeDeleteYear = (yearName) => {
    const newSectionsObj = { ...localConfig.sections };

    delete newSectionsObj[yearName];
    removeInvalidSectionCopies(newSectionsObj);
    setPendingRestores((current) =>
      current.filter((pending) => pending.archive.year_level !== yearName),
    );
    setLocalConfig((prev) => ({ ...prev, sections: newSectionsObj }));
    closeConfirmModal();
  };

  const handleDeleteYearRequest = (yearName) => {
    const sections = localConfig.sections[yearName] || [];
    const namesStillUsed = sections.filter(
      (section) => Object.entries(localConfig.sections).some(
        ([otherYear, otherSections]) => otherYear !== yearName && otherSections.includes(section),
      ),
    );
    const dataImpact = sections.length === 0
      ? "No sections or section data will be removed."
      : `Sections: ${sections.join(", ")}. Their students, attendance, grades, grading settings, and schedules will be archived for 30 days when you save, except for section names still used by another year level (${namesStillUsed.join(", ") || "none"}).`;
    setDeleteModal({
      isOpen: true,
      title: "Delete Year Level?",
      message: `Delete "${yearName}" and all its sections? ${dataImpact}`,
      onConfirm: () => executeDeleteYear(yearName),
    });
  };

  const executeAddSection = (yearName, sectionName) => {
    if (sectionName) {
      const namingError = getSectionNamingError(yearName, sectionName, localConfig.sections);
      if (namingError) {
        toast.warn(namingError);
        closeInputModal();
        return;
      }
      const currentSections = localConfig.sections[yearName] || [];
      if (currentSections.includes(sectionName)) return;
      handleSectionChange(yearName, [...currentSections, sectionName].sort());

      // Force empty schedule for new block
      setLocalConfig((prev) => ({
        ...prev,
        schedules: {
          ...prev.schedules,
          [sectionName]: [],
        },
      }));
    }
    closeInputModal();
  };

  const handleAddSectionRequest = (yearName) => {
    setInputModal({
      isOpen: true,
      title: `Add Section to ${yearName}`,
      defaultValue: "",
      onConfirm: (val) => executeAddSection(yearName, val),
    });
  };

  const executeRenameSection = (yearName, oldSection, newSection) => {
    if (newSection && newSection !== oldSection) {
      const currentSections = localConfig.sections[yearName];
      const namingError = getSectionNamingError(yearName, newSection, localConfig.sections);
      if (namingError) {
        toast.warn(namingError);
        closeInputModal();
        closeConfirmModal();
        return false;
      }
      if (currentSections.includes(newSection)) {
        toast.warn("That section already exists in this year level. Choose a different name.");
        closeInputModal();
        closeConfirmModal();
        return false;
      }
      const updated = currentSections
        .map((s) => (s === oldSection ? newSection : s))
        .sort();
      handleSectionChange(yearName, updated);
      setPendingRestores((current) =>
        current.filter((pending) => pending.archive.section_id !== oldSection),
      );
      removeInvalidSectionCopies({
        ...localConfig.sections,
        [yearName]: updated,
      });
      setLocalConfig((prev) => ({
        ...prev,
        schedules: {
          ...prev.schedules,
          [newSection]: prev.schedules?.[oldSection] || [],
        },
      }));
    }
    closeInputModal();
    closeConfirmModal();
    return true;
  };

  const handleRenameSectionRequest = (yearName, oldSection) => {
    const sharedElsewhere = Object.entries(localConfig.sections).some(
      ([otherYear, sections]) => otherYear !== yearName && sections.includes(oldSection),
    );
    setInputModal({
      isOpen: true,
      title: "Rename Section",
      defaultValue: oldSection,
      onConfirm: (val) => {
        if (val === oldSection) {
          closeInputModal();
          return;
        }
        setDeleteModal({
          isOpen: true,
          title: "Rename Section?",
          message: sharedElsewhere
            ? `Renaming "${oldSection}" to "${val}" copies its students, attendance, grades, grading settings, and schedule to the new section. The original data remains available to the other year level.`
            : `Renaming "${oldSection}" to "${val}" creates a new section. The old section's students, attendance, grades, grading settings, and schedule will be archived for 30 days when you save.`,
          onConfirm: () => {
            const renamed = executeRenameSection(yearName, oldSection, val);
            if (renamed && sharedElsewhere) {
              setSectionCopies((current) => [
                ...current.filter((copy) => copy.targetSectionId !== val),
                { sourceSectionId: oldSection, targetSectionId: val },
              ]);
            }
          },
        });
      },
    });
  };

  const executeDeleteSection = (yearName, sectionName) => {
    const currentSections = localConfig.sections[yearName];
    const updated = currentSections.filter((s) => s !== sectionName);
    removeInvalidSectionCopies({
      ...localConfig.sections,
      [yearName]: updated,
    });
    setPendingRestores((current) =>
      current.filter((pending) => pending.archive.section_id !== sectionName),
    );
    handleSectionChange(yearName, updated);
    closeConfirmModal();
  };

  const handleDeleteSectionRequest = (yearName, sectionName) => {
    const sharedElsewhere = Object.entries(localConfig.sections).some(
      ([otherYear, sections]) => otherYear !== yearName && sections.includes(sectionName),
    );
    setDeleteModal({
      isOpen: true,
      title: "Delete Section?",
      message: `Remove Section "${sectionName}"? Its students, attendance, grades, grading settings, and schedule will be archived for 30 days when you save${sharedElsewhere ? ", unless this section name remains assigned to another year level" : ""}.`,
      onConfirm: () => executeDeleteSection(yearName, sectionName),
    });
  };

  const restoreArchivedSection = (archive) => {
    if (pendingRestores.some((pending) => pending.archive.id === archive.id)) {
      const pending = pendingRestores.find((item) => item.archive.id === archive.id);
      setPendingRestores((current) =>
        current.filter((pending) => pending.archive.id !== archive.id),
      );
      setLocalConfig((current) => {
        const sections = { ...current.sections };
        if (!pending.sectionWasPresent) {
          sections[archive.year_level] = (sections[archive.year_level] || [])
            .filter((section) => section !== archive.section_id);
        }
        if (!pending.yearLevelWasPresent && sections[archive.year_level]?.length === 0) {
          delete sections[archive.year_level];
        }
        const schedules = { ...current.schedules };
        if (pending.scheduleWasPresent) {
          schedules[archive.section_id] = pending.previousSchedule;
        } else {
          delete schedules[archive.section_id];
        }
        return { ...current, sections, schedules };
      });
      return;
    }

    const sectionWasPresent = (localConfig.sections[archive.year_level] || [])
      .includes(archive.section_id);
    setPendingRestores((current) => [
      ...current,
      {
        archive,
        yearLevelWasPresent: Object.hasOwn(localConfig.sections, archive.year_level),
        sectionWasPresent,
        scheduleWasPresent: Object.hasOwn(localConfig.schedules || {}, archive.section_id),
        previousSchedule: localConfig.schedules?.[archive.section_id],
      },
    ]);
    setLocalConfig((current) => ({
      ...current,
      sections: {
        ...current.sections,
        [archive.year_level]: [
          ...new Set([
            ...(current.sections[archive.year_level] || []),
            archive.section_id,
          ]),
        ],
      },
      schedules: {
        ...current.schedules,
        [archive.section_id]: Array.isArray(archive.schedule) ? archive.schedule : [],
      },
    }));
    toast.info(`Section "${archive.section_id}" is staged. Click Save Changes to restore it.`);
  };

  const save = async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      const result = await onSave(
        localConfig,
        sectionCopies,
        pendingRestores.map((pending) => pending.archive.id),
      );
      const previousSections = config?.sections || {};
      const deletedYears = Object.keys(previousSections).filter(
        (year) => !Object.hasOwn(localConfig.sections, year),
      );
      const removedSections = Object.entries(previousSections).flatMap(
        ([year, sections]) => (sections || [])
          .filter((section) =>
            Object.hasOwn(localConfig.sections, year) &&
            !(localConfig.sections[year] || []).includes(section),
          )
          .map((section) => ({ year, section })),
      );
      const archivedSectionIds = new Set(result?.deletedSections || []);
      const changes = [
        ...deletedYears.map((year) => {
          const archived = (previousSections[year] || [])
            .filter((section) => archivedSectionIds.has(section));
          return archived.length > 0
            ? `Year level "${year}" deleted; ${archived.join(", ")} archived for 30 days`
            : `Year level "${year}" deleted`;
        }),
        ...removedSections.map(({ year, section }) =>
          archivedSectionIds.has(section)
            ? `Section "${section}" removed from ${year} and archived for 30 days`
            : `Section "${section}" removed from ${year}; its data remains with another year level`,
        ),
      ];
      if (changes.length > 0) {
        toast.success(changes.join(". "));
      }
      for (const restored of result?.restoredSections || []) {
        toast.success(`Section "${restored.sectionId}" was restored to ${restored.yearLevel}.`);
      }
      if (selectedTheme !== theme) {
        setTheme(selectedTheme);
      }
      onClose();
    } catch (error) {
      console.error("Failed to save app configuration:", error);
      toast.error(`Could not save configuration: ${error.message || "Please try again."}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (isSaving) return;
    setSelectedTheme(theme);
    onClose();
  };

  const formatScheduleSummary = (days) => {
    if (!Array.isArray(days) || days.length === 0) return null;
    return days.map((d) => DAY_SHORT_NAMES[d] || d).join(", ");
  };

  const totalYears = Object.keys(localConfig.sections || {}).length;
  const totalSections = Object.values(localConfig.sections || {}).flat().length;
  const totalScheduled = Object.values(localConfig.schedules || {}).filter(
    (arr) => Array.isArray(arr) && arr.length > 0
  ).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <ConfirmModal
        isOpen={deleteModal.isOpen}
        title={deleteModal.title}
        message={deleteModal.message}
        onConfirm={deleteModal.onConfirm}
        onCancel={closeConfirmModal}
        isDestructive={true}
        confirmText="Delete"
      />

      {/* Schedule Modal */}
      {scheduleModal.isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl p-6 w-full max-w-sm animate-in zoom-in-95 duration-200 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                Schedule: Section {scheduleModal.sectionId}
              </h4>
              <button
                onClick={closeScheduleModal}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
              Select class days for this section.
            </p>

            <div className="space-y-2 mb-6">
              {[
                "Sunday",
                "Monday",
                "Tuesday",
                "Wednesday",
                "Thursday",
                "Friday",
                "Saturday",
              ].map((day, idx) => {
                const isSelected = scheduleModal.days.includes(idx);
                return (
                  <div
                    key={day}
                    onClick={() => handleScheduleToggle(idx)}
                    className={`flex items-center p-2 rounded-lg cursor-pointer border transition-all ${
                      isSelected
                        ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-300"
                        : "border-transparent hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-600 dark:text-slate-300"
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded flex items-center justify-center mr-3 transition-colors ${
                        isSelected
                          ? "bg-emerald-600 text-white"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-300 dark:text-slate-600"
                      }`}
                    >
                      {isSelected && <CheckSquare className="w-4 h-4" />}
                    </div>
                    <span className="text-sm font-medium">{day}</span>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={closeScheduleModal}
                className="px-3 py-1.5 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded cursor-pointer font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={executeSaveSchedule}
                className="px-3 py-1.5 text-sm bg-emerald-600 text-white rounded hover:bg-emerald-700 cursor-pointer font-bold shadow-sm transition-colors"
              >
                Save Schedule
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Input Modal */}
      {inputModal.isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl p-6 w-full max-w-sm animate-in zoom-in-95 duration-200 border border-slate-200 dark:border-slate-800">
            <h4 className="font-bold text-slate-800 dark:text-slate-100 mb-4">
              {inputModal.title}
            </h4>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const val = e.target.elements.inputValue.value.trim();
                if (val) inputModal.onConfirm(val);
              }}
            >
              <input
                name="inputValue"
                defaultValue={inputModal.defaultValue}
                className="w-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none mb-4"
                autoFocus
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={closeInputModal}
                  className="px-3 py-1.5 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded cursor-pointer font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 text-sm bg-emerald-600 text-white rounded hover:bg-emerald-700 cursor-pointer font-bold shadow-sm transition-colors"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Main Configuration Dialog */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        {/* Modal Top Header - Dark Slate Design matching Grading Configuration */}
        <div className="bg-slate-800 dark:bg-slate-950 text-white px-6 py-4 flex items-center justify-between border-b border-slate-700/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
              <Settings className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h2 className="font-bold text-lg leading-tight">Application Settings</h2>
              <p className="text-xs text-slate-300">
                Academic structure, section schedules, branding, and theme
              </p>
            </div>
          </div>
          <button
            onClick={handleCancel}
            disabled={isSaving}
            className="p-1.5 hover:bg-slate-700 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-300 cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Categorized Tab Bar - Identical Design */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 px-6 bg-slate-50 dark:bg-slate-850 overflow-x-auto select-none">
          <button
            type="button"
            onClick={() => setActiveTab("sections")}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === "sections"
                ? "border-emerald-600 text-emerald-700 dark:text-emerald-400 bg-white dark:bg-slate-900"
                : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            <School className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Year Levels &amp; Sections</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 font-extrabold">
              {totalSections}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("branding")}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === "branding"
                ? "border-emerald-600 text-emerald-700 dark:text-emerald-400 bg-white dark:bg-slate-900"
                : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>Branding &amp; Logo</span>
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
            {isDark ? (
              <Moon className="w-4 h-4 text-indigo-400" />
            ) : (
              <Sun className="w-4 h-4 text-amber-500" />
            )}
            <span>Theme &amp; Display</span>
          </button>
        </div>

        {/* Tab Body Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 bg-white dark:bg-slate-900">
          {/* TAB 1: Year Levels & Sections (Primary / Default) */}
          {activeTab === "sections" && (
            <div className="space-y-4 animate-in fade-in duration-150">
              {/* Header Overview Card */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-xl border border-emerald-200/80 dark:border-emerald-900/60 bg-emerald-50/50 dark:bg-emerald-950/20">
                <div>
                  <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                    <School className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    Academic Structure &amp; Schedule
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Section names must start with 1, 2, 3, or 4 for 1st, 2nd, 3rd, or 4th Year respectively.
                  </p>
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <span className="text-[11px] px-2 py-0.5 rounded-md font-bold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                      {totalYears} Year Levels
                    </span>
                    <span className="text-[11px] px-2 py-0.5 rounded-md font-bold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                      {totalSections} Total Sections
                    </span>
                    <span className="text-[11px] px-2 py-0.5 rounded-md font-bold bg-emerald-100/80 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/80">
                      {totalScheduled} Scheduled
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleAddYear}
                  className="shrink-0 flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3.5 py-2 rounded-lg shadow-sm cursor-pointer transition-all hover:shadow"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Year Level</span>
                </button>
              </div>

              <div className="rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/60 dark:bg-amber-950/20 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                      Deleted Sections
                    </h4>
                    <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                      Section data is recoverable for 30 days. Restores apply only after you save.
                    </p>
                  </div>
                  {isLoadingArchives && (
                    <span className="text-xs text-slate-500 dark:text-slate-400">Loading...</span>
                  )}
                </div>
                {!isLoadingArchives && archivedSections.length === 0 && (
                  <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                    No deleted sections are available to restore.
                  </p>
                )}
                {archivedSections.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {archivedSections.map((archive) => (
                      <div
                        key={archive.id}
                        className="flex flex-col gap-2 rounded-lg border border-amber-200/80 dark:border-amber-900/60 bg-white/80 dark:bg-slate-900/60 p-3 sm:flex-row sm:items-center"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                            {archive.year_level} · Section {archive.section_id}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {Number(archive.student_count)} students · Restorable until{" "}
                            {new Date(archive.expires_at).toLocaleDateString()}
                          </p>
                        </div>
                        <button
                          type="button"
                          disabled={isSaving}
                          onClick={() => restoreArchivedSection(archive)}
                          className="shrink-0 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-amber-700 disabled:cursor-wait disabled:opacity-60"
                        >
                          {pendingRestores.some((pending) => pending.archive.id === archive.id)
                            ? "Undo staging"
                            : "Stage restore"}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Year Levels List */}
              <div className="space-y-4">
                {Object.entries(localConfig.sections || {}).map(
                  ([yearName, sections]) => (
                    <div
                      key={yearName}
                      className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 bg-slate-50/60 dark:bg-slate-850/60 transition-all hover:border-slate-300 dark:hover:border-slate-700"
                    >
                      {/* Year Level Title Bar */}
                      <div className="flex items-center gap-2 mb-3 pb-2.5 border-b border-slate-200/80 dark:border-slate-800">
                        <div className="w-6 h-6 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 flex items-center justify-center">
                          <GraduationCap className="w-3.5 h-3.5" />
                        </div>
                        <span className="font-black text-sm text-slate-800 dark:text-slate-100">
                          {yearName}
                        </span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400">
                          {getExpectedYearLevelPrefix(yearName)
                            ? `Prefix: ${getExpectedYearLevelPrefix(yearName)}`
                            : "Rename to a supported year level to add sections"}
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200/70 dark:bg-slate-750 text-slate-600 dark:text-slate-300">
                          {sections.length} {sections.length === 1 ? "Section" : "Sections"}
                        </span>

                        <button
                          type="button"
                          onClick={() => handleRenameYearRequest(yearName)}
                          className="p-1 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 rounded hover:bg-slate-200/50 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                          title="Rename Year Level"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        <div className="flex-1" />

                        <button
                          type="button"
                          onClick={() => handleDeleteYearRequest(yearName)}
                          className="flex items-center gap-1 text-xs text-slate-400 hover:text-red-600 dark:hover:text-red-400 px-2 py-1 rounded hover:bg-red-50 dark:hover:bg-red-950/40 cursor-pointer transition-colors"
                          title="Delete Year Level"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline text-[11px] font-semibold">Delete Year</span>
                        </button>
                      </div>

                      {/* Sections Badges List */}
                      <div className="flex flex-wrap gap-2.5">
                        {sections.map((section) => {
                          const schedDays = localConfig.schedules?.[section];
                          const schedSummary = formatScheduleSummary(schedDays);

                          return (
                            <div
                              key={section}
                              className="group relative bg-white dark:bg-slate-800 pl-3 pr-2 py-2 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs flex items-center gap-2.5 text-xs transition-all hover:border-emerald-300 dark:hover:border-emerald-700"
                            >
                              <span className="font-bold text-slate-800 dark:text-slate-100">
                                {section}
                              </span>

                              {/* Schedule Pill Indicator */}
                              <button
                                type="button"
                                onClick={() => handleEditScheduleRequest(section)}
                                className={clsx(
                                  "px-2 py-0.5 rounded-md text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer",
                                  schedSummary
                                    ? "bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800"
                                    : "bg-slate-100 dark:bg-slate-750 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-amber-50 dark:hover:bg-amber-950/40 hover:text-amber-700 dark:hover:text-amber-300"
                                )}
                                title={schedSummary ? `Meeting Days: ${schedSummary} (Click to edit)` : "No schedule set (Click to set days)"}
                              >
                                <Calendar className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                <span>{schedSummary || "No Sched"}</span>
                              </button>

                              {/* Action Buttons */}
                              <div className="flex items-center gap-0.5 pl-1 border-l border-slate-100 dark:border-slate-700">
                                <button
                                  type="button"
                                  onClick={() => handleRenameSectionRequest(yearName, section)}
                                  className="p-1 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 rounded hover:bg-slate-100 dark:hover:bg-slate-750 cursor-pointer transition-colors"
                                  title="Rename Section"
                                >
                                  <Edit2 className="w-3 h-3" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteSectionRequest(yearName, section)}
                                  className="p-1 text-slate-400 hover:text-red-600 dark:hover:text-red-400 rounded hover:bg-red-50 dark:hover:bg-red-950/40 cursor-pointer transition-colors"
                                  title="Delete Section"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          );
                        })}

                        <button
                          type="button"
                          onClick={() => handleAddSectionRequest(yearName)}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-emerald-50/60 dark:hover:bg-emerald-950/30 hover:text-emerald-700 dark:hover:text-emerald-300 hover:border-emerald-300 dark:hover:border-emerald-700 transition-colors text-xs font-bold cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                          <span>Add Section</span>
                        </button>
                      </div>
                    </div>
                  )
                )}

                {totalYears === 0 && (
                  <div className="text-center py-10 px-4 border border-dashed border-slate-300 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-850">
                    <School className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                    <h5 className="font-bold text-slate-700 dark:text-slate-200">No Year Levels Configured</h5>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                      Get started by adding your first year level (e.g., 1st Year, Grade 11) and creating section blocks.
                    </p>
                    <button
                      type="button"
                      onClick={handleAddYear}
                      className="mt-4 inline-flex items-center gap-1.5 bg-emerald-600 text-white font-bold text-xs px-4 py-2 rounded-lg hover:bg-emerald-700 cursor-pointer shadow-sm transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add First Year Level
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: Branding & Identity */}
          {activeTab === "branding" && (
            <div className="space-y-5 animate-in fade-in duration-150">
              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-850/40">
                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  Application Identity
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Customize the application titles and institution logo displayed in the top bar headers across the grading and attendance pages.
                </p>
              </div>

              {/* Title & Subtitle Inputs */}
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Application Title
                  </label>
                  <input
                    type="text"
                    value={localConfig.title}
                    onChange={handleTitleChange}
                    placeholder="e.g. Attendance & Grading System"
                    className="w-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg px-3.5 py-2.5 font-bold text-base text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                  />
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Displayed in the header banner across the entire web application.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Application Subtitle
                  </label>
                  <input
                    type="text"
                    value={localConfig.subtitle !== undefined ? localConfig.subtitle : ""}
                    placeholder="e.g. Choose a year level and section to manage records"
                    onChange={handleSubtitleChange}
                    className="w-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg px-3.5 py-2.5 font-medium text-sm text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                  />
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Displayed beneath the main title on the selection and landing screens.
                  </p>
                </div>
              </div>

              {/* App Logo & Icon Card */}
              <div className="space-y-3 p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-850/60">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Image className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    App Logo &amp; Icon
                  </label>
                  {localConfig.logo && (
                    <button
                      type="button"
                      onClick={handleResetLogo}
                      className="text-xs flex items-center gap-1 text-slate-500 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400 transition-colors cursor-pointer font-medium"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Reset to Default
                    </button>
                  )}
                </div>

                {/* Logo Preview & Upload Row */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 pt-1">
                  {/* Preview Box */}
                  <div className="w-16 h-16 rounded-2xl bg-emerald-600 text-white flex items-center justify-center p-2 shadow-sm border border-emerald-500/30 shrink-0 overflow-hidden">
                    {localConfig.logo && (localConfig.logo.startsWith("data:") || localConfig.logo.startsWith("http") || localConfig.logo.startsWith("/")) ? (
                      <img
                        src={localConfig.logo}
                        alt="Logo Preview"
                        className="w-full h-full object-contain rounded-lg"
                      />
                    ) : localConfig.logo === "GraduationCap" ? (
                      <GraduationCap className="w-8 h-8 text-white" />
                    ) : localConfig.logo === "Award" ? (
                      <Award className="w-8 h-8 text-white" />
                    ) : localConfig.logo === "BookOpen" ? (
                      <BookOpen className="w-8 h-8 text-white" />
                    ) : localConfig.logo === "School" ? (
                      <School className="w-8 h-8 text-white" />
                    ) : localConfig.logo === "Sparkles" ? (
                      <Sparkles className="w-8 h-8 text-white" />
                    ) : localConfig.logo === "CheckSquare" ? (
                      <CheckSquare className="w-8 h-8 text-white" />
                    ) : (
                      <Calendar className="w-8 h-8 text-white" />
                    )}
                  </div>

                  {/* Upload & Choose Preset */}
                  <div className="flex-1 space-y-2.5 w-full">
                    <div className="flex flex-wrap items-center gap-2">
                      <label className="flex items-center gap-2 px-3.5 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer transition-colors shadow-2xs">
                        <Upload className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        <span>Upload Custom Image</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleLogoUpload}
                          className="hidden"
                        />
                      </label>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">
                        Supports PNG, JPG, SVG, WebP (Max 2MB)
                      </span>
                    </div>

                    {/* Preset Icons Selection */}
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1.5">
                        Or select an institutional preset icon:
                      </span>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {[
                          { name: "Calendar", icon: Calendar, label: "Calendar" },
                          { name: "GraduationCap", icon: GraduationCap, label: "Graduation" },
                          { name: "Award", icon: Award, label: "Award" },
                          { name: "BookOpen", icon: BookOpen, label: "Book" },
                          { name: "School", icon: School, label: "School" },
                          { name: "Sparkles", icon: Sparkles, label: "Sparkles" },
                          { name: "CheckSquare", icon: CheckSquare, label: "Attendance" },
                        ].map((preset) => {
                          const IconComp = preset.icon;
                          const isSelected =
                            localConfig.logo === preset.name ||
                            (!localConfig.logo && preset.name === "Calendar");
                          return (
                            <button
                              key={preset.name}
                              type="button"
                              onClick={() => handleSelectPresetLogo(preset.name)}
                              className={`px-2.5 py-1.5 rounded-lg border transition-all cursor-pointer flex items-center gap-1.5 text-xs ${
                                isSelected
                                  ? "bg-emerald-100 dark:bg-emerald-950/80 border-emerald-500 text-emerald-800 dark:text-emerald-300 font-bold shadow-2xs"
                                  : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-750"
                              }`}
                              title={preset.label}
                            >
                              <IconComp className="w-3.5 h-3.5" />
                              <span className="text-[11px]">{preset.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Theme & Display */}
          {activeTab === "appearance" && (
            <div className="space-y-5 animate-in fade-in duration-150">
              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-850/40">
                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Palette className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  Visual Theme Preferences
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Choose your preferred color theme. Changes will be saved and applied across the app only after you click &quot;Save Changes&quot; below.
                </p>
              </div>

              {/* Theme Pending Notification */}
              {selectedTheme !== theme && (
                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 text-xs text-amber-800 dark:text-amber-300 flex items-center gap-2 animate-in fade-in">
                  <Sparkles className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
                  <span>
                    Theme change pending ({selectedTheme === "dark" ? "Dark Mode" : "Light Mode"} selected). Click <strong>&quot;Save Changes&quot;</strong> below to apply it.
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
                      : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850/60 hover:border-slate-300 dark:hover:border-slate-700"
                  )}
                >
                  <div className="flex items-start justify-between">
                    <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 border border-amber-200 flex items-center justify-center">
                      <Sun className="w-5 h-5 text-amber-500" />
                    </div>
                    {selectedTheme === "light" && (
                      <span className="flex items-center gap-1 text-[11px] font-black text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-300 dark:border-emerald-800">
                        <Check className="w-3 h-3" /> {theme === "light" ? "Active" : "Selected"}
                      </span>
                    )}
                  </div>
                  <div className="mt-3">
                    <h5 className="font-bold text-sm text-slate-800 dark:text-slate-100">
                      Light Mode
                    </h5>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Bright, high-clarity background ideal for well-lit classrooms and daytime grading.
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
                      : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850/60 hover:border-slate-300 dark:hover:border-slate-700"
                  )}
                >
                  <div className="flex items-start justify-between">
                    <div className="w-10 h-10 rounded-xl bg-indigo-950 text-indigo-400 border border-indigo-800 flex items-center justify-center">
                      <Moon className="w-5 h-5 text-indigo-400" />
                    </div>
                    {selectedTheme === "dark" && (
                      <span className="flex items-center gap-1 text-[11px] font-black text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-800">
                        <Check className="w-3 h-3" /> {theme === "dark" ? "Active" : "Selected"}
                      </span>
                    )}
                  </div>
                  <div className="mt-3">
                    <h5 className="font-bold text-sm text-slate-800 dark:text-slate-100">
                      Dark Mode
                    </h5>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Deep midnight tones optimized for reduced eye strain during evening workflows.
                    </p>
                  </div>
                </div>
              </div>

            </div>
          )}
        </div>

        {/* Modal Bottom Footer Actions - Identical Design */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-850 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="text-xs text-slate-400 dark:text-slate-500 hidden sm:block">
            {activeTab === "sections"
              ? "Tip: Click the schedule pill on any section to set class days."
              : "Changes will apply after clicking Save Changes."}
          </div>
          <div className="flex items-center gap-3 ml-auto">
            <button
              type="button"
              onClick={handleCancel}
              disabled={isSaving}
              className="px-4 py-2 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={save}
              disabled={isSaving}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-bold text-xs rounded-lg transition-all flex items-center gap-1.5 cursor-pointer shadow-sm hover:shadow disabled:cursor-wait"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSaving ? "Saving..." : "Save Changes"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
