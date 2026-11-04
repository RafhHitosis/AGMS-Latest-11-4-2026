import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronRight,
  Users,
  Calendar,
  Settings,
  LogOut,
  Search,
  Check,
  GraduationCap,
  Award,
  BookOpen,
  School,
  CheckSquare,
  Sparkles,
} from "lucide-react";
import clsx from "clsx";
import { useSettings } from "../hooks/useSettings";
import api from "../lib/api";
import ConfigModal from "./ConfigModal";
import ToolSelectionModal from "./ToolSelectionModal";
import bgPattern from "../assets/bg.png";

export default function SectionSelection({ onSelectTool, onSelectSection, onSignOut }) {
  const [selectedYear, setSelectedYear] = useState(null);
  const [yearSearch, setYearSearch] = useState("");
  const [sectionSearch, setSectionSearch] = useState("");
  const [selectedSectionForTool, setSelectedSectionForTool] = useState(null);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const sectionsPanelRef = useRef(null);
  const {
    appConfig,
    updateAppTitle,
    updateAppSubtitle,
    updateAppLogo,
    updateSections,
    updateClassSchedules,
    loading,
  } = useSettings();

  const handleSaveConfig = async (newConfig, trackedDeletedSections = []) => {
    const oldSections = Object.values(appConfig.sections || {}).flat();
    const newSections = Object.values(newConfig.sections || {}).flat();
    const deletedSections = [...new Set([
      ...oldSections.filter(s => !newSections.includes(s)),
      ...trackedDeletedSections
    ])];

    // Clear data from DB for deleted sections
    for (const sec of deletedSections) {
      await api.deleteSectionData(sec);
    }

    const cleanedSchedules = { ...(newConfig.schedules || {}) };
    deletedSections.forEach(s => delete cleanedSchedules[s]);

    await updateAppTitle(newConfig.title);
    if (newConfig.subtitle !== undefined) {
      await updateAppSubtitle(newConfig.subtitle);
    }
    if (newConfig.logo !== undefined) {
      await updateAppLogo(newConfig.logo);
    }
    await updateSections(newConfig.sections);
    await updateClassSchedules(cleanedSchedules);

    // If the currently selected year was deleted/renamed, reset selection
    if (selectedYear && !newConfig.sections[selectedYear]) {
      setSelectedYear(null);
    }
  };

  const sections = appConfig.sections;
  const yearLevels = useMemo(() => Object.keys(sections || {}), [sections]);
  const matchingYears = useMemo(
    () => yearLevels.filter((year) => year.toLowerCase().includes(yearSearch.trim().toLowerCase())),
    [yearLevels, yearSearch],
  );
  const availableSections = useMemo(
    () => selectedYear ? sections?.[selectedYear] || [] : [],
    [selectedYear, sections],
  );
  const matchingSections = useMemo(
    () => availableSections.filter((section) => String(section).toLowerCase().includes(sectionSearch.trim().toLowerCase())),
    [availableSections, sectionSearch],
  );

  useEffect(() => {
    if (selectedYear && window.matchMedia("(max-width: 767px)").matches) {
      sectionsPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [selectedYear]);

  const handleSelectYear = (year) => {
    setSelectedYear(year);
    setSectionSearch("");
  };

  return (
    <div className="min-h-screen bg-surface-container-low flex flex-col items-center justify-center p-4 font-sans text-on-surface relative overflow-hidden">
      {/* Bottom Background Pattern */}
      <div 
        className="absolute bottom-0 left-0 right-0 h-[300px] md:h-[400px] pointer-events-none opacity-40 dark:opacity-20 z-0 bg-bottom bg-repeat-x"
        style={{ backgroundImage: `url(${bgPattern})`, backgroundSize: 'auto 100%' }}
      ></div>

      <ConfigModal
        isOpen={isConfigOpen}
        onClose={() => setIsConfigOpen(false)}
        config={appConfig}
        onSave={handleSaveConfig}
      />

      <ToolSelectionModal
        isOpen={!!selectedSectionForTool}
        sectionId={selectedSectionForTool}
        onClose={() => setSelectedSectionForTool(null)}
        onSelectTool={(sec, tool) => {
          if (onSelectTool) {
            onSelectTool(sec, tool);
          } else if (onSelectSection) {
            onSelectSection(sec);
          }
        }}
      />

      {/* Page actions */}
      <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
        <button
          type="button"
          onClick={onSignOut}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-outline-variant/30 bg-surface text-on-surface-variant shadow-xs transition-colors hover:border-error/30 hover:bg-error-container hover:text-on-error-container dark:hover:border-red-400/30 dark:hover:bg-red-950/40 dark:hover:text-red-300"
          title="Sign out"
          aria-label="Sign out"
        >
          <LogOut className="h-4 w-4" />
        </button>
        <button
          onClick={() => setIsConfigOpen(true)}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-surface border border-outline-variant/30 shadow-xs hover:bg-surface-container-high text-on-surface-variant hover:text-primary transition-colors cursor-pointer"
          title="App Configuration & Settings"
          aria-label="App Configuration & Settings"
        >
          <Settings className="w-5 h-5" />
        </button>
      </div>

      <div className="max-w-4xl w-full z-10 relative">
        <div className="text-center mb-10 space-y-3">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary rounded-[20px] shadow-elevation-2 mb-2 overflow-hidden p-2">
            {appConfig.logo && (appConfig.logo.startsWith("data:") || appConfig.logo.startsWith("http") || appConfig.logo.startsWith("/")) ? (
              <img
                src={appConfig.logo}
                alt="App Logo"
                className="w-full h-full object-contain rounded-xl"
              />
            ) : appConfig.logo === "GraduationCap" ? (
              <GraduationCap className="w-8 h-8 text-on-primary" />
            ) : appConfig.logo === "Award" ? (
              <Award className="w-8 h-8 text-on-primary" />
            ) : appConfig.logo === "BookOpen" ? (
              <BookOpen className="w-8 h-8 text-on-primary" />
            ) : appConfig.logo === "School" ? (
              <School className="w-8 h-8 text-on-primary" />
            ) : appConfig.logo === "Sparkles" ? (
              <Sparkles className="w-8 h-8 text-on-primary" />
            ) : appConfig.logo === "CheckSquare" ? (
              <CheckSquare className="w-8 h-8 text-on-primary" />
            ) : (
              <Calendar className="w-8 h-8 text-on-primary" />
            )}
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-on-surface">
            {appConfig.title || "Attendance System"}
          </h1>
          <p className="text-on-surface-variant text-base md:text-lg">
            {appConfig.subtitle || "Choose a year level and section to manage attendance"}
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center p-12">
            <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 md:gap-6 items-start">
            {/* Year Level List */}
            <section className="bg-surface rounded-3xl shadow-elevation-1 border border-outline-variant/30 overflow-hidden">
              <div className="p-4 bg-surface-container border-b border-outline-variant/20 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-on-primary">1</span>
                  <div>
                    <h2 className="text-sm font-bold text-on-surface">Choose a year level</h2>
                    <p className="text-xs text-on-surface-variant">Select the class year to continue</p>
                  </div>
                </div>
                <span className="shrink-0 rounded-full bg-surface px-2.5 py-1 text-xs font-semibold text-on-surface-variant">
                  {yearLevels.length}
                </span>
              </div>
              {yearLevels.length > 6 && (
                <div className="px-3 pt-3">
                  <label className="relative block">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant/70" />
                    <input
                      type="search"
                      value={yearSearch}
                      onChange={(event) => setYearSearch(event.target.value)}
                      placeholder="Search year levels"
                      aria-label="Search year levels"
                      className="h-10 w-full rounded-xl border border-outline-variant/40 bg-surface-container-low pl-9 pr-3 text-sm text-on-surface outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                    />
                  </label>
                </div>
              )}
              <div className="max-h-[min(55vh,28rem)] space-y-2 overflow-y-auto p-3">
                {yearLevels.length === 0 && (
                  <div className="p-6 text-center space-y-3">
                    <p className="text-sm text-slate-400">No year levels or sections configured.</p>
                    <button
                      onClick={() => setIsConfigOpen(true)}
                      className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl bg-primary text-on-primary hover:opacity-90 transition-opacity cursor-pointer shadow-sm"
                    >
                      <Settings className="w-4 h-4" />
                      Configure Sections
                    </button>
                  </div>
                )}
                {matchingYears.map((year) => (
                  <button
                    key={year}
                    type="button"
                    aria-pressed={selectedYear === year}
                    onClick={() => handleSelectYear(year)}
                    className={clsx(
                      "w-full rounded-2xl border px-4 py-3.5 text-left transition-all duration-200 flex items-center justify-between group cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                      selectedYear === year
                        ? "border-primary bg-primary-container/60 text-on-primary-container shadow-elevation-1"
                        : "border-transparent text-on-surface hover:border-outline-variant/40 hover:bg-surface-container-high hover:text-primary",
                    )}
                  >
                    <span className="font-semibold text-sm md:text-base">
                      {year}
                    </span>
                    <span className="flex items-center gap-2">
                      <span className={clsx(
                        "rounded-full px-2 py-0.5 text-[11px] font-semibold",
                        selectedYear === year
                          ? "bg-primary/10 text-on-primary-container"
                          : "bg-surface-container text-on-surface-variant",
                      )}>
                        {(sections[year] || []).length}
                      </span>
                      {selectedYear === year
                        ? <Check className="h-5 w-5 text-primary" aria-hidden="true" />
                        : <ChevronRight className="h-5 w-5 text-outline/50 transition-transform group-hover:translate-x-0.5 group-hover:text-primary" aria-hidden="true" />}
                    </span>
                  </button>
                ))}
                {yearLevels.length > 0 && matchingYears.length === 0 && (
                  <p className="px-4 py-8 text-center text-sm text-on-surface-variant">No year levels match your search.</p>
                )}
              </div>
            </section>

            {/* Section List (Animated) */}
            <section
              ref={sectionsPanelRef}
              className={clsx(
                "scroll-mt-4 bg-surface rounded-3xl shadow-elevation-1 border border-outline-variant/30 overflow-hidden transition-all duration-300",
                selectedYear
                  ? "opacity-100 translate-x-0"
                  : "opacity-70 md:translate-x-2",
              )}
              aria-disabled={!selectedYear}
            >
              <div className="p-4 bg-surface-container border-b border-outline-variant/20 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className={clsx(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold",
                    selectedYear ? "bg-primary text-on-primary" : "bg-outline-variant/30 text-on-surface-variant",
                  )}>2</span>
                  <div>
                    <h2 className="text-sm font-bold text-on-surface">
                      {selectedYear ? `Choose a section in ${selectedYear}` : "Choose a section"}
                    </h2>
                    <p className="text-xs text-on-surface-variant">
                      {selectedYear ? "Select a section to choose a tool" : "Choose a year level first"}
                    </p>
                  </div>
                </div>
                {selectedYear && (
                  <span className="shrink-0 rounded-full bg-surface px-2.5 py-1 text-xs font-semibold text-on-surface-variant">
                    {availableSections.length} {availableSections.length === 1 ? "section" : "sections"}
                  </span>
                )}
              </div>
              {selectedYear && availableSections.length > 6 && (
                <div className="px-3 pt-3">
                  <label className="relative block">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant/70" />
                    <input
                      type="search"
                      value={sectionSearch}
                      onChange={(event) => setSectionSearch(event.target.value)}
                      placeholder="Search sections"
                      aria-label="Search sections"
                      className="h-10 w-full rounded-xl border border-outline-variant/40 bg-surface-container-low pl-9 pr-3 text-sm text-on-surface outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                    />
                  </label>
                </div>
              )}
              <div className="p-3 grid grid-cols-2 gap-3 min-h-[200px]">
                {!selectedYear && (
                  <div className="col-span-2 flex flex-col items-center justify-center py-10 text-center text-on-surface-variant/70">
                    <Calendar className="mb-3 h-10 w-10 opacity-30" />
                    <p className="text-sm font-medium">Your sections will appear here</p>
                    <p className="mt-1 text-xs">Start by selecting a year level in Step 1.</p>
                  </div>
                )}
                {selectedYear &&
                  matchingSections.map((section) => (
                    <button
                      key={section}
                      type="button"
                      onClick={() => setSelectedSectionForTool(section)}
                      className="flex min-h-32 flex-col items-center justify-center rounded-2xl border border-outline-variant/30 bg-surface-container-low p-5 transition-all group cursor-pointer hover:-translate-y-0.5 hover:border-primary hover:bg-primary-container/30 hover:shadow-elevation-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                    >
                      <div className="mb-3 rounded-full bg-primary-container p-3 text-primary shadow-sm transition-transform group-hover:scale-110">
                        <Users className="w-5 h-5" />
                      </div>
                      <span className="font-bold text-on-surface text-base group-hover:text-primary">
                        Section {section}
                      </span>
                      <span className="mt-1 text-xs text-on-surface-variant">Open attendance or grades</span>
                    </button>
                  ))}
                {selectedYear &&
                  availableSections.length === 0 && (
                    <div className="col-span-2 text-center py-8 text-outline/60 italic text-sm">
                      No sections available
                    </div>
                  )}
                {selectedYear && availableSections.length > 0 && matchingSections.length === 0 && (
                  <div className="col-span-2 py-8 text-center text-sm text-on-surface-variant">
                    No sections match your search.
                  </div>
                )}
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
