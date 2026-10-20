import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    env: {
      RATE_LIMIT_DRIVER: "memory",
      AUTH_SECRET: "test-secret-test-secret-test-secret",
      ACCESS_MODE: "open",
      BOT_TOKEN: "123456:TESTTOKEN",
      DATABASE_URL:
        "postgresql://tyaga:tyaga@localhost:5433/tyaga?schema=public",
      CATEGORY_LIQUID_ENABLED: "true",
      CATALOG_IMAGES_ENABLED: "false",
      SHOW_PRICES: "false",
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "server-only": path.resolve(__dirname, "scripts/server-only-stub.ts"),
    },
  },
});
