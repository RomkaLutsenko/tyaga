"use client";

import { apiPlatform } from "@/shared/api/runtime";
import { sendEvents } from "@/entities/catalog";

const queue: {
  event: string;
  category?: string;
  platform: "telegram" | "web";
}[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;

export function track(event: string, category?: string) {
  queue.push({ event, category, platform: apiPlatform() });
  if (!timer) {
    timer = setTimeout(() => {
      void flush();
    }, 1500);
  }
}

export async function flush() {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
  if (queue.length === 0) {
    return;
  }
  const batch = queue.splice(0, 20);
  try {
    await sendEvents(batch);
  } catch {
    queue.unshift(...batch);
  }
}

if (typeof window !== "undefined") {
  window.addEventListener("pagehide", () => {
    void flush();
  });
}
