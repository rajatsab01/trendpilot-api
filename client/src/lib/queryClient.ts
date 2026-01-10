import { QueryClient, QueryFunction } from "@tanstack/react-query";

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

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown
): Promise<Response> {
  const res = await fetch(`${API_BASE}${url}`, {
    method,
    headers: {
      "Content-Type": "application/json",
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
    const res = await fetch(`${API_BASE}${queryKey[0]}`);
    await throwIfResNotOk(res);
    return res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
    },
    mutations: {
      retry: false,
    },
  },
});
