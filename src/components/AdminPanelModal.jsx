import { useEffect, useRef, useState } from "react";
import {
  Check,
  Copy,
  KeyRound,
  MoreVertical,
  Plus,
  Shield,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import api from "../lib/api";
import { copyTextToClipboard } from "../utils/copyTextToClipboard";
import ConfirmModal from "./ConfirmModal";
import AdminRecoveryQuestionsForm from "./AdminRecoveryQuestionsForm";

const publicAccount = (account) => {
  const publicDetails = { ...account };
  delete publicDetails.accessKey;
  return publicDetails;
};

export default function AdminPanelModal({
  isOpen,
  onClose,
  adminRecoveryConfigured,
  onSaveAdminRecoveryQuestions,
}) {
  const [users, setUsers] = useState([]);
  const [displayName, setDisplayName] = useState("");
  const [issuedKey, setIssuedKey] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingUserId, setSavingUserId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [openActionsUserId, setOpenActionsUserId] = useState(null);
  const [actionsMenuPosition, setActionsMenuPosition] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState("teachers");
  const actionsMenuRef = useRef(null);
  const actionsButtonRef = useRef(null);

  useEffect(() => {
    if (!openActionsUserId) return undefined;

    const closeMenu = () => setOpenActionsUserId(null);
    const handlePointerDown = (event) => {
      if (
        !actionsMenuRef.current?.contains(event.target) &&
        !actionsButtonRef.current?.contains(event.target)
      ) {
        closeMenu();
      }
    };
    const handleKeyDown = (event) => {
      if (event.key === "Escape") closeMenu();
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", closeMenu);
    window.addEventListener("scroll", closeMenu, true);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", closeMenu);
      window.removeEventListener("scroll", closeMenu, true);
    };
  }, [openActionsUserId]);

  useEffect(() => {
    if (!isOpen) {
      setIssuedKey(null);
      setCopied(false);
      setActiveTab("teachers");
      return undefined;
    }

    let active = true;
    setLoading(true);
    setError("");
    api.getAdminUsers()
      .then((accounts) => {
        if (active) setUsers(accounts);
      })
      .catch((loadError) => {
        if (active) setError(loadError.message || "Could not load teacher accounts.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const close = () => {
    setIssuedKey(null);
    onClose();
  };

  const showIssuedKey = (accountName, key) => {
    setIssuedKey({
      displayName: accountName,
      accessKeyId: key.accessKeyId,
      accessKey: key.accessKey,
    });
    setCopied(false);
    setNotice("");
  };

  const createAccount = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const account = await api.createAdminUser(displayName.trim());
      setUsers((current) =>
        [...current, publicAccount(account)].sort((a, b) =>
          a.display_name.localeCompare(b.display_name),
        ),
      );
      setDisplayName("");
      showIssuedKey(account.display_name, account);
    } catch (saveError) {
      setError(saveError.message || "Could not create this teacher account.");
    } finally {
      setSaving(false);
    }
  };

  const changeAccountStatus = async (account) => {
    setSavingUserId(account.id);
    setError("");
    setNotice("");
    try {
      const updated = await api.updateAdminUser(account.id, {
        isActive: !account.is_active,
      });
      setUsers((current) =>
        current.map((user) => user.id === account.id ? updated : user),
      );
      setNotice(updated.is_active ? `${updated.display_name} can sign in again.` : `${updated.display_name} is disabled.`);
    } catch (saveError) {
      setError(saveError.message || "Could not update this account.");
    } finally {
      setSavingUserId(null);
    }
  };

  const rotateTeacherKey = async (account) => {
    setSavingUserId(account.id);
    setError("");
    setNotice("");
    try {
      const key = await api.rotateAdminUserAccessKey(account.id);
      setUsers((current) =>
        current.map((user) => user.id === account.id
          ? { ...user, access_key_id: key.accessKeyId }
          : user),
      );
      showIssuedKey(account.display_name, key);
    } catch (saveError) {
      setError(saveError.message || "Could not issue a new access key.");
    } finally {
      setSavingUserId(null);
    }
  };

  const deleteTeacherAccount = async () => {
    if (!deleteTarget) return;
    const account = deleteTarget;
    setSavingUserId(account.id);
    setError("");
    setNotice("");
    try {
      await api.deleteAdminUser(account.id);
      setUsers((current) => current.filter((user) => user.id !== account.id));
      if (issuedKey?.accessKeyId === account.access_key_id) {
        setIssuedKey(null);
      }
      setDeleteTarget(null);
      setNotice(`${account.display_name} and their workspace data were permanently deleted.`);
    } catch (deleteError) {
      setDeleteTarget(null);
      setError(deleteError.message || "Could not delete this teacher account.");
    } finally {
      setSavingUserId(null);
    }
  };

  const toggleActionsMenu = (userId, event) => {
    event.stopPropagation();
    if (openActionsUserId === userId) {
      setOpenActionsUserId(null);
      return;
    }

    const buttonRect = event.currentTarget.getBoundingClientRect();
    const menuWidth = 192;
    const menuHeight = 136;
    const viewportPadding = 8;
    const left = Math.max(
      viewportPadding,
      Math.min(
        buttonRect.right - menuWidth,
        window.innerWidth - menuWidth - viewportPadding,
      ),
    );
    let top = buttonRect.bottom + 4;
    if (top + menuHeight > window.innerHeight - viewportPadding) {
      top = buttonRect.top - menuHeight - 4;
    }
    top = Math.max(
      viewportPadding,
      Math.min(top, window.innerHeight - menuHeight - viewportPadding),
    );

    setActionsMenuPosition({ top, left });
    setOpenActionsUserId(userId);
  };

  const rotateAdminKey = async () => {
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const key = await api.rotateOwnAccessKey();
      showIssuedKey("Administrator", key);
    } catch (saveError) {
      setError(saveError.message || "Could not issue a new administrator key.");
    } finally {
      setSaving(false);
    }
  };

  const copyIssuedKey = async () => {
    if (!issuedKey) return;
    const copiedSuccessfully = await copyTextToClipboard(issuedKey.accessKey);
    if (copiedSuccessfully) {
      setCopied(true);
      setError("");
    } else {
      setError("Copy is unavailable here. Select the key above and press Ctrl+C (or Cmd+C on Mac).");
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-3 sm:p-6">
      <section
        aria-labelledby="admin-panel-title"
        aria-modal="true"
        className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-outline-variant bg-surface text-on-surface shadow-elevation-3"
        role="dialog"
      >
        <header className="flex items-center justify-between border-b border-slate-700/50 bg-slate-800 px-6 py-4 text-white dark:bg-slate-950">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-500/20 text-emerald-400">
              <Shield className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h2 id="admin-panel-title" className="text-lg font-bold leading-tight">Teacher access</h2>
              <p className="text-xs text-slate-300">
                Create a separate private workspace for each teacher, then share that teacher's key.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={close}
            aria-label="Close account manager"
            className="rounded-full p-1.5 text-slate-300 transition-colors hover:bg-slate-700 dark:hover:bg-slate-800"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div
          aria-label="Teacher access sections"
          className="flex overflow-x-auto border-b border-outline-variant bg-surface-container-low px-4"
          role="group"
        >
          <button
            type="button"
            id="teacher-accounts-tab"
            aria-pressed={activeTab === "teachers"}
            aria-controls="teacher-accounts-panel"
            onClick={() => setActiveTab("teachers")}
            className={`flex items-center gap-1.5 whitespace-nowrap border-b-2 px-4 py-3 text-xs font-bold transition-colors ${
              activeTab === "teachers"
                ? "border-primary bg-surface text-primary"
                : "border-transparent text-on-surface-variant hover:text-on-surface"
            }`}
          >
            <UserRound className="h-3.5 w-3.5" aria-hidden="true" />
            Teacher accounts
          </button>
          <button
            type="button"
            id="admin-security-tab"
            aria-pressed={activeTab === "security"}
            aria-controls="admin-security-panel"
            onClick={() => setActiveTab("security")}
            className={`flex items-center gap-1.5 whitespace-nowrap border-b-2 px-4 py-3 text-xs font-bold transition-colors ${
              activeTab === "security"
                ? "border-primary bg-surface text-primary"
                : "border-transparent text-on-surface-variant hover:text-on-surface"
            }`}
          >
            <Shield className="h-3.5 w-3.5" aria-hidden="true" />
            Admin security
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5">
          {error && <p className="rounded-lg bg-error-container px-3 py-2 text-sm text-on-error-container" role="alert">{error}</p>}
          {notice && <p className="rounded-lg bg-primary/10 px-3 py-2 text-sm text-on-surface" role="status">{notice}</p>}

          {issuedKey && (
            <section className="space-y-3 rounded-xl border border-primary/30 bg-primary/5 p-4" aria-labelledby="issued-key-title">
              <div>
                <h3 id="issued-key-title" className="font-semibold">Save this access key now</h3>
                <p className="mt-1 text-sm text-on-surface-variant">
                    This key for {issuedKey.displayName} is shown only once. It has one animal name and four digits. Copy it and share it privately; anyone with it can access this workspace.
                </p>
              </div>
              <label className="block text-xs font-medium" htmlFor="issued-access-key">
                Access key (the teacher enters this to sign in)
                <input
                  id="issued-access-key"
                  className="mt-1 w-full select-all rounded-lg border border-outline-variant bg-surface px-3 py-2 font-mono text-sm tracking-wide"
                  onFocus={(event) => event.target.select()}
                  readOnly
                  value={issuedKey.accessKey}
                />
              </label>
              <p className="text-xs text-on-surface-variant">
                Key ID {issuedKey.accessKeyId} is only for identifying this key in your account list. Do not enter the ID at sign-in.
              </p>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={copyIssuedKey} className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-on-primary">
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copied ? "Copied" : "Copy key"}
                </button>
                <button type="button" onClick={() => setIssuedKey(null)} className="rounded-lg border border-outline-variant px-3 py-2 text-sm font-medium">
                  Done, I saved it
                </button>
              </div>
            </section>
          )}

          <div
            id="teacher-accounts-panel"
            role="region"
            aria-labelledby="teacher-accounts-tab"
            hidden={activeTab !== "teachers"}
          >
            <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_17rem]">
              <section className="order-2 min-w-0 lg:order-1">
              <h3 className="text-sm font-semibold">Teacher accounts</h3>
              <p className="mb-3 mt-1 text-xs text-on-surface-variant">
                Key IDs help you identify accounts here; teachers use their full key to sign in.
              </p>
              <div className="overflow-hidden rounded-xl border border-outline-variant/60">
                <table className="w-full table-fixed text-left text-sm">
                  <thead className="bg-surface-container text-xs text-on-surface-variant">
                    <tr>
                      <th className="px-3 py-2">Name</th>
                      <th className="hidden w-28 whitespace-nowrap px-3 py-2 md:table-cell">Key ID</th>
                      <th className="hidden w-24 whitespace-nowrap px-3 py-2 md:table-cell">Status</th>
                      <th className="w-14 px-2 py-2 text-right"><span className="sr-only">Actions</span></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/50">
                    {users.map((account) => (
                      <tr key={account.id}>
                        <td className="px-3 py-2.5 font-medium">
                          <div className="truncate" title={account.display_name}>
                            {account.display_name}
                          </div>
                          <span className="mt-1 block text-xs font-normal text-on-surface-variant md:hidden">
                            <span className="font-mono">{account.access_key_id || "Not issued"}</span>
                            <span aria-hidden="true"> · </span>
                            {account.is_active ? "Active" : "Disabled"}
                          </span>
                        </td>
                        <td className="hidden px-3 py-2.5 font-mono text-xs md:table-cell">{account.access_key_id || "Not issued"}</td>
                        <td className="hidden px-3 py-2.5 md:table-cell">{account.is_active ? "Active" : "Disabled"}</td>
                        <td className="px-2 py-2.5">
                          <div className="flex justify-end">
                            <button
                              ref={openActionsUserId === account.id ? actionsButtonRef : null}
                              type="button"
                              disabled={savingUserId === account.id}
                              onClick={(event) => toggleActionsMenu(account.id, event)}
                              aria-label={`Actions for ${account.display_name}`}
                              aria-expanded={openActionsUserId === account.id}
                              aria-controls={`teacher-actions-${account.id}`}
                              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-outline-variant bg-surface text-on-surface-variant shadow-sm transition-colors hover:bg-surface-container hover:text-on-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50"
                            >
                              <MoreVertical className="h-5 w-5" aria-hidden="true" />
                            </button>
                          </div>
                          {openActionsUserId === account.id && actionsMenuPosition && (
                            <div
                              ref={actionsMenuRef}
                              id={`teacher-actions-${account.id}`}
                              className="fixed z-[90] w-48 overflow-hidden rounded-xl border border-outline-variant bg-surface py-1 shadow-elevation-3"
                              style={actionsMenuPosition}
                            >
                              <button
                                type="button"
                                disabled={savingUserId === account.id}
                                onClick={() => {
                                  setOpenActionsUserId(null);
                                  rotateTeacherKey(account);
                                }}
                                className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm font-medium text-on-surface hover:bg-surface-container disabled:opacity-50"
                              >
                                <KeyRound className="h-4 w-4 text-primary" aria-hidden="true" />
                                {account.access_key_id ? "New key" : "Issue key"}
                              </button>
                              <button
                                type="button"
                                disabled={savingUserId === account.id}
                                onClick={() => {
                                  setOpenActionsUserId(null);
                                  changeAccountStatus(account);
                                }}
                                className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm font-medium text-on-surface hover:bg-surface-container disabled:opacity-50"
                              >
                                <UserRound className="h-4 w-4 text-on-surface-variant" aria-hidden="true" />
                                {account.is_active ? "Disable account" : "Enable account"}
                              </button>
                              <button
                                type="button"
                                disabled={savingUserId === account.id}
                                onClick={() => {
                                  setOpenActionsUserId(null);
                                  setDeleteTarget(account);
                                }}
                                className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm font-semibold text-error hover:bg-error-container disabled:opacity-50"
                              >
                                <Trash2 className="h-4 w-4" aria-hidden="true" />
                                Delete account
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                    {!loading && users.length === 0 && (
                      <tr><td className="px-3 py-6 text-center text-on-surface-variant" colSpan="4">No teacher accounts yet. Create the first account using the form.</td></tr>
                    )}
                    {loading && (
                      <tr><td className="px-3 py-6 text-center text-on-surface-variant" colSpan="4">Loading accounts…</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
              </section>

              <div className="order-1 space-y-4 lg:order-2">
                <form className="space-y-3 rounded-xl border border-outline-variant/60 p-4" onSubmit={createAccount}>
                  <h3 className="text-sm font-semibold">Create a teacher account</h3>
                  <p className="text-xs text-on-surface-variant">
                    The teacher will get a private workspace and a one-time key with one animal name and four digits.
                  </p>
                  <label className="block text-xs font-medium" htmlFor="teacher-display-name">
                    Teacher name
                    <input
                      id="teacher-display-name"
                      autoComplete="name"
                      required
                      maxLength="120"
                      placeholder="e.g. Alex Santos"
                      value={displayName}
                      onChange={(event) => setDisplayName(event.target.value)}
                      className="mt-1 w-full rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm"
                    />
                  </label>
                  <button disabled={saving || !displayName.trim()} type="submit" className="inline-flex w-full items-center justify-center gap-1.5 whitespace-nowrap rounded-lg bg-primary px-2.5 py-2.5 text-sm font-semibold text-on-primary disabled:opacity-60 lg:text-xs">
                    <Plus className="h-4 w-4" />
                    {saving ? "Creating…" : "Create account & show key"}
                  </button>
                </form>
              </div>
            </div>
          </div>

          <div
            id="admin-security-panel"
            role="region"
            aria-labelledby="admin-security-tab"
            hidden={activeTab !== "security"}
          >
            <div className="space-y-4">
              <section className="flex flex-col gap-3 rounded-xl border border-outline-variant/60 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <UserRound className="h-4 w-4 text-primary" aria-hidden="true" />
                    <h3 className="text-sm font-semibold">Administrator key</h3>
                  </div>
                  <p className="mt-1 text-xs text-on-surface-variant">
                    Generate a replacement if your key is lost. The current key will stop working immediately.
                  </p>
                </div>
                <button disabled={saving} type="button" onClick={rotateAdminKey} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-outline-variant px-3 py-2 text-sm font-medium disabled:opacity-60">
                  <KeyRound className="h-4 w-4" />
                  Generate new admin key
                </button>
              </section>

              <AdminRecoveryQuestionsForm
                configured={adminRecoveryConfigured}
                onSave={onSaveAdminRecoveryQuestions}
                wide
                autoFocus={false}
              />
            </div>
          </div>
        </div>
      </section>
      <ConfirmModal
        isOpen={Boolean(deleteTarget)}
        title="Permanently delete teacher?"
        message={
          deleteTarget
            ? `Delete ${deleteTarget.display_name} and permanently remove their account and private workspace data, including students, attendance, grades, settings, and archives? This cannot be undone.`
            : ""
        }
        onConfirm={deleteTeacherAccount}
        onCancel={() => setDeleteTarget(null)}
        isDestructive
        confirmText={
          savingUserId === deleteTarget?.id ? "Deleting…" : "Delete teacher"
        }
        isConfirming={savingUserId === deleteTarget?.id}
      />
    </div>
  );
}
