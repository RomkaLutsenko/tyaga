import { normalizeSearch } from "@/shared/lib/search-text";
import type { CsvRow } from "@/server/catalog/csv";
import {
  CATEGORIES,
  LIQUID_BRANDS,
  TAGS,
  TOBACCO_BRANDS,
  categoryByCode,
} from "@/server/catalog/taxonomy";

export type MockRow = {
  skuCode: string;
  category: string;
  brand: string;
  name: string;
  description: string;
  tags: string[];
  strength: string;
  packOrVolume: string;
  nicotineType: string;
  active: boolean;
};

function mulberry32(seed: number) {
  let state = seed >>> 0;
  return function next() {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(rng: () => number, items: readonly T[]): T {
  const index = Math.min(items.length - 1, Math.floor(rng() * items.length));
  return items[index] as T;
}

function pad(value: number) {
  return String(value).padStart(5, "0");
}

export function buildMockCatalog(count = 1000, seed = 42): MockRow[] {
  const rng = mulberry32(seed);
  const tobaccoCount = Math.round(count * 0.55);
  const rows: MockRow[] = [];
  const tagCodes = TAGS.map((tag) => tag[0]);

  for (let index = 0; index < count; index += 1) {
    const category = index < tobaccoCount ? "hookah_tobacco" : "liquid";
    const definition = categoryByCode(category);
    if (!definition) {
      throw new Error("unknown category");
    }
    const brands =
      category === "hookah_tobacco" ? TOBACCO_BRANDS : LIQUID_BRANDS;
    const brand = pick(rng, brands);
    const tagCount = category === "hookah_tobacco" ? 3 : rng() < 0.5 ? 2 : 3;
    const tags: string[] = [];
    while (tags.length < tagCount) {
      const code = pick(rng, tagCodes);
      if (!tags.includes(code)) {
        tags.push(code);
      }
    }
    tags.sort();

    const strengthField = definition.fields.find(
      (field) => field.filterParam === "strength",
    );
    const packField = definition.fields.find(
      (field) => field.filterParam === "pack",
    );
    const typeField = definition.fields.find(
      (field) => field.filterParam === "nicotineType",
    );
    const strength = pick(
      rng,
      strengthField?.options ?? [{ value: "", label: "" }],
    ).value;
    const packOrVolume = pick(
      rng,
      packField?.options ?? [{ value: "", label: "" }],
    ).value;
    const nicotineType = typeField ? pick(rng, typeField.options).value : "";

    const flavorNames = tags
      .map((code) => TAGS.find((tag) => tag[0] === code)?.[1] ?? code)
      .slice(0, 3);
    let name = `${brand} ${flavorNames.join(" ")}`;
    if (index % 7 === 0) {
      name = `${name} ягодно-мятный`;
    }
    if (index % 9 === 0) {
      name = `${name} Line`;
    }
    if (index % 11 === 0) {
      name = `${name} мёд`;
    }
    name = name.slice(0, 80);

    const strengthLabel =
      strengthField?.options.find((option) => option.value === strength)
        ?.label ?? strength;
    const packLabel =
      packField?.options.find((option) => option.value === packOrVolume)
        ?.label ?? packOrVolume;
    const description =
      category === "hookah_tobacco"
        ? `Вкус: ${flavorNames.join(", ")}. Крепость: ${strengthLabel.toLowerCase()}. Фасовка: ${packLabel}.`
        : `Вкус: ${flavorNames.join(", ")}. Крепость никотина: ${strengthLabel}. Объём: ${packLabel}.`;

    const prefix = category === "hookah_tobacco" ? "HT" : "LQ";
    rows.push({
      skuCode: `${prefix}-${pad(index + 1)}`,
      category,
      brand,
      name,
      description,
      tags,
      strength,
      packOrVolume,
      nicotineType,
      active: true,
    });
  }

  for (let index = 49; index < rows.length; index += 50) {
    const source = rows[index - 1];
    const current = rows[index];
    if (!source || !current || source.category !== current.category) {
      continue;
    }
    const definition = categoryByCode(current.category);
    const packField = definition?.fields.find(
      (field) => field.filterParam === "pack",
    );
    const alternative = packField?.options.find(
      (option) => option.value !== source.packOrVolume,
    );
    current.brand = source.brand;
    current.tags = [...source.tags];
    current.strength = source.strength;
    current.nicotineType = source.nicotineType;
    current.packOrVolume = alternative?.value ?? source.packOrVolume;
    current.name = `${source.brand} ${source.tags
      .map((code) => TAGS.find((tag) => tag[0] === code)?.[1] ?? code)
      .join(" ")}`.slice(0, 80);
  }

  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];
    if (!row) {
      continue;
    }
    if (index % 20 === 0) {
      row.tags = [];
      row.description = row.description.replace(
        /^Вкус: .*?\. /,
        "Вкус не указан. ",
      );
    }
    if (rng() < 0.08) {
      row.description = "";
    }
    row.name = row.name.slice(0, 80);
  }

  return rows;
}

export function mockRowToCsv(row: MockRow): CsvRow {
  return {
    sku_code: row.skuCode,
    category: row.category,
    brand: row.brand,
    name: row.name,
    description: row.description,
    tags: row.tags.join(";"),
    strength: row.strength,
    pack_or_volume: row.packOrVolume,
    nicotine_type: row.nicotineType,
    active: row.active ? "true" : "false",
  };
}

export function attributesFromRow(
  row: Pick<MockRow, "category" | "strength" | "packOrVolume" | "nicotineType">,
) {
  if (row.category === "liquid") {
    return {
      nicotineStrength: row.strength,
      nicotineType: row.nicotineType,
      volumeMl: row.packOrVolume,
    };
  }
  return {
    strength: row.strength,
    packGrams: row.packOrVolume,
  };
}

export function normalizedName(name: string) {
  return normalizeSearch(name);
}

export const MOCK_CATEGORY_CODES = CATEGORIES.map((item) => item.code);
