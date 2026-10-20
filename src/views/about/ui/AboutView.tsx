"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

import { catalogKeys, fetchConfig, fetchMeta } from "@/entities/catalog";
import { ru } from "@/shared/i18n";
import { useBackButton, useMainButton } from "@/shared/lib/use-chrome";
import { getRouteHome } from "@/shared/const/router";
import { Screen } from "@/shared/ui";

export function AboutView() {
  const router = useRouter();
  const config = useQuery({
    queryKey: catalogKeys.config,
    queryFn: fetchConfig,
  });
  const meta = useQuery({ queryKey: catalogKeys.meta, queryFn: fetchMeta });
  useMainButton(null);
  useBackButton({ visible: true, onClick: () => router.push(getRouteHome()) });

  return (
    <Screen title={ru.about.title} testId="about">
      <p className="leading-6">{ru.about.how}</p>
      <p className="mt-4 text-sm leading-6 text-tg-hint">{ru.legal.privacy}</p>
      <p className="mt-4 text-sm leading-6 text-tg-hint">{ru.legal.ageBody}</p>
      <p className="mt-6 text-sm">
        {ru.about.version}: {config.data?.appVersion ?? "—"}
      </p>
      <p className="mt-1 text-sm">
        {ru.about.catalog}:{" "}
        {meta.data?.catalogUpdatedAt
          ? new Date(meta.data.catalogUpdatedAt).toLocaleDateString("ru")
          : "—"}
      </p>
    </Screen>
  );
}
