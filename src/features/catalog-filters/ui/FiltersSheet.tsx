"use client";

import { useMemo, useState } from "react";

import { ru } from "@/shared/i18n";
import type { CatalogMeta } from "@/shared/types/catalog";
import { BottomSheet } from "@/shared/ui";

export type DraftFilters = {
  brand: string;
  tags: string[];
  tagMode: "any" | "all";
  strength: string;
  pack: string;
  nicotineType: string;
};

export function FiltersSheet({
  open,
  meta,
  category,
  draft,
  total,
  onChange,
  onClose,
  onApply,
  onReset,
}: {
  open: boolean;
  meta: CatalogMeta;
  category: string;
  draft: DraftFilters;
  total: number | null;
  onChange: (next: DraftFilters) => void;
  onClose: () => void;
  onApply: () => void;
  onReset: () => void;
}) {
  const [brandQuery, setBrandQuery] = useState("");
  const categoryDto =
    meta.categories.find((item) => item.code === category) ??
    meta.categories[0];
  const brands = useMemo(
    () =>
      meta.brands.filter((brand) => {
        if (category && brand.categoryCode !== category) {
          return false;
        }
        return brand.name
          .toLowerCase()
          .includes(brandQuery.trim().toLowerCase());
      }),
    [meta.brands, category, brandQuery],
  );

  function toggleTag(code: string) {
    const tags = draft.tags.includes(code)
      ? draft.tags.filter((item) => item !== code)
      : [...draft.tags, code];
    onChange({ ...draft, tags });
  }

  return (
    <BottomSheet open={open} title={ru.catalog.filters} onClose={onClose}>
      <label className="block text-sm text-tg-hint">{ru.catalog.brand}</label>
      <input
        value={brandQuery}
        onChange={(event) => setBrandQuery(event.target.value)}
        placeholder={ru.catalog.brandSearch}
        className="mt-1 min-h-11 w-full rounded-xl bg-tg-secondary px-3"
      />
      <div className="mt-2 flex max-h-36 flex-wrap gap-2 overflow-auto">
        {brands.map((brand) => (
          <button
            key={brand.id}
            type="button"
            className={`min-h-11 rounded-full px-3 ${draft.brand === brand.id ? "bg-tg-button text-tg-button-text" : "bg-tg-secondary"}`}
            onClick={() =>
              onChange({
                ...draft,
                brand: draft.brand === brand.id ? "" : brand.id,
              })
            }
          >
            {brand.name}
          </button>
        ))}
      </div>
      <div className="mt-4 flex gap-2">
        <button
          type="button"
          className={`min-h-11 flex-1 rounded-xl ${draft.tagMode === "any" ? "bg-tg-button text-tg-button-text" : "bg-tg-secondary"}`}
          onClick={() => onChange({ ...draft, tagMode: "any" })}
        >
          {ru.catalog.tagAny}
        </button>
        <button
          type="button"
          className={`min-h-11 flex-1 rounded-xl ${draft.tagMode === "all" ? "bg-tg-button text-tg-button-text" : "bg-tg-secondary"}`}
          onClick={() => onChange({ ...draft, tagMode: "all" })}
        >
          {ru.catalog.tagAll}
        </button>
      </div>
      <p className="mt-4 text-sm text-tg-hint">{ru.catalog.tags}</p>
      {meta.groups.map((group) => {
        const tags = meta.tags.filter((tag) => tag.group === group.code);
        if (tags.length === 0) {
          return null;
        }
        return (
          <div key={group.code} className="mt-2">
            <p className="text-xs text-tg-hint">{group.name}</p>
            <div className="mt-1 flex flex-wrap gap-2">
              {tags.map((tag) => (
                <button
                  key={tag.code}
                  type="button"
                  className={`min-h-11 rounded-full px-3 ${draft.tags.includes(tag.code) ? "bg-tg-button text-tg-button-text" : "bg-tg-secondary"}`}
                  onClick={() => toggleTag(tag.code)}
                >
                  {tag.name}
                </button>
              ))}
            </div>
          </div>
        );
      })}
      {categoryDto?.fields.map((field) => (
        <div key={field.key} className="mt-4">
          <p className="text-sm text-tg-hint">{field.label}</p>
          <div className="mt-1 flex flex-wrap gap-2">
            {field.options.map((option) => {
              const selected =
                (field.filterParam === "strength" &&
                  draft.strength === option.value) ||
                (field.filterParam === "pack" && draft.pack === option.value) ||
                (field.filterParam === "nicotineType" &&
                  draft.nicotineType === option.value);
              return (
                <button
                  key={option.value}
                  type="button"
                  className={`min-h-11 rounded-full px-3 ${selected ? "bg-tg-button text-tg-button-text" : "bg-tg-secondary"}`}
                  onClick={() => {
                    if (field.filterParam === "strength") {
                      onChange({
                        ...draft,
                        strength: selected ? "" : option.value,
                      });
                    } else if (field.filterParam === "pack") {
                      onChange({
                        ...draft,
                        pack: selected ? "" : option.value,
                      });
                    } else {
                      onChange({
                        ...draft,
                        nicotineType: selected ? "" : option.value,
                      });
                    }
                  }}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>
      ))}
      <div className="mt-6 grid grid-cols-2 gap-2">
        <button
          type="button"
          className="min-h-11 rounded-xl bg-tg-secondary"
          onClick={onReset}
        >
          {ru.catalog.reset}
        </button>
        <button
          type="button"
          className="min-h-11 rounded-xl bg-tg-button text-tg-button-text"
          onClick={onApply}
        >
          {ru.catalog.show} {total ?? ""}
        </button>
      </div>
    </BottomSheet>
  );
}
