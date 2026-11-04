import { useCallback, useEffect, useState } from "react";
import { Eye, EyeOff, LoaderCircle, LockKeyhole, LogOut, ShieldCheck } from "lucide-react";
import { api } from "../lib/api";

export default function AuthGate({ children }) {
  const [authenticated, setAuthenticated] = useState(false);
  const [checking, setChecking] = useState(true);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

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
    try {
      await api.logout();
      setAuthenticated(false);
    } catch (logoutError) {
      setError(logoutError.message || "Unable to sign out. Please try again.");
    } finally {
      setBusy(false);
    }
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
      <main className="flex min-h-screen items-center justify-center bg-surface-container-low px-4 py-10">
        <section className="w-full max-w-md rounded-3xl border border-outline-variant bg-surface p-8 shadow-elevation-2 sm:p-10">
          <div className="mb-7 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-container text-on-primary-container">
            <ShieldCheck className="h-7 w-7" aria-hidden="true" />
          </div>
          <p className="mb-2 text-sm font-semibold uppercase tracking-[0.16em] text-primary">
            Secure access
          </p>
          <h1 className="text-2xl font-bold text-on-surface">Attendance &amp; Grading</h1>
          <p className="mt-2 text-sm leading-6 text-on-surface-variant">
            Enter the access password to continue.
          </p>

          <form className="mt-8 space-y-5" onSubmit={handleLogin}>
            <label className="block text-sm font-medium text-on-surface" htmlFor="access-password">
              Access password
              <span className="relative mt-2 block">
                <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-on-surface-variant" />
                <input
                  autoComplete="current-password"
                  className="w-full rounded-xl border border-outline-variant bg-surface-container-low py-3 pl-11 pr-12 text-on-surface outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                  disabled={busy}
                  id="access-password"
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  type={showPassword ? "text" : "password"}
                  value={password}
                />
                <button
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-on-surface-variant hover:text-on-surface"
                  onClick={() => setShowPassword((visible) => !visible)}
                  tabIndex={-1}
                  type="button"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </span>
            </label>

            {error && (
              <p className="rounded-xl border border-error/20 bg-error-container px-4 py-3 text-sm text-on-error-container" role="alert">
                {error}
              </p>
            )}

            <button
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 font-semibold text-on-primary transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={busy || !password}
              type="submit"
            >
              {busy && <LoaderCircle className="h-5 w-5 animate-spin" />}
              {busy ? "Verifying..." : "Continue"}
            </button>
          </form>

          {error.startsWith("Unable to connect") && (
            <button
              className="mt-4 w-full rounded-xl border border-outline-variant px-4 py-2.5 text-sm font-medium text-on-surface hover:bg-surface-container"
              onClick={checkSession}
              type="button"
            >
              Retry connection
            </button>
          )}
        </section>
      </main>
    );
  }

  return (
    <>
      {children}
      <button
        aria-label="Sign out"
        className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-full border border-outline-variant bg-surface px-4 py-2.5 text-sm font-semibold text-on-surface shadow-elevation-2 transition hover:bg-surface-container disabled:opacity-60"
        disabled={busy}
        onClick={handleLogout}
        type="button"
      >
        <LogOut className="h-4 w-4" />
        Sign out
      </button>
      {error && (
        <p className="fixed bottom-16 right-4 z-50 rounded-xl border border-error/20 bg-error-container px-4 py-3 text-sm text-on-error-container shadow-elevation-1" role="alert">
          {error}
        </p>
      )}
    </>
  );
}
