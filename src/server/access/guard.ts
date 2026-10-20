import { readAccessMode } from "@/shared/config/flags";
import { verifyAgeToken } from "@/server/access/age-token";
import { validateInitData } from "@/server/access/init-data";
import { takeRateLimit, type RateBucket } from "@/server/access/rate-limit";
import { apiError } from "@/server/http";

const BODY_LIMIT = 65_536;

export type AccessKind = "public" | "age" | "read" | "card" | "events";

const buckets: Record<AccessKind, RateBucket> = {
  public: "read",
  age: "age",
  read: "read",
  card: "card",
  events: "events",
};

export async function authorize(req: Request, kind: AccessKind) {
  const length = Number(req.headers.get("content-length") ?? "0");
  if (Number.isFinite(length) && length > BODY_LIMIT) {
    return apiError(413, "payload_too_large", "Тело запроса слишком большое");
  }

  if (readAccessMode() === "telegram_only" && kind !== "public") {
    const header = req.headers.get("authorization") ?? "";
    const prefix = "tma ";
    if (!header.startsWith(prefix) || header.length <= prefix.length) {
      return apiError(401, "unauthorized", "Нужна подпись Telegram");
    }
    try {
      validateInitData(header.slice(prefix.length));
    } catch {
      return apiError(401, "unauthorized", "Нужна подпись Telegram");
    }
  }

  if (kind === "read" || kind === "card") {
    const token = req.headers.get("x-age-token");
    if (!token || !(await verifyAgeToken(token))) {
      return apiError(403, "age_gate_required", "Нужно подтверждение возраста");
    }
  }

  const limit = await takeRateLimit(req, buckets[kind]);
  if (!limit.ok) {
    const status = limit.status;
    return apiError(
      status,
      status === 429 ? "rate_limited" : "rate_limit_unavailable",
      status === 429 ? "Слишком много запросов" : "Лимит временно недоступен",
    );
  }

  return null;
}

export async function readJson(req: Request) {
  const text = await req.text();
  if (text.length > BODY_LIMIT) {
    return {
      error: apiError(413, "payload_too_large", "Тело запроса слишком большое"),
    };
  }
  if (!text) {
    return { json: {} };
  }
  try {
    return { json: JSON.parse(text) as unknown };
  } catch {
    return { error: apiError(400, "invalid_json", "Некорректный JSON") };
  }
}
