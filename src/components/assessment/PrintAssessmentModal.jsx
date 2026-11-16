import React, { useState } from "react";
import { X, Printer, Columns2, LayoutList } from "lucide-react";
import clsx from "clsx";
import DropdownSelect from "../DropdownSelect";
import { getAssessmentTermLabel } from "../../../shared/assessmentTerms";

const getCorrectAnswerLabel = (question) => {
  const rawAnswer = question.correct_answer;
  const answer = rawAnswer && typeof rawAnswer === "object"
    ? rawAnswer.text ?? rawAnswer.value ?? ""
    : rawAnswer;

  if (question.type !== "multiple_choice" || answer === undefined || answer === null || answer === "") {
    return answer ?? "N/A";
  }

  const answerText = String(answer);
  const correctIndex = (Array.isArray(question.options) ? question.options : []).findIndex((option) => {
    const optionText = option && typeof option === "object"
      ? option.text ?? option.value ?? ""
      : option;
    return String(optionText ?? "").trim().toLowerCase() === answerText.trim().toLowerCase();
  });

  return correctIndex >= 0
    ? `${String.fromCharCode(65 + correctIndex)}. ${answerText}`
    : answerText;
};

export default function PrintAssessmentModal({
  isOpen,
  onClose,
  assessment,
  sectionId,
  schoolTitle = "AGMS",
}) {
  const [printTab, setPrintTab] = useState("questionnaire"); // 'questionnaire' | 'answersheet' | 'answerkey'
  const [twoColumn, setTwoColumn] = useState(false);

  if (!isOpen || !assessment) return null;

  const questions = assessment.questions || [];
  const totalPoints = questions.reduce((sum, q) => sum + (parseFloat(q.points) || 1), 0);

  // Group questions by Part
  const parts = [];
  const partMap = {};
  questions.forEach((q, idx) => {
    const partName = q.part || "Part I: Questions";
    if (!partMap[partName]) {
      partMap[partName] = [];
      parts.push({ name: partName, items: partMap[partName] });
    }
    partMap[partName].push({ ...q, originalIndex: idx + 1 });
  });

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200">
      {/* Outer Modal Container (hidden during print) */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-5xl max-h-[95vh] flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800 print:border-none print:shadow-none print:max-w-none print:max-h-none print:rounded-none">
        {/* Top Control Bar (Hidden on print) */}
        <div className="px-4 sm:px-6 py-3 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-50/90 dark:bg-slate-850/90 print:hidden shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-700 text-white flex items-center justify-center shadow-xs">
              <Printer className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">Print preview</h2>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2">
            <label htmlFor="print-layout-select" className="sr-only">Print layout</label>
            <DropdownSelect
              id="print-layout-select"
              value={printTab}
              onChange={(event) => setPrintTab(event.target.value)}
              className="h-9 max-w-40 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 pl-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
              iconClassName="h-3.5 w-3.5"
            >
              <option value="questionnaire">Exam paper</option>
              <option value="answersheet">Answer sheet</option>
              <option value="answerkey">Teacher key</option>
            </DropdownSelect>

            {printTab === "questionnaire" && (
              <button
                type="button"
                onClick={() => setTwoColumn((value) => !value)}
                className="h-9 px-2.5 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer inline-flex items-center gap-1.5"
                title={twoColumn ? "Switch to one column" : "Switch to two columns"}
                aria-label={twoColumn ? "Switch to one column" : "Switch to two columns"}
              >
                {twoColumn ? <LayoutList className="w-4 h-4" /> : <Columns2 className="w-4 h-4" />}
                <span className="text-xs font-medium whitespace-nowrap">{twoColumn ? "1 column" : "2 columns"}</span>
              </button>
            )}

            <button
              type="button"
              onClick={handlePrint}
              className="h-9 px-3 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm cursor-pointer transition-colors whitespace-nowrap"
            >
              <Printer className="w-3.5 h-3.5" /> Print
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Print Preview Canvas */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-10 bg-slate-100 dark:bg-slate-950 print:p-0 print:bg-white print:overflow-visible">
          {/* Printable Page Container */}
          <div className="max-w-[816px] mx-auto bg-white text-slate-900 p-8 sm:p-12 shadow-md print:shadow-none print:p-0 print:max-w-none font-serif text-[13px] leading-relaxed select-text">
            {/* INSTITUTIONAL HEADER */}
            <div className="border-b-2 border-slate-900 pb-4 mb-6">
              <div className="text-center space-y-1">
                <p className="text-xs uppercase tracking-widest font-sans font-semibold text-slate-600">
                  Republic of the Philippines
                </p>
                <h1 className="text-lg font-black uppercase tracking-tight font-sans">
                  {schoolTitle || "Academic Grading & Management System"}
                </h1>
                <p className="text-xs font-semibold text-slate-700">
                  {assessment.subject ? `${assessment.subject.toUpperCase()} • ` : ""}
                  {assessment.title?.toUpperCase()}
                </p>
                <p className="text-xs italic text-slate-500">
                  Academic Year 2026–2027 • {getAssessmentTermLabel(assessment.term).toUpperCase()} TERM
                </p>
              </div>

              {/* Student Metadata Fill-in Box */}
              <div className="mt-5 grid grid-cols-12 gap-3 text-xs font-sans">
                <div className="col-span-7 flex items-end">
                  <span className="font-bold mr-2 whitespace-nowrap">Name:</span>
                  <span className="border-b border-slate-900 flex-1 h-5"></span>
                </div>
                <div className="col-span-5 flex items-end">
                  <span className="font-bold mr-2 whitespace-nowrap">Date:</span>
                  <span className="border-b border-slate-900 flex-1 h-5"></span>
                </div>

                <div className="col-span-7 flex items-end">
                  <span className="font-bold mr-2 whitespace-nowrap">Grade & Section:</span>
                  <span className="border-b border-slate-900 flex-1 h-5 font-semibold">
                    Section {sectionId}
                  </span>
                </div>
                <div className="col-span-5 flex items-end">
                  <span className="font-bold mr-2 whitespace-nowrap">Score:</span>
                  <span className="border-b border-slate-900 flex-1 h-5 text-right pr-2 font-mono font-bold">
                    / {totalPoints}
                  </span>
                </div>
              </div>
            </div>

            {/* TAB 1: QUESTIONNAIRE */}
            {printTab === "questionnaire" && (
              <div className="space-y-6">
                {/* General Instructions Box */}
                {assessment.general_instructions && (
                  <div className="p-3 border border-slate-400 bg-slate-50/50 rounded-lg text-xs font-sans mb-4">
                    <span className="font-bold uppercase tracking-wide">General Instructions: </span>
                    <span>{assessment.general_instructions}</span>
                  </div>
                )}

                {/* Test Parts */}
                <div className={clsx(twoColumn && "columns-2 gap-8 [column-rule:1px_solid_#cbd5e1]")}>
                  {parts.map((part, pIdx) => (
                    <div key={pIdx} className="mb-6 break-inside-avoid">
                      <div className="font-sans font-bold text-xs uppercase tracking-wide border-b border-slate-300 pb-1 mb-3 text-slate-800">
                        {part.name}
                      </div>

                      <div className="space-y-4">
                        {part.items.map((q) => (
                          <div key={q.originalIndex} className="text-xs break-inside-avoid">
                            <div className="flex items-start gap-2">
                              <span className="font-bold shrink-0">{q.originalIndex}.</span>
                              <div className="flex-1">
                                <p className="font-serif leading-normal">{q.question || "Question prompt..."}</p>

                                {/* Multiple choice options */}
                                {q.type === "multiple_choice" && q.options && (
                                  <div className="mt-1.5 grid grid-cols-2 gap-x-4 gap-y-1 font-sans pl-2">
                                    {q.options.map((opt, optIdx) => {
                                      const letter = String.fromCharCode(65 + optIdx);
                                      return (
                                        <div key={optIdx} className="flex items-start gap-1.5">
                                          <span className="font-bold">{letter}.</span>
                                          <span>{opt}</span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}

                                {/* True / False */}
                                {q.type === "true_false" && (
                                  <div className="mt-1 font-sans text-[11px] text-slate-500 italic pl-2">
                                    ( Write <strong className="text-slate-800">TRUE</strong> or <strong className="text-slate-800">FALSE</strong> )
                                  </div>
                                )}

                                {/* Identification */}
                                {q.type === "identification" && (
                                  <div className="mt-2 font-sans pl-2">
                                    Answer: _________________________________________
                                  </div>
                                )}

                                {/* Coding Problem on Paper */}
                                {q.type === "coding" && (
                                  <div className="mt-2 pl-2 space-y-1.5 font-sans">
                                    <div className="text-[10px] font-mono text-slate-500 font-bold">
                                      Language: [{q.language?.toUpperCase() || "CODE"}]
                                    </div>
                                    {q.starter_code && (
                                      <pre className="p-2 rounded bg-slate-100 border border-slate-300 font-mono text-[10px] text-slate-800 leading-tight whitespace-pre-wrap">
                                        {q.starter_code}
                                      </pre>
                                    )}
                                    <div className="mt-2 border border-slate-300 rounded p-1.5 bg-slate-50/50 space-y-2">
                                      <div className="text-[9px] text-slate-400 font-mono uppercase tracking-wider">
                                        Write Code Solution Below:
                                      </div>
                                      <div className="border-b border-slate-300 h-4"></div>
                                      <div className="border-b border-slate-300 h-4"></div>
                                      <div className="border-b border-slate-300 h-4"></div>
                                      <div className="border-b border-slate-300 h-4"></div>
                                      <div className="border-b border-slate-300 h-4"></div>
                                    </div>
                                  </div>
                                )}

                                {/* Essay space */}
                                {q.type === "essay" && (
                                  <div className="mt-3 space-y-2 pl-2">
                                    <div className="border-b border-slate-300 h-5"></div>
                                    <div className="border-b border-slate-300 h-5"></div>
                                    <div className="border-b border-slate-300 h-5"></div>
                                  </div>
                                )}
                              </div>
                              <span className="text-[10px] text-slate-400 font-sans shrink-0">
                                ({q.points || 1} pt)
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="text-center font-sans font-bold text-xs uppercase tracking-widest text-slate-400 pt-8 border-t border-slate-200">
                  — END OF EXAMINATION —
                </div>
              </div>
            )}

            {/* TAB 2: STUDENT ANSWER SHEET */}
            {printTab === "answersheet" && (
              <div className="space-y-6 font-sans">
                <div className="p-3 border border-slate-300 rounded text-xs text-center font-medium bg-slate-50">
                  Fill in your answers clearly in the corresponding numbers below. Avoid stray marks.
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {questions.map((q, idx) => (
                    <div
                      key={idx}
                      className="p-2 border border-slate-300 rounded flex items-center justify-between text-xs"
                    >
                      <span className="font-bold w-6">{idx + 1}.</span>
                      {q.type === "multiple_choice" ? (
                        <div className="flex gap-2">
                          {["A", "B", "C", "D"].map((choice) => (
                            <span
                              key={choice}
                              className="w-5 h-5 rounded-full border border-slate-400 flex items-center justify-center text-[10px] font-bold"
                            >
                              {choice}
                            </span>
                          ))}
                        </div>
                      ) : q.type === "true_false" ? (
                        <div className="flex gap-2">
                          <span className="w-5 h-5 rounded border border-slate-400 flex items-center justify-center text-[10px] font-bold">
                            T
                          </span>
                          <span className="w-5 h-5 rounded border border-slate-400 flex items-center justify-center text-[10px] font-bold">
                            F
                          </span>
                        </div>
                      ) : (
                        <div className="border-b border-slate-400 flex-1 ml-2 h-4"></div>
                      )}
                    </div>
                  ))}
                </div>

                <div className="pt-10 text-center text-xs text-slate-400">
                  Answer Sheet • Section {sectionId} • {assessment.title}
                </div>
              </div>
            )}

            {/* TAB 3: TEACHER ANSWER KEY */}
            {printTab === "answerkey" && (
              <div className="space-y-4 font-sans">
                <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-lg text-emerald-900 text-xs font-bold flex items-center justify-between">
                  <span>CONFIDENTIAL — TEACHER ANSWER KEY</span>
                  <span>Total Items: {questions.length} • Total Points: {totalPoints}</span>
                </div>

                <table className="w-full text-xs border-collapse border border-slate-300">
                  <thead>
                    <tr className="bg-slate-100 text-slate-800">
                      <th className="border border-slate-300 p-2 text-center w-12">#</th>
                      <th className="border border-slate-300 p-2 text-left">Question Prompt</th>
                      <th className="border border-slate-300 p-2 text-left w-24">Type</th>
                      <th className="border border-slate-300 p-2 text-left w-48 font-bold text-emerald-700">
                        Correct Answer
                      </th>
                      <th className="border border-slate-300 p-2 text-center w-14">Pts</th>
                    </tr>
                  </thead>
                  <tbody>
                    {questions.map((q, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="border border-slate-300 p-2 text-center font-bold">{idx + 1}</td>
                        <td className="border border-slate-300 p-2 font-serif truncate max-w-xs" title={q.question}>
                          {q.question}
                        </td>
                        <td className="border border-slate-300 p-2 capitalize text-slate-500">
                          {q.type?.replace("_", " ")}
                        </td>
                        <td className="border border-slate-300 p-2 font-bold text-emerald-800">
                          {q.type === "essay"
                            ? `Rubric: ${q.rubric || "Manual evaluation"}`
                            : getCorrectAnswerLabel(q)}
                        </td>
                        <td className="border border-slate-300 p-2 text-center font-bold">{q.points || 1}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
