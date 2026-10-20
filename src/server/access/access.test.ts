import { afterEach, describe, expect, it } from "vitest";

import { signAgeToken, verifyAgeToken } from "@/server/access/age-token";
import { authorize } from "@/server/access/guard";
import { signInitData } from "@/server/access/init-data";
import { resetRateLimitForTests } from "@/server/access/rate-limit";
import {
  readAccessMode,
  resetAccessModeWarningForTests,
} from "@/shared/config/flags";
import { toProductCard } from "@/server/catalog/service";

const original = { ...process.env };

afterEach(() => {
  process.env.ACCESS_MODE = original.ACCESS_MODE;
  process.env.BOT_TOKEN = original.BOT_TOKEN;
  process.env.AUTH_SECRET = original.AUTH_SECRET;
  resetRateLimitForTests();
  resetAccessModeWarningForTests();
});

describe("access mode", () => {
  it("falls back to telegram_only when the variable is missing", () => {
    delete process.env.ACCESS_MODE;
    expect(readAccessMode()).toBe("telegram_only");
  });

  it("keeps an explicit open mode", () => {
    process.env.ACCESS_MODE = "open";
    expect(readAccessMode()).toBe("open");
  });
});

describe("age token", () => {
  it("signs a token without a subject", async () => {
    const { token } = await signAgeToken();
    const payload = JSON.parse(
      Buffer.from(token.split(".")[1] ?? "", "base64url").toString("utf8"),
    ) as { age_ok?: boolean; sub?: string };
    expect(payload.age_ok).toBe(true);
    expect(payload.sub).toBeUndefined();
    expect(await verifyAgeToken(token)).toBe(true);
  });
});

describe("authorize", () => {
  it("returns 403 without an age token", async () => {
    process.env.ACCESS_MODE = "open";
    const response = await authorize(
      new Request("http://localhost/v1/products"),
      "read",
    );
    expect(response?.status).toBe(403);
  });

  it("does not validate Authorization in open mode", async () => {
    process.env.ACCESS_MODE = "open";
    const { token } = await signAgeToken();
    const response = await authorize(
      new Request("http://localhost/v1/products", {
        headers: { authorization: "tma garbage", "x-age-token": token },
      }),
      "read",
    );
    expect(response).toBeNull();
  });

  it("returns 401 in telegram_only without a signature", async () => {
    process.env.ACCESS_MODE = "telegram_only";
    const response = await authorize(
      new Request("http://localhost/v1/products"),
      "read",
    );
    expect(response?.status).toBe(401);
  });

  it("accepts a valid init data signature", async () => {
    process.env.ACCESS_MODE = "telegram_only";
    process.env.BOT_TOKEN = "123456:TESTTOKEN";
    const initData = signInitData(
      { auth_date: String(Math.floor(Date.now() / 1000)), query_id: "query" },
      process.env.BOT_TOKEN,
    );
    const { token } = await signAgeToken();
    const response = await authorize(
      new Request("http://localhost/v1/products", {
        headers: { authorization: `tma ${initData}`, "x-age-token": token },
      }),
      "read",
    );
    expect(response).toBeNull();
  });
});

describe("product dto", () => {
  it("does not expose prices or images", () => {
    const card = toProductCard({
      id: "1",
      skuCode: "HT-1",
      name: "Яблоко",
      description: "",
      attributes: { strength: "light", packGrams: "100" },
      brand: { name: "Альтаир" },
      category: {
        code: "hookah_tobacco",
        name: "Табак для кальяна",
        attributeSchema: null,
      },
      tags: [{ tag: { code: "apple", name: "Яблоко" } }],
    });
    expect(card).not.toHaveProperty("price");
    expect(card).not.toHaveProperty("image");
    expect(card).not.toHaveProperty("photo");
    expect(Object.keys(card).sort()).toEqual(
      [
        "brand",
        "categoryCode",
        "categoryName",
        "id",
        "name",
        "skuCode",
        "specs",
        "tags",
      ].sort(),
    );
  });
});
