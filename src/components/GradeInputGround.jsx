import React, { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import clsx from "clsx";
import ConfirmModal from "./ConfirmModal";

export default function GradeInputGround({
  students = [],
  computedRows = [],
  config = {},
  grades = {},
  onUpdateScore,
  onUpdateQuizScore,
  onUpdatePeMax,
  onUpdateMeMax,
  onUpdatePlusMax,
  onUpdateMinusMax,
  onUpdateQuizItemMax,
  onAddQuizItem,
  onRemoveQuizItem,
  activeFilter = "ALL",
  onClearFilter,
}) {
  const [newQuizName, setNewQuizName] = useState("");
  const [newQuizMax, setNewQuizMax] = useState("50");
  const [showAddModal, setShowAddModal] = useState(false);
  const [quizToDelete, setQuizToDelete] = useState(null);

  const peMax = Number(config?.pe_max) || 0;
  const meMax = Number(config?.me_max) || 50;
  const plusMax = Number(config?.plus_max) || 0;
  const minusMax = Number(config?.minus_max) || 0;
  const metMax = Math.max(1, peMax + meMax || 50);

  const quizItems = config?.quiz_items || [];
  const sumQuiz = quizItems.reduce((acc, it) => acc + (Number(it.max) || 0), 0);
  const totalQuizMax = sumQuiz > 0 ? sumQuiz : 225;

  const handleAddQuiz = (e) => {
    e.preventDefault();
    if (!newQuizName.trim()) return;
    onAddQuizItem(newQuizName.trim(), Number(newQuizMax) || 50);
    setNewQuizName("");
    setNewQuizMax("50");
    setShowAddModal(false);
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-slate-900">
      {/* Top action bar */}
      <div className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 py-2 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <span className="font-bold text-slate-800 dark:text-slate-100">
            Grade Input Ground
          </span>
          {activeFilter && activeFilter !== "ALL" && (
            <div className="flex items-center gap-1.5 bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-300 px-2 py-0.5 rounded-full text-[11px] font-bold border border-amber-300 dark:border-amber-700">
              <span>Filtered: {activeFilter.replace("_", " ")}</span>
              {onClearFilter && (
                <button
                  onClick={onClearFilter}
                  className="hover:text-red-700 dark:hover:text-red-400 cursor-pointer ml-1 font-black"
                  title="Clear filter"
                >
                  ✕
                </button>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-lg font-bold hover:bg-emerald-700 transition-colors shadow-sm cursor-pointer text-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Quiz/Lab Column
          </button>
        </div>
      </div>

      {/* Add Quiz Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-sm p-5 border border-slate-200 dark:border-slate-800">
            <h3 className="font-bold text-slate-800 dark:text-slate-100 text-base mb-3">Add Quiz or Activity Column</h3>
            <form onSubmit={handleAddQuiz} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1 block">Column Title</label>
                <input
                  type="text"
                  placeholder="e.g. HQ3 or LA3"
                  className="w-full border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 outline-none"
                  value={newQuizName}
                  onChange={(e) => setNewQuizName(e.target.value)}
                  autoFocus
                  required
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1 block">Maximum Points</label>
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="50"
                  className="w-full border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 outline-none"
                  value={newQuizMax}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v === "" || /^[0-9]*\.?[0-9]*$/.test(v)) {
                      setNewQuizMax(v);
                    }
                  }}
                  required
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-1.5 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 cursor-pointer"
                >
                  Add Column
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={Boolean(quizToDelete)}
        title="Delete quiz/activity column?"
        message={`Delete "${quizToDelete?.name || "this column"}" from the grade sheet? Its scores will no longer be shown in the quiz/activity total.`}
        onConfirm={() => {
          if (quizToDelete) onRemoveQuizItem(quizToDelete.id);
          setQuizToDelete(null);
        }}
        onCancel={() => setQuizToDelete(null)}
        isDestructive
        confirmText="Delete column"
      />

      {/* Spreadsheet Input Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full border-collapse text-xs">
          <thead className="sticky top-0 z-20 shadow-sm bg-white dark:bg-slate-900">
            {/* Category Groups Header Row */}
            <tr className="border-b border-slate-300 dark:border-slate-700 font-bold text-center">
              <th rowSpan={2} className="w-10 px-2 py-2 bg-slate-100 dark:bg-slate-800 border-r border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200">
                NO
              </th>
              <th rowSpan={2} className="min-w-[220px] px-4 py-2 bg-slate-100 dark:bg-slate-800 border-r border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-left">
                NAME
              </th>

              {/* MAJOR EXAM Group */}
              <th
                colSpan={5}
                className="py-1.5 px-2 bg-yellow-100/90 dark:bg-yellow-950/60 text-yellow-900 dark:text-yellow-200 border-r border-slate-300 dark:border-slate-700 tracking-wider uppercase text-[11px]"
              >
                MAJOR EXAM
              </th>

              {/* QUIZ Group */}
              <th
                colSpan={quizItems.length + 1}
                className="py-1.5 px-2 bg-emerald-100/90 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-200 border-r border-slate-300 dark:border-slate-700 tracking-wider uppercase text-[11px]"
              >
                QUIZ
              </th>
            </tr>

            {/* Sub-item Headers Row */}
            <tr className="border-b border-slate-300 dark:border-slate-700 text-center font-bold text-[11px]">
              {/* Major Exam Columns */}
              <th className="w-14 py-1 bg-yellow-50 dark:bg-yellow-950/40 text-slate-700 dark:text-yellow-200 border-r border-slate-200 dark:border-slate-700">PE</th>
              <th className="w-14 py-1 bg-yellow-50 dark:bg-yellow-950/40 text-slate-700 dark:text-yellow-200 border-r border-slate-200 dark:border-slate-700">ME</th>
              <th className="w-12 py-1 bg-yellow-50 dark:bg-yellow-950/40 text-slate-700 dark:text-yellow-200 border-r border-slate-200 dark:border-slate-700">+</th>
              <th className="w-12 py-1 bg-yellow-50 dark:bg-yellow-950/40 text-slate-700 dark:text-yellow-200 border-r border-slate-200 dark:border-slate-700">–</th>
              <th className="w-16 py-1 bg-yellow-200/80 dark:bg-yellow-900/60 text-yellow-950 dark:text-yellow-100 border-r border-slate-300 dark:border-slate-700">MET</th>

              {/* Quiz Columns */}
              {quizItems.map((q) => (
                <th
                  key={q.id}
                  className="min-w-[64px] py-1 bg-emerald-50 dark:bg-emerald-950/40 text-slate-700 dark:text-emerald-200 border-r border-slate-200 dark:border-slate-700 group relative px-1"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>{q.name || q.id}</span>
                    {quizItems.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setQuizToDelete(q)}
                        className="opacity-0 group-hover:opacity-100 hover:text-red-500 transition-opacity cursor-pointer"
                        title={`Delete ${q.name || "quiz/activity"} column`}
                        aria-label={`Delete ${q.name || "quiz/activity"} column`}
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </th>
              ))}
              <th className="w-16 py-1 bg-emerald-200/80 dark:bg-emerald-900/60 text-emerald-950 dark:text-emerald-100 border-r border-slate-300 dark:border-slate-700" title="Quiz and Activity Total">QAT</th>
            </tr>

            {/* EDITABLE Max / Total Points Spec Row */}
            <tr className="border-b-2 border-slate-400 dark:border-slate-600 bg-slate-50 dark:bg-slate-850 text-center text-[10px] font-bold text-slate-600 dark:text-slate-300">
              <td className="border-r border-slate-300 dark:border-slate-700 py-1 bg-slate-100 dark:bg-slate-800"></td>
              <td className="border-r border-slate-300 dark:border-slate-700 py-1 px-4 text-left uppercase text-slate-700 dark:text-slate-200 font-sans font-extrabold">
                MAX / TOTAL POINTS
              </td>

              {/* PE Max */}
              <td className="border-r border-slate-200 dark:border-slate-700 py-1 px-0.5 bg-yellow-50/50 dark:bg-yellow-950/30">
                <input
                  type="text"
                  inputMode="decimal"
                  value={config?.pe_max !== undefined && config?.pe_max !== null ? config.pe_max : 0}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v === "" || /^[0-9]*\.?[0-9]*$/.test(v)) {
                      onUpdatePeMax && onUpdatePeMax(v);
                    }
                  }}
                  className="w-12 h-6 text-center font-bold bg-white dark:bg-slate-800 border border-amber-300 dark:border-amber-700 rounded px-1 text-xs text-amber-950 dark:text-amber-200 shadow-2xs focus:ring-1 focus:ring-amber-500 outline-none"
                  title="Preliminary Exam Max Points (PE)"
                  placeholder="0"
                />
              </td>

              {/* ME Max */}
              <td className="border-r border-slate-200 dark:border-slate-700 py-1 px-0.5 bg-yellow-50/50 dark:bg-yellow-950/30">
                <input
                  type="text"
                  inputMode="decimal"
                  value={config?.me_max !== undefined && config?.me_max !== null ? config.me_max : 50}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v === "" || /^[0-9]*\.?[0-9]*$/.test(v)) {
                      onUpdateMeMax && onUpdateMeMax(v);
                    }
                  }}
                  className="w-12 h-6 text-center font-bold bg-white dark:bg-slate-800 border border-amber-300 dark:border-amber-700 rounded px-1 text-xs text-amber-950 dark:text-amber-200 shadow-2xs focus:ring-1 focus:ring-amber-500 outline-none"
                  title="Major Exam Max Points (ME)"
                  placeholder="50"
                />
              </td>

              {/* + (blank in MAX row) */}
              <td className="border-r border-slate-200 dark:border-slate-700 py-1 px-0.5 bg-yellow-50/50 dark:bg-yellow-950/30"></td>

              {/* – (blank in MAX row) */}
              <td className="border-r border-slate-200 dark:border-slate-700 py-1 px-0.5 bg-yellow-50/50 dark:bg-yellow-950/30"></td>

              {/* MET Max (Automatically derived from PE and ME maxima) */}
              <td className="border-r border-slate-300 dark:border-slate-700 py-1 px-0.5 bg-yellow-100 dark:bg-yellow-950/60 font-extrabold text-yellow-950 dark:text-yellow-200" title="Automatically calculated as PE Max + ME Max">
                {metMax}
              </td>

              {/* Quiz Items Max Points (Each column is directly editable) */}
              {quizItems.map((q) => (
                <td key={q.id} className="border-r border-slate-200 dark:border-slate-700 py-1 px-0.5 bg-emerald-50/50 dark:bg-emerald-950/30">
                  <input
                    type="text"
                    inputMode="decimal"
                    value={q.max !== undefined && q.max !== null ? q.max : ""}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (v === "" || /^[0-9]*\.?[0-9]*$/.test(v)) {
                        onUpdateQuizItemMax && onUpdateQuizItemMax(q.id, v);
                      }
                    }}
                    className="w-12 h-6 text-center font-bold bg-white dark:bg-slate-800 border border-emerald-300 dark:border-emerald-700 rounded px-1 text-xs text-emerald-950 dark:text-emerald-200 shadow-2xs focus:ring-1 focus:ring-emerald-500 outline-none"
                    title={`Maximum points for ${q.name || q.id}`}
                  />
                </td>
              ))}
              <td className="border-r border-slate-300 dark:border-slate-700 py-1 font-bold text-emerald-950 dark:text-emerald-200 bg-emerald-100 dark:bg-emerald-950/60 text-center">
                <span title="Quiz and Activity Total Max (QAT) = sum of all quiz/activity columns">{totalQuizMax}</span>
              </td>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-mono">
            {computedRows.length === 0 ? (
              <tr>
                <td colSpan={7 + quizItems.length} className="py-16 text-center text-slate-400 dark:text-slate-500 italic font-sans">
                  {activeFilter && activeFilter !== "ALL"
                    ? `No students found matching filter "${activeFilter.replace("_", " ")}".`
                    : "No students in this section. Add or import students to begin entering grades."}
                </td>
              </tr>
            ) : (
              computedRows.map((row, idx) => {
                const s = grades[row.studentId] || {};

                return (
                  <tr key={row.studentId} className="hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors">
                    {/* NO */}
                    <td className="text-center py-1 px-1 border-r border-slate-200 dark:border-slate-800 font-sans font-semibold text-slate-500 dark:text-slate-400 bg-slate-50/50 dark:bg-slate-850/50">
                      {idx + 1}
                    </td>

                    {/* NAME */}
                    <td className="py-1 px-3 border-r border-slate-300 dark:border-slate-700 font-sans font-bold text-slate-800 dark:text-slate-100">
                      <div className="flex items-center justify-between gap-1.5">
                        <span className="truncate max-w-[200px] sm:max-w-[280px]" title={row.name}>{row.name}</span>
                        <div className="flex items-center gap-1 shrink-0">
                          {row.smartJudgement?.isHighest && (
                            <span
                              className="px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 text-[10px] font-black shrink-0"
                              title={`#1 Highest Grade in Section (${typeof row.finalGrade === "number" ? row.finalGrade.toFixed(2) : row.finalGrade})`}
                            >
                              Top 1
                            </span>
                          )}
                          {row.smartJudgement?.isLowest && row.smartJudgement?.category === "FAILED" && (
                            <span
                              className="px-1.5 py-0.5 rounded bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-800 text-[10px] font-black shrink-0"
                              title={`Lowest Grade in Section (${typeof row.finalGrade === "number" ? row.finalGrade.toFixed(2) : row.finalGrade})`}
                            >
                              Lowest
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* PE */}
                    <td className="p-0 border-r border-slate-200 dark:border-slate-800">
                      <input
                        type="text"
                        inputMode="decimal"
                        className="w-full h-8 text-center text-xs text-slate-900 dark:text-slate-100 focus:bg-yellow-50 dark:focus:bg-slate-800 focus:outline-none"
                        value={s.pe !== undefined && s.pe !== null ? s.pe : ""}
                        onFocus={(e) => e.target.select()}
                        onChange={(e) => {
                          const v = e.target.value;
                          if (v === "" || /^[0-9]*\.?[0-9]*$/.test(v)) {
                            onUpdateScore(row.studentId, "pe", v);
                          }
                        }}
                        placeholder="-"
                      />
                    </td>

                    {/* ME */}
                    <td className="p-0 border-r border-slate-200 dark:border-slate-800">
                      <input
                        type="text"
                        inputMode="decimal"
                        className="w-full h-8 text-center text-xs font-semibold text-slate-900 dark:text-slate-100 focus:bg-yellow-50 dark:focus:bg-slate-800 focus:outline-none"
                        value={s.me !== undefined && s.me !== null ? s.me : ""}
                        onFocus={(e) => e.target.select()}
                        onChange={(e) => {
                          const v = e.target.value;
                          if (v === "" || /^[0-9]*\.?[0-9]*$/.test(v)) {
                            onUpdateScore(row.studentId, "me", v);
                          }
                        }}
                        placeholder="-"
                      />
                    </td>

                    {/* + */}
                    <td className="p-0 border-r border-slate-200 dark:border-slate-800">
                      <input
                        type="text"
                        inputMode="decimal"
                        className="w-full h-8 text-center text-xs text-emerald-600 dark:text-emerald-400 focus:bg-yellow-50 dark:focus:bg-slate-800 focus:outline-none"
                        value={s.plus !== undefined && s.plus !== null ? s.plus : ""}
                        onFocus={(e) => e.target.select()}
                        onChange={(e) => {
                          const v = e.target.value;
                          if (v === "" || /^[0-9]*\.?[0-9]*$/.test(v)) {
                            onUpdateScore(row.studentId, "plus", v);
                          }
                        }}
                        placeholder="0"
                      />
                    </td>

                    {/* – */}
                    <td className="p-0 border-r border-slate-200 dark:border-slate-800">
                      <input
                        type="text"
                        inputMode="decimal"
                        className="w-full h-8 text-center text-xs text-red-600 dark:text-red-400 focus:bg-yellow-50 dark:focus:bg-slate-800 focus:outline-none"
                        value={s.minus !== undefined && s.minus !== null ? s.minus : ""}
                        onFocus={(e) => e.target.select()}
                        onChange={(e) => {
                          const v = e.target.value;
                          if (v === "" || /^[0-9]*\.?[0-9]*$/.test(v)) {
                            onUpdateScore(row.studentId, "minus", v);
                          }
                        }}
                        placeholder="0"
                      />
                    </td>

                    {/* MET (Calculated Sum = PE + ME + plus - minus) */}
                    <td className="text-center py-1 border-r border-slate-300 dark:border-slate-700 font-bold bg-yellow-50/80 dark:bg-yellow-950/50 text-yellow-950 dark:text-yellow-200">
                      {row.met !== "" ? row.met : "-"}
                    </td>

                    {/* Quizzes Inputs */}
                    {quizItems.map((q) => {
                      const val = s.quizzes?.[q.id];
                      return (
                        <td key={q.id} className="p-0 border-r border-slate-200 dark:border-slate-800">
                          <input
                            type="text"
                            inputMode="decimal"
                            className="w-full h-8 text-center text-xs text-slate-900 dark:text-slate-100 focus:bg-emerald-50 dark:focus:bg-slate-800 focus:outline-none"
                            value={val !== undefined && val !== null ? val : ""}
                            onFocus={(e) => e.target.select()}
                            onChange={(e) => {
                              const v = e.target.value;
                              if (v === "" || /^[0-9]*\.?[0-9]*$/.test(v)) {
                                onUpdateQuizScore(row.studentId, q.id, v);
                              }
                            }}
                            placeholder="-"
                          />
                        </td>
                      );
                    })}

                    {/* QAT (Quiz and Activity Total Sum) */}
                    <td className="text-center py-1 border-r border-slate-300 dark:border-slate-700 font-bold bg-emerald-50/80 dark:bg-emerald-950/50 text-emerald-950 dark:text-emerald-200">
                      {row.qt !== "" ? row.qt : "-"}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
