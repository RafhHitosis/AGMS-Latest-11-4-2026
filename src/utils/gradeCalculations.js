// Grade Calculation Engine implementing exact MS Excel Formulas & Clamped Transmutations

/**
 * Helper to clamp values strictly within [min, max]
 */
export const clamp = (val, min, max) => Math.max(min, Math.min(max, val));

/**
 * Calculate Major Exam Total (MET) from raw scores
 * Formula: =IF(A5 <> "", SUM(B5:D5) - E5, "")
 */
export const calculateMET = (scores, meMax = 50) => {
  if (!scores) return "";
  const pe = scores.pe !== undefined && scores.pe !== null && scores.pe !== "" ? Number(scores.pe) : null;
  const me = scores.me !== undefined && scores.me !== null && scores.me !== "" ? Number(scores.me) : null;
  const plus = scores.plus !== undefined && scores.plus !== null && scores.plus !== "" ? Number(scores.plus) : null;
  const minus = scores.minus !== undefined && scores.minus !== null && scores.minus !== "" ? Number(scores.minus) : null;

  if (pe === null && me === null && plus === null && minus === null) return "";
  const rawSum = (pe || 0) + (me || 0) + (plus || 0) - (minus || 0);
  return Math.max(0, rawSum);
};

/**
 * Calculate Quiz Total (QT / QAT) from quiz items
 * Formula: =IF(A5 <> "", SUM(H5:L5), "")
 */
export const calculateQT = (scores, quizItems = []) => {
  if (!scores || !scores.quizzes) return "";
  let hasAny = false;
  let sum = 0;

  for (const item of quizItems) {
    const val = scores.quizzes[item.id];
    if (val !== undefined && val !== null && val !== "") {
      hasAny = true;
      sum += Number(val) || 0;
    }
  }

  return hasAny ? sum : "";
};

/**
 * Calculate Major Exam Rating (MER)
 * Formula: =IF(AND($B7 <> "", AND($N7 <> "AW", $N7 <> "UW")), IF(C7 <> "", ROUND(C7 /C$5 * (U$11 - V$11) + V$11, 0), ""), "")
 * Default Transmutation: Base-50 (meLow: 50, meHigh: 100). Rating is strictly clamped to [meLow, meHigh].
 */
export const calculateMER = (met, totalPossibleME = 50, meHigh = 100, meLow = 50, remarks = "") => {
  const normRemarks = (remarks || "").trim().toUpperCase();
  if (normRemarks === "AW" || normRemarks === "UW") return "";
  if (met === "" || met === null || met === undefined || !totalPossibleME) return "";

  const score = Number(met);
  if (isNaN(score)) return "";

  const rawRating = Math.round((score / totalPossibleME) * (meHigh - meLow) + meLow);
  return clamp(rawRating, meLow, meHigh);
};

/**
 * Calculate Quiz Rating (QR / ARR)
 * Formula: =IF(AND($B7 <> "", AND($N7 <> "AW", $N7 <> "UW")), IF(F7 <> "", ROUND(F7 /F$5 * (X$11 - Y$11) + Y$11, 0), ""), "")
 * Default Transmutation: Base-50 (quizLow: 50, quizHigh: 100). Rating is strictly clamped to [quizLow, quizHigh].
 */
export const calculateQR = (qt, totalPossibleQuiz = 225, quizHigh = 100, quizLow = 50, remarks = "") => {
  const normRemarks = (remarks || "").trim().toUpperCase();
  if (normRemarks === "AW" || normRemarks === "UW") return "";
  if (qt === "" || qt === null || qt === undefined || !totalPossibleQuiz) return "";

  const score = Number(qt);
  if (isNaN(score)) return "";

  const rawRating = Math.round((score / totalPossibleQuiz) * (quizHigh - quizLow) + quizLow);
  return clamp(rawRating, quizLow, quizHigh);
};

/**
 * Calculate Recitation Rating (RR)
 * Formula: =IF(AND($B7 <> "", AND($N7 <> "AW", $N7 <> "UW")), IF(I7 <> "", ROUND(I7 /I$5 * ($U$18 - $V$18) + $V$18, 0), ""), "")
 * Transmutation Range: [recLow: 70, recHigh: 95]. Rating is strictly clamped to [recLow, recHigh].
 */
export const calculateRR = (rt, totalPossibleRec = 50, recHigh = 95, recLow = 70, remarks = "") => {
  const normRemarks = (remarks || "").trim().toUpperCase();
  if (normRemarks === "AW" || normRemarks === "UW") return "";
  if (rt === "" || rt === null || rt === undefined || !totalPossibleRec) return "";

  const score = Number(rt);
  if (isNaN(score)) return "";

  const rawRating = Math.round((score / totalPossibleRec) * (recHigh - recLow) + recLow);
  return clamp(rawRating, recLow, recHigh);
};

/**
 * Calculate Deportment Rating (DR)
 * Formula: =IF(N7 <> "", IF(OR(N7 = "AW", N7 = "UW"), "", 90 - (IF(N$5 <= 5, (N$5 - N7) * 4, (IF(N$5 <= 10, (N$5 - N7) * 2.5, (N$5 - N7) * 1.5))))), "")
 * Based on AT (N7) and Total Sessions (N5, default 36). Rating is strictly clamped to [0, 90].
 */
export const calculateDR = (at, totalDays = 36, remarks = "") => {
  const normRemarks = (remarks || "").trim().toUpperCase();
  if (normRemarks === "AW" || normRemarks === "UW") return "";
  if (at === "" || at === null || at === undefined || !totalDays) return "";

  const present = Number(at);
  if (isNaN(present)) return "";

  const absences = Math.max(0, totalDays - present);
  let deduction = 0;
  if (totalDays <= 5) {
    deduction = absences * 4;
  } else if (totalDays <= 10) {
    deduction = absences * 2.5;
  } else {
    deduction = absences * 1.5;
  }

  const dr = 90 - deduction;
  return clamp(Number(dr.toFixed(2)), 0, 90);
};

/**
 * Calculate Attendance Rating (AR)
 * Formula: =IF(N7 <> "", IF(OR(N7 = "AW", N7 = "UW"), "", ROUND(N7 / N$5 * (U$6 - V$6) + V$6, 2)), "")
 * Transmutation Range: [attLow: 70, attHigh: 95]. Rating is strictly clamped to [attLow, attHigh].
 */
export const calculateAR = (at, totalDays = 36, attHigh = 95, attLow = 70, remarks = "") => {
  const normRemarks = (remarks || "").trim().toUpperCase();
  if (normRemarks === "AW" || normRemarks === "UW") return "";
  if (at === "" || at === null || at === undefined || !totalDays) return "";

  const present = Number(at);
  if (isNaN(present)) return "";

  const rawAr = (present / totalDays) * (attHigh - attLow) + attLow;
  return clamp(Number(rawAr.toFixed(2)), attLow, attHigh);
};

/**
 * Calculate all student grade row components strictly matching the Excel formulas and transmutation constraints.
 */
export const computeStudentGradeRow = (student, scores = {}, config = {}, absencesCount = 0) => {
  const trans = config.transmutation || {};
  const weights = config.weights || {};
  const quizItems = config.quiz_items || [];

  const peMax = Number(config.pe_max) || 0;
  const meMax = Number(config.me_max) || 50;
  const metMax = Math.max(1, peMax + meMax || 50);
  const sumQuiz = quizItems.reduce((acc, it) => acc + (Number(it.max) || 0), 0);
  const totalQuizMax = sumQuiz > 0 ? sumQuiz : 225;
  const rtMax = Math.max(1, Number(config.rt_max) || 50);
  const atMax = Math.max(1, Number(config.at_max) || 36);

  const meHigh = Number(trans.me_high) || 100;
  const meLow = Number(trans.me_low) || 50;
  const quizHigh = Number(trans.quiz_high) || 100;
  const quizLow = Number(trans.quiz_low) || 50;
  const recHigh = Number(trans.rec_high) || 95;
  const recLow = Number(trans.rec_low) || 70;
  const attHigh = Number(trans.att_high) || 95;
  const attLow = Number(trans.att_low) || 70;

  const meWeight = Number(weights.me) || 0.40;
  const quizWeight = Number(weights.quiz) || 0.25;
  const recWeight = Number(weights.rec) || 0.25;
  const depWeight = Number(weights.dep) || 0.05;
  const attWeight = Number(weights.att) || 0.05;

  const remarks = (scores.remarks || "").trim().toUpperCase();

  // Raw Scores
  const met = calculateMET(scores, metMax);
  const qt = calculateQT(scores, quizItems);
  const rt = scores.rt !== undefined && scores.rt !== null && scores.rt !== "" ? Number(scores.rt) : "";

  // Attendance: Only set if entered by user (or synced)
  let at = "";
  if (scores.at !== undefined && scores.at !== null && scores.at !== "") {
    at = Number(scores.at);
  }

  // Transmuted Ratings (clamped within [low, high])
  const mer = calculateMER(met, metMax, meHigh, meLow, remarks);
  const qr = calculateQR(qt, totalQuizMax, quizHigh, quizLow, remarks);
  const rr = calculateRR(rt, rtMax, recHigh, recLow, remarks);
  const dr = calculateDR(at, atMax, remarks);
  const ar = calculateAR(at, atMax, attHigh, attLow, remarks);

  // Percentages (clamped to max weight)
  const mep = mer !== "" ? clamp(Number((mer * meWeight).toFixed(2)), 0, Number((meHigh * meWeight).toFixed(2))) : "";
  const qp = qr !== "" ? clamp(Number((qr * quizWeight).toFixed(2)), 0, Number((quizHigh * quizWeight).toFixed(2))) : "";
  const rp = rr !== "" ? clamp(Number((rr * recWeight).toFixed(2)), 0, Number((recHigh * recWeight).toFixed(2))) : "";
  const dp = dr !== "" ? clamp(Number((dr * depWeight).toFixed(2)), 0, Number((90 * depWeight).toFixed(2))) : "";
  const ap = ar !== "" ? clamp(Number((ar * attWeight).toFixed(2)), 0, Number((attHigh * attWeight).toFixed(2))) : "";

  // CS 60% = QP + RP + DP + AP
  // Formula: =IF(B7 <> "", H7 + K7 + M7 + P7, "")
  let cs = "";
  if (qp !== "" || rp !== "" || dp !== "" || ap !== "") {
    const csVal = (qp !== "" ? Number(qp) : 0) +
                  (rp !== "" ? Number(rp) : 0) +
                  (dp !== "" ? Number(dp) : 0) +
                  (ap !== "" ? Number(ap) : 0);
    cs = clamp(Number(csVal.toFixed(2)), 0, 60.00);
  }

  // Final Grade = MEP + CS
  // Formula: =IF(B7 <> "", IF(OR(N7 = "AW", N7 = "UW"), UPPER(N7), ROUND(E7 + H7 + K7 + M7 + P7, 2)), "")
  let finalGrade = "";
  if (remarks === "AW" || remarks === "UW") {
    finalGrade = remarks;
  } else if (mep !== "" || cs !== "") {
    const totalVal = (mep !== "" ? Number(mep) : 0) + (cs !== "" ? Number(cs) : 0);
    finalGrade = clamp(Number(totalVal.toFixed(2)), 0, 100.00);
  }

  return {
    studentId: student.id,
    name: student.name,
    remarks,
    met,
    mer,
    mep,
    qt,
    qr,
    qp,
    rt,
    rr,
    rp,
    dr,
    dp,
    at,
    ar,
    ap,
    cs,
    finalGrade,
    scores,
  };
};

/**
 * Official Equivalent List / Grade Transmutation Scale (strictly matching Image 2)
 */
export const EQUIVALENCE_SCALE = [
  { grade: 100, equiv: "1.00" },
  { grade: 99, equiv: "1.00" },
  { grade: 98, equiv: "1.10" },
  { grade: 97, equiv: "1.20" },
  { grade: 96, equiv: "1.25" },
  { grade: 95, equiv: "1.30" },
  { grade: 94, equiv: "1.40" },
  { grade: 93, equiv: "1.50" },
  { grade: 92, equiv: "1.60" },
  { grade: 91, equiv: "1.70" },
  { grade: 90, equiv: "1.75" },
  { grade: 89, equiv: "1.80" },
  { grade: 88, equiv: "1.90" },
  { grade: 87, equiv: "2.00" },
  { grade: 86, equiv: "2.10" },
  { grade: 85, equiv: "2.20" },
  { grade: 84, equiv: "2.25" },
  { grade: 83, equiv: "2.30" },
  { grade: 82, equiv: "2.40" },
  { grade: 81, equiv: "2.50" },
  { grade: 80, equiv: "2.60" },
  { grade: 79, equiv: "2.70" },
  { grade: 78, equiv: "2.75" },
  { grade: 77, equiv: "2.80" },
  { grade: 76, equiv: "2.90" },
  { grade: 75, equiv: "3.00" },
  { grade: 74, equiv: "5.00" },
];

/**
 * Get Equivalent Grade based on Image 2 table
 * Formula in Excel: =VLOOKUP(SEM_GRADE, EquivTable, 2, TRUE)
 */
export const getEquivGrade = (grade) => {
  if (grade === "" || grade === null || grade === undefined || isNaN(Number(grade))) return "";
  const num = Number(grade);
  if (num >= 99) return "1.00";
  if (num >= 98) return "1.10";
  if (num >= 97) return "1.20";
  if (num >= 96) return "1.25";
  if (num >= 95) return "1.30";
  if (num >= 94) return "1.40";
  if (num >= 93) return "1.50";
  if (num >= 92) return "1.60";
  if (num >= 91) return "1.70";
  if (num >= 90) return "1.75";
  if (num >= 89) return "1.80";
  if (num >= 88) return "1.90";
  if (num >= 87) return "2.00";
  if (num >= 86) return "2.10";
  if (num >= 85) return "2.20";
  if (num >= 84) return "2.25";
  if (num >= 83) return "2.30";
  if (num >= 82) return "2.40";
  if (num >= 81) return "2.50";
  if (num >= 80) return "2.60";
  if (num >= 79) return "2.70";
  if (num >= 78) return "2.75";
  if (num >= 77) return "2.80";
  if (num >= 76) return "2.90";
  if (num >= 75) return "3.00";
  return "5.00";
};

/**
 * Calculate Semestral Grade: Midterm (50%) + Final Term (50%)
 * Formula: =ROUND((MIDTERM * 0.5) + (FINAL * 0.5), 2)
 */
export const calculateSemestralGrade = (midterm, finals) => {
  const hasM = midterm !== "" && midterm !== null && midterm !== undefined &&
    !(typeof midterm === "string" && midterm.trim() === "") && Number.isFinite(Number(midterm));
  const hasF = finals !== "" && finals !== null && finals !== undefined &&
    !(typeof finals === "string" && finals.trim() === "") && Number.isFinite(Number(finals));
  if (!hasM || !hasF) return "";

  const m = Number(midterm);
  const f = Number(finals);
  const rawSum = (m * 0.5) + (f * 0.5);
  // Match exact MS Excel =ROUND((MIDTERM * 0.5) + (FINAL * 0.5), 2)
  return Math.round((rawSum + Number.EPSILON * 1000) * 100) / 100;
};

/**
 * Helper to parse student name into base name and middle initial (M.I.)
 */
export const parseStudentNameAndMI = (fullName = "", explicitMI = "") => {
  if (explicitMI && explicitMI.trim()) {
    let cleanMI = explicitMI.trim().toUpperCase();
    if (!cleanMI.endsWith(".")) cleanMI += ".";
    return { name: fullName.trim(), mi: cleanMI };
  }
  const trimmed = (fullName || "").trim();
  const miMatch = trimmed.match(/^(.*?)(?:,\s*|\s+)([A-Za-z])\.?$/);
  if (miMatch && miMatch[1] && miMatch[2]) {
    return {
      name: miMatch[1].trim(),
      mi: `${miMatch[2].toUpperCase()}.`,
    };
  }
  return { name: trimmed, mi: "" };
};
