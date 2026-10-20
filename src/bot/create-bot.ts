import { Bot, InlineKeyboard } from "grammy";

import { ru } from "@/shared/i18n";

export function createBot() {
  const token = process.env.BOT_TOKEN;
  if (!token) {
    throw new Error("BOT_TOKEN is required");
  }
  const bot = new Bot(token);
  const webAppUrl = process.env.WEBAPP_URL;

  bot.command("start", async (ctx) => {
    const keyboard = new InlineKeyboard();
    if (webAppUrl) {
      keyboard.webApp(ru.bot.open, webAppUrl);
    }
    await ctx.reply(
      ru.legal.botStart,
      webAppUrl ? { reply_markup: keyboard } : undefined,
    );
  });

  bot.catch(() => {
    console.error("telegram update failed");
  });

  return bot;
}

export async function setMenuButton(bot: Bot) {
  const webAppUrl = process.env.WEBAPP_URL;
  if (!webAppUrl) {
    return;
  }
  await bot.api.setChatMenuButton({
    menu_button: {
      type: "web_app",
      text: ru.bot.open,
      web_app: { url: webAppUrl },
    },
  });
}
