"use client";

import { useEffect, useRef } from "react";
import { useAppKitAccount, useAppKitEvents } from "@reown/appkit/react";
import { convex } from "@/components/ConvexClientProvider";

export default function AuthWatcher() {
  const { status, isConnected, address, caipAddress } = useAppKitAccount();
  const events = useAppKitEvents();
  const syncingRef = useRef(false);
  const prevCaipRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (syncingRef.current) return;
    syncingRef.current = true;

    const sync = async () => {
      const current = caipAddress || (address ? `eip155:${address}` : undefined);

      // 1) If fully disconnected, clear auth immediately
      if (!isConnected) {
        await convex.setAuth(async () => null);
        try {
          await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
        } catch {}
        prevCaipRef.current = undefined;
        syncingRef.current = false;
        return;
      }

      // 2) If connected but the account changed from a previous one, clear auth to avoid cross-account reuse
      if (prevCaipRef.current && current && prevCaipRef.current !== current) {
        await convex.setAuth(async () => null);
        try {
          await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
        } catch {}
      }
      prevCaipRef.current = current;
      // Force Convex auth refresh on connect as well
      if (isConnected) {
        await convex.setAuth(async () => {
          try {
            const res = await fetch("/api/auth/token", { cache: "no-store", credentials: "include" });
            const { token } = (await res.json()) as { token: string | null };
            return token ?? null;
          } catch {
            return null;
          }
        });
      }
      syncingRef.current = false;
    };

    void sync();
  }, [status, isConnected, address, caipAddress]);

  // Also react to AppKit events (e.g., wallet modal Disconnect)
  useEffect(() => {
    type AppKitEvent = { data?: { event?: string } };
    const evt = (events as AppKitEvent | undefined)?.data?.event;
    if (!evt) return;
    if (evt === "DISCONNECT_SUCCESS") {
      (async () => {
        await convex.setAuth(async () => null);
        try {
          await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
        } catch {}
        prevCaipRef.current = undefined;
      })();
    }
  }, [events]);

  return null;
}

