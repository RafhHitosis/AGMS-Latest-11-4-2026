import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  X,
  ClipboardCheck,
  Shuffle,
  Award,
  CheckCircle2,
  Save,
  Clock,
  User,
  Star,
  BookOpen,
  Volume2,
  RefreshCw,
  UploadCloud,
  ChevronDown,
  Search,
  Check,
} from "lucide-react";
import clsx from "clsx";
import api from "../../lib/api";
import { useToast } from "../../context/ToastContext";

export default function RecitationStudioModal({
  isOpen,
  onClose,
  assessment,
  sectionId,
  students = [],
}) {
  const toast = useToast();
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [isStudentPickerOpen, setIsStudentPickerOpen] = useState(false);
  const [studentSearch, setStudentSearch] = useState("");
  const [isSpinning, setIsSpinning] = useState(false);
  const [currentPrompt, setCurrentPrompt] = useState("");
  const [notes, setNotes] = useState("");
  const [recitationLogs, setRecitationLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [savingRecord, setSavingRecord] = useState(false);
  const maxScore = 10;

  // Rubric criteria scores
  const [rubricContent, setRubricContent] = useState(4); // 5 max
  const [rubricDelivery, setRubricDelivery] = useState(3); // 3 max
  const [rubricConfidence, setRubricConfidence] = useState(2); // 2 max
  const studentPickerRef = useRef(null);

  const fetchLogs = useCallback(async () => {
    if (!assessment?.id) return;
    try {
      const data = await api.getRecitationLogs(sectionId, assessment.id);
      setRecitationLogs(data || []);
    } catch (err) {
      toast.error(err.message || "Failed to load recitation logs.");
    } finally {
      setLoadingLogs(false);
    }
  }, [assessment?.id, sectionId, toast]);

  useEffect(() => {
    if (isOpen) {
      fetchLogs();
      if (students.length > 0 && !selectedStudent) {
        setSelectedStudent(students[0]);
      }
    }
  }, [isOpen, fetchLogs, students, selectedStudent]);

  useEffect(() => {
    if (!isStudentPickerOpen) return undefined;

    const handlePointerDown = (event) => {
      if (!studentPickerRef.current?.contains(event.target)) {
        setIsStudentPickerOpen(false);
      }
    };
    const handleKeyDown = (event) => {
      if (event.key === "Escape") setIsStudentPickerOpen(false);
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isStudentPickerOpen]);

  if (!isOpen || !assessment) return null;

  const filteredStudents = students.filter((student) =>
    student.name.toLowerCase().includes(studentSearch.trim().toLowerCase()),
  );

  const handleRandomPick = () => {
    if (students.length === 0) return;
    setIsSpinning(true);

    let counter = 0;
    const interval = setInterval(() => {
      const randomIndex = Math.floor(Math.random() * students.length);
      setSelectedStudent(students[randomIndex]);
      counter++;

      if (counter >= 15) {
        clearInterval(interval);
        setIsSpinning(false);
      }
    }, 80);
  };

  const handleSaveRecitation = async () => {
    if (!selectedStudent) {
      toast.error("Please select a student.");
      return;
    }

    setSavingRecord(true);
    try {
      const totalRubricScore = rubricContent + rubricDelivery + rubricConfidence;
      const finalScore = totalRubricScore;

      await api.recordRecitationScore(sectionId, assessment.id, {
        student_id: selectedStudent.id,
        student_name: selectedStudent.name,
        score: finalScore,
        max_score: maxScore,
        topic_prompt: currentPrompt,
        notes: notes.trim(),
        criteria_scores: {
          content: rubricContent,
          delivery: rubricDelivery,
          confidence: rubricConfidence,
        },
      });

      toast.success(`Recitation score recorded for ${selectedStudent.name}!`);
      setNotes("");
      fetchLogs();
    } catch (err) {
      toast.error(err.message || "Failed to save recitation.");
    } finally {
      setSavingRecord(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-850/80 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold shadow-xs">
              <ClipboardCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-slate-900 dark:text-slate-100">
                  In-Person Recitation Studio
                </h2>
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 font-semibold uppercase">
                  Section {sectionId}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                {assessment.title} • Select students and record their recitation scores.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 grid md:grid-cols-12 gap-6">
          {/* Left Column: Student Picker & Question Prompt (7 cols) */}
          <div className="md:col-span-7 space-y-4">
            {/* Student Call Card */}
            <div className="p-5 rounded-3xl border-2 border-emerald-200 dark:border-emerald-900/60 bg-gradient-to-br from-emerald-50/60 to-teal-50/30 dark:from-emerald-950/20 dark:to-teal-950/10 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-900 dark:text-emerald-300 uppercase tracking-wider flex items-center gap-1.5">
                  <User className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> Current Student on Floor
                </span>
                <button
                  type="button"
                  onClick={handleRandomPick}
                  disabled={isSpinning || students.length === 0}
                  className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50 transition-all active:scale-95"
                >
                  <Shuffle className={clsx("w-3.5 h-3.5", isSpinning && "animate-spin")} />
                  <span>{isSpinning ? "Picking..." : "Random Pick Student"}</span>
                </button>
              </div>

              {/* Selected Student Display */}
              <div className="flex items-center gap-4 p-4 rounded-2xl bg-white dark:bg-slate-800 shadow-sm border border-emerald-100 dark:border-emerald-900/40">
                <div className="w-14 h-14 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-black text-xl shadow-xs">
                  {selectedStudent ? selectedStudent.name.charAt(0).toUpperCase() : "?"}
                </div>
                <div className="flex-1 min-w-0">
                  <div ref={studentPickerRef} className="relative min-w-0">
                    <button
                      type="button"
                      aria-haspopup="listbox"
                      aria-expanded={isStudentPickerOpen}
                      aria-controls="recitation-student-options"
                      onClick={() => {
                        setStudentSearch("");
                        setIsStudentPickerOpen((open) => !open);
                      }}
                      disabled={students.length === 0}
                      className="flex w-full items-center justify-between gap-3 rounded-xl border border-emerald-200/80 bg-white px-3 py-2 text-left shadow-xs transition hover:border-emerald-400 hover:bg-emerald-50/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-emerald-700 dark:hover:bg-slate-800"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-bold text-slate-900 dark:text-slate-100">
                          {selectedStudent?.name || "Select a student"}
                        </span>
                        <span className="block text-[10px] font-medium text-slate-500 dark:text-slate-400">
                          Choose student
                        </span>
                      </span>
                      <ChevronDown
                        aria-hidden="true"
                        className={clsx(
                          "h-4 w-4 shrink-0 text-emerald-600 transition-transform dark:text-emerald-400",
                          isStudentPickerOpen && "rotate-180",
                        )}
                      />
                    </button>

                    {isStudentPickerOpen && (
                      <div className="absolute left-0 right-0 top-full z-30 mt-2 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl ring-1 ring-black/5 dark:border-slate-700 dark:bg-slate-900">
                        <label className="flex items-center gap-2 border-b border-slate-100 px-3 dark:border-slate-800">
                          <Search
                            aria-hidden="true"
                            className="h-4 w-4 shrink-0 text-slate-400"
                          />
                          <input
                            type="search"
                            autoFocus
                            value={studentSearch}
                            onChange={(event) => setStudentSearch(event.target.value)}
                            placeholder="Search students..."
                            aria-label="Search students"
                            className="h-10 min-w-0 flex-1 bg-transparent text-xs text-slate-800 outline-none placeholder:text-slate-400 dark:text-slate-100"
                          />
                        </label>
                        <div
                          id="recitation-student-options"
                          role="listbox"
                          aria-label="Students"
                          className="max-h-56 overflow-y-auto p-1.5"
                        >
                          {filteredStudents.length > 0 ? (
                            filteredStudents.map((student) => {
                              const isSelected = student.id === selectedStudent?.id;
                              return (
                                <button
                                  key={student.id}
                                  type="button"
                                  role="option"
                                  aria-selected={isSelected}
                                  onClick={() => {
                                    setSelectedStudent(student);
                                    setIsStudentPickerOpen(false);
                                    setStudentSearch("");
                                  }}
                                  className={clsx(
                                    "flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-xs transition-colors",
                                    isSelected
                                      ? "bg-emerald-50 font-semibold text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200"
                                      : "text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800",
                                  )}
                                >
                                  <span className="truncate">{student.name}</span>
                                  {isSelected && (
                                    <Check className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                                  )}
                                </button>
                              );
                            })
                          ) : (
                            <p className="px-3 py-5 text-center text-xs text-slate-500">
                              No students match that search.
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-2.5">
                    Section {sectionId} • Ready for recitation
                  </p>
                </div>
              </div>
            </div>

            {/* Topic / Prompt Box */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Question / Recitation Prompt:</span>
              </label>
              <textarea
                rows={2}
                placeholder="Enter the question or topic prompt asked to the student..."
                value={currentPrompt}
                onChange={(e) => setCurrentPrompt(e.target.value)}
                className="w-full text-xs p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none"
              />
            </div>

            {/* Rubric Evaluation */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Standard Recitation Rubric
                </span>
                <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
                  Total: {rubricContent + rubricDelivery + rubricConfidence} / 10 pts
                </span>
              </div>

              {/* Criterion 1 */}
              <div className="flex items-center justify-between text-xs">
                <div>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">Content & Knowledge:</span>
                  <span className="text-[10px] text-slate-400 block">Factual accuracy, grasp of concept (max 5)</span>
                </div>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setRubricContent(val)}
                      className={clsx(
                        "w-6 h-6 rounded-md font-bold text-[11px] cursor-pointer transition-colors",
                        rubricContent >= val
                          ? "bg-emerald-600 text-white"
                          : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400",
                      )}
                    >
                      {val}
                    </button>
                  ))}
                </div>
              </div>

              {/* Criterion 2 */}
              <div className="flex items-center justify-between text-xs">
                <div>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">Clarity & Delivery:</span>
                  <span className="text-[10px] text-slate-400 block">Articulation, organization (max 3)</span>
                </div>
                <div className="flex gap-1">
                  {[1, 2, 3].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setRubricDelivery(val)}
                      className={clsx(
                        "w-6 h-6 rounded-md font-bold text-[11px] cursor-pointer transition-colors",
                        rubricDelivery >= val
                          ? "bg-emerald-600 text-white"
                          : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400",
                      )}
                    >
                      {val}
                    </button>
                  ))}
                </div>
              </div>

              {/* Criterion 3 */}
              <div className="flex items-center justify-between text-xs">
                <div>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">Confidence:</span>
                  <span className="text-[10px] text-slate-400 block">Poise, responsiveness (max 2)</span>
                </div>
                <div className="flex gap-1">
                  {[1, 2].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setRubricConfidence(val)}
                      className={clsx(
                        "w-6 h-6 rounded-md font-bold text-[11px] cursor-pointer transition-colors",
                        rubricConfidence >= val
                          ? "bg-emerald-600 text-white"
                          : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400",
                      )}
                    >
                      {val}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Teacher Notes & Save button */}
            <div className="space-y-2">
              <input
                type="text"
                placeholder="Teacher feedback or notes (optional)..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none"
              />

              <button
                type="button"
                disabled={savingRecord || !selectedStudent}
                onClick={handleSaveRecitation}
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 transition-colors"
              >
                <Save className="w-4 h-4" />
                <span>{savingRecord ? "Recording..." : `Record Score for ${selectedStudent?.name || "Student"}`}</span>
              </button>
            </div>
          </div>

          {/* Right Column: Recitation History Log (5 cols) */}
          <div className="md:col-span-5 flex flex-col h-full border border-slate-200 dark:border-slate-800 rounded-2xl p-4 bg-slate-50/50 dark:bg-slate-850/50">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-slate-500" /> Recent Recitations ({recitationLogs.length})
              </span>
              <button
                type="button"
                onClick={fetchLogs}
                className="p-1 rounded text-slate-400 hover:text-slate-700"
                title="Refresh log"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2.5 pt-3 max-h-[380px]">
              {loadingLogs ? (
                <div className="py-10 text-center text-xs text-slate-400">Loading history...</div>
              ) : recitationLogs.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400 italic">
                  No recitation records saved for this session yet.
                </div>
              ) : (
                recitationLogs.map((log) => (
                  <div
                    key={log.id}
                    className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs space-y-1 shadow-2xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 dark:text-slate-100 truncate max-w-[140px]">
                        {log.student_name}
                      </span>
                      <span className="font-black text-emerald-700 bg-emerald-50 dark:bg-emerald-950/60 dark:text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                        {log.score} / {log.max_score}
                      </span>
                    </div>
                    {log.topic_prompt && (
                      <p className="text-[11px] text-slate-500 truncate" title={log.topic_prompt}>
                        Q: {log.topic_prompt}
                      </p>
                    )}
                    {log.notes && (
                      <p className="text-[11px] text-slate-400 italic">Note: {log.notes}</p>
                    )}
                    <span className="text-[10px] text-slate-400 block text-right">
                      {new Date(log.recorded_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-850/80 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-500">
            Total Students in Section: <strong>{students.length}</strong>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
