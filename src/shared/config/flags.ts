export type AccessMode = "open" | "telegram_only";

const warned = { access: false };

export function readAccessMode(): AccessMode {
  const raw = process.env.ACCESS_MODE;
  if (raw === "open" || raw === "telegram_only") {
    return raw;
  }
  if (!warned.access) {
    warned.access = true;
    console.warn(
      "ACCESS_MODE is missing or invalid; starting in telegram_only",
    );
  }
  return "telegram_only";
}

export function resetAccessModeWarningForTests() {
  warned.access = false;
}

export function liquidEnabled() {
  return process.env.CATEGORY_LIQUID_ENABLED !== "false";
}

export function catalogImagesEnabled() {
  return process.env.CATALOG_IMAGES_ENABLED === "true";
}

export function showPrices() {
  return process.env.SHOW_PRICES === "true";
}

export function ageGateCooldownHours() {
  return positiveInt(process.env.AGE_GATE_COOLDOWN_HOURS, 24);
}

export function ageTokenTtlHours() {
  return positiveInt(process.env.AGE_TOKEN_TTL_HOURS, 24);
}

export function initDataMaxAgeHours() {
  return positiveInt(process.env.INIT_DATA_MAX_AGE_HOURS, 24);
}

function positiveInt(raw: string | undefined, fallback: number) {
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0) {
    return fallback;
  }
  return Math.floor(value);
}
