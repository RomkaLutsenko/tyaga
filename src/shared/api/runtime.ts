type Runtime = {
  accessMode: "open" | "telegram_only";
  platform: "telegram" | "web";
  getAgeToken: () => Promise<string | null>;
  getInitData?: () => string | undefined;
};

let runtime: Runtime = {
  accessMode: "open",
  platform: "web",
  getAgeToken: async () => null,
};

export function setApiRuntime(next: Runtime) {
  runtime = next;
}

export function setAccessMode(accessMode: Runtime["accessMode"]) {
  runtime = { ...runtime, accessMode };
}

export function apiPlatform() {
  return runtime.platform;
}

export async function apiHeaders() {
  const headers: Record<string, string> = { Accept: "application/json" };
  const token = await runtime.getAgeToken();
  if (token) {
    headers["X-Age-Token"] = token;
  }
  if (runtime.accessMode === "telegram_only") {
    const initData = runtime.getInitData?.();
    if (initData) {
      headers.Authorization = `tma ${initData}`;
    }
  }
  return headers;
}
