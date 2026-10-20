"use client";

import { useSetAtom } from "jotai";
import { useEffect, useRef } from "react";

import {
  backButtonAtom,
  mainButtonAtom,
  secondaryButtonAtom,
  type BackButtonState,
  type MainButtonState,
  type SecondaryButtonState,
} from "@/shared/model/chrome";

export function useMainButton(
  state: (Omit<MainButtonState, "onClick"> & { onClick: () => void }) | null,
) {
  const set = useSetAtom(mainButtonAtom);
  const clickRef = useRef(state?.onClick);
  const onClick = state?.onClick;
  useEffect(() => {
    clickRef.current = onClick;
  }, [onClick]);
  const text = state?.text;
  const disabled = state?.disabled ?? false;
  const visible = state?.visible ?? false;
  const progress = state?.progress ?? false;

  useEffect(() => {
    if (!text || !visible) {
      set(null);
      return;
    }
    set({
      text,
      disabled,
      visible,
      progress,
      onClick: () => clickRef.current?.(),
    });
    return () => set(null);
  }, [text, disabled, visible, progress, set]);
}

export function useSecondaryButton(
  state:
    (Omit<SecondaryButtonState, "onClick"> & { onClick: () => void }) | null,
) {
  const set = useSetAtom(secondaryButtonAtom);
  const clickRef = useRef(state?.onClick);
  const onClick = state?.onClick;
  useEffect(() => {
    clickRef.current = onClick;
  }, [onClick]);
  const text = state?.text;
  const visible = state?.visible ?? false;

  useEffect(() => {
    if (!text || !visible) {
      set(null);
      return;
    }
    set({ text, visible, onClick: () => clickRef.current?.() });
    return () => set(null);
  }, [text, visible, set]);
}

export function useBackButton(
  state: (Omit<BackButtonState, "onClick"> & { onClick: () => void }) | null,
) {
  const set = useSetAtom(backButtonAtom);
  const clickRef = useRef(state?.onClick);
  const onClick = state?.onClick;
  useEffect(() => {
    clickRef.current = onClick;
  }, [onClick]);
  const visible = state?.visible ?? false;

  useEffect(() => {
    if (!visible) {
      set(null);
      return;
    }
    set({ visible, onClick: () => clickRef.current?.() });
    return () => set(null);
  }, [visible, set]);
}
