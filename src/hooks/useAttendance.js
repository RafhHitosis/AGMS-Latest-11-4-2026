import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import api from "../lib/api";
import { format, isSunday, isSaturday } from "date-fns";
import { isDateHoliday } from "../utils/holidays";
import { isValidDateRange } from "../../shared/termDates.js";
import { useToast } from "../context/ToastContext";
import { createKeyedRequestQueue } from "../utils/keyedRequestQueue";

export const useAttendance = (dates, sectionId, scheduleConfig) => {
  // State
  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState({});
  const attendanceRef = useRef(attendance);
  const attendanceSaveVersionsRef = useRef(new Map());
  const attendanceSaveQueueRef = useRef(null);
  if (!attendanceSaveQueueRef.current) {
    attendanceSaveQueueRef.current = createKeyedRequestQueue(
      (saveSectionId, studentId, date, isAbsent) =>
        api.setAttendance(saveSectionId, studentId, date, isAbsent)
    );
  }
  const toast = useToast();
  const [customHolidays, setCustomHolidays] = useState([]);
  const [holidaysLoading, setHolidaysLoading] = useState(true);
  const [holidaysError, setHolidaysError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saveStatus, setSaveStatus] = useState("saved");
  const [saveError, setSaveError] = useState(null);
  const pendingSavesRef = useRef(0);
  const saveErrorsRef = useRef([]);

  const trackSave = useCallback(async (operation, isFailureRelevant = () => true) => {
    if (pendingSavesRef.current === 0) {
      saveErrorsRef.current = [];
      setSaveError(null);
    }
    pendingSavesRef.current += 1;
    setSaveStatus("saving");

    try {
      return await operation();
    } catch (saveFailure) {
      if (isFailureRelevant()) {
        saveErrorsRef.current.push(saveFailure);
        setSaveError(saveFailure);
      }
      throw saveFailure;
    } finally {
      pendingSavesRef.current -= 1;
      if (pendingSavesRef.current === 0) {
        const lastFailure = saveErrorsRef.current[saveErrorsRef.current.length - 1] || null;
        setSaveError(lastFailure);
        setSaveStatus(lastFailure ? "error" : "saved");
      }
    }
  }, []);

  // Load Custom Holidays
  const loadHolidays = useCallback(async () => {
    setHolidaysLoading(true);
    setHolidaysError(null);
    try {
      const holidays = await api.getHolidays();
      setCustomHolidays(holidays || []);
    } catch (err) {
      console.error("Failed to load holidays from PostgreSQL:", err);
      setHolidaysError(err);
    } finally {
      setHolidaysLoading(false);
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
      attendanceRef.current = attendanceData || {};
      setAttendance(attendanceRef.current);
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

  const refreshData = useCallback(async () => {
    await Promise.all([loadSectionData(), loadHolidays()]);
  }, [loadSectionData, loadHolidays]);

  const addStudent = useCallback(
    async (name) => {
      if (!sectionId || !name?.trim()) return;
      return trackSave(async () => {
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
      });
    },
    [sectionId, trackSave]
  );

  const updateStudent = useCallback(
    async (id, name) => {
      if (!sectionId || !name?.trim()) return;
      return trackSave(async () => {
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
      });
    },
    [sectionId, trackSave]
  );

  const deleteStudent = useCallback(
    async (id) => {
      if (!sectionId) return;
      return trackSave(async () => {
        try {
          await api.deleteStudent(sectionId, id);
          setStudents((prev) => prev.filter((s) => s.id !== id));
          // Remove student attendance references locally
          const updated = { ...attendanceRef.current };
          Object.keys(updated).forEach((dateKey) => {
            if (updated[dateKey] && updated[dateKey][id]) {
              const dateCopy = { ...updated[dateKey] };
              delete dateCopy[id];
              updated[dateKey] = dateCopy;
            }
          });
          attendanceRef.current = updated;
          setAttendance(updated);
        } catch (err) {
          console.error("Failed to delete student:", err);
          throw err;
        }
      });
    },
    [sectionId, trackSave]
  );

  const deleteAllStudents = useCallback(async () => {
    if (!sectionId) return;
    return trackSave(async () => {
      try {
        await api.deleteAllStudents(sectionId);
        setStudents([]);
        attendanceRef.current = {};
        setAttendance({});
      } catch (err) {
        console.error("Failed to delete all students:", err);
        throw err;
      }
    });
  }, [sectionId, trackSave]);

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

      const wasAbsent = !!attendanceRef.current[dateKey]?.[studentId];
      const isAbsent = !wasAbsent;
      const key = `${sectionId}:${studentId}:${dateKey}`;
      const version = (attendanceSaveVersionsRef.current.get(key) || 0) + 1;
      attendanceSaveVersionsRef.current.set(key, version);
      const dateRecord = { ...(attendanceRef.current[dateKey] || {}) };
      if (isAbsent) {
        dateRecord[studentId] = true;
      } else {
        delete dateRecord[studentId];
      }
      const nextAttendance = { ...attendanceRef.current, [dateKey]: dateRecord };
      attendanceRef.current = nextAttendance;
      setAttendance(nextAttendance);

      try {
        await trackSave(
          () => attendanceSaveQueueRef.current.save(
            key,
            sectionId,
            studentId,
            dateKey,
            isAbsent
          ),
          () => attendanceSaveVersionsRef.current.get(key) === version
        );
      } catch (err) {
        if (attendanceSaveVersionsRef.current.get(key) === version) {
          try {
            await attendanceSaveQueueRef.current.flush();
            const refreshedAttendance = await api.getAttendance(sectionId);
            attendanceRef.current = refreshedAttendance || {};
            setAttendance(attendanceRef.current);
          } catch (refreshError) {
            console.error("Failed to refresh attendance after a save error:", refreshError);
          }
          toast.error(err.message || "Failed to save attendance.");
        }
      }
    },
    [sectionId, customHolidays, isBlockedBySchedule, toast, trackSave]
  );

  const resetAttendance = useCallback(async (startDate, endDate) => {
    if (!sectionId) return;
    if (!isValidDateRange(startDate, endDate)) {
      throw new Error("A valid term date range is required to reset attendance.");
    }

    return trackSave(async () => {
      try {
        await api.resetAttendance(sectionId, startDate, endDate);
        const nextAttendance = Object.fromEntries(
          Object.entries(attendanceRef.current).filter(
            ([dateKey]) => dateKey < startDate || dateKey > endDate
          )
        );
        attendanceRef.current = nextAttendance;
        setAttendance(nextAttendance);
      } catch (err) {
        console.error("Failed to reset attendance:", err);
        throw err;
      }
    });
  }, [sectionId, trackSave]);

  const replaceCustomHolidays = useCallback((holidays) => {
    setCustomHolidays(holidays);
  }, []);

  const batchAddStudents = useCallback(
    async (names) => {
      if (!sectionId || !Array.isArray(names) || names.length === 0) return;
      return trackSave(async () => {
        try {
          const result = await api.batchAddStudents(sectionId, names);
          setStudents((prev) =>
            [...prev, ...(result.students || [])].sort((a, b) =>
              a.name.localeCompare(b.name)
            )
          );
        } catch (err) {
          console.error("Failed to batch add students:", err);
          throw err;
        }
      });
    },
    [sectionId, trackSave]
  );

  // Compute Stats with memo optimization
  const activeClassDates = useMemo(() => {
    return dates.filter(
      (d) =>
        !isDateHoliday(d, customHolidays).isHoliday &&
        !isBlockedBySchedule(d)
    );
  }, [dates, customHolidays, isBlockedBySchedule]);

  const activeClassDateKeys = useMemo(
    () => activeClassDates.map((date) => format(date, "yyyy-MM-dd")),
    [activeClassDates]
  );

  const totalSchoolDays = useMemo(
    () => activeClassDates.length,
    [activeClassDates]
  );

  const stats = useMemo(
    () => {
      const absenceCounts = new Map();

      for (const dateKey of activeClassDateKeys) {
        const dateAttendance = attendance[dateKey];
        if (!dateAttendance) continue;

        for (const [studentId, isAbsent] of Object.entries(dateAttendance)) {
          if (isAbsent) {
            absenceCounts.set(studentId, (absenceCounts.get(studentId) || 0) + 1);
          }
        }
      }

      return students.map((student) => {
        const totalAbsences = absenceCounts.get(student.id) || 0;
        return {
          studentId: student.id,
          totalAbsences,
          totalPresent: totalSchoolDays - totalAbsences,
        };
      });
    },
    [students, activeClassDateKeys, attendance, totalSchoolDays]
  );

  return {
    students,
    attendance,
    customHolidays,
    holidaysLoading,
    holidaysError,
    loading,
    saveStatus,
    saveError,
    addStudent,
    updateStudent,
    deleteStudent,
    deleteAllStudents,
    replaceCustomHolidays,
    toggleAttendance,
    resetAttendance,
    batchAddStudents,
    stats,
    totalSchoolDays,
    error,
    refreshData,
  };
};

export default useAttendance;
