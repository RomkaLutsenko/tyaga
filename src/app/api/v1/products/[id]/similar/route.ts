import { similarProducts } from "@/server/recommendations/service";
import { options, withApi } from "@/server/http";

export const GET = withApi("read", async ({ params }) => {
  return Response.json({ items: await similarProducts(params.id ?? "") });
});

export const OPTIONS = options();
