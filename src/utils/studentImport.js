const cleanName = (value) => (
  typeof value === "string" ? value.replace(/^\uFEFF/, "").trim() : ""
);

export const splitPastedStudentNames = (text) =>
  text
    .split(/\r?\n/)
    .flatMap((line) => line.split("\t"))
    .map(cleanName)
    .filter(Boolean);

export const parseCsvFirstColumn = (text) => {
  const firstColumnValues = [];
  let field = "";
  let inQuotes = false;
  let readingFirstColumn = true;
  let atFieldStart = true;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];

    if (inQuotes) {
      if (character === '"' && text[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (character === '"') {
        inQuotes = false;
      } else {
        if (readingFirstColumn) field += character;
      }
      continue;
    }

    if (character === '"' && atFieldStart) {
      inQuotes = true;
      atFieldStart = false;
    } else if (character === ",") {
      readingFirstColumn = false;
      atFieldStart = true;
    } else if (character === "\n" || character === "\r") {
      firstColumnValues.push(cleanName(field));
      field = "";
      readingFirstColumn = true;
      atFieldStart = true;
      if (character === "\r" && text[index + 1] === "\n") index += 1;
    } else {
      atFieldStart = false;
      if (readingFirstColumn) field += character;
    }
  }

  if (field || text.length > 0) firstColumnValues.push(cleanName(field));
  return firstColumnValues.filter(Boolean);
};

export const prepareStudentImportNames = (names, existingNames = []) => {
  const seen = new Set(
    existingNames.map(cleanName).filter(Boolean).map((name) => name.toLowerCase())
  );
  const acceptedNames = [];
  let duplicateCount = 0;

  for (const rawName of names) {
    const name = cleanName(rawName);
    if (!name || ["name", "student name"].includes(name.toLowerCase())) continue;

    const normalizedName = name.toLowerCase();
    if (seen.has(normalizedName)) {
      duplicateCount += 1;
      continue;
    }
    seen.add(normalizedName);
    acceptedNames.push(name);
  }

  return { names: acceptedNames, duplicateCount };
};
