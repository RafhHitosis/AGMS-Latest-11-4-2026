import { useCallback, useEffect, useState } from "react";
import {
  BookOpenCheck,
  ClipboardCheck,
  Eye,
  EyeOff,
  LoaderCircle,
  LockKeyhole,
  ShieldCheck,
} from "lucide-react";
import { api } from "../lib/api";
import ConfirmModal from "./ConfirmModal";
import bgPattern from "../assets/bg.png";

export default function AuthGate({ children }) {
  const [authenticated, setAuthenticated] = useState(false);
  const [checking, setChecking] = useState(true);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [confirmingSignOut, setConfirmingSignOut] = useState(false);

  const checkSession = useCallback(async () => {
    setChecking(true);
    setError("");
    try {
      const session = await api.getSession();
      setAuthenticated(session.authenticated);
    } catch {
      setError("Unable to connect to the server. Check your connection and try again.");
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  const handleLogin = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api.login(password);
      setPassword("");
      setAuthenticated(true);
    } catch (loginError) {
      setError(loginError.message || "Sign-in failed. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const handleLogout = async () => {
    setBusy(true);
    setError("");
    try {
      await api.logout();
      setAuthenticated(false);
      setConfirmingSignOut(false);
    } catch (logoutError) {
      setError(logoutError.message || "Unable to sign out. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const requestSignOut = () => {
    setError("");
    setConfirmingSignOut(true);
  };

  if (checking) {
    return (
      <main className="flex min-h-screen items-center justify-center text-primary" aria-label="Checking access">
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
          style={{ backgroundImage: `url(${bgPattern})`, backgroundSize: "auto 100%" }}
        />
        <section className="relative grid w-full max-w-3xl overflow-hidden rounded-2xl border border-outline-variant/60 bg-surface shadow-elevation-2 md:grid-cols-2">
          <div className="flex flex-col justify-center bg-surface-container-low px-7 py-8 sm:px-9 sm:py-10">
            <div className="mb-8 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-on-primary">
                <ShieldCheck className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <h1 className="text-base font-bold tracking-tight text-on-surface">
                  Attendance &amp; Grading
                </h1>
                <p className="mt-0.5 text-xs text-on-surface-variant">Class management</p>
              </div>
            </div>

            <div className="space-y-6">
              <div className="flex gap-3">
                <ClipboardCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
                <div>
                  <h2 className="text-sm font-semibold text-on-surface">Attendance</h2>
                  <p className="mt-1 text-sm leading-5 text-on-surface-variant">
                    Mark daily attendance, manage holidays, and export records.
                  </p>
                </div>
              </div>
              <div className="h-px bg-outline-variant/60" />
              <div className="flex gap-3">
                <BookOpenCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
                <div>
                  <h2 className="text-sm font-semibold text-on-surface">Grading</h2>
                  <p className="mt-1 text-sm leading-5 text-on-surface-variant">
                    Enter assessment scores, calculate term grades, and review results.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col justify-center border-t border-outline-variant/60 bg-surface px-7 py-8 sm:px-9 sm:py-10 md:border-l md:border-t-0">
            <div className="mb-7">
              <h2 className="text-xl font-bold tracking-tight text-on-surface">Enter access key</h2>
              <p className="mt-1.5 text-sm text-on-surface-variant">
                Use the shared access key to continue.
              </p>
            </div>

            <form className="space-y-5" onSubmit={handleLogin}>
              <label className="block text-sm font-medium text-on-surface" htmlFor="access-password">
                Access key
                <span className="relative mt-2 block">
                  <LockKeyhole className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-on-surface-variant" />
                  <input
                    autoComplete="current-password"
                    autoFocus
                    className="w-full rounded-lg border border-outline-variant bg-surface py-3 pl-11 pr-12 text-sm text-on-surface outline-none transition placeholder:text-on-surface-variant focus:border-primary focus:ring-2 focus:ring-primary/15"
                    disabled={busy}
                    id="access-password"
                    onChange={(event) => setPassword(event.target.value)}
                    required
                    type={showPassword ? "text" : "password"}
                    value={password}
                  />
                  <button
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-on-surface-variant transition hover:text-on-surface"
                    onClick={() => setShowPassword((visible) => !visible)}
                    tabIndex={-1}
                    type="button"
                  >
                    {showPassword ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
                  </button>
                </span>
              </label>

              {error && (
                <p className="rounded-lg border border-error/20 bg-error-container px-4 py-3 text-sm leading-5 text-on-error-container" role="alert">
                  {error}
                </p>
              )}

              <button
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-on-primary transition hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={busy || !password}
                type="submit"
              >
                {busy && <LoaderCircle className="h-[18px] w-[18px] animate-spin" />}
                {busy ? "Verifying..." : "Continue"}
              </button>
            </form>

            {error.startsWith("Unable to connect") && (
              <button className="mt-4 w-full rounded-lg border border-outline-variant px-4 py-2.5 text-sm font-medium text-on-surface-variant transition hover:bg-surface-container" onClick={checkSession} type="button">
                Retry connection
              </button>
            )}
          </div>
        </section>
      </main>
    );
  }

  return (
    <>
      {typeof children === "function" ? children({ requestSignOut }) : children}
      {error && (
        <p className="fixed bottom-16 right-4 z-50 rounded-xl border border-error/20 bg-error-container px-4 py-3 text-sm text-on-error-container shadow-elevation-1" role="alert">
          {error}
        </p>
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
