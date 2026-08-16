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
      className="rounded-full border border-primary/10 bg-white p-2 transition-colors hover:bg-primary/20 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50"
    >
      <ArrowRightLeft size={15} className="text-primary" aria-hidden="true" />
    </button>
  );
}
