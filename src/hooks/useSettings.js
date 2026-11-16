import { useState, useEffect, useCallback } from "react";
import api from "../lib/api";
import { validateAppConfigResponse } from "../../shared/appConfigValidation.js";

const DEFAULT_APP_TITLE = "AGMS";
const DEFAULT_APP_SUBTITLE =
  "Choose a year level and section to manage attendance and grades";
const LEGACY_DEFAULT_APP_TITLES = new Set([
  "Attendance & Grading System",
  "Attendance System",
]);
const LEGACY_DEFAULT_APP_SUBTITLE =
  "Choose a year level and section to manage attendance";

const resolveAppTitle = (title) =>
  !title || LEGACY_DEFAULT_APP_TITLES.has(title) ? DEFAULT_APP_TITLE : title;

const resolveAppSubtitle = (subtitle) =>
  !subtitle || subtitle === LEGACY_DEFAULT_APP_SUBTITLE
    ? DEFAULT_APP_SUBTITLE
    : subtitle;

export const useSettings = () => {
  const [termDates, setTermDates] = useState({});
  const [appConfig, setAppConfig] = useState({
    title: DEFAULT_APP_TITLE,
    subtitle: DEFAULT_APP_SUBTITLE,
    logo: localStorage.getItem("agms_app_logo") || "",
    sections: {},
    schedules: {},
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load Config from PostgreSQL backend
  const fetchConfig = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getConfig();
      const validationError = validateAppConfigResponse(data);
      if (validationError) throw new Error(validationError);
      setTermDates(data.termDates || {});
      const fetchedLogo = data.appLogo || localStorage.getItem("agms_app_logo") || "";
      if (data.appLogo) {
        localStorage.setItem("agms_app_logo", data.appLogo);
      }
      setAppConfig({
        title: resolveAppTitle(data.appTitle),
        subtitle: resolveAppSubtitle(data.appSubtitle),
        logo: fetchedLogo,
        sections: data.sections || {},
        schedules: data.schedules || {},
      });
      setError(null);
    } catch (err) {
      console.error("Failed to load settings from PostgreSQL:", err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  const updateTermDates = useCallback(async (newDates) => {
    await api.updateTermDates(newDates);
    setTermDates(newDates);
  }, []);

  const updateAppTitle = useCallback(async (title) => {
    await api.updateAppTitle(title);
    setAppConfig((prev) => ({ ...prev, title }));
  }, []);

  const updateAppSubtitle = useCallback(async (subtitle) => {
    await api.updateAppSubtitle(subtitle);
    setAppConfig((prev) => ({ ...prev, subtitle }));
  }, []);

  const updateAppLogo = useCallback(async (logo) => {
    await api.updateAppLogo(logo);
    if (logo) {
      localStorage.setItem("agms_app_logo", logo);
    } else {
      localStorage.removeItem("agms_app_logo");
    }
    setAppConfig((prev) => ({ ...prev, logo }));
  }, []);

  const updateSections = useCallback(async (sections) => {
    await api.updateSections(sections);
    setAppConfig((prev) => ({ ...prev, sections }));
  }, []);

  const updateSectionConfiguration = useCallback(async (sections, schedules, sectionCopies, archiveIds) => {
    const result = await api.updateSectionConfiguration(sections, schedules, sectionCopies, archiveIds);
    setAppConfig((prev) => ({
      ...prev,
      sections: result.sections,
      schedules: result.schedules,
    }));
    return result;
  }, []);

  const restoreSectionArchive = useCallback(async (archiveId) => {
    const result = await api.restoreSectionArchive(archiveId);
    setAppConfig((prev) => ({
      ...prev,
      sections: result.sections,
      schedules: result.schedules,
    }));
    return result;
  }, []);

  const updateClassSchedules = useCallback(async (schedules) => {
    await api.updateClassSchedules(schedules);
    setAppConfig((prev) => ({ ...prev, schedules }));
  }, []);

  const updateSectionSchedule = useCallback(async (sectionId, schedule) => {
    const result = await api.updateSectionSchedule(sectionId, schedule);
    setAppConfig((prev) => ({
      ...prev,
      schedules: { ...prev.schedules, [sectionId]: result.schedule },
    }));
    return result;
  }, []);

  const saveSectionSettings = useCallback(async (sectionId, settings) => {
    const result = await api.saveSectionSettings(sectionId, settings);
    if (Object.hasOwn(result, "termDates")) setTermDates(result.termDates);
    if (Object.hasOwn(result, "schedule")) {
      setAppConfig((prev) => ({
        ...prev,
        schedules: { ...prev.schedules, [sectionId]: result.schedule },
      }));
    }
    return result;
  }, []);

  return {
    termDates,
    updateTermDates,
    appConfig,
    updateAppTitle,
    updateAppSubtitle,
    updateAppLogo,
    updateSections,
    updateSectionConfiguration,
    restoreSectionArchive,
    updateClassSchedules,
    updateSectionSchedule,
    saveSectionSettings,
    loading,
    error,
    refreshConfig: fetchConfig,
  };
};

export default useSettings;
