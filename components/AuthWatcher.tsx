"use client";

import { useEffect, useRef } from "react";
import { useAccount } from "wagmi";
import { convex } from "@/components/ConvexClientProvider";

async function fetchAuthToken(): Promise<string | null> {
  try {
    const res = await fetch("/api/auth/token", {
      cache: "no-store",
      credentials: "include",
    });
    const { token } = (await res.json()) as { token: string | null };
    return token ?? null;
  } catch {
    return null;
  }
}

export default function AuthWatcher() {
  const { status } = useAccount();
  const syncingRef = useRef(false);

  useEffect(() => {
    if (syncingRef.current) return;
    // Only act on definitive states to avoid races during hydration
    if (status !== "connected" && status !== "disconnected") return;
    syncingRef.current = true;

    const sync = async () => {
      if (status === "disconnected") {
        try {
          await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
        } catch {}
        await convex.setAuth(async () => null);
      }
      syncingRef.current = false;
    };

    void sync();
  }, [status]);

  return null;
}


