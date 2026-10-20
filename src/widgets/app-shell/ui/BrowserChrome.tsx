"use client";

import { useAtomValue } from "jotai";
import { useEffect } from "react";

import { ru } from "@/shared/i18n";
import { usePlatform } from "@/shared/lib/platform";
import {
  backButtonAtom,
  mainButtonAtom,
  secondaryButtonAtom,
} from "@/shared/model/chrome";

export function BrowserChrome() {
  const main = useAtomValue(mainButtonAtom);
  const secondary = useAtomValue(secondaryButtonAtom);
  const back = useAtomValue(backButtonAtom);
  const platform = usePlatform();
  const showLayoutSecondary =
    Boolean(secondary?.visible) && !platform.nativeSecondary;
  const showLayoutMain =
    Boolean(main?.visible) && (!platform.nativeMain || showLayoutSecondary);
  const showLayoutBack = Boolean(back?.visible) && !platform.nativeBack;

  useEffect(() => {
    if (!platform.isTelegram) {
      return;
    }
    let offMain = () => {};
    let offSecondary = () => {};
    let offBack = () => {};
    let cancelled = false;

    void import("@telegram-apps/sdk-react").then((sdk) => {
      if (cancelled) {
        return;
      }
      if (
        platform.nativeMain &&
        !showLayoutMain &&
        sdk.mainButton.mount.isAvailable()
      ) {
        sdk.mainButton.mount();
        sdk.mainButton.setParams({
          text: main?.text ?? "",
          isVisible: Boolean(main?.visible),
          isEnabled: !main?.disabled,
          isLoaderVisible: Boolean(main?.progress),
        });
        if (main?.onClick) {
          offMain = sdk.mainButton.onClick(main.onClick);
        }
      } else if (sdk.mainButton.isVisible()) {
        sdk.mainButton.setParams({ isVisible: false });
      }

      if (
        platform.nativeSecondary &&
        secondary?.visible &&
        sdk.secondaryButton.mount.isAvailable()
      ) {
        sdk.secondaryButton.mount();
        sdk.secondaryButton.setParams({
          text: secondary.text,
          isVisible: true,
          isEnabled: true,
        });
        offSecondary = sdk.secondaryButton.onClick(secondary.onClick);
      }

      if (platform.nativeBack && sdk.backButton.mount.isAvailable()) {
        sdk.backButton.mount();
        if (back?.visible) {
          sdk.backButton.show();
          offBack = sdk.backButton.onClick(back.onClick);
        } else {
          sdk.backButton.hide();
        }
      }
    });

    return () => {
      cancelled = true;
      offMain();
      offSecondary();
      offBack();
    };
  }, [
    platform.isTelegram,
    platform.nativeMain,
    platform.nativeSecondary,
    platform.nativeBack,
    showLayoutMain,
    main,
    secondary,
    back,
  ]);

  return (
    <>
      {showLayoutBack ? (
        <button
          type="button"
          data-testid="back-button"
          className="fixed top-[max(0.75rem,env(safe-area-inset-top))] left-3 z-20 min-h-11 rounded-full bg-tg-secondary px-3 text-sm text-tg-link"
          onClick={back?.onClick}
        >
          {ru.back}
        </button>
      ) : null}
      {showLayoutMain || showLayoutSecondary ? (
        <div className="fixed inset-x-0 bottom-0 z-20 mx-auto w-full max-w-[480px] space-y-2 border-t border-black/5 bg-tg-bg p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          {showLayoutSecondary ? (
            <button
              type="button"
              data-testid="secondary-button"
              className="min-h-11 w-full rounded-xl bg-tg-secondary text-tg-text"
              onClick={secondary?.onClick}
            >
              {secondary?.text}
            </button>
          ) : null}
          {showLayoutMain ? (
            <button
              type="button"
              data-testid="main-button"
              disabled={main?.disabled || main?.progress}
              className="min-h-11 w-full rounded-xl bg-tg-button font-medium text-tg-button-text disabled:opacity-50"
              onClick={main?.onClick}
            >
              {main?.progress ? ru.loading : main?.text}
            </button>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
