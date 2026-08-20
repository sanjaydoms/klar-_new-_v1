import type { ReactNode } from "react";

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex items-end justify-between gap-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-ink-50">{title}</h1>
        {description && (
          <p className="mt-1 text-[13px] text-ink-400">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}
