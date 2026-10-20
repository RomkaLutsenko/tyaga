import { recommendationSchema } from "@/server/catalog/schemas";
import { recommendProducts } from "@/server/recommendations/service";
import { options, withApi } from "@/server/http";

export const POST = withApi("read", async ({ body }) => {
  const query = recommendationSchema.parse(body);
  return Response.json(await recommendProducts(query));
});

export const OPTIONS = options();
