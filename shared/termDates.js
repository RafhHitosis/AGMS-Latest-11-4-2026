export const isValidIsoDate = (value) => {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
};

export const isValidDateRange = (startDate, endDate) =>
  isValidIsoDate(startDate) &&
  isValidIsoDate(endDate) &&
  startDate <= endDate;

export const getTermDateRange = (term, termDates = {}) => {
  const prefix = term === "midterm" ? "midterm" : term === "finals" ? "finals" : null;
  if (!prefix || !termDates || typeof termDates !== "object") return null;

  const startDate = termDates[`${prefix}Start`];
  const endDate = termDates[`${prefix}End`];
  return isValidDateRange(startDate, endDate) ? { startDate, endDate } : null;
};

export const countAbsencesByStudent = (attendance, dateRange) => {
  if (!isValidDateRange(dateRange?.startDate, dateRange?.endDate)) {
    throw new Error("A valid date range is required to count attendance.");
  }

  const counts = new Map();
  for (const [date, students] of Object.entries(attendance || {})) {
    if (date < dateRange.startDate || date > dateRange.endDate || !students) continue;

    for (const [studentId, isAbsent] of Object.entries(students)) {
      if (isAbsent) {
        counts.set(studentId, (counts.get(studentId) || 0) + 1);
      }
    }
  }

  return counts;
};
