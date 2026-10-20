"use client";

import { ru } from "@/shared/i18n";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto max-w-[480px] px-4 py-10">
      <p>{ru.states.error}</p>
      <button
        type="button"
        className="mt-4 min-h-11 rounded-xl bg-tg-button px-4 text-tg-button-text"
        onClick={reset}
      >
        {ru.retry}
      </button>
    </div>
  );
}
