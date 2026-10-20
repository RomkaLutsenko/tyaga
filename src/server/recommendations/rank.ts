export type RankedItem = {
  skuCode: string;
  tagCodes: string[];
  attributes: Record<string, string>;
};

export type RankQuery = {
  tags: string[];
  unwantedTags: string[];
  attributes: Record<string, string>;
  hardKeys: string[];
};

export type RankWeights = {
  tagWeight: number;
  attributeWeight: number;
};

export function rankProducts(
  products: RankedItem[],
  query: RankQuery,
  weights: RankWeights,
  options: { excludeSku?: string; requirePositiveScore?: boolean } = {},
) {
  const wanted = new Set(query.tags);
  const unwanted = new Set(query.unwantedTags);
  const ranked: { item: RankedItem; score: number }[] = [];

  for (const item of products) {
    if (options.excludeSku && item.skuCode === options.excludeSku) {
      continue;
    }
    if (item.tagCodes.length === 0) {
      continue;
    }
    if (item.tagCodes.some((code) => unwanted.has(code))) {
      continue;
    }

    let matchesHard = true;
    for (const key of query.hardKeys) {
      const expected = query.attributes[key];
      if (!expected) {
        continue;
      }
      if (item.attributes[key] !== expected) {
        matchesHard = false;
        break;
      }
    }
    if (!matchesHard) {
      continue;
    }

    let overlap = 0;
    for (const code of item.tagCodes) {
      if (wanted.has(code)) {
        overlap += 1;
      }
    }

    let attributeMatches = 0;
    if (weights.attributeWeight > 0) {
      for (const [key, value] of Object.entries(query.attributes)) {
        if (value && item.attributes[key] === value) {
          attributeMatches += 1;
        }
      }
    }

    const score =
      overlap * weights.tagWeight + attributeMatches * weights.attributeWeight;
    if (options.requirePositiveScore && score <= 0) {
      continue;
    }
    ranked.push({ item, score });
  }

  ranked.sort((left, right) => {
    if (right.score !== left.score) {
      return right.score - left.score;
    }
    return left.item.skuCode < right.item.skuCode
      ? -1
      : left.item.skuCode > right.item.skuCode
        ? 1
        : 0;
  });

  return ranked;
}
