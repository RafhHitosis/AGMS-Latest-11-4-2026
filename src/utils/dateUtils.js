import { eachDayOfInterval, format } from "date-fns";

export const generateDates = (start, end) => {
  if (!start || !end) return [];
  const startDate = start instanceof Date ? start : new Date(start);
  const endDate = end instanceof Date ? end : new Date(end);

  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    return [];
  }

  if (startDate > endDate) return [];

  try {
    return eachDayOfInterval({ start: startDate, end: endDate });
  } catch {
    return [];
  }
};

export const groupDatesByMonth = (dates = []) => {
  const groups = {};
  if (!dates || !Array.isArray(dates)) return groups;

  dates.forEach((date) => {
    if (!date) return;
    const monthKey = format(date, "MMMM");
    if (!groups[monthKey]) groups[monthKey] = [];
    groups[monthKey].push(date);
  });
  return groups;
};

export const chunkDates = (dates = [], size = 2) => {
  const chunks = [];
  if (!dates || !Array.isArray(dates)) return chunks;

  for (let i = 0; i < dates.length; i += size) {
    chunks.push(dates.slice(i, i + size));
  }
  return chunks;
};
