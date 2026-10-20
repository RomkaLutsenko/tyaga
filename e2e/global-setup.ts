import { execSync } from "node:child_process";

export default function globalSetup() {
  execSync("npx tsx scripts/catalog-seed-mock.ts --count 40 --seed 42", {
    stdio: "inherit",
    env: process.env,
  });
}
