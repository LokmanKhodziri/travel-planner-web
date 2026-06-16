"use client";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
const JWT_COOKIE = "jwt";

interface EmailAuthResponse {
  token: string;
}

export function getLoginUrl(provider: "google" | "github"): string {
  return `${API_URL}/auth/${provider}`;
}

function storeToken(token: string) {
  document.cookie = `${JWT_COOKIE}=${encodeURIComponent(token)}; path=/; max-age=${60 * 60 * 24 * 7}`;
}

async function emailAuth(
  path: "/auth/login" | "/auth/signup",
  body: { email: string; password: string; name?: string },
) {
  const response = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(body),
  });

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(data?.error ?? "Authentication failed");
  }

  storeToken((data as EmailAuthResponse).token);
}

export async function signInWithEmail(email: string, password: string) {
  await emailAuth("/auth/login", { email, password });
  window.location.href = "/dashboard";
}

export async function signUpWithEmail(name: string, email: string, password: string) {
  await emailAuth("/auth/signup", { name, email, password });
  window.location.href = "/dashboard";
}

export function loginWithGoogle() {
  window.location.href = getLoginUrl("google");
}

export function loginWithGitHub() {
  window.location.href = getLoginUrl("github");
}

export async function logout() {
  await fetch(`${API_URL}/auth/logout`, { method: "POST", credentials: "include" });
  document.cookie = `${JWT_COOKIE}=; path=/; max-age=0`;
  window.location.href = "/";
}
