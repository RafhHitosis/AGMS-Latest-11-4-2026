import React, { useState, useMemo } from "react";
import {
  X,
  Copy,
  Check,
  ExternalLink,
  Share2,
  AlertTriangle,
  CheckCircle2,
  Users,
  Search,
  Download,
  Link2,
  FileSpreadsheet,
} from "lucide-react";
import clsx from "clsx";
import { copyTextToClipboard } from "../../utils/copyTextToClipboard";
import { useToast } from "../../context/ToastContext";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import { getAssessmentTermLabel } from "../../../shared/assessmentTerms";

export default function ShareAssessmentModal({
  isOpen,
  onClose,
  assessment,
  sectionId,
  students = [],
  onStatusChange,
}) {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState("students"); // Default to 'students' (the aligned list requested) or 'general'
  const [searchQuery, setSearchQuery] = useState("");

  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedMessage, setCopiedMessage] = useState(false);
  const [copiedAll, setCopiedAll] = useState(false);
  const [copiedStudentId, setCopiedStudentId] = useState(null);

  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim()) return students;
    const q = searchQuery.toLowerCase();
    return students.filter((s) => (s.name || "").toLowerCase().includes(q));
  }, [students, searchQuery]);

  if (!isOpen || !assessment) return null;

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const generalLink = `${origin}/?take=${assessment.access_code}`;

  const getStudentDirectLink = (student) => {
    return `${origin}/?take=${assessment.access_code}&student=${encodeURIComponent(student.id)}`;
  };

  const handleCopyGeneralLink = async () => {
    const ok = await copyTextToClipboard(generalLink);
    if (ok) {
      setCopiedLink(true);
      toast.success("General class link copied to clipboard!");
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const handleCopyCode = async () => {
    const ok = await copyTextToClipboard(assessment.access_code);
    if (ok) {
      setCopiedCode(true);
      toast.success("Access code copied!");
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const handleCopyStudentLink = async (student) => {
    const link = getStudentDirectLink(student);
    const ok = await copyTextToClipboard(link);
    if (ok) {
      setCopiedStudentId(student.id);
      toast.success(`Personal link for ${student.name} copied!`);
      setTimeout(() => setCopiedStudentId(null), 2000);
    }
  };

  const handleCopyMessage = async () => {
    const message = `Assessment Notice - Section ${sectionId}
Subject: ${assessment.subject || "Class Assessment"}
Title: ${assessment.title}
Term: ${getAssessmentTermLabel(assessment.term)}
Access Link: ${generalLink}
Access Code: ${assessment.access_code}

Instructions:
1. Open the access link above on any device (phone, laptop, desktop).
   Or open the app sign-in page and enter the short access code.
2. Select your name from the Section ${sectionId} roster.
3. Complete and submit before time expires. Strictly no cheating.`;

    const ok = await copyTextToClipboard(message);
    if (ok) {
      setCopiedMessage(true);
      toast.success("Complete student invite message copied!");
      setTimeout(() => setCopiedMessage(false), 2000);
    }
  };

  const handleCopyAllStudentLinks = async () => {
    if (!students || students.length === 0) {
      toast.error("No enrolled students found in this section.");
      return;
    }

    const header = `SECTION ${sectionId} — INDIVIDUAL ASSESSMENT LINKS
Title: ${assessment.title}
Subject: ${assessment.subject || "General"}
Term: ${getAssessmentTermLabel(assessment.term)}
Access Code: ${assessment.access_code}
General Section Link: ${generalLink}
Students can also enter the access code on the app sign-in page.

============================================================
ALIGNED STUDENT ACCESS LINKS (${students.length} Students):
============================================================\n`;

    const body = students
      .map((s, idx) => {
        const link = getStudentDirectLink(s);
        return `${idx + 1}. ${s.name}: ${link}`;
      })
      .join("\n");

    const fullText = header + body;
    const ok = await copyTextToClipboard(fullText);
    if (ok) {
      setCopiedAll(true);
      toast.success(`Copied all ${students.length} student links!`);
      setTimeout(() => setCopiedAll(false), 2500);
    }
  };

  const handleExportExcel = async () => {
    if (!students || students.length === 0) {
      toast.error("No enrolled students to export.");
      return;
    }

    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet(`Section ${sectionId} Links`);

      worksheet.columns = [
        { header: "#", key: "index", width: 6 },
        { header: "Student Name", key: "name", width: 28 },
        { header: "Section", key: "section", width: 14 },
        { header: "Direct Assessment Link", key: "link", width: 55 },
        { header: "Access Code", key: "code", width: 16 },
      ];

      students.forEach((s, idx) => {
        worksheet.addRow({
          index: idx + 1,
          name: s.name,
          section: `Section ${sectionId}`,
          link: getStudentDirectLink(s),
          code: assessment.access_code,
        });
      });

      // Style header row
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
      saveAs(blob, `Section_${sectionId}_${assessment.title || "Assessment"}_Student_Links.xlsx`);
      toast.success("Excel sheet with student links exported!");
    } catch (err) {
      toast.error(err.message || "Failed to export Excel sheet.");
    }
  };

  const isLive = assessment.status === "published";
  const isDraft = assessment.status === "draft";
  const isClosed = assessment.status === "closed";

  return (
    <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col border border-slate-200 dark:border-slate-800 overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* HEADER */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/90 dark:bg-slate-850/90 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-bold shadow-xs shrink-0">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100">
                  {assessment.title}
                </h2>
                <span
                  className={clsx(
                    "text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider",
                    isLive
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300"
                      : isClosed
                      ? "bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                      : "bg-amber-100 text-amber-700 dark:bg-amber-950/80 dark:text-amber-300",
                  )}
                >
                  {typeof assessment.status === "string" ? assessment.status : "draft"}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Section <strong>{sectionId}</strong> Assessment • Short Code:{" "}
                <strong className="font-mono text-emerald-600 dark:text-emerald-400">{assessment.access_code}</strong>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* STATUS ALERT NOTICES */}
        {isDraft && (
          <div className="px-5 py-2.5 bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-900/60 flex items-center justify-between gap-3 text-xs shrink-0">
            <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                <strong>Draft Mode:</strong> This assessment is not yet open for students until published.
              </span>
            </div>
            <button
              type="button"
              onClick={() => onStatusChange && onStatusChange("published")}
              className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs cursor-pointer shadow-xs whitespace-nowrap"
            >
              Publish Now
            </button>
          </div>
        )}

        {isClosed && (
          <div className="px-5 py-2.5 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3 text-xs shrink-0 text-slate-600 dark:text-slate-300">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-slate-500 shrink-0" />
              <span>This assessment is currently closed. Submissions are no longer accepted.</span>
            </div>
            <button
              type="button"
              onClick={() => onStatusChange && onStatusChange("published")}
              className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs cursor-pointer shadow-xs whitespace-nowrap"
            >
              Re-open
            </button>
          </div>
        )}

        {/* TABS SELECTOR */}
        <div className="px-5 py-2 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between gap-3 shrink-0">
          <div className="flex p-0.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setActiveTab("students")}
              className={clsx(
                "px-3.5 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5",
                activeTab === "students"
                  ? "bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-2xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200",
              )}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Aligned Student Links</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold">
                {students.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("general")}
              className={clsx(
                "px-3.5 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5",
                activeTab === "general"
                  ? "bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-2xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200",
              )}
            >
              <Link2 className="w-3.5 h-3.5" />
              <span>General Section Link</span>
            </button>
          </div>

          {activeTab === "students" && students.length > 0 && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopyAllStudentLinks}
                className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                title="Copy all students and their direct links at once"
              >
                {copiedAll ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedAll ? "Copied All!" : "Copy All Links"}</span>
              </button>

              <button
                type="button"
                onClick={handleExportExcel}
                className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                title="Export student links into Excel"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Export Excel</span>
              </button>
            </div>
          )}
        </div>

        {/* MODAL BODY */}
        <div className="flex-1 overflow-y-auto p-5">
          {activeTab === "students" ? (
            /* TAB 1: ALIGNED STUDENT LINKS LIST */
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                    <span>Enrolled Student Links</span>
                    <span className="text-xs text-slate-400 font-normal">
                      (Section {sectionId} Roster)
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Each student has their own unique direct link. When clicked, their identity is automatically recognized and verified.
                  </p>
                </div>

                {students.length > 0 && (
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="search"
                      placeholder="Search student..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 outline-none w-44 sm:w-56 focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                )}
              </div>

              {students.length === 0 ? (
                <div className="py-12 text-center space-y-3 bg-slate-50 dark:bg-slate-850 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
                  <Users className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto" />
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                      No enrolled students found in Section {sectionId}
                    </h4>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto">
                      Add students to Section {sectionId} in Attendance or Grading to automatically generate individual student links.
                    </p>
                  </div>
                </div>
              ) : filteredStudents.length === 0 ? (
                <div className="py-10 text-center text-xs text-slate-500">
                  No students match your search query.
                </div>
              ) : (
                <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 dark:bg-slate-850 text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200 dark:border-slate-800">
                      <tr>
                        <th className="py-2.5 px-3">#</th>
                        <th className="py-2.5 px-3">Student Name</th>
                        <th className="py-2.5 px-3">Aligned Personal Taking Link</th>
                        <th className="py-2.5 px-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900 font-medium">
                      {filteredStudents.map((student, idx) => {
                        const directLink = getStudentDirectLink(student);
                        const isCopied = copiedStudentId === student.id;

                        return (
                          <tr
                            key={student.id}
                            className="hover:bg-slate-50 dark:hover:bg-slate-850/60 transition-colors"
                          >
                            <td className="py-2.5 px-3 text-slate-400 font-mono">
                              {idx + 1}
                            </td>
                            <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                              {student.name}
                            </td>
                            <td className="py-2.5 px-3 font-mono text-[11px] text-emerald-700 dark:text-emerald-300">
                              <div className="bg-slate-50 dark:bg-slate-800 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 max-w-xs sm:max-w-md truncate select-all">
                                {directLink}
                              </div>
                            </td>
                            <td className="py-2.5 px-3 text-right whitespace-nowrap">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleCopyStudentLink(student)}
                                  className={clsx(
                                    "px-2.5 py-1 rounded-lg font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer shadow-2xs",
                                    isCopied
                                      ? "bg-emerald-600 text-white"
                                      : "bg-emerald-600 hover:bg-emerald-700 text-white",
                                  )}
                                  title={`Copy direct link for ${student.name}`}
                                >
                                  {isCopied ? (
                                    <>
                                      <Check className="w-3 h-3" />
                                      <span>Copied</span>
                                    </>
                                  ) : (
                                    <>
                                      <Copy className="w-3 h-3" />
                                      <span>Copy</span>
                                    </>
                                  )}
                                </button>

                                <button
                                  type="button"
                                  onClick={() => window.open(directLink, "_blank", "noopener,noreferrer")}
                                  className="p-1 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                                  title="Test this student's link in a new tab"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : (
            /* TAB 2: GENERAL SECTION LINK */
            <div className="space-y-4">
              {/* Direct Link Box */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                  <span>General Class Access Link:</span>
                  <span className="text-[10px] text-slate-400 font-normal">Students pick their name from Section {sectionId}</span>
                </label>

                <div className="flex items-center gap-2">
                  <div className="flex-1 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono text-slate-800 dark:text-slate-200 truncate select-all">
                    {generalLink}
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyGeneralLink}
                    className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shrink-0 transition-colors shadow-2xs"
                    title="Copy general class link"
                  >
                    {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedLink ? "Copied" : "Copy"}</span>
                  </button>
                </div>
              </div>

              {/* Access Code Card */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">
                    Short Access Code
                  </span>
                  <span className="text-xl font-black font-mono tracking-widest text-emerald-600 dark:text-emerald-400">
                    {assessment.access_code}
                  </span>
                  <span className="block text-[10px] text-slate-500 dark:text-slate-400">
                    Enter this on the app sign-in page.
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopyCode}
                    className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center gap-1 cursor-pointer"
                  >
                    {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedCode ? "Copied" : "Copy Code"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => window.open(generalLink, "_blank", "noopener,noreferrer")}
                    className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 font-bold text-xs flex items-center gap-1 cursor-pointer shadow-2xs"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Open / Test</span>
                  </button>
                </div>
              </div>

              {/* Classroom Announcement Template */}
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-700 dark:text-slate-300">
                    Classroom Announcement Template:
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyMessage}
                    className="text-emerald-600 dark:text-emerald-400 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    {copiedMessage ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedMessage ? "Copied Message!" : "Copy Full Announcement"}</span>
                  </button>
                </div>
                <pre className="p-3 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 font-sans text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed whitespace-pre-wrap select-all">
                  {`Assessment Notice - Section ${sectionId}
Subject: ${assessment.subject || "Class Assessment"}
Title: ${assessment.title}
Term: ${getAssessmentTermLabel(assessment.term)}
Access Link: ${generalLink}
Access Code: ${assessment.access_code}

Instructions:
1. Open the access link above on any device (phone, laptop, desktop).
   Or open the app sign-in page and enter the short access code.
2. Select your name from the Section ${sectionId} roster.
3. Complete and submit before time expires. Strictly no cheating.`}
                </pre>
              </div>
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div className="px-5 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 flex items-center justify-between shrink-0">
          <span className="text-[11px] text-slate-400">
            Section <strong>{sectionId}</strong> • {students.length} Enrolled Student{students.length !== 1 ? "s" : ""}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 cursor-pointer"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
}
