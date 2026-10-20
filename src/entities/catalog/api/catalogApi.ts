import { apiFetch } from "@/shared/api/client";
import {
  staticAgeConfirm,
  staticConfig,
  staticMeta,
  staticProduct,
  staticProducts,
  staticRecommendations,
  staticSimilar,
} from "@/shared/catalog-static/engine";
import type {
  CatalogMeta,
  ProductDetails,
  ProductList,
  PublicConfig,
  RecommendationQuery,
} from "@/shared/types/catalog";

const staticSite = process.env.NEXT_PUBLIC_STATIC === "1";

export function fetchConfig() {
  if (staticSite) {
    return Promise.resolve(staticConfig());
  }
  return apiFetch<PublicConfig>("/v1/config");
}

export function confirmAge() {
  if (staticSite) {
    return Promise.resolve(staticAgeConfirm());
  }
  return apiFetch<{ token: string; expiresInHours: number }>(
    "/v1/age/confirm",
    {
      method: "POST",
    },
  );
}

export function fetchMeta() {
  if (staticSite) {
    return Promise.resolve(staticMeta());
  }
  return apiFetch<CatalogMeta>("/v1/catalog/meta");
}

export function fetchProducts(params: URLSearchParams) {
  if (staticSite) {
    return Promise.resolve(staticProducts(params));
  }
  const query = params.toString();
  return apiFetch<ProductList>(`/v1/products${query ? `?${query}` : ""}`);
}

export function fetchProduct(id: string) {
  if (staticSite) {
    const product = staticProduct(id);
    if (!product) {
      return Promise.reject(new Error("not_found"));
    }
    return Promise.resolve(product);
  }
  return apiFetch<ProductDetails>(`/v1/products/${id}`);
}

export function fetchSimilar(id: string) {
  if (staticSite) {
    return Promise.resolve({ items: staticSimilar(id) });
  }
  return apiFetch<{ items: ProductDetails[] }>(`/v1/products/${id}/similar`);
}

export function fetchRecommendations(body: RecommendationQuery) {
  if (staticSite) {
    return Promise.resolve(staticRecommendations(body));
  }
  return apiFetch<ProductList>("/v1/recommendations", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function sendEvents(
  events: { event: string; category?: string; platform: "telegram" | "web" }[],
) {
  if (staticSite) {
    return Promise.resolve({ ok: true });
  }
  return apiFetch<{ ok: boolean }>("/v1/events", {
    method: "POST",
    body: JSON.stringify({ events }),
  });
}
