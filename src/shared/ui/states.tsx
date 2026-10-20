import type { ReactNode } from "react";

import { ru } from "@/shared/i18n";

export function Screen({
  title,
  children,
  testId,
}: {
  title?: string;
  children: ReactNode;
  testId?: string;
}) {
  return (
    <main
      data-testid={testId}
      className="mx-auto min-h-dvh w-full max-w-[480px] bg-tg-bg px-4 pb-28 pt-[max(1rem,env(safe-area-inset-top))] text-tg-text"
    >
      {title ? <h1 className="mb-4 text-xl font-semibold">{title}</h1> : null}
      {children}
    </main>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded-xl bg-tg-secondary ${className}`} />
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="rounded-2xl bg-tg-secondary px-4 py-8 text-center">
      <p className="font-medium">{title}</p>
      {hint ? <p className="mt-2 text-sm text-tg-hint">{hint}</p> : null}
    </div>
  );
}

export function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <Screen>
      <div className="rounded-2xl bg-tg-secondary px-4 py-8 text-center">
        <p>{ru.states.error}</p>
        <button
          type="button"
          className="mt-4 min-h-11 rounded-xl bg-tg-button px-4 text-tg-button-text"
          onClick={onRetry}
        >
          {ru.retry}
        </button>
      </div>
    </Screen>
  );
}
