import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  getCatalogMeta,
  listProducts,
  replaceWithMock,
} from "@/server/catalog/service";
import { importCatalogRows } from "@/server/catalog/service";
import { rowFromCsv } from "@/server/catalog/schemas";
import { prisma } from "@/server/db";
import { recommendProducts } from "@/server/recommendations/service";

let db = false;

beforeAll(async () => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    db = true;
    await replaceWithMock(80, 42);
  } catch (error) {
    if (process.env.RUN_DB_TESTS === "1") {
      throw error;
    }
    db = false;
  }
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("catalog database", () => {
  it("finds yo, layout and a short typo", async () => {
    if (!db) return;
    await importCatalogRows(
      [
        rowFromCsv({
          sku_code: "TEST-APPLE",
          category: "hookah_tobacco",
          brand: "Альтаир",
          name: "Яблоко",
          description: "Вкус: яблоко. Крепость: лёгкая. Фасовка: 100 г.",
          tags: "apple",
          strength: "light",
          pack_or_volume: "100",
          nicotine_type: "",
          active: "true",
        }),
        rowFromCsv({
          sku_code: "TEST-TREE",
          category: "hookah_tobacco",
          brand: "Альтаир",
          name: "Ёлка",
          description: "",
          tags: "pine",
          strength: "medium",
          pack_or_volume: "50",
          nicotine_type: "",
          active: "true",
        }),
      ],
      false,
    );

    const direct = await listProducts({
      q: "яблоко",
      tags: [],
      tagMode: "any",
      sort: "relevance",
      limit: 20,
    });
    const typo = await listProducts({
      q: "яблако",
      tags: [],
      tagMode: "any",
      sort: "relevance",
      limit: 20,
    });
    const layout = await listProducts({
      q: "z,kjrj",
      tags: [],
      tagMode: "any",
      sort: "relevance",
      limit: 20,
    });
    const yo = await listProducts({
      q: "елка",
      tags: [],
      tagMode: "any",
      sort: "relevance",
      limit: 20,
    });
    expect(direct.items.some((item) => item.skuCode === "TEST-APPLE")).toBe(
      true,
    );
    expect(typo.items.some((item) => item.skuCode === "TEST-APPLE")).toBe(true);
    expect(layout.items.some((item) => item.skuCode === "TEST-APPLE")).toBe(
      true,
    );
    expect(yo.items.some((item) => item.skuCode === "TEST-TREE")).toBe(true);
  });

  it("counts filters and hides liquids when the flag is off", async () => {
    if (!db) return;
    const meta = await getCatalogMeta();
    const tobacco = meta.body.categories.find(
      (item) => item.code === "hookah_tobacco",
    );
    const strength = tobacco?.fields.find((field) => field.key === "strength");
    const light = strength?.options.find((option) => option.value === "light");
    const listed = await listProducts({
      category: "hookah_tobacco",
      strength: "light",
      tags: [],
      tagMode: "any",
      sort: "name",
      limit: 50,
    });
    expect(light?.count).toBeGreaterThan(0);
    expect(listed.total).toBe(light?.count);

    process.env.CATEGORY_LIQUID_ENABLED = "false";
    const hidden = await listProducts({
      category: "liquid",
      tags: [],
      tagMode: "any",
      sort: "name",
      limit: 20,
    });
    expect(hidden.total).toBe(0);
    process.env.CATEGORY_LIQUID_ENABLED = "true";
  });

  it("keeps untagged products out of recommendations", async () => {
    if (!db) return;
    const result = await recommendProducts({
      category: "hookah_tobacco",
      tags: ["apple"],
      unwantedTags: [],
      attributes: { strength: "light", packGrams: "100" },
      limit: 50,
    });
    expect(result.items.every((item) => item.tags.length > 0)).toBe(true);
    const again = await recommendProducts({
      category: "hookah_tobacco",
      tags: ["apple"],
      unwantedTags: [],
      attributes: { strength: "light", packGrams: "100" },
      limit: 50,
    });
    expect(again.items.map((item) => item.skuCode)).toEqual(
      result.items.map((item) => item.skuCode),
    );
  });
});
