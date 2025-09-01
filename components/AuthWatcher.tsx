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
  const { isConnected } = useAccount();
  const syncingRef = useRef(false);

  useEffect(() => {
    if (syncingRef.current) return;
    syncingRef.current = true;

    const sync = async () => {
      if (isConnected) {
        // On connect: try a few times to pick up the freshly set cookie
        const maxAttempts = 5;
        let attempt = 0;
        while (attempt < maxAttempts) {
          const token = await fetchAuthToken();
          if (process.env.NODE_ENV !== "production") {
            console.log(`[AuthWatcher] attempt ${attempt + 1} token?`, Boolean(token));
          }
          await convex.setAuth(async () => token);
          if (token) break;
          // Backoff before retrying, to allow verification route to set cookie
          await new Promise((r) => setTimeout(r, 200 * Math.pow(2, attempt)));
          attempt += 1;
        }
      } else {
        // On disconnect: clear cookie on server and clear Convex auth
        try {
          await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
        } catch {}
        await convex.setAuth(async () => null);
      }
      syncingRef.current = false;
    };

    void sync();
  }, [isConnected]);

  return null;
}


