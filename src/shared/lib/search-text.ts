const EN = "qwertyuiop[]asdfghjkl;'zxcvbnm,./`";
const RU = "йцукенгшщзхъфывапролджэячсмитьбю.ё";

const toRu = new Map<string, string>();
const toEn = new Map<string, string>();

for (let i = 0; i < EN.length && i < RU.length; i += 1) {
  toRu.set(EN.charAt(i), RU.charAt(i));
  toEn.set(RU.charAt(i), EN.charAt(i));
}

export function normalizeSearch(input: string) {
  return input.toLowerCase().replace(/ё/g, "е").trim();
}

function mapLayout(input: string, table: Map<string, string>) {
  return [...input].map((char) => table.get(char) ?? char).join("");
}

export function swapLayout(input: string) {
  const normalized = normalizeSearch(input);
  const asRu = mapLayout(normalized, toRu);
  if (asRu !== normalized) {
    return asRu;
  }
  return mapLayout(normalized, toEn);
}

export function searchVariants(input: string) {
  const normalized = normalizeSearch(input);
  if (!normalized) {
    return [];
  }
  const swapped = swapLayout(normalized);
  return swapped === normalized ? [normalized] : [normalized, swapped];
}
