import type { InputHTMLAttributes, ReactNode } from "react";

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[13px] font-medium text-ink-200">
        {label}
      </span>
      {children}
      {hint && <span className="mt-1 block text-[12px] text-ink-600">{hint}</span>}
    </label>
  );
}

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full rounded-lg border border-ink-800 bg-ink-950 px-3 py-2 text-[13px] text-ink-50 outline-none placeholder:text-ink-600 focus:border-brand-500 disabled:opacity-60 ${props.className ?? ""}`}
    />
  );
}

/**
 * A toggle that cannot be flipped by accident and cannot lie.
 *
 * `unavailable` renders it visibly inert with the reason — used for operations
 * a supplier does not implement, where the switch must exist in the matrix but
 * must never suggest it could be turned on.
 */
export function Toggle({
  checked,
  onChange,
  label,
  unavailable,
  busy,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  unavailable?: string;
  busy?: boolean;
}) {
  if (unavailable) {
    return (
      <span
        title={unavailable}
        className="inline-flex items-center gap-2 text-[12px] text-ink-600"
      >
        <span className="h-4 w-7 rounded-full bg-ink-850 ring-1 ring-inset ring-ink-800" />
        {unavailable}
      </span>
    );
  }

  return (
    <button
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={busy}
      onClick={() => onChange(!checked)}
      className="inline-flex items-center gap-2 disabled:opacity-50"
    >
      <span
        className={`relative h-4 w-7 rounded-full transition-colors ${
          checked ? "bg-ok-500" : "bg-ink-800"
        }`}
      >
        <span
          className={`absolute top-0.5 size-3 rounded-full bg-white transition-all ${
            checked ? "left-3.5" : "left-0.5"
          }`}
        />
      </span>
      <span className="text-[12px] text-ink-400">{checked ? "On" : "Off"}</span>
    </button>
  );
}
