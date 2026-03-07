"use client";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export function getLoginUrl(provider: "google" | "github"): string {
  return `${API_URL}/auth/${provider}`;
}

export function loginWithGoogle() {
  window.location.href = getLoginUrl("google");
}

export function loginWithGitHub() {
  window.location.href = getLoginUrl("github");
}

export async function logout() {
  await fetch(`${API_URL}/auth/logout`, { method: "POST", credentials: "include" });
  document.cookie = "jwt=; path=/; max-age=0";
  window.location.href = "/";
}
