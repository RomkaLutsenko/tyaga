import { describe, expect, it } from "vitest";

import {
  staticMeta,
  staticProduct,
  staticProducts,
  staticRecommendations,
} from "./engine";

describe("static catalog", () => {
  it("builds the same thousand rows and finds a flavor", () => {
    const all = staticProducts(new URLSearchParams({ limit: "1" }));
    expect(all.total).toBe(1000);

    const apple = staticProducts(
      new URLSearchParams({ q: "яблоко", limit: "5" }),
    );
    expect(apple.total).toBeGreaterThan(0);
    expect(apple.items[0]?.name.toLowerCase()).toContain("яблок");

    const swapped = staticProducts(
      new URLSearchParams({ q: "z,kjrj", limit: "5" }),
    );
    expect(swapped.total).toBe(apple.total);
  });

  it("serves a card and a recommendation page", () => {
    const meta = staticMeta();
    expect(meta.categories.map((item) => item.code)).toEqual([
      "hookah_tobacco",
      "liquid",
    ]);

    const card = staticProduct("HT-00002");
    expect(card?.skuCode).toBe("HT-00002");

    const picks = staticRecommendations({
      category: "hookah_tobacco",
      tags: ["apple"],
      unwantedTags: [],
      attributes: { strength: "light", packGrams: "100" },
      limit: 10,
    });
    expect(picks.items.length).toBeGreaterThan(0);
    expect(
      picks.items.every((item) => item.categoryCode === "hookah_tobacco"),
    ).toBe(true);
  });
});
