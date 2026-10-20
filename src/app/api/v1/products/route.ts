import { listProducts } from "@/server/catalog/service";
import { productQuerySchema } from "@/server/catalog/schemas";
import { options, withApi } from "@/server/http";

export const GET = withApi("read", async ({ req }) => {
  const url = new URL(req.url);
  const tags = url.searchParams.get("tags");
  const query = productQuerySchema.parse({
    q: url.searchParams.get("q") ?? undefined,
    category: url.searchParams.get("category") ?? undefined,
    brand: url.searchParams.get("brand") ?? undefined,
    tags: tags ? tags.split(",").filter(Boolean) : [],
    tagMode: url.searchParams.get("tagMode") ?? undefined,
    strength: url.searchParams.get("strength") ?? undefined,
    pack: url.searchParams.get("pack") ?? undefined,
    nicotineType: url.searchParams.get("nicotineType") ?? undefined,
    sort: url.searchParams.get("sort") ?? undefined,
    cursor: url.searchParams.get("cursor") ?? undefined,
    limit: url.searchParams.get("limit") ?? undefined,
  });
  return Response.json(await listProducts(query));
});

export const OPTIONS = options();
