import React, { useState } from "react";
import { X, Check, AlertCircle, Save, CheckCircle2, Award, User } from "lucide-react";
import clsx from "clsx";
import api from "../../lib/api";
import { useToast } from "../../context/ToastContext";

export default function StudentReviewModal({
  isOpen,
  onClose,
  submission,
  assessment,
  sectionId,
  onGraded,
}) {
  const toast = useToast();
  const [details, setDetails] = useState(submission?.grading_details || {});
  const [saving, setSaving] = useState(false);

  if (!isOpen || !submission || !assessment) return null;

  const questions = assessment.questions || [];

  const handleScoreChange = (qId, earned) => {
    const question = questions.find((item, index) => (item.id || `q_${index + 1}`) === qId);
    const maxPoints = parseFloat(question?.points) || 1;
    const parsedScore = parseFloat(earned);
    const numeric = Math.min(maxPoints, Math.max(0, Number.isFinite(parsedScore) ? parsedScore : 0));
    const currentQ = details[qId] || {};
    setDetails({
      ...details,
      [qId]: {
        ...currentQ,
        pointsEarned: numeric,
      },
    });
  };

  const handleFeedbackChange = (qId, feedback) => {
    const currentQ = details[qId] || {};
    setDetails({
      ...details,
      [qId]: {
        ...currentQ,
        teacherFeedback: feedback,
      },
    });
  };

  // Compute live adjusted total score
  const computedScore = Object.values(details).reduce(
    (sum, d) => sum + (parseFloat(d.pointsEarned) || 0),
    0,
  );
  const totalPoints = parseFloat(submission.total_points) || 1;
  const computedPercentage = ((computedScore / totalPoints) * 100).toFixed(2);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.gradeSubmission(sectionId, assessment.id, submission.id, {
        score: computedScore,
        grading_details: details,
        status: "graded",
      });
      toast.success("Submission graded and feedback saved!");
      if (onGraded) onGraded();
      onClose();
    } catch (err) {
      toast.error(err.message || "Failed to save grade.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-850/80 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Review Response: {submission.student_name}
              </h2>
              <p className="text-xs text-slate-500">
                {assessment.title} • Score: <strong className="text-emerald-600">{computedScore} / {totalPoints}</strong> ({computedPercentage}%)
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

        {/* Question Review List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {questions.map((q, idx) => {
            const qId = q.id || `q_${idx + 1}`;
            const detail = details[qId] || {};
            const rawAns = submission.answers?.[qId] !== undefined ? submission.answers[qId] : detail.studentAnswer;
            const studentAns = typeof rawAns === "object" && rawAns !== null ? rawAns.code : String(rawAns || "");
            const testResults = typeof rawAns === "object" && Array.isArray(rawAns.testResults) ? rawAns.testResults : detail.testResults;
            const isCorrect = detail.isCorrect;
            const pointsEarned = detail.pointsEarned !== undefined ? detail.pointsEarned : isCorrect ? q.points : 0;
            const maxPoints = q.points || 1;
            const isCoding = q.type === "coding";

            return (
              <div
                key={qId}
                className={clsx(
                  "p-4 rounded-2xl border text-xs space-y-2.5 transition-all",
                  isCoding
                    ? "border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/20 dark:bg-emerald-950/20"
                    : q.type === "essay"
                    ? "border-amber-200 dark:border-amber-900/60 bg-amber-50/30 dark:bg-amber-950/20"
                    : isCorrect
                    ? "border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/20 dark:bg-emerald-950/20"
                    : "border-rose-200 dark:border-rose-900/60 bg-rose-50/20 dark:bg-rose-950/20",
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2">
                    <span className="font-bold shrink-0">{idx + 1}.</span>
                    <div className="space-y-0.5">
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {q.question}
                      </span>
                      {isCoding && (
                        <div className="flex items-center gap-2 text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                          <span>Language: {q.language?.toUpperCase() || "CODE"}</span>
                          {testResults && (
                            <span>
                              • Browser-reported tests: {testResults.filter((r) => r?.passed).length}/{testResults.length} passed (unverified)
                            </span>
                          )}
                          <span>• Teacher review required</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <label className="text-[11px] font-bold text-slate-500">Pts:</label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      max={maxPoints}
                      aria-label={`Points earned for question ${idx + 1}`}
                      value={pointsEarned}
                      onChange={(e) => handleScoreChange(qId, e.target.value)}
                      className="w-14 text-center px-1.5 py-1 rounded bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-bold text-slate-900 dark:text-slate-100"
                    />
                    <span className="text-slate-400">/ {maxPoints}</span>
                  </div>
                </div>

                {/* Answers Comparison */}
                {isCoding ? (
                  <div className="space-y-2 pt-1">
                    <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-slate-100">
                      <div className="text-[10px] uppercase font-bold text-slate-400 mb-1 flex items-center justify-between">
                        <span>Submitted Code:</span>
                        <span>{studentAns.length} chars</span>
                      </div>
                      <pre className="p-2 rounded bg-slate-950 text-slate-200 font-mono text-[11px] leading-relaxed overflow-x-auto whitespace-pre max-h-48">
                        {studentAns || "// No code submitted"}
                      </pre>
                    </div>
                  </div>
                ) : (
                  <div className="grid sm:grid-cols-2 gap-2 text-xs pt-1">
                    <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
                        Student's Answer:
                      </span>
                      <p className={clsx("font-medium", !studentAns && "italic text-slate-400")}>
                        {studentAns || "No answer submitted"}
                      </p>
                    </div>

                    <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
                        {q.type === "essay" ? "Scoring Rubric:" : "Correct Answer:"}
                      </span>
                      <p className="font-bold text-emerald-700 dark:text-emerald-400">
                        {q.type === "essay" ? q.rubric || "Evaluate clarity & content." : q.correct_answer || "N/A"}
                      </p>
                    </div>
                  </div>
                )}

                {/* Teacher Feedback field */}
                <div className="pt-1">
                  <input
                    type="text"
                    placeholder="Add teacher comment or feedback for this item (optional)..."
                    value={detail.teacherFeedback || ""}
                    onChange={(e) => handleFeedbackChange(qId, e.target.value)}
                    className="w-full p-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-800 text-slate-800 dark:text-slate-200 outline-none"
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-850/80 flex items-center justify-between shrink-0">
          <div className="text-xs">
            Adjusted Score: <strong className="text-emerald-600">{computedScore} / {totalPoints}</strong> ({computedPercentage}%)
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={handleSave}
              className="px-5 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 shadow-sm"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? "Saving..." : "Save Grade"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
