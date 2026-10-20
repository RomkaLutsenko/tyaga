import { atom } from "jotai";

export type MainButtonState = {
  text: string;
  disabled: boolean;
  visible: boolean;
  progress: boolean;
  onClick: () => void;
};

export type SecondaryButtonState = {
  text: string;
  visible: boolean;
  onClick: () => void;
};

export type BackButtonState = {
  visible: boolean;
  onClick: () => void;
};

export const mainButtonAtom = atom<MainButtonState | null>(null);
export const secondaryButtonAtom = atom<SecondaryButtonState | null>(null);
export const backButtonAtom = atom<BackButtonState | null>(null);
