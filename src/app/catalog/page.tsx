import { Suspense } from "react";

export const instant = false;

import { CatalogView } from "@/views/catalog";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <CatalogView />
    </Suspense>
  );
}
