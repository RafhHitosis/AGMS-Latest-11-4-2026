const isRecord = (value) => value !== null && typeof value === "object" && !Array.isArray(value);

export const validateAppConfigResponse = (data) => {
  if (!isRecord(data)) return "The server returned an invalid application configuration.";
  if (!isRecord(data.sections) || !isRecord(data.schedules) || !isRecord(data.termDates)) {
    return "The server returned incomplete application configuration.";
  }
  if (Object.values(data.sections).some(
    (sectionIds) =>
      !Array.isArray(sectionIds) ||
      sectionIds.some((sectionId) => typeof sectionId !== "string" || !sectionId.trim()),
  )) {
    return "The server returned invalid section configuration.";
  }
  if (Object.values(data.schedules).some(
    (schedule) =>
      !Array.isArray(schedule) ||
      schedule.some((day) => !Number.isInteger(day) || day < 0 || day > 6) ||
      new Set(schedule).size !== schedule.length,
  )) {
    return "The server returned invalid class schedules.";
  }
  return null;
};
