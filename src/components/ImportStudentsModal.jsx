import React, { useState, useRef, useEffect } from "react";
import { X, ClipboardPaste, UploadCloud, Copy, FileSpreadsheet, Loader2, Info } from "lucide-react";
import ExcelJS from "exceljs";
import api from "../lib/api";

export default function ImportStudentsModal({
  isOpen,
  onClose,
  onImport,
  sectionId,
  appConfig,
}) {
  const [activeTab, setActiveTab] = useState("paste"); // paste, upload, clone
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Paste Tab State
  const [pasteText, setPasteText] = useState("");

  // Clone Tab State
  const [selectedSectionToClone, setSelectedSectionToClone] = useState("");
  const availableSections = Object.values(appConfig?.sections || {})
    .flat()
    .filter((id) => id !== sectionId);

  const fileInputRef = useRef(null);

  // Reset states on open/close
  useEffect(() => {
    if (isOpen) {
      setPasteText("");
      setError(null);
      setLoading(false);
      setSelectedSectionToClone("");
      setActiveTab("paste");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handlePasteSubmit = () => {
    if (!pasteText.trim()) {
      setError("Please paste some names first.");
      return;
    }

    setLoading(true);
    try {
      // Split by newline
      const rawLines = pasteText.split(/\r?\n/);
      let cleanedNames = [];
      
      for (const line of rawLines) {
        if (!line.trim()) continue;
        
        // If pasted from excel horizontally, it has tabs
        if (line.includes("\t")) {
          cleanedNames.push(...line.split("\t").map((n) => n.trim()).filter(n => n));
        } else {
          cleanedNames.push(line.trim());
        }
      }

      // Remove duplicates
      const uniqueNames = [...new Set(cleanedNames)];

      if (uniqueNames.length === 0) {
        setError("No valid names found in text.");
        setLoading(false);
        return;
      }

      onImport(uniqueNames);
    } catch (err) {
      setError("Failed to parse the pasted text.");
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setLoading(true);
    setError(null);

    try {
      const names = [];
      const fileName = file.name.toLowerCase();

      if (fileName.endsWith(".csv")) {
        const text = await file.text();
        const lines = text.split(/\r?\n/);
        for (const line of lines) {
          if (!line.trim()) continue;
          let cellValue = line.trim();
          // If CSV has quote-enclosed strings e.g. "DELA CRUZ, Juan"
          if (cellValue.startsWith('"')) {
            const match = cellValue.match(/^"([^"]+)"/);
            if (match) cellValue = match[1];
          } else if (cellValue.includes(",")) {
            cellValue = cellValue.split(",")[0].trim();
          }
          if (
            cellValue.length > 0 &&
            cellValue.toLowerCase() !== "name" &&
            cellValue.toLowerCase() !== "student name"
          ) {
            names.push(cellValue);
          }
        }
      } else {
        const workbook = new ExcelJS.Workbook();
        const arrayBuffer = await file.arrayBuffer();
        await workbook.xlsx.load(arrayBuffer);

        const worksheet = workbook.worksheets[0]; // Take first sheet
        worksheet.eachRow((row) => {
          const cellValue = row.getCell(1).text;
          if (cellValue && typeof cellValue === "string") {
            const cleaned = cellValue.trim();
            if (
              cleaned.length > 0 &&
              cleaned.toLowerCase() !== "name" &&
              cleaned.toLowerCase() !== "student name"
            ) {
              names.push(cleaned);
            }
          }
        });
      }

      const uniqueNames = [...new Set(names)];

      if (uniqueNames.length === 0) {
        setError("No valid names found in the uploaded file.");
        setLoading(false);
        return;
      }

      onImport(uniqueNames);
    } catch (err) {
      console.error(err);
      setError("Failed to parse the file. Please ensure it's a valid .xlsx or .csv file.");
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = ""; // Reset input
    }
  };

  const handleCloneSubmit = async () => {
    if (!selectedSectionToClone) {
      setError("Please select a section to clone from.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const clonedStudents = await api.getStudents(selectedSectionToClone);
      if (clonedStudents && clonedStudents.length > 0) {
        const studentNames = clonedStudents.map((val) => val.name);
        const uniqueNames = [...new Set(studentNames)];
        if (uniqueNames.length > 0) {
          onImport(uniqueNames);
        } else {
          setError(`No valid students found in Section ${selectedSectionToClone}.`);
        }
      } else {
        setError(`Section ${selectedSectionToClone} is empty.`);
      }
    } catch (err) {
      console.error(err);
      setError("Failed to read students from selected section.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-emerald-50/50 dark:bg-slate-900/80">
          <div>
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Import Students</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Section {sectionId}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200 rounded-full transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 px-6 pt-4 gap-6 bg-slate-50/50 dark:bg-slate-900/40">
          <button
            onClick={() => setActiveTab("paste")}
            className={`pb-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 cursor-pointer ${
              activeTab === "paste"
                ? "border-emerald-600 text-emerald-700 dark:text-emerald-400 dark:border-emerald-500"
                : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
            }`}
          >
            <ClipboardPaste className="w-4 h-4" />
            Bulk Paste
          </button>
          <button
            onClick={() => setActiveTab("upload")}
            className={`pb-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 cursor-pointer ${
              activeTab === "upload"
                ? "border-emerald-600 text-emerald-700 dark:text-emerald-400 dark:border-emerald-500"
                : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            Excel / CSV Upload
          </button>
          <button
            onClick={() => setActiveTab("clone")}
            className={`pb-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 cursor-pointer ${
              activeTab === "clone"
                ? "border-emerald-600 text-emerald-700 dark:text-emerald-400 dark:border-emerald-500"
                : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
            }`}
          >
            <Copy className="w-4 h-4" />
            Clone Roster
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 bg-white dark:bg-slate-900">
          {error && (
            <div className="mb-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
              <Info className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          {activeTab === "paste" && (
            <div className="space-y-4">
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Paste your class list here. Put one student name per line.
              </p>
              <textarea
                className="w-full h-64 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-xl p-4 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none resize-none font-mono"
                placeholder="DELA CRUZ, Juan&#10;SANTOS, Maria&#10;..."
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                disabled={loading}
              />
              <div className="flex justify-end">
                <button
                  onClick={handlePasteSubmit}
                  disabled={loading || !pasteText.trim()}
                  className="bg-emerald-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-emerald-700 transition-colors disabled:opacity-50 flex items-center gap-2 cursor-pointer shadow-sm"
                >
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  Import List
                </button>
              </div>
            </div>
          )}

          {activeTab === "upload" && (
            <div className="space-y-6">
              <div className="bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 p-4 rounded-xl text-sm border border-blue-100 dark:border-blue-900/50 flex gap-3">
                <Info className="w-5 h-5 flex-shrink-0 text-blue-500" />
                <p>
                  Upload an Excel file (.xlsx) or CSV (.csv). The system will automatically extract all student names. Make sure it's one name per row!
                </p>
              </div>

              <div
                className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-10 flex flex-col items-center justify-center text-center cursor-pointer hover:border-emerald-500 dark:hover:border-emerald-500 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20 transition-colors group"
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <UploadCloud className="w-8 h-8" />
                </div>
                <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-1">
                  Click to Browse
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">Supports .xlsx and .csv files</p>
                <input
                  type="file"
                  accept=".xlsx, .csv"
                  className="hidden"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  disabled={loading}
                />
              </div>
              
              {loading && (
                <div className="flex justify-center items-center gap-2 text-emerald-600 dark:text-emerald-400 font-semibold text-sm">
                  <Loader2 className="w-5 h-5 animate-spin" /> Processing File...
                </div>
              )}
            </div>
          )}

          {activeTab === "clone" && (
            <div className="space-y-6">
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Instantly copy the entire student roster from another section into this one. Useful for sections that take multiple subjects together.
              </p>

              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Select Section to Clone
                </label>
                {availableSections.length === 0 ? (
                  <div className="p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-500 dark:text-slate-400 text-center">
                    No other sections found in the system.
                  </div>
                ) : (
                  <select
                    value={selectedSectionToClone}
                    onChange={(e) => setSelectedSectionToClone(e.target.value)}
                    className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-medium cursor-pointer"
                    disabled={loading}
                  >
                    <option value="" disabled>-- Select a Section --</option>
                    {availableSections.map(sec => (
                      <option key={sec} value={sec}>Section {sec}</option>
                    ))}
                  </select>
                )}
              </div>

              <div className="flex justify-end pt-4">
                <button
                  onClick={handleCloneSubmit}
                  disabled={loading || !selectedSectionToClone}
                  className="bg-emerald-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-emerald-700 transition-colors disabled:opacity-50 flex items-center gap-2 cursor-pointer shadow-sm"
                >
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  Clone Roster
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
