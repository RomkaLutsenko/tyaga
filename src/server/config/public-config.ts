import { z } from "zod";

import {
  ageGateCooldownHours,
  ageTokenTtlHours,
  catalogImagesEnabled,
  liquidEnabled,
  readAccessMode,
  showPrices,
} from "@/shared/config/flags";
import { APP_VERSION } from "@/shared/config/version";
import type { PublicConfig } from "@/shared/types/catalog";

export function publicConfig(): PublicConfig {
  return {
    accessMode: readAccessMode(),
    appVersion: APP_VERSION,
    flags: {
      liquidEnabled: liquidEnabled(),
      catalogImagesEnabled: catalogImagesEnabled(),
      showPrices: showPrices(),
      ageGateCooldownHours: ageGateCooldownHours(),
      ageTokenTtlHours: ageTokenTtlHours(),
    },
  };
}

export const EVENT_NAMES = [
  "age_gate_passed",
  "age_gate_declined",
  "survey_started",
  "survey_completed",
  "search_performed",
  "search_empty",
  "filters_applied",
  "product_opened",
  "similar_opened",
] as const;

const gateEvents = new Set(["age_gate_passed", "age_gate_declined"]);

export const eventsSchema = z.object({
  events: z
    .array(
      z.object({
        event: z.enum(EVENT_NAMES),
        category: z.string().max(64).optional(),
        platform: z.enum(["telegram", "web"]),
      }),
    )
    .min(1)
    .max(20),
});

export function eventsNeedAgeToken(events: { event: string }[]) {
  return events.some((item) => !gateEvents.has(item.event));
}
