"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { setApiRuntime } from "@/shared/api/runtime";
import { storageKeys } from "@/shared/lib/storage-keys";

type StorageApi = {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  remove(key: string): Promise<void>;
};

export type PlatformValue = {
  ready: boolean;
  isTelegram: boolean;
  platform: "telegram" | "web";
  nativeMain: boolean;
  nativeSecondary: boolean;
  nativeBack: boolean;
  storage: StorageApi;
  haptic: {
    selection: () => void;
    impact: () => void;
    success: () => void;
    error: () => void;
  };
  showAlert: (message: string) => Promise<void>;
  showConfirm: (message: string) => Promise<boolean>;
  setClosingConfirmation: (enabled: boolean) => void;
};

const PlatformContext = createContext<PlatformValue | null>(null);

function browserStorage(): StorageApi {
  return {
    async get(key) {
      return window.localStorage.getItem(key);
    },
    async set(key, value) {
      window.localStorage.setItem(key, value.slice(0, 4096));
    },
    async remove(key) {
      window.localStorage.removeItem(key);
    },
  };
}

function detectTelegram() {
  if (typeof window === "undefined") {
    return false;
  }
  const source = `${window.location.hash}${window.location.search}`;
  const legacy = (
    window as Window & { Telegram?: { WebApp?: { initData?: string } } }
  ).Telegram?.WebApp?.initData;
  return source.includes("tgWebAppData") || Boolean(legacy);
}

const noopHaptic = {
  selection() {
    navigator.vibrate?.(10);
  },
  impact() {
    navigator.vibrate?.(15);
  },
  success() {
    navigator.vibrate?.([10, 20, 10]);
  },
  error() {
    navigator.vibrate?.(30);
  },
};

export function PlatformProvider({ children }: { children: ReactNode }) {
  const [native, setNative] = useState({
    main: false,
    secondary: false,
    back: false,
  });
  const [ready, setReady] = useState(false);
  const [storage, setStorage] = useState<StorageApi>(browserStorage);
  const [haptic, setHaptic] = useState(noopHaptic);
  const dialogs = useMemo(
    () => ({
      async showAlert(message: string) {
        window.alert(message);
      },
      async showConfirm(message: string) {
        return window.confirm(message);
      },
      setClosingConfirmation(enabled: boolean) {
        void enabled;
      },
    }),
    [],
  );
  const isTelegram = useMemo(() => detectTelegram(), []);

  useEffect(() => {
    let cancelled = false;
    const local = browserStorage();

    async function boot() {
      let active = local;
      let initData: string | undefined;
      if (isTelegram) {
        try {
          const sdk = await import("@telegram-apps/sdk-react");
          sdk.init();
          initData = sdk.initData.raw() || undefined;
          if (sdk.miniApp.ready.isAvailable()) sdk.miniApp.ready();
          if (sdk.viewport.mount.isAvailable()) {
            await sdk.viewport.mount();
          }
          if (sdk.viewport.expand.isAvailable()) sdk.viewport.expand();
          if (sdk.themeParams.bindCssVars.isAvailable())
            sdk.themeParams.bindCssVars();
          if (sdk.cloudStorage.getItem.isAvailable()) {
            active = {
              async get(key) {
                const value = await sdk.cloudStorage.getItem(key);
                return value || local.get(key);
              },
              async set(key, value) {
                await sdk.cloudStorage.setItem(key, value.slice(0, 4096));
              },
              async remove(key) {
                if (sdk.cloudStorage.deleteItem.isAvailable()) {
                  await sdk.cloudStorage.deleteItem(key);
                }
                await local.remove(key);
              },
            };
          }
          if (!cancelled) {
            setNative({
              main: sdk.mainButton.mount.isAvailable(),
              secondary: sdk.secondaryButton.mount.isAvailable(),
              back: sdk.backButton.mount.isAvailable(),
            });
            if (sdk.hapticFeedback.impactOccurred.isAvailable()) {
              setHaptic({
                selection: () => sdk.hapticFeedback.selectionChanged(),
                impact: () => sdk.hapticFeedback.impactOccurred("light"),
                success: () =>
                  sdk.hapticFeedback.notificationOccurred("success"),
                error: () => sdk.hapticFeedback.notificationOccurred("error"),
              });
            }
          }
        } catch {
          active = local;
        }
      }

      setApiRuntime({
        accessMode: "open",
        platform: isTelegram ? "telegram" : "web",
        getAgeToken: () => active.get(storageKeys.ageToken),
        getInitData: () => initData,
      });
      if (!cancelled) {
        setStorage(active);
        setReady(true);
      }
    }

    void boot();
    return () => {
      cancelled = true;
    };
  }, [isTelegram]);

  const value = useMemo<PlatformValue>(
    () => ({
      ready,
      isTelegram,
      platform: isTelegram ? "telegram" : "web",
      nativeMain: native.main,
      nativeSecondary: native.secondary,
      nativeBack: native.back,
      storage,
      haptic,
      showAlert: dialogs.showAlert,
      showConfirm: dialogs.showConfirm,
      setClosingConfirmation: dialogs.setClosingConfirmation,
    }),
    [ready, isTelegram, native, storage, haptic, dialogs],
  );

  return (
    <PlatformContext.Provider value={value}>
      {children}
    </PlatformContext.Provider>
  );
}

export function usePlatform() {
  const value = useContext(PlatformContext);
  if (!value) {
    throw new Error("PlatformProvider is missing");
  }
  return value;
}
