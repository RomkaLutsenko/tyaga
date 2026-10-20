import { mkdirSync, writeFileSync } from "node:fs";

import { config as loadEnv } from "dotenv";

loadEnv();

function readArg(name: string, fallback: number) {
  const index = process.argv.indexOf(name);
  if (index !== -1) {
    const value = Number(process.argv[index + 1]);
    if (Number.isFinite(value)) {
      return value;
    }
  }
  return fallback;
}

async function main() {
  const positional = process.argv
    .slice(2)
    .filter((arg) => /^\d+$/.test(arg))
    .map(Number);
  const count = readArg("--count", positional[0] ?? 1000);
  const seed = readArg("--seed", positional[1] ?? 42);
  const { buildMockCatalog, mockRowToCsv } =
    await import("../src/server/catalog/mock-catalog");
  const { toCsv } = await import("../src/server/catalog/csv");
  const { replaceWithMock } = await import("../src/server/catalog/service");
  const written = await replaceWithMock(count, seed);
  mkdirSync("data", { recursive: true });
  writeFileSync(
    "data/mock-catalog.csv",
    toCsv(buildMockCatalog(count, seed).map(mockRowToCsv)),
    "utf8",
  );
  console.log(
    `seeded ${written} rows into the database and data/mock-catalog.csv`,
  );
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "seed failed");
  process.exit(1);
});
