import { QueryClient } from "@tanstack/react-query";

export const queryKeys = {
  dashboard: {
    overview: ["dashboard", "overview"] as const,
  },
};

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5000,
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      retry: 1,
    },
  },
});
