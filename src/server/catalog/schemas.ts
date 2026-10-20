import { z } from "zod";

import { ProductSchema } from "@/shared/generated/zod";
import { normalizeSearch } from "@/shared/lib/search-text";
import { categoryByCode } from "@/server/catalog/taxonomy";

const persistedProduct = ProductSchema.pick({
  skuCode: true,
  name: true,
  description: true,
  active: true,
});

export const catalogRowSchema = persistedProduct.extend({
  name: z.string().min(1).max(80),
  description: z.string().max(2000),
  category: z.string().min(1).max(64),
  brand: z.string().min(1).max(80),
  tags: z.array(z.string().min(1).max(64)).max(12),
  strength: z.string().max(32),
  packOrVolume: z.string().max(32),
  nicotineType: z.string().max(32),
});

export type CatalogRow = z.infer<typeof catalogRowSchema>;

export const productQuerySchema = z.object({
  q: z.string().max(80).optional(),
  category: z.string().max(64).optional(),
  brand: z.string().max(64).optional(),
  tags: z.array(z.string().max(64)).max(30).default([]),
  tagMode: z.enum(["any", "all"]).default("any"),
  strength: z.string().max(32).optional(),
  pack: z.string().max(32).optional(),
  nicotineType: z.string().max(32).optional(),
  sort: z.enum(["relevance", "name", "brand"]).default("name"),
  cursor: z.string().max(512).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export type ProductQuery = z.infer<typeof productQuerySchema>;

export const recommendationSchema = z.object({
  category: z.string().min(1).max(64),
  tags: z.array(z.string().max(64)).max(30).default([]),
  unwantedTags: z.array(z.string().max(64)).max(30).default([]),
  attributes: z.record(z.string().max(64), z.string().max(64)).default({}),
  cursor: z.string().max(128).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export function attributesForRow(row: CatalogRow) {
  const category = categoryByCode(row.category);
  if (!category) {
    throw new Error("unknown_category");
  }
  const attributes: Record<string, string> = {};
  for (const field of category.fields) {
    const raw =
      field.key === "nicotineType"
        ? row.nicotineType
        : field.filterParam === "pack"
          ? row.packOrVolume
          : row.strength;
    const known = field.options.some((option) => option.value === raw);
    if (!known) {
      throw new Error(`bad_${field.key}`);
    }
    attributes[field.key] = raw;
  }
  return attributes;
}

export function rowFromCsv(record: Record<string, string>) {
  return catalogRowSchema.parse({
    skuCode: record.sku_code?.trim() ?? "",
    category: record.category?.trim() ?? "",
    brand: record.brand?.trim() ?? "",
    name: record.name?.trim() ?? "",
    description: record.description ?? "",
    tags: (record.tags ?? "")
      .split(";")
      .map((tag) => tag.trim())
      .filter(Boolean),
    strength: record.strength?.trim() ?? "",
    packOrVolume: record.pack_or_volume?.trim() ?? "",
    nicotineType: record.nicotine_type?.trim() ?? "",
    active: record.active?.trim().toLowerCase() !== "false",
  });
}

export function normalized(value: string) {
  return normalizeSearch(value);
}
