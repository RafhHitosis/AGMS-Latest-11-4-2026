import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import api from "../lib/api";
import { useToast } from "../context/ToastContext";
import {
  computeStudentGradeRow,
  calculateSemestralGrade,
  getEquivGrade,
  parseStudentNameAndMI,
} from "../utils/gradeCalculations";
import { countAbsencesByStudent, getTermDateRange } from "../../shared/termDates.js";
import { createKeyedRequestQueue } from "../utils/keyedRequestQueue";

const EMPTY_TERM_DATES = {};

export const useGrades = (sectionId, term = "midterm", termDates = EMPTY_TERM_DATES) => {
  const toast = useToast();
  const [students, setStudents] = useState([]);
  const [config, setConfig] = useState(null);
  const [grades, setGrades] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [saveError, setSaveError] = useState(null);
  const [configSaveStatus, setConfigSaveStatus] = useState("saved");
  const [configSaveError, setConfigSaveError] = useState(null);
  const attendancePeriod = useMemo(
    () => getTermDateRange(term, termDates),
    [term, termDates]
  );

  // Semestral state & caches for Midterm and Finals overviews
  const [semestralScores, setSemestralScores] = useState({});
  const [midtermOverview, setMidtermOverview] = useState({ config: null, grades: {} });
  const [finalsOverview, setFinalsOverview] = useState({ config: null, grades: {} });

  const scoreSaveQueueRef = useRef(null);
  const pendingScoreSavesRef = useRef(0);
  const scoreSaveVersionsRef = useRef(new Map());
  const failedScoreSavesRef = useRef(new Map());
  const saveConfigTimeoutRef = useRef(null);
  const configSaveQueueRef = useRef(Promise.resolve());
  const configSaveVersionRef = useRef(0);
  const latestConfigRef = useRef(config);
  if (!scoreSaveQueueRef.current) {
    scoreSaveQueueRef.current = createKeyedRequestQueue(
      (saveSectionId, saveTerm, studentId, scores) =>
        api.updateStudentScore(saveSectionId, saveTerm, studentId, scores)
    );
  }
  const fetchRequestIdRef = useRef(0);

  const gradesRef = useRef(grades);
  useEffect(() => {
    gradesRef.current = grades;
  }, [grades]);

  const fetchGradeData = useCallback(async () => {
    if (!sectionId) return;
    const requestId = ++fetchRequestIdRef.current;
    setLoading(true);
    setError(null);
    try {
      await scoreSaveQueueRef.current.flush();
      if (requestId !== fetchRequestIdRef.current) return;

      const [currentData, otherData, semData] = await Promise.all([
        api.getGrades(sectionId, term),
        api.getGrades(sectionId, term === "midterm" ? "finals" : "midterm"),
        api.getGrades(sectionId, "semestral"),
      ]);

      if (requestId !== fetchRequestIdRef.current) return;
      setStudents(currentData.students || []);
      setConfig(currentData.config || {});
      latestConfigRef.current = currentData.config || {};
      setGrades(currentData.grades || {});
      gradesRef.current = currentData.grades || {};

      setSemestralScores(semData?.grades || {});

      if (term === "midterm") {
        setMidtermOverview({ config: currentData.config, grades: currentData.grades || {} });
        setFinalsOverview({ config: otherData?.config, grades: otherData?.grades || {} });
      } else {
        setMidtermOverview({ config: otherData?.config, grades: otherData?.grades || {} });
        setFinalsOverview({ config: currentData.config, grades: currentData.grades || {} });
      }
    } catch (err) {
      console.error("Failed to load grades from PostgreSQL:", err);
      if (requestId === fetchRequestIdRef.current) setError(err);
    } finally {
      if (requestId === fetchRequestIdRef.current) setLoading(false);
    }
  }, [sectionId, term]);

  useEffect(() => {
    fetchGradeData();
  }, [fetchGradeData]);

  const saveScoreWithStatus = useCallback(async (key, saveSectionId, saveTerm, studentId, scores) => {
    const version = (scoreSaveVersionsRef.current.get(key) || 0) + 1;
    scoreSaveVersionsRef.current.set(key, version);
    pendingScoreSavesRef.current += 1;
    setSaving(true);

    try {
      await scoreSaveQueueRef.current.save(
        key,
        saveSectionId,
        saveTerm,
        studentId,
        scores
      );
      if (scoreSaveVersionsRef.current.get(key) === version) {
        failedScoreSavesRef.current.delete(key);
      }
    } catch (err) {
      if (scoreSaveVersionsRef.current.get(key) === version) {
        failedScoreSavesRef.current.set(key, {
          sectionId: saveSectionId,
          term: saveTerm,
          studentId,
          scores,
        });
        const message = err.message || "Failed to save grade changes.";
        setSaveError(message);
        toast.error(message);
      }
    } finally {
      pendingScoreSavesRef.current -= 1;
      if (pendingScoreSavesRef.current === 0) {
        setSaving(false);
        if (failedScoreSavesRef.current.size === 0) setSaveError(null);
      }
    }
  }, [toast]);

  // Update a single score field for a student (pe, me, plus, minus, rt, at, remarks)
  const updateScore = useCallback(
    async (studentId, field, value) => {
      const prevStudentScores = { ...(gradesRef.current[studentId] || {}) };
      const nextStudentScores = { ...prevStudentScores, [field]: value };

      // Optimistically update in memory ref and React state
      gradesRef.current = {
        ...gradesRef.current,
        [studentId]: nextStudentScores,
      };
      setGrades((prev) => ({
        ...prev,
        [studentId]: nextStudentScores,
      }));

      // Keep writes for each student and term ordered so an older keystroke cannot overwrite a newer one.
      await saveScoreWithStatus(
        `${sectionId}:${term}:${studentId}`,
        sectionId,
        term,
        studentId,
        { [field]: value }
      );
    },
    [sectionId, term, saveScoreWithStatus]
  );

  // Update a specific quiz score (HQ1, HQ2, LA1, etc.)
  const updateQuizScore = useCallback(
    async (studentId, quizId, value) => {
      const prevStudentScores = { ...(gradesRef.current[studentId] || {}) };
      const prevQuizzes = { ...(prevStudentScores.quizzes || {}) };
      const nextQuizzes = { ...prevQuizzes, [quizId]: value };
      const nextStudentScores = { ...prevStudentScores, quizzes: nextQuizzes };

      gradesRef.current = {
        ...gradesRef.current,
        [studentId]: nextStudentScores,
      };
      setGrades((prev) => ({
        ...prev,
        [studentId]: nextStudentScores,
      }));

      // Keep quiz writes ordered because each request stores the complete quiz-score map.
      await saveScoreWithStatus(
        `${sectionId}:${term}:${studentId}`,
        sectionId,
        term,
        studentId,
        { quizzes: nextQuizzes }
      );
    },
    [sectionId, term, saveScoreWithStatus]
  );

  const retryFailedSaves = useCallback(async () => {
    setSaveError(null);
    const failures = [...failedScoreSavesRef.current.entries()];
    await Promise.all(
      failures.map(([key, failed]) =>
        saveScoreWithStatus(
          key,
          failed.sectionId,
          failed.term,
          failed.studentId,
          failed.scores
        )
      )
    );
  }, [saveScoreWithStatus]);

  // Sync attendance present days from the Attendance tracker to `at`
  const syncAttendanceFromTracker = useCallback(async () => {
    if (!config || !students.length) return;
    if (!attendancePeriod) {
      toast.error("Set valid start and end dates for this term before syncing attendance.");
      return;
    }

    const atMax = Math.max(1, Number(config.at_max) || 36);

    try {
      const attendance = await api.getAttendance(
        sectionId,
        attendancePeriod.startDate,
        attendancePeriod.endDate
      );
      const absences = countAbsencesByStudent(attendance, attendancePeriod);
      const updatedGrades = { ...gradesRef.current };
      const batchUpdates = {};

      students.forEach((std) => {
        const absencesCount = absences.get(std.id) || 0;
        const presentDays = Math.max(0, atMax - absencesCount);
        const studentScores = { ...(updatedGrades[std.id] || {}), at: presentDays };
        updatedGrades[std.id] = studentScores;
        batchUpdates[std.id] = { at: presentDays };
      });

      await api.batchUpdateScores(sectionId, term, batchUpdates);
      gradesRef.current = updatedGrades;
      setGrades(updatedGrades);
      toast.success("Attendance present-day values synced for this term.");
    } catch (err) {
      console.error("Failed to sync attendance:", err);
      toast.error(err.message || "Failed to sync attendance.");
    }

  }, [config, students, attendancePeriod, sectionId, term, toast]);

  const saveConfigToServer = useCallback(async (configToSave, version) => {
    setConfigSaveStatus("saving");
    const request = configSaveQueueRef.current
      .catch(() => {})
      .then(() => api.saveGradeConfig(sectionId, term, configToSave));
    configSaveQueueRef.current = request;

    try {
      await request;
      if (configSaveVersionRef.current === version) {
        setConfigSaveStatus("saved");
        setConfigSaveError(null);
      }
    } catch (err) {
      if (configSaveVersionRef.current === version) {
        const message = err.message || "Failed to save grading configuration.";
        setConfigSaveStatus("error");
        setConfigSaveError(message);
        toast.error(message);
      }
    }
  }, [sectionId, term, toast]);

  // Save configuration changes (max items, weights, transmutation) with debouncing
  const updateConfig = useCallback(
    (newConfig, immediate = false) => {
      setConfig(newConfig);
      latestConfigRef.current = newConfig;
      const version = configSaveVersionRef.current + 1;
      configSaveVersionRef.current = version;
      setConfigSaveStatus("pending");
      setConfigSaveError(null);

      if (saveConfigTimeoutRef.current) {
        clearTimeout(saveConfigTimeoutRef.current);
        saveConfigTimeoutRef.current = null;
      }

      if (immediate) {
        saveConfigToServer(newConfig, version);
      } else {
        saveConfigTimeoutRef.current = setTimeout(() => {
          saveConfigTimeoutRef.current = null;
          saveConfigToServer(newConfig, version);
        }, 400);
      }
    },
    [saveConfigToServer]
  );

  const retryConfigSave = useCallback(() => {
    if (saveConfigTimeoutRef.current) {
      clearTimeout(saveConfigTimeoutRef.current);
      saveConfigTimeoutRef.current = null;
    }
    saveConfigToServer(latestConfigRef.current, configSaveVersionRef.current);
  }, [saveConfigToServer]);

  useEffect(() => () => {
    if (!saveConfigTimeoutRef.current) return;
    clearTimeout(saveConfigTimeoutRef.current);
    saveConfigTimeoutRef.current = null;
    configSaveQueueRef.current = configSaveQueueRef.current
      .catch(() => {})
      .then(() => api.saveGradeConfig(sectionId, term, latestConfigRef.current))
      .catch((err) => {
        console.error("Failed to flush grading configuration on exit:", err);
      });
  }, [sectionId, term]);

  // Dedicated handlers to safely update individual column max points (allows zero and empty strings)
  const parseInputVal = (v) => (v === "" ? "" : !isNaN(Number(v)) ? Math.max(0, Number(v)) : 0);

  const updatePeMax = useCallback(
    (maxVal) => {
      if (!config) return;
      const val = parseInputVal(maxVal);
      const updated = {
        ...config,
        pe_max: val,
      };
      updateConfig(updated, false);
    },
    [config, updateConfig]
  );

  const updateMeMax = useCallback(
    (maxVal) => {
      if (!config) return;
      const val = parseInputVal(maxVal);
      const updated = {
        ...config,
        me_max: val,
      };
      updateConfig(updated, false);
    },
    [config, updateConfig]
  );

  const updateQuizItemMax = useCallback(
    (quizId, maxVal) => {
      if (!config) return;
      const val = parseInputVal(maxVal);
      const currentItems = config.quiz_items || [];
      const updatedItems = currentItems.map((q) =>
        q.id === quizId ? { ...q, max: val } : q
      );
      const updated = { ...config, quiz_items: updatedItems };
      updateConfig(updated, false);
    },
    [config, updateConfig]
  );

  const updateRtMax = useCallback(
    (maxVal) => {
      if (!config) return;
      const val = parseInputVal(maxVal);
      const updated = { ...config, rt_max: val };
      updateConfig(updated, false);
    },
    [config, updateConfig]
  );

  const updateAtMax = useCallback(
    (maxVal) => {
      if (!config) return;
      const val = parseInputVal(maxVal);
      const updated = { ...config, at_max: val };
      updateConfig(updated, false);
    },
    [config, updateConfig]
  );

  // Add a new quiz item column
  const addQuizItem = useCallback(
    async (name, max = 50) => {
      if (!config) return;
      const currentItems = config.quiz_items || [];
      const id = `Q_${Date.now()}`;
      const newItems = [...currentItems, { id, name: name || `Quiz ${currentItems.length + 1}`, max: Number(max) || 50 }];
      const updatedConfig = { ...config, quiz_items: newItems };
      updateConfig(updatedConfig, true);
    },
    [config, updateConfig]
  );

  // Remove a quiz item column
  const removeQuizItem = useCallback(
    async (id) => {
      if (!config) return;
      const currentItems = config.quiz_items || [];
      const newItems = currentItems.filter((q) => q.id !== id);
      const updatedConfig = { ...config, quiz_items: newItems };
      updateConfig(updatedConfig, true);
    },
    [config, updateConfig]
  );

  // Add student directly (syncs with section students)
  const addStudent = useCallback(
    async (name) => {
      if (!sectionId || !name?.trim()) return;
      const newStudent = await api.addStudent(sectionId, name.trim());
      setStudents((prev) => {
        const updated = [...prev, newStudent];
        updated.sort((a, b) => a.name.localeCompare(b.name));
        return updated;
      });
      return newStudent;
    },
    [sectionId]
  );

  // Batch add students (bulk paste / csv)
  const batchAddStudents = useCallback(
    async (names) => {
      if (!sectionId || !Array.isArray(names) || names.length === 0) return;
      const result = await api.batchAddStudents(sectionId, names);
      setStudents((prev) =>
        [...prev, ...(result.students || [])].sort((a, b) =>
          a.name.localeCompare(b.name)
        )
      );
    },
    [sectionId]
  );

  // Reset all grades for this term
  const resetTermGrades = useCallback(async () => {
    if (!sectionId) return;
    await api.resetGrades(sectionId, term);
    setGrades({});
    gradesRef.current = {};
  }, [sectionId, term]);

  // Compute all row calculations strictly following the clamped Excel engine
  const computedRows = useMemo(() => {
    if (!config) return [];
    return students.map((student) => {
      const studentScores = grades[student.id] || {};
      return computeStudentGradeRow(student, studentScores, config);
    });
  }, [students, grades, config]);

  // Overall class statistics
  const stats = useMemo(() => {
    const validGrades = computedRows
      .map((r) => r.finalGrade)
      .filter((g) => typeof g === "number" && !isNaN(g));

    if (validGrades.length === 0) {
      return {
        count: computedRows.length,
        average: 0,
        highest: 0,
        lowest: 0,
        passedCount: 0,
        failedCount: 0,
        passingRate: 0,
      };
    }

    const sum = validGrades.reduce((a, b) => a + b, 0);
    const avg = Number((sum / validGrades.length).toFixed(2));
    const highest = Math.max(...validGrades);
    const lowest = Math.min(...validGrades);
    const passedCount = validGrades.filter((g) => g >= 75.0).length;
    const failedCount = validGrades.length - passedCount;
    const passingRate = Number(((passedCount / validGrades.length) * 100).toFixed(1));

    return {
      count: computedRows.length,
      average: avg,
      highest,
      lowest,
      passedCount,
      failedCount,
      passingRate,
    };
  }, [computedRows]);

  // Semestral rows are calculated from both term sheets; saved semestral overrides are ignored.
  const semestralRows = useMemo(() => {
    if (!students.length) return [];
    const sorted = [...students].sort((a, b) => a.name.localeCompare(b.name));

    const mConfig = term === "midterm" ? config : (midtermOverview.config || config);
    const mGrades = term === "midterm" ? grades : midtermOverview.grades;

    const fConfig = term === "finals" ? config : (finalsOverview.config || config);
    const fGrades = term === "finals" ? grades : finalsOverview.grades;

    return sorted.map((student) => {
      const semScore = semestralScores[student.id] || {};
      const parsed = parseStudentNameAndMI(student.name, semScore.mi);

      const mRow = mConfig ? computeStudentGradeRow(student, mGrades[student.id] || {}, mConfig) : null;
      const fRow = fConfig ? computeStudentGradeRow(student, fGrades[student.id] || {}, fConfig) : null;

      const midtermGrade = typeof mRow?.finalGrade === "number" ? mRow.finalGrade : "";
      const finalGrade = typeof fRow?.finalGrade === "number" ? fRow.finalGrade : "";
      const termRemark = [mRow?.remarks, fRow?.remarks].find((remark) => remark === "AW" || remark === "UW");
      const semGrade = termRemark ? "" : calculateSemestralGrade(midtermGrade, finalGrade);
      const equivGrade = getEquivGrade(semGrade);

      const remarks = termRemark || (equivGrade === "5.00" ? "Failed" : semGrade !== "" ? "Passed" : "");

      return {
        studentId: student.id,
        rawName: student.name,
        name: parsed.name,
        mi: semScore.mi !== undefined && semScore.mi !== null ? semScore.mi : parsed.mi,
        midtermGrade,
        finalGrade,
        semGrade,
        equivGrade,
        remarks,
      };
    });
  }, [students, term, config, grades, midtermOverview, finalsOverview, semestralScores]);

  return {
    students,
    config,
    grades,
    loading,
    saving,
    error,
    saveError,
    configSaveStatus,
    configSaveError,
    computedRows,
    semestralRows,
    stats,
    updateScore,
    updateQuizScore,
    updateConfig,
    retryFailedSaves,
    retryConfigSave,
    updatePeMax,
    updateMeMax,
    updateQuizItemMax,
    updateRtMax,
    updateAtMax,
    addQuizItem,
    removeQuizItem,
    addStudent,
    batchAddStudents,
    resetTermGrades,
    syncAttendanceFromTracker,
    refreshData: fetchGradeData,
  };
};

export default useGrades;
