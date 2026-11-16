import { useCallback, useEffect, useState } from "react";
import {
  BookOpenCheck,
  ClipboardCheck,
  Clock,
  LoaderCircle,
  ShieldCheck,
  KeyRound,
} from "lucide-react";
import { api } from "../lib/api";
import { useToast } from "../context/ToastContext";
import ConfirmModal from "./ConfirmModal";
import ThemeToggle from "./ThemeToggle";
import AdminRecoveryQuestionsForm from "./AdminRecoveryQuestionsForm";
import { copyTextToClipboard } from "../utils/copyTextToClipboard";
import bgPattern from "../assets/bg.png";

export default function AuthGate({ children, onTakeAssessment }) {
  const toast = useToast();
  const [authenticated, setAuthenticated] = useState(false);
  const [checking, setChecking] = useState(true);
  const [accessKey, setAccessKey] = useState("");
  const [assessmentCode, setAssessmentCode] = useState("");
  const [assessmentAvailability, setAssessmentAvailability] = useState("checking");
  const [assessmentAvailabilityError, setAssessmentAvailabilityError] = useState("");
  const [currentUser, setCurrentUser] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [lockoutUntil, setLockoutUntil] = useState(null);
  const [lockoutRemainingMs, setLockoutRemainingMs] = useState(0);
  const [confirmingSignOut, setConfirmingSignOut] = useState(false);
  const [recoveringAdminKey, setRecoveringAdminKey] = useState(false);
  const [recoveryLoading, setRecoveryLoading] = useState(false);
  const [recoveryBusy, setRecoveryBusy] = useState(false);
  const [recoveryQuestions, setRecoveryQuestions] = useState(null);
  const [recoveryAnswers, setRecoveryAnswers] = useState([]);
  const [recoveryError, setRecoveryError] = useState("");
  const [recoveredAdminKey, setRecoveredAdminKey] = useState(null);
  const [recoveredKeyCopied, setRecoveredKeyCopied] = useState(false);

  useEffect(() => {
    if (!lockoutUntil) return undefined;

    const updateRemaining = () => {
      const remainingMs = Math.max(0, lockoutUntil - Date.now());
      setLockoutRemainingMs(remainingMs);
      if (remainingMs === 0) {
        setLockoutUntil(null);
      }
    };

    updateRemaining();
    const timer = window.setInterval(updateRemaining, 250);
    return () => window.clearInterval(timer);
  }, [lockoutUntil]);

  const lockoutRemainingSeconds = Math.ceil(lockoutRemainingMs / 1000);
  const isLockedOut = lockoutRemainingMs > 0;
  const formatCountdown = (seconds) =>
    `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

  const checkSession = useCallback(async () => {
    setChecking(true);
    setError("");
    try {
      const session = await api.getSession();
      setAuthenticated(session.authenticated);
      setCurrentUser(session.user || null);
    } catch {
      setError(
        "Unable to connect to the server. Check your connection and try again.",
      );
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  useEffect(() => {
    if (checking || authenticated || !onTakeAssessment) return undefined;

    let active = true;
    setAssessmentAvailability("checking");
    setAssessmentAvailabilityError("");

    api.getPublicAssessmentAvailability()
      .then(({ available }) => {
        if (active) setAssessmentAvailability(available ? "available" : "none");
      })
      .catch(() => {
        if (!active) return;
        setAssessmentAvailability("error");
        setAssessmentAvailabilityError(
          "Student code access could not be checked. Assessment links can still be used.",
        );
      });

    return () => {
      active = false;
    };
  }, [checking, authenticated, onTakeAssessment]);

  useEffect(() => {
    const handleExpiredSession = () => {
      setAuthenticated(false);
      setCurrentUser(null);
      setAccessKey("");
    };
    window.addEventListener("agms:unauthorized", handleExpiredSession);
    return () =>
      window.removeEventListener("agms:unauthorized", handleExpiredSession);
  }, []);

  const handleLogin = async (event) => {
    event.preventDefault();
    if (isLockedOut) {
      toast.warn(
        `Too many sign-in attempts have been made. For your security, please wait ${formatCountdown(lockoutRemainingSeconds)} before trying again.`,
        { toastId: "auth-cooldown", title: "Security Cooldown" },
      );
      return;
    }
    setBusy(true);
    setError("");
    try {
      const session = await api.login(accessKey);
      setAccessKey("");
      setCurrentUser(session.user || null);
      setLockoutUntil(null);
      setLockoutRemainingMs(0);
      toast.dismiss();
      setAuthenticated(true);
    } catch (loginError) {
      if (loginError.status === 401) {
        toast.warn(
          "The access key is incorrect or has been disabled. Check it and try again.",
          { toastId: "auth-invalid-credentials", title: "Sign-in Failed" },
        );
      } else if (loginError.status === 429 && loginError.retryAfter) {
        const durationSeconds = Math.ceil(loginError.retryAfter);
        const until = Date.now() + durationSeconds * 1000;
        setLockoutRemainingMs(durationSeconds * 1000);
        setLockoutUntil(until);
        toast.warn(
          `The maximum number of sign-in attempts has been reached. For your security, please wait ${Math.ceil(durationSeconds / 60)} minutes before trying again.`,
          { toastId: "auth-lockout", title: "Security Cooldown" },
        );
      } else {
        toast.error(
          "We couldn't complete sign-in because the server couldn't be reached. Check your connection and try again in a moment.",
          { toastId: "auth-error", title: "Connection Error" },
        );
      }
    } finally {
      setBusy(false);
    }
  };

  const handleTakeAssessment = (event) => {
    event.preventDefault();
    const code = assessmentCode.trim().toUpperCase();
    if (!code || !onTakeAssessment) return;
    onTakeAssessment(code);
  };

  const handleLogout = async () => {
    setBusy(true);
    setError("");
    try {
      await api.logout();
      setAuthenticated(false);
      setCurrentUser(null);
      setAccessKey("");
      setConfirmingSignOut(false);
    } catch {
      toast.error(
        "We couldn't complete sign-out right now. Check your connection and try again.",
        { toastId: "auth-logout-error", title: "Sign Out Failed" },
      );
    } finally {
      setBusy(false);
    }
  };

  const requestSignOut = () => {
    setError("");
    setConfirmingSignOut(true);
  };

  const saveAdminRecoveryQuestions = useCallback(async (questions) => {
    await api.setAdminRecoveryQuestions(questions);
    setCurrentUser((user) =>
      user ? { ...user, admin_recovery_configured: true } : user,
    );
  }, []);

  const acknowledgeWelcome = useCallback(async () => {
    await api.acknowledgeWelcome();
    setCurrentUser((user) =>
      user ? { ...user, welcome_acknowledged: true } : user,
    );
  }, []);

  const openAdminKeyRecovery = async () => {
    setRecoveringAdminKey(true);
    setRecoveryLoading(true);
    setRecoveryError("");
    setRecoveryQuestions(null);
    setRecoveryAnswers([]);
    setRecoveredAdminKey(null);
    try {
      const result = await api.getAdminRecoveryQuestions();
      const questions = result.questions || [];
      setRecoveryQuestions(questions);
      setRecoveryAnswers(questions.map(() => ""));
    } catch (recoveryLoadError) {
      setRecoveryError(
        recoveryLoadError.message ||
          "Could not load the admin recovery questions.",
      );
    } finally {
      setRecoveryLoading(false);
    }
  };

  const closeAdminKeyRecovery = () => {
    setRecoveringAdminKey(false);
    setRecoveryError("");
    setRecoveryQuestions(null);
    setRecoveryAnswers([]);
    setRecoveredAdminKey(null);
    setRecoveredKeyCopied(false);
  };

  const handleAdminKeyRecovery = async (event) => {
    event.preventDefault();
    if (recoveryBusy) return;

    setRecoveryBusy(true);
    setRecoveryError("");
    try {
      const result = await api.recoverAdminAccess(
        recoveryQuestions.map((question, index) => ({
          questionId: question.id,
          answer: recoveryAnswers[index],
        })),
      );
      setRecoveredAdminKey(result);
      setRecoveredKeyCopied(false);
    } catch (recoveryError) {
      setRecoveryError(
        recoveryError.status === 429
          ? recoveryError.message
          : "The two answers could not be verified. Please check them and try again.",
      );
    } finally {
      setRecoveryBusy(false);
    }
  };

  const copyRecoveredAdminKey = async () => {
    if (!recoveredAdminKey) return;
    const copiedSuccessfully = await copyTextToClipboard(
      recoveredAdminKey.accessKey,
    );
    if (copiedSuccessfully) {
      setRecoveredKeyCopied(true);
      setRecoveryError("");
    } else {
      setRecoveryError(
        "Copy is unavailable. Select the key and copy it manually.",
      );
    }
  };

  if (checking) {
    return (
      <main
        className="flex min-h-screen items-center justify-center text-primary"
        aria-label="Checking access"
      >
        <LoaderCircle className="h-8 w-8 animate-spin" />
      </main>
    );
  }

  if (!authenticated) {
    return (
      <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-surface-container-low px-4 py-10 text-on-surface">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute bottom-0 left-0 right-0 h-[300px] bg-bottom bg-repeat-x opacity-40 dark:opacity-20 md:h-[400px]"
          style={{
            backgroundImage: `url(${bgPattern})`,
            backgroundSize: "auto 100%",
          }}
        />
        <ThemeToggle className="fixed right-4 top-4 z-30 h-10 w-10 justify-center border border-outline-variant/60 bg-surface/90 shadow-elevation-1 backdrop-blur-sm sm:right-6 sm:top-6" />
        <section className="relative grid w-full max-w-3xl overflow-hidden rounded-2xl border border-outline-variant/60 bg-surface shadow-elevation-2 md:grid-cols-2">
          <div className="flex flex-col justify-between bg-surface-container-low/70 px-7 py-8 sm:px-8 sm:py-9">
            <div>
              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-on-primary shadow-xs">
                  <ShieldCheck className="h-5 w-5" aria-hidden="true" />
                </div>
                <div>
                  <h1 className="text-base font-bold tracking-tight text-on-surface">
                    Attendance &amp; Grading
                  </h1>
                  <p className="mt-0.5 text-xs text-on-surface-variant">
                    Class management
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex gap-3">
                  <ClipboardCheck
                    className="mt-0.5 h-4.5 w-4.5 shrink-0 text-primary"
                    aria-hidden="true"
                  />
                  <div>
                    <h2 className="text-sm font-semibold text-on-surface">
                      Attendance
                    </h2>
                    <p className="mt-0.5 text-xs leading-5 text-on-surface-variant">
                      Mark daily attendance, manage holidays, and export records.
                    </p>
                  </div>
                </div>
                <div className="h-px bg-outline-variant/50" />
                <div className="flex gap-3">
                  <BookOpenCheck
                    className="mt-0.5 h-4.5 w-4.5 shrink-0 text-primary"
                    aria-hidden="true"
                  />
                  <div>
                    <h2 className="text-sm font-semibold text-on-surface">
                      Grading
                    </h2>
                    <p className="mt-0.5 text-xs leading-5 text-on-surface-variant">
                      Enter assessment scores, calculate term grades, and review
                      results.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 border-t border-outline-variant/40 pt-3 text-[11px] font-medium tracking-wide text-on-surface-variant/70">
              Attendance and grades, in one place
            </div>
          </div>

          <div className="flex flex-col justify-between border-t border-outline-variant/60 bg-surface px-7 py-8 sm:px-8 sm:py-9 md:border-l md:border-t-0">
            {recoveredAdminKey ? (
              <div className="space-y-5">
                <div>
                  <h2 className="text-xl font-bold tracking-tight text-on-surface">
                    Save your replacement key
                  </h2>
                  <p className="mt-1.5 text-sm text-on-surface-variant">
                    This key is shown once. The previous key and all admin
                    sessions have been invalidated.
                  </p>
                </div>
                <label
                  className="block text-sm font-medium text-on-surface"
                  htmlFor="recovered-admin-key"
                >
                  New administrator access key
                  <input
                    id="recovered-admin-key"
                    className="mt-2 w-full select-all rounded-lg border border-outline-variant bg-surface px-3 py-3 font-mono text-sm tracking-wide"
                    onFocus={(event) => event.target.select()}
                    readOnly
                    value={recoveredAdminKey.accessKey}
                  />
                </label>
                {recoveryError && (
                  <p className="text-sm text-error" role="alert">
                    {recoveryError}
                  </p>
                )}
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={copyRecoveredAdminKey}
                    className="w-full rounded-lg border border-outline-variant px-4 py-2.5 text-sm font-medium text-on-surface transition hover:bg-surface-container"
                  >
                    {recoveredKeyCopied ? "Copied" : "Copy replacement key"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAccessKey(recoveredAdminKey.accessKey);
                      closeAdminKeyRecovery();
                    }}
                    className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-on-primary transition hover:opacity-90"
                  >
                    Continue to sign in
                  </button>
                </div>
              </div>
            ) : recoveringAdminKey ? (
              <div className="space-y-5">
                <div>
                  <h2 className="text-xl font-bold tracking-tight text-on-surface">
                    Recover administrator access
                  </h2>
                  <p className="mt-1.5 text-sm text-on-surface-variant">
                    Answer both recovery questions to issue a replacement admin
                    key.
                  </p>
                </div>

                {recoveryLoading ? (
                  <div
                    className="flex justify-center py-8"
                    role="status"
                    aria-label="Loading recovery questions"
                  >
                    <LoaderCircle className="h-7 w-7 animate-spin text-primary" />
                  </div>
                ) : recoveryQuestions === null ? (
                  recoveryError ? (
                    <p className="text-sm text-error" role="alert">
                      {recoveryError}
                    </p>
                  ) : (
                    <p className="text-sm text-on-surface-variant">
                      Recovery questions could not be loaded.
                    </p>
                  )
                ) : recoveryQuestions.length === 0 ? (
                  <p className="rounded-lg border border-outline-variant/60 bg-surface-container-low p-3 text-sm text-on-surface-variant">
                    Admin recovery is not configured. An authorized database
                    operator must restore access.
                  </p>
                ) : (
                  <form className="space-y-4" onSubmit={handleAdminKeyRecovery}>
                    {recoveryQuestions.map((question, index) => (
                      <label
                        key={question.id}
                        className="block text-sm font-medium text-on-surface"
                      >
                        {question.prompt}
                        <input
                          type="password"
                          autoComplete="off"
                          autoCapitalize="off"
                          spellCheck={false}
                          minLength={3}
                          maxLength={200}
                          required
                          value={recoveryAnswers[index] || ""}
                          onChange={(event) => {
                            const answer = event.target.value;
                            setRecoveryAnswers((current) =>
                              current.map((value, answerIndex) =>
                                answerIndex === index ? answer : value,
                              ),
                            );
                          }}
                          className="mt-2 w-full rounded-lg border border-outline-variant bg-surface px-3 py-2.5 text-sm"
                        />
                      </label>
                    ))}
                    {recoveryError && (
                      <p className="text-sm text-error" role="alert">
                        {recoveryError}
                      </p>
                    )}
                    <button
                      type="submit"
                      disabled={recoveryBusy}
                      className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-on-primary disabled:cursor-wait disabled:opacity-60"
                    >
                      {recoveryBusy
                        ? "Verifying answers…"
                        : "Verify and issue new key"}
                    </button>
                  </form>
                )}

                <button
                  type="button"
                  onClick={closeAdminKeyRecovery}
                  className="w-full rounded-lg border border-outline-variant px-4 py-2.5 text-sm font-medium text-on-surface-variant transition hover:bg-surface-container"
                >
                  Back to sign in
                </button>
              </div>
            ) : (
              <>
                <div>
                  <div className="mb-5">
                    <h2 className="text-xl font-bold tracking-tight text-on-surface">
                      Sign in to your account
                    </h2>
                    <p className="mt-1 text-xs text-on-surface-variant">
                      Enter the private access key provided by your administrator.
                    </p>
                  </div>

                  <form className="space-y-4" onSubmit={handleLogin}>
                    <label
                      className="block text-xs font-medium text-on-surface"
                      htmlFor="account-access-key"
                    >
                      Access key
                      <span className="relative mt-1.5 block">
                        <KeyRound className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant" />
                        <input
                          autoCapitalize="off"
                          autoComplete="off"
                          autoFocus
                          autoCorrect="off"
                          className="w-full rounded-lg border border-outline-variant bg-surface py-2.5 pl-10 pr-4 font-mono text-sm tracking-wide text-on-surface outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:bg-slate-100 disabled:text-slate-400 dark:disabled:bg-slate-800"
                          disabled={busy || isLockedOut}
                          id="account-access-key"
                          onChange={(event) => setAccessKey(event.target.value)}
                          required
                          type="text"
                          spellCheck={false}
                          value={accessKey}
                        />
                      </span>
                    </label>

                    {isLockedOut && (
                      <div className="flex items-center gap-2 p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 text-xs text-amber-800 dark:text-amber-300 animate-in fade-in">
                        <Clock className="w-3.5 h-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
                        <div>
                          <span className="font-bold">Cooldown Active:</span> Wait{" "}
                          <span className="tabular-nums font-extrabold text-amber-700 dark:text-amber-200">
                            {formatCountdown(lockoutRemainingSeconds)}
                          </span>
                        </div>
                      </div>
                    )}

                    {error && (
                      <p
                        className="rounded-lg border border-error/20 bg-error-container px-3.5 py-2 text-xs leading-5 text-on-error-container"
                        role="alert"
                      >
                        {error}
                      </p>
                    )}

                    <div>
                      <button
                        className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-on-primary transition hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
                        disabled={busy || isLockedOut || !accessKey.trim()}
                        type="submit"
                      >
                        {busy && (
                          <LoaderCircle className="h-4 w-4 animate-spin" />
                        )}
                        {busy
                          ? "Signing in..."
                          : isLockedOut
                            ? `Try again in ${formatCountdown(lockoutRemainingSeconds)}`
                            : "Sign in"}
                      </button>
                    </div>
                  </form>

                  {onTakeAssessment && assessmentAvailability === "available" && (
                    <form
                      className="mt-4 rounded-xl border border-outline-variant/60 bg-surface-container-low/60 p-3.5"
                      onSubmit={handleTakeAssessment}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/10">
                          <ClipboardCheck
                            className="h-4 w-4 text-primary"
                            aria-hidden="true"
                          />
                        </span>
                        <div className="min-w-0">
                          <p className="whitespace-nowrap text-[clamp(0.625rem,1.5vw,0.75rem)] font-semibold leading-5 text-on-surface">
                            Are you a student taking an assessment?
                          </p>
                          <p className="text-[11px] leading-4 text-on-surface-variant">
                            Enter the code from your teacher.
                          </p>
                        </div>
                      </div>
                      <div className="mt-3 flex gap-2">
                        <label className="sr-only" htmlFor="student-assessment-code">
                          Assessment code
                        </label>
                        <input
                          id="student-assessment-code"
                          type="text"
                          autoCapitalize="characters"
                          autoComplete="off"
                          spellCheck={false}
                          maxLength={32}
                          value={assessmentCode}
                          onChange={(event) => setAssessmentCode(event.target.value)}
                          placeholder="Enter assessment code"
                          className="h-10 min-w-0 flex-1 rounded-lg border border-outline-variant bg-surface px-3 font-mono text-sm uppercase tracking-wide text-on-surface outline-none transition placeholder:font-sans placeholder:text-xs placeholder:normal-case placeholder:tracking-normal focus:border-primary focus:ring-2 focus:ring-primary/15"
                        />
                        <button
                          type="submit"
                          disabled={!assessmentCode.trim()}
                          className="h-10 shrink-0 rounded-lg bg-primary px-4 text-xs font-semibold text-on-primary transition hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Continue
                        </button>
                      </div>
                    </form>
                  )}
                  {onTakeAssessment && assessmentAvailability === "error" && (
                    <p role="status" className="mt-3 text-[11px] text-on-surface-variant">
                      {assessmentAvailabilityError}
                    </p>
                  )}

                  <div className="mt-3.5 flex items-center justify-center">
                    <button
                      type="button"
                      onClick={openAdminKeyRecovery}
                      className="inline-flex items-center gap-1.5 text-xs text-on-surface-variant hover:text-primary transition-colors cursor-pointer select-none"
                      title="Recover administrator access key"
                    >
                      <KeyRound
                        aria-hidden="true"
                        className="h-3.5 w-3.5 text-primary/70 shrink-0"
                      />
                      <span>Forgot administrator key?</span>
                    </button>
                  </div>

                  {error.startsWith("Unable to connect") && (
                    <button
                      className="mt-2.5 w-full rounded-lg border border-outline-variant px-4 py-2 text-xs font-medium text-on-surface-variant transition hover:bg-surface-container cursor-pointer"
                      onClick={checkSession}
                      type="button"
                    >
                      Retry connection
                    </button>
                  )}
                </div>

                <p className="mt-6 border-t border-outline-variant/40 pt-3 text-center text-xs tracking-wide text-on-surface-variant">
                  htss <span aria-hidden="true">·</span> 2026
                </p>
              </>
            )}
          </div>
        </section>
      </main>
    );
  }

  return (
    <>
      {typeof children === "function"
        ? children({
            requestSignOut,
            currentUser,
            acknowledgeWelcome,
            saveAdminRecoveryQuestions,
          })
        : children}

      {currentUser?.role === "admin" &&
        !currentUser.admin_recovery_configured && (
          <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/55 p-4 backdrop-blur-xs">
            <section
              role="dialog"
              aria-modal="true"
              aria-labelledby="admin-recovery-setup-title"
              className="w-full max-w-xl rounded-2xl border border-outline-variant/40 bg-surface p-5 text-on-surface shadow-elevation-3 sm:p-7"
            >
              <h2
                id="admin-recovery-setup-title"
                className="text-xl font-bold tracking-tight"
              >
                Set up admin key recovery
              </h2>
              <p className="mb-5 mt-2 text-sm leading-6 text-on-surface-variant">
                Before continuing, choose two recovery questions and save your
                answers. You will need both answers to generate a replacement
                administrator key if you get locked out.
              </p>
              <AdminRecoveryQuestionsForm
                configured={false}
                onSave={saveAdminRecoveryQuestions}
              />
            </section>
          </div>
        )}

      <ConfirmModal
        isOpen={confirmingSignOut}
        title="Sign out?"
        message="Are you sure you want to sign out of Attendance & Grading?"
        onConfirm={handleLogout}
        onCancel={() => setConfirmingSignOut(false)}
        confirmText={busy ? "Signing out..." : "Sign out"}
        isConfirming={busy}
        isDestructive
      />
    </>
  );
}
