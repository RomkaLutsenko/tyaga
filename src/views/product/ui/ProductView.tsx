"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";

import { catalogKeys, fetchProduct, fetchSimilar } from "@/entities/catalog";
import { track } from "@/features/events";
import { ru } from "@/shared/i18n";
import { usePlatform } from "@/shared/lib/platform";
import { useBackButton, useMainButton } from "@/shared/lib/use-chrome";
import { getRouteCatalog, getRouteProduct } from "@/shared/const/router";
import { ErrorState, ProductCard, Screen, Skeleton } from "@/shared/ui";

export function ProductView() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const router = useRouter();
  const platform = usePlatform();
  const product = useQuery({
    queryKey: catalogKeys.product(id),
    queryFn: () => fetchProduct(id),
    enabled: Boolean(id),
  });
  const similar = useQuery({
    queryKey: catalogKeys.similar(id),
    queryFn: () => fetchSimilar(id),
    enabled: Boolean(id) && Boolean(product.data),
  });

  useMainButton(null);
  useBackButton({
    visible: true,
    onClick: () => router.push(getRouteCatalog()),
  });

  useEffect(() => {
    platform.haptic.impact();
  }, [platform, id]);

  if (product.isLoading) {
    return (
      <Screen>
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="mt-4 h-28" />
      </Screen>
    );
  }
  if (product.isError || !product.data) {
    return <ErrorState onRetry={() => void product.refetch()} />;
  }

  const item = product.data;
  return (
    <Screen testId="product">
      <p className="text-sm text-tg-hint">{item.brand}</p>
      <h1 className="mt-1 text-xl font-semibold">{item.name}</h1>
      {item.description ? (
        <p className="mt-4 leading-6">{item.description}</p>
      ) : null}
      <div className="mt-4 flex flex-wrap gap-2">
        {item.tags.map((tag) => (
          <span
            key={tag.code}
            className="rounded-full bg-tg-secondary px-3 py-2 text-sm"
          >
            {tag.name}
          </span>
        ))}
      </div>
      <dl className="mt-4 space-y-2">
        {item.specs.map((spec) => (
          <div key={spec.label} className="flex justify-between gap-4 text-sm">
            <dt className="text-tg-hint">{spec.label}</dt>
            <dd>{spec.value}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-6 text-sm leading-6 text-tg-hint">
        {ru.legal.reference}
      </p>
      <h2 className="mt-8 text-lg font-semibold">{ru.product.similar}</h2>
      {similar.isLoading ? <Skeleton className="mt-3 h-20" /> : null}
      {similar.data && similar.data.items.length === 0 ? (
        <p className="mt-2 text-sm text-tg-hint">{ru.product.emptySimilar}</p>
      ) : null}
      <div className="mt-3 space-y-2">
        {similar.data?.items.map((card) => (
          <ProductCard
            key={card.id}
            product={card}
            onOpen={() => {
              track("similar_opened", card.categoryCode);
              platform.haptic.impact();
              router.push(getRouteProduct(card.id));
            }}
          />
        ))}
      </div>
    </Screen>
  );
}
