import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import { format } from "date-fns";

export const exportGradesToExcel = async ({
  sectionId,
  term = "midterm",
  students = [],
  computedRows = [],
  config = {},
  headerInfo = {},
}) => {
  const workbook = new ExcelJS.Workbook();
  const termTitle = term === "midterm" ? "Midterm" : "Final";
  const csTitle = term === "midterm" ? "CS Mid" : "CS Fin";

  const meMax = Number(config.me_max) || 50;
  const quizItems = config.quiz_items || [];
  const totalQuizMax = quizItems.reduce((acc, it) => acc + (Number(it.max) || 0), 0) || 225;
  const rtMax = Number(config.rt_max) || 50;
  const atMax = Number(config.at_max) || 36;
  const meW = config.me_weight || 40;
  const qW = config.quiz_weight || 25;
  const rW = config.recitation_weight || 25;
  const dW = config.deportment_weight || 5;
  const aW = config.attendance_weight || 5;

  // -------------------------------------------------------------
  // Sheet 1: Master Grade Sheet (Main Sheet matching Web App Table UI)
  // -------------------------------------------------------------
  const ws1 = workbook.addWorksheet(termTitle, {
    views: [{ showGridLines: true }],
  });

  // Top Title Banner (Rows 2 & 3)
  ws1.addRow([]);
  const titleRow = ws1.addRow([`SECTION ${sectionId} — ${termTitle.toUpperCase()} GRADING MASTER SHEET`]);
  ws1.mergeCells("A2:T2");
  titleRow.getCell(1).font = { bold: true, size: 14, color: { argb: "FFFFFFFF" } };
  titleRow.getCell(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF065F46" }, // Emerald 800
  };
  titleRow.getCell(1).alignment = { horizontal: "center", vertical: "middle" };
  titleRow.height = 30;

  const subBanner = ws1.addRow([
    `Generated on ${format(new Date(), "MMMM dd, yyyy • h:mm a")} | Section: ${sectionId} | Period: ${termTitle}`
  ]);
  ws1.mergeCells("A3:T3");
  subBanner.getCell(1).font = { italic: true, size: 9, color: { argb: "FF475569" } };
  subBanner.getCell(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFF1F5F9" },
  };
  subBanner.getCell(1).alignment = { horizontal: "center", vertical: "middle" };
  subBanner.height = 18;

  ws1.addRow([]); // Blank row 4

  // Category Row (Row 5)
  const catRow = [
    "NO",
    "NAME",
    "Major Exam", "", "",
    "Quiz", "", "",
    "Recitation", "", "",
    "Deportment", "",
    "Attendance", "", "",
    "CS",
    "GRADE",
    "SMART STATUS",
    "#",
  ];
  const row5 = ws1.addRow(catRow);
  ws1.mergeCells("C5:E5"); // Major Exam
  ws1.mergeCells("F5:H5"); // Quiz
  ws1.mergeCells("I5:K5"); // Recitation
  ws1.mergeCells("L5:M5"); // Deportment
  ws1.mergeCells("N5:P5"); // Attendance

  // Sub-header Codes Row (Row 6)
  const subRow = [
    "NO",
    "STUDENT NAME",
    "MET", "MER", "MEP",
    "QT", "QR", "QP",
    "RT", "RR", "RP",
    "DR", "DP",
    "AT", "AR", "AP",
    "60%",
    "FINAL",
    "EVALUATION",
    "#",
  ];
  const row6 = ws1.addRow(subRow);

  // Weights & Max Items Row (Row 7)
  const metaRow = [
    "",
    "MAX / WEIGHT",
    meMax, "", `${meW}%`,
    totalQuizMax, "", `${qW}%`,
    rtMax, "", `${rW}%`,
    "", `${dW}%`,
    atMax, "", `${aW}%`,
    "60%",
    "100%",
    "AUTO SMART",
    "",
  ];
  const row7 = ws1.addRow(metaRow);

  // Category Color Palette matching Web App Table UI
  const categoryFills = {
    base: { type: "pattern", pattern: "solid", fgColor: { argb: "FFF8FAFC" } },
    exam: { type: "pattern", pattern: "solid", fgColor: { argb: "FFE0F2FE" } },      // Sky 100
    quiz: { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFE4E6" } },      // Rose 100
    recitation: { type: "pattern", pattern: "solid", fgColor: { argb: "FFD1FAE5" } },// Emerald 100
    deportment: { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFEDD5" } },// Orange 100
    attendance: { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFE4E6" } },// Rose 100
    cs: { type: "pattern", pattern: "solid", fgColor: { argb: "FFBAE6FD" } },        // Sky 200
    grade: { type: "pattern", pattern: "solid", fgColor: { argb: "FFE2E8F0" } },     // Slate 200
    smart: { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1F5F9" } },     // Slate 100
  };

  const borderThin = {
    top: { style: "thin", color: { argb: "FFCBD5E1" } },
    left: { style: "thin", color: { argb: "FFCBD5E1" } },
    bottom: { style: "thin", color: { argb: "FFCBD5E1" } },
    right: { style: "thin", color: { argb: "FFCBD5E1" } },
  };

  // Style Row 5 (Category Groups)
  row5.font = { bold: true, size: 10 };
  row5.alignment = { horizontal: "center", vertical: "middle" };
  row5.height = 24;
  row5.eachCell((cell, colNum) => {
    cell.border = borderThin;
    if (colNum <= 2) cell.fill = categoryFills.base;
    else if (colNum >= 3 && colNum <= 5) { cell.fill = categoryFills.exam; cell.font = { bold: true, size: 10, color: { argb: "FF0369A1" } }; }
    else if (colNum >= 6 && colNum <= 8) { cell.fill = categoryFills.quiz; cell.font = { bold: true, size: 10, color: { argb: "FF9F1239" } }; }
    else if (colNum >= 9 && colNum <= 11) { cell.fill = categoryFills.recitation; cell.font = { bold: true, size: 10, color: { argb: "FF065F46" } }; }
    else if (colNum >= 12 && colNum <= 13) { cell.fill = categoryFills.deportment; cell.font = { bold: true, size: 10, color: { argb: "FF9A3412" } }; }
    else if (colNum >= 14 && colNum <= 16) { cell.fill = categoryFills.attendance; cell.font = { bold: true, size: 10, color: { argb: "FF9F1239" } }; }
    else if (colNum === 17) { cell.fill = categoryFills.cs; cell.font = { bold: true, size: 11, color: { argb: "FF075985" } }; }
    else if (colNum === 18) { cell.fill = categoryFills.grade; cell.font = { bold: true, size: 11, color: { argb: "FF0F172A" } }; }
    else if (colNum === 19) { cell.fill = categoryFills.smart; cell.font = { bold: true, size: 10, color: { argb: "FF334155" } }; }
    else if (colNum === 20) { cell.fill = categoryFills.base; }
  });

  // Style Row 6 (Sub-column Codes)
  row6.font = { bold: true, size: 9 };
  row6.alignment = { horizontal: "center", vertical: "middle" };
  row6.height = 20;
  row6.eachCell((cell, colNum) => {
    cell.border = borderThin;
    cell.fill = categoryFills.base;
    if (colNum === 5) { cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFBAE6FD" } }; } // MEP
    else if (colNum === 8) { cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFEF3C7" } }; } // QP
    else if (colNum === 11) { cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD1FAE5" } }; } // RP
    else if (colNum === 13) { cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFEDD5" } }; } // DP
    else if (colNum === 16) { cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFECDD3" } }; } // AP
    else if (colNum === 17) { cell.fill = categoryFills.cs; }
    else if (colNum === 18) { cell.fill = categoryFills.grade; }
    else if (colNum === 19) { cell.fill = categoryFills.smart; }
  });

  // Style Row 7 (Weights & Max)
  row7.font = { bold: true, size: 9 };
  row7.alignment = { horizontal: "center", vertical: "middle" };
  row7.height = 20;
  row7.eachCell((cell, colNum) => {
    cell.border = borderThin;
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFFFFF" } };
    if ([5, 8, 11, 13, 16, 17, 18].includes(colNum)) {
      cell.font = { bold: true, size: 9, color: { argb: "FF0F172A" } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1F5F9" } };
    }
  });

  // Add Student Data Rows with matching web app UI styling
  computedRows.forEach((item, index) => {
    const isEven = index % 2 === 0;
    const isPassing = typeof item.finalGrade === "number" && item.finalGrade >= 75.0;
    const isFailed = typeof item.finalGrade === "number" && item.finalGrade < 75.0;

    // Smart status text
    let smartLabel = "Pending";
    let statusFillColor = "FFF1F5F9";
    let statusTextColor = "FF64748B";

    const sj = item.smartJudgement;
    if (sj) {
      if (sj.category === "BEST") {
        smartLabel = `Best${sj.rank ? ` (Rank #${sj.rank})` : ""}`;
        statusFillColor = "FFD1FAE5";
        statusTextColor = "FF065F46";
      } else if (sj.category === "SATISFACTORY") {
        smartLabel = `Good${sj.rank ? ` (Rank #${sj.rank})` : ""}`;
        statusFillColor = "FFE0F2FE";
        statusTextColor = "FF0369A1";
      } else if (sj.category === "NEEDS_IMPROVEMENT") {
        smartLabel = "Needs Improvement";
        statusFillColor = "FFFEF3C7";
        statusTextColor = "FF92400E";
      } else if (sj.category === "FAILED") {
        smartLabel = "Failed";
        statusFillColor = "FFFFE4E6";
        statusTextColor = "FF991B1B";
      } else if (sj.category === "WITHDRAWN") {
        smartLabel = sj.badge || "Withdrawn";
        statusFillColor = "FFF3E8FF";
        statusTextColor = "FF6B21A8";
      }
    }

    const rData = [
      index + 1,
      item.name,
      item.met !== "" ? item.met : "",
      item.mer !== "" ? item.mer : "",
      item.mep !== "" ? Number(item.mep).toFixed(2) : "",
      item.qt !== "" ? item.qt : "",
      item.qr !== "" ? item.qr : "",
      item.qp !== "" ? Number(item.qp).toFixed(2) : "",
      item.rt !== "" ? item.rt : "",
      item.rr !== "" ? item.rr : "",
      item.rp !== "" ? Number(item.rp).toFixed(2) : "",
      item.dr !== "" ? Number(item.dr).toFixed(2) : "",
      item.dp !== "" ? Number(item.dp).toFixed(2) : "",
      item.at !== "" ? item.at : "",
      item.ar !== "" ? Number(item.ar).toFixed(2) : "",
      item.ap !== "" ? Number(item.ap).toFixed(2) : "",
      item.cs !== "" ? Number(item.cs).toFixed(2) : "",
      item.finalGrade !== "" ? Number(item.finalGrade).toFixed(2) : "",
      smartLabel,
      index + 1,
    ];

    const newRow = ws1.addRow(rData);
    newRow.height = 22;
    newRow.font = { size: 9 };

    newRow.eachCell((cell, colNum) => {
      cell.border = borderThin;
      // Zebra striping base
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: isEven ? "FFFFFFFF" : "FFF8FAFC" },
      };

      // Alignment
      if (colNum === 1 || colNum === 20) {
        cell.alignment = { horizontal: "center", vertical: "middle" };
        cell.font = { size: 9, color: { argb: "FF64748B" } };
      } else if (colNum === 2) {
        cell.alignment = { horizontal: "left", vertical: "middle" };
        cell.font = { bold: true, size: 9.5, color: { argb: "FF1E293B" } };
      } else {
        cell.alignment = { horizontal: "center", vertical: "middle" };
      }

      // Column Specific Fills matching Web App Table UI
      if (colNum === 5) { // MEP (Sky)
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF0F9FF" } };
        cell.font = { bold: true, size: 9, color: { argb: "FF0284C7" } };
      } else if (colNum === 8) { // QP (Amber)
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFFBEB" } };
        cell.font = { bold: true, size: 9, color: { argb: "FFD97706" } };
      } else if (colNum === 11) { // RP (Emerald)
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFECFDF5" } };
        cell.font = { bold: true, size: 9, color: { argb: "FF059669" } };
      } else if (colNum === 13) { // DP (Orange)
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFF7ED" } };
        cell.font = { bold: true, size: 9, color: { argb: "FFEA580C" } };
      } else if (colNum === 16) { // AP (Rose)
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFF1F2" } };
        cell.font = { bold: true, size: 9, color: { argb: "FFE11D48" } };
      } else if (colNum === 17) { // CS (Sky accent)
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE0F2FE" } };
        cell.font = { bold: true, size: 10, color: { argb: "FF0369A1" } };
      } else if (colNum === 18) { // FINAL GRADE (Passing = Emerald, Failing = Red)
        if (isPassing) {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFDCFCE7" } }; // Green 100
          cell.font = { bold: true, size: 10.5, color: { argb: "FF15803D" } };             // Green 700
        } else if (isFailed) {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFE4E6" } }; // Rose 100
          cell.font = { bold: true, size: 10.5, color: { argb: "FFDC2626" } };             // Red 600
        } else {
          cell.font = { bold: true, size: 10, color: { argb: "FF0F172A" } };
        }
      } else if (colNum === 19) { // SMART STATUS
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: statusFillColor } };
        cell.font = { bold: true, size: 9, color: { argb: statusTextColor } };
      }
    });
  });

  // Optimized Column Widths matching Web App layout
  ws1.columns = [
    { width: 6 },  // 1: NO
    { width: 34 }, // 2: NAME
    { width: 9 },  // 3: MET
    { width: 9 },  // 4: MER
    { width: 10 }, // 5: MEP
    { width: 9 },  // 6: QT
    { width: 9 },  // 7: QR
    { width: 10 }, // 8: QP
    { width: 9 },  // 9: RT
    { width: 9 },  // 10: RR
    { width: 10 }, // 11: RP
    { width: 9 },  // 12: DR
    { width: 10 }, // 13: DP
    { width: 9 },  // 14: AT
    { width: 9 },  // 15: AR
    { width: 10 }, // 16: AP
    { width: 12 }, // 17: CS
    { width: 14 }, // 18: FINAL GRADE
    { width: 22 }, // 19: SMART STATUS
    { width: 6 },  // 20: #
  ];

  // -------------------------------------------------------------
  // Sheet 2: Raw Scores Input Ground (Matching Web App Input Ground)
  // -------------------------------------------------------------
  const ws2 = workbook.addWorksheet(csTitle, {
    views: [{ showGridLines: true }],
  });

  // Title Banner
  ws2.addRow([]);
  const titleRow2 = ws2.addRow([`SECTION ${sectionId} — RAW SCORES INPUT GROUND (${csTitle})`]);
  const totalCols2 = 7 + quizItems.length;
  ws2.mergeCells(2, 1, 2, totalCols2);
  titleRow2.getCell(1).font = { bold: true, size: 13, color: { argb: "FFFFFFFF" } };
  titleRow2.getCell(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF0F766E" }, // Teal 700
  };
  titleRow2.getCell(1).alignment = { horizontal: "center", vertical: "middle" };
  titleRow2.height = 28;

  // Category Header Row (Row 4)
  const cat2 = ["NO", "NAME", "MAJOR EXAM", "", "", "", "", "QUIZ ACTIVITIES"];
  const r4 = ws2.addRow(cat2);
  ws2.mergeCells("C4:G4"); // MAJOR EXAM (PE, ME, +, -, MET)
  if (quizItems.length > 0) {
    ws2.mergeCells(4, 8, 4, 8 + quizItems.length); // QUIZ
  }
  r4.font = { bold: true, size: 10 };
  r4.alignment = { horizontal: "center", vertical: "middle" };
  r4.height = 22;
  r4.eachCell((cell, colNum) => {
    cell.border = borderThin;
    if (colNum <= 2) cell.fill = categoryFills.base;
    else if (colNum >= 3 && colNum <= 7) {
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFEF9C3" } }; // Yellow 100
      cell.font = { bold: true, size: 10, color: { argb: "FF713F12" } };
    } else {
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFDCFCE7" } }; // Green 100
      cell.font = { bold: true, size: 10, color: { argb: "FF14532D" } };
    }
  });

  // Item Headers (Row 5)
  const sub2 = [
    "NO",
    "NAME",
    "PE", "ME", "+", "–", "MET",
    ...quizItems.map((q) => q.name || q.id),
    "QAT",
  ];
  const r5 = ws2.addRow(sub2);
  r5.font = { bold: true, size: 9 };
  r5.alignment = { horizontal: "center", vertical: "middle" };
  r5.height = 20;
  r5.eachCell((cell, colNum) => {
    cell.border = borderThin;
    if (colNum <= 2) cell.fill = categoryFills.base;
    else if (colNum >= 3 && colNum <= 7) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFEF08A" } };
    else cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFBBF7D0" } };
  });

  // Max Points (Row 6)
  const max2 = [
    "",
    "MAX SCORE",
    "", meMax, "+", "–", meMax,
    ...quizItems.map((q) => Number(q.max) || 0),
    totalQuizMax,
  ];
  const r6 = ws2.addRow(max2);
  r6.font = { bold: true, size: 9 };
  r6.alignment = { horizontal: "center", vertical: "middle" };
  r6.height = 20;
  r6.eachCell((cell) => {
    cell.border = borderThin;
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFFFFF" } };
  });

  // Student Input Data Rows
  computedRows.forEach((item, index) => {
    const isEven = index % 2 === 0;
    const s = item.scores || {};
    const quizScores = quizItems.map((q) => {
      const v = s.quizzes?.[q.id];
      return v !== undefined && v !== null && v !== "" ? Number(v) : "";
    });

    const rowData = [
      index + 1,
      item.name,
      s.pe !== undefined && s.pe !== null ? s.pe : "",
      s.me !== undefined && s.me !== null ? s.me : "",
      s.plus !== undefined && s.plus !== null ? s.plus : "",
      s.minus !== undefined && s.minus !== null ? s.minus : "",
      item.met !== "" ? item.met : "",
      ...quizScores,
      item.qt !== "" ? item.qt : "",
    ];

    const newRow = ws2.addRow(rowData);
    newRow.height = 21;
    newRow.font = { size: 9 };
    newRow.eachCell((cell, colNum) => {
      cell.border = borderThin;
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: isEven ? "FFFFFFFF" : "FFF8FAFC" },
      };
      if (colNum === 1) cell.alignment = { horizontal: "center" };
      else if (colNum === 2) { cell.alignment = { horizontal: "left" }; cell.font = { bold: true, size: 9 }; }
      else cell.alignment = { horizontal: "center" };

      // Highlight MET and QAT totals
      if (colNum === 7) {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFEF9C3" } };
        cell.font = { bold: true, size: 9.5 };
      } else if (colNum === rowData.length) {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFDCFCE7" } };
        cell.font = { bold: true, size: 9.5 };
      }
    });
  });

  // Auto column widths for Sheet 2
  ws2.columns = [
    { width: 6 },
    { width: 34 },
    { width: 8 }, { width: 8 }, { width: 6 }, { width: 6 }, { width: 10 },
    ...quizItems.map(() => ({ width: 10 })),
    { width: 12 },
  ];

  // Save File
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  saveAs(
    blob,
    `Grades_${sectionId}_${termTitle}_${format(new Date(), "yyyyMMdd")}.xlsx`
  );
};

export const exportSemestralGradesToExcel = async ({
  sectionId,
  semestralRows = [],
}) => {
  const workbook = new ExcelJS.Workbook();
  const ws = workbook.addWorksheet("Semestral Grade", {
    views: [{ showGridLines: true }],
  });

  const borderThin = {
    top: { style: "thin", color: { argb: "FFCBD5E1" } },
    left: { style: "thin", color: { argb: "FFCBD5E1" } },
    bottom: { style: "thin", color: { argb: "FFCBD5E1" } },
    right: { style: "thin", color: { argb: "FFCBD5E1" } },
  };

  // Top Title Banner (Row 2 & 3)
  ws.addRow([]);
  const titleRow = ws.addRow([`SECTION ${sectionId} — OFFICIAL SEMESTRAL GRADE SHEET`]);
  ws.mergeCells("A2:J2");
  titleRow.getCell(1).font = { bold: true, size: 14, color: { argb: "FFFFFFFF" } };
  titleRow.getCell(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF065F46" }, // Emerald 800
  };
  titleRow.getCell(1).alignment = { horizontal: "center", vertical: "middle" };
  titleRow.height = 30;

  const subBanner = ws.addRow([
    `Academic Evaluation • Section: ${sectionId} • Computation: Midterm Term (50%) + Final Term (50%) • Generated: ${format(new Date(), "MMMM dd, yyyy")}`
  ]);
  ws.mergeCells("A3:J3");
  subBanner.getCell(1).font = { italic: true, size: 9, color: { argb: "FF475569" } };
  subBanner.getCell(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFF1F5F9" },
  };
  subBanner.getCell(1).alignment = { horizontal: "center", vertical: "middle" };
  subBanner.height = 18;

  ws.addRow([]); // Blank row 4

  // Category Header Row (Row 5)
  const headerRow1 = [
    "#",
    "Names",
    "M.I.",
    "MIDTERM TERM",
    "FINAL TERM",
    "SEM. GRADE",
    "EQUIV. GRADE",
    "Remarks",
    "SMART STATUS & TREND",
    "#",
  ];
  const r5 = ws.addRow(headerRow1);

  // Subheader Row (Row 6)
  const headerRow2 = [
    "",
    "(Strictly alphabetical order irrespective of sex)",
    "",
    "50%",
    "50%",
    "100%",
    "Scale",
    "",
    "Diagnostic Standing",
    "",
  ];
  const r6 = ws.addRow(headerRow2);

  // Merge header cells
  ws.mergeCells("A5:A6"); // #
  ws.mergeCells("C5:C6"); // M.I.
  ws.mergeCells("H5:H6"); // Remarks
  ws.mergeCells("I5:I6"); // Smart status
  ws.mergeCells("J5:J6"); // Trailing #

  // Style Header Rows (5 & 6)
  [r5, r6].forEach((row, idx) => {
    row.font = { bold: true, size: idx === 0 ? 10 : 9 };
    row.alignment = { horizontal: "center", vertical: "middle" };
    row.height = 22;
    row.eachCell((cell, colNum) => {
      cell.border = borderThin;
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: idx === 0 ? "FFE2E8F0" : "FFF1F5F9" },
      };
      if ([4, 5].includes(colNum)) {
        cell.font = { bold: true, size: 9.5, color: { argb: "FF0369A1" } };
      } else if ([6, 7].includes(colNum)) {
        cell.font = { bold: true, size: 10, color: { argb: "FF0F172A" } };
      }
    });
  });
  ws.getCell("B6").font = { italic: true, size: 9, color: { argb: "FF64748B" } };

  // Data rows matching Web App UI
  semestralRows.forEach((item, idx) => {
    const isEven = idx % 2 === 0;
    const isFailedFinal = typeof item.finalGrade === "number" && item.finalGrade < 75.0;
    const isFailedMidterm = typeof item.midtermGrade === "number" && item.midtermGrade < 75.0;
    const isFailedSem = typeof item.semGrade === "number" && (item.semGrade < 75.0 || item.equivGrade === "5.00");
    const isPassed = typeof item.semGrade === "number" && item.semGrade >= 75.0 && item.equivGrade !== "5.00";
    const isAWorUW = item.remarks === "AW" || item.remarks === "UW";

    let smartSummary = "Pending";
    let statusFillColor = "FFF1F5F9";
    let statusTextColor = "FF64748B";

    const sj = item.smartJudgement;
    if (sj) {
      if (sj.category === "BEST") {
        smartSummary = `${sj.title || "Honors"}${sj.trajectoryLabel ? ` (${sj.trajectoryLabel})` : ""}`;
        statusFillColor = "FFD1FAE5";
        statusTextColor = "FF065F46";
      } else if (sj.category === "SATISFACTORY") {
        smartSummary = `Good Standing${sj.trajectoryLabel ? ` (${sj.trajectoryLabel})` : ""}`;
        statusFillColor = "FFE0F2FE";
        statusTextColor = "FF0369A1";
      } else if (sj.category === "NEEDS_IMPROVEMENT") {
        smartSummary = `Borderline${sj.trajectoryLabel ? ` (${sj.trajectoryLabel})` : ""}`;
        statusFillColor = "FFFEF3C7";
        statusTextColor = "FF92400E";
      } else if (sj.category === "FAILED") {
        smartSummary = `Failed (5.00)${sj.trajectoryLabel ? ` (${sj.trajectoryLabel})` : ""}`;
        statusFillColor = "FFFFE4E6";
        statusTextColor = "FF991B1B";
      } else if (sj.category === "WITHDRAWN") {
        smartSummary = sj.title || "Withdrawn";
        statusFillColor = "FFF3E8FF";
        statusTextColor = "FF6B21A8";
      }
    }

    const remarksText = item.remarks || (isFailedSem ? "Failed" : item.semGrade !== "" ? "Passed" : "");

    const rowData = [
      idx + 1,
      item.name,
      item.mi || "",
      item.midtermGrade !== "" && item.midtermGrade !== undefined ? Number(item.midtermGrade).toFixed(2) : "",
      item.finalGrade !== "" && item.finalGrade !== undefined ? Number(item.finalGrade).toFixed(2) : "",
      item.semGrade !== "" && item.semGrade !== undefined ? Number(item.semGrade).toFixed(2) : "",
      item.equivGrade || "",
      remarksText,
      smartSummary,
      idx + 1,
    ];

    const newRow = ws.addRow(rowData);
    newRow.height = 22;
    newRow.font = { size: 9.5 };

    newRow.eachCell((cell, colNum) => {
      cell.border = borderThin;
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: isEven ? "FFFFFFFF" : "FFF8FAFC" },
      };

      if (colNum === 1 || colNum === 10) {
        cell.alignment = { horizontal: "center", vertical: "middle" };
        cell.font = { size: 9, color: { argb: "FF64748B" } };
      } else if (colNum === 2) {
        cell.alignment = { horizontal: "left", vertical: "middle" };
        cell.font = { bold: true, size: 10, color: { argb: "FF1E293B" } };
      } else {
        cell.alignment = { horizontal: "center", vertical: "middle" };
      }

      // Midterm Grade
      if (colNum === 4) {
        if (isFailedMidterm) {
          cell.font = { bold: true, size: 9.5, color: { argb: "FFDC2626" } };
        } else {
          cell.font = { size: 9.5, color: { argb: "FF0F172A" } };
        }
      }

      // Final Grade
      if (colNum === 5) {
        if (isFailedFinal) {
          cell.font = { bold: true, size: 9.5, color: { argb: "FFDC2626" } };
        } else {
          cell.font = { size: 9.5, color: { argb: "FF0F172A" } };
        }
      }

      // Semestral Grade (Matching Web App UI)
      if (colNum === 6) {
        if (isPassed) {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFDCFCE7" } };
          cell.font = { bold: true, size: 11, color: { argb: "FF15803D" } };
        } else if (isFailedSem) {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFE4E6" } };
          cell.font = { bold: true, size: 11, color: { argb: "FFDC2626" } };
        } else {
          cell.font = { bold: true, size: 11 };
        }
      }

      // Equiv Grade
      if (colNum === 7) {
        if (isFailedSem || item.equivGrade === "5.00") {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFE4E6" } };
          cell.font = { bold: true, size: 10.5, color: { argb: "FFDC2626" } };
        } else {
          cell.font = { bold: true, size: 10.5, color: { argb: "FF0F172A" } };
        }
      }

      // Remarks
      if (colNum === 8) {
        if (isFailedSem || remarksText === "Failed") {
          cell.font = { bold: true, size: 10, color: { argb: "FFDC2626" } };
        } else if (isPassed || remarksText === "Passed") {
          cell.font = { bold: true, size: 10, color: { argb: "FF15803D" } };
        } else if (isAWorUW) {
          cell.font = { bold: true, size: 10, color: { argb: "FF7E22CE" } };
        }
      }

      // Smart Status & Trend
      if (colNum === 9) {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: statusFillColor } };
        cell.font = { bold: true, size: 9, color: { argb: statusTextColor } };
      }
    });
  });

  // Column Widths
  ws.columns = [
    { width: 6 },  // 1: #
    { width: 34 }, // 2: Names
    { width: 8 },  // 3: M.I.
    { width: 16 }, // 4: MIDTERM TERM
    { width: 16 }, // 5: FINAL TERM
    { width: 16 }, // 6: SEM. GRADE
    { width: 15 }, // 7: EQUIV. GRADE
    { width: 14 }, // 8: Remarks
    { width: 28 }, // 9: SMART STATUS & TREND
    { width: 6 },  // 10: #
  ];

  // Save File
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  saveAs(
    blob,
    `Semestral_Grades_${sectionId}_${format(new Date(), "yyyyMMdd")}.xlsx`
  );
};
