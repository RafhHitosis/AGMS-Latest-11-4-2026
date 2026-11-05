const YEAR_LEVEL_PREFIXES = new Map([
  ["1st year", "1"],
  ["2nd year", "2"],
  ["3rd year", "3"],
  ["4th year", "4"],
]);

export const getExpectedYearLevelPrefix = (yearName) =>
  YEAR_LEVEL_PREFIXES.get(String(yearName).trim().toLowerCase()) || null;

export const getSectionNamingError = (yearName, sectionName, sectionsByYear) => {
  const expectedPrefix = getExpectedYearLevelPrefix(yearName);
  if (!expectedPrefix) {
    return `Add sections only under 1st Year, 2nd Year, 3rd Year, or 4th Year so each year level has a unique section prefix.`;
  }
  const conflictingYear = Object.entries(sectionsByYear || {}).find(
    ([otherYear]) =>
      otherYear !== yearName &&
      getExpectedYearLevelPrefix(otherYear) === expectedPrefix,
  )?.[0];
  if (conflictingYear) {
    return `The section prefix ${expectedPrefix} is already assigned to ${conflictingYear}.`;
  }
  if (!String(sectionName).startsWith(expectedPrefix)) {
    return `Section "${sectionName}" must start with ${expectedPrefix} for ${yearName}.`;
  }
  return null;
};

export const getSectionNamingErrors = (sections, previousSections = {}) => {
  const prefixOwners = new Map();
  const previousPrefixOwners = new Map();
  const previousPrefixPairs = new Set();
  const errors = [];

  for (const yearName of Object.keys(previousSections)) {
    const prefix = getExpectedYearLevelPrefix(yearName);
    if (!prefix) continue;
    const owner = previousPrefixOwners.get(prefix);
    if (owner) {
      previousPrefixPairs.add(`${prefix}\u0000${owner}\u0000${yearName}`);
    } else {
      previousPrefixOwners.set(prefix, yearName);
    }
  }

  for (const [yearName, sectionNames] of Object.entries(sections)) {
    const prefix = getExpectedYearLevelPrefix(yearName);
    if (prefix) {
      const owner = prefixOwners.get(prefix);
      if (owner) {
        const existingPair = previousPrefixPairs.has(`${prefix}\u0000${owner}\u0000${yearName}`) ||
          previousPrefixPairs.has(`${prefix}\u0000${yearName}\u0000${owner}`);
        if (!existingPair) {
          errors.push(`The section prefix ${prefix} is assigned to both ${owner} and ${yearName}.`);
        }
      } else {
        prefixOwners.set(prefix, yearName);
      }
    }

    for (const sectionName of sectionNames) {
      if (previousSections[yearName]?.includes(sectionName)) continue;
      const error = getSectionNamingError(yearName, sectionName);
      if (error) errors.push(error);
    }
  }

  return errors;
};
