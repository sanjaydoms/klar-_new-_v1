import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/Primitives";

/**
 * A section that has a place in the navigation but no implementation yet.
 *
 * Says so plainly rather than showing an empty table that looks like "no
 * incidents" or "no errors" (§68). A screen that cannot tell the difference
 * between "nothing happened" and "nothing is watching" is worse than one that
 * is honestly absent.
 */
export function Pending({
  title,
  phase,
  description,
}: {
  title: string;
  phase: string;
  description: string;
}) {
  return (
    <>
      <PageHeader title={title} />
      <Card className="px-6 py-10 text-center">
        <div className="text-[13px] font-medium tracking-wide text-ink-600 uppercase">
          {phase}
        </div>
        <p className="mx-auto mt-2 max-w-lg text-[14px] text-ink-200">
          {description}
        </p>
        <p className="mx-auto mt-3 max-w-lg text-[13px] text-ink-600">
          Nothing is being collected for this section yet, so it is shown as
          absent rather than as empty.
        </p>
      </Card>
    </>
  );
}
