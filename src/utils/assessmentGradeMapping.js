const getLabelTokens = (value) =>
  String(value || "").toLowerCase().match(/[a-z]+|\d+/g) || [];

export const findMatchingQuizColumn = (assessmentTitle, quizItems = []) => {
  const titleTokens = getLabelTokens(assessmentTitle);
  if (titleTokens.length === 0) return null;

  const matches = quizItems.filter((item) => {
    const nameTokens = getLabelTokens(item.name || item.id);
    if (nameTokens.length === 0 || nameTokens.length > titleTokens.length) return false;

    return titleTokens.some((_, start) =>
      nameTokens.every((token, offset) => titleTokens[start + offset] === token),
    );
  });

  return matches.length === 1 ? matches[0] : null;
};
