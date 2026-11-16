export const ADMIN_RECOVERY_QUESTIONS = [
  { id: "first_school", prompt: "What was the name of your first school?" },
  { id: "first_pet", prompt: "What was the name of your first pet?" },
  { id: "childhood_nickname", prompt: "What was a nickname you had as a child?" },
  { id: "first_job", prompt: "What was your first job?" },
  { id: "favorite_childhood_book", prompt: "What was a favorite book from your childhood?" },
  { id: "first_concert", prompt: "What was the first concert or live event you attended?" },
  { id: "childhood_friend", prompt: "What was the first name of a childhood friend?" },
  { id: "favorite_teacher", prompt: "What was the last name of a teacher you remember fondly?" },
];

export const getAdminRecoveryQuestion = (id) =>
  ADMIN_RECOVERY_QUESTIONS.find((question) => question.id === id) || null;
