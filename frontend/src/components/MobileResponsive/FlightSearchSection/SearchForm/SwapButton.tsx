import { ArrowRightLeft } from 'lucide-react';

/**
 * The circle between From and To on the mobile flight forms.
 *
 * One definition for all three trip types. It was inline markup in each:
 * One Way and Round Trip had a `div` with an `onClick` — it worked on tap, but
 * carried no accessible name and could not be reached from a keyboard — while
 * Multi City's had no handler at all, so its per-leg circles were decoration
 * that looked like controls.
 */
export default function SwapButton({
  onSwap,
  disabled = false,
}: {
  onSwap: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onSwap}
      disabled={disabled}
      aria-label="Swap origin and destination"
      title="Swap origin and destination"
      className="flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-[0_4px_14px_-4px_rgba(224,36,47,0.6)] ring-1 ring-black/5 transition hover:bg-red-50 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-red)] disabled:cursor-not-allowed disabled:opacity-50"
    >
      <ArrowRightLeft size={15} className="text-[var(--color-brand-red)]" aria-hidden="true" />
    </button>
  );
}
