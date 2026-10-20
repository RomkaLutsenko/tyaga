import { createHash } from "node:crypto";

import { Prisma } from "@prisma/client";

import { liquidEnabled } from "@/shared/config/flags";
import { searchVariants } from "@/shared/lib/search-text";
import type {
  CatalogMeta,
  ProductCard,
  ProductDetails,
  ProductList,
  ProductSpec,
} from "@/shared/types/catalog";
import { prisma } from "@/server/db";
import {
  attributesForRow,
  catalogRowSchema,
  normalized,
  type CatalogRow,
  type ProductQuery,
} from "@/server/catalog/schemas";
import {
  CATEGORIES,
  LIQUID_BRANDS,
  TAGS,
  TAG_GROUPS,
  TOBACCO_BRANDS,
  categoryByCode,
  groupName,
} from "@/server/catalog/taxonomy";
import {
  attributesFromRow,
  buildMockCatalog,
  normalizedName,
  type MockRow,
} from "@/server/catalog/mock-catalog";

type AttributeMap = Record<string, string>;

type DbProduct = {
  id: string;
  skuCode: string;
  name: string;
  description: string;
  attributes: unknown;
  brand: { name: string };
  category: { code: string; name: string; attributeSchema: unknown };
  tags: { tag: { code: string; name: string } }[];
};

const CARD_FIELDS = [
  "id",
  "skuCode",
  "name",
  "brand",
  "categoryCode",
  "categoryName",
  "tags",
  "specs",
] as const;

export function toProductCard(product: DbProduct, tagLimit = 3): ProductCard {
  const card: ProductCard = {
    id: product.id,
    skuCode: product.skuCode,
    name: product.name,
    brand: product.brand.name,
    categoryCode: product.category.code,
    categoryName: product.category.name,
    tags: product.tags.slice(0, tagLimit).map((item) => ({
      code: item.tag.code,
      name: item.tag.name,
    })),
    specs: specsFrom(product.category.code, asAttributes(product.attributes)),
  };
  for (const key of Object.keys(card)) {
    if (!CARD_FIELDS.includes(key as (typeof CARD_FIELDS)[number])) {
      delete (card as Record<string, unknown>)[key];
    }
  }
  return card;
}

export function toProductDetails(product: DbProduct): ProductDetails {
  return {
    ...toProductCard(product, product.tags.length),
    description: product.description,
  };
}

function asAttributes(value: unknown): AttributeMap {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  const result: AttributeMap = {};
  for (const [key, item] of Object.entries(value)) {
    if (typeof item === "string") {
      result[key] = item;
    } else if (typeof item === "number") {
      result[key] = String(item);
    }
  }
  return result;
}

export function specsFrom(
  categoryCode: string,
  attributes: AttributeMap,
): ProductSpec[] {
  const category = categoryByCode(categoryCode);
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

function categoryFilter() {
  return liquidEnabled()
    ? { enabled: true }
    : { enabled: true, code: { not: "liquid" } };
}

function encodeCursor(payload: object) {
  return Buffer.from(JSON.stringify(payload)).toString("base64url");
}

function decodeCursor(raw?: string) {
  if (!raw) {
    return null;
  }
  try {
    const value = JSON.parse(
      Buffer.from(raw, "base64url").toString("utf8"),
    ) as Record<string, string | number>;
    return value && typeof value === "object" ? value : null;
  } catch {
    return null;
  }
}

function searchWhere(variants: string[]) {
  if (variants.length === 0) {
    return null;
  }
  const parts = variants.flatMap((variant) => {
    const distance = variant.length >= 4 ? 2 : 1;
    return [
      Prisma.sql`p.search_vector @@ plainto_tsquery('russian', ${variant})`,
      Prisma.sql`p.name_normalized % ${variant}`,
      Prisma.sql`b.name_normalized % ${variant}`,
      Prisma.sql`EXISTS (
        SELECT 1 FROM regexp_split_to_table(p.name_normalized, '\\s+') AS word
        WHERE abs(char_length(word) - char_length(${variant})) <= 2
          AND levenshtein(word, ${variant}) <= ${distance}
      )`,
      Prisma.sql`EXISTS (
        SELECT 1 FROM regexp_split_to_table(b.name_normalized, '\\s+') AS word
        WHERE abs(char_length(word) - char_length(${variant})) <= 2
          AND levenshtein(word, ${variant}) <= ${distance}
      )`,
    ];
  });
  return Prisma.sql`(${Prisma.join(parts, " OR ")})`;
}

function filterWhere(query: ProductQuery, variants: string[]) {
  const parts: Prisma.Sql[] = [
    Prisma.sql`p.active = true`,
    Prisma.sql`c.enabled = true`,
  ];
  if (!liquidEnabled()) {
    parts.push(Prisma.sql`c.code <> 'liquid'`);
  }
  if (query.category) {
    parts.push(Prisma.sql`c.code = ${query.category}`);
  }
  if (query.brand) {
    parts.push(Prisma.sql`b.id = ${query.brand}`);
  }
  if (query.strength) {
    parts.push(
      Prisma.sql`(p.attributes->>'strength' = ${query.strength} OR p.attributes->>'nicotineStrength' = ${query.strength})`,
    );
  }
  if (query.pack) {
    parts.push(
      Prisma.sql`(p.attributes->>'packGrams' = ${query.pack} OR p.attributes->>'volumeMl' = ${query.pack})`,
    );
  }
  if (query.nicotineType) {
    parts.push(
      Prisma.sql`p.attributes->>'nicotineType' = ${query.nicotineType}`,
    );
  }
  if (query.tags.length > 0) {
    const codes = Prisma.join(query.tags);
    if (query.tagMode === "all") {
      parts.push(Prisma.sql`(
        SELECT count(DISTINCT t.code)::int
        FROM product_tags pt
        JOIN tags t ON t.id = pt.tag_id
        WHERE pt.product_id = p.id AND t.code IN (${codes})
      ) = ${query.tags.length}`);
    } else {
      parts.push(Prisma.sql`EXISTS (
        SELECT 1 FROM product_tags pt
        JOIN tags t ON t.id = pt.tag_id
        WHERE pt.product_id = p.id AND t.code IN (${codes})
      )`);
    }
  }
  const search = searchWhere(variants);
  if (search) {
    parts.push(search);
  }
  return Prisma.join(parts, " AND ");
}

type ListRow = {
  id: string;
  sku_code: string;
  name: string;
  attributes: AttributeMap;
  brand_name: string;
  category_code: string;
  category_name: string;
  tags: { code: string; name: string }[] | null;
  rank: number;
};

export async function listProducts(query: ProductQuery): Promise<ProductList> {
  const variants =
    query.q && normalizeQuery(query.q).length >= 2
      ? searchVariants(query.q)
      : [];
  const where = filterWhere(query, variants);
  const cursor = decodeCursor(query.cursor);
  const sort = query.sort;
  const limit = query.limit;

  const scoredOrder = scoredOrderSql(sort, variants.length > 0);
  const scoredCursor = scoredCursorSql(sort, variants.length > 0, cursor);
  const rows = await prisma.$queryRaw<ListRow[]>`
    WITH cfg AS (
      SELECT set_config('pg_trgm.similarity_threshold', '0.2', true)
    ),
    scored AS (
      SELECT
        p.id,
        p.sku_code,
        p.name,
        p.name_normalized,
        p.attributes,
        b.name AS brand_name,
        b.name_normalized AS brand_normalized,
        c.code AS category_code,
        c.name AS category_name,
        ${rankExpr(variants)} AS rank
      FROM products p
      JOIN brands b ON b.id = p.brand_id
      JOIN categories c ON c.id = p.category_id
      CROSS JOIN cfg
      WHERE ${where}
    ),
    page AS (
      SELECT * FROM scored
      WHERE ${scoredCursor}
      ORDER BY ${scoredOrder}
      LIMIT ${limit + 1}
    )
    SELECT
      page.id,
      page.sku_code,
      page.name,
      page.attributes,
      page.brand_name,
      page.category_code,
      page.category_name,
      page.rank,
      COALESCE((
        SELECT jsonb_agg(jsonb_build_object('code', t.code, 'name', t.name) ORDER BY t.name)
        FROM product_tags pt
        JOIN tags t ON t.id = pt.tag_id
        WHERE pt.product_id = page.id
      ), '[]'::jsonb) AS tags
    FROM page
    ORDER BY ${scoredOrder}
  `;

  const totalRows = await prisma.$queryRaw<{ total: number }[]>`
    WITH cfg AS (
      SELECT set_config('pg_trgm.similarity_threshold', '0.2', true)
    )
    SELECT count(*)::int AS total
    FROM products p
    JOIN brands b ON b.id = p.brand_id
    JOIN categories c ON c.id = p.category_id
    CROSS JOIN cfg
    WHERE ${where}
  `;

  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;
  const last = page.at(-1);
  const items = page.map((row) =>
    toProductCard({
      id: row.id,
      skuCode: row.sku_code,
      name: row.name,
      description: "",
      attributes: row.attributes,
      brand: { name: row.brand_name },
      category: {
        code: row.category_code,
        name: row.category_name,
        attributeSchema: null,
      },
      tags: (row.tags ?? []).map((tag) => ({ tag })),
    }),
  );

  return {
    items,
    total: totalRows[0]?.total ?? 0,
    nextCursor:
      hasMore && last ? nextCursor(sort, variants.length > 0, last) : null,
  };
}

function normalizeQuery(value: string) {
  return value.trim();
}

function rankExpr(variants: string[]) {
  if (variants.length === 0) {
    return Prisma.sql`0::float8`;
  }
  const parts = variants.flatMap((variant) => [
    Prisma.sql`ts_rank(p.search_vector, plainto_tsquery('russian', ${variant}))`,
    Prisma.sql`similarity(p.name_normalized, ${variant})`,
    Prisma.sql`similarity(b.name_normalized, ${variant})`,
  ]);
  return Prisma.sql`ROUND(GREATEST(${Prisma.join(parts, ", ")})::numeric, 6)::float8`;
}

function scoredOrderSql(
  sort: ProductQuery["sort"],
  hasQuery: boolean,
): Prisma.Sql {
  if (hasQuery && sort === "relevance") {
    return Prisma.sql`rank DESC, sku_code ASC`;
  }
  if (sort === "brand") {
    return Prisma.sql`brand_normalized ASC, name_normalized ASC, id ASC`;
  }
  return Prisma.sql`name_normalized ASC, id ASC`;
}

function scoredCursorSql(
  sort: ProductQuery["sort"],
  hasQuery: boolean,
  cursor: Record<string, string | number> | null,
): Prisma.Sql {
  if (!cursor) {
    return Prisma.sql`TRUE`;
  }
  if (
    hasQuery &&
    sort === "relevance" &&
    cursor.sku &&
    cursor.rank !== undefined
  ) {
    return Prisma.sql`(
      rank < ${Number(cursor.rank)}::float8
      OR (rank = ${Number(cursor.rank)}::float8 AND sku_code > ${String(cursor.sku)})
    )`;
  }
  if (sort === "brand" && cursor.brand && cursor.name && cursor.id) {
    return Prisma.sql`(
      brand_normalized > ${String(cursor.brand)}
      OR (brand_normalized = ${String(cursor.brand)} AND name_normalized > ${String(cursor.name)})
      OR (
        brand_normalized = ${String(cursor.brand)}
        AND name_normalized = ${String(cursor.name)}
        AND id > ${String(cursor.id)}
      )
    )`;
  }
  if (cursor.name && cursor.id) {
    return Prisma.sql`(
      name_normalized > ${String(cursor.name)}
      OR (name_normalized = ${String(cursor.name)} AND id > ${String(cursor.id)})
    )`;
  }
  return Prisma.sql`TRUE`;
}

function nextCursor(
  sort: ProductQuery["sort"],
  hasQuery: boolean,
  row: ListRow,
) {
  if (hasQuery && sort === "relevance") {
    return encodeCursor({ rank: Number(row.rank), sku: row.sku_code });
  }
  if (sort === "brand") {
    return encodeCursor({
      brand: normalized(row.brand_name),
      name: normalized(row.name),
      id: row.id,
    });
  }
  return encodeCursor({ name: normalized(row.name), id: row.id });
}

const productInclude = {
  brand: true,
  category: true,
  tags: { include: { tag: true } },
} as const;

export async function getProduct(id: string) {
  const product = await prisma.product.findFirst({
    where: { id, active: true, category: categoryFilter() },
    include: productInclude,
  });
  return product ? toProductDetails(product) : null;
}

export async function getCatalogMeta(): Promise<{
  body: CatalogMeta;
  etag: string;
}> {
  const products = await prisma.product.findMany({
    where: { active: true, category: categoryFilter() },
    include: productInclude,
  });
  const updated = await prisma.product.aggregate({ _max: { updatedAt: true } });

  const brandCounts = new Map<
    string,
    { id: string; name: string; categoryCode: string; count: number }
  >();
  const tagCounts = new Map<string, number>();

  for (const product of products) {
    const brandKey = product.brandId;
    const current = brandCounts.get(brandKey) ?? {
      id: product.brand.id,
      name: product.brand.name,
      categoryCode: product.category.code,
      count: 0,
    };
    current.count += 1;
    brandCounts.set(brandKey, current);
    for (const link of product.tags) {
      tagCounts.set(link.tag.code, (tagCounts.get(link.tag.code) ?? 0) + 1);
    }
  }

  const categories = CATEGORIES.filter(
    (category) => category.code !== "liquid" || liquidEnabled(),
  ).map((category) => ({
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
        count: products.filter((product) => {
          if (product.category.code !== category.code) {
            return false;
          }
          return asAttributes(product.attributes)[field.key] === option.value;
        }).length,
      })),
    })),
  }));

  const body: CatalogMeta = {
    categories,
    brands: [...brandCounts.values()].sort((left, right) =>
      left.name.localeCompare(right.name, "ru"),
    ),
    tags: TAGS.map(([code, name, group]) => ({
      code,
      name,
      group,
      groupName: groupName(group),
      count: tagCounts.get(code) ?? 0,
    })),
    groups: TAG_GROUPS.map((group) => ({ code: group.code, name: group.name })),
    catalogUpdatedAt: updated._max.updatedAt?.toISOString() ?? null,
  };
  const etag = `"${createHash("sha1").update(JSON.stringify(body)).digest("hex")}"`;
  return { body, etag };
}

export async function refreshSearchVectors() {
  await prisma.$executeRaw`
    UPDATE products AS p
    SET search_vector = to_tsvector('russian', p.name_normalized || ' ' || b.name_normalized)
    FROM brands AS b
    WHERE b.id = p.brand_id
  `;
}

export async function replaceWithMock(count: number, seed: number) {
  const rows = buildMockCatalog(count, seed);
  for (const row of rows) {
    catalogRowSchema.parse(mockToCatalogRow(row));
  }
  await prisma.productTag.deleteMany();
  await prisma.product.deleteMany();
  await prisma.brand.deleteMany();
  await prisma.tag.deleteMany();
  await prisma.category.deleteMany();

  await prisma.category.createMany({
    data: CATEGORIES.map((category) => ({
      code: category.code,
      name: category.name,
      enabled: true,
      attributeSchema: category.fields,
      weights: category.weights,
      sortOrder: category.sortOrder,
    })),
  });
  await prisma.tag.createMany({
    data: TAGS.map(([code, name, group]) => ({ code, name, group })),
  });

  const categories = await prisma.category.findMany();
  const categoryId = new Map(categories.map((item) => [item.code, item.id]));
  const brandRows = [
    ...TOBACCO_BRANDS.map((name) => ({
      name,
      nameNormalized: normalizedName(name),
      categoryId: categoryId.get("hookah_tobacco") ?? "",
    })),
    ...LIQUID_BRANDS.map((name) => ({
      name,
      nameNormalized: normalizedName(name),
      categoryId: categoryId.get("liquid") ?? "",
    })),
  ];
  await prisma.brand.createMany({ data: brandRows });
  const brands = await prisma.brand.findMany();
  const brandId = new Map(
    brands.map((item) => [`${item.categoryId}:${item.name}`, item.id]),
  );
  const tags = await prisma.tag.findMany();
  const tagId = new Map(tags.map((item) => [item.code, item.id]));

  await prisma.product.createMany({
    data: rows.map((row) => ({
      skuCode: row.skuCode,
      categoryId: categoryId.get(row.category) ?? "",
      brandId:
        brandId.get(`${categoryId.get(row.category)}:${row.brand}`) ?? "",
      name: row.name,
      nameNormalized: normalizedName(row.name),
      description: row.description,
      attributes: attributesFromRow(row),
      active: row.active,
    })),
  });

  const products = await prisma.product.findMany({
    select: { id: true, skuCode: true },
  });
  const productId = new Map(products.map((item) => [item.skuCode, item.id]));
  const links: { productId: string; tagId: string }[] = [];
  for (const row of rows) {
    const product = productId.get(row.skuCode);
    if (!product) {
      continue;
    }
    for (const code of row.tags) {
      const tag = tagId.get(code);
      if (tag) {
        links.push({ productId: product, tagId: tag });
      }
    }
  }
  for (let offset = 0; offset < links.length; offset += 1000) {
    await prisma.productTag.createMany({
      data: links.slice(offset, offset + 1000),
    });
  }
  await refreshSearchVectors();
  return rows.length;
}

export type ImportReport = {
  created: number;
  updated: number;
  errors: { line: number; message: string }[];
};

export async function importCatalogRows(
  rows: CatalogRow[],
  createMissing: boolean,
) {
  const report: ImportReport = { created: 0, updated: 0, errors: [] };
  for (let index = 0; index < rows.length; index += 1) {
    const line = index + 2;
    try {
      const outcome = await importOne(
        catalogRowSchema.parse(rows[index]),
        createMissing,
      );
      report[outcome] += 1;
    } catch (error) {
      report.errors.push({
        line,
        message: error instanceof Error ? error.message : "row_failed",
      });
    }
  }
  return report;
}

async function importOne(row: CatalogRow, createMissing: boolean) {
  const category = await prisma.category.findUnique({
    where: { code: row.category },
  });
  if (!category) {
    throw new Error("unknown_category");
  }
  const attributes = attributesForRow(row);
  let brand = await prisma.brand.findUnique({
    where: { categoryId_name: { categoryId: category.id, name: row.brand } },
  });
  if (!brand) {
    if (!createMissing) {
      throw new Error("unknown_brand");
    }
    brand = await prisma.brand.create({
      data: {
        name: row.brand,
        nameNormalized: normalized(row.brand),
        categoryId: category.id,
      },
    });
  }

  const tagIds: string[] = [];
  for (const code of row.tags) {
    let tag = await prisma.tag.findUnique({ where: { code } });
    if (!tag) {
      if (!createMissing) {
        throw new Error(`unknown_tag:${code}`);
      }
      tag = await prisma.tag.create({
        data: { code, name: code, group: "custom" },
      });
    }
    tagIds.push(tag.id);
  }

  const data = {
    categoryId: category.id,
    brandId: brand.id,
    name: row.name,
    nameNormalized: normalized(row.name),
    description: row.description,
    attributes,
    active: row.active,
  };

  const existing = await prisma.product.findUnique({
    where: { skuCode: row.skuCode },
  });
  const product = existing
    ? await prisma.product.update({ where: { skuCode: row.skuCode }, data })
    : await prisma.product.create({ data: { ...data, skuCode: row.skuCode } });

  await prisma.productTag.deleteMany({ where: { productId: product.id } });
  if (tagIds.length > 0) {
    await prisma.productTag.createMany({
      data: tagIds.map((tagId) => ({ productId: product.id, tagId })),
    });
  }
  await prisma.$executeRaw`
    UPDATE products AS p
    SET search_vector = to_tsvector('russian', p.name_normalized || ' ' || b.name_normalized)
    FROM brands AS b
    WHERE b.id = p.brand_id AND p.id = ${product.id}
  `;
  return existing ? "updated" : "created";
}

export function mockToCatalogRow(row: MockRow): CatalogRow {
  return {
    skuCode: row.skuCode,
    category: row.category,
    brand: row.brand,
    name: row.name,
    description: row.description,
    tags: row.tags,
    strength: row.strength,
    packOrVolume: row.packOrVolume,
    nicotineType: row.nicotineType,
    active: row.active,
  };
}
