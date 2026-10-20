"use client";

import { useState } from "react";

import { confirmAge } from "@/entities/catalog";
import { ru } from "@/shared/i18n";
import { usePlatform } from "@/shared/lib/platform";
import { storageKeys } from "@/shared/lib/storage-keys";
import { useMainButton, useSecondaryButton } from "@/shared/lib/use-chrome";
import { Screen } from "@/shared/ui";

export function AgeGate({
  cooldownHours,
  onPassed,
  onDeclined,
}: {
  cooldownHours: number;
  onPassed: () => void;
  onDeclined: () => void;
}) {
  const platform = usePlatform();
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);

  async function confirm() {
    setPending(true);
    setFailed(false);
    try {
      const result = await confirmAge();
      await platform.storage.set(storageKeys.ageToken, result.token);
      await platform.storage.remove(storageKeys.ageDeclined);
      platform.haptic.success();
      onPassed();
    } catch {
      setFailed(true);
      platform.haptic.error();
    } finally {
      setPending(false);
    }
  }

  async function decline() {
    const until = new Date(
      Date.now() + cooldownHours * 60 * 60 * 1000,
    ).toISOString();
    await platform.storage.set(storageKeys.ageDeclined, until);
    await platform.storage.remove(storageKeys.ageToken);
    onDeclined();
  }

  useMainButton({
    text: ru.ageGate.confirm,
    visible: true,
    disabled: pending,
    progress: pending,
    onClick: () => {
      void confirm();
    },
  });
  useSecondaryButton({
    text: ru.ageGate.decline,
    visible: true,
    onClick: () => {
      void decline();
    },
  });

  return (
    <Screen testId="age-gate">
      <h1 className="text-xl font-semibold">{ru.ageGate.title}</h1>
      <p className="mt-4 text-sm leading-6 text-tg-hint">{ru.legal.ageBody}</p>
      {failed ? (
        <p className="mt-4 text-sm text-tg-destructive">{ru.states.error}</p>
      ) : null}
    </Screen>
  );
}
