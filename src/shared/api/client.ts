import { apiHeaders } from "@/shared/api/runtime";

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
  ) {
    super(code);
  }
}

export async function apiFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const headers = await apiHeaders();
  if (init?.body) {
    headers["Content-Type"] = "application/json";
  }
  const response = await fetch(path, {
    ...init,
    headers: { ...headers, ...(init?.headers ?? {}) },
    signal: init?.signal ?? AbortSignal.timeout(10_000),
  });
  if (response.status === 403) {
    window.dispatchEvent(new Event("age-token-invalid"));
  }
  if (!response.ok) {
    let code = "request_failed";
    try {
      const body = (await response.json()) as { code?: string };
      code = body.code ?? code;
    } catch {
      code = "request_failed";
    }
    throw new ApiError(response.status, code);
  }
  if (response.status === 204 || response.status === 304) {
    return undefined as T;
  }
  return (await response.json()) as T;
}
