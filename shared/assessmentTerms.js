export const ASSESSMENT_TERM_OPTIONS = [
  { value: "prelim", label: "Prelim" },
  { value: "midterm", label: "Midterm" },
  { value: "pre_final", label: "Pre-Final" },
  { value: "finals", label: "Finals" },
];

const LEGACY_ASSESSMENT_TERMS = ["semestral"];
const ASSESSMENT_TERM_LABELS = {
  ...Object.fromEntries(ASSESSMENT_TERM_OPTIONS.map(({ value, label }) => [value, label])),
  semestral: "Semestral",
};
const ASSESSMENT_EXAM_GRADE_TARGETS = {
  prelim: {
    gradebookTerm: "midterm",
    scoreKey: "pe",
    maxKey: "pe_max",
    columnLabel: "PE (Preliminary Exam)",
  },
  midterm: {
    gradebookTerm: "midterm",
    scoreKey: "me",
    maxKey: "me_max",
    columnLabel: "ME (Major Exam)",
  },
  pre_final: {
    gradebookTerm: "finals",
    scoreKey: "pe",
    maxKey: "pe_max",
    columnLabel: "PE (Preliminary Exam)",
  },
  finals: {
    gradebookTerm: "finals",
    scoreKey: "me",
    maxKey: "me_max",
    columnLabel: "ME (Major Exam)",
  },
};
const ASSESSMENT_TERMS_BY_GRADEBOOK_TERM = {
  midterm: ["prelim", "midterm"],
  finals: ["pre_final", "finals"],
};

export const isValidAssessmentTerm = (term) =>
  ASSESSMENT_TERM_OPTIONS.some((option) => option.value === term) ||
  LEGACY_ASSESSMENT_TERMS.includes(term);

export const getAssessmentTermLabel = (term) =>
  ASSESSMENT_TERM_LABELS[term] || String(term || "");

export const getAssessmentExamGradeTarget = (term) =>
  ASSESSMENT_EXAM_GRADE_TARGETS[term] || null;

export const getGradebookTermForAssessmentTerm = (term) =>
  getAssessmentExamGradeTarget(term)?.gradebookTerm || null;

export const getAssessmentTermsForGradebookTerm = (term) =>
  ASSESSMENT_TERMS_BY_GRADEBOOK_TERM[term] || [];
