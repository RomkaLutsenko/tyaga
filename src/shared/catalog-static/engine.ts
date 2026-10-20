import {
  buildMockCatalog,
  attributesFromRow,
  type MockRow,
} from "@/server/catalog/mock-catalog";
import { rankProducts } from "@/server/recommendations/rank";
import {
  CATEGORIES,
  TAG_GROUPS,
  TAGS,
  categoryByCode,
  tagByCode,
} from "@/server/catalog/taxonomy";
import { APP_VERSION } from "@/shared/config/version";
import { normalizeSearch, searchVariants } from "@/shared/lib/search-text";
import type {
  CatalogMeta,
  ProductCard,
  ProductDetails,
  ProductList,
  PublicConfig,
  RecommendationQuery,
} from "@/shared/types/catalog";

const MOCK_COUNT = 1000;
const MOCK_SEED = 42;

type StaticProduct = {
  row: MockRow;
  attributes: Record<string, string>;
  nameKey: string;
  brandKey: string;
};

let cached: StaticProduct[] | null = null;

function catalog(): StaticProduct[] {
  if (cached) {
    return cached;
  }
  const built = buildMockCatalog(MOCK_COUNT, MOCK_SEED).map((row) => ({
    row,
    attributes: attributesFromRow(row) as unknown as Record<string, string>,
    nameKey: normalizeSearch(row.name),
    brandKey: normalizeSearch(row.brand),
  }));
  cached = built;
  return built;
}

export function staticProductIds() {
  return catalog().map((item) => item.row.skuCode);
}

function brandId(category: string, brand: string) {
  return `${category}::${brand}`;
}

function specs(row: MockRow, attributes: Record<string, string>) {
  const category = categoryByCode(row.category);
  if (!category) {
    return [];
  }
  return category.fields.flatMap((field) => {
    const value = attributes[field.key];
    if (!value) {
      return [];
    }
    const label =
      field.options.find((option) => option.value === value)?.label ?? value;
    return [{ label: field.label, value: label }];
  });
}

function card(item: StaticProduct, tagLimit = 3): ProductCard {
  return {
    id: item.row.skuCode,
    skuCode: item.row.skuCode,
    name: item.row.name,
    brand: item.row.brand,
    categoryCode: item.row.category,
    categoryName: categoryByCode(item.row.category)?.name ?? item.row.category,
    tags: item.row.tags.slice(0, tagLimit).flatMap((code) => {
      const name = tagByCode(code)?.[1];
      return name ? [{ code, name }] : [];
    }),
    specs: specs(item.row, item.attributes),
  };
}

function details(item: StaticProduct): ProductDetails {
  return {
    ...card(item, item.row.tags.length),
    description: item.row.description,
  };
}

function encodeCursor(offset: number) {
  return btoa(JSON.stringify({ offset }));
}

function decodeOffset(raw?: string | null) {
  if (!raw) {
    return 0;
  }
  try {
    const value = JSON.parse(atob(raw)) as { offset?: unknown };
    return typeof value.offset === "number" && value.offset >= 0
      ? value.offset
      : 0;
  } catch {
    return 0;
  }
}

function page(
  items: StaticProduct[],
  cursor: string | null | undefined,
  limit: number,
): ProductList {
  const start = decodeOffset(cursor);
  const slice = items.slice(start, start + limit);
  const next = start + limit;
  return {
    items: slice.map((item) => card(item)),
    total: items.length,
    nextCursor: next < items.length ? encodeCursor(next) : null,
  };
}

function levenshtein(left: string, right: string) {
  if (left === right) {
    return 0;
  }
  if (Math.abs(left.length - right.length) > 2) {
    return 3;
  }
  const prev = Array.from({ length: right.length + 1 }, (_, index) => index);
  const next = Array.from({ length: right.length + 1 }, () => 0);
  for (let i = 1; i <= left.length; i += 1) {
    next[0] = i;
    for (let j = 1; j <= right.length; j += 1) {
      const cost = left.charCodeAt(i - 1) === right.charCodeAt(j - 1) ? 0 : 1;
      next[j] = Math.min(next[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
    }
    for (let j = 0; j <= right.length; j += 1) {
      prev[j] = next[j] ?? 0;
    }
  }
  return prev[right.length] ?? 3;
}

function matchesQuery(item: StaticProduct, variants: string[]) {
  if (variants.length === 0) {
    return true;
  }
  const words = `${item.nameKey} ${item.brandKey}`.split(/\s+/).filter(Boolean);
  return variants.some((variant) => {
    if (item.nameKey.includes(variant) || item.brandKey.includes(variant)) {
      return true;
    }
    const limit = variant.length < 4 ? 1 : 2;
    return words.some(
      (word) =>
        Math.abs(word.length - variant.length) <= 2 &&
        levenshtein(word, variant) <= limit,
    );
  });
}

function readParams(params: URLSearchParams) {
  const tags = params.get("tags");
  const limit = Number(params.get("limit") ?? "20");
  return {
    q: params.get("q") ?? "",
    category: params.get("category") ?? "",
    brand: params.get("brand") ?? "",
    tags: tags ? tags.split(",").filter(Boolean) : [],
    tagMode: params.get("tagMode") === "all" ? "all" : "any",
    strength: params.get("strength") ?? "",
    pack: params.get("pack") ?? "",
    nicotineType: params.get("nicotineType") ?? "",
    sort:
      params.get("sort") === "brand" || params.get("sort") === "relevance"
        ? params.get("sort")
        : "name",
    cursor: params.get("cursor"),
    limit: Number.isFinite(limit) ? Math.min(50, Math.max(1, limit)) : 20,
  };
}

export function staticConfig(): PublicConfig {
  return {
    accessMode: "open",
    appVersion: APP_VERSION,
    flags: {
      liquidEnabled: true,
      catalogImagesEnabled: false,
      showPrices: false,
      ageGateCooldownHours: 24,
      ageTokenTtlHours: 24,
    },
  };
}

export function staticAgeConfirm() {
  return { token: "static-age-ok", expiresInHours: 24 };
}

export function staticMeta(): CatalogMeta {
  const items = catalog();
  return {
    categories: CATEGORIES.map((category) => ({
      code: category.code,
      name: category.name,
      fields: category.fields.map((field) => ({
        key: field.key,
        label: field.label,
        hardFilter: field.hardFilter,
        filterParam: field.filterParam,
        options: field.options.map((option) => ({
          value: option.value,
          label: option.label,
          count: items.filter(
            (item) =>
              item.row.category === category.code &&
              item.attributes[field.key] === option.value,
          ).length,
        })),
      })),
    })),
    brands: countBrands(items),
    tags: TAGS.map(([code, name, group]) => ({
      code,
      name,
      group,
      groupName: TAG_GROUPS.find((item) => item.code === group)?.name ?? group,
      count: items.filter((item) => item.row.tags.includes(code)).length,
    })),
    groups: TAG_GROUPS.map((group) => ({ code: group.code, name: group.name })),
    catalogUpdatedAt: null,
  };
}

function countBrands(items: StaticProduct[]) {
  const counts = new Map<
    string,
    { id: string; name: string; categoryCode: string; count: number }
  >();
  for (const item of items) {
    const id = brandId(item.row.category, item.row.brand);
    const current = counts.get(id);
    if (current) {
      current.count += 1;
    } else {
      counts.set(id, {
        id,
        name: item.row.brand,
        categoryCode: item.row.category,
        count: 1,
      });
    }
  }
  return [...counts.values()].sort((left, right) =>
    left.name.localeCompare(right.name, "ru"),
  );
}

export function staticProducts(params: URLSearchParams): ProductList {
  const query = readParams(params);
  const variants = searchVariants(query.q);
  let items = catalog().filter((item) => {
    if (query.category && item.row.category !== query.category) {
      return false;
    }
    if (
      query.brand &&
      brandId(item.row.category, item.row.brand) !== query.brand
    ) {
      return false;
    }
    if (
      query.strength &&
      item.attributes.strength !== query.strength &&
      item.attributes.nicotineStrength !== query.strength
    ) {
      return false;
    }
    if (
      query.pack &&
      item.attributes.packGrams !== query.pack &&
      item.attributes.volumeMl !== query.pack
    ) {
      return false;
    }
    if (
      query.nicotineType &&
      item.attributes.nicotineType !== query.nicotineType
    ) {
      return false;
    }
    if (query.tags.length > 0) {
      const hit =
        query.tagMode === "all"
          ? query.tags.every((code) => item.row.tags.includes(code))
          : query.tags.some((code) => item.row.tags.includes(code));
      if (!hit) {
        return false;
      }
    }
    return matchesQuery(item, variants);
  });

  if (query.sort === "brand") {
    items = [...items].sort(
      (left, right) =>
        left.row.brand.localeCompare(right.row.brand, "ru") ||
        left.row.name.localeCompare(right.row.name, "ru"),
    );
  } else if (query.sort === "relevance" && variants.length > 0) {
    items = [...items].sort(
      (left, right) =>
        score(right, variants) - score(left, variants) ||
        left.row.name.localeCompare(right.row.name, "ru"),
    );
  } else {
    items = [...items].sort(
      (left, right) =>
        left.row.name.localeCompare(right.row.name, "ru") ||
        left.row.skuCode.localeCompare(right.row.skuCode),
    );
  }

  return page(items, query.cursor, query.limit);
}

function score(item: StaticProduct, variants: string[]) {
  return variants.reduce((best, variant) => {
    if (item.nameKey.includes(variant)) {
      return Math.max(best, 3);
    }
    if (item.brandKey.includes(variant)) {
      return Math.max(best, 2);
    }
    return Math.max(best, 1);
  }, 0);
}

export function staticProduct(id: string): ProductDetails | null {
  const item = catalog().find((entry) => entry.row.skuCode === id);
  return item ? details(item) : null;
}

export function staticSimilar(id: string): ProductDetails[] {
  const current = catalog().find((entry) => entry.row.skuCode === id);
  if (!current || current.row.tags.length === 0) {
    return [];
  }
  const pool = catalog().filter(
    (item) => item.row.category === current.row.category,
  );
  const ranked = rankProducts(
    pool.map((item) => ({
      skuCode: item.row.skuCode,
      tagCodes: item.row.tags,
      attributes: item.attributes,
    })),
    {
      tags: current.row.tags,
      unwantedTags: [],
      attributes: current.attributes,
      hardKeys: [],
    },
    { tagWeight: 1, attributeWeight: 1 },
    { excludeSku: current.row.skuCode, requirePositiveScore: true },
  );
  return ranked.slice(0, 6).flatMap((item) => {
    const match = pool.find((entry) => entry.row.skuCode === item.item.skuCode);
    return match ? [details(match)] : [];
  });
}

export function staticRecommendations(query: RecommendationQuery): ProductList {
  const definition = categoryByCode(query.category);
  if (!definition) {
    return { items: [], nextCursor: null, total: 0 };
  }
  const pool = catalog().filter(
    (item) => item.row.category === query.category && item.row.tags.length > 0,
  );
  const hardKeys = definition.fields
    .filter((field) => field.hardFilter)
    .map((field) => field.key);
  const ranked = rankProducts(
    pool.map((item) => ({
      skuCode: item.row.skuCode,
      tagCodes: item.row.tags,
      attributes: item.attributes,
    })),
    {
      tags: query.tags,
      unwantedTags: query.unwantedTags,
      attributes: query.attributes,
      hardKeys,
    },
    definition.weights,
  );
  const ordered = ranked.flatMap((item) => {
    const match = pool.find((entry) => entry.row.skuCode === item.item.skuCode);
    return match ? [match] : [];
  });
  const limit = query.limit ?? 20;
  return page(ordered, query.cursor, limit);
}
