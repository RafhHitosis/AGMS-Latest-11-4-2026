import clsx from "clsx";
import { ChevronDown } from "lucide-react";

export default function DropdownSelect({
  className,
  wrapperClassName,
  iconClassName,
  children,
  ...props
}) {
  const fillsWidth = className && className.split(/\s+/).includes("w-full");

  return (
    <span
      className={clsx(
        "relative inline-flex max-w-full align-middle",
        fillsWidth && "w-full",
        wrapperClassName,
      )}
    >
      <select
        {...props}
        className={clsx("max-w-full appearance-none pr-10", className)}
      >
        {children}
      </select>
      <ChevronDown
        aria-hidden="true"
        className={clsx(
          "pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400",
          iconClassName,
        )}
      />
    </span>
  );
}
