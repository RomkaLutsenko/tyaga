"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import {
  catalogKeys,
  fetchMeta,
  fetchRecommendations,
} from "@/entities/catalog";
import { track } from "@/features/events";
import { ru } from "@/shared/i18n";
import { usePlatform } from "@/shared/lib/platform";
import { isFresh, storageKeys } from "@/shared/lib/storage-keys";
import { useBackButton, useMainButton } from "@/shared/lib/use-chrome";
import { getRouteCatalog, getRouteHome } from "@/shared/const/router";
import type { CatalogMeta } from "@/shared/types/catalog";
import { ErrorState, Screen, Skeleton } from "@/shared/ui";

type Answers = {
  category: string;
  tags: string[];
  unwantedTags: string[];
  noneUnwanted: boolean;
  attributes: Record<string, string>;
};

type Step =
  | { type: "category" }
  | { type: "tags" }
  | { type: "unwanted" }
  | { type: "attribute"; key: string; label: string };

const emptyAnswers: Answers = {
  category: "",
  tags: [],
  unwantedTags: [],
  noneUnwanted: false,
  attributes: {},
};

export function SurveyView() {
  const router = useRouter();
  const platform = usePlatform();
  const meta = useQuery({ queryKey: catalogKeys.meta, queryFn: fetchMeta });
  const [stepIndex, setStepIndex] = useState(0);
  const [answers, setAnswers] = useState<Answers>(emptyAnswers);
  const [ready, setReady] = useState(false);
  const [pending, setPending] = useState(false);
  const started = useRef(false);

  const steps = useMemo(
    () => (meta.data ? buildSteps(meta.data, answers.category) : []),
    [meta.data, answers.category],
  );
  const step = steps[Math.min(stepIndex, Math.max(steps.length - 1, 0))];
  const filled = step ? isFilled(step, answers) : false;

  useEffect(() => {
    void platform.storage.get(storageKeys.surveyDraft).then((raw) => {
      if (!raw) {
        setReady(true);
        return;
      }
      try {
        const draft = JSON.parse(raw) as {
          savedAt: number;
          step: number;
          answers: Answers;
        };
        if (isFresh(draft.savedAt)) {
          setAnswers(draft.answers);
          setStepIndex(draft.step ?? 0);
        }
      } catch {
        setAnswers(emptyAnswers);
      }
      setReady(true);
    });
  }, [platform.storage]);

  useEffect(() => {
    if (!ready) return;
    void platform.storage.set(
      storageKeys.surveyDraft,
      JSON.stringify({ savedAt: Date.now(), step: stepIndex, answers }),
    );
    const dirty =
      answers.tags.length > 0 ||
      answers.unwantedTags.length > 0 ||
      Object.keys(answers.attributes).length > 0;
    platform.setClosingConfirmation(dirty);
  }, [ready, stepIndex, answers, platform]);

  useEffect(() => {
    if (!ready || started.current) {
      return;
    }
    started.current = true;
    track("survey_started", answers.category || undefined);
  }, [ready, answers.category]);

  useBackButton({
    visible: true,
    onClick: () => {
      if (stepIndex > 0) {
        setStepIndex((value) => value - 1);
        return;
      }
      router.push(getRouteHome());
    },
  });

  useMainButton({
    text: stepIndex >= steps.length - 1 ? ru.survey.finish : ru.survey.next,
    visible: ready && steps.length > 0,
    disabled: !filled || pending,
    progress: pending,
    onClick: () => {
      void goNext();
    },
  });

  async function goNext() {
    if (!filled || !meta.data) return;
    platform.haptic.impact();
    if (stepIndex < steps.length - 1) {
      setStepIndex((value) => value + 1);
      return;
    }
    setPending(true);
    try {
      const query = {
        category: answers.category || meta.data.categories[0]?.code || "",
        tags: answers.tags,
        unwantedTags: answers.unwantedTags,
        attributes: answers.attributes,
        savedAt: Date.now(),
      };
      await fetchRecommendations(query);
      await platform.storage.set(
        storageKeys.recommendation,
        JSON.stringify(query),
      );
      await platform.storage.remove(storageKeys.surveyDraft);
      track("survey_completed", query.category);
      platform.haptic.success();
      router.push(`${getRouteCatalog()}?mode=picks`);
    } catch {
      platform.haptic.error();
      await platform.showAlert(ru.states.error);
    } finally {
      setPending(false);
    }
  }

  if (!ready || meta.isLoading) {
    return (
      <Screen>
        <Skeleton className="h-4 w-24" />
        <Skeleton className="mt-4 h-24" />
      </Screen>
    );
  }
  if (meta.isError || !meta.data || !step) {
    return <ErrorState onRetry={() => void meta.refetch()} />;
  }

  return (
    <Screen testId="survey">
      <p className="text-sm text-tg-hint">
        {ru.survey.progress} {stepIndex + 1} {ru.survey.of} {steps.length}
      </p>
      <div className="mt-2 h-1 overflow-hidden rounded bg-tg-secondary">
        <div
          className="h-full bg-tg-button"
          style={{ width: `${((stepIndex + 1) / steps.length) * 100}%` }}
        />
      </div>
      <h1 className="mt-4 text-xl font-semibold">{stepTitle(step)}</h1>
      <div className="mt-4 flex flex-wrap gap-2">
        {step.type === "category"
          ? meta.data.categories.map((category) => (
              <Chip
                key={category.code}
                active={answers.category === category.code}
                label={category.name}
                onClick={() => {
                  platform.haptic.selection();
                  setAnswers({ ...emptyAnswers, category: category.code });
                }}
              />
            ))
          : null}
        {step.type === "tags"
          ? meta.data.groups.map((group) => (
              <div key={group.code} className="w-full">
                <p className="mb-1 text-xs text-tg-hint">{group.name}</p>
                <div className="flex flex-wrap gap-2">
                  {meta.data?.tags
                    .filter((tag) => tag.group === group.code)
                    .map((tag) => (
                      <Chip
                        key={tag.code}
                        active={answers.tags.includes(tag.code)}
                        label={tag.name}
                        onClick={() => {
                          platform.haptic.selection();
                          setAnswers((current) => ({
                            ...current,
                            tags: toggle(current.tags, tag.code),
                          }));
                        }}
                      />
                    ))}
                </div>
              </div>
            ))
          : null}
        {step.type === "unwanted" ? (
          <>
            <Chip
              active={answers.noneUnwanted}
              label={ru.survey.none}
              onClick={() => {
                platform.haptic.selection();
                setAnswers((current) => ({
                  ...current,
                  noneUnwanted: true,
                  unwantedTags: [],
                }));
              }}
            />
            {meta.data.tags.map((tag) => (
              <Chip
                key={tag.code}
                active={answers.unwantedTags.includes(tag.code)}
                label={tag.name}
                onClick={() => {
                  platform.haptic.selection();
                  setAnswers((current) => ({
                    ...current,
                    noneUnwanted: false,
                    unwantedTags: toggle(current.unwantedTags, tag.code),
                  }));
                }}
              />
            ))}
          </>
        ) : null}
        {step.type === "attribute"
          ? currentField(meta.data, answers.category, step.key)?.options.map(
              (option) => (
                <Chip
                  key={option.value}
                  active={answers.attributes[step.key] === option.value}
                  label={option.label}
                  onClick={() => {
                    platform.haptic.selection();
                    setAnswers((current) => ({
                      ...current,
                      attributes: {
                        ...current.attributes,
                        [step.key]: option.value,
                      },
                    }));
                  }}
                />
              ),
            )
          : null}
      </div>
    </Screen>
  );
}

function Chip({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`min-h-11 rounded-full px-3 ${active ? "bg-tg-button text-tg-button-text" : "bg-tg-secondary"}`}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

function buildSteps(meta: CatalogMeta, categoryCode: string): Step[] {
  const steps: Step[] = [];
  const categories = meta.categories;
  const selected =
    categories.find((item) => item.code === categoryCode) ?? categories[0];
  if (categories.length > 1) {
    steps.push({ type: "category" });
  }
  steps.push({ type: "tags" }, { type: "unwanted" });
  for (const field of selected?.fields.filter((item) => item.hardFilter) ??
    []) {
    steps.push({ type: "attribute", key: field.key, label: field.label });
  }
  return steps;
}

function isFilled(step: Step, answers: Answers) {
  if (step.type === "category") return Boolean(answers.category);
  if (step.type === "tags") return answers.tags.length > 0;
  if (step.type === "unwanted")
    return answers.noneUnwanted || answers.unwantedTags.length > 0;
  return Boolean(answers.attributes[step.key]);
}

function stepTitle(step: Step) {
  if (step.type === "category") return ru.survey.category;
  if (step.type === "tags") return ru.survey.flavors;
  if (step.type === "unwanted") return ru.survey.unwanted;
  return step.label;
}

function toggle(values: string[], code: string) {
  return values.includes(code)
    ? values.filter((item) => item !== code)
    : [...values, code];
}

function currentField(meta: CatalogMeta, categoryCode: string, key: string) {
  const category =
    meta.categories.find((item) => item.code === categoryCode) ??
    meta.categories[0];
  return category?.fields.find((field) => field.key === key);
}
