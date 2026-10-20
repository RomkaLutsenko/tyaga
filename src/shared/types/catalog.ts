export type AccessMode = "open" | "telegram_only";

export type PublicConfig = {
  accessMode: AccessMode;
  appVersion: string;
  flags: {
    liquidEnabled: boolean;
    catalogImagesEnabled: boolean;
    showPrices: boolean;
    ageGateCooldownHours: number;
    ageTokenTtlHours: number;
  };
};

export type FilterParam = "strength" | "pack" | "nicotineType";

export type AttributeOptionDto = {
  value: string;
  label: string;
  count: number;
};

export type AttributeFieldDto = {
  key: string;
  label: string;
  hardFilter: boolean;
  filterParam: FilterParam;
  options: AttributeOptionDto[];
};

export type CategoryDto = {
  code: string;
  name: string;
  fields: AttributeFieldDto[];
};

export type CatalogMeta = {
  categories: CategoryDto[];
  brands: { id: string; name: string; categoryCode: string; count: number }[];
  tags: {
    code: string;
    name: string;
    group: string;
    groupName: string;
    count: number;
  }[];
  groups: { code: string; name: string }[];
  catalogUpdatedAt: string | null;
};

export type ProductSpec = { label: string; value: string };

export type ProductTagDto = { code: string; name: string };

export type ProductCard = {
  id: string;
  skuCode: string;
  name: string;
  brand: string;
  categoryCode: string;
  categoryName: string;
  tags: ProductTagDto[];
  specs: ProductSpec[];
};

export type ProductDetails = ProductCard & {
  description: string;
};

export type ProductList = {
  items: ProductCard[];
  nextCursor: string | null;
  total: number;
};

export type RecommendationQuery = {
  category: string;
  tags: string[];
  unwantedTags: string[];
  attributes: Record<string, string>;
  cursor?: string;
  limit?: number;
};
