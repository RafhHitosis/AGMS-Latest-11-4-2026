const copyWithClipboardApi = async (clipboard, value) => {
  if (typeof clipboard?.writeText !== "function") return false;
  try {
    await clipboard.writeText(value);
    return true;
  } catch {
    return false;
  }
};

export const copyTextToClipboard = async (
  value,
  clipboard = globalThis.navigator?.clipboard,
  documentRef = globalThis.document,
) => {
  if (await copyWithClipboardApi(clipboard, value)) return true;
  if (
    typeof documentRef?.createElement !== "function" ||
    !documentRef.body ||
    typeof documentRef.execCommand !== "function"
  ) {
    return false;
  }

  let field;
  try {
    field = documentRef.createElement("textarea");
    field.value = value;
    field.setAttribute("readonly", "");
    field.style.position = "fixed";
    field.style.left = "-9999px";
    documentRef.body.appendChild(field);
    field.focus();
    field.select();
    return documentRef.execCommand("copy");
  } catch {
    return false;
  } finally {
    if (field.parentNode) {
      field.parentNode.removeChild(field);
    }
  }
};
