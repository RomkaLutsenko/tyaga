import { connection, NextResponse } from "next/server";
import { ZodError } from "zod";

import { authorize, readJson, type AccessKind } from "@/server/access/guard";

type Handler = (input: {
  req: Request;
  body: unknown;
  params: Record<string, string>;
}) => Promise<Response>;

export function apiError(
  status: number,
  code: string,
  message: string,
  details: unknown = null,
) {
  return NextResponse.json({ code, message, details }, { status });
}

function applyCors(req: Request, response: Response) {
  const origin = req.headers.get("origin");
  const allowed = (process.env.CORS_ORIGINS ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  if (origin && allowed.includes(origin)) {
    response.headers.set("Access-Control-Allow-Origin", origin);
    response.headers.set("Vary", "Origin");
    response.headers.set(
      "Access-Control-Allow-Headers",
      "Authorization, Content-Type, X-Age-Token",
    );
    response.headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  }
  return response;
}

export function withApi(kind: AccessKind, handler: Handler) {
  return async function route(
    req: Request,
    context?: { params?: Promise<Record<string, string>> },
  ) {
    await connection();
    const denied = await authorize(req, kind);
    if (denied) {
      return applyCors(req, denied);
    }

    let body: unknown = {};
    if (req.method !== "GET" && req.method !== "HEAD") {
      const parsed = await readJson(req);
      if (parsed.error) {
        return applyCors(req, parsed.error);
      }
      body = parsed.json;
    }

    const params = context?.params ? await context.params : {};
    try {
      const response = await handler({ req, body, params });
      return applyCors(req, response);
    } catch (error) {
      if (error instanceof ZodError) {
        return applyCors(
          req,
          apiError(
            400,
            "invalid_input",
            "Некорректные данные",
            error.issues.map((issue) => issue.message),
          ),
        );
      }
      console.error("request failed");
      return applyCors(
        req,
        apiError(500, "internal_error", "Внутренняя ошибка"),
      );
    }
  };
}

export function options() {
  return async function preflight(req: Request) {
    return applyCors(req, new NextResponse(null, { status: 204 }));
  };
}
