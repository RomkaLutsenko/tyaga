import { liquidEnabled } from "@/shared/config/flags";
import type {
  ProductCard,
  ProductList,
  RecommendationQuery,
} from "@/shared/types/catalog";
import { prisma } from "@/server/db";
import { categoryByCode } from "@/server/catalog/taxonomy";
import { toProductCard } from "@/server/catalog/service";
import { rankProducts } from "@/server/recommendations/rank";

const include = {
  brand: true,
  category: true,
  tags: { include: { tag: true } },
} as const;

function empty(): ProductList {
  return { items: [], nextCursor: null, total: 0 };
}

export async function recommendProducts(
  query: RecommendationQuery,
): Promise<ProductList> {
  if (query.category === "liquid" && !liquidEnabled()) {
    return empty();
  }
  const definition = categoryByCode(query.category);
  const category = await prisma.category.findUnique({
    where: { code: query.category },
  });
  if (!definition || !category?.enabled) {
    return empty();
  }

  const weights = readWeights(category.weights);
  const products = await prisma.product.findMany({
    where: { active: true, categoryId: category.id, tags: { some: {} } },
    include,
  });
  const hardKeys = definition.fields
    .filter((field) => field.hardFilter)
    .map((field) => field.key);
  const ranked = rankProducts(
    products.map((product) => ({
      skuCode: product.skuCode,
      tagCodes: product.tags.map((item) => item.tag.code),
      attributes: stringAttributes(product.attributes),
    })),
    {
      tags: query.tags,
      unwantedTags: query.unwantedTags,
      attributes: query.attributes,
      hardKeys,
    },
    { tagWeight: weights.tagWeight, attributeWeight: weights.attributeWeight },
  );

  return pageCards(
    products,
    ranked.map((item) => item.item.skuCode),
    query.cursor,
    query.limit ?? 20,
  );
}

export async function similarProducts(id: string): Promise<ProductCard[]> {
  const product = await prisma.product.findFirst({
    where: {
      id,
      active: true,
      category: liquidEnabled()
        ? { enabled: true }
        : { enabled: true, code: { not: "liquid" } },
    },
    include,
  });
  if (!product || product.tags.length === 0) {
    return [];
  }
  const pool = await prisma.product.findMany({
    where: { active: true, categoryId: product.categoryId, tags: { some: {} } },
    include,
  });
  const ranked = rankProducts(
    pool.map((item) => ({
      skuCode: item.skuCode,
      tagCodes: item.tags.map((link) => link.tag.code),
      attributes: stringAttributes(item.attributes),
    })),
    {
      tags: product.tags.map((link) => link.tag.code),
      unwantedTags: [],
      attributes: stringAttributes(product.attributes),
      hardKeys: [],
    },
    { tagWeight: 1, attributeWeight: 1 },
    { excludeSku: product.skuCode, requirePositiveScore: true },
  );
  const bySku = new Map(pool.map((item) => [item.skuCode, item]));
  return ranked.slice(0, 6).flatMap((item) => {
    const match = bySku.get(item.item.skuCode);
    return match ? [toProductCard(match)] : [];
  });
}

function pageCards(
  products: {
    skuCode: string;
    id: string;
    name: string;
    description: string;
    attributes: unknown;
    brand: { name: string };
    category: { code: string; name: string; attributeSchema: unknown };
    tags: { tag: { code: string; name: string } }[];
  }[],
  skuOrder: string[],
  cursor: string | undefined,
  limit: number,
): ProductList {
  const start = cursor ? skuOrder.indexOf(cursor) + 1 : 0;
  const slice = skuOrder.slice(Math.max(start, 0), Math.max(start, 0) + limit);
  const bySku = new Map(products.map((item) => [item.skuCode, item]));
  const items = slice.flatMap((sku) => {
    const product = bySku.get(sku);
    return product ? [toProductCard(product)] : [];
  });
  const last = slice.at(-1);
  const nextIndex = Math.max(start, 0) + limit;
  return {
    items,
    total: skuOrder.length,
    nextCursor: nextIndex < skuOrder.length && last ? last : null,
  };
}

function readWeights(value: unknown) {
  if (!value || typeof value !== "object") {
    return { tagWeight: 1, attributeWeight: 0 };
  }
  const record = value as { tagWeight?: unknown; attributeWeight?: unknown };
  return {
    tagWeight: typeof record.tagWeight === "number" ? record.tagWeight : 1,
    attributeWeight:
      typeof record.attributeWeight === "number" ? record.attributeWeight : 0,
  };
}

function stringAttributes(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  const result: Record<string, string> = {};
  for (const [key, item] of Object.entries(value)) {
    if (typeof item === "string") {
      result[key] = item;
    }
  }
  return result;
}
