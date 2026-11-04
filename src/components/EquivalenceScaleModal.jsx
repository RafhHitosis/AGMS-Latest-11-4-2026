import React from "react";
import { X, Award, CheckCircle2 } from "lucide-react";
import { EQUIVALENCE_SCALE } from "../utils/gradeCalculations";

export default function EquivalenceScaleModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  // Color bands matching Image 2
  const getRowBg = (grade) => {
    if (grade >= 97) return "bg-orange-100/80"; // 100-97
    if (grade >= 94) return "bg-yellow-100/80"; // 96-94
    if (grade >= 91) return "bg-emerald-100/80"; // 93-91
    if (grade >= 88) return "bg-cyan-100/80"; // 90-88
    if (grade >= 85) return "bg-orange-100/80"; // 87-85
    if (grade >= 82) return "bg-yellow-100/80"; // 84-82
    if (grade >= 79) return "bg-emerald-100/80"; // 81-79
    if (grade >= 76) return "bg-cyan-100/80"; // 78-76
    if (grade === 75) return "bg-orange-100/80"; // 75
    return "bg-yellow-100/90"; // 74 and below (Failed 5.00)
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="bg-slate-800 dark:bg-slate-950 text-white px-5 py-3.5 flex items-center justify-between border-b border-slate-700/50">
          <div className="flex items-center gap-2">
            <Award className="w-4 h-4 text-emerald-400" />
            <h3 className="font-bold text-sm tracking-wide">Grade Equivalence Scale</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-700 dark:hover:bg-slate-800 rounded-lg text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Excel-style Equivalence Table strictly matching Image 2 */}
        <div className="flex-1 overflow-y-auto p-4 bg-white dark:bg-slate-900">
          <div className="border-2 border-red-600 rounded-lg overflow-hidden shadow-xs">
            <table className="w-full text-xs font-mono border-collapse">
              <thead>
                <tr className="bg-red-600 text-white font-extrabold text-center text-[13px]">
                  <th className="py-1.5 px-3 border-r border-red-500 w-1/2">Grade</th>
                  <th className="py-1.5 px-3 w-1/2">Equivalence</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {EQUIVALENCE_SCALE.map((item) => (
                  <tr
                    key={item.grade}
                    className={`${getRowBg(item.grade)} text-center transition-colors hover:brightness-95`}
                  >
                    <td className="py-1 px-3 border-r border-slate-300 font-semibold text-slate-800">
                      {item.grade}
                    </td>
                    <td
                      className={`py-1 px-3 font-black ${
                        item.equiv === "5.00" ? "text-red-600" : "text-slate-900"
                      }`}
                    >
                      {item.equiv}
                    </td>
                  </tr>
                ))}
                {/* 73 down to 50 summary */}
                <tr className="bg-yellow-100/90 text-center font-bold text-red-600">
                  <td className="py-1 px-3 border-r border-slate-300">73 – 50</td>
                  <td className="py-1 px-3 font-black">5.00</td>
                </tr>
                <tr className="bg-red-50 text-center font-bold text-red-700">
                  <td className="py-1 px-3 border-r border-slate-300">&lt; 50</td>
                  <td className="py-1 px-3 font-black">5.00 (Failed)</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 dark:bg-slate-850 border-t border-slate-200 dark:border-slate-800 px-4 py-2.5 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <span>Passing Grade: 75 (3.00)</span>
          <button
            onClick={onClose}
            className="px-3 py-1 bg-slate-800 dark:bg-slate-750 text-white rounded font-bold hover:bg-slate-700 dark:hover:bg-slate-700 transition-colors text-xs cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
