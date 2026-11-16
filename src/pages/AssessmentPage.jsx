import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import {
  Plus,
  Search,
  FileText,
  Printer,
  Share2,
  Users,
  ClipboardCheck,
  Trash2,
  Edit,
  Code2,
  Clock,
  ShieldCheck,
  ShieldAlert,
  Calendar,
  CheckCircle2,
  Copy,
  ExternalLink,
  RotateCcw,
  LogOut,
  ChevronRight,
  BookOpen,
  LayoutGrid,
  List,
} from "lucide-react";
import clsx from "clsx";
import api from "../lib/api";
import { useToast } from "../context/ToastContext";
import useSettings from "../hooks/useSettings";
import SectionPageHeader from "../components/SectionPageHeader";
import ConfirmModal from "../components/ConfirmModal";
import DropdownSelect from "../components/DropdownSelect";
import {
  ASSESSMENT_TERM_OPTIONS,
  getAssessmentTermLabel,
} from "../../shared/assessmentTerms";
import AssessmentBuilderModal from "../components/assessment/AssessmentBuilderModal";
import PrintAssessmentModal from "../components/assessment/PrintAssessmentModal";
import AssessmentMonitorModal from "../components/assessment/AssessmentMonitorModal";
import StudentReviewModal from "../components/assessment/StudentReviewModal";
import RecitationStudioModal from "../components/assessment/RecitationStudioModal";
import ShareAssessmentModal from "../components/assessment/ShareAssessmentModal";

const getAssessmentResponseCount = (assessment) => (
  Number(assessment.submission_count || 0) +
  (assessment.type === "recitation" ? Number(assessment.recitation_count || 0) : 0)
);

const getAssessmentTypeLabel = (type) => (
  type === "recitation" ? "Recitation" : type === "exam" ? "Exam" : "Quiz"
);

export default function AssessmentPage({
  sectionId,
  onBack,
  onSignOut,
  onSwitchToAttendance,
  onSwitchToGrading,
}) {
  const toast = useToast();
  const { appConfig } = useSettings();
  const [assessments, setAssessments] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all"); // 'all' | 'coding' | 'exam' | 'quiz' | 'recitation'
  const [termFilter, setTermFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("updated");
  const [viewMode, setViewMode] = useState("grid"); // 'grid' | 'table'
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [publishTarget, setPublishTarget] = useState(null);
  const publishConfirmationResolver = useRef(null);

  // Modals
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [selectedAssessmentForEdit, setSelectedAssessmentForEdit] = useState(null);

  const [isPrintOpen, setIsPrintOpen] = useState(false);
  const [selectedAssessmentForPrint, setSelectedAssessmentForPrint] = useState(null);

  const [isMonitorOpen, setIsMonitorOpen] = useState(false);
  const [selectedAssessmentForMonitor, setSelectedAssessmentForMonitor] = useState(null);

  const [isRecitationOpen, setIsRecitationOpen] = useState(false);
  const [selectedAssessmentForRecitation, setSelectedAssessmentForRecitation] = useState(null);

  const [isShareOpen, setIsShareOpen] = useState(false);
  const [selectedAssessmentForShare, setSelectedAssessmentForShare] = useState(null);

  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [selectedSubmissionForReview, setSelectedSubmissionForReview] = useState(null);
  const [selectedAssessmentForReview, setSelectedAssessmentForReview] = useState(null);
  const [onReviewGradedCallback, setOnReviewGradedCallback] = useState(null);

  const fetchAssessments = useCallback(async () => {
    try {
      const data = await api.getAssessments(sectionId);
      setAssessments(data || []);
    } catch (err) {
      toast.error(err.message || "Failed to load assessments.");
    } finally {
      setLoading(false);
    }
  }, [sectionId, toast]);

  const fetchStudents = useCallback(async () => {
    try {
      const data = await api.getStudents(sectionId);
      setStudents(data || []);
    } catch {
      // ignore
    }
  }, [sectionId]);

  useEffect(() => {
    setLoading(true);
    fetchAssessments();
    fetchStudents();
  }, [fetchAssessments, fetchStudents]);

  const handleSaveAssessment = async (payload) => {
    if (selectedAssessmentForEdit?.id) {
      const updated = await api.updateAssessment(sectionId, selectedAssessmentForEdit.id, payload);
      toast.success("Assessment updated successfully!");
      fetchAssessments();
      return updated;
    } else {
      const created = await api.createAssessment(sectionId, payload);
      toast.success("Assessment created successfully!");
      fetchAssessments();
      return created;
    }
  };

  const handleDeleteAssessment = (assessment) => {
    setDeleteTarget(assessment);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget?.id) return;
    setIsDeleting(true);
    try {
      await api.deleteAssessment(sectionId, deleteTarget.id);
      setDeleteTarget(null);
      toast.success("Assessment deleted successfully.");
      fetchAssessments();
    } catch (err) {
      toast.error(err.message || "Failed to delete assessment.");
    } finally {
      setIsDeleting(false);
    }
  };

  const resolvePublishConfirmation = (confirmed) => {
    const resolve = publishConfirmationResolver.current;
    publishConfirmationResolver.current = null;
    setPublishTarget(null);
    resolve?.(confirmed);
  };

  const handleStatusChange = async (assessment, newStatus) => {
    if (!assessment?.id) return;
    const cleanStatus = typeof newStatus === "string" ? newStatus.toLowerCase().trim() : "";
    if (!["draft", "published", "closed"].includes(cleanStatus)) {
      return false;
    }
    if (cleanStatus === "published" && !(assessment.questions || []).length) {
      toast.error(
        assessment.type === "recitation"
          ? "Add questions to publish an online recitation. For an in-person recitation, keep it as a draft and use Record In-Person Recitation."
          : "Add at least one question before publishing this assessment.",
      );
      return false;
    }
    if (cleanStatus === "published" && assessment.status !== "published") {
      setPublishTarget(assessment);
      const confirmed = await new Promise((resolve) => {
        publishConfirmationResolver.current = resolve;
      });
      if (!confirmed) {
        return false;
      }
    }
    try {
      await api.updateAssessment(sectionId, assessment.id, {
        status: cleanStatus,
      });
      toast.success(`Assessment status changed to ${cleanStatus.toUpperCase()}`);
      fetchAssessments();
      return true;
    } catch (err) {
      toast.error(err.message || "Failed to change status.");
      return false;
    }
  };

  const assessmentSummary = useMemo(() => ({
    total: assessments.length,
    published: assessments.filter((a) => a.status === "published").length,
    drafts: assessments.filter((a) => a.status === "draft").length,
    responses: assessments.reduce((sum, assessment) => sum + getAssessmentResponseCount(assessment), 0),
  }), [assessments]);

  const filteredAssessments = useMemo(() => {
    const filtered = assessments.filter((a) => {
      const matchesSearch =
        !searchQuery.trim() ||
        a.title?.toLowerCase().includes(searchQuery.trim().toLowerCase()) ||
        a.subject?.toLowerCase().includes(searchQuery.trim().toLowerCase());

      const matchesType =
        typeFilter === "all" ||
        (typeFilter === "coding"
          ? (a.questions || []).some((q) => q.type === "coding")
          : a.type === typeFilter);

      const matchesTerm = termFilter === "all" || a.term === termFilter;
      const matchesStatus = statusFilter === "all" || a.status === statusFilter;

      return matchesSearch && matchesType && matchesTerm && matchesStatus;
    });

    return filtered.sort((a, b) => {
      if (sortBy === "title") return (a.title || "").localeCompare(b.title || "");
      if (sortBy === "responses") {
        const aCount = getAssessmentResponseCount(a);
        const bCount = getAssessmentResponseCount(b);
        return bCount - aCount || new Date(b.updated_at || b.created_at || 0) - new Date(a.updated_at || a.created_at || 0);
      }
      return new Date(b.updated_at || b.created_at || 0) - new Date(a.updated_at || a.created_at || 0);
    });
  }, [assessments, searchQuery, typeFilter, termFilter, statusFilter, sortBy]);

  const clearFilters = () => {
    setSearchQuery("");
    setTypeFilter("all");
    setTermFilter("all");
    setStatusFilter("all");
  };

  const handleOpenShare = (assessment) => {
    setSelectedAssessmentForShare(assessment);
    setIsShareOpen(true);
  };

  const handleExportAssessments = async () => {
    if (assessments.length === 0) return;

    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Assessments");
      worksheet.columns = [
        { header: "Title", key: "title", width: 32 },
        { header: "Type", key: "type", width: 16 },
        { header: "Subject", key: "subject", width: 24 },
        { header: "Term", key: "term", width: 14 },
        { header: "Status", key: "status", width: 14 },
        { header: "Questions", key: "question_count", width: 12 },
        { header: "Total Points", key: "total_points", width: 14 },
        { header: "Time Limit (min)", key: "time_limit_minutes", width: 18 },
        { header: "Passing Percentage", key: "passing_percentage", width: 20 },
        { header: "Responses", key: "response_count", width: 12 },
      ];

      assessments.forEach((assessment) => {
        const questions = Array.isArray(assessment.questions) ? assessment.questions : [];
        worksheet.addRow({
          title: assessment.title || "",
          type: assessment.type || "",
          subject: assessment.subject || "",
          term: getAssessmentTermLabel(assessment.term),
          status: assessment.status || "",
          question_count: questions.length,
          total_points: questions.reduce(
            (total, question) => total + (parseFloat(question.points) || 1),
            0,
          ),
          time_limit_minutes: Number(assessment.time_limit_minutes) || 0,
          passing_percentage: Number(assessment.passing_percentage) || 0,
          response_count: getAssessmentResponseCount(assessment),
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
      saveAs(blob, `Assessments_Section_${sectionId}.xlsx`);
      toast.success("Assessment list exported successfully.");
    } catch (err) {
      toast.error(err.message || "Failed to export assessments.");
    }
  };

  return (
    <div className="flex flex-col h-screen bg-slate-50 dark:bg-slate-950 font-sans text-slate-800 dark:text-slate-100 overflow-hidden">
      {/* SECTION PAGE HEADER */}
      <SectionPageHeader
        sectionId={sectionId}
        appConfig={appConfig}
        workspace="assessments"
        onBack={onBack}
        onSwitchWorkspace={(ws) => {
          if (ws === "attendance" && onSwitchToAttendance) onSwitchToAttendance();
          if (ws === "grading" && onSwitchToGrading) onSwitchToGrading();
        }}
        onExport={handleExportAssessments}
        exportDisabled={loading || assessments.length === 0}
        primaryAction={{
          label: "New assessment",
          onClick: () => {
            setSelectedAssessmentForEdit(null);
            setIsBuilderOpen(true);
          },
          title: "Create an exam, quiz, or recitation",
          ariaLabel: "Create assessment",
        }}
        overflowActions={[
          { label: "Sign out", icon: LogOut, onSelect: onSignOut, danger: true },
        ]}
        overflowLabel="More assessment actions"
      />

      {/* SUB-TOOLBAR: Filters & Search */}
      <div className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 shrink-0 shadow-2xs">
        {/* Left Filter Group */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Type Filters */}
          <div className="flex p-0.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-semibold">
            {[
              { id: "all", label: "All Items" },
              { id: "coding", label: "Coding Items" },
              { id: "exam", label: "Exams" },
              { id: "quiz", label: "Quizzes" },
              { id: "recitation", label: "Recitations" },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTypeFilter(t.id)}
                className={clsx(
                  "px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap",
                  typeFilter === t.id
                    ? "bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-2xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900",
                )}
              >
                <span>{t.label}</span>
              </button>
            ))}
          </div>

          <div className="h-4 w-[1px] bg-slate-200 dark:bg-slate-700 mx-1"></div>

          {/* Term Filter */}
          <DropdownSelect
            value={termFilter}
            onChange={(e) => setTermFilter(e.target.value)}
            aria-label="Filter by term"
            className="text-xs font-semibold pl-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-emerald-500/40 cursor-pointer"
          >
            <option value="all">All Terms</option>
            {ASSESSMENT_TERM_OPTIONS.map(({ value, label }) => (
              <option key={value} value={value}>{label}</option>
            ))}
            <option value="semestral">Semestral (existing)</option>
          </DropdownSelect>

          <DropdownSelect
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            aria-label="Filter by status"
            className="text-xs font-semibold pl-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-emerald-500/40 cursor-pointer"
          >
            <option value="all">All Statuses</option>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
            <option value="closed">Closed</option>
          </DropdownSelect>
        </div>

        {/* Right Search Input & View Toggle */}
        <div className="flex flex-wrap items-center gap-2">
          <DropdownSelect
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            aria-label="Sort assessments"
            className="text-xs font-semibold pl-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 outline-none cursor-pointer"
          >
            <option value="updated">Recently updated</option>
            <option value="title">Title A–Z</option>
            <option value="responses">Most responses</option>
          </DropdownSelect>
          <div className="flex p-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500">
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              className={clsx(
                "p-1.5 rounded-md transition-all cursor-pointer",
                viewMode === "grid" ? "bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-2xs" : "hover:text-slate-800 dark:hover:text-slate-200",
              )}
              title="Card Grid View"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={clsx(
                "p-1.5 rounded-md transition-all cursor-pointer",
                viewMode === "table" ? "bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-2xs" : "hover:text-slate-800 dark:hover:text-slate-200",
              )}
              title="Compact Table View"
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              placeholder="Search assessment..."
              aria-label="Search assessments by title or subject"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 outline-none w-44 sm:w-56 focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>
      </div>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 overflow-y-auto p-4 md:p-6 max-w-[1920px] mx-auto w-full">
        {!loading && assessments.length > 0 && (
          <section aria-label="Assessment overview" className="grid grid-cols-2 xl:grid-cols-4 gap-3 mb-5">
            {[
              { label: "Total assessments", value: assessmentSummary.total, color: "text-slate-900 dark:text-slate-100" },
              { label: "Published", value: assessmentSummary.published, color: "text-emerald-600 dark:text-emerald-400" },
              { label: "Drafts", value: assessmentSummary.drafts, color: "text-amber-600 dark:text-amber-400" },
              { label: "Student responses", value: assessmentSummary.responses, color: "text-emerald-600 dark:text-emerald-400" },
            ].map((stat) => (
              <div key={stat.label} className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3 shadow-xs">
                <p className="text-[11px] font-semibold text-slate-500">{stat.label}</p>
                <p className={clsx("mt-1 text-xl font-bold", stat.color)}>{stat.value}</p>
              </div>
            ))}
          </section>
        )}
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : filteredAssessments.length === 0 ? (
          <div className="py-20 text-center space-y-4 max-w-md mx-auto">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-xs border border-emerald-200 dark:border-emerald-800">
              <FileText className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100">
                {searchQuery || typeFilter !== "all" || termFilter !== "all" || statusFilter !== "all"
                  ? "No matching assessments found"
                  : "No assessments created yet"}
              </h3>
              <p className="text-xs text-slate-500">
                {searchQuery || typeFilter !== "all" || termFilter !== "all" || statusFilter !== "all"
                  ? "Try adjusting your search or filters."
                  : `Create exams, quizzes, and online or in-person recitations for Section ${sectionId}.`}
              </p>
            </div>
            {assessments.length === 0 ? (
              <button
                type="button"
                onClick={() => {
                  setSelectedAssessmentForEdit(null);
                  setIsBuilderOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm cursor-pointer transition-colors"
              >
                <Plus className="w-4 h-4" /> Create First Assessment
              </button>
            ) : (
              <button
                type="button"
                onClick={clearFilters}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold text-xs cursor-pointer transition-colors"
              >
                Clear filters
              </button>
            )}
          </div>
        ) : viewMode === "table" ? (
          /* Sleek Compact Table View */
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-850 border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase tracking-wider font-bold text-[10px]">
                    <th className="py-3 px-4">Title & Details</th>
                    <th className="py-3 px-3">Type</th>
                    <th className="py-3 px-3">Term</th>
                    <th className="py-3 px-3">Items / Points</th>
                    <th className="py-3 px-3">Responses</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                  {filteredAssessments.map((item) => {
                    const questions = item.questions || [];
                    const totalPoints = questions.reduce((sum, q) => sum + (parseFloat(q.points) || 1), 0);
                    const isRecitation = item.type === "recitation";
                    const hasCoding = questions.some((q) => q.type === "coding");

                    return (
                      <tr key={item.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-850/50 transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <div>
                              <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                                <span>{item.title}</span>
                                {hasCoding && (
                                  <span className="px-1.5 py-0.2 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold">
                                    <Code2 className="w-3 h-3" /> Code
                                  </span>
                                )}
                              </div>
                              {item.subject && (
                                <span className="text-[11px] text-slate-400">{item.subject}</span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={clsx(
                              "px-2 py-0.5 rounded-md text-[10px] font-bold uppercase",
                              item.type === "exam"
                                ? "bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300"
                                : item.type === "recitation"
                                ? "bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300"
                                : "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300",
                            )}
                          >
                            {getAssessmentTypeLabel(item.type)}
                          </span>
                        </td>
                        <td className="py-3 px-3 uppercase text-[11px] font-bold text-slate-400">
                          {item.term}
                        </td>
                        <td className="py-3 px-3">
                          <span className="font-bold text-slate-800 dark:text-slate-200">{questions.length} items</span>
                          <span className="text-slate-400 text-[11px] ml-1">({totalPoints} pts)</span>
                        </td>
                        <td className="py-3 px-3 font-bold text-emerald-600 dark:text-emerald-400">
                          {isRecitation
                            ? `${item.submission_count || 0} online · ${item.recitation_count || 0} in person`
                            : `${item.submission_count || 0} turned in`}
                        </td>
                        <td className="py-3 px-3">
                          <DropdownSelect
                            value={item.status}
                            onChange={(e) => handleStatusChange(item, e.target.value)}
                            aria-label={`Set status for ${item.title}`}
                            className={clsx(
                              "text-[10px] font-bold uppercase tracking-wider pl-2 py-0.5 rounded-md border outline-none cursor-pointer",
                              item.status === "published"
                                ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border-emerald-300"
                                : item.status === "closed"
                                ? "bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-300"
                                : "bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border-amber-300",
                            )}
                          >
                            <option value="draft">Draft</option>
                            <option value="published">Published</option>
                            <option value="closed">Closed</option>
                          </DropdownSelect>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {isRecitation && (
                              <button
                                type="button"
                                aria-label={`Record in-person recitation for ${item.title}`}
                                onClick={() => {
                                  setSelectedAssessmentForRecitation(item);
                                  setIsRecitationOpen(true);
                                }}
                                className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1.5 text-[10px] font-bold text-emerald-700 transition-colors hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 dark:hover:bg-emerald-900/70"
                                title="Record In-Person Recitation"
                              >
                                <ClipboardCheck className="h-3.5 w-3.5" />
                                Record
                              </button>
                            )}
                            <button
                              type="button"
                              aria-label={`Print ${item.title}`}
                              onClick={() => {
                                setSelectedAssessmentForPrint(item);
                                setIsPrintOpen(true);
                              }}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                              title="Print assessment"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              aria-label={`Monitor submissions for ${item.title}`}
                              onClick={() => {
                                setSelectedAssessmentForMonitor(item);
                                setIsMonitorOpen(true);
                              }}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                              title="View online submissions"
                            >
                              <Users className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              aria-label={`Share ${item.title}`}
                              onClick={() => handleOpenShare(item)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                              title="Share Assessment Link & Code"
                            >
                              <Share2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              aria-label={`Edit ${item.title}`}
                              onClick={() => {
                                setSelectedAssessmentForEdit(item);
                                setIsBuilderOpen(true);
                              }}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800"
                              title="Edit Assessment"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              aria-label={`Delete ${item.title}`}
                              onClick={() => handleDeleteAssessment(item)}
                              className="p-1.5 rounded-lg text-rose-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/60"
                              title="Delete"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* Sleek Card Grid View */
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {filteredAssessments.map((item) => {
              const questions = item.questions || [];
              const totalPoints = questions.reduce((sum, q) => sum + (parseFloat(q.points) || 1), 0);
              const isRecitation = item.type === "recitation";
              const hasCoding = questions.some((q) => q.type === "coding");

              return (
                <div
                  key={item.id}
                  className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-3.5 group"
                >
                  {/* Top Card Meta */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={clsx(
                            "px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider",
                            item.type === "exam"
                              ? "bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300"
                              : item.type === "recitation"
                              ? "bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300"
                              : "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300",
                          )}
                        >
                          {getAssessmentTypeLabel(item.type)}
                        </span>

                        {hasCoding && (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                            <Code2 className="w-3 h-3 inline mr-1" /> Code Practical
                          </span>
                        )}

                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          {item.term}
                        </span>
                      </div>

                      {/* Status toggle */}
                      <DropdownSelect
                        value={item.status}
                        onChange={(e) => handleStatusChange(item, e.target.value)}
                        aria-label={`Set status for ${item.title}`}
                        className={clsx(
                          "text-[10px] font-bold uppercase tracking-wider pl-2 py-0.5 rounded-md border outline-none cursor-pointer",
                          item.status === "published"
                            ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border-emerald-300"
                            : item.status === "closed"
                            ? "bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-300"
                            : "bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border-amber-300",
                        )}
                      >
                        <option value="draft">Draft</option>
                        <option value="published">Published</option>
                        <option value="closed">Closed</option>
                      </DropdownSelect>
                    </div>

                    <div>
                      <h4 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                        {item.title}
                      </h4>
                      {item.subject && (
                        <p className="text-xs font-medium text-slate-500 mt-0.5">
                          {item.subject}
                        </p>
                      )}
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-1 p-2 rounded-xl bg-slate-50 dark:bg-slate-850 text-center text-xs">
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-semibold block">Items</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">{questions.length}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-semibold block">Points</span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">{totalPoints} pts</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                          Responses
                        </span>
                        {isRecitation ? (
                          <span className="font-semibold text-[10px] text-emerald-700 dark:text-emerald-300">
                            {item.submission_count || 0} online · {item.recitation_count || 0} in person
                          </span>
                        ) : (
                          <span className="font-bold text-emerald-600 dark:text-emerald-400">
                            {item.submission_count || 0}
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="mt-1 text-[10px] text-slate-500 text-center">
                      {item.time_limit_minutes > 0 ? `${item.time_limit_minutes} min limit` : "No time limit"}
                      {" · "}{item.passing_percentage ?? 50}% to pass
                    </p>
                  </div>

                  {/* Actions Grid */}
                  <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                    {isRecitation && (
                      <button
                        type="button"
                        aria-label={`Open recitation studio for ${item.title}`}
                        onClick={() => {
                          setSelectedAssessmentForRecitation(item);
                          setIsRecitationOpen(true);
                        }}
                        className="w-full py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm shadow-emerald-900/10 cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900"
                      >
                        <ClipboardCheck className="w-3.5 h-3.5" /> Record In-Person Recitation
                      </button>
                    )}
                    <div className="grid grid-cols-3 gap-1.5">
                      <button
                        type="button"
                        aria-label={`Print ${item.title}`}
                        onClick={() => {
                          setSelectedAssessmentForPrint(item);
                          setIsPrintOpen(true);
                        }}
                        className="py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold text-xs flex items-center justify-center gap-1 cursor-pointer transition-colors"
                        title="Print assessment"
                      >
                        <Printer className="w-3.5 h-3.5 text-emerald-600" /> Print
                      </button>

                      <button
                        type="button"
                        aria-label={`Monitor submissions for ${item.title}`}
                        onClick={() => {
                          setSelectedAssessmentForMonitor(item);
                          setIsMonitorOpen(true);
                        }}
                        className="py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold text-xs flex items-center justify-center gap-1 cursor-pointer transition-colors"
                        title="Monitor online submissions"
                      >
                        <Users className="w-3.5 h-3.5 text-emerald-600" /> Monitor
                      </button>

                      <button
                        type="button"
                        aria-label={`Share ${item.title}`}
                        onClick={() => handleOpenShare(item)}
                        className="py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-semibold text-xs flex items-center justify-center gap-1 cursor-pointer transition-colors"
                        title="Share the online assessment link"
                      >
                        <Share2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> Share
                      </button>
                    </div>

                    {/* Secondary link / code row */}
                    <div className="flex items-center justify-between text-xs pt-0.5">
                      <button
                        type="button"
                        onClick={() => handleOpenShare(item)}
                        className="text-emerald-600 dark:text-emerald-400 font-mono text-[11px] font-bold hover:underline flex items-center gap-1 cursor-pointer"
                        title="View student link & access code"
                      >
                        <Share2 className="w-3 h-3" />
                        <span>Code: {item.access_code}</span>
                      </button>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          aria-label={`Edit ${item.title}`}
                          onClick={() => {
                            setSelectedAssessmentForEdit(item);
                            setIsBuilderOpen(true);
                          }}
                          className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                          title="Edit assessment"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          aria-label={`Delete ${item.title}`}
                          onClick={() => handleDeleteAssessment(item)}
                          className="p-1 rounded-lg text-rose-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/60 cursor-pointer"
                          title="Delete assessment"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* MODALS */}
      {/* 1. Assessment Builder Modal */}
      {isBuilderOpen && (
        <AssessmentBuilderModal
          isOpen={isBuilderOpen}
          onClose={() => setIsBuilderOpen(false)}
          initialData={selectedAssessmentForEdit}
          onSave={handleSaveAssessment}
          sectionId={sectionId}
        />
      )}

      {/* 2. Face-to-Face Print Modal */}
      {isPrintOpen && selectedAssessmentForPrint && (
        <PrintAssessmentModal
          isOpen={isPrintOpen}
          onClose={() => setIsPrintOpen(false)}
          assessment={selectedAssessmentForPrint}
          sectionId={sectionId}
          schoolTitle={appConfig?.title}
        />
      )}

      {/* 3. Submissions & Anti-Cheat Monitor Modal */}
      {isMonitorOpen && selectedAssessmentForMonitor && (
        <AssessmentMonitorModal
          isOpen={isMonitorOpen}
          onClose={() => setIsMonitorOpen(false)}
          assessment={selectedAssessmentForMonitor}
          sectionId={sectionId}
          students={students}
          onOpenReview={(sub, assess, refresh) => {
            setSelectedSubmissionForReview(sub);
            setSelectedAssessmentForReview(assess);
            setOnReviewGradedCallback(() => refresh);
            setIsReviewOpen(true);
          }}
          onOpenShare={() => handleOpenShare(selectedAssessmentForMonitor)}
        />
      )}

      {/* 4. Student Review & Essay Grading Modal */}
      {isReviewOpen && selectedSubmissionForReview && selectedAssessmentForReview && (
        <StudentReviewModal
          isOpen={isReviewOpen}
          onClose={() => setIsReviewOpen(false)}
          submission={selectedSubmissionForReview}
          assessment={selectedAssessmentForReview}
          sectionId={sectionId}
          onGraded={() => {
            if (onReviewGradedCallback) onReviewGradedCallback();
          }}
        />
      )}

      {/* 5. Recitation Studio Modal */}
      {isRecitationOpen && selectedAssessmentForRecitation && (
        <RecitationStudioModal
          isOpen={isRecitationOpen}
          onClose={() => setIsRecitationOpen(false)}
          assessment={selectedAssessmentForRecitation}
          sectionId={sectionId}
          students={students}
        />
      )}

      {/* 6. Share Online Assessment Modal */}
      {isShareOpen && selectedAssessmentForShare && (
        <ShareAssessmentModal
          isOpen={isShareOpen}
          onClose={() => setIsShareOpen(false)}
          assessment={selectedAssessmentForShare}
          sectionId={sectionId}
          students={students}
          onStatusChange={async (statusOrAssess, maybeStatus) => {
            const targetStatus = typeof statusOrAssess === "string" ? statusOrAssess : maybeStatus;
            if (typeof targetStatus === "string" && ["draft", "published", "closed"].includes(targetStatus)) {
              const changed = await handleStatusChange(selectedAssessmentForShare, targetStatus);
              if (changed) {
                setSelectedAssessmentForShare((prev) => ({ ...prev, status: targetStatus }));
              }
            }
          }}
        />
      )}

      <ConfirmModal
        isOpen={Boolean(deleteTarget)}
        title="Delete assessment?"
        message={`"${deleteTarget?.title || "This assessment"}" and all of its submissions, saved answers, and scores will be permanently deleted.`}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
        isDestructive
        confirmText={isDeleting ? "Deleting…" : "Delete Assessment"}
        isConfirming={isDeleting}
      />
      <ConfirmModal
        isOpen={Boolean(publishTarget)}
        title="Publish this assessment?"
        message={`"${publishTarget?.title || "This assessment"}" will be open to students with its access link or code. Students choose a roster name, which does not verify who is taking the assessment. Focus-change activity may be recorded, but it is not proof of misconduct.${(publishTarget?.questions || []).some((question) => question.type === "coding") ? " Coding questions require teacher grading; browser test results are not used for scores." : ""}`}
        onConfirm={() => resolvePublishConfirmation(true)}
        onCancel={() => resolvePublishConfirmation(false)}
        confirmText="Publish assessment"
      />
    </div>
  );
}
