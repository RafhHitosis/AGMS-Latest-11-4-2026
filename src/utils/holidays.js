import { isSameDay, parseISO, format } from "date-fns";

/**
 * Official Philippine Regular Holidays & Special (Non-Working) Days
 * Explicitly matched to official presidential proclamations and Philippine holiday calendar.
 */

// Fixed-Date Annual Holidays (Observed Every Year)
export const FIXED_ANNUAL_HOLIDAYS = [
  { monthDay: "01-01", name: "New Year's Day", type: "Regular Holiday" },
  { monthDay: "04-09", name: "Araw ng Kagitingan (Day of Valor)", type: "Regular Holiday" },
  { monthDay: "05-01", name: "Labor Day", type: "Regular Holiday" },
  { monthDay: "06-12", name: "Independence Day", type: "Regular Holiday" },
  { monthDay: "08-21", name: "Ninoy Aquino Day", type: "Special Non-Working Day" },
  { monthDay: "11-01", name: "All Saints' Day", type: "Special Non-Working Day" },
  { monthDay: "11-30", name: "Bonifacio Day", type: "Regular Holiday" },
  { monthDay: "12-08", name: "Feast of the Immaculate Conception of Mary", type: "Special Non-Working Day" },
  { monthDay: "12-24", name: "Christmas Eve", type: "Special Non-Working Day" },
  { monthDay: "12-25", name: "Christmas Day", type: "Regular Holiday" },
  { monthDay: "12-30", name: "Rizal Day", type: "Regular Holiday" },
  { monthDay: "12-31", name: "Last Day of the Year (New Year's Eve)", type: "Special Non-Working Day" },
];

// Movable & Year-Specific Official Holidays (Exact Dates per Official Proclamations)
export const YEAR_SPECIFIC_HOLIDAYS = [
  // 2025 (Proclamation No. 727, 839, 911)
  { date: "2025-01-29", name: "Chinese New Year", type: "Special Non-Working Day" },
  { date: "2025-04-01", name: "Eid'l Fitr", type: "Regular Holiday" },
  { date: "2025-04-17", name: "Maundy Thursday", type: "Regular Holiday" },
  { date: "2025-04-18", name: "Good Friday", type: "Regular Holiday" },
  { date: "2025-04-19", name: "Black Saturday", type: "Special Non-Working Day" },
  { date: "2025-06-06", name: "Eid'l Adha", type: "Regular Holiday" },
  { date: "2025-08-25", name: "National Heroes Day", type: "Regular Holiday" },
  { date: "2025-10-31", name: "All Saints' Day Eve", type: "Special Non-Working Day" },

  // 2026 (Official 2026 Holiday Calendar)
  { date: "2026-02-17", name: "Chinese New Year", type: "Special Non-Working Day" },
  { date: "2026-03-20", name: "Eid'l Fitr (Estimated)", type: "Regular Holiday" },
  { date: "2026-04-02", name: "Maundy Thursday", type: "Regular Holiday" },
  { date: "2026-04-03", name: "Good Friday", type: "Regular Holiday" },
  { date: "2026-04-04", name: "Black Saturday", type: "Special Non-Working Day" },
  { date: "2026-05-27", name: "Eid'l Adha (Estimated)", type: "Regular Holiday" },
  { date: "2026-08-31", name: "National Heroes Day", type: "Regular Holiday" },
  { date: "2026-11-02", name: "All Souls' Day", type: "Special Non-Working Day" },

  // 2027
  { date: "2027-02-06", name: "Chinese New Year", type: "Special Non-Working Day" },
  { date: "2027-03-10", name: "Eid'l Fitr (Estimated)", type: "Regular Holiday" },
  { date: "2027-03-25", name: "Maundy Thursday", type: "Regular Holiday" },
  { date: "2027-03-26", name: "Good Friday", type: "Regular Holiday" },
  { date: "2027-03-27", name: "Black Saturday", type: "Special Non-Working Day" },
  { date: "2027-05-17", name: "Eid'l Adha (Estimated)", type: "Regular Holiday" },
  { date: "2027-08-30", name: "National Heroes Day", type: "Regular Holiday" },
  { date: "2027-11-02", name: "All Souls' Day", type: "Special Non-Working Day" },
];

/**
 * Check if a date is an official Philippine holiday (Regular or Special Non-Working)
 * or a custom holiday from PostgreSQL.
 *
 * @param {Date|string} date - The date to check
 * @param {Array} customHolidays - Custom holidays array from PostgreSQL
 * @returns {{ isHoliday: boolean, name: string|null, type?: string }}
 */
export const isDateHoliday = (date, customHolidays = []) => {
  if (!date) return { isHoliday: false, name: null };
  const targetDate = date instanceof Date ? date : new Date(date);
  if (isNaN(targetDate.getTime())) return { isHoliday: false, name: null };

  // 1. Check Custom Holidays from PostgreSQL first (allows custom school holidays/overrides)
  if (customHolidays && customHolidays.length > 0) {
    const custom = customHolidays.find((h) => {
      try {
        return isSameDay(parseISO(h.date), targetDate);
      } catch {
        return false;
      }
    });
    if (custom) {
      return { isHoliday: true, name: custom.name, type: "Custom Holiday" };
    }
  }

  // 2. Check Year-Specific Philippine Official Holidays
  const formattedDate = format(targetDate, "yyyy-MM-dd");
  const yearSpecific = YEAR_SPECIFIC_HOLIDAYS.find((h) => h.date === formattedDate);
  if (yearSpecific) {
    return {
      isHoliday: true,
      name: `${yearSpecific.name} (${yearSpecific.type})`,
      type: yearSpecific.type,
    };
  }

  // 3. Check Fixed Annual Philippine Official Holidays
  const monthDay = format(targetDate, "MM-dd");
  const fixed = FIXED_ANNUAL_HOLIDAYS.find((h) => h.monthDay === monthDay);
  if (fixed) {
    return {
      isHoliday: true,
      name: `${fixed.name} (${fixed.type})`,
      type: fixed.type,
    };
  }

  return { isHoliday: false, name: null };
};
