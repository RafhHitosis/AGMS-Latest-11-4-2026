// API client service communicating with the PostgreSQL Express backend

const API_BASE = "/api";

async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const config = {
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    ...options,
    credentials: "include",
  };

  const response = await fetch(url, config);

  if (!response.ok) {
    if (
      response.status === 401 &&
      !endpoint.startsWith("/auth/") &&
      typeof window !== "undefined"
    ) {
      window.dispatchEvent(new Event("agms:unauthorized"));
    }
    let errorMessage = `HTTP Error ${response.status}`;
    try {
      const errorData = await response.json();
      if (errorData && (errorData.message || errorData.error)) {
        errorMessage = errorData.message || errorData.error;
      }
    } catch {
      // response wasn't JSON
    }
    const error = new Error(errorMessage);
    error.status = response.status;
    const retryAfter = Number(response.headers.get("Retry-After"));
    if (Number.isFinite(retryAfter) && retryAfter > 0) {
      error.retryAfter = retryAfter;
    }
    throw error;
  }

  return response.json();
}

export const api = {
  // --- Authentication ---
  getSession: () => request("/auth/session"),
  login: (accessKey) =>
    request("/auth/login", {
      method: "POST",
      body: JSON.stringify({ accessKey }),
    }),
  acknowledgeWelcome: () =>
    request("/auth/welcome-acknowledgment", {
      method: "POST",
    }),
  getAdminRecoveryQuestions: () => request("/auth/admin-recovery/questions"),
  recoverAdminAccess: (answers) =>
    request("/auth/admin-recovery", {
      method: "POST",
      body: JSON.stringify({ answers }),
    }),
  logout: () =>
    request("/auth/logout", {
      method: "POST",
    }),

  // --- Config ---
  getConfig: () => request("/config"),
  updateAppTitle: (title) =>
    request("/config/title", {
      method: "PUT",
      body: JSON.stringify({ title }),
    }),
  updateAppSubtitle: (subtitle) =>
    request("/config/subtitle", {
      method: "PUT",
      body: JSON.stringify({ subtitle }),
    }),
  updateAppLogo: (logo) =>
    request("/config/logo", {
      method: "PUT",
      body: JSON.stringify({ logo }),
    }),
  updateTermDates: (termDates) =>
    request("/config/term-dates", {
      method: "PUT",
      body: JSON.stringify({ termDates }),
    }),
  updateSections: (sections) =>
    request("/config/sections", {
      method: "PUT",
      body: JSON.stringify({ sections }),
    }),
  updateSectionConfiguration: (sections, schedules, sectionCopies = [], archiveIds = []) =>
    request("/config/section-configuration", {
      method: "PUT",
      body: JSON.stringify({ sections, schedules, sectionCopies, archiveIds }),
    }),
  updateClassSchedules: (schedules) =>
    request("/config/schedules", {
      method: "PUT",
      body: JSON.stringify({ schedules }),
    }),
  updateSectionSchedule: (sectionId, schedule) =>
    request(`/config/schedules/${encodeURIComponent(sectionId)}`, {
      method: "PUT",
      body: JSON.stringify({ schedule }),
    }),
  saveSectionSettings: (sectionId, settings) =>
    request(`/config/settings/${encodeURIComponent(sectionId)}`, {
      method: "PUT",
      body: JSON.stringify(settings),
    }),
  getSectionArchives: () => request("/config/section-archives"),
  restoreSectionArchive: (archiveId) =>
    request(`/config/section-archives/${encodeURIComponent(archiveId)}/restore`, {
      method: "POST",
    }),

  // --- Students ---
  getStudents: (sectionId) => request(`/sections/${encodeURIComponent(sectionId)}/students`),
  addStudent: (sectionId, name) =>
    request(`/sections/${encodeURIComponent(sectionId)}/students`, {
      method: "POST",
      body: JSON.stringify({ name }),
    }),
  batchAddStudents: (sectionId, names) =>
    request(`/sections/${encodeURIComponent(sectionId)}/students/batch`, {
      method: "POST",
      body: JSON.stringify({ names }),
    }),
  updateStudent: (sectionId, id, name) =>
    request(`/sections/${encodeURIComponent(sectionId)}/students/${encodeURIComponent(id)}`, {
      method: "PUT",
      body: JSON.stringify({ name }),
    }),
  deleteStudent: (sectionId, id) =>
    request(`/sections/${encodeURIComponent(sectionId)}/students/${encodeURIComponent(id)}`, {
      method: "DELETE",
    }),
  deleteAllStudents: (sectionId) =>
    request(`/sections/${encodeURIComponent(sectionId)}/students`, {
      method: "DELETE",
    }),
  // --- Attendance ---
  getAttendance: (sectionId, startDate, endDate) => {
    const query = new URLSearchParams();
    if (startDate !== undefined) query.set("startDate", startDate);
    if (endDate !== undefined) query.set("endDate", endDate);
    const queryString = query.toString();
    const suffix = queryString ? `?${queryString}` : "";
    return request(`/sections/${encodeURIComponent(sectionId)}/attendance${suffix}`);
  },
  setAttendance: (sectionId, studentId, date, isAbsent) =>
    request(`/sections/${encodeURIComponent(sectionId)}/attendance/set`, {
      method: "POST",
      body: JSON.stringify({ studentId, date, isAbsent }),
    }),
  resetAttendance: (sectionId, startDate, endDate) =>
    request(`/sections/${encodeURIComponent(sectionId)}/attendance`, {
      method: "DELETE",
      body: JSON.stringify({ startDate, endDate }),
    }),

  // --- Holidays ---
  getHolidays: () => request("/holidays"),

  // --- Admin ---
  getAdminUsers: () => request("/admin/users"),
  createAdminUser: (displayName) =>
    request("/admin/users", {
      method: "POST",
      body: JSON.stringify({ displayName }),
    }),
  updateAdminUser: (userId, updates) =>
    request(`/admin/users/${encodeURIComponent(userId)}`, {
      method: "PATCH",
      body: JSON.stringify(updates),
    }),
  deleteAdminUser: (userId) =>
    request(`/admin/users/${encodeURIComponent(userId)}`, {
      method: "DELETE",
    }),
  rotateAdminUserAccessKey: (userId) =>
    request(`/admin/users/${encodeURIComponent(userId)}/access-key`, {
      method: "POST",
    }),
  rotateOwnAccessKey: () =>
    request("/admin/me/access-key", {
      method: "POST",
    }),
  setAdminRecoveryQuestions: (questions) =>
    request("/admin/me/recovery-questions", {
      method: "PUT",
      body: JSON.stringify({ questions }),
    }),

  // --- Grades ---
  getGrades: (sectionId, term = "midterm") =>
    request(`/sections/${encodeURIComponent(sectionId)}/grades?term=${encodeURIComponent(term)}`),
  saveGradeConfig: (sectionId, term, config) =>
    request(`/sections/${encodeURIComponent(sectionId)}/grades/config`, {
      method: "PUT",
      body: JSON.stringify({ term, config }),
    }),
  updateStudentScore: (sectionId, term, studentId, scores) =>
    request(`/sections/${encodeURIComponent(sectionId)}/grades/scores`, {
      method: "PUT",
      body: JSON.stringify({ term, studentId, scores }),
    }),
  batchUpdateScores: (sectionId, term, grades) =>
    request(`/sections/${encodeURIComponent(sectionId)}/grades/batch`, {
      method: "POST",
      body: JSON.stringify({ term, grades }),
    }),
  resetGrades: (sectionId, term) =>
    request(`/sections/${encodeURIComponent(sectionId)}/grades?term=${encodeURIComponent(term || "")}`, {
      method: "DELETE",
    }),

  // --- Assessments (Teacher) ---
  getAssessments: (sectionId) =>
    request(`/sections/${encodeURIComponent(sectionId)}/assessments`),
  createAssessment: (sectionId, data) =>
    request(`/sections/${encodeURIComponent(sectionId)}/assessments`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
  getAssessment: (sectionId, id) =>
    request(`/sections/${encodeURIComponent(sectionId)}/assessments/${encodeURIComponent(id)}`),
  updateAssessment: (sectionId, id, data) =>
    request(`/sections/${encodeURIComponent(sectionId)}/assessments/${encodeURIComponent(id)}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  deleteAssessment: (sectionId, id) =>
    request(`/sections/${encodeURIComponent(sectionId)}/assessments/${encodeURIComponent(id)}`, {
      method: "DELETE",
    }),
  getAssessmentSubmissions: (sectionId, id) =>
    request(`/sections/${encodeURIComponent(sectionId)}/assessments/${encodeURIComponent(id)}/submissions`),
  gradeSubmission: (sectionId, id, submissionId, data) =>
    request(`/sections/${encodeURIComponent(sectionId)}/assessments/${encodeURIComponent(id)}/submissions/${encodeURIComponent(submissionId)}/grade`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  syncAssessmentToGrades: (sectionId, id, data) =>
    request(`/sections/${encodeURIComponent(sectionId)}/assessments/${encodeURIComponent(id)}/sync-grades`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
  getRecitationLogs: (sectionId, id) =>
    request(`/sections/${encodeURIComponent(sectionId)}/assessments/${encodeURIComponent(id)}/recitations`),
  recordRecitationScore: (sectionId, id, data) =>
    request(`/sections/${encodeURIComponent(sectionId)}/assessments/${encodeURIComponent(id)}/recitations`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  // --- Public Assessments (Student) ---
  getPublicAssessmentAvailability: () =>
    request("/public/assessments/availability"),
  getPublicAssessment: (accessCode) =>
    request(`/public/assessments/${encodeURIComponent(accessCode)}`),
  startPublicAssessmentAttempt: (accessCode, data) =>
    request(`/public/assessments/${encodeURIComponent(accessCode)}/attempts`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
  savePublicAssessmentAttempt: (accessCode, attemptId, data) =>
    request(`/public/assessments/${encodeURIComponent(accessCode)}/attempts/${encodeURIComponent(attemptId)}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  submitPublicAssessmentAttempt: (accessCode, attemptId, data) =>
    request(`/public/assessments/${encodeURIComponent(accessCode)}/attempts/${encodeURIComponent(attemptId)}/submit`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
  submitPublicAssessment: (accessCode, data) =>
    request(`/public/assessments/${encodeURIComponent(accessCode)}/submit`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
};

export default api;
