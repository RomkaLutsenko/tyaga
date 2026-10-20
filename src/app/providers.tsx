"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Provider as JotaiProvider } from "jotai";
import { useState, type ReactNode } from "react";

import { PlatformProvider } from "@/shared/lib/platform";

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: 2,
            retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
            staleTime: 30_000,
          },
        },
      }),
  );

  return (
    <JotaiProvider>
      <QueryClientProvider client={queryClient}>
        <PlatformProvider>{children}</PlatformProvider>
      </QueryClientProvider>
    </JotaiProvider>
  );
}
