import type { ProductCard as ProductCardModel } from "@/shared/types/catalog";

export function ProductCard({
  product,
  onOpen,
}: {
  product: ProductCardModel;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      data-testid="product-card"
      onClick={onOpen}
      className="min-h-11 w-full rounded-2xl bg-tg-section px-4 py-3 text-left shadow-sm"
    >
      <p className="font-medium">{product.name}</p>
      <p className="mt-1 text-sm text-tg-hint">{product.brand}</p>
      <div className="mt-2 flex flex-wrap gap-1">
        {product.tags.map((tag) => (
          <span
            key={tag.code}
            className="rounded-full bg-tg-secondary px-2 py-1 text-xs"
          >
            {tag.name}
          </span>
        ))}
      </div>
      <p className="mt-2 text-sm text-tg-hint">
        {product.specs
          .map((spec) => `${spec.label}: ${spec.value}`)
          .join(" · ")}
      </p>
    </button>
  );
}
