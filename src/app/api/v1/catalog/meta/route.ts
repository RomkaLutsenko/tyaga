import { getCatalogMeta } from "@/server/catalog/service";
import { options, withApi } from "@/server/http";

export const GET = withApi("read", async ({ req }) => {
  const { body, etag } = await getCatalogMeta();
  const headers = {
    ETag: etag,
    "Cache-Control": "public, max-age=120",
  };
  if (req.headers.get("if-none-match") === etag) {
    return new Response(null, { status: 304, headers });
  }
  return Response.json(body, { headers });
});

export const OPTIONS = options();
