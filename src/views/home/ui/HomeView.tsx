"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { catalogKeys, fetchMeta } from "@/entities/catalog";
import { ru } from "@/shared/i18n";
import { usePlatform } from "@/shared/lib/platform";
import { isFresh, storageKeys } from "@/shared/lib/storage-keys";
import {
  getRouteAbout,
  getRouteCatalog,
  getRouteSurvey,
} from "@/shared/const/router";
import { ErrorState, Screen, Skeleton } from "@/shared/ui";

export function HomeView() {
  const router = useRouter();
  const platform = usePlatform();
  const [query, setQuery] = useState("");
  const [hasDraft, setHasDraft] = useState(false);
  const meta = useQuery({ queryKey: catalogKeys.meta, queryFn: fetchMeta });

  useEffect(() => {
    void platform.storage.get(storageKeys.surveyDraft).then((raw) => {
      if (!raw) {
        return;
      }
      try {
        const draft = JSON.parse(raw) as { savedAt?: number };
        setHasDraft(Boolean(draft.savedAt && isFresh(draft.savedAt)));
      } catch {
        setHasDraft(false);
      }
    });
  }, [platform.storage]);

  if (meta.isLoading) {
    return (
      <Screen>
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="mt-4 h-12" />
        <Skeleton className="mt-3 h-20" />
      </Screen>
    );
  }
  if (meta.isError || !meta.data) {
    return <ErrorState onRetry={() => void meta.refetch()} />;
  }

  const categories = meta.data.categories;
  function openSearch() {
    const value = query.trim();
    if (value.length === 1) {
      return;
    }
    const params = new URLSearchParams();
    if (value.length >= 2) {
      params.set("q", value);
    }
    router.push(`${getRouteCatalog()}?${params.toString()}`);
  }

  return (
    <Screen title={ru.appName} testId="home">
      <form
        className="space-y-2"
        onSubmit={(event) => {
          event.preventDefault();
          openSearch();
        }}
      >
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={ru.home.searchPlaceholder}
          className="min-h-11 w-full rounded-xl bg-tg-secondary px-3 outline-none"
          enterKeyHint="search"
        />
        {query.trim().length === 1 ? (
          <p className="text-xs text-tg-hint">{ru.home.minQuery}</p>
        ) : null}
        <button
          type="submit"
          className="min-h-11 w-full rounded-xl bg-tg-secondary"
        >
          {ru.home.search}
        </button>
      </form>
      {categories.length > 1 ? (
        <div className="mt-4 grid gap-2">
          {categories.map((category) => (
            <button
              key={category.code}
              type="button"
              data-testid={`category-${category.code}`}
              className="min-h-11 rounded-2xl bg-tg-section px-4 py-4 text-left font-medium"
              onClick={() => {
                platform.haptic.selection();
                router.push(`${getRouteCatalog()}?category=${category.code}`);
              }}
            >
              {category.name}
            </button>
          ))}
        </div>
      ) : null}
      <button
        type="button"
        className="mt-4 min-h-11 w-full rounded-xl bg-tg-button font-medium text-tg-button-text"
        onClick={() => router.push(getRouteSurvey())}
      >
        {ru.home.survey}
      </button>
      {hasDraft ? (
        <button
          type="button"
          className="mt-2 min-h-11 w-full rounded-xl bg-tg-secondary"
          onClick={() => router.push(getRouteSurvey())}
        >
          {ru.home.continueSurvey}
        </button>
      ) : null}
      <button
        type="button"
        className="mt-6 min-h-11 text-tg-link"
        onClick={() => router.push(getRouteAbout())}
      >
        {ru.home.about}
      </button>
    </Screen>
  );
}
