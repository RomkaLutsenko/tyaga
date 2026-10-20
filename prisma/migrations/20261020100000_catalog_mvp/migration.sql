-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "categories" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "attribute_schema" JSONB NOT NULL,
    "weights" JSONB NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "brands" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "name_normalized" TEXT NOT NULL,
    "category_id" TEXT NOT NULL,

    CONSTRAINT "brands_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL,
    "sku_code" TEXT NOT NULL,
    "category_id" TEXT NOT NULL,
    "brand_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "name_normalized" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "attributes" JSONB NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tags" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "group" TEXT NOT NULL,

    CONSTRAINT "tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_tags" (
    "product_id" TEXT NOT NULL,
    "tag_id" TEXT NOT NULL,

    CONSTRAINT "product_tags_pkey" PRIMARY KEY ("product_id","tag_id")
);

-- CreateTable
CREATE TABLE "event_counters" (
    "date" DATE NOT NULL,
    "event" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT '',
    "platform" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "event_counters_pkey" PRIMARY KEY ("date","event","category","platform")
);

-- CreateIndex
CREATE UNIQUE INDEX "categories_code_key" ON "categories"("code");

-- CreateIndex
CREATE UNIQUE INDEX "brands_category_id_name_key" ON "brands"("category_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "products_sku_code_key" ON "products"("sku_code");

-- CreateIndex
CREATE INDEX "products_category_id_brand_id_idx" ON "products"("category_id", "brand_id");

-- CreateIndex
CREATE UNIQUE INDEX "tags_code_key" ON "tags"("code");

-- CreateIndex
CREATE INDEX "product_tags_tag_id_idx" ON "product_tags"("tag_id");

-- AddForeignKey
ALTER TABLE "brands" ADD CONSTRAINT "brands_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "products" ADD CONSTRAINT "products_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "products" ADD CONSTRAINT "products_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "product_tags" ADD CONSTRAINT "product_tags_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "product_tags" ADD CONSTRAINT "product_tags_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS fuzzystrmatch;

ALTER TABLE "products" ADD COLUMN "search_vector" tsvector;

CREATE INDEX "products_search_idx" ON "products" USING gin ("search_vector");
CREATE INDEX "products_name_trgm_idx" ON "products" USING gin ("name_normalized" gin_trgm_ops);
CREATE INDEX "brands_name_trgm_idx" ON "brands" USING gin ("name_normalized" gin_trgm_ops);
