"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useState, type ReactNode } from "react";

import { catalogKeys, fetchConfig } from "@/entities/catalog";
import { AgeGate } from "@/features/age-gate";
import { track } from "@/features/events";
import { setAccessMode } from "@/shared/api/runtime";
import { ru } from "@/shared/i18n";
import { usePlatform } from "@/shared/lib/platform";
import { storageKeys } from "@/shared/lib/storage-keys";
import { ErrorState, Screen, Skeleton } from "@/shared/ui";
import { BrowserChrome } from "./BrowserChrome";

type Phase = "boot" | "stub" | "declined" | "gate" | "app";

function tokenExpired(token: string) {
  try {
    const payload = token.split(".")[1];
    if (!payload) {
      return true;
    }
    const json = JSON.parse(
      atob(payload.replace(/-/g, "+").replace(/_/g, "/")),
    ) as {
      exp?: number;
    };
    return !json.exp || json.exp * 1000 <= Date.now();
  } catch {
    return true;
  }
}

export function AppShell({ children }: { children: ReactNode }) {
  const platform = usePlatform();
  const config = useQuery({
    queryKey: catalogKeys.config,
    queryFn: fetchConfig,
    enabled: platform.ready,
  });
  const [phase, setPhase] = useState<Phase>("boot");

  useEffect(() => {
    if (!config.data) {
      return;
    }
    setAccessMode(config.data.accessMode);
    let cancelled = false;
    const mode = config.data.accessMode;
    const telegram = platform.isTelegram;
    void (async () => {
      await Promise.resolve();
      if (cancelled) {
        return;
      }
      if (mode === "telegram_only" && !telegram) {
        setPhase("stub");
        return;
      }
      const declined = await platform.storage.get(storageKeys.ageDeclined);
      if (cancelled) {
        return;
      }
      if (declined && Date.now() < Date.parse(declined)) {
        setPhase("declined");
        return;
      }
      const token = await platform.storage.get(storageKeys.ageToken);
      if (cancelled) {
        return;
      }
      if (!token || tokenExpired(token)) {
        setPhase("gate");
        return;
      }
      setPhase("app");
    })();
    return () => {
      cancelled = true;
    };
  }, [config.data, platform.isTelegram, platform.storage]);

  useEffect(() => {
    const onInvalid = () => setPhase("gate");
    window.addEventListener("age-token-invalid", onInvalid);
    return () => window.removeEventListener("age-token-invalid", onInvalid);
  }, []);

  if (config.isError) {
    return <ErrorState onRetry={() => void config.refetch()} />;
  }
  if (!platform.ready || config.isLoading || phase === "boot") {
    return (
      <Screen>
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="mt-4 h-24" />
      </Screen>
    );
  }
  if (phase === "stub") {
    return (
      <Screen testId="outside">
        <h1 className="text-xl font-semibold">{ru.outside.title}</h1>
      </Screen>
    );
  }
  if (phase === "declined") {
    return (
      <Screen testId="declined">
        <h1 className="text-xl font-semibold">{ru.declined.title}</h1>
        <p className="mt-3 text-sm text-tg-hint">{ru.declined.text}</p>
      </Screen>
    );
  }
  if (phase === "gate") {
    return (
      <>
        <AgeGate
          cooldownHours={config.data?.flags.ageGateCooldownHours ?? 24}
          onPassed={() => {
            track("age_gate_passed");
            setPhase("app");
          }}
          onDeclined={() => {
            track("age_gate_declined");
            setPhase("declined");
          }}
        />
        <BrowserChrome />
      </>
    );
  }

  return (
    <>
      {children}
      <BrowserChrome />
    </>
  );
}
