import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, CheckCircle2, Info, TriangleAlert, X } from "lucide-react";
import { ToastContext } from "./ToastContext";

const DEFAULT_DURATION = 5000;

const toastStyles = {
  warning: {
    icon: TriangleAlert,
    title: "Warning",
    color: "text-amber-700 dark:text-amber-300",
    iconBackground: "bg-amber-100 dark:bg-amber-900/40",
    progress: "bg-amber-500 dark:bg-amber-400",
  },
  error: {
    icon: AlertCircle,
    title: "Error",
    color: "text-error",
    iconBackground: "bg-error-container",
    progress: "bg-error",
  },
  success: {
    icon: CheckCircle2,
    title: "Success",
    color: "text-primary",
    iconBackground: "bg-primary-container",
    progress: "bg-primary",
  },
  info: {
    icon: Info,
    title: "Information",
    color: "text-blue-600 dark:text-blue-400",
    iconBackground: "bg-blue-100 dark:bg-blue-950/60",
    progress: "bg-blue-600 dark:bg-blue-400",
  },
};

function ToastItem({ item, onDismiss }) {
  const [paused, setPaused] = useState(false);
  const timerStartedAt = useRef(0);
  const timer = useRef(null);
  const remaining = useRef(item.duration);
  const style = toastStyles[item.type];
  const Icon = style.icon;

  useEffect(() => {
    if (paused || item.duration <= 0) return undefined;

    timerStartedAt.current = Date.now();
    timer.current = window.setTimeout(() => onDismiss(item.id), remaining.current);
    return () => window.clearTimeout(timer.current);
  }, [item.duration, item.id, onDismiss, paused]);

  const pause = () => {
    if (paused) return;
    remaining.current = Math.max(
      0,
      remaining.current - (Date.now() - timerStartedAt.current),
    );
    setPaused(true);
  };

  return (
    <div
      className="app-toast-enter pointer-events-auto relative flex items-start gap-4 overflow-hidden rounded-2xl border border-outline-variant/70 bg-surface p-5 pb-7 pr-12 text-on-surface shadow-elevation-3"
      onMouseEnter={pause}
      onMouseLeave={() => setPaused(false)}
      role={item.type === "warning" || item.type === "error" ? "alert" : "status"}
    >
      <span className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${style.iconBackground}`}>
        <Icon aria-hidden="true" className={`h-5 w-5 ${style.color}`} />
      </span>
      <div className="min-w-0 flex-1">
        <p className={`text-sm font-semibold leading-5 ${style.color}`}>
          {item.title || style.title}
        </p>
        <div className="mt-1.5 text-sm leading-5 text-on-surface-variant [overflow-wrap:anywhere]">
          {item.content}
        </div>
      </div>
      <button
        aria-label="Dismiss notification"
        className="absolute right-3 top-3 rounded-lg p-1.5 text-on-surface-variant transition hover:bg-surface-container hover:text-on-surface"
        onClick={() => onDismiss(item.id)}
        type="button"
      >
        <X aria-hidden="true" className="h-[18px] w-[18px]" />
      </button>
      {item.duration > 0 && (
        <div
          aria-hidden="true"
          className="absolute inset-x-4 bottom-3 h-1 overflow-hidden rounded-full bg-outline-variant/40"
        >
          <div
            className={`app-toast-progress h-full origin-left rounded-full ${style.progress}`}
            style={{
              animationDuration: `${item.duration}ms`,
              animationPlayState: paused ? "paused" : "running",
            }}
          />
        </div>
      )}
    </div>
  );
}

export default function ToastProvider({ children }) {
  const [items, setItems] = useState([]);
  const idCounter = useRef(0);

  const dismiss = useCallback((id) => {
    setItems((current) => id === undefined ? [] : current.filter((item) => item.id !== id));
  }, []);

  useEffect(() => {
    if (items.length === 0) return undefined;

    const dismissToasts = () => dismiss();
    document.addEventListener("click", dismissToasts);
    return () => document.removeEventListener("click", dismissToasts);
  }, [dismiss, items.length]);

  const addToast = useCallback((type, content, options = {}) => {
    const instance = ++idCounter.current;
    const id = options.toastId ?? `app-toast-${instance}`;
    const item = {
      id,
      instance,
      type,
      content,
      title: options.title,
      duration: options.autoClose === false ? 0 : options.autoClose ?? DEFAULT_DURATION,
    };

    setItems((current) => [...current.filter((toast) => toast.id !== id), item]);
  }, []);

  const toast = useMemo(
    () => ({
      warn: (content, options) => addToast("warning", content, options),
      error: (content, options) => addToast("error", content, options),
      success: (content, options) => addToast("success", content, options),
      info: (content, options) => addToast("info", content, options),
      dismiss,
    }),
    [addToast, dismiss],
  );

  return (
    <ToastContext.Provider value={toast}>
      {children}
      {items.length > 0 && (
        <div
          aria-hidden="true"
          className="app-toast-backdrop pointer-events-none fixed inset-0 z-40 bg-slate-950/10 backdrop-blur-[1px] dark:bg-black/25"
        />
      )}
      <div
        aria-label="Notifications"
        className="pointer-events-none fixed bottom-4 right-4 z-[9999] flex w-[min(27rem,calc(100vw-2rem))] flex-col gap-4 sm:bottom-6 sm:right-6"
      >
        {items.map((item) => (
          <ToastItem key={`${item.id}-${item.instance}`} item={item} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}
