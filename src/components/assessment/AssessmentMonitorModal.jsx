import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  X,
  Download,
  UploadCloud,
  ShieldAlert,
  ShieldCheck,
  Clock,
  Eye,
  Share2,
  Copy,
  Check,
  ExternalLink,
  Search,
  Users,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
} from "lucide-react";
import clsx from "clsx";
import api from "../../lib/api";
import { useToast } from "../../context/ToastContext";
import DropdownSelect from "../DropdownSelect";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import { copyTextToClipboard } from "../../utils/copyTextToClipboard";
import { findMatchingQuizColumn } from "../../utils/assessmentGradeMapping";
import {
  getAssessmentExamGradeTarget,
  getAssessmentTermLabel,
  getAssessmentTermsForGradebookTerm,
  getGradebookTermForAssessmentTerm,
} from "../../../shared/assessmentTerms";

export default function AssessmentMonitorModal({
  isOpen,
  onClose,
  assessment,
  sectionId,
  students = [],
  onOpenReview,
  onOpenShare,
}) {
  const toast = useToast();
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);

  // Active view tab: 'submissions' | 'roster' | 'analysis'
  const [activeTab, setActiveTab] = useState("submissions");
  const [searchQuery, setSearchQuery] = useState("");
  const [rosterFilter, setRosterFilter] = useState("all"); // 'all' | 'submitted' | 'not_started'

  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  // Sync to grades modal
  const [syncModalOpen, setSyncModalOpen] = useState(false);
  const [syncTerm, setSyncTerm] = useState(assessment?.term || "midterm");
  const [syncColumnKey, setSyncColumnKey] = useState("");
  const [gradeConfig, setGradeConfig] = useState(null);
  const [gradeConfigLoading, setGradeConfigLoading] = useState(false);
  const [gradeConfigError, setGradeConfigError] = useState("");
  const [syncing, setSyncing] = useState(false);

  // Integrity detail modal
  const [selectedIntegrityLog, setSelectedIntegrityLog] = useState(null);

  const fetchSubmissions = useCallback(async (isSilent = false) => {
    if (!assessment?.id) return;
    try {
      const data = await api.getAssessmentSubmissions(sectionId, assessment.id);
      setSubmissions(data || []);
      setLastUpdated(new Date());
    } catch (err) {
      if (!isSilent) {
        toast.error(err.message || "Failed to load submissions.");
      }
    } finally {
      setLoading(false);
    }
  }, [assessment?.id, sectionId, toast]);

  // Initial load
  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      fetchSubmissions(false);
    }
  }, [isOpen, fetchSubmissions]);

  // Real-time live polling (every 5 seconds)
  useEffect(() => {
    if (!isOpen || !assessment?.id) return;

    const interval = setInterval(() => {
      fetchSubmissions(true);
    }, 5000);

    return () => clearInterval(interval);
  }, [isOpen, assessment?.id, fetchSubmissions]);

  useEffect(() => {
    if (!syncModalOpen) return undefined;

    let cancelled = false;
    setGradeConfigLoading(true);
    setGradeConfigError("");
    setGradeConfig(null);

    api.getGrades(sectionId, syncTerm)
      .then((data) => {
        if (cancelled) return;
        const config = data.config || {};
        const quizItems = Array.isArray(config.quiz_items) ? config.quiz_items : [];
        const titleMatch = findMatchingQuizColumn(assessment?.title, quizItems);
        const selectedItem = titleMatch || (quizItems.length === 1 ? quizItems[0] : null);
        setGradeConfig(config);
        setSyncColumnKey(selectedItem?.id || "");
      })
      .catch((err) => {
        if (!cancelled) {
          setGradeConfigError(err.message || "Unable to load the gradebook configuration.");
        }
      })
      .finally(() => {
        if (!cancelled) setGradeConfigLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [syncModalOpen, sectionId, syncTerm, assessment?.title]);

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const studentLink = assessment?.access_code ? `${origin}/?take=${assessment.access_code}` : "";

  const handleCopyLink = async () => {
    if (!studentLink) return;
    const ok = await copyTextToClipboard(studentLink);
    if (ok) {
      setCopiedLink(true);
      toast.success("Student test link copied to clipboard!");
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const handleCopyCode = async () => {
    if (!assessment?.access_code) return;
    const ok = await copyTextToClipboard(assessment.access_code);
    if (ok) {
      setCopiedCode(true);
      toast.success("Access code copied!");
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const handleCopyStudentPersonalLink = async (item) => {
    const link = `${origin}/?take=${assessment.access_code}&student=${encodeURIComponent(item.id)}`;
    const ok = await copyTextToClipboard(link);
    if (ok) {
      toast.success(`Personal link for ${item.name} copied!`);
    }
  };

  const handleOpenStudentView = () => {
    if (!studentLink) return;
    window.open(studentLink, "_blank", "noopener,noreferrer");
  };

  // Cross-reference enrolled roster with live submissions (100% dynamic)
  const rosterData = useMemo(() => {
    const submissionByStudentId = new Map();
    const submissionByName = new Map();

    submissions.forEach((sub) => {
      if (sub.student_id) {
        submissionByStudentId.set(String(sub.student_id), sub);
      }
      if (sub.student_name) {
        submissionByName.set(sub.student_name.trim().toLowerCase(), sub);
      }
    });

    const enrolledRows = (students || []).map((student) => {
      const studentNameClean = (student.name || "").trim().toLowerCase();
      const sub =
        submissionByStudentId.get(String(student.id)) ||
        submissionByName.get(studentNameClean) ||
        null;

      return {
        id: student.id,
        name: student.name,
        submission: sub,
        status: !sub ? "not_started" : sub.submitted_at ? sub.status : "in_progress",
        isEnrolled: true,
      };
    });

    // Also include any guest / unlisted student submissions
    const matchedSubIds = new Set(
      enrolledRows.map((r) => r.submission?.id).filter(Boolean),
    );
    const unlistedRows = submissions
      .filter((s) => !matchedSubIds.has(s.id))
      .map((s) => ({
        id: s.student_id || `unlisted_${s.id}`,
        name: s.student_name,
        submission: s,
        status: s.submitted_at ? s.status : "in_progress",
        isEnrolled: false,
      }));

    return [...enrolledRows, ...unlistedRows];
  }, [students, submissions]);

  const completedSubmissions = useMemo(
    () => submissions.filter((submission) => submission.submitted_at),
    [submissions],
  );
  const examGradeTarget = getAssessmentExamGradeTarget(assessment?.term);
  const hasSyncableScores = assessment?.type === "recitation"
    ? Number(assessment.recitation_count || 0) > 0 || completedSubmissions.length > 0
    : completedSubmissions.length > 0;
  const recitationPeriodLabels = getAssessmentTermsForGradebookTerm(syncTerm)
    .map(getAssessmentTermLabel)
    .join(" and ");

  // Statistics calculation (derived purely from live data)
  const stats = useMemo(() => {
    const totalEnrolled = students.length || submissions.length;
    const submittedCount = completedSubmissions.length;
    const activeCount = submissions.length - submittedCount;
    const notStartedCount = Math.max(0, totalEnrolled - submittedCount - activeCount);

    if (submittedCount === 0) {
      return {
        totalEnrolled,
        submittedCount,
        activeCount,
        notStartedCount,
        completionRate: 0,
        averageScore: 0,
        averagePercentage: 0,
        highestScore: 0,
        lowestScore: 0,
        passingRate: 0,
        cleanIntegrityCount: completedSubmissions.filter((s) => (s.tab_switch_count || 0) === 0).length,
        flaggedIntegrityCount: completedSubmissions.filter((s) => (s.tab_switch_count || 0) > 0).length,
      };
    }

    const scores = completedSubmissions.map((s) => parseFloat(s.score) || 0);
    const percentages = completedSubmissions.map((s) => parseFloat(s.percentage) || 0);
    const sumScore = scores.reduce((a, b) => a + b, 0);
    const sumPercentage = percentages.reduce((a, b) => a + b, 0);

    const passingPct = assessment?.passing_percentage || 50;
    const passedCount = percentages.filter((p) => p >= passingPct).length;

    const cleanCount = completedSubmissions.filter((s) => (s.tab_switch_count || 0) === 0).length;
    const flaggedCount = completedSubmissions.filter((s) => (s.tab_switch_count || 0) > 0).length;

    return {
      totalEnrolled,
      submittedCount,
      activeCount,
      notStartedCount,
      completionRate: totalEnrolled > 0 ? Math.round((submittedCount / totalEnrolled) * 100) : 100,
      averageScore: (sumScore / submittedCount).toFixed(1),
      averagePercentage: (sumPercentage / submittedCount).toFixed(1),
      highestScore: Math.max(...scores).toFixed(1),
      lowestScore: Math.min(...scores).toFixed(1),
      passingRate: ((passedCount / submittedCount) * 100).toFixed(1),
      cleanIntegrityCount: cleanCount,
      flaggedIntegrityCount: flaggedCount,
    };
  }, [submissions, completedSubmissions, students, assessment]);

  const questionAnalytics = useMemo(() => {
    return (assessment?.questions || []).map((question, index) => {
      const questionId = question.id || `q_${index + 1}`;
      const maxPoints = parseFloat(question.points) || 1;
      const results = submissions
        .map((submission) => {
          const detail = submission.grading_details?.[questionId];
          if (!detail || (detail.needsManualGrading && submission.status !== "graded")) {
            return null;
          }
          const earned = parseFloat(detail.pointsEarned);
          const itemMax = parseFloat(detail.maxPoints) || maxPoints;
          return Number.isFinite(earned) ? (earned / itemMax) * 100 : null;
        })
        .filter((percentage) => percentage !== null);
      const pendingReviews = submissions.filter((submission) => {
        const detail = submission.grading_details?.[questionId];
        return submission.status === "in_progress" && detail?.needsManualGrading;
      }).length;

      return {
        id: questionId,
        number: index + 1,
        prompt: question.question || "Untitled question",
        type: question.type || "question",
        maxPoints,
        responseCount: results.length,
        averagePercentage: results.length
          ? results.reduce((sum, percentage) => sum + percentage, 0) / results.length
          : null,
        pendingReviews,
      };
    });
  }, [assessment?.questions, submissions]);

  // Filtered lists based on search
  const filteredSubmissions = useMemo(() => {
    if (!searchQuery.trim()) return submissions;
    const q = searchQuery.toLowerCase();
    return submissions.filter((s) => (s.student_name || "").toLowerCase().includes(q));
  }, [submissions, searchQuery]);

  const filteredRoster = useMemo(() => {
    return rosterData.filter((r) => {
      const matchesSearch =
        !searchQuery.trim() ||
        (r.name || "").toLowerCase().includes(searchQuery.toLowerCase());

      const matchesFilter =
        rosterFilter === "all" ||
        (rosterFilter === "submitted" && Boolean(r.submission?.submitted_at)) ||
        (rosterFilter === "in_progress" && Boolean(r.submission && !r.submission.submitted_at)) ||
        (rosterFilter === "not_started" && !r.submission);

      return matchesSearch && matchesFilter;
    });
  }, [rosterData, searchQuery, rosterFilter]);

  const gradeQuizItems = Array.isArray(gradeConfig?.quiz_items)
    ? gradeConfig.quiz_items
    : [];
  const selectedQuizItem = gradeQuizItems.find((item) => item.id === syncColumnKey);

  const handleExportExcel = async () => {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Submissions");

      worksheet.columns = [
        { header: "Student Name", key: "student_name", width: 25 },
        { header: "Status", key: "status", width: 15 },
        { header: "Score", key: "score", width: 12 },
        { header: "Total Points", key: "total_points", width: 12 },
        { header: "Percentage", key: "percentage", width: 15 },
        { header: "Time Spent (s)", key: "time_spent", width: 15 },
        { header: "Focus-loss events", key: "tab_switches", width: 18 },
        { header: "Submitted At", key: "submitted_at", width: 22 },
      ];

      completedSubmissions.forEach((s) => {
        worksheet.addRow({
          student_name: s.student_name,
          status: s.status,
          score: parseFloat(s.score) || 0,
          total_points: parseFloat(s.total_points) || 0,
          percentage: `${s.percentage}%`,
          time_spent: s.time_spent_seconds,
          tab_switches: s.tab_switch_count,
          submitted_at: s.submitted_at ? new Date(s.submitted_at).toLocaleString() : "N/A",
        });
      });

      worksheet.getRow(1).font = { bold: true };
      worksheet.getRow(1).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFEDE9FE" },
      };

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      saveAs(blob, `${assessment.title || "Assessment"}_Submissions_Section_${sectionId}.xlsx`);
      toast.success("Excel report exported successfully!");
    } catch (err) {
      toast.error(err.message || "Failed to export Excel report.");
    }
  };

  const handleSyncToGrades = async () => {
    setSyncing(true);
    try {
      const result = await api.syncAssessmentToGrades(sectionId, assessment.id, {
        term: syncTerm,
        ...(assessment.type === "quiz" ? { targetColumnKey: syncColumnKey } : {}),
      });
      toast.success(result.message || "Scores synced to grading system!");
      setSyncModalOpen(false);
    } catch (err) {
      toast.error(err.message || "Failed to sync scores to grades.");
    } finally {
      setSyncing(false);
    }
  };

  if (!isOpen || !assessment) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-5xl max-h-[94vh] flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-200">
        
        {/* TOP HEADER */}
        <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-50/90 dark:bg-slate-850/90 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-bold shadow-xs shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100">
                  {assessment.title}
                </h2>
                <span
                  className={clsx(
                    "text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider",
                    assessment.status === "published"
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300"
                      : assessment.status === "closed"
                      ? "bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                      : "bg-amber-100 text-amber-700 dark:bg-amber-950/80 dark:text-amber-300",
                  )}
                >
                  {assessment.status}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-0.5">
                <span>Section {sectionId}</span>
                <span>•</span>
                <span>Term: <strong>{getAssessmentTermLabel(assessment.term)}</strong></span>
                <span>•</span>
                <span>Code: <strong className="font-mono text-emerald-600 dark:text-emerald-400">{assessment.access_code}</strong></span>
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            {/* Share link button */}
            {onOpenShare && (
              <button
                type="button"
                onClick={onOpenShare}
                className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
                title="Open full share modal and instructions"
              >
                <Share2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Share Link</span>
              </button>
            )}

            {/* Export excel */}
            <button
              type="button"
              onClick={handleExportExcel}
              disabled={completedSubmissions.length === 0}
              className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
            >
              <Download className="w-3.5 h-3.5" /> Export
            </button>

            {/* Sync grades */}
            <button
              type="button"
              onClick={() => {
                setSyncTerm(getGradebookTermForAssessmentTerm(assessment.term) || "midterm");
                setSyncColumnKey("");
                setSyncModalOpen(true);
              }}
              disabled={!hasSyncableScores}
              title={!hasSyncableScores ? "Record a score before syncing this assessment." : undefined}
              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-40 transition-colors"
            >
              <UploadCloud className="w-3.5 h-3.5" /> Sync to Gradebook
            </button>

            {/* Close */}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full cursor-pointer ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* STUDENT TAKING LINK BANNER (Clear Visibility & 1-Click Access) */}
        <div className="bg-emerald-50/70 dark:bg-emerald-950/30 border-b border-emerald-200/80 dark:border-emerald-900/60 px-5 py-2.5 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-[11px] font-bold text-emerald-900 dark:text-emerald-200 uppercase tracking-wider shrink-0 flex items-center gap-1">
              <Share2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> Student Test Link:
            </span>
            <code className="text-xs font-mono font-bold text-emerald-700 dark:text-emerald-300 bg-white dark:bg-slate-850 px-2.5 py-1 rounded-lg border border-emerald-200 dark:border-emerald-800 truncate max-w-xs sm:max-w-md select-all">
              {studentLink}
            </code>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyLink}
              className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-850 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 font-bold text-xs flex items-center gap-1 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 cursor-pointer shadow-2xs transition-colors"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedLink ? "Copied!" : "Copy Link"}</span>
            </button>

            <button
              type="button"
              onClick={handleCopyCode}
              className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-850 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 font-bold text-xs flex items-center gap-1 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 cursor-pointer shadow-2xs transition-colors"
            >
              {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              <span>Code: {assessment.access_code}</span>
            </button>

            <button
              type="button"
              onClick={handleOpenStudentView}
              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1 cursor-pointer shadow-2xs transition-colors"
              title="Open the student portal in a new browser tab to test or preview"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Test in New Tab</span>
            </button>
          </div>
        </div>

        {/* METRICS & STATS SUMMARY BAR */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 p-4 bg-slate-100/70 dark:bg-slate-950/40 border-b border-slate-200 dark:border-slate-800 shrink-0 text-xs">
          <div className="p-3 rounded-2xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 shadow-2xs">
            <span className="text-slate-400 font-medium text-[11px] uppercase tracking-wider block">Turned In</span>
            <div className="text-base font-black text-slate-900 dark:text-slate-100 mt-0.5">
              {stats.submittedCount}{" "}
              <span className="text-xs font-normal text-slate-400">/ {stats.totalEnrolled} ({stats.completionRate}%)</span>
            </div>
            <p className="mt-1 text-[10px] text-slate-400">{stats.activeCount} in progress</p>
          </div>

          <div className="p-3 rounded-2xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 shadow-2xs">
            <span className="text-slate-400 font-medium text-[11px] uppercase tracking-wider block">Average Score</span>
            <div className="text-base font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
              {stats.averageScore}{" "}
              <span className="text-xs font-normal text-slate-400">({stats.averagePercentage}%)</span>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 shadow-2xs">
            <span className="text-slate-400 font-medium text-[11px] uppercase tracking-wider block">Passing Rate</span>
            <div className="text-base font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
              {stats.passingRate}%
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 shadow-2xs">
            <span className="text-slate-400 font-medium text-[11px] uppercase tracking-wider block">High / Low Score</span>
            <div className="text-base font-black text-slate-800 dark:text-slate-200 mt-0.5">
              {stats.highestScore} / {stats.lowestScore}
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 shadow-2xs">
            <span className="text-slate-400 font-medium text-[11px] uppercase tracking-wider block">Focus-loss signals</span>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-0.5">
                <ShieldCheck className="w-3.5 h-3.5" /> {stats.cleanIntegrityCount} with none detected
              </span>
              {stats.flaggedIntegrityCount > 0 && (
                <span className="text-amber-600 dark:text-amber-400 font-bold flex items-center gap-0.5">
                  <ShieldAlert className="w-3.5 h-3.5" /> {stats.flaggedIntegrityCount} to review
                </span>
              )}
            </div>
            <p className="mt-1 text-[10px] text-slate-400">
              Browser signals are not proof of misconduct.
            </p>
          </div>
        </div>

        {/* SUB-TOOLBAR: Navigation Tabs & Search */}
        <div className="px-5 py-2.5 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-wrap items-center justify-between gap-3 shrink-0">
          {/* Tabs */}
          <div className="flex items-center gap-2">
            <div className="flex p-0.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setActiveTab("submissions")}
                className={clsx(
                  "px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5",
                  activeTab === "submissions"
                    ? "bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-2xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900",
                )}
              >
                <span>Attempts</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold">
                  {submissions.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("roster")}
                className={clsx(
                  "px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5",
                  activeTab === "roster"
                    ? "bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-2xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900",
                )}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Class Roster Progress</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold">
                  {stats.totalEnrolled}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("analysis")}
                className={clsx(
                  "px-3 py-1.5 rounded-lg transition-all cursor-pointer",
                  activeTab === "analysis"
                    ? "bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-2xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900",
                )}
              >
                Question Analysis
              </button>
            </div>

            {/* Roster-specific status filter */}
            {activeTab === "roster" && (
              <DropdownSelect
                value={rosterFilter}
                onChange={(e) => setRosterFilter(e.target.value)}
                className="text-xs font-semibold pl-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 outline-none cursor-pointer"
              >
                <option value="all">All Enrolled ({rosterData.length})</option>
                <option value="submitted">Submitted ({stats.submittedCount})</option>
                <option value="in_progress">In Progress ({stats.activeCount})</option>
                <option value="not_started">Not Started Yet ({stats.notStartedCount})</option>
              </DropdownSelect>
            )}
          </div>

          {/* Search box & Last updated indicator */}
          {activeTab !== "analysis" && (
            <div className="flex items-center gap-3">
              {lastUpdated && (
                <span className="text-[11px] text-slate-400 hidden sm:inline">
                  Last updated {lastUpdated.toLocaleTimeString()}
                </span>
              )}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="search"
                  placeholder={activeTab === "submissions" ? "Search submitted student..." : "Search class roster..."}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 outline-none w-48 sm:w-60 focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
          )}
        </div>

        {/* MAIN BODY: Tab 1 (Submissions) or Tab 2 (Class Roster Live Status) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : activeTab === "submissions" ? (
            /* TAB 1: SUBMISSIONS TABLE */
            filteredSubmissions.length === 0 ? (
              <div className="py-16 text-center space-y-3">
                <Clock className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto" />
                <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">
                  {searchQuery ? "No matching student submissions found" : "No submissions received yet"}
                </h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Share the link <code className="text-emerald-600 font-mono font-bold">{studentLink}</code> or access code <strong className="text-emerald-600 font-mono">{assessment.access_code}</strong> with your students to begin receiving live submissions.
                </p>
                <div className="pt-2 flex justify-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                  >
                    <Copy className="w-3.5 h-3.5" /> Copy Student Link
                  </button>
                  <button
                    type="button"
                    onClick={handleOpenStudentView}
                    className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center gap-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    <ExternalLink className="w-3.5 h-3.5" /> Test Student Portal
                  </button>
                </div>
              </div>
            ) : (
              <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 dark:bg-slate-850 text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="p-3">#</th>
                      <th className="p-3">Student Name</th>
                      <th className="p-3 text-center">Score</th>
                      <th className="p-3 text-center">%</th>
                      <th className="p-3 text-center">Time Spent</th>
                      <th className="p-3 text-center">Focus-loss signals</th>
                      <th className="p-3 text-center">Status</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-900 font-medium">
                    {filteredSubmissions.map((sub, idx) => {
                      const switchCount = sub.tab_switch_count || 0;
                      const isActiveAttempt = !sub.submitted_at;
                      const formatDuration = (secs) => {
                        const m = Math.floor(secs / 60);
                        const s = secs % 60;
                        return `${m}m ${s}s`;
                      };

                      return (
                        <tr
                          key={sub.id}
                          className="hover:bg-slate-50 dark:hover:bg-slate-850/60 transition-colors"
                        >
                          <td className="p-3 text-slate-400 font-mono">{idx + 1}</td>
                          <td className="p-3">
                            <span className="font-bold text-slate-900 dark:text-slate-100 block">
                              {sub.student_name}
                            </span>
                            {sub.submitted_at ? (
                              <span className="text-[10px] text-slate-400">
                                {new Date(sub.submitted_at).toLocaleString()}
                              </span>
                            ) : (
                              <span className="text-[10px] text-amber-600 dark:text-amber-400">
                                In progress{sub.saved_at ? ` · saved ${new Date(sub.saved_at).toLocaleTimeString()}` : ""}
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-center font-bold text-emerald-700 dark:text-emerald-400">
                            {isActiveAttempt ? "—" : `${sub.score} / ${sub.total_points}`}
                          </td>
                          <td className="p-3 text-center font-bold">
                            {isActiveAttempt ? (
                              <span className="text-slate-400">—</span>
                            ) : <span
                              className={clsx(
                                "px-2.5 py-0.5 rounded-full text-[11px]",
                                parseFloat(sub.percentage) >= (assessment.passing_percentage || 50)
                                  ? "bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300"
                                  : "bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300",
                              )}
                            >
                              {sub.percentage}%
                            </span>}
                          </td>
                          <td className="p-3 text-center text-slate-500 font-mono">
                            {formatDuration(sub.time_spent_seconds || 0)}
                          </td>
                          <td className="p-3 text-center">
                            {switchCount === 0 ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 bg-slate-50 dark:bg-slate-800 px-2.5 py-0.5 rounded-full border border-slate-200 dark:border-slate-700">
                                <ShieldCheck className="w-3.5 h-3.5" /> None detected
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setSelectedIntegrityLog(sub)}
                                className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 dark:bg-amber-950/40 px-2.5 py-0.5 rounded-full border border-amber-200 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-900/40 cursor-pointer"
                                title="Review recorded browser focus events"
                              >
                                <ShieldAlert className="w-3.5 h-3.5" /> Review {switchCount} event{switchCount > 1 ? "s" : ""}
                              </button>
                            )}
                          </td>
                          <td className="p-3 text-center">
                            <span
                              className={clsx(
                                "text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded",
                                sub.status === "graded"
                                  ? "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                                  : sub.status === "submitted"
                                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                                  : "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
                              )}
                            >
                              {isActiveAttempt ? "In progress" : sub.status}
                            </span>
                          </td>
                          <td className="p-3 text-right">
                            {isActiveAttempt ? (
                              <span className="text-[11px] text-slate-400">In progress</span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => onOpenReview && onOpenReview(sub, assessment, () => fetchSubmissions(false))}
                                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs flex items-center gap-1 inline-flex cursor-pointer transition-colors"
                              >
                                <Eye className="w-3.5 h-3.5" /> Review & Grade
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )
          ) : activeTab === "roster" ? (
            /* TAB 2: CLASS ROSTER LIVE TRACKING */
            filteredRoster.length === 0 ? (
              <div className="py-16 text-center space-y-3">
                <Users className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto" />
                <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">
                  No enrolled students found matching filters
                </h3>
                <p className="text-xs text-slate-500">
                  Try clearing the search query or status filter.
                </p>
              </div>
            ) : (
              <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 dark:bg-slate-850 text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="p-3">#</th>
                      <th className="p-3">Enrolled Student</th>
                      <th className="p-3 text-center">Live Status</th>
                      <th className="p-3 text-center">Score / Grade</th>
                      <th className="p-3 text-center">Integrity Status</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-900 font-medium">
                    {filteredRoster.map((item, idx) => {
                      const sub = item.submission;
                      const hasSubmitted = Boolean(sub?.submitted_at);
                      const isActiveAttempt = Boolean(sub && !sub.submitted_at);

                      return (
                        <tr
                          key={item.id}
                          className="hover:bg-slate-50 dark:hover:bg-slate-850/60 transition-colors"
                        >
                          <td className="p-3 text-slate-400 font-mono">{idx + 1}</td>
                          <td className="p-3">
                            <span className="font-bold text-slate-900 dark:text-slate-100">
                              {item.name}
                            </span>
                            {!item.isEnrolled && (
                              <span className="ml-2 px-1.5 py-0.2 rounded bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 text-[10px] font-bold">
                                Guest
                              </span>
                            )}
                          </td>

                          {/* Live Status */}
                          <td className="p-3 text-center">
                            {hasSubmitted ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Submitted
                              </span>
                            ) : isActiveAttempt ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300">
                                <Clock className="w-3.5 h-3.5" /> In Progress
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                                <Clock className="w-3.5 h-3.5" /> Not Started
                              </span>
                            )}
                          </td>

                          {/* Score / Grade */}
                          <td className="p-3 text-center">
                            {hasSubmitted ? (
                              <span className="font-bold text-emerald-700 dark:text-emerald-400">
                                {sub.score} / {sub.total_points} ({sub.percentage}%)
                              </span>
                            ) : isActiveAttempt ? (
                              <span className="text-slate-400 italic">Not submitted</span>
                            ) : (
                              <span className="text-slate-400 italic">--</span>
                            )}
                          </td>

                          {/* Integrity */}
                          <td className="p-3 text-center">
                            {hasSubmitted || isActiveAttempt ? (
                              (sub.tab_switch_count || 0) === 0 ? (
                                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                                  <ShieldCheck className="w-3.5 h-3.5" /> None detected
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setSelectedIntegrityLog(sub)}
                                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 dark:bg-amber-950/40 px-2.5 py-0.5 rounded-full border border-amber-200 dark:border-amber-800 hover:bg-amber-100 cursor-pointer"
                                >
                                  <ShieldAlert className="w-3.5 h-3.5" /> Review {sub.tab_switch_count} event{sub.tab_switch_count > 1 ? "s" : ""}
                                </button>
                              )
                            ) : (
                              <span className="text-slate-400 italic">Pending Start</span>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="p-3 text-right">
                            {hasSubmitted ? (
                              <button
                                type="button"
                                onClick={() => onOpenReview && onOpenReview(sub, assessment, () => fetchSubmissions(false))}
                                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs flex items-center gap-1 inline-flex cursor-pointer transition-colors"
                              >
                                <Eye className="w-3.5 h-3.5" /> Review
                              </button>
                            ) : isActiveAttempt ? (
                              <span className="text-[11px] text-slate-400">In progress</span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleCopyStudentPersonalLink(item)}
                                className="px-2.5 py-1 rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 font-semibold text-xs flex items-center gap-1 inline-flex cursor-pointer transition-colors shadow-2xs"
                                title={`Copy personalized direct link for ${item.name}`}
                              >
                                <Copy className="w-3 h-3" /> Copy Personal Link
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )
          ) : (
            <div className="space-y-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Question Analysis</h3>
                <p className="mt-1 text-xs text-slate-500">
                  Average scores use responses with an available grade. Pending manual reviews are excluded; results are descriptive, not a judgment of question quality.
                </p>
              </div>
              {questionAnalytics.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-500">
                  This assessment has no questions to analyze.
                </div>
              ) : (
                <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-2xl">
                  <table className="w-full min-w-[680px] text-xs text-left">
                    <thead className="bg-slate-50 dark:bg-slate-850 text-slate-500 uppercase tracking-wider text-[10px]">
                      <tr>
                        <th className="p-3">Item</th>
                        <th className="p-3">Question</th>
                        <th className="p-3 text-center">Responses graded</th>
                        <th className="p-3 text-center">Average earned</th>
                        <th className="p-3 text-center">Manual review</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-900">
                      {questionAnalytics.map((item) => (
                        <tr key={item.id}>
                          <td className="p-3 align-top">
                            <span className="font-bold text-slate-800 dark:text-slate-200">Q{item.number}</span>
                            <span className="mt-1 block text-[10px] text-slate-500 uppercase">{item.type}</span>
                          </td>
                          <td className="p-3 max-w-xl text-slate-700 dark:text-slate-300">
                            <p className="line-clamp-2">{item.prompt}</p>
                          </td>
                          <td className="p-3 text-center text-slate-600 dark:text-slate-300">{item.responseCount}</td>
                          <td className="p-3 text-center font-semibold text-slate-700 dark:text-slate-200">
                            {item.averagePercentage === null
                              ? "No graded responses"
                              : `${item.averagePercentage.toFixed(1)}% of ${item.maxPoints} pts`}
                          </td>
                          <td className="p-3 text-center">
                            {item.pendingReviews > 0
                              ? <span className="text-amber-700 dark:text-amber-400">{item.pendingReviews} pending</span>
                              : <span className="text-slate-400">None</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sync to Section Grades Modal */}
        {syncModalOpen && (
          <div className="fixed inset-0 z-60 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <UploadCloud className="w-5 h-5 text-emerald-600" />
                  <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                    Sync Scores into Section Grading Sheet
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setSyncModalOpen(false)}
                  className="p-1 rounded-full text-slate-400 hover:text-slate-700"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-xs text-slate-500">
                {assessment.type === "recitation"
                  ? `Recalculate RT from online and in-person recitations in ${recitationPeriodLabels}. Existing RT values for students with records will be replaced; totals are capped at the RT maximum.`
                  : `Sync ${completedSubmissions.length} completed student score${completedSubmissions.length === 1 ? "" : "s"} from this assessment into the matching gradebook column for Section ${sectionId}. Scores are scaled to that column's configured maximum.`}
              </p>

              <div className="space-y-3 text-xs">
                {assessment.type === "exam" && examGradeTarget ? (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/60">
                    <p className="font-bold text-slate-800 dark:text-slate-200">
                      Grade term: {examGradeTarget.gradebookTerm === "midterm" ? "Midterm" : "Finals"}
                    </p>
                    <p className="mt-1 text-[11px] text-slate-500">
                      {getAssessmentTermLabel(assessment.term)} is automatically matched to its gradebook term.
                    </p>
                  </div>
                ) : (
                  <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Grade term:
                  </label>
                  <DropdownSelect
                    value={syncTerm}
                    onChange={(e) => setSyncTerm(e.target.value)}
                    className="w-full pl-2 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-semibold cursor-pointer"
                  >
                    <option value="midterm">Midterm</option>
                    <option value="finals">Finals</option>
                  </DropdownSelect>
                  </div>
                )}

                {assessment.type === "quiz" ? (
                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      Gradebook quiz/activity column:
                    </label>
                    <DropdownSelect
                      value={syncColumnKey}
                      onChange={(e) => setSyncColumnKey(e.target.value)}
                      disabled={gradeConfigLoading || gradeQuizItems.length === 0}
                      className="w-full pl-2 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-semibold cursor-pointer"
                    >
                      <option value="" disabled>
                        {gradeConfigLoading
                          ? "Loading gradebook columns…"
                          : "Select a gradebook column"}
                      </option>
                      {gradeQuizItems.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name || item.id} (max {item.max})
                        </option>
                      ))}
                    </DropdownSelect>
                    <p className="mt-1 text-[11px] leading-4 text-slate-500">
                      A matching column name is selected from the assessment title when possible. Confirm the destination before syncing.
                    </p>
                    {!gradeConfigLoading && gradeQuizItems.length === 0 && (
                      <p className="mt-1 text-[11px] text-amber-700 dark:text-amber-300" role="status">
                        No quiz/activity columns are configured for this term. Add one in the grade input sheet first.
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/60">
                    <p className="font-bold text-slate-800 dark:text-slate-200">
                      {assessment.type === "exam"
                        ? `Destination: ${examGradeTarget?.columnLabel || "ME (Major Exam)"}, max ${gradeConfig?.[examGradeTarget?.maxKey || "me_max"] ?? "—"}`
                        : `Destination: RT (Recitation Total), max ${gradeConfig?.rt_max ?? "—"}`}
                    </p>
                    <p className="mt-1 text-[11px] leading-4 text-slate-500">
                      {assessment.type === "exam"
                        ? `Scores are scaled to the configured ${examGradeTarget?.scoreKey.toUpperCase() || "ME"} maximum in Grade Input Ground.`
                        : "Online submissions and in-person studio scores from all recitations in this term are added together and capped at the RT maximum."}
                    </p>
                  </div>
                )}
                {gradeConfigLoading && (
                  <p className="text-[11px] text-slate-500" role="status">
                    Loading gradebook settings…
                  </p>
                )}
                {gradeConfigError && (
                  <p className="text-[11px] text-red-600" role="alert">
                    {gradeConfigError}
                  </p>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSyncModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={
                    syncing ||
                    gradeConfigLoading ||
                    Boolean(gradeConfigError) ||
                    !gradeConfig ||
                    (assessment.type === "quiz" && !selectedQuizItem) ||
                    (assessment.type === "recitation" && !hasSyncableScores)
                  }
                  onClick={handleSyncToGrades}
                  className="px-4 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {syncing
                    ? "Syncing..."
                    : assessment.type === "recitation"
                      ? "Recalculate RT"
                      : "Sync to Gradebook"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Selected Integrity Log Modal */}
        {selectedIntegrityLog && (
          <div className="fixed inset-0 z-60 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2 text-rose-600">
                  <ShieldAlert className="w-5 h-5" />
                  <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                    Focus-loss log: {selectedIntegrityLog.student_name}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedIntegrityLog(null)}
                  className="p-1 rounded-full text-slate-400 hover:text-slate-700"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-xs text-slate-500">
                Focus changes recorded:{" "}
                <strong className="text-rose-600">{selectedIntegrityLog.tab_switch_count}</strong>
              </p>
              <p className="text-xs text-slate-500">
                These browser events can have ordinary causes and are not proof of misconduct. Use them as context for a teacher review, not as an automatic penalty.
              </p>

              <div className="max-h-60 overflow-y-auto space-y-2 text-xs font-mono">
                {(selectedIntegrityLog.integrity_log || []).length === 0 ? (
                  <p className="text-slate-400 italic">No timestamp details recorded.</p>
                ) : (
                  selectedIntegrityLog.integrity_log.map((log, idx) => (
                    <div
                      key={idx}
                      className="p-2 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-800 dark:text-rose-300 text-[11px] flex items-center justify-between"
                    >
                      <span>Event: {log.event || "tab_switch"}</span>
                      <span>{log.timestamp ? new Date(log.timestamp).toLocaleTimeString() : `#${idx + 1}`}</span>
                    </div>
                  ))
                )}
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedIntegrityLog(null)}
                  className="px-4 py-2 text-xs font-bold rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
