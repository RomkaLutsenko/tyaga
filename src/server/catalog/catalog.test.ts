import { describe, expect, it } from "vitest";

import { normalizeSearch, searchVariants } from "@/shared/lib/search-text";
import { buildMockCatalog } from "@/server/catalog/mock-catalog";
import { rankProducts } from "@/server/recommendations/rank";
import { ru } from "@/shared/i18n";

describe("search text", () => {
  it("folds yo and swaps keyboard layout", () => {
    expect(normalizeSearch("Ёлка")).toBe("елка");
    expect(searchVariants("z,kjrj")).toContain("яблоко");
  });
});

describe("mock catalog", () => {
  const rows = buildMockCatalog(1000, 42);

  it("is deterministic for the same seed", () => {
    expect(buildMockCatalog(1000, 42)).toEqual(rows);
    expect(buildMockCatalog(1000, 7)).not.toEqual(rows);
  });

  it("contains the requested noise", () => {
    expect(rows).toHaveLength(1000);
    expect(
      rows.filter((row) => row.category === "hookah_tobacco"),
    ).toHaveLength(550);
    expect(rows.filter((row) => row.category === "liquid")).toHaveLength(450);
    expect(rows.filter((row) => row.tags.length === 0)).toHaveLength(50);
    const emptyDescriptions = rows.filter(
      (row) => row.description === "",
    ).length;
    expect(emptyDescriptions).toBeGreaterThan(50);
    expect(emptyDescriptions).toBeLessThan(120);
    expect(rows.every((row) => row.name.length <= 80)).toBe(true);
    expect(rows.some((row) => /[A-Za-z]/.test(row.name))).toBe(true);
    expect(
      rows.some(
        (row) =>
          row.name.includes("ё") ||
          row.name.includes("мёд") ||
          row.brand.includes("Ё"),
      ),
    ).toBe(true);
    expect(rows.some((row) => row.name.includes("-"))).toBe(true);
    const near = rows.filter((row, index) =>
      rows.some(
        (other, otherIndex) =>
          otherIndex !== index &&
          other.brand === row.brand &&
          other.category === row.category &&
          other.packOrVolume !== row.packOrVolume &&
          other.tags.join() === row.tags.join() &&
          other.tags.length > 0,
      ),
    );
    expect(near.length).toBeGreaterThanOrEqual(20);
  });
});

describe("recommendations", () => {
  const products = [
    {
      skuCode: "B",
      tagCodes: ["apple"],
      attributes: { strength: "light", packGrams: "100" },
    },
    {
      skuCode: "A",
      tagCodes: ["apple", "mint"],
      attributes: { strength: "light", packGrams: "100" },
    },
    {
      skuCode: "C",
      tagCodes: [],
      attributes: { strength: "light", packGrams: "100" },
    },
    {
      skuCode: "D",
      tagCodes: ["mint"],
      attributes: { strength: "strong", packGrams: "50" },
    },
  ];

  it("is deterministic and skips products without tags", () => {
    const first = rankProducts(
      products,
      {
        tags: ["apple", "mint"],
        unwantedTags: [],
        attributes: { strength: "light" },
        hardKeys: ["strength"],
      },
      { tagWeight: 1, attributeWeight: 0 },
    );
    const second = rankProducts(
      products,
      {
        tags: ["apple", "mint"],
        unwantedTags: [],
        attributes: { strength: "light" },
        hardKeys: ["strength"],
      },
      { tagWeight: 1, attributeWeight: 0 },
    );
    expect(first.map((item) => item.item.skuCode)).toEqual(["A", "B"]);
    expect(second).toEqual(first);
  });
});

describe("dictionary", () => {
  it("keeps promotional words out of the copy", () => {
    const banned = ["купить", "заказ", "акция", "скидка", "бонус"];
    const entries = flatten(ru);
    for (const [path, value] of entries) {
      const lower = value.toLowerCase();
      for (const word of banned) {
        expect(lower.includes(word), path).toBe(false);
      }
      if (lower.includes("достав") && !path.startsWith("legal.")) {
        throw new Error(path);
      }
    }
  });
});

function flatten(value: unknown, prefix = ""): [string, string][] {
  if (typeof value === "string") {
    return [[prefix, value]];
  }
  if (!value || typeof value !== "object") {
    return [];
  }
  return Object.entries(value).flatMap(([key, item]) =>
    flatten(item, prefix ? `${prefix}.${key}` : key),
  );
}
