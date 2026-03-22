import { QueryClient, QueryFunction } from "@tanstack/react-query";

import { APP_VERSION } from "@shared/schema";

const API_BASE =
  import.meta.env.MODE === "development"
    ? "http://localhost:10000"
    : "";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || res.statusText);
  }
}

function uiLangHeaders(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const lang = localStorage.getItem("language")?.trim();
    if (lang) return { "x-ui-lang": lang };
  } catch {
    /* ignore */
  }
  return {};
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown
): Promise<Response> {
  const res = await fetch(`${API_BASE}${url}`, {
    method,
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      "x-app-version": APP_VERSION,
      ...uiLangHeaders(),
    },
    body: data ? JSON.stringify(data) : undefined,
  });

  await throwIfResNotOk(res);
  return res;
}

export const getQueryFn: <T>(options: {
  on401: "throw" | "returnNull";
}) => QueryFunction<T> =
  () =>
  async ({ queryKey }) => {
    // Correct URL construction: Join all parts of the queryKey
    // This allows queryKeys like ["/api/user", userId] to become "/api/user/123"
    const url = Array.isArray(queryKey) ? queryKey.join('/') : queryKey;
    
    const res = await fetch(`${API_BASE}${url}`, {
      cache: "no-store",
      headers: {
        "x-app-version": APP_VERSION,
        ...uiLangHeaders(),
      },
    });
    await throwIfResNotOk(res);
    return res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      retry: false,
      refetchOnWindowFocus: false,
      // Change from Infinity to 5 minutes to allow background refreshes
      staleTime: 1000 * 60 * 5,
    },
    mutations: {
      retry: false,
    },
  },
});
