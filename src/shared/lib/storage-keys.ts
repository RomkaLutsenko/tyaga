export const storageKeys = {
  ageToken: "age_token_v1",
  ageDeclined: "age_declined_until_v1",
  surveyDraft: "survey_draft_v1",
  catalogState: "catalog_state_v1",
  recommendation: "recommendation_query_v1",
} as const;

export const draftTtlMs = 7 * 24 * 60 * 60 * 1000;

export function isFresh(savedAt: number) {
  return Date.now() - savedAt < draftTtlMs;
}
