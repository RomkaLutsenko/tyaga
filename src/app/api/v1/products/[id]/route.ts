import { getProduct } from "@/server/catalog/service";
import { apiError, options, withApi } from "@/server/http";

export const GET = withApi("card", async ({ params }) => {
  const product = await getProduct(params.id ?? "");
  if (!product) {
    return apiError(404, "not_found", "Товар не найден");
  }
  return Response.json(product);
});

export const OPTIONS = options();
