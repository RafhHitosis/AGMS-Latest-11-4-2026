// API client service communicating with the PostgreSQL Express backend

const API_BASE = `${import.meta.env.VITE_API_URL?.replace(/\/+$/, "") || ""}/api`;

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
    let errorMessage = `HTTP Error ${response.status}`;
    try {
      const errorData = await response.json();
      if (errorData && errorData.error) {
        errorMessage = errorData.error;
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
  login: (password) =>
    request("/auth/login", {
      method: "POST",
      body: JSON.stringify({ password }),
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
  updateClassSchedules: (schedules) =>
    request("/config/schedules", {
      method: "PUT",
      body: JSON.stringify({ schedules }),
    }),
  syncConfig: (config) =>
    request("/config/sync", {
      method: "POST",
      body: JSON.stringify(config),
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
  deleteSectionData: (sectionId) =>
    request(`/sections/${encodeURIComponent(sectionId)}`, {
      method: "DELETE",
    }),

  // --- Attendance ---
  getAttendance: (sectionId) =>
    request(`/sections/${encodeURIComponent(sectionId)}/attendance`),
  toggleAttendance: (sectionId, studentId, date) =>
    request(`/sections/${encodeURIComponent(sectionId)}/attendance/toggle`, {
      method: "POST",
      body: JSON.stringify({ studentId, date }),
    }),
  resetAttendance: (sectionId) =>
    request(`/sections/${encodeURIComponent(sectionId)}/attendance`, {
      method: "DELETE",
    }),

  // --- Holidays ---
  getHolidays: () => request("/holidays"),
  addHoliday: (date, name) =>
    request("/holidays", {
      method: "POST",
      body: JSON.stringify({ date, name }),
    }),
  updateHoliday: (id, date, name) =>
    request(`/holidays/${encodeURIComponent(id)}`, {
      method: "PUT",
      body: JSON.stringify({ date, name }),
    }),
  deleteHoliday: (id) =>
    request(`/holidays/${encodeURIComponent(id)}`, {
      method: "DELETE",
    }),

  // --- System ---
  checkHealth: () => request("/system/health"),
  resetDatabase: () =>
    request("/system/reset-database", {
      method: "POST",
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
};

export default api;
