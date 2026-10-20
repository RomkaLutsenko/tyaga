import { signAgeToken } from "@/server/access/age-token";
import { apiError, options, withApi } from "@/server/http";

export const POST = withApi("age", async () => {
  try {
    const signed = await signAgeToken();
    return Response.json({
      token: signed.token,
      expiresInHours: signed.expiresInHours,
    });
  } catch {
    return apiError(500, "internal_error", "Внутренняя ошибка");
  }
});

export const OPTIONS = options();
