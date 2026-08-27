"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { storeAuthTokens } from "@/lib/auth-tokens";

function readCallbackTokens(searchParams: URLSearchParams) {
  const hashParams = new URLSearchParams(
    typeof window !== "undefined" ? window.location.hash.replace(/^#/, "") : "",
  );
  return {
    token: hashParams.get("token") ?? searchParams.get("token"),
    refresh: hashParams.get("refresh") ?? searchParams.get("refresh"),
  };
}

export default function AuthCallbackPage() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"loading" | "done" | "error">("loading");

  useEffect(() => {
    const { token, refresh } = readCallbackTokens(searchParams);
    if (!token) {
      setStatus("error");
      return;
    }
    storeAuthTokens(token, refresh);
    setStatus("done");
    window.location.href = "/dashboard";
  }, [searchParams]);

  if (status === "error") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <p className="text-red-600">Missing token. Please try signing in again.</p>
        <a href="/login" className="text-blue-600 underline">Back to login</a>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900" />
    </div>
  );
}
