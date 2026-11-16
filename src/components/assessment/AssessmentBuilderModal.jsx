import React, { useState } from "react";
import {
  X,
  Plus,
  Trash2,
  Copy,
  ChevronUp,
  ChevronDown,
  Award,
  ShieldAlert,
  BookOpen,
  ClipboardPaste,
  HelpCircle,
  Save,
  Code2,
  FileCode,
} from "lucide-react";
import clsx from "clsx";
import ConfirmModal from "../ConfirmModal";
import DropdownSelect from "../DropdownSelect";
import CodingEditor from "./CodingEditor";
import { SUPPORTED_LANGUAGES } from "./supportedLanguages";
import { parsePastedAssessmentQuestions } from "../../utils/assessmentQuestionPaste";
import { ASSESSMENT_TERM_OPTIONS } from "../../../shared/assessmentTerms";

const createQuestionId = () =>
  `q_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

export default function AssessmentBuilderModal({
  isOpen,
  onClose,
  initialData,
  onSave,
  sectionId,
}) {
  const isEditing = Boolean(initialData?.id);

  const [type, setType] = useState(initialData?.type || "quiz");
  const [title, setTitle] = useState(initialData?.title || "");
  const [subject, setSubject] = useState(initialData?.subject || "");
  const [term, setTerm] = useState(initialData?.term || "midterm");
  const [description, setDescription] = useState(initialData?.description || "");
  const [generalInstructions, setGeneralInstructions] = useState(
    initialData?.general_instructions ||
      "Read each question carefully and provide your best answer.",
  );
  const [timeLimitMinutes, setTimeLimitMinutes] = useState(
    initialData?.time_limit_minutes !== undefined ? initialData.time_limit_minutes : 30,
  );
  const [passingPercentage, setPassingPercentage] = useState(
    initialData?.passing_percentage !== undefined ? initialData.passing_percentage : 50,
  );
  const [shuffleQuestions, setShuffleQuestions] = useState(
    Boolean(initialData?.shuffle_questions),
  );
  const [shuffleChoices, setShuffleChoices] = useState(
    Boolean(initialData?.shuffle_choices),
  );
  const [showScoreImmediately, setShowScoreImmediately] = useState(
    initialData?.show_score_immediately !== false,
  );
  const [antiCheatMonitoring, setAntiCheatMonitoring] = useState(
    initialData?.anti_cheat_monitoring !== false,
  );

  // Questions state
  const [questions, setQuestions] = useState(
    initialData?.questions && Array.isArray(initialData.questions)
      ? initialData.questions
      : [],
  );

  const [selectedIndex, setSelectedIndex] = useState(0);
  const [activeTab, setActiveTab] = useState("settings"); // 'questions' | 'settings' | 'security'
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [questionToDelete, setQuestionToDelete] = useState(null);
  const [isBulkPasteOpen, setIsBulkPasteOpen] = useState(false);
  const [bulkPasteText, setBulkPasteText] = useState("");
  const [bulkPasteErrors, setBulkPasteErrors] = useState([]);
  const [bulkPasteSuccess, setBulkPasteSuccess] = useState("");

  if (!isOpen) return null;

  const currentQ = questions[selectedIndex] || questions[0];
  const totalPoints = questions.reduce((sum, q) => sum + (parseFloat(q.points) || 1), 0);

  const handleAddQuestion = (qType = "multiple_choice") => {
    const defaultQuestion = {
      id: createQuestionId(),
      type: qType,
      part: "",
      question: "",
      points: qType === "coding" ? 10 : qType === "essay" ? 5 : 1,
      options: qType === "multiple_choice" ? ["", "", "", ""] : [],
      correct_answer: qType === "true_false" ? "True" : "",
      rubric: "",
      language: qType === "coding" ? "web" : undefined,
      execution_mode: qType === "coding" ? "web_preview" : undefined,
      starter_code: qType === "coding" ? SUPPORTED_LANGUAGES[0].defaultStarter : "",
      solution_code: "",
      test_cases: [],
    };

    const nextQuestions = [...questions, defaultQuestion];
    setQuestions(nextQuestions);
    setSelectedIndex(nextQuestions.length - 1);
  };

  const handleBulkPasteQuestions = () => {
    const result = parsePastedAssessmentQuestions(bulkPasteText);
    setBulkPasteErrors(result.errors);
    if (result.errors.length > 0) return;

    const importedQuestions = result.questions.map((question) => ({
      ...question,
      id: createQuestionId(),
    }));
    setQuestions([...questions, ...importedQuestions]);
    setSelectedIndex(questions.length + importedQuestions.length - 1);
    setActiveTab("questions");
    setBulkPasteText("");
    setBulkPasteErrors([]);
    setBulkPasteSuccess(
      `Added ${importedQuestions.length} multiple-choice question${importedQuestions.length === 1 ? "" : "s"}.`,
    );
    setIsBulkPasteOpen(false);
  };

  const handleUpdateQuestion = (index, field, value) => {
    const updated = [...questions];
    updated[index] = { ...updated[index], [field]: value };
    setQuestions(updated);
  };

  const handleOptionChange = (qIndex, optIndex, value) => {
    const updated = [...questions];
    const opts = [...(updated[qIndex].options || [])];
    const prevVal = opts[optIndex];
    opts[optIndex] = value;
    updated[qIndex].options = opts;

    if (updated[qIndex].correct_answer === prevVal) {
      updated[qIndex].correct_answer = value;
    }
    setQuestions(updated);
  };

  const handleAddOption = (qIndex) => {
    const updated = [...questions];
    const opts = [...(updated[qIndex].options || [])];
    const nextLetter = String.fromCharCode(65 + opts.length);
    opts.push(`Option ${nextLetter}`);
    updated[qIndex].options = opts;
    setQuestions(updated);
  };

  const handleRemoveOption = (qIndex, optIndex) => {
    const updated = [...questions];
    const opts = (updated[qIndex].options || []).filter((_, i) => i !== optIndex);
    updated[qIndex].options = opts;
    if (!opts.includes(updated[qIndex].correct_answer) && opts.length > 0) {
      updated[qIndex].correct_answer = opts[0];
    }
    setQuestions(updated);
  };

  const handleDeleteQuestion = (index) => {
    if (questions.length <= 1) {
      setErrorMsg("Assessment must have at least one question.");
      return;
    }
    setQuestionToDelete({ index, number: index + 1 });
  };

  const confirmDeleteQuestion = () => {
    if (!questionToDelete) return;
    const nextQuestions = questions.filter((_, index) => index !== questionToDelete.index);
    setQuestions(nextQuestions);
    setSelectedIndex(Math.max(0, questionToDelete.index - 1));
    setQuestionToDelete(null);
  };

  const handleDuplicateQuestion = (index) => {
    const q = questions[index];
    const copy = {
      ...q,
      id: `q_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      question: `${q.question} (Copy)`,
    };
    const updated = [...questions];
    updated.splice(index + 1, 0, copy);
    setQuestions(updated);
    setSelectedIndex(index + 1);
  };

  const handleMoveQuestion = (index, direction) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= questions.length) return;
    const updated = [...questions];
    const [moved] = updated.splice(index, 1);
    updated.splice(targetIndex, 0, moved);
    setQuestions(updated);
    setSelectedIndex(targetIndex);
  };

  // Test cases manager for coding questions
  const handleAddTestCase = (qIndex) => {
    const updated = [...questions];
    const cases = [...(updated[qIndex].test_cases || [])];
    cases.push({
      id: `tc_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
      input: "",
      expected_output: "",
      is_hidden: false,
    });
    updated[qIndex].test_cases = cases;
    setQuestions(updated);
  };

  const handleUpdateTestCase = (qIndex, tcIndex, field, val) => {
    const updated = [...questions];
    const cases = [...(updated[qIndex].test_cases || [])];
    cases[tcIndex] = { ...cases[tcIndex], [field]: val };
    updated[qIndex].test_cases = cases;
    setQuestions(updated);
  };

  const handleRemoveTestCase = (qIndex, tcIndex) => {
    const updated = [...questions];
    const cases = (updated[qIndex].test_cases || []).filter((_, i) => i !== tcIndex);
    updated[qIndex].test_cases = cases;
    setQuestions(updated);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMsg("Assessment title is required.");
      setActiveTab("settings");
      return;
    }

    if (questions.length === 0 && type !== "recitation") {
      setErrorMsg("Please add at least one question or item before saving.");
      setActiveTab("questions");
      return;
    }

    setSaving(true);
    setErrorMsg("");

    try {
      const payload = {
        type,
        title: title.trim(),
        subject: subject.trim(),
        term,
        description: description.trim(),
        general_instructions: generalInstructions.trim(),
        time_limit_minutes: Math.max(0, parseInt(timeLimitMinutes, 10) || 0),
        passing_percentage: Math.min(100, Math.max(0, parseInt(passingPercentage, 10) || 50)),
        shuffle_questions: shuffleQuestions,
        shuffle_choices: shuffleChoices,
        show_score_immediately: showScoreImmediately,
        anti_cheat_monitoring: antiCheatMonitoring,
        questions,
      };

      await onSave(payload);
      onClose();
    } catch (err) {
      setErrorMsg(err.message || "Failed to save assessment.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-6xl h-[92vh] flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800">
        {/* Top Header */}
        <div className="px-5 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100">
                  {isEditing ? "Edit Assessment" : "Assessment Builder"}
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                  Section {sectionId}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 hidden sm:block">
                Create online exams and quizzes, or set up an online or in-person recitation.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 mr-1 hidden sm:inline">
              Total Points: <strong className="text-emerald-600 dark:text-emerald-400">{totalPoints} pts</strong>
            </span>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={saving}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-colors"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{saving ? "Saving..." : isEditing ? "Update" : "Save"}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Studio Tabs */}
        <div className="flex items-center justify-between px-5 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => setActiveTab("questions")}
              className={clsx(
                "py-2.5 text-xs font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5",
                activeTab === "questions"
                  ? "border-emerald-600 text-emerald-700 dark:text-emerald-400"
                  : "border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400",
              )}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Questions & Tasks ({questions.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("settings")}
              className={clsx(
                "py-2.5 text-xs font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5",
                activeTab === "settings"
                  ? "border-emerald-600 text-emerald-700 dark:text-emerald-400"
                  : "border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400",
              )}
            >
              <Award className="w-3.5 h-3.5" />
              <span>Type & Details</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("security")}
              className={clsx(
                "py-2.5 text-xs font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5",
                activeTab === "security"
                  ? "border-emerald-600 text-emerald-700 dark:text-emerald-400"
                  : "border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400",
              )}
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Anti-Cheat & Time Limit</span>
            </button>
          </div>

          <div className="hidden md:flex items-center gap-1 text-[11px] text-slate-400">
            <span>Section: {sectionId}</span>
            <span>•</span>
            <span className="capitalize">{term} Term</span>
          </div>
        </div>

        {errorMsg && (
          <div className="mx-5 mt-2.5 p-2.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 rounded-xl text-xs flex items-center gap-2 shrink-0">
            <HelpCircle className="w-3.5 h-3.5 shrink-0 text-rose-500" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Studio Body */}
        <div className="flex-1 overflow-hidden flex">
          {/* TAB 1: QUESTIONS STUDIO (Master-Detail) */}
          {activeTab === "questions" && (
            <div className="flex-1 flex overflow-hidden">
              {/* Left Navigator Panel */}
              <div className="w-64 sm:w-72 border-r border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/60 flex flex-col shrink-0 overflow-hidden">
                {/* Add Quick Action Bar */}
                <div className="p-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setBulkPasteErrors([]);
                      setBulkPasteSuccess("");
                      setIsBulkPasteOpen(true);
                    }}
                    className="w-full px-2.5 py-2 rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-emerald-100 dark:hover:bg-emerald-950/70 cursor-pointer transition-colors"
                  >
                    <ClipboardPaste className="w-3.5 h-3.5" />
                    Paste questions
                  </button>
                  {bulkPasteSuccess && (
                    <p role="status" className="text-[10px] text-emerald-700 dark:text-emerald-300">
                      {bulkPasteSuccess}
                    </p>
                  )}
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Add Question or Task
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleAddQuestion("multiple_choice")}
                      className="px-2 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1 shadow-2xs cursor-pointer transition-colors col-span-2"
                    >
                      <BookOpen className="w-3.5 h-3.5" /> + Multiple Choice
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddQuestion("coding")}
                      className="px-2 py-1 rounded-md bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[11px] font-semibold cursor-pointer"
                    >
                      + Coding Problem
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddQuestion("true_false")}
                      className="px-2 py-1 rounded-md bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[11px] font-semibold cursor-pointer"
                    >
                      + True/False
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddQuestion("identification")}
                      className="px-2 py-1 rounded-md bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[11px] font-semibold cursor-pointer"
                    >
                      + Ident
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddQuestion("essay")}
                      className="px-2 py-1 rounded-md bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[11px] font-semibold cursor-pointer"
                    >
                      + Essay
                    </button>
                  </div>
                </div>

                {/* Items List */}
                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                  {questions.length === 0 ? (
                    <div className="py-8 px-3 text-center text-xs text-slate-400 space-y-2">
                      <BookOpen className="w-6 h-6 text-slate-300 dark:text-slate-600 mx-auto" />
                      <p className="font-semibold text-slate-600 dark:text-slate-400 text-[11px]">
                        No questions added yet
                      </p>
                      <p className="text-[10px] text-slate-400">
                        {type === "recitation"
                          ? "For an online recitation, add questions. For in-person scoring, you can save without questions and use the Recitation Studio."
                          : "Choose a question type above to add items."}
                      </p>
                    </div>
                  ) : (
                    questions.map((q, idx) => {
                    const isSelected = idx === selectedIndex;
                    return (
                      <div
                        key={q.id || idx}
                        onClick={() => setSelectedIndex(idx)}
                        className={clsx(
                          "px-2.5 py-2 rounded-xl text-left transition-all cursor-pointer border flex items-center justify-between gap-2 group",
                          isSelected
                            ? "bg-white dark:bg-slate-900 border-emerald-500 shadow-xs"
                            : "bg-transparent border-transparent hover:bg-slate-200/60 dark:hover:bg-slate-800/60 text-slate-600 dark:text-slate-400",
                        )}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className={clsx(
                              "w-5 h-5 rounded-md flex items-center justify-center font-bold text-[11px] shrink-0",
                              isSelected
                                ? "bg-emerald-600 text-white"
                                : "bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300",
                            )}
                          >
                            {idx + 1}
                          </span>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1 leading-tight">
                              <span
                                className={clsx(
                                  "text-[10px] font-bold uppercase tracking-wider px-1 rounded",
                                  q.type === "coding"
                                    ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300"
                                    : q.type === "multiple_choice"
                                    ? "bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300"
                                    : "bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300",
                                )}
                              >
                                {q.type === "coding" ? (q.language || "code") : q.type}
                              </span>
                              <span className="text-[10px] text-slate-400 font-semibold">{q.points || 1}pt</span>
                            </div>
                            <p className="text-[11px] font-medium truncate text-slate-800 dark:text-slate-200 mt-0.5">
                              {q.question ? q.question.replace(/<[^>]*>?/gm, "") : "Untitled Question..."}
                            </p>
                          </div>
                        </div>

                        {/* Quick item tools */}
                        <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDuplicateQuestion(idx);
                            }}
                            className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                            title="Duplicate"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                          {questions.length > 1 && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteQuestion(idx);
                              }}
                              className="p-1 text-slate-400 hover:text-rose-500"
                              title="Delete"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
              </div>

              {/* Right Focused Question Editor */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-white dark:bg-slate-900 space-y-4">
                {currentQ ? (
                  <div className="space-y-4">
                    {/* Item Meta Toolbar */}
                    <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white font-bold text-xs">
                          Item #{selectedIndex + 1}
                        </span>

                        <DropdownSelect
                          value={currentQ.type}
                          onChange={(e) => handleUpdateQuestion(selectedIndex, "type", e.target.value)}
                          className="text-xs font-bold pl-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 outline-none cursor-pointer"
                        >
                          <option value="coding">Coding / Programming Problem</option>
                          <option value="multiple_choice">Multiple Choice</option>
                          <option value="true_false">True or False</option>
                          <option value="identification">Identification (Fill-in)</option>
                          <option value="essay">Essay / Free Text</option>
                        </DropdownSelect>

                        <input
                          type="text"
                          value={currentQ.part || ""}
                          placeholder="Category / Part Header (e.g. Part I)"
                          onChange={(e) => handleUpdateQuestion(selectedIndex, "part", e.target.value)}
                          className="hidden sm:block text-xs px-2.5 py-1 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 w-48"
                        />
                      </div>

                      <div className="flex items-center gap-1.5">
                        <div className="flex items-center gap-1 text-xs font-semibold text-slate-500 mr-2">
                          <span>Points:</span>
                          <input
                            type="number"
                            min="0.5"
                            step="0.5"
                            value={currentQ.points || 1}
                            onChange={(e) => handleUpdateQuestion(selectedIndex, "points", e.target.value)}
                            className="w-16 text-center px-1.5 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-bold"
                          />
                        </div>

                        <button
                          type="button"
                          onClick={() => handleMoveQuestion(selectedIndex, -1)}
                          disabled={selectedIndex === 0}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-20 cursor-pointer"
                          title="Move Up"
                        >
                          <ChevronUp className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMoveQuestion(selectedIndex, 1)}
                          disabled={selectedIndex === questions.length - 1}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-20 cursor-pointer"
                          title="Move Down"
                        >
                          <ChevronDown className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDuplicateQuestion(selectedIndex)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                          title="Duplicate"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteQuestion(selectedIndex)}
                          className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/60 cursor-pointer"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Question Prompt */}
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                        <span>Question or Task:</span>
                        <span className="text-[10px] text-slate-400 font-normal">Add instructions, context, or content for students</span>
                      </label>
                      <textarea
                        rows={3}
                        placeholder="Write the problem statement, requirements, or question here..."
                        value={currentQ.question || ""}
                        onChange={(e) => handleUpdateQuestion(selectedIndex, "question", e.target.value)}
                        className="w-full text-xs sm:text-sm p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>

                    {/* TYPE SPECIFIC DETAILS */}

                    {/* 1. CODING / PROGRAMMING SPECIFIC */}
                    {currentQ.type === "coding" && (
                      <div className="space-y-4 pt-1">
                        {/* Language & Execution Mode Row */}
                        <div className="grid sm:grid-cols-2 gap-3 p-3 bg-slate-50 dark:bg-slate-850 rounded-2xl border border-slate-200 dark:border-slate-700/80">
                          <div>
                            <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider block mb-1">
                              Programming Language / Environment:
                            </label>
                            <DropdownSelect
                              value={currentQ.language || "web"}
                              onChange={(e) => {
                                const newLang = e.target.value;
                                const matched = SUPPORTED_LANGUAGES.find((l) => l.id === newLang);
                                handleUpdateQuestion(selectedIndex, "language", newLang);
                                if (matched) {
                                  handleUpdateQuestion(selectedIndex, "execution_mode", matched.mode);
                                  if (!currentQ.starter_code || currentQ.starter_code.trim() === "") {
                                    handleUpdateQuestion(selectedIndex, "starter_code", matched.defaultStarter);
                                  }
                                }
                              }}
                              className="w-full text-xs font-bold pl-2 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 outline-none cursor-pointer"
                            >
                              {SUPPORTED_LANGUAGES.map((l) => (
                                <option key={l.id} value={l.id}>
                                  {l.name}
                                </option>
                              ))}
                            </DropdownSelect>
                          </div>

                          <div>
                            <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider block mb-1">
                              Evaluation Mode:
                            </label>
                            <DropdownSelect
                              value={currentQ.execution_mode || "web_preview"}
                              onChange={(e) => handleUpdateQuestion(selectedIndex, "execution_mode", e.target.value)}
                              className="w-full text-xs font-bold pl-2 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 outline-none cursor-pointer"
                            >
                              <option value="web_preview">Live Web Preview (HTML/CSS/JS Sandbox)</option>
                              <option value="test_cases">Local Test Runner (Student Browser)</option>
                              <option value="manual_review">Teacher Rubric & Manual Code Review</option>
                            </DropdownSelect>
                          </div>
                        </div>

                        {/* Starter Code Editor */}
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                              <FileCode className="w-3.5 h-3.5 text-emerald-500" />
                              <span>Starter Code (Template Given to Student):</span>
                            </span>
                            <span className="text-[11px] text-slate-400">Student begins with this code</span>
                          </div>
                          <CodingEditor
                            value={currentQ.starter_code || ""}
                            onChange={(val) => handleUpdateQuestion(selectedIndex, "starter_code", val)}
                            language={currentQ.language || "web"}
                            executionMode={currentQ.execution_mode || "web_preview"}
                            minHeight="200px"
                            showControls={true}
                          />
                        </div>

                        {/* Test Cases Manager (if test_cases mode) */}
                        {currentQ.execution_mode === "test_cases" && (
                          <div className="space-y-2 p-3.5 bg-slate-50 dark:bg-slate-850 rounded-2xl border border-slate-200 dark:border-slate-700/80">
                            <div className="flex items-center justify-between">
                              <div>
                                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                                  Test Cases ({currentQ.test_cases?.length || 0})
                                </span>
                                <span className="text-[11px] text-slate-400">
                                  Runs in the student's browser for feedback; results are not used for grading.
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleAddTestCase(selectedIndex)}
                                className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1 cursor-pointer"
                              >
                                <Plus className="w-3 h-3" /> Add Test Case
                              </button>
                            </div>

                            <div className="space-y-2 mt-2">
                              {(currentQ.test_cases || []).map((tc, tcIdx) => (
                                <div
                                  key={tc.id || tcIdx}
                                  className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 grid sm:grid-cols-12 gap-2 items-center"
                                >
                                  <div className="sm:col-span-5 space-y-0.5">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase">Input Parameter:</span>
                                    <input
                                      type="text"
                                      placeholder="e.g. [1, 2, 3] or 'hello'"
                                      value={tc.input || ""}
                                      onChange={(e) => handleUpdateTestCase(selectedIndex, tcIdx, "input", e.target.value)}
                                      className="w-full text-xs font-mono p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                                    />
                                  </div>

                                  <div className="sm:col-span-5 space-y-0.5">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase">Expected Output:</span>
                                    <input
                                      type="text"
                                      placeholder="e.g. 6 or 'olleh'"
                                      value={tc.expected_output || ""}
                                      onChange={(e) => handleUpdateTestCase(selectedIndex, tcIdx, "expected_output", e.target.value)}
                                      className="w-full text-xs font-mono p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                                    />
                                  </div>

                                  <div className="sm:col-span-2 flex items-center justify-end gap-1.5 pt-3 sm:pt-0">
                                    <label className="flex items-center gap-1 text-[11px] text-slate-500 cursor-pointer" title="Hidden from student during taking">
                                      <input
                                        type="checkbox"
                                        checked={Boolean(tc.is_hidden)}
                                        onChange={(e) => handleUpdateTestCase(selectedIndex, tcIdx, "is_hidden", e.target.checked)}
                                        className="rounded text-emerald-600"
                                      />
                                      <span>Hidden</span>
                                    </label>
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveTestCase(selectedIndex, tcIdx)}
                                      className="p-1 text-slate-400 hover:text-rose-500"
                                    >
                                      <X className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* 2. MULTIPLE CHOICE */}
                    {currentQ.type === "multiple_choice" && (
                      <div className="space-y-2 pt-1">
                        <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                          <span>Choices (Click letter to set Answer Key):</span>
                          <button
                            type="button"
                            onClick={() => handleAddOption(selectedIndex)}
                            className="text-emerald-600 dark:text-emerald-400 font-bold hover:underline flex items-center gap-0.5"
                          >
                            <Plus className="w-3 h-3" /> Add Choice
                          </button>
                        </div>
                        <div className="grid sm:grid-cols-2 gap-2">
                          {(currentQ.options || []).map((opt, optIdx) => {
                            const isCorrect = currentQ.correct_answer === opt;
                            const letter = String.fromCharCode(65 + optIdx);
                            return (
                              <div
                                key={optIdx}
                                className={clsx(
                                  "flex items-center gap-2 p-1.5 rounded-xl border transition-all",
                                  isCorrect
                                    ? "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/40"
                                    : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800",
                                )}
                              >
                                <button
                                  type="button"
                                  onClick={() => handleUpdateQuestion(selectedIndex, "correct_answer", opt)}
                                  className={clsx(
                                    "w-6 h-6 rounded-lg text-xs font-bold flex items-center justify-center shrink-0 cursor-pointer transition-colors",
                                    isCorrect
                                      ? "bg-emerald-600 text-white"
                                      : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-emerald-100",
                                  )}
                                  title="Mark as correct answer"
                                >
                                  {letter}
                                </button>
                                <input
                                  type="text"
                                  value={opt}
                                  onChange={(e) => handleOptionChange(selectedIndex, optIdx, e.target.value)}
                                  className="flex-1 text-xs bg-transparent border-0 outline-none text-slate-900 dark:text-slate-100"
                                />
                                {currentQ.options.length > 2 && (
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveOption(selectedIndex, optIdx)}
                                    className="p-1 text-slate-400 hover:text-rose-500 cursor-pointer"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* 3. TRUE / FALSE */}
                    {currentQ.type === "true_false" && (
                      <div className="space-y-1.5 pt-1">
                        <label className="text-xs font-bold text-slate-500 block">
                          Correct Answer:
                        </label>
                        <div className="flex gap-3">
                          {["True", "False"].map((val) => (
                            <button
                              key={val}
                              type="button"
                              onClick={() => handleUpdateQuestion(selectedIndex, "correct_answer", val)}
                              className={clsx(
                                "flex-1 py-2 rounded-xl border font-bold text-xs transition-colors cursor-pointer",
                                currentQ.correct_answer === val
                                  ? "bg-emerald-600 text-white border-emerald-600"
                                  : "border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300",
                              )}
                            >
                              {val}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 4. IDENTIFICATION */}
                    {currentQ.type === "identification" && (
                      <div className="space-y-1.5 pt-1">
                        <label className="text-xs font-bold text-slate-500 block">
                          Accepted Correct Answer(s):
                        </label>
                        <input
                          type="text"
                          value={currentQ.correct_answer || ""}
                          placeholder="e.g. CPU, Central Processing Unit (comma-separated accepted answers)"
                          onChange={(e) => handleUpdateQuestion(selectedIndex, "correct_answer", e.target.value)}
                          className="w-full text-xs p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none font-medium"
                        />
                      </div>
                    )}

                    {/* 5. ESSAY */}
                    {currentQ.type === "essay" && (
                      <div className="space-y-1.5 pt-1">
                        <label className="text-xs font-bold text-slate-500 block">
                          Scoring Rubric Guidelines:
                        </label>
                        <input
                          type="text"
                          value={currentQ.rubric || ""}
                          placeholder="e.g. Accuracy (3 pts), Organization & Grammar (2 pts)"
                          onChange={(e) => handleUpdateQuestion(selectedIndex, "rubric", e.target.value)}
                          className="w-full text-xs p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none"
                        />
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center py-24 text-center space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-200 dark:border-emerald-800">
                      <Code2 className="w-6 h-6" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                        No question selected or created
                      </h4>
                      <p className="text-xs text-slate-400 max-w-sm mx-auto">
                      Add multiple-choice, written-response, or coding items from the left panel.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: EXAM SETTINGS */}
          {activeTab === "settings" && (
            <div className="flex-1 overflow-y-auto p-6 max-w-2xl mx-auto w-full space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Assessment Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Biology Midterm, Unit 3 Quiz, or Oral Recitation"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full text-xs sm:text-sm p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Subject / Course
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Biology, Mathematics, or History"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Academic Term
                  </label>
                  <DropdownSelect
                    value={term}
                    onChange={(e) => setTerm(e.target.value)}
                    className="w-full text-xs pl-2.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none font-semibold cursor-pointer"
                  >
                    {ASSESSMENT_TERM_OPTIONS.map(({ value, label }) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                    {term === "semestral" && (
                      <option value="semestral">Semestral (existing)</option>
                    )}
                  </DropdownSelect>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Assessment Type
                </label>
                <div className="grid auto-rows-fr grid-cols-1 items-stretch gap-2.5 sm:grid-cols-3">
                  {[
                    {
                      id: "exam",
                      label: "Exam",
                      description: "Formal test or major evaluation.",
                    },
                    {
                      id: "quiz",
                      label: "Quiz",
                      description: "Short check of learning.",
                    },
                    {
                      id: "recitation",
                      label: "Recitation",
                      description: "Oral response or student explanation.",
                    },
                  ].map((assessmentType) => (
                    <button
                      key={assessmentType.id}
                      type="button"
                      aria-pressed={type === assessmentType.id}
                      onClick={() => setType(assessmentType.id)}
                      className={clsx(
                        "flex h-full min-h-[88px] flex-col rounded-xl border p-3.5 text-left transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40",
                        type === assessmentType.id
                          ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 ring-2 ring-emerald-500/20"
                          : "border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:border-emerald-300",
                      )}
                    >
                      <span className="block text-sm font-bold leading-5 text-slate-800 dark:text-slate-100">
                        {assessmentType.label}
                      </span>
                      <span className="mt-1 block min-h-8 text-[11px] leading-4 text-slate-500 dark:text-slate-400">
                        {assessmentType.description}
                      </span>
                    </button>
                  ))}
                </div>
                {type === "recitation" && (
                  <p className="rounded-lg border border-emerald-200/70 bg-emerald-50/70 px-3 py-2 text-[11px] leading-4 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200">
                    Online: add questions and publish. In person: save without questions, then choose "Record In-Person Recitation" on the assessment card.
                  </p>
                )}
              </div>

              <div className="space-y-1 max-w-xs">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Passing Grade (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={passingPercentage}
                  onChange={(e) => setPassingPercentage(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none font-bold"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  General Instructions (Printed on Header & Student Screen)
                </label>
                <textarea
                  rows={3}
                  value={generalInstructions}
                  onChange={(e) => setGeneralInstructions(e.target.value)}
                  className="w-full text-xs p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Short Description / Topics Covered (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Topics, concepts, or skills covered"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none"
                />
              </div>
            </div>
          )}

          {/* TAB 3: ANTI-CHEAT & PROCTORING */}
          {activeTab === "security" && (
            <div className="flex-1 overflow-y-auto p-6 max-w-2xl mx-auto w-full space-y-4">
              <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 rounded-2xl flex items-start gap-3">
                <ShieldAlert className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-emerald-900 dark:text-emerald-200">
                    Online Security & Digital Proctoring
                  </h4>
                  <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-0.5">
                    Configure online integrity tracking, time limits, and test randomized sequences.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Time Limit (Minutes)
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Auto-submits when countdown reaches zero. Set to 0 for unlimited time.
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 font-bold text-xs">
                    <input
                      type="number"
                      min="0"
                      value={timeLimitMinutes}
                      onChange={(e) => setTimeLimitMinutes(e.target.value)}
                      className="w-16 text-center p-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                    />
                    <span>mins</span>
                  </div>
                </div>

                <label className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 cursor-pointer">
                  <div>
                    <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Tab Switch & Window Focus Tracking
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Logs and flags when student switches tabs or navigates away during the exam.
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={antiCheatMonitoring}
                    onChange={(e) => setAntiCheatMonitoring(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-600 accent-emerald-600"
                  />
                </label>

                <label className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 cursor-pointer">
                  <div>
                    <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Shuffle Questions Sequence
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Randomizes question order for each student taking online.
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={shuffleQuestions}
                    onChange={(e) => setShuffleQuestions(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-600 accent-emerald-600"
                  />
                </label>

                <label className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 cursor-pointer">
                  <div>
                    <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Shuffle Multiple Choice Choices
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Randomizes choice order (A, B, C, D) for each student.
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={shuffleChoices}
                    onChange={(e) => setShuffleChoices(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-600 accent-emerald-600"
                  />
                </label>

                <label className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 cursor-pointer">
                  <div>
                    <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Instant Score & Results Display
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Shows percentage and correct answers right after student submits.
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={showScoreImmediately}
                    onChange={(e) => setShowScoreImmediately(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-600 accent-emerald-600"
                  />
                </label>
              </div>
            </div>
          )}
        </div>
      </div>
      {isBulkPasteOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="bulk-question-paste-title"
            className="w-full max-w-2xl rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 dark:border-slate-800 px-5 py-4">
              <div>
                <h3 id="bulk-question-paste-title" className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Paste multiple-choice questions
                </h3>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Put one question on each line. Separate the question, choices, and correct choice letter with |.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsBulkPasteOpen(false)}
                aria-label="Close question paste dialog"
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 p-5">
              <div className="rounded-lg bg-slate-50 dark:bg-slate-800 p-3 text-xs text-slate-600 dark:text-slate-300">
                <p className="font-semibold">Format</p>
                <code className="mt-1 block font-mono text-emerald-700 dark:text-emerald-300">
                  Question | A. choice 1; B. choice 2; C. choice 3 | correct letter
                </code>
                <p className="mt-2 text-[11px]">
                  Separate choices with commas or semicolons. Choice labels such as A. and B. are optional. Use the correct choice letter after the final |.
                </p>
              </div>

              <label htmlFor="bulk-question-paste-input" className="sr-only">
                Paste questions
              </label>
              <textarea
                id="bulk-question-paste-input"
                autoFocus
                rows={9}
                value={bulkPasteText}
                onChange={(event) => {
                  setBulkPasteText(event.target.value);
                  setBulkPasteErrors([]);
                }}
                placeholder={"What is 2 + 2? | A. 3; B. 4; C. 5 | B\nWhich planet is known as the Red Planet? | A. Earth; B. Mars; C. Venus | B"}
                className="w-full resize-y rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 p-3 font-mono text-xs leading-relaxed text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500"
              />

              {bulkPasteErrors.length > 0 && (
                <div role="alert" className="rounded-lg border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/40 p-3 text-xs text-rose-700 dark:text-rose-300">
                  <p className="font-bold">Fix these lines before importing:</p>
                  <ul className="mt-1 list-inside list-disc space-y-0.5">
                    {bulkPasteErrors.map((error) => <li key={error}>{error}</li>)}
                  </ul>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-200 dark:border-slate-800 px-5 py-3">
              <button
                type="button"
                onClick={() => setIsBulkPasteOpen(false)}
                className="rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleBulkPasteQuestions}
                disabled={!bulkPasteText.trim()}
                className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
              >
                Add questions
              </button>
            </div>
          </section>
        </div>
      )}
      <ConfirmModal
        isOpen={Boolean(questionToDelete)}
        title="Delete question?"
        message={`Question ${questionToDelete?.number} will be removed. Click ${isEditing ? "Update" : "Save"} to apply this change to the assessment.`}
        onConfirm={confirmDeleteQuestion}
        onCancel={() => setQuestionToDelete(null)}
        isDestructive
        confirmText="Delete Question"
      />
    </div>
  );
}
