import { cookies } from "next/headers";
import type { ApiUser } from "@/types/api";
import { ACCESS_COOKIE } from "@/lib/auth-tokens";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
const JWT_COOKIE = ACCESS_COOKIE;

/** Get current user from backend using cookie (use in Server Components / API routes). */
export async function getSession(): Promise<ApiUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(JWT_COOKIE)?.value;
  if (!token) return null;
  try {
    const res = await fetch(`${API_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as ApiUser;
  } catch {
    return null;
  }
}

/** Fetch from API with auth cookie (server-side only). */
export async function fetchApiServer<T>(path: string, options: RequestInit = {}): Promise<T> {
  const cookieStore = await cookies();
  const token = cookieStore.get(JWT_COOKIE)?.value;
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Request failed");
  return res.json() as Promise<T>;
}
