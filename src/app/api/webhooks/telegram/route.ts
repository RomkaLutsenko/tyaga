import { webhookCallback } from "grammy";

import { safeEqual } from "@/server/access/init-data";
import { createBot } from "@/bot/create-bot";
import { apiError } from "@/server/http";

export async function POST(req: Request) {
  const expected = process.env.TELEGRAM_WEBHOOK_SECRET ?? "";
  const received = req.headers.get("x-telegram-bot-api-secret-token") ?? "";
  if (!expected || !safeEqual(received, expected)) {
    return apiError(401, "unauthorized", "Неверный секрет вебхука");
  }
  try {
    const bot = createBot();
    const handler = webhookCallback(bot, "std/http");
    return handler(req);
  } catch {
    console.error("telegram webhook failed");
    return apiError(500, "internal_error", "Внутренняя ошибка");
  }
}
