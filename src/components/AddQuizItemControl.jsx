import React, { useState } from "react";
import { createPortal } from "react-dom";
import { Plus } from "lucide-react";

export default function AddQuizItemControl({ onAddQuizItem, readMode = false }) {
  const [newQuizName, setNewQuizName] = useState("");
  const [newQuizMax, setNewQuizMax] = useState("50");
  const [showAddModal, setShowAddModal] = useState(false);

  const handleAddQuiz = (event) => {
    event.preventDefault();
    if (!newQuizName.trim()) return;
    onAddQuizItem(newQuizName.trim(), Number(newQuizMax) || 50);
    setNewQuizName("");
    setNewQuizMax("50");
    setShowAddModal(false);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setShowAddModal(true)}
        disabled={readMode}
        title={readMode ? "Turn off read mode to add a column" : "Add a quiz or lab column"}
        className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
      >
        <Plus className="h-3.5 w-3.5" />
        Add Quiz/Lab Column
      </button>

      {showAddModal && !readMode && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-5 shadow-xl dark:border-slate-800 dark:bg-slate-900">
            <h3 className="mb-3 text-base font-bold text-slate-800 dark:text-slate-100">
              Add Quiz or Activity Column
            </h3>
            <form onSubmit={handleAddQuiz} className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">
                  Column Title
                </label>
                <input
                  type="text"
                  placeholder="e.g. HQ3 or LA3"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  value={newQuizName}
                  onChange={(event) => setNewQuizName(event.target.value)}
                  autoFocus
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">
                  Maximum Points
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="50"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  value={newQuizMax}
                  onFocus={(event) => event.target.select()}
                  onChange={(event) => {
                    const value = event.target.value;
                    if (value === "" || /^[0-9]*\.?[0-9]*$/.test(value)) {
                      setNewQuizMax(value);
                    }
                  }}
                  required
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="cursor-pointer rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="cursor-pointer rounded-lg bg-emerald-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-emerald-700"
                >
                  Add Column
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
