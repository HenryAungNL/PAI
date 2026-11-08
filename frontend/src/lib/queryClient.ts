import { QueryClient } from "@tanstack/react-query";

import { ApiError } from "@/lib/api";

/**
 * Shared TanStack Query client.
 *
 * - 4xx responses are not retried (they will not succeed on a retry).
 * - 5xx / network errors retry twice with exponential-ish backoff.
 * - Data is considered fresh for 30s to avoid refetch storms when navigating.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        if (error instanceof ApiError && error.status < 500) return false;
        return failureCount < 2;
      },
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: false,
    },
  },
});
