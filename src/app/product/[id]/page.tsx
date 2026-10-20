import { ProductView } from "@/views/product";
import { staticProductIds } from "@/shared/catalog-static/engine";

export const instant = false;

export function generateStaticParams() {
  if (process.env.GITHUB_PAGES !== "1") {
    return [];
  }
  return staticProductIds().map((id) => ({ id }));
}

export default function Page() {
  return <ProductView />;
}
