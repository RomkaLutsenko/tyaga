import { config as loadEnv } from "dotenv";

loadEnv();

async function main() {
  const { signAgeToken } = await import("../src/server/access/age-token");
  const base = process.env.BENCH_URL ?? "http://localhost:3000";
  const { token } = await signAgeToken();
  const samples: number[] = [];

  for (let index = 0; index < 30; index += 1) {
    const started = performance.now();
    const response = await fetch(`${base}/v1/products?limit=20&sort=name`, {
      headers: { "X-Age-Token": token, Accept: "application/json" },
    });
    if (!response.ok) {
      console.error(`request failed: ${response.status}`);
      process.exit(1);
    }
    await response.json();
    samples.push(performance.now() - started);
  }

  samples.sort((left, right) => left - right);
  const p95 =
    samples[
      Math.min(samples.length - 1, Math.ceil(samples.length * 0.95) - 1)
    ] ?? 0;
  console.log(
    JSON.stringify({ samples: samples.length, p95Ms: Math.round(p95) }),
  );
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "bench failed");
  process.exit(1);
});
