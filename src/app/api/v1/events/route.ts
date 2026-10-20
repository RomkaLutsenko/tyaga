import { verifyAgeToken } from "@/server/access/age-token";
import {
  eventsNeedAgeToken,
  eventsSchema,
} from "@/server/config/public-config";
import { recordEvents } from "@/server/events/service";
import { apiError, options, withApi } from "@/server/http";

export const POST = withApi("events", async ({ req, body }) => {
  const parsed = eventsSchema.parse(body);
  const token = req.headers.get("x-age-token");
  if (token && !(await verifyAgeToken(token))) {
    return apiError(403, "age_gate_required", "Нужно подтверждение возраста");
  }
  if (eventsNeedAgeToken(parsed.events) && !token) {
    return apiError(403, "age_gate_required", "Нужно подтверждение возраста");
  }
  await recordEvents(parsed.events);
  return Response.json({ ok: true });
});

export const OPTIONS = options();
