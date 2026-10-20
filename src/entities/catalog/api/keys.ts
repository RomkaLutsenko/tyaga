export const catalogKeys = {
  config: ["config"] as const,
  meta: ["catalog", "meta"] as const,
  products: (params: string) => ["products", params] as const,
  product: (id: string) => ["product", id] as const,
  similar: (id: string) => ["product", id, "similar"] as const,
  recommendations: (body: string) => ["recommendations", body] as const,
};
