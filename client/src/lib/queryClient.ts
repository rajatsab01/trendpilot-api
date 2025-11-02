import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { APP_VERSION } from "@shared/schema";

// IMPORTANT: In production, prefer an explicit API base via Vite env
const API_BASE =
  (import.meta as any).env?.VITE_API_BASE
    ? (import.meta as any).env.VITE_API_BASE
    : (import.meta.env.MODE === "development" ? "http://127.0.0.1:5000" : "");

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown
): Promise<Response> {
  const fullUrl = `${API_BASE}${url.startsWith("/") ? url : `/${url}`}`;

  const res = await fetch(fullUrl, {
    method,
    headers: {
      ...(data ? { "Content-Type": "application/json" } : {}),
      "x-app-version": APP_VERSION, // server version guard
    },
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";

export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey, signal }) => {
    const path = queryKey.join("/") as string;
    const fullUrl = `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`;

    const res = await fetch(fullUrl, {
      credentials: "include",
      headers: {
        "x-app-version": APP_VERSION, // server version guard
      },
      signal, // allow React Query to cancel in-flight requests
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null as unknown as T;
    }

    await throwIfResNotOk(res);
    return (await res.json()) as T;
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
