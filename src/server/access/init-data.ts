import { createHmac, timingSafeEqual } from "node:crypto";

import { validate } from "@telegram-apps/init-data-node";

import { initDataMaxAgeHours } from "@/shared/config/flags";

export function validateInitData(initData: string) {
  if (
    process.env.NODE_ENV !== "production" &&
    process.env.ALLOW_MOCK_INIT_DATA === "true" &&
    initData === "mock"
  ) {
    return;
  }

  const token = process.env.BOT_TOKEN;
  if (!token) {
    throw new Error("BOT_TOKEN is required");
  }

  validate(initData, token, {
    expiresIn: initDataMaxAgeHours() * 3600,
  });
}

export function signInitData(fields: Record<string, string>, botToken: string) {
  const pairs = Object.entries(fields)
    .filter(([key]) => key !== "hash")
    .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0));
  const dataCheckString = pairs
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");
  const secret = createHmac("sha256", "WebAppData").update(botToken).digest();
  const hash = createHmac("sha256", secret)
    .update(dataCheckString)
    .digest("hex");
  const params = new URLSearchParams({ ...fields, hash });
  return params.toString();
}

export function safeEqual(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  if (a.length !== b.length) {
    return false;
  }
  return timingSafeEqual(a, b);
}
