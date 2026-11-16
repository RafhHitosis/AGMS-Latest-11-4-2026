import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  AlertCircle,
  ArrowLeft,
  Award,
  BookOpen,
  Calendar,
  Check,
  CheckSquare,
  ChevronDown,
  Download,
  FileCheck2,
  FileSpreadsheet,
  GraduationCap,
  Loader2,
  MoreHorizontal,
  Plus,
  School,
  Settings,
  Sparkles,
} from "lucide-react";
import clsx from "clsx";

function ActionMenu({
  actions = [],
  ariaLabel,
  className = "",
  variant = "overflow",
}) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);
  const isAddMenu = variant === "add";
  const isDisabled = actions.length === 0 || actions.every((action) => action.disabled);

  useEffect(() => {
    if (!isOpen) return undefined;

    const handlePointerDown = (event) => {
      if (!menuRef.current?.contains(event.target)) setIsOpen(false);
    };
    const handleKeyDown = (event) => {
      if (event.key === "Escape") setIsOpen(false);
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div ref={menuRef} className={clsx("relative", isOpen && "z-50", className)}>
      <button
        type="button"
        aria-label={ariaLabel}
        title={ariaLabel}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        disabled={isDisabled}
        onClick={() => setIsOpen((open) => !open)}
        className={
          isAddMenu
            ? "border border-slate-200 dark:border-slate-700 hover:border-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 text-xs font-medium px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-sm transition-all focus:ring-2 focus:ring-slate-200 dark:focus:ring-slate-700 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            : "w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
        }
      >
        {isAddMenu ? (
          <>
            <Plus className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400 stroke-[2.5]" />
            <span>Add</span>
            <ChevronDown className="w-3 h-3 text-slate-400 dark:text-slate-500" />
          </>
        ) : (
          <MoreHorizontal className="w-4 h-4 stroke-[2.5]" />
        )}
      </button>
      {isOpen && (
        <div
          role="menu"
          className="absolute right-0 top-full z-[100] mt-1.5 min-w-44 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-1 text-slate-700 dark:text-slate-200 shadow-lg backdrop-blur-md animate-in fade-in zoom-in-95 duration-150"
        >
          {actions.map((action) => {
            const ItemIcon = action.icon;
            return (
              <button
                key={action.label}
                type="button"
                role="menuitem"
                disabled={action.disabled}
                onClick={() => {
                  setIsOpen(false);
                  action.onSelect?.();
                }}
                className={clsx(
                  "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-xs font-medium transition-colors hover:bg-slate-100 dark:hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer",
                  action.mobileOnly ? "md:hidden" : "",
                  action.danger
                    ? "text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                    : "text-slate-700 dark:text-slate-200"
                )}
              >
                {ItemIcon && (
                  <ItemIcon
                    className={clsx(
                      "h-4 w-4 shrink-0",
                      action.danger
                        ? "text-rose-600 dark:text-rose-400"
                        : "text-slate-400 dark:text-slate-500"
                    )}
                  />
                )}
                <span>{action.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function renderLogo(logo) {
  if (logo && (logo.startsWith("data:") || logo.startsWith("http") || logo.startsWith("/"))) {
    return <img src={logo} alt="Logo" className="h-5 w-5 rounded object-contain" />;
  }
  if (logo === "Calendar") return <Calendar className="h-5 w-5" />;
  if (logo === "GraduationCap") return <GraduationCap className="h-5 w-5" />;
  if (logo === "Award") return <Award className="h-5 w-5" />;
  if (logo === "BookOpen") return <BookOpen className="h-5 w-5" />;
  if (logo === "School") return <School className="h-5 w-5" />;
  if (logo === "Sparkles") return <Sparkles className="h-5 w-5" />;
  if (logo === "CheckSquare") return <CheckSquare className="h-5 w-5" />;
  return <GraduationCap className="h-5 w-5" />;
}

export function SectionTermToggle({ term, onChange }) {
  return (
    <div
      aria-label="Term Selection"
      role="radiogroup"
      className="bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200/90 dark:border-slate-700 flex items-center"
    >
      {["midterm", "finals"].map((termName) => {
        const isSelected = term === termName;
        return (
          <button
            key={termName}
            type="button"
            role="radio"
            aria-checked={isSelected}
            onClick={() => onChange(termName)}
            className={clsx(
              "text-xs font-medium px-3 py-1 rounded-md transition-all duration-200 ease-out cursor-pointer select-none",
              isSelected
                ? "bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 shadow-sm"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
            )}
          >
            {termName === "midterm" ? "Midterm" : "Finals"}
          </button>
        );
      })}
    </div>
  );
}

export default function SectionPageHeader({
  sectionId,
  appConfig,
  onBack,
  workspace,
  onSwitchWorkspace,
  saveStatus = "saved",
  saveErrorMessage,
  saveDetails,
  badge,
  termControl,
  addActions = [],
  primaryAction,
  onExport,
  exportDisabled = false,
  settingsAction,
  overflowActions = [],
  overflowLabel = "More actions",
  children,
}) {
  const [indicator, setIndicator] = useState({ left: 0, width: 0, ready: false });
  const tabRefs = useRef({});
  const navRef = useRef(null);

  const updateIndicator = useCallback(() => {
    const activeKey = workspace?.toLowerCase();
    const activeEl = tabRefs.current[activeKey];
    const navEl = navRef.current;
    if (activeEl && navEl) {
      const navRect = navEl.getBoundingClientRect();
      const tabRect = activeEl.getBoundingClientRect();
      setIndicator({
        left: tabRect.left - navRect.left,
        width: tabRect.width,
        ready: true,
      });
    }
  }, [workspace]);

  useEffect(() => {
    updateIndicator();
    const timer = setTimeout(updateIndicator, 50);
    window.addEventListener("resize", updateIndicator);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", updateIndicator);
    };
  }, [updateIndicator]);

  const menuOverflowActions = [
    ...addActions.map((action) => ({ ...action, mobileOnly: true })),
    ...overflowActions,
  ];

  const handleTabClick = (tabId) => {
    if (workspace?.toLowerCase() !== tabId) {
      onSwitchWorkspace?.(tabId);
    }
  };

  const renderSaveStatus = () => {
    if (saveStatus === "saving") {
      return (
        <div
          role="status"
          aria-label="Saving…"
          className="flex items-center gap-1 text-amber-600 dark:text-amber-400 text-[11px] font-medium animate-pulse select-none"
          title="Saving…"
        >
          <Loader2 className="w-3.5 h-3.5 shrink-0 animate-spin text-amber-500" />
          <span>Saving…</span>
        </div>
      );
    }

    if (saveStatus === "error") {
      return (
        <div
          role="status"
          aria-label="Save failed"
          aria-describedby={saveErrorMessage ? "section-save-error-details" : undefined}
          className="flex items-center gap-1 text-rose-600 dark:text-rose-400 text-[11px] font-medium select-none"
          title="Save failed"
        >
          <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-500" />
          <span>Save failed</span>
          {saveDetails}
        </div>
      );
    }

    if (saveStatus === "unsaved") {
      return (
        <div
          role="status"
          aria-label="Unsaved changes"
          className="flex items-center gap-1 text-amber-600 dark:text-amber-400 text-[11px] font-medium select-none"
          title="Unsaved changes"
        >
          <span className="w-1.5 h-1.5 shrink-0 rounded-full bg-amber-500" />
          <span>Unsaved</span>
        </div>
      );
    }

    // Default: "All changes saved" with emerald checkmark
    return (
      <div
        role="status"
        aria-label="All changes saved"
        className="flex items-center gap-1 text-slate-500 dark:text-slate-400 text-[11px] select-none"
        title="All changes saved"
      >
        <Check className="w-3.5 h-3.5 text-[#0B7A5A] dark:text-emerald-400 shrink-0 stroke-[2.5]" />
        <span>All changes saved</span>
      </div>
    );
  };

  return (
    <div className="sticky top-0 z-40 shrink-0">
      {/* 64px Fixed Height Clean Top Navigation Header */}
      <header className="h-16 w-full border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 flex items-center justify-between select-none relative z-30 transition-colors duration-150">
        {/* LEFT GROUP: Back, Logo, Title & Metadata */}
        <div className="flex items-center gap-3 shrink-0" data-purpose="left-group">
          {/* Ghost Back Button */}
          <button
            type="button"
            onClick={onBack}
            aria-label="Go back"
            title="Back to Section Selection"
            className="w-9 h-9 flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          {/* Brand Logo Tile (Academic Shield / Graduation Icon) */}
          <div
            className="w-9 h-9 rounded-lg bg-[#0B7A5A] text-white flex items-center justify-center shadow-sm shrink-0 overflow-hidden"
            title="Section Academic Workspace"
          >
            {renderLogo(appConfig?.logo)}
          </div>

          {/* Two-line Title Block */}
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5 leading-none">
              <span className="text-sm font-semibold tracking-tight text-slate-900 dark:text-slate-100 whitespace-nowrap">
                Section {sectionId}
              </span>
              <span
                className="text-xs font-normal text-slate-400 dark:text-slate-500 truncate max-w-[100px] sm:max-w-[160px]"
                title={appConfig?.title || "AGMS"}
              >
                / {appConfig?.title || "AGMS"}
              </span>
            </div>

            <div className="flex h-5 items-center gap-2 whitespace-nowrap overflow-hidden mt-1 leading-none text-xs">
              {renderSaveStatus()}
              {saveErrorMessage && (
                <span id="section-save-error-details" className="sr-only">
                  {saveErrorMessage}
                </span>
              )}
              {badge && (
                <div className="animate-in fade-in duration-200">
                  {badge}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* CENTER GROUP: Pure Underline Tab Navigation (True Center on Desktop) */}
        {onSwitchWorkspace && (
          <nav
            ref={navRef}
            aria-label="Class Management Views"
            className="hidden md:flex absolute left-1/2 -translate-x-1/2 bottom-0 top-0 items-center gap-2 h-16"
            data-purpose="center-navigation"
          >
            {[
              { id: "attendance", label: "Attendance", icon: Calendar },
              { id: "grading", label: "Grading", icon: FileSpreadsheet },
              { id: "assessments", label: "Assessments", icon: FileCheck2 },
            ].map((tab) => {
              const Icon = tab.icon;
              const isCurrent = workspace?.toLowerCase() === tab.id;
              return (
                <button
                  key={tab.id}
                  ref={(el) => {
                    tabRefs.current[tab.id] = el;
                  }}
                  type="button"
                  role="tab"
                  aria-selected={isCurrent}
                  aria-current={isCurrent ? "page" : undefined}
                  onClick={() => handleTabClick(tab.id)}
                  className={clsx(
                    "h-full px-4 flex items-center gap-2 text-sm font-medium transition-colors duration-200 ease-out cursor-pointer select-none focus:outline-none",
                    isCurrent
                      ? "text-slate-900 dark:text-slate-100"
                      : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                  )}
                >
                  <Icon
                    className={clsx(
                      "w-4 h-4 transition-colors duration-200 ease-out",
                      isCurrent
                        ? "text-[#0B7A5A] dark:text-emerald-400"
                        : "text-slate-400 dark:text-slate-500"
                    )}
                  />
                  <span>{tab.label}</span>
                </button>
              );
            })}

            {/* Sliding Underline Animation */}
            <span
              className={clsx(
                "absolute bottom-0 h-0.5 bg-[#0B7A5A] dark:bg-emerald-400 pointer-events-none rounded-t-full motion-reduce:transition-none",
                indicator.ready ? "transition-[left,width] duration-300 ease-out" : "opacity-0"
              )}
              style={{
                left: `${indicator.left}px`,
                width: `${indicator.width}px`,
              }}
            />
          </nav>
        )}

        {/* RIGHT GROUP: Controls & Actions in Strict Order */}
        <div className="flex items-center gap-2 shrink-0" data-purpose="right-actions-group">
          {/* Mobile workspace switcher (< md) */}
          {onSwitchWorkspace && (
            <div className="flex md:hidden items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200/90 dark:border-slate-700 mr-1">
              {[
                { id: "attendance", label: "Attendance", icon: Calendar },
                { id: "grading", label: "Grading", icon: FileSpreadsheet },
                { id: "assessments", label: "Assessments", icon: FileCheck2 },
              ].map((tab) => {
                const Icon = tab.icon;
                const isCurrent = workspace?.toLowerCase() === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => handleTabClick(tab.id)}
                    title={`Switch to ${tab.label}`}
                    className={clsx(
                      "p-1.5 rounded-md text-xs transition-all duration-200 ease-out cursor-pointer",
                      isCurrent
                        ? "bg-white dark:bg-slate-700 text-[#0B7A5A] dark:text-emerald-400 shadow-sm"
                        : "text-slate-500 dark:text-slate-400"
                    )}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span className="sr-only">{tab.label}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* (1) Midterm | Finals Segmented Toggle Control */}
          {termControl && (
            <div className="flex items-center animate-in fade-in duration-150">
              {termControl}
            </div>
          )}

          {termControl && (
            <div className="hidden sm:block h-4 w-[1px] bg-slate-200 dark:bg-slate-700 mx-0.5" />
          )}

          {primaryAction && (
            <button
              type="button"
              onClick={primaryAction.onClick}
              disabled={primaryAction.disabled}
              aria-label={primaryAction.ariaLabel || primaryAction.label}
              title={primaryAction.title || primaryAction.label}
              className="inline-flex h-7 items-center justify-center gap-1.5 rounded-lg bg-[#0B7A5A] px-3.5 text-xs font-medium text-white shadow-sm transition-all hover:bg-[#096349] focus:ring-2 focus:ring-emerald-400/50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Plus className="h-3.5 w-3.5 shrink-0" />
              <span className="hidden sm:inline">{primaryAction.label}</span>
            </button>
          )}

          {/* (2) + Add Secondary Outlined Button */}
          {addActions.length > 0 && (
            <ActionMenu
              actions={addActions}
              ariaLabel="Add student or import"
              variant="add"
              className="hidden sm:block"
            />
          )}

          {/* (3) Export PRIMARY SOLID GREEN BUTTON */}
          <button
            type="button"
            onClick={onExport}
            disabled={exportDisabled || !onExport}
            aria-label="Export"
            title="Export data to Excel spreadsheet"
            className="bg-[#0B7A5A] hover:bg-[#096349] active:bg-[#07503b] dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white text-xs font-medium px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 shadow-sm transition-all focus:ring-2 focus:ring-emerald-400/50 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed select-none"
          >
            <Download className="w-3.5 h-3.5 text-emerald-100" />
            <span>Export</span>
          </button>

          {/* (4) Settings Ghost Icon Button */}
          {settingsAction && (
            <button
              type="button"
              onClick={settingsAction.onClick}
              disabled={settingsAction.disabled}
              aria-label={settingsAction.ariaLabel || "Section Settings"}
              title={settingsAction.title || "Section Settings"}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Settings className="w-4 h-4" />
            </button>
          )}

          {/* (5) More Options Ghost Icon Button */}
          <ActionMenu
            actions={menuOverflowActions}
            ariaLabel={overflowLabel}
            variant="overflow"
          />
        </div>
      </header>

      {/* Children for Sub-toolbars (e.g. Grading Sheet Selector & Performance Ribbon) */}
      {children && <div className="relative z-10">{children}</div>}
    </div>
  );
}
