// Smart Grade Analytics & Deterministic Heuristics Engine
// 100% pure client/server math, statistics, and educational heuristics.
// Zero paid features, zero external APIs, zero external AI dependencies.

/**
 * Calculate statistical mean
 */
export const calculateMean = (numbers = []) => {
  if (!numbers.length) return 0;
  const sum = numbers.reduce((acc, n) => acc + n, 0);
  return Number((sum / numbers.length).toFixed(2));
};

/**
 * Calculate standard deviation (sample or population)
 */
export const calculateStdDev = (numbers = [], mean = null) => {
  if (numbers.length <= 1) return 0;
  const m = mean !== null ? mean : calculateMean(numbers);
  const variance = numbers.reduce((acc, n) => acc + Math.pow(n - m, 2), 0) / numbers.length;
  return Number(Math.sqrt(variance).toFixed(2));
};

/**
 * Calculate median and quartiles (Q1, Q2/Median, Q3)
 */
export const calculateQuartiles = (sortedNumbers = []) => {
  if (!sortedNumbers.length) return { q1: 0, median: 0, q3: 0, iqr: 0 };
  const len = sortedNumbers.length;

  const getMedianOfRange = (arr) => {
    if (!arr.length) return 0;
    const mid = Math.floor(arr.length / 2);
    return arr.length % 2 !== 0
      ? arr[mid]
      : Number(((arr[mid - 1] + arr[mid]) / 2).toFixed(2));
  };

  const median = getMedianOfRange(sortedNumbers);
  const midIndex = Math.floor(len / 2);
  const lowerHalf = len % 2 === 0 ? sortedNumbers.slice(0, midIndex) : sortedNumbers.slice(0, midIndex);
  const upperHalf = len % 2 === 0 ? sortedNumbers.slice(midIndex) : sortedNumbers.slice(midIndex + 1);

  const q1 = lowerHalf.length ? getMedianOfRange(lowerHalf) : median;
  const q3 = upperHalf.length ? getMedianOfRange(upperHalf) : median;
  const iqr = Number((q3 - q1).toFixed(2));

  return { q1, median, q3, iqr };
};

/**
 * Compute Section-wide Smart Judgements for Term Grades (Midterm or Final)
 * Based strictly on computedRows from computeStudentGradeRow.
 */
export const analyzeTermGrades = (computedRows = []) => {
  if (!computedRows || !computedRows.length) {
    return {
      totalStudents: 0,
      gradedStudents: 0,
      average: 0,
      median: 0,
      stdDev: 0,
      highestGrade: null,
      lowestGrade: null,
      highestStudents: [],
      lowestStudents: [],
      categories: {
        best: [],
        satisfactory: [],
        needsImprovement: [],
        failed: [],
        withdrawn: [],
        pending: [],
      },
      counts: {
        total: 0,
        best: 0,
        satisfactory: 0,
        needsImprovement: 0,
        failed: 0,
        withdrawn: 0,
        pending: 0,
      },
      enrichedRows: [],
    };
  }

  // 1. Separate valid numerical grades from non-numerical or withdrawn
  const gradedList = [];
  computedRows.forEach((row) => {
    const isNum = typeof row.finalGrade === "number" && !isNaN(row.finalGrade);
    const normRemarks = (row.remarks || "").trim().toUpperCase();
    const isWithdrawn = normRemarks === "AW" || normRemarks === "UW";

    if (isWithdrawn) {
      // handled separately
    } else if (isNum) {
      gradedList.push({
        studentId: row.studentId,
        name: row.name,
        grade: row.finalGrade,
        row,
      });
    }
  });

  // Sort graded descending for ranking and statistics
  gradedList.sort((a, b) => b.grade - a.grade);

  const numericalGrades = gradedList.map((g) => g.grade);
  const mean = calculateMean(numericalGrades);
  const stdDev = calculateStdDev(numericalGrades, mean);
  const quartiles = calculateQuartiles(numericalGrades);

  // Filter passing students (grade >= 75.0) for ranking and honors
  // Failing students (< 75.0) are NOT included in ranking!
  const passingList = gradedList.filter((g) => g.grade >= 75.0);

  const highestGrade = passingList.length > 0 ? passingList[0].grade : null;
  const lowestGrade = numericalGrades.length > 0 ? numericalGrades[numericalGrades.length - 1] : null;

  // Distinct lowest only exists if there are at least 2 students and highest > lowest
  const hasMultipleStudents = numericalGrades.length >= 2;
  const hasDistinctLowest = hasMultipleStudents && numericalGrades[0] !== null && lowestGrade !== null && (numericalGrades[0] - lowestGrade) > 0.001;

  // Find all PASSING students holding the highest grade (failing students are never highest/top performers)
  const highestStudents = highestGrade !== null
    ? passingList.filter((g) => Math.abs(g.grade - highestGrade) < 0.001).map((g) => ({
        studentId: g.studentId,
        name: g.name,
        grade: g.grade,
      }))
    : [];

  const lowestStudents = hasDistinctLowest
    ? gradedList.filter((g) => Math.abs(g.grade - lowestGrade) < 0.001).map((g) => ({
        studentId: g.studentId,
        name: g.name,
        grade: g.grade,
      }))
    : [];

  // Assign standard competition ranks (1, 2, 2, 4...) strictly to passing students
  const rankMap = new Map();
  let currentRank = 1;
  for (let i = 0; i < passingList.length; i++) {
    if (i > 0 && passingList[i].grade < passingList[i - 1].grade) {
      currentRank = i + 1;
    }
    rankMap.set(passingList[i].studentId, {
      rank: currentRank,
      denseRank: i + 1,
      totalGraded: passingList.length,
      percentile: Number((((passingList.length - currentRank) / Math.max(1, passingList.length - 1)) * 100).toFixed(0)),
    });
  }

  // 2. Classify each row with Smart Judgement
  const categories = {
    best: [],
    satisfactory: [],
    needsImprovement: [],
    failed: [],
    withdrawn: [],
    pending: [],
  };

  const enrichedRows = computedRows.map((row) => {
    const isNum = typeof row.finalGrade === "number" && !isNaN(row.finalGrade);
    const normRemarks = (row.remarks || "").trim().toUpperCase();
    const isWithdrawn = normRemarks === "AW" || normRemarks === "UW";

    if (isWithdrawn) {
      const judgement = {
        category: "WITHDRAWN",
        code: normRemarks,
        title: normRemarks === "AW" ? "Authorized Withdrawal" : "Unauthorized Withdrawal",
        badge: normRemarks,
        badgeColor: "bg-purple-100 dark:bg-purple-950/80 text-purple-800 dark:text-purple-300 border-purple-200 dark:border-purple-800",
        reason: normRemarks === "AW" ? "Officially dropped or withdrawn" : "Unofficially dropped without clearance",
        actionAdvice: "No further computation required unless student is officially reinstated.",
        rank: null,
        percentile: null,
        isHighest: false,
        isLowest: false,
      };
      categories.withdrawn.push({ ...row, smartJudgement: judgement });
      return { ...row, smartJudgement: judgement };
    }

    if (!isNum) {
      const judgement = {
        category: "PENDING",
        code: "PENDING",
        title: "Incomplete / Pending",
        badge: "Pending",
        badgeColor: "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700",
        reason: "No grades or partial scores recorded yet",
        actionAdvice: "Enter scores in the Grade Input Ground to compute total grade.",
        rank: null,
        percentile: null,
        isHighest: false,
        isLowest: false,
      };
      categories.pending.push({ ...row, smartJudgement: judgement });
      return { ...row, smartJudgement: judgement };
    }

    const rankInfo = rankMap.get(row.studentId) || { rank: null, percentile: null };
    const grade = row.finalGrade;
    const isPassing = grade >= 75.0;
    const isHighest = isPassing && highestGrade !== null && Math.abs(grade - highestGrade) < 0.001;
    const isLowest = hasDistinctLowest && Math.abs(grade - lowestGrade) < 0.001;

    // Component analysis to generate smart diagnostic reasoning
    const mep = typeof row.mep === "number" ? row.mep : 0;
    const cs = typeof row.cs === "number" ? row.cs : 0;
    const isMepLow = row.mer !== "" && Number(row.mer) < 75;
    const isCsLow = row.cs !== "" && Number(row.cs) < 45; // 45 out of 60 is 75%

    let category = "SATISFACTORY";
    let title = "Good Standing";
    let badge = "Good";
    let badgeColor = "bg-blue-100 dark:bg-blue-950/80 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800";
    let reason = "";
    let actionAdvice = "";

    // Smart Deterministic Judgement Rules:
    if (grade < 75.0) {
      category = "FAILED";
      title = "Failing Status";
      badge = isLowest ? "Lowest (Failed)" : "Failed";
      badgeColor = "bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-800";
      const deficit = (75.0 - grade).toFixed(2);
      reason = `Final grade ${grade.toFixed(2)} is below 75.00 (Deficit: -${deficit} pts).`;
      if (isMepLow && isCsLow) {
        reason += " Low exam rating and class standing.";
      } else if (isMepLow) {
        reason += " Major exam rating is below passing.";
      } else if (isCsLow) {
        reason += " Class standing is below standard.";
      }
      actionAdvice = `Needs +${deficit} pts to reach 75.00 passing mark.`;
    } else if (isHighest || grade >= 90.0 || (rankInfo.rank === 1)) {
      category = "BEST";
      title = isHighest ? "Top Performer (Highest in Section)" : "Outstanding Performance";
      badge = isHighest ? "Top 1" : "Best";
      badgeColor = "bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800";
      reason = isHighest
        ? `Highest grade (${grade.toFixed(2)}) in this section.`
        : `Outstanding grade of ${grade.toFixed(2)} (Rank #${rankInfo.rank}).`;
      actionAdvice = "High performance across all components.";
    } else if (grade >= 75.0 && grade < 80.0) {
      category = "NEEDS_IMPROVEMENT";
      title = "Needs Improvement (Borderline)";
      badge = "Needs Improvement";
      badgeColor = "bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800";
      const buffer = (grade - 75.0).toFixed(2);
      reason = `Passing at ${grade.toFixed(2)}, within +${buffer} pts of 75.00 cut-off.`;
      if (isMepLow) {
        reason += " Exam score needs improvement.";
      } else if (isCsLow) {
        reason += " Class standing is vulnerable.";
      }
      actionAdvice = "Focus on exam prep and attendance to secure passing status.";
    } else {
      // 80.00 to 89.99
      category = "SATISFACTORY";
      title = "Good Standing";
      badge = "Good";
      badgeColor = "bg-sky-100 dark:bg-sky-950/80 text-sky-800 dark:text-sky-300 border-sky-300 dark:border-sky-800";
      reason = `Consistent passing performance (${grade.toFixed(2)}). Rank #${rankInfo.rank} of ${rankInfo.totalGraded}.`;
      actionAdvice = "Solid standing in class.";
    }

    const judgement = {
      category,
      code: category,
      title,
      badge,
      badgeColor,
      reason,
      actionAdvice,
      rank: isPassing ? rankInfo.rank : null,
      percentile: isPassing ? rankInfo.percentile : null,
      isHighest,
      isLowest,
      grade,
    };

    if (category === "BEST") categories.best.push({ ...row, smartJudgement: judgement });
    else if (category === "SATISFACTORY") categories.satisfactory.push({ ...row, smartJudgement: judgement });
    else if (category === "NEEDS_IMPROVEMENT") categories.needsImprovement.push({ ...row, smartJudgement: judgement });
    else if (category === "FAILED") categories.failed.push({ ...row, smartJudgement: judgement });

    return { ...row, smartJudgement: judgement };
  });

  return {
    totalStudents: computedRows.length,
    gradedStudents: gradedList.length,
    average: mean,
    median: quartiles.median,
    stdDev,
    highestGrade,
    lowestGrade: hasDistinctLowest ? lowestGrade : null,
    hasDistinctLowest,
    highestStudents,
    lowestStudents,
    quartiles,
    categories,
    counts: {
      total: computedRows.length,
      best: categories.best.length,
      satisfactory: categories.satisfactory.length,
      needsImprovement: categories.needsImprovement.length,
      failed: categories.failed.length,
      withdrawn: categories.withdrawn.length,
      pending: categories.pending.length,
    },
    enrichedRows,
  };
};

/**
 * Compute Semestral Smart Analytics for the Whole Semester
 * Based strictly on semestralRows from useGrades.
 */
export const analyzeSemestralGrades = (semestralRows = []) => {
  if (!semestralRows || !semestralRows.length) {
    return {
      totalStudents: 0,
      gradedStudents: 0,
      average: 0,
      median: 0,
      highestGrade: null,
      lowestGrade: null,
      highestStudents: [],
      lowestStudents: [],
      mostImproved: null,
      biggestDecline: null,
      categories: {
        best: [],
        satisfactory: [],
        needsImprovement: [],
        failed: [],
        withdrawn: [],
      },
      counts: {
        total: 0,
        best: 0,
        satisfactory: 0,
        needsImprovement: 0,
        failed: 0,
        withdrawn: 0,
      },
      enrichedRows: [],
    };
  }

  const validGraded = [];
  semestralRows.forEach((row) => {
    const isNum = typeof row.semGrade === "number" && !isNaN(row.semGrade);
    const normRemarks = (row.remarks || "").trim().toUpperCase();
    const isWithdrawn = normRemarks === "AW" || normRemarks === "UW";

    if (!isWithdrawn && isNum) {
      validGraded.push({
        studentId: row.studentId,
        name: row.name,
        semGrade: row.semGrade,
        row,
      });
    }
  });

  validGraded.sort((a, b) => b.semGrade - a.semGrade);

  const numericalGrades = validGraded.map((g) => g.semGrade);
  const mean = calculateMean(numericalGrades);
  const stdDev = calculateStdDev(numericalGrades, mean);
  const quartiles = calculateQuartiles(numericalGrades);

  // Filter passing semestral students (semGrade >= 75.0 and not 5.00)
  // Failed students are NOT included in ranking!
  const passingSemList = validGraded.filter(
    (g) => g.semGrade >= 75.0 && g.row.equivGrade !== "5.00" && (g.row.remarks || "").trim().toUpperCase() !== "FAILED"
  );

  const highestGrade = passingSemList.length > 0 ? passingSemList[0].semGrade : null;
  const lowestGrade = numericalGrades.length > 0 ? numericalGrades[numericalGrades.length - 1] : null;

  const hasMultipleSem = numericalGrades.length >= 2;
  const hasDistinctLowest = hasMultipleSem && numericalGrades[0] !== null && lowestGrade !== null && (numericalGrades[0] - lowestGrade) > 0.001;

  // Find all PASSING students holding the highest grade
  const highestStudents = highestGrade !== null
    ? passingSemList.filter((g) => Math.abs(g.semGrade - highestGrade) < 0.001).map((g) => ({
        studentId: g.studentId,
        name: g.name,
        semGrade: g.semGrade,
      }))
    : [];

  const lowestStudents = hasDistinctLowest
    ? validGraded.filter((g) => Math.abs(g.semGrade - lowestGrade) < 0.001).map((g) => ({
        studentId: g.studentId,
        name: g.name,
        semGrade: g.semGrade,
      }))
    : [];

  // Semestral competition ranks strictly for passing students
  const rankMap = new Map();
  let currentRank = 1;
  for (let i = 0; i < passingSemList.length; i++) {
    if (i > 0 && passingSemList[i].semGrade < passingSemList[i - 1].semGrade) {
      currentRank = i + 1;
    }
    rankMap.set(passingSemList[i].studentId, {
      rank: currentRank,
      totalGraded: passingSemList.length,
      percentile: Number((((passingSemList.length - currentRank) / Math.max(1, passingSemList.length - 1)) * 100).toFixed(0)),
    });
  }

  const categories = {
    best: [],
    satisfactory: [],
    needsImprovement: [],
    failed: [],
    withdrawn: [],
  };

  let maxDelta = -Infinity;
  let minDelta = Infinity;
  let mostImproved = null;
  let biggestDecline = null;

  const enrichedRows = semestralRows.map((row) => {
    const isNum = typeof row.semGrade === "number" && !isNaN(row.semGrade);
    const normRemarks = (row.remarks || "").trim().toUpperCase();
    const isWithdrawn = normRemarks === "AW" || normRemarks === "UW";

    const hasMidterm = typeof row.midtermGrade === "number" && !isNaN(row.midtermGrade);
    const hasFinal = typeof row.finalGrade === "number" && !isNaN(row.finalGrade);

    // Calculate Trajectory Delta (Finals - Midterm)
    let delta = null;
    let trajectoryType = "NONE";
    let trajectoryLabel = "No comparison";
    let trajectoryColor = "text-slate-400";

    if (hasMidterm && hasFinal) {
      delta = Number((row.finalGrade - row.midtermGrade).toFixed(2));
      if (delta >= 5.0) {
        trajectoryType = "SIGNIFICANT_IMPROVEMENT";
        trajectoryLabel = `+${delta.toFixed(2)} pts (Surged)`;
        trajectoryColor = "text-emerald-700 dark:text-emerald-400 font-extrabold";
      } else if (delta >= 1.5) {
        trajectoryType = "MODERATE_IMPROVEMENT";
        trajectoryLabel = `+${delta.toFixed(2)} pts (Improved)`;
        trajectoryColor = "text-emerald-600 dark:text-emerald-400 font-bold";
      } else if (delta <= -5.0) {
        trajectoryType = "ALARMING_DROP";
        trajectoryLabel = `${delta.toFixed(2)} pts (Steep Drop)`;
        trajectoryColor = "text-rose-700 dark:text-rose-400 font-extrabold";
      } else if (delta <= -1.5) {
        trajectoryType = "MODERATE_DROP";
        trajectoryLabel = `${delta.toFixed(2)} pts (Declined)`;
        trajectoryColor = "text-amber-700 dark:text-amber-400 font-bold";
      } else {
        trajectoryType = "STEADY";
        trajectoryLabel = `${delta >= 0 ? "+" : ""}${delta.toFixed(2)} pts (Steady)`;
        trajectoryColor = "text-slate-600 dark:text-slate-300 font-semibold";
      }

      // Check for most improved / biggest drop
      if (delta > maxDelta) {
        maxDelta = delta;
        mostImproved = {
          studentId: row.studentId,
          name: row.name,
          midterm: row.midtermGrade,
          finals: row.finalGrade,
          delta,
        };
      }
      if (delta < minDelta) {
        minDelta = delta;
        biggestDecline = {
          studentId: row.studentId,
          name: row.name,
          midterm: row.midtermGrade,
          finals: row.finalGrade,
          delta,
        };
      }
    }

    if (isWithdrawn) {
      const judgement = {
        category: "WITHDRAWN",
        title: normRemarks === "AW" ? "Authorized Withdrawal" : "Unauthorized Withdrawal",
        badge: normRemarks,
        badgeColor: "bg-purple-100 dark:bg-purple-950/80 text-purple-800 dark:text-purple-300 border-purple-200 dark:border-purple-800",
        reason: "Student officially or unofficially dropped from the course roster.",
        rank: null,
        delta,
        trajectoryLabel,
        trajectoryType,
        trajectoryColor,
      };
      categories.withdrawn.push({ ...row, smartJudgement: judgement });
      return { ...row, smartJudgement: judgement };
    }

    if (!isNum) {
      const judgement = {
        category: "PENDING",
        title: "Incomplete Term Grades",
        badge: "Incomplete",
        badgeColor: "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700",
        reason: "Requires both Midterm and Final term grades to finalize semestral score.",
        rank: null,
        delta,
        trajectoryLabel,
        trajectoryType,
        trajectoryColor,
      };
      return { ...row, smartJudgement: judgement };
    }

    const rankInfo = rankMap.get(row.studentId) || { rank: null, percentile: null };
    const grade = row.semGrade;
    const equiv = row.equivGrade || "5.00";
    const isPassing = grade >= 75.0 && equiv !== "5.00";
    const isHighest = isPassing && highestGrade !== null && Math.abs(grade - highestGrade) < 0.001;
    const isLowest = hasDistinctLowest && Math.abs(grade - lowestGrade) < 0.001;

    let category = "SATISFACTORY";
    let title = "Good Standing";
    let badge = "Good";
    let badgeColor = "bg-blue-100 dark:bg-blue-950/80 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800";
    let reason = "";
    let actionAdvice = "";

    // Semestral Judgement Logic
    if (grade < 75.0 || equiv === "5.00") {
      category = "FAILED";
      title = "Course Failed (5.00)";
      badge = isLowest ? "Lowest (Failed 5.00)" : "Failed (5.00)";
      badgeColor = "bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-800";
      const deficit = (75.0 - grade).toFixed(2);
      reason = `Semestral grade ${grade.toFixed(2)} is below 75.00 (Equiv: 5.00, Deficit: -${deficit} pts).`;
      if (hasMidterm && hasFinal && row.midtermGrade >= 75 && row.finalGrade < 75) {
        reason += " Passed Midterm but collapsed in Finals.";
      }
      actionAdvice = "Subject failed. Re-enrollment required.";
    } else if (isHighest || grade >= 90.0 || (equiv <= "1.75" && equiv >= "1.00")) {
      category = "BEST";
      title = isHighest ? "Highest in Section" : "Honors Standing";
      badge = isHighest ? "Top 1" : "Honors";
      badgeColor = "bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800";
      reason = isHighest
        ? `Rank #1 in section with semestral grade of ${grade.toFixed(2)} (Equiv: ${equiv}).`
        : `Outstanding semestral grade of ${grade.toFixed(2)} (Equiv: ${equiv}, Rank #${rankInfo.rank}).`;
      actionAdvice = "Honor roll standing.";
    } else if (grade >= 75.0 && grade < 80.0) {
      category = "NEEDS_IMPROVEMENT";
      title = "Marginal Pass";
      badge = "Needs Improvement";
      badgeColor = "bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800";
      reason = `Passed with borderline grade of ${grade.toFixed(2)} (Equiv: ${equiv}).`;
      actionAdvice = "Review course prerequisites.";
    } else {
      category = "SATISFACTORY";
      title = "Satisfactory";
      badge = "Passed";
      badgeColor = "bg-sky-100 dark:bg-sky-950/80 text-sky-800 dark:text-sky-300 border-sky-300 dark:border-sky-800";
      reason = `Completed course with ${grade.toFixed(2)} (Equiv: ${equiv}, Rank #${rankInfo.rank} of ${rankInfo.totalGraded}).`;
      actionAdvice = "Standard passing standing.";
    }

    const judgement = {
      category,
      code: category,
      title,
      badge,
      badgeColor,
      reason,
      actionAdvice,
      rank: isPassing ? rankInfo.rank : null,
      percentile: isPassing ? rankInfo.percentile : null,
      isHighest,
      isLowest,
      delta,
      trajectoryLabel,
      trajectoryType,
      trajectoryColor,
    };

    if (category === "BEST") categories.best.push({ ...row, smartJudgement: judgement });
    else if (category === "SATISFACTORY") categories.satisfactory.push({ ...row, smartJudgement: judgement });
    else if (category === "NEEDS_IMPROVEMENT") categories.needsImprovement.push({ ...row, smartJudgement: judgement });
    else if (category === "FAILED") categories.failed.push({ ...row, smartJudgement: judgement });

    return { ...row, smartJudgement: judgement };
  });

  return {
    totalStudents: semestralRows.length,
    gradedStudents: validGraded.length,
    average: mean,
    median: quartiles.median,
    stdDev,
    highestGrade,
    lowestGrade: hasDistinctLowest ? lowestGrade : null,
    hasDistinctLowest,
    highestStudents,
    lowestStudents,
    mostImproved,
    biggestDecline,
    categories,
    counts: {
      total: semestralRows.length,
      best: categories.best.length,
      satisfactory: categories.satisfactory.length,
      needsImprovement: categories.needsImprovement.length,
      failed: categories.failed.length,
      withdrawn: categories.withdrawn.length,
    },
    enrichedRows,
  };
};

