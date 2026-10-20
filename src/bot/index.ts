import "dotenv/config";

import { createBot, setMenuButton } from "./create-bot";

async function main() {
  const bot = createBot();
  try {
    await setMenuButton(bot);
  } catch {
    console.error("menu button failed");
  }
  await bot.start();
}

main().catch(() => {
  console.error("bot failed");
  process.exit(1);
});
