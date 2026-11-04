import { useState, useEffect, useCallback, useMemo } from "react";
import api from "../lib/api";
import { format, isSunday, isSaturday } from "date-fns";
import { isDateHoliday } from "../utils/holidays";

export const useAttendance = (dates, sectionId, scheduleConfig) => {
  // State
  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState({});
  const [customHolidays, setCustomHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load Custom Holidays
  const loadHolidays = useCallback(async () => {
    try {
      const holidays = await api.getHolidays();
      setCustomHolidays(holidays || []);
    } catch (err) {
      console.error("Failed to load holidays from PostgreSQL:", err);
    }
  }, []);

  useEffect(() => {
    loadHolidays();
  }, [loadHolidays]);

  // Load Students and Attendance for specific Section
  const loadSectionData = useCallback(async () => {
    if (!sectionId) return;

    setLoading(true);
    setError(null);

    try {
      const [studentsData, attendanceData] = await Promise.all([
        api.getStudents(sectionId),
        api.getAttendance(sectionId),
      ]);

      const sortedStudents = (studentsData || []).sort((a, b) =>
        a.name.localeCompare(b.name)
      );

      setStudents(sortedStudents);
      setAttendance(attendanceData || {});
    } catch (err) {
      console.error("Failed to load section data from PostgreSQL:", err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [sectionId]);

  useEffect(() => {
    loadSectionData();
  }, [loadSectionData]);

  const addStudent = useCallback(
    async (name) => {
      if (!sectionId || !name?.trim()) return;
      try {
        const newStudent = await api.addStudent(sectionId, name.trim());
        setStudents((prev) => {
          const updated = [...prev, newStudent];
          updated.sort((a, b) => a.name.localeCompare(b.name));
          return updated;
        });
        return newStudent;
      } catch (err) {
        console.error("Failed to add student:", err);
        throw err;
      }
    },
    [sectionId]
  );

  const updateStudent = useCallback(
    async (id, name) => {
      if (!sectionId || !name?.trim()) return;
      try {
        const updated = await api.updateStudent(sectionId, id, name.trim());
        setStudents((prev) =>
          prev
            .map((s) => (s.id === id ? { ...s, name: updated.name } : s))
            .sort((a, b) => a.name.localeCompare(b.name))
        );
      } catch (err) {
        console.error("Failed to update student:", err);
        throw err;
      }
    },
    [sectionId]
  );

  const deleteStudent = useCallback(
    async (id) => {
      if (!sectionId) return;
      try {
        await api.deleteStudent(sectionId, id);
        setStudents((prev) => prev.filter((s) => s.id !== id));
        // Remove student attendance references locally
        setAttendance((prev) => {
          const updated = { ...prev };
          Object.keys(updated).forEach((dateKey) => {
            if (updated[dateKey] && updated[dateKey][id]) {
              const dateCopy = { ...updated[dateKey] };
              delete dateCopy[id];
              updated[dateKey] = dateCopy;
            }
          });
          return updated;
        });
      } catch (err) {
        console.error("Failed to delete student:", err);
        throw err;
      }
    },
    [sectionId]
  );

  const deleteAllStudents = useCallback(async () => {
    if (!sectionId) return;
    try {
      await api.deleteAllStudents(sectionId);
      setStudents([]);
      setAttendance({});
    } catch (err) {
      console.error("Failed to delete all students:", err);
      throw err;
    }
  }, [sectionId]);

  const isBlockedBySchedule = useCallback(
    (date) => {
      const day = date.getDay();
      if (scheduleConfig && Array.isArray(scheduleConfig)) {
        return !scheduleConfig.includes(day);
      }
      return isSunday(date) || isSaturday(date);
    },
    [scheduleConfig]
  );

  const toggleAttendance = useCallback(
    async (studentId, date) => {
      if (!sectionId) return;

      // Strict validation: Prevent writes on blocked days
      const isBlocked = isBlockedBySchedule(date);
      const holidayCheck = isDateHoliday(date, customHolidays);

      if (
        isBlocked ||
        holidayCheck.isHoliday
      ) {
        return;
      }

      const dateKey = format(date, "yyyy-MM-dd");

      // Optimistic UI update for instantaneous responsiveness
      const wasAbsent = !!attendance[dateKey]?.[studentId];
      setAttendance((prev) => {
        const dateRecord = { ...(prev[dateKey] || {}) };
        if (wasAbsent) {
          delete dateRecord[studentId];
        } else {
          dateRecord[studentId] = true;
        }
        return {
          ...prev,
          [dateKey]: dateRecord,
        };
      });

      try {
        await api.toggleAttendance(sectionId, studentId, dateKey);
      } catch (err) {
        console.error("Failed to toggle attendance:", err);
        // Rollback optimistic update on error
        setAttendance((prev) => {
          const dateRecord = { ...(prev[dateKey] || {}) };
          if (wasAbsent) {
            dateRecord[studentId] = true;
          } else {
            delete dateRecord[studentId];
          }
          return {
            ...prev,
            [dateKey]: dateRecord,
          };
        });
      }
    },
    [sectionId, attendance, customHolidays, isBlockedBySchedule]
  );

  const resetAttendance = useCallback(async () => {
    if (!sectionId) return;
    try {
      await api.resetAttendance(sectionId);
      setAttendance({});
    } catch (err) {
      console.error("Failed to reset attendance:", err);
      throw err;
    }
  }, [sectionId]);

  const addCustomHoliday = useCallback(async (date, name) => {
    try {
      const newHoliday = await api.addHoliday(date, name);
      setCustomHolidays((prev) => [...prev, newHoliday]);
    } catch (err) {
      console.error("Failed to add holiday:", err);
      throw err;
    }
  }, []);

  const updateCustomHoliday = useCallback(async (id, date, name) => {
    try {
      const updatedHoliday = await api.updateHoliday(id, date, name);
      setCustomHolidays((prev) =>
        prev.map((holiday) => holiday.id === id ? updatedHoliday : holiday)
      );
    } catch (err) {
      console.error("Failed to update holiday:", err);
      throw err;
    }
  }, []);

  const removeCustomHoliday = useCallback(async (id) => {
    try {
      await api.deleteHoliday(id);
      setCustomHolidays((prev) => prev.filter((h) => h.id !== id));
    } catch (err) {
      console.error("Failed to delete holiday:", err);
      throw err;
    }
  }, []);

  const batchAddStudents = useCallback(
    async (names) => {
      if (!sectionId || !Array.isArray(names) || names.length === 0) return;
      try {
        await api.batchAddStudents(sectionId, names);
        // Reload students from database
        const refreshed = await api.getStudents(sectionId);
        refreshed.sort((a, b) => a.name.localeCompare(b.name));
        setStudents(refreshed);
      } catch (err) {
        console.error("Failed to batch add students:", err);
        throw err;
      }
    },
    [sectionId]
  );

  // Compute Stats with memo optimization
  const activeClassDates = useMemo(() => {
    return dates.filter(
      (d) =>
        !isDateHoliday(d, customHolidays).isHoliday &&
        !isBlockedBySchedule(d)
    );
  }, [dates, customHolidays, isBlockedBySchedule]);

  const totalSchoolDays = useMemo(
    () => activeClassDates.length,
    [activeClassDates]
  );

  const stats = useMemo(
    () =>
      students.map((student) => {
        let totalAbsences = 0;
        let totalPresent = 0;

        activeClassDates.forEach((date) => {
          const dateKey = format(date, "yyyy-MM-dd");
          const isAbsent = attendance[dateKey]?.[student.id];

          if (isAbsent) {
            totalAbsences++;
          } else {
            totalPresent++;
          }
        });

        return {
          studentId: student.id,
          totalAbsences,
          totalPresent,
        };
      }),
    [students, activeClassDates, attendance]
  );

  return {
    students,
    attendance,
    customHolidays,
    loading,
    addStudent,
    updateStudent,
    deleteStudent,
    deleteAllStudents,
    addCustomHoliday,
    updateCustomHoliday,
    removeCustomHoliday,
    toggleAttendance,
    resetAttendance,
    batchAddStudents,
    stats,
    totalSchoolDays,
    error,
    refreshData: loadSectionData,
  };
};

export default useAttendance;
