import type { ButtonHTMLAttributes, ReactNode } from "react";

/**
 * The handful of primitives this app needs.
 *
 * Hand-written rather than generated: five components is less code than the
 * dependency and the config that would produce them, and the B2C app's own
 * shadcn setup is tuned for a light marketing surface rather than a dense dark
 * console.
 */

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-xl border border-ink-800 bg-ink-900 ${className}`}
    >
      {children}
    </div>
  );
}

export function SectionHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-ink-800 px-5 py-4">
      <div>
        <h2 className="text-[15px] font-semibold text-ink-50">{title}</h2>
        {description && (
          <p className="mt-0.5 text-[13px] text-ink-400">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost" | "danger";
};

export function Button({ variant = "ghost", className = "", ...props }: ButtonProps) {
  const styles = {
    primary: "bg-brand-500 text-white hover:bg-brand-400",
    ghost: "bg-ink-850 text-ink-200 hover:bg-ink-800 ring-1 ring-inset ring-ink-800",
    danger: "bg-critical-500/15 text-critical-500 ring-1 ring-inset ring-critical-500/30 hover:bg-critical-500/25",
  }[variant];
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${styles} ${className}`}
    />
  );
}

/**
 * A statistic.
 *
 * `unavailable` is a first-class state, not an afterthought. A KPI showing "0"
 * because nothing has been measured yet is a lie that reads as good news —
 * which is the worst possible direction for an ops dashboard to be wrong in.
 */
export function Stat({
  label,
  value,
  hint,
  tone = "neutral",
  unavailable,
}: {
  label: string;
  value?: ReactNode;
  hint?: string;
  tone?: "neutral" | "ok" | "warn" | "critical";
  unavailable?: string;
}) {
  const toneClass = {
    neutral: "text-ink-50",
    ok: "text-ok-500",
    warn: "text-warn-500",
    critical: "text-critical-500",
  }[tone];

  return (
    <Card className="px-4 py-3.5">
      <div className="text-[12px] font-medium tracking-wide text-ink-400 uppercase">
        {label}
      </div>
      {unavailable ? (
        <>
          <div className="mt-1.5 text-[15px] text-ink-600">Not collected</div>
          <div className="mt-0.5 text-[12px] text-ink-600">{unavailable}</div>
        </>
      ) : (
        <>
          <div className={`tnum mt-1 text-2xl font-semibold ${toneClass}`}>
            {value}
          </div>
          {hint && <div className="mt-0.5 text-[12px] text-ink-400">{hint}</div>}
        </>
      )}
    </Card>
  );
}

export function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="px-5 py-12 text-center">
      <p className="text-[14px] font-medium text-ink-200">{title}</p>
      <p className="mx-auto mt-1 max-w-md text-[13px] text-ink-400">
        {description}
      </p>
    </div>
  );
}

export function ErrorNotice({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-critical-500/30 bg-critical-500/10 px-4 py-3 text-[13px] text-critical-500">
      {message}
    </div>
  );
}
