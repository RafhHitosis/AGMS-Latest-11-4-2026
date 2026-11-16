import { isValidDateRange, isValidIsoDate } from "./termDates.js";

const isRecord = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const termDateKeys = new Set([
  "midtermStart",
  "midtermEnd",
  "finalsStart",
  "finalsEnd",
]);

export const validateSectionSettingsUpdate = (settings) => {
  if (!isRecord(settings)) return "Settings must be an object.";
  if (Object.keys(settings).some((key) => !["termDates", "schedule", "holidays"].includes(key))) {
    return "Settings contain an unsupported field.";
  }

  const hasTermDates = Object.hasOwn(settings, "termDates");
  const hasHolidays = Object.hasOwn(settings, "holidays");
  const hasSchedule = Object.hasOwn(settings, "schedule");
  if (!hasTermDates && !hasHolidays && !hasSchedule) {
    return "At least one settings change is required.";
  }

  if (hasTermDates) {
    if (!isRecord(settings.termDates)) return "Term dates must be an object.";
    if (Object.keys(settings.termDates).some((key) => !termDateKeys.has(key))) {
      return "Term dates contain an unsupported field.";
    }
    if (Object.values(settings.termDates).some(
      (value) => value !== "" && !isValidIsoDate(value),
    )) {
      return "Term dates must be valid ISO dates or blank.";
    }
    const { midtermStart, midtermEnd, finalsStart, finalsEnd } = settings.termDates;
    if (
      (midtermStart && midtermEnd && !isValidDateRange(midtermStart, midtermEnd)) ||
      (finalsStart && finalsEnd && !isValidDateRange(finalsStart, finalsEnd))
    ) {
      return "Each term start date must be on or before its end date.";
    }
  }

  if (hasSchedule) {
    const { schedule } = settings;
    if (
      !Array.isArray(schedule) ||
      schedule.some((day) => !Number.isInteger(day) || day < 0 || day > 6) ||
      new Set(schedule).size !== schedule.length
    ) {
      return "Schedule must be a list of unique weekday values from 0 to 6.";
    }
  }

  if (hasHolidays) {
    if (!Array.isArray(settings.holidays)) return "Custom holidays must be a list.";
    const ids = new Set();
    for (const holiday of settings.holidays) {
      if (
        !isRecord(holiday) ||
        !isValidIsoDate(holiday.date) ||
        typeof holiday.name !== "string" ||
        holiday.name.trim().length === 0 ||
        holiday.name.trim().length > 255 ||
        (holiday.id !== undefined &&
          (typeof holiday.id !== "string" || holiday.id.length === 0 || holiday.id.length > 50)) ||
        (holiday.id !== undefined && ids.has(holiday.id))
      ) {
        return "Each custom holiday must have a valid date, name, and unique ID.";
      }
      if (holiday.id !== undefined) ids.add(holiday.id);
    }
  }

  return null;
};
