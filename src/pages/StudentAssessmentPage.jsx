import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  Clock,
  ShieldAlert,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Bookmark,
  Send,
  BookOpen,
  Code2,
} from "lucide-react";
import clsx from "clsx";
import api from "../lib/api";
import CodingEditor from "../components/assessment/CodingEditor";
import DropdownSelect from "../components/DropdownSelect";

const getAttemptStorageKey = (assessmentId, studentId, studentName) => {
  const identity = studentId || studentName.trim().toLowerCase();
  return `assessment-attempt:${assessmentId}:${encodeURIComponent(identity)}`;
};

export default function StudentAssessmentPage({ accessCode, onExit }) {
  const [loading, setLoading] = useState(true);
  const [assessment, setAssessment] = useState(null);
  const [error, setError] = useState("");

  // Student info state
  const [step, setStep] = useState("welcome"); // 'welcome' | 'taking' | 'submitted'
  const [studentId, setStudentId] = useState("");
  const [studentName, setStudentName] = useState("");

  // Test state
  const [answers, setAnswers] = useState({});
  const [flagged, setFlagged] = useState({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [secondsRemaining, setSecondsRemaining] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submissionResult, setSubmissionResult] = useState(null);
  const [startingAttempt, setStartingAttempt] = useState(false);
  const [attemptId, setAttemptId] = useState("");
  const [attemptToken, setAttemptToken] = useState("");
  const [attemptStorageKey, setAttemptStorageKey] = useState("");
  const [saveState, setSaveState] = useState("idle");
  const [storageWarning, setStorageWarning] = useState(false);

  // Security / Anti-cheat monitors
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const [showCheatWarning, setShowCheatWarning] = useState(false);
  const [integrityLogs, setIntegrityLogs] = useState([]);

  const lastFocusLossAtRef = useRef(0);
  const saveInFlightRef = useRef(false);
  const autoSubmitTriggeredRef = useRef(false);
  const questions = useMemo(() => assessment?.questions || [], [assessment?.questions]);

  // Fetch assessment metadata
  useEffect(() => {
    if (!accessCode) return;

    const loadAssessment = async () => {
      setLoading(true);
      try {
        const data = await api.getPublicAssessment(accessCode);
        setAssessment(data);
        if (data.time_limit_minutes > 0) {
          setSecondsRemaining(data.time_limit_minutes * 60);
        }

        // Auto-detect aligned student parameter from URL (?student=ID or ?name=NAME)
        if (typeof window !== "undefined") {
          const params = new URLSearchParams(window.location.search);
          const paramStudentId = params.get("student") || params.get("studentId");
          const paramStudentName = params.get("name") || params.get("studentName");

          if (paramStudentId && Array.isArray(data.students)) {
            const matched = data.students.find(
              (s) => String(s.id) === String(paramStudentId),
            );
            if (matched) {
              setStudentId(String(matched.id));
              setStudentName(matched.name);
            }
          } else if (paramStudentName) {
            const cleanName = decodeURIComponent(paramStudentName).trim();
            const matched = (data.students || []).find(
              (s) => (s.name || "").trim().toLowerCase() === cleanName.toLowerCase(),
            );
            if (matched) {
              setStudentId(String(matched.id));
              setStudentName(matched.name);
            } else {
              setStudentName(cleanName);
            }
          }
        }
      } catch (err) {
        setError(err.message || "Failed to load assessment.");
      } finally {
        setLoading(false);
      }
    };

    loadAssessment();
  }, [accessCode]);

  // Anti-cheat: tab switch detection & window blur
  useEffect(() => {
    if (step !== "taking" || !assessment?.anti_cheat_monitoring) return;

    const recordFocusLoss = (event) => {
      const now = Date.now();
      if (now - lastFocusLossAtRef.current < 1000) return;
      lastFocusLossAtRef.current = now;

      setTabSwitchCount((prev) => prev + 1);
      setIntegrityLogs((logs) => [
        ...logs,
        { event, timestamp: new Date(now).toISOString() },
      ]);
      setShowCheatWarning(true);
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        recordFocusLoss("tab_switch");
      }
    };

    const handleWindowBlur = () => {
      // Don't trigger if student clicked inside iframe
      if (document.activeElement?.tagName === "IFRAME") return;
      recordFocusLoss("window_blur");
    };

    const handleContextMenu = (e) => {
      // Allow context menu only inside code textarea
      if (e.target.tagName !== "TEXTAREA") {
        e.preventDefault();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleWindowBlur);
    document.addEventListener("contextmenu", handleContextMenu);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleWindowBlur);
      document.removeEventListener("contextmenu", handleContextMenu);
    };
  }, [step, assessment?.anti_cheat_monitoring]);

  const handleFinalSubmit = useCallback(async (autoSubmit = false) => {
    if (submitting || !attemptId || !attemptToken) return;

    const unansweredCount = (assessment?.questions || []).filter(
      (q, idx) => {
        const id = q.id || `q_${idx + 1}`;
        const val = answers[id];
        if (val === undefined || val === null || val === "") return true;
        if (typeof val === "object" && (!val.code || val.code.trim() === "")) return true;
        return false;
      },
    ).length;

    if (unansweredCount > 0 && !autoSubmit) {
      const confirm = window.confirm(
        `You have ${unansweredCount} unanswered item(s). Are you sure you want to finish and submit?`,
      );
      if (!confirm) return;
    }

    setSubmitting(true);
    try {
      const payload = {
        attempt_token: attemptToken,
        answers,
        tab_switch_count: tabSwitchCount,
        integrity_log: integrityLogs,
      };

      const result = await api.submitPublicAssessmentAttempt(accessCode, attemptId, payload);
      setSubmissionResult(result);
      setStep("submitted");
      if (attemptStorageKey && typeof window !== "undefined") {
        try {
          window.sessionStorage.removeItem(attemptStorageKey);
        } catch {
          setStorageWarning(true);
        }
      }
    } catch (err) {
      alert(err.message || "Failed to submit assessment. Please check your connection.");
    } finally {
      setSubmitting(false);
    }
  }, [submitting, attemptId, attemptToken, assessment?.questions, answers, tabSwitchCount, integrityLogs, accessCode, attemptStorageKey]);

  // Timer countdown loop
  useEffect(() => {
    if (step !== "taking" || secondsRemaining === null) return;

    if (secondsRemaining <= 0) {
      if (!autoSubmitTriggeredRef.current) {
        autoSubmitTriggeredRef.current = true;
        handleFinalSubmit(true);
      }
      return;
    }

    const timer = setInterval(() => {
      setSecondsRemaining((prev) => (prev !== null && prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
  }, [step, secondsRemaining, handleFinalSubmit]);

  const handleStartExam = async () => {
    if (!studentName.trim()) {
      setError("Please select or enter your name to proceed.");
      return;
    }
    setError("");
    setStartingAttempt(true);
    try {
      const storageKey = getAttemptStorageKey(assessment.id, studentId, studentName);
      let savedToken = null;
      let browserStorageAvailable = typeof window !== "undefined";
      if (browserStorageAvailable) {
        try {
          savedToken = window.sessionStorage.getItem(storageKey);
        } catch {
          browserStorageAvailable = false;
        }
      }
      const attempt = await api.startPublicAssessmentAttempt(accessCode, {
        student_id: studentId || null,
        student_name: studentName.trim(),
        attempt_token: savedToken,
      });

      if (browserStorageAvailable) {
        try {
          window.sessionStorage.setItem(storageKey, attempt.attempt_token);
        } catch {
          browserStorageAvailable = false;
        }
      }
      setStorageWarning(!browserStorageAvailable);
      setAttemptStorageKey(storageKey);
      setAttemptId(attempt.attempt_id);
      setAttemptToken(attempt.attempt_token);
      autoSubmitTriggeredRef.current = false;
      setAnswers(attempt.answers || {});
      setFlagged(attempt.progress?.flagged || {});
      const savedQuestionIndex = attempt.progress?.currentQuestionId
        ? questions.findIndex((question, index) =>
          (question.id || `q_${index + 1}`) === attempt.progress.currentQuestionId,
        )
        : -1;
      const savedIndex = Number.parseInt(attempt.progress?.currentIndex, 10) || 0;
      setCurrentIndex(savedQuestionIndex >= 0
        ? savedQuestionIndex
        : Math.max(0, Math.min(questions.length - 1, savedIndex)));
      setTabSwitchCount(attempt.tab_switch_count || 0);
      setIntegrityLogs(attempt.integrity_log || []);
      if (attempt.expires_at) {
        const remaining = Math.ceil(
          (Date.parse(attempt.expires_at) - Date.parse(attempt.server_time)) / 1000,
        );
        setSecondsRemaining(Math.max(0, remaining));
      } else {
        setSecondsRemaining(null);
      }
      setSaveState(attempt.saved_at ? "saved" : "idle");
      setStep("taking");
    } catch (err) {
      setError(err.message || "Could not start or resume this assessment.");
    } finally {
      setStartingAttempt(false);
    }
  };

  useEffect(() => {
    if (step !== "taking" || !attemptId || !attemptToken || submitting) return;

    let active = true;
    const saveProgress = async () => {
      if (saveInFlightRef.current) return;
      saveInFlightRef.current = true;
      setSaveState("saving");
      try {
        await api.savePublicAssessmentAttempt(accessCode, attemptId, {
          attempt_token: attemptToken,
          answers,
          progress: {
            currentIndex,
            currentQuestionId: questions[currentIndex]?.id || `q_${currentIndex + 1}`,
            flagged,
          },
          tab_switch_count: tabSwitchCount,
          integrity_log: integrityLogs,
        });
        if (active) setSaveState("saved");
      } catch (err) {
        if (active) setSaveState(err.status === 410 ? "expired" : "error");
      } finally {
        saveInFlightRef.current = false;
      }
    };

    const saveTimer = setTimeout(saveProgress, 500);
    const saveInterval = setInterval(saveProgress, 15000);
    return () => {
      active = false;
      clearTimeout(saveTimer);
      clearInterval(saveInterval);
    };
  }, [
    step,
    attemptId,
    attemptToken,
    submitting,
    accessCode,
    answers,
    questions,
    currentIndex,
    flagged,
    tabSwitchCount,
    integrityLogs,
  ]);

  const handleSelectAnswer = (questionId, value) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: value,
    }));
  };

  const toggleFlag = (questionId) => {
    setFlagged((prev) => ({
      ...prev,
      [questionId]: !prev[questionId],
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-violet-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error && !assessment) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-850 rounded-2xl p-6 text-center space-y-4 border border-slate-800">
          <div className="w-12 h-12 rounded-xl bg-rose-950 text-rose-500 flex items-center justify-center mx-auto">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h2 className="text-base font-bold text-slate-100">Assessment Unavailable</h2>
          <p className="text-xs text-slate-400">{error}</p>
          {onExit && (
            <button
              type="button"
              onClick={onExit}
              className="px-4 py-2 rounded-xl bg-slate-800 text-xs font-semibold text-slate-200 hover:bg-slate-700"
            >
              Return to Portal
            </button>
          )}
        </div>
      </div>
    );
  }

  const currentQ = questions[currentIndex];
  const qId = currentQ?.id || `q_${currentIndex + 1}`;
  const isFlagged = Boolean(flagged[qId]);
  const isCoding = currentQ?.type === "coding";

  const answeredCount = Object.keys(answers).filter((k) => {
    const val = answers[k];
    if (val === undefined || val === null || val === "") return false;
    if (typeof val === "object" && (!val.code || val.code.trim() === "")) return false;
    return true;
  }).length;
  const totalPoints = questions.reduce(
    (sum, question) => sum + (parseFloat(question.points) || 1),
    0,
  );
  const completionPercentage = questions.length
    ? Math.round((answeredCount / questions.length) * 100)
    : 0;
  const flaggedCount = Object.values(flagged).filter(Boolean).length;

  const formatTimer = (seconds) => {
    if (seconds === null) return "--:--";
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans select-none">
      {/* Anti-cheat warning dialog */}
      {showCheatWarning && (
        <div className="fixed inset-0 z-100 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 rounded-2xl p-6 max-w-md w-full border border-rose-800 text-center space-y-4 animate-in zoom-in-95">
            <div className="w-12 h-12 rounded-xl bg-rose-950 text-rose-500 flex items-center justify-center mx-auto">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-rose-400">
              Focus Change Recorded
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              The browser reported a focus change ({tabSwitchCount} event{tabSwitchCount > 1 ? "s" : ""}). It is recorded for teacher review, but can have ordinary causes and is not proof of misconduct. Keep this page active where possible.
            </p>
            <button
              type="button"
              onClick={() => setShowCheatWarning(false)}
              className="w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs cursor-pointer"
            >
              Continue Assessment
            </button>
          </div>
        </div>
      )}

      {/* STEP 1: WELCOME & STUDENT IDENTIFICATION */}
      {step === "welcome" && (
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="max-w-lg w-full bg-slate-850 rounded-3xl shadow-2xl border border-slate-800 p-6 sm:p-8 space-y-6">
            <div className="text-center space-y-1.5">
              <div className="w-12 h-12 rounded-2xl bg-violet-600 text-white flex items-center justify-center mx-auto shadow-xs">
                <BookOpen className="w-6 h-6" />
              </div>
              <h1 className="text-lg sm:text-xl font-black text-slate-100">
                {assessment.title}
              </h1>
              <p className="text-xs font-semibold text-slate-400">
                {assessment.subject ? `${assessment.subject} • ` : ""}Section {assessment.section_id}
              </p>
              {assessment.description && (
                <p className="pt-2 text-xs leading-relaxed text-slate-300">
                  {assessment.description}
                </p>
              )}
            </div>

            {/* Assessment info chips */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 bg-slate-900 rounded-2xl border border-slate-800 text-center text-xs">
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-bold block">Questions</span>
                <span className="font-bold text-slate-200">{questions.length} items</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-bold block">Total Points</span>
                <span className="font-bold text-slate-200">{totalPoints}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-bold block">Time Limit</span>
                <span className="font-bold text-slate-200">
                  {assessment.time_limit_minutes > 0 ? `${assessment.time_limit_minutes} mins` : "Unlimited"}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-bold block">Passing Grade</span>
                <span className="font-bold text-violet-400">{assessment.passing_percentage}%</span>
              </div>
            </div>

            {/* Instructions */}
            {assessment.general_instructions && (
              <div className="p-3 bg-violet-950/30 border border-violet-900/60 rounded-xl text-xs space-y-1">
                <span className="font-bold text-violet-300">Instructions:</span>
                <p className="text-violet-200 leading-relaxed text-[11px]">
                  {assessment.general_instructions}
                </p>
              </div>
            )}

            {/* Anti-cheat banner */}
            {assessment.anti_cheat_monitoring && (
              <div className="p-3 bg-amber-950/20 border border-amber-900/40 rounded-xl text-xs flex items-start gap-2 text-amber-300">
                <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-amber-500" />
                <p className="text-[11px] leading-relaxed">
                  <strong>Focus-change monitoring is active:</strong> Switching tabs or leaving this window may be recorded for teacher review. These browser signals are not proof of misconduct.
                </p>
              </div>
            )}

            {/* Student Name Selection */}
            <div className="space-y-2">
              <label htmlFor="assessment-student" className="text-xs font-bold text-slate-300 block">
                Student Identification:
              </label>

              {studentName && studentId ? (
                <div className="p-3.5 rounded-2xl bg-violet-950/40 border border-violet-800/80 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-violet-600 text-white flex items-center justify-center font-bold">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[10px] text-violet-300 uppercase font-bold tracking-wider block">
                        Student Link Selected
                      </span>
                      <span className="text-sm font-black text-slate-100">
                        {studentName}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setStudentId("");
                      setStudentName("");
                    }}
                    className="text-[11px] text-violet-400 hover:text-violet-200 underline cursor-pointer"
                  >
                    Change Name
                  </button>
                </div>
              ) : assessment.students && assessment.students.length > 0 ? (
                <DropdownSelect
                  id="assessment-student"
                  value={studentId}
                  onChange={(e) => {
                    const id = e.target.value;
                    setStudentId(id);
                    const s = assessment.students.find((item) => String(item.id) === String(id));
                    if (s) setStudentName(s.name);
                  }}
                  className="w-full pl-2.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-700 bg-slate-900 text-slate-100 outline-none font-semibold focus:ring-2 focus:ring-violet-500 cursor-pointer"
                >
                  <option value="">-- Choose your name from Section {assessment.section_id} --</option>
                  {assessment.students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </DropdownSelect>
              ) : (
                <input
                  id="assessment-student"
                  type="text"
                  placeholder="Enter your full name (Last Name, First Name)..."
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  className="w-full p-2.5 text-xs sm:text-sm rounded-xl border border-slate-700 bg-slate-900 text-slate-100 outline-none focus:ring-2 focus:ring-violet-500"
                />
              )}
            </div>

            {error && (
              <p className="text-xs text-rose-400 font-semibold text-center">{error}</p>
            )}

            <p className="text-[11px] leading-relaxed text-slate-500 text-center">
              Answers save automatically. To resume after refreshing, return in the same browser tab and select the same student.
            </p>

            <button
              type="button"
              disabled={startingAttempt}
              onClick={handleStartExam}
              className="w-full py-3 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white font-bold text-xs sm:text-sm shadow-md cursor-pointer transition-colors flex items-center justify-center gap-2"
            >
              <span>{startingAttempt ? "Starting..." : "Begin / Resume Assessment"}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: TAKING THE ASSESSMENT */}
      {step === "taking" && currentQ && (
        <div className="flex-1 flex flex-col h-screen overflow-hidden">
          {/* Top Proctoring Bar */}
          <header className="min-h-14 px-3 sm:px-6 py-2 border-b border-slate-800 bg-slate-950 flex items-center justify-between gap-2 shrink-0 z-20">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <span className="font-bold text-xs sm:text-sm text-slate-100 truncate max-w-[150px] sm:max-w-[220px]">
                {assessment.title}
              </span>
              <span className="text-xs text-slate-600 hidden sm:inline">•</span>
              <span className="text-xs text-slate-400 font-medium hidden sm:inline truncate max-w-[180px]">
                {studentName}
              </span>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
              {/* Countdown timer */}
              {secondsRemaining !== null && (
                <div
                  role="timer"
                  aria-label={`Time remaining: ${formatTimer(secondsRemaining)}`}
                  className={clsx(
                    "flex items-center gap-1.5 px-2 sm:px-3 py-1 rounded-xl font-mono text-xs font-bold border transition-colors",
                    secondsRemaining < 60
                      ? "bg-rose-950/80 text-rose-400 border-rose-800 animate-pulse"
                      : secondsRemaining < 300
                      ? "bg-amber-950/80 text-amber-400 border-amber-800"
                      : "bg-slate-900 text-slate-300 border-slate-800",
                  )}
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>{formatTimer(secondsRemaining)}</span>
                </div>
              )}

              {/* Submit button */}
              <button
                type="button"
                disabled={submitting}
                onClick={() => handleFinalSubmit()}
                className="px-2.5 sm:px-3.5 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors"
              >
                <Send className="w-3.5 h-3.5" />
                <span className="sm:hidden">{submitting ? "Sending" : "Submit"}</span>
                <span className="hidden sm:inline">{submitting ? "Submitting..." : "Submit Assessment"}</span>
              </button>
            </div>
          </header>

          <div className="px-4 sm:px-6 py-2 bg-slate-950 border-b border-slate-800 shrink-0">
            <div className="flex items-center justify-between gap-3 text-[11px] text-slate-400 mb-1.5">
              <span>{answeredCount} of {questions.length} answered</span>
              <div className="flex items-center gap-3">
                <span>{flaggedCount} flagged</span>
                <span
                  role="status"
                  className={saveState === "error" ? "text-rose-400" : saveState === "expired" ? "text-amber-400" : "text-slate-400"}
                >
                  {saveState === "saving"
                    ? "Saving…"
                    : saveState === "saved"
                    ? "Saved"
                    : saveState === "error"
                    ? "Save failed — retrying"
                    : saveState === "expired"
                    ? "Time expired — submit to finish"
                    : ""}
                </span>
              </div>
            </div>
            <div
              role="progressbar"
              aria-label="Assessment completion"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={completionPercentage}
              className="h-1.5 rounded-full bg-slate-800 overflow-hidden"
            >
              <div
                className="h-full rounded-full bg-violet-500 transition-[width]"
                style={{ width: `${completionPercentage}%` }}
              />
            </div>
            {storageWarning && (
              <p className="mt-1 text-[10px] text-amber-400">
                Browser session storage is unavailable. Keep this tab open to retain your resume token.
              </p>
            )}
          </div>

          {/* Main Question Interface */}
          <div className="flex-1 overflow-y-auto p-3 sm:p-5">
            {secondsRemaining !== null && secondsRemaining > 0 && secondsRemaining < 60 && (
              <div role="alert" className="max-w-5xl mx-auto mb-3 px-3 py-2 rounded-xl border border-rose-800 bg-rose-950/70 text-rose-300 text-xs font-semibold">
                Less than one minute remains. Review your answers and submit when ready.
              </div>
            )}
            <div
              className={clsx(
                "mx-auto w-full grid gap-4 items-start",
                isCoding ? "max-w-[1600px] lg:grid-cols-12" : "max-w-5xl md:grid-cols-12",
              )}
            >
              {/* Question Card */}
              <div
                className={clsx(
                  "bg-slate-850 rounded-2xl p-5 sm:p-6 border border-slate-800 shadow-md space-y-4",
                  isCoding ? "lg:col-span-9" : "md:col-span-8",
                )}
              >
                {/* Meta Row */}
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-violet-950 text-violet-300 font-bold text-xs border border-violet-800">
                      Question {currentIndex + 1} of {questions.length}
                    </span>
                    <span className="text-xs text-slate-400 font-medium">
                      ({currentQ.points || 1} pt{currentQ.points > 1 ? "s" : ""})
                    </span>
                    {isCoding && (
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-violet-400 font-mono text-[11px] font-bold">
                        {currentQ.language?.toUpperCase() || "CODE"}
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => toggleFlag(qId)}
                    aria-pressed={isFlagged}
                    className={clsx(
                      "flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg transition-colors cursor-pointer",
                      isFlagged
                        ? "bg-amber-950 text-amber-300 border border-amber-800"
                        : "text-slate-400 hover:text-slate-200 hover:bg-slate-800",
                    )}
                  >
                    <Bookmark className="w-3.5 h-3.5" />
                    <span>{isFlagged ? "Flagged" : "Flag"}</span>
                  </button>
                </div>

                {/* Prompt */}
                <div className="text-sm font-medium text-slate-100 leading-relaxed font-sans">
                  {currentQ.question}
                </div>

                {/* Answers Input by Type */}
                <div className="pt-1">
                  {/* 1. CODING / PROGRAMMING */}
                  {currentQ.type === "coding" && (
                    <div className="space-y-2">
                      <CodingEditor
                        value={
                          answers[qId] !== undefined
                            ? typeof answers[qId] === "object"
                              ? answers[qId].code
                              : answers[qId]
                            : currentQ.starter_code || ""
                        }
                        onChange={(code) => {
                          const prevObj = typeof answers[qId] === "object" ? answers[qId] : {};
                          handleSelectAnswer(qId, { ...prevObj, code });
                        }}
                        language={currentQ.language || "web"}
                        starterCode={currentQ.starter_code || ""}
                        executionMode={currentQ.execution_mode || "web_preview"}
                        testCases={currentQ.test_cases || []}
                        onTestResultsChange={(results) => {
                          const currentCode =
                            typeof answers[qId] === "object"
                              ? answers[qId].code
                              : answers[qId] || currentQ.starter_code || "";
                          handleSelectAnswer(qId, { code: currentCode, testResults: results });
                        }}
                        minHeight="360px"
                        showControls={true}
                      />
                    </div>
                  )}

                  {/* 2. Multiple Choice */}
                  {currentQ.type === "multiple_choice" && currentQ.options && (
                    <div className="space-y-2">
                      {currentQ.options.map((opt, optIdx) => {
                        const letter = String.fromCharCode(65 + optIdx);
                        const isSelected = answers[qId] === opt;
                        return (
                          <button
                            key={optIdx}
                            type="button"
                            onClick={() => handleSelectAnswer(qId, opt)}
                            aria-pressed={isSelected}
                            className={clsx(
                              "w-full p-3 rounded-xl border text-left flex items-center gap-3 transition-all cursor-pointer",
                              isSelected
                                ? "border-violet-500 bg-violet-950/40 text-violet-200 shadow-xs"
                                : "border-slate-800 hover:border-slate-700 hover:bg-slate-800/60 text-slate-300",
                            )}
                          >
                            <span
                              className={clsx(
                                "w-6 h-6 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 transition-colors",
                                isSelected ? "bg-violet-600 text-white" : "bg-slate-800 text-slate-400",
                              )}
                            >
                              {letter}
                            </span>
                            <span className="text-xs sm:text-sm font-medium">{opt}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* 3. True or False */}
                  {currentQ.type === "true_false" && (
                    <div className="grid grid-cols-2 gap-3">
                      {["True", "False"].map((choice) => {
                        const isSelected = answers[qId] === choice;
                        return (
                          <button
                            key={choice}
                            type="button"
                            onClick={() => handleSelectAnswer(qId, choice)}
                            aria-pressed={isSelected}
                            className={clsx(
                              "py-3.5 rounded-xl border font-bold text-xs sm:text-sm text-center transition-all cursor-pointer",
                              isSelected
                                ? "border-violet-500 bg-violet-950/40 text-violet-300 shadow-xs"
                                : "border-slate-800 hover:border-slate-700 bg-slate-900 text-slate-300",
                            )}
                          >
                            {choice}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* 4. Identification */}
                  {currentQ.type === "identification" && (
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-400">
                        Type your answer below:
                      </label>
                      <input
                        type="text"
                        placeholder="Your answer..."
                        value={answers[qId] || ""}
                        onChange={(e) => handleSelectAnswer(qId, e.target.value)}
                        className="w-full p-2.5 rounded-xl border border-slate-700 bg-slate-900 text-slate-100 text-base sm:text-sm font-medium outline-none focus:ring-2 focus:ring-violet-500"
                      />
                    </div>
                  )}

                  {/* 5. Essay */}
                  {currentQ.type === "essay" && (
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-400">
                        Compose your response:
                      </label>
                      <textarea
                        rows={5}
                        placeholder="Write your explanation or essay here..."
                        value={answers[qId] || ""}
                        onChange={(e) => handleSelectAnswer(qId, e.target.value)}
                        className="w-full p-2.5 rounded-xl border border-slate-700 bg-slate-900 text-slate-100 text-base sm:text-sm outline-none focus:ring-2 focus:ring-violet-500 leading-relaxed font-sans"
                      />
                    </div>
                  )}
                </div>

                {/* Navigation Row */}
                <div className="flex items-center justify-between pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    disabled={currentIndex === 0}
                    onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
                    className="px-3.5 py-1.5 rounded-xl border border-slate-700 text-xs font-bold text-slate-300 disabled:opacity-20 cursor-pointer flex items-center gap-1.5"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" /> Previous
                  </button>

                  <button
                    type="button"
                    disabled={currentIndex === questions.length - 1}
                    onClick={() => setCurrentIndex((prev) => Math.min(questions.length - 1, prev + 1))}
                    className="px-4 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold disabled:opacity-20 cursor-pointer flex items-center gap-1.5"
                  >
                    <span>Next</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Navigator Palette */}
              <div
                className={clsx(
                  "bg-slate-850 rounded-2xl p-4 border border-slate-800 shadow-md space-y-3",
                  isCoding ? "lg:col-span-3" : "md:col-span-4",
                )}
              >
                <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                  <span className="text-xs font-bold text-slate-200">
                    Question Navigator
                  </span>
                  <span className="text-xs font-bold text-emerald-400">
                    {answeredCount} / {questions.length} Done
                  </span>
                </div>

                {/* Grid */}
                <div className="grid grid-cols-5 gap-1.5 max-h-60 overflow-y-auto p-0.5">
                  {questions.map((q, idx) => {
                    const currId = q.id || `q_${idx + 1}`;
                    const val = answers[currId];
                    const hasAns =
                      val !== undefined &&
                      val !== null &&
                      val !== "" &&
                      (typeof val !== "object" || (val.code && val.code.trim() !== ""));
                    const isCurrent = idx === currentIndex;
                    const isFlag = Boolean(flagged[currId]);

                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setCurrentIndex(idx)}
                        aria-label={`Question ${idx + 1}${hasAns ? ", answered" : ", unanswered"}${isFlag ? ", flagged" : ""}`}
                        aria-current={isCurrent ? "step" : undefined}
                        className={clsx(
                          "w-full min-h-10 min-w-10 rounded-lg text-xs font-bold flex items-center justify-center cursor-pointer transition-all relative",
                          isCurrent ? "ring-2 ring-violet-500 ring-offset-2 ring-offset-slate-900" : "",
                          hasAns
                            ? "bg-violet-600 text-white shadow-2xs"
                            : "bg-slate-800 text-slate-400 hover:bg-slate-700",
                        )}
                      >
                        <span>{idx + 1}</span>
                        {isFlag && (
                          <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-amber-500 ring-1 ring-slate-900"></span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Legend */}
                <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-violet-600"></span> Answered
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-slate-800"></span> Empty
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-amber-500"></span> Flagged
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STEP 3: SUBMISSION COMPLETE SCREEN */}
      {step === "submitted" && (
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-slate-850 rounded-3xl shadow-2xl border border-slate-800 p-6 sm:p-8 text-center space-y-6 animate-in zoom-in-95">
            <div className="w-14 h-14 rounded-2xl bg-emerald-950 text-emerald-400 flex items-center justify-center mx-auto shadow-xs border border-emerald-800">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <h2 className="text-lg sm:text-xl font-black text-slate-100">
                Assessment Submitted!
              </h2>
              <p className="text-xs text-slate-400">
                Thank you, <strong>{studentName}</strong>. Your practical & exam responses have been recorded.
              </p>
            </div>

            {/* Score reveal */}
            {submissionResult?.score !== undefined ? (
              <div className="p-4 rounded-2xl bg-violet-950/40 border border-violet-900/60 space-y-2">
                <span className="text-[11px] font-bold text-violet-400 uppercase tracking-wider block">
                  Your Score
                </span>
                <div className="text-3xl font-black text-violet-300">
                  {submissionResult.score} / {submissionResult.totalPoints}
                </div>
                <div className="text-xs font-semibold text-slate-300">
                  Percentage: <strong>{submissionResult.percentage}%</strong> •{" "}
                  <span className={submissionResult.passed ? "text-emerald-400 font-bold" : "text-rose-400 font-bold"}>
                    {submissionResult.passed ? "PASSED" : "NEEDS REVIEW"}
                  </span>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 text-xs text-slate-400">
                Your practical code and answers will be reviewed and graded by your instructor.
              </div>
            )}

            <div className="text-[11px] text-slate-500 font-mono">
              Submission ID: {submissionResult?.submissionId || "Recorded"}
            </div>

            {onExit && (
              <button
                type="button"
                onClick={onExit}
                className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 cursor-pointer"
              >
                Close Portal
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
