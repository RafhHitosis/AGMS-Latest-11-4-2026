import { useState, useEffect, useCallback } from "react";
import api from "../lib/api";

export const useSettings = () => {
  const [termDates, setTermDates] = useState({});
  const [appConfig, setAppConfig] = useState({
    title: "",
    subtitle: "Choose a year level and section to manage attendance",
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
      const data = await api.getConfig();
      setTermDates(data.termDates || {});
      const fetchedLogo = data.appLogo || localStorage.getItem("agms_app_logo") || "";
      if (data.appLogo) {
        localStorage.setItem("agms_app_logo", data.appLogo);
      }
      setAppConfig({
        title: data.appTitle || "",
        subtitle: data.appSubtitle !== undefined && data.appSubtitle !== null ? data.appSubtitle : "Choose a year level and section to manage attendance",
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
    loading,
    error,
    refreshConfig: fetchConfig,
  };
};

export default useSettings;
