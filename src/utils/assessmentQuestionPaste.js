export function parsePastedAssessmentQuestions(input) {
  const lines = String(input || "")
    .split(/\r?\n/)
    .map((text, index) => ({ text: text.trim(), number: index + 1 }))
    .filter((line) => line.text);

  if (lines.length === 0) {
    return { questions: [], errors: ["Paste at least one question."] };
  }

  const questions = [];
  const errors = [];

  lines.forEach(({ text, number }) => {
    const fields = text.split("|").map((field) => field.trim());
    if (fields.length !== 3) {
      errors.push(`Line ${number}: use Question | choice 1, choice 2 | correct letter.`);
      return;
    }

    const [question, rawChoices, correctAnswer] = fields;
    const choiceSeparator = rawChoices.includes(";") ? ";" : ",";
    const choices = rawChoices.split(choiceSeparator).map((choice, index) => {
      const trimmedChoice = choice.trim();
      const label = trimmedChoice.match(/^([a-z])\s*[.)]\s*/i);
      if (label && label[1].toUpperCase() !== String.fromCharCode(65 + index)) {
        return "";
      }
      return trimmedChoice.replace(/^[a-z]\s*[.)]\s*/i, "").trim();
    });
    if (!question || !correctAnswer || choices.length < 2 || choices.some((choice) => !choice)) {
      errors.push(`Line ${number}: add a question, at least two non-empty choices, and the correct choice letter.`);
      return;
    }

    if (!/^[a-z]$/i.test(correctAnswer)) {
      errors.push(`Line ${number}: enter the correct choice letter (A, B, C...).`);
      return;
    }
    const answerIndex = correctAnswer.toUpperCase().charCodeAt(0) - 65;
    const correctChoice = choices[answerIndex];
    if (!correctChoice) {
      errors.push(`Line ${number}: the correct choice letter must match one of the listed choices.`);
      return;
    }

    questions.push({
      type: "multiple_choice",
      part: "",
      question,
      points: 1,
      options: choices,
      correct_answer: correctChoice,
      rubric: "",
      solution_code: "",
      test_cases: [],
    });
  });

  return { questions: errors.length === 0 ? questions : [], errors };
}
