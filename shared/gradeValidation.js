const weightKeys = ["me", "quiz", "rec", "dep", "att"];
const maxKeys = ["pe_max", "me_max", "met_max", "plus_max", "minus_max", "rt_max", "at_max"];
const scoreKeys = new Set([
  "pe",
  "me",
  "plus",
  "minus",
  "rt",
  "at",
  "remarks",
  "quizzes",
  "midterm",
  "finals",
]);
const numericScoreKeys = new Set(["pe", "me", "plus", "minus", "rt", "at"]);
const gradeTerms = new Set(["midterm", "finals", "semestral"]);
const transmutationRanges = [
  { low: "me_low", high: "me_high", legacyLow: "mer_low", legacyHigh: "mer_high", defaultLow: 50, defaultHigh: 100 },
  { low: "quiz_low", high: "quiz_high", legacyLow: "qr_low", legacyHigh: "qr_high", defaultLow: 50, defaultHigh: 100 },
  { low: "rec_low", high: "rec_high", defaultLow: 70, defaultHigh: 95 },
  { low: "att_low", high: "att_high", defaultLow: 70, defaultHigh: 95 },
];

const isRecord = (value) => value !== null && typeof value === "object" && !Array.isArray(value);

const getNumber = (value, fallback) => {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value !== "number" && typeof value !== "string") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

const isNonnegativeNumberOrBlank = (value) => {
  if (value === undefined || value === null || value === "") return true;
  if (typeof value !== "number" && typeof value !== "string") return false;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0;
};

const isNonnegativeScore = (value) =>
  value === undefined ||
  value === null ||
  value === "" ||
  ((typeof value === "number" || typeof value === "string") &&
    Number.isFinite(Number(value)) &&
    Number(value) >= 0);

export const isValidGradeTerm = (term) => typeof term === "string" && gradeTerms.has(term);

export const validateGradeConfiguration = (config = {}) => {
  if (!isRecord(config)) return "Grading configuration must be an object.";

  const weights = config.weights;
  if (!isRecord(weights)) return "Each category weight must be between 0% and 100%.";
  const values = weightKeys.map((key) => getNumber(weights[key], null));

  if (values.some((value) => value === null || value < 0 || value > 1)) {
    return "Each category weight must be between 0% and 100%.";
  }
  if (Math.abs(values.reduce((sum, value) => sum + value, 0) - 1) > 1e-8) {
    return "Category weights must total exactly 100%.";
  }

  for (const key of maxKeys) {
    if (Object.hasOwn(config, key) && !isNonnegativeNumberOrBlank(config[key])) {
      return "Maximum point values must be non-negative finite numbers.";
    }
  }

  if (config.transmutation !== undefined && config.transmutation !== null && !isRecord(config.transmutation)) {
    return "Transmutation settings must be an object.";
  }
  const transmutation = config.transmutation || {};
  for (const range of transmutationRanges) {
    const lowValue =
      transmutation[range.low] ?? transmutation[range.legacyLow];
    const highValue =
      transmutation[range.high] ?? transmutation[range.legacyHigh];
    const low = getNumber(lowValue, range.defaultLow);
    const high = getNumber(highValue, range.defaultHigh);

    if (low === null || high === null || high <= low) {
      return "Each transmutation high value must be greater than its low value.";
    }
  }

  if (config.quiz_items !== undefined && !Array.isArray(config.quiz_items)) {
    return "Quiz items must be a list.";
  }
  if (Array.isArray(config.quiz_items)) {
    const quizIds = new Set();
    for (const item of config.quiz_items) {
      if (
        !isRecord(item) ||
        typeof item.id !== "string" ||
        item.id.trim().length === 0 ||
        item.id.length > 100 ||
        (item.name !== undefined &&
          (typeof item.name !== "string" || item.name.trim().length === 0 || item.name.length > 255)) ||
        (Object.hasOwn(item, "max") && !isNonnegativeNumberOrBlank(item.max)) ||
        quizIds.has(item.id)
      ) {
        return "Each quiz item must have a unique ID, a valid name, and a non-negative maximum.";
      }
      quizIds.add(item.id);
    }
  }

  return null;
};

export const validateGradeScores = (scores) => {
  if (!isRecord(scores) || Object.keys(scores).length === 0) {
    return "Scores must be a non-empty object.";
  }

  for (const [key, value] of Object.entries(scores)) {
    if (!scoreKeys.has(key)) return `Unsupported score field: ${key}.`;
    if (numericScoreKeys.has(key) && !isNonnegativeScore(value)) {
      return "Scores must be non-negative finite numbers or blank.";
    }
    if (key === "quizzes") {
      if (!isRecord(value)) return "Quiz scores must be an object.";
      for (const [quizId, quizScore] of Object.entries(value)) {
        if (quizId.length === 0 || quizId.length > 100 || !isNonnegativeScore(quizScore)) {
          return "Quiz scores must use valid IDs and non-negative finite values.";
        }
      }
    }
    if (key === "remarks" && (typeof value !== "string" || value.length > 20)) {
      return "Remarks must be text no longer than 20 characters.";
    }
    if ((key === "midterm" || key === "finals") &&
      value !== null &&
      value !== "" &&
      typeof value !== "string" &&
      typeof value !== "number") {
      return "Legacy term scores must be text or numeric values.";
    }
  }

  return null;
};
