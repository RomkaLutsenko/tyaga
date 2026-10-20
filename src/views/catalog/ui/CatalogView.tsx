"use client";

import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import {
  catalogKeys,
  fetchMeta,
  fetchProducts,
  fetchRecommendations,
} from "@/entities/catalog";
import { FiltersSheet, type DraftFilters } from "@/features/catalog-filters";
import { track } from "@/features/events";
import { ru } from "@/shared/i18n";
import { usePlatform } from "@/shared/lib/platform";
import { isFresh, storageKeys } from "@/shared/lib/storage-keys";
import { useBackButton } from "@/shared/lib/use-chrome";
import {
  getRouteHome,
  getRouteProduct,
  getRouteSurvey,
} from "@/shared/const/router";
import type { RecommendationQuery } from "@/shared/types/catalog";
import {
  EmptyState,
  ErrorState,
  ProductCard,
  Screen,
  Skeleton,
} from "@/shared/ui";

type CatalogMode = "catalog" | "picks";

type SavedCatalog = DraftFilters & {
  savedAt: number;
  q: string;
  category: string;
  sort: "relevance" | "name" | "brand";
  scrollY: number;
  mode: CatalogMode;
};

const emptyFilters: DraftFilters = {
  brand: "",
  tags: [],
  tagMode: "any",
  strength: "",
  pack: "",
  nicotineType: "",
};

export function CatalogView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const platform = usePlatform();
  const meta = useQuery({ queryKey: catalogKeys.meta, queryFn: fetchMeta });
  const [ready, setReady] = useState(false);
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [category, setCategory] = useState("");
  const [sort, setSort] = useState<SavedCatalog["sort"]>("name");
  const [filters, setFilters] = useState<DraftFilters>(emptyFilters);
  const [draft, setDraft] = useState<DraftFilters>(emptyFilters);
  const [sheet, setSheet] = useState(false);
  const [mode, setMode] = useState<CatalogMode>("catalog");
  const [picks, setPicks] = useState<RecommendationQuery | null>(null);
  const trackedSearch = useRef("");
  const sentinel = useRef<HTMLDivElement | null>(null);

  useBackButton({
    visible: true,
    onClick: () => router.push(getRouteHome()),
  });

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQ(q.trim()), 300);
    return () => clearTimeout(timer);
  }, [q]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const raw = await platform.storage.get(storageKeys.catalogState);
      const recommendation = await platform.storage.get(
        storageKeys.recommendation,
      );
      let saved: SavedCatalog | null = null;
      if (raw) {
        try {
          const parsed = JSON.parse(raw) as SavedCatalog;
          if (parsed.savedAt && isFresh(parsed.savedAt)) {
            saved = parsed;
          }
        } catch {
          saved = null;
        }
      }
      const urlQ = searchParams.get("q") ?? "";
      const urlCategory = searchParams.get("category") ?? "";
      const urlMode = searchParams.get("mode");
      if (!cancelled) {
        if (urlQ || urlCategory || urlMode !== "picks") {
          setQ(urlQ);
          setDebouncedQ(urlQ.trim());
          setCategory(urlCategory || saved?.category || "");
          setFilters(
            urlQ || urlCategory
              ? emptyFilters
              : saved
                ? pickFilters(saved)
                : emptyFilters,
          );
          setSort(urlQ ? "relevance" : (saved?.sort ?? "name"));
          setMode("catalog");
        }
        if (urlMode === "picks" && recommendation) {
          try {
            const query = JSON.parse(recommendation) as RecommendationQuery & {
              savedAt?: number;
            };
            if (!query.savedAt || isFresh(query.savedAt)) {
              setPicks(query);
              setMode("picks");
              setCategory(query.category);
            }
          } catch {
            setMode("catalog");
          }
        } else if (saved && !urlQ && !urlCategory) {
          setQ(saved.q);
          setDebouncedQ(saved.q);
          setCategory(saved.category);
          setFilters(pickFilters(saved));
          setSort(saved.sort);
          requestAnimationFrame(() => window.scrollTo(0, saved?.scrollY ?? 0));
        }
        setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [platform.storage, searchParams]);

  const listParams = useMemo(() => {
    const params = new URLSearchParams();
    if (debouncedQ.length >= 2) params.set("q", debouncedQ);
    if (category) params.set("category", category);
    if (filters.brand) params.set("brand", filters.brand);
    if (filters.tags.length) params.set("tags", filters.tags.join(","));
    params.set("tagMode", filters.tagMode);
    if (filters.strength) params.set("strength", filters.strength);
    if (filters.pack) params.set("pack", filters.pack);
    if (filters.nicotineType) params.set("nicotineType", filters.nicotineType);
    params.set("sort", debouncedQ.length >= 2 && sort === "name" ? sort : sort);
    return params;
  }, [debouncedQ, category, filters, sort]);

  const products = useInfiniteQuery({
    queryKey: catalogKeys.products(listParams.toString()),
    enabled: ready && mode === "catalog",
    initialPageParam: "",
    queryFn: ({ pageParam }) => {
      const params = new URLSearchParams(listParams);
      if (pageParam) params.set("cursor", pageParam);
      return fetchProducts(params);
    },
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });

  const recommendations = useInfiniteQuery({
    queryKey: catalogKeys.recommendations(JSON.stringify(picks)),
    enabled: ready && mode === "picks" && Boolean(picks),
    initialPageParam: "",
    queryFn: ({ pageParam }) =>
      fetchRecommendations({
        ...(picks as RecommendationQuery),
        cursor: pageParam || undefined,
      }),
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });

  const active = mode === "picks" ? recommendations : products;
  const items = active.data?.pages.flatMap((page) => page.items) ?? [];
  const total = active.data?.pages[0]?.total ?? 0;

  useEffect(() => {
    if (!ready) return;
    const payload: SavedCatalog = {
      savedAt: Date.now(),
      q,
      category,
      sort,
      scrollY: window.scrollY,
      mode,
      ...filters,
    };
    void platform.storage.set(
      storageKeys.catalogState,
      JSON.stringify(payload),
    );
  }, [ready, q, category, sort, mode, filters, platform.storage]);

  useEffect(() => {
    if (mode !== "catalog" || debouncedQ.length < 2 || !products.data) return;
    if (trackedSearch.current === debouncedQ) return;
    trackedSearch.current = debouncedQ;
    track("search_performed", category || undefined);
    if ((products.data.pages[0]?.total ?? 0) === 0) {
      track("search_empty", category || undefined);
    }
  }, [mode, debouncedQ, products.data, category]);

  useEffect(() => {
    const node = sentinel.current;
    if (!node) return;
    const observer = new IntersectionObserver((entries) => {
      if (
        entries[0]?.isIntersecting &&
        active.hasNextPage &&
        !active.isFetchingNextPage
      ) {
        void active.fetchNextPage();
      }
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [active]);

  const previewParams = useMemo(() => {
    const params = new URLSearchParams(listParams);
    if (draft.brand) params.set("brand", draft.brand);
    else params.delete("brand");
    if (draft.tags.length) params.set("tags", draft.tags.join(","));
    else params.delete("tags");
    params.set("tagMode", draft.tagMode);
    if (draft.strength) params.set("strength", draft.strength);
    else params.delete("strength");
    if (draft.pack) params.set("pack", draft.pack);
    else params.delete("pack");
    if (draft.nicotineType) params.set("nicotineType", draft.nicotineType);
    else params.delete("nicotineType");
    params.set("limit", "1");
    return params;
  }, [listParams, draft]);

  const preview = useQuery({
    queryKey: catalogKeys.products(`preview:${previewParams.toString()}`),
    queryFn: () => fetchProducts(previewParams),
    enabled: sheet && mode === "catalog",
  });

  if (!ready || meta.isLoading) {
    return (
      <Screen>
        <Skeleton className="h-12" />
        <Skeleton className="mt-3 h-24" />
      </Screen>
    );
  }
  if (meta.isError || !meta.data || active.isError) {
    return <ErrorState onRetry={() => void active.refetch()} />;
  }

  return (
    <Screen
      title={mode === "picks" ? ru.catalog.picks : ru.catalog.title}
      testId="catalog"
    >
      <input
        value={q}
        onChange={(event) => {
          setQ(event.target.value);
          if (mode === "picks") setMode("catalog");
        }}
        placeholder={ru.home.searchPlaceholder}
        className="min-h-11 w-full rounded-xl bg-tg-secondary px-3"
      />
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          className="min-h-11 flex-1 rounded-xl bg-tg-secondary"
          onClick={() => {
            setDraft(filters);
            setSheet(true);
          }}
        >
          {ru.catalog.filters}
        </button>
        <select
          aria-label={ru.catalog.sort}
          value={sort}
          className="min-h-11 flex-1 rounded-xl bg-tg-secondary px-2"
          onChange={(event) =>
            setSort(event.target.value as SavedCatalog["sort"])
          }
        >
          <option value="relevance">{ru.catalog.relevance}</option>
          <option value="name">{ru.catalog.byName}</option>
          <option value="brand">{ru.catalog.byBrand}</option>
        </select>
      </div>
      <p className="mt-3 text-sm text-tg-hint">
        {ru.catalog.found}: {total}
      </p>
      {mode === "picks" ? (
        <button
          type="button"
          className="mt-2 min-h-11 text-tg-link"
          onClick={() => router.push(getRouteSurvey())}
        >
          {ru.catalog.changeAnswers}
        </button>
      ) : null}
      {active.isLoading ? <Skeleton className="mt-3 h-24" /> : null}
      {!active.isLoading && items.length === 0 ? (
        <div className="mt-4">
          <EmptyState title={ru.catalog.empty} hint={ru.catalog.emptyHint} />
          <button
            type="button"
            className="mt-3 min-h-11 text-tg-link"
            onClick={() => {
              setFilters(emptyFilters);
              setQ("");
              setDebouncedQ("");
            }}
          >
            {ru.catalog.reset}
          </button>
        </div>
      ) : (
        <div className="mt-3 space-y-2">
          {items.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onOpen={() => {
                platform.haptic.impact();
                track("product_opened", product.categoryCode);
                const payload: SavedCatalog = {
                  savedAt: Date.now(),
                  q,
                  category,
                  sort,
                  scrollY: window.scrollY,
                  mode,
                  ...filters,
                };
                void platform.storage.set(
                  storageKeys.catalogState,
                  JSON.stringify(payload),
                );
                router.push(getRouteProduct(product.id));
              }}
            />
          ))}
        </div>
      )}
      <div ref={sentinel} className="h-8" />
      <FiltersSheet
        open={sheet}
        meta={meta.data}
        category={category}
        draft={draft}
        total={preview.data?.total ?? null}
        onChange={(next) => {
          platform.haptic.selection();
          setDraft(next);
        }}
        onClose={() => setSheet(false)}
        onReset={() => setDraft(emptyFilters)}
        onApply={() => {
          setFilters(draft);
          setMode("catalog");
          setSheet(false);
          track("filters_applied", category || undefined);
        }}
      />
    </Screen>
  );
}

function pickFilters(saved: SavedCatalog): DraftFilters {
  return {
    brand: saved.brand ?? "",
    tags: saved.tags ?? [],
    tagMode: saved.tagMode ?? "any",
    strength: saved.strength ?? "",
    pack: saved.pack ?? "",
    nicotineType: saved.nicotineType ?? "",
  };
}
