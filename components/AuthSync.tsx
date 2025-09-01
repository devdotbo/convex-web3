"use client";

import { useCallback, useEffect, useRef } from "react";
import { useAccount, useSignMessage } from "wagmi";
import { SiweMessage } from "siwe";
import { convex } from "@/components/ConvexClientProvider";

export default function AuthSync() {
  const { address, chain, isConnected, status } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const isSigningRef = useRef(false);
  const lastSessionKeyRef = useRef<string | null>(null);
  const wasConnectedRef = useRef<boolean>(false);

  const performSiwe = useCallback(async () => {
    if (!address || !chain) return;
    if (isSigningRef.current) return;
    try {
      isSigningRef.current = true;
      const sessionKey = `${address.toLowerCase()}:${chain.id}`;
      if (lastSessionKeyRef.current === sessionKey) return;

      const nonceRes = await fetch("/api/siwx/nonce", { cache: "no-store" });
      const { nonce } = (await nonceRes.json()) as { nonce: string };

      const domain = window.location.hostname;
      const origin = window.location.origin;

      const message = new SiweMessage({
        domain,
        address,
        statement: "Sign in to Convex Web3",
        uri: origin,
        version: "1",
        chainId: chain.id,
        nonce,
      });

      const prepared = message.prepareMessage();
      const signature = await signMessageAsync({ message: prepared });

      const verifyRes = await fetch("/api/siwx/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: prepared, signature }),
        credentials: "include",
      });

      if (!verifyRes.ok) {
        try {
          const data = await verifyRes.json();
          console.warn("SIWE verification failed", data);
        } catch (_) {
          // ignore json parse error
        }
        return;
      }

      await convex.setAuth(async () => {
        try {
          const res = await fetch("/api/auth/token", {
            cache: "no-store",
            credentials: "include",
          });
          const { token } = (await res.json()) as { token: string | null };
          if (process.env.NODE_ENV !== "production") {
            console.log("[AuthSync] refreshed token present:", Boolean(token));
          }
          if (token) {
            lastSessionKeyRef.current = sessionKey;
          }
          return token ?? null;
        } catch (err) {
          console.warn("[AuthSync] Failed to fetch auth token after SIWE", err);
          return null;
        }
      });
    } finally {
      isSigningRef.current = false;
    }
  }, [address, chain, signMessageAsync]);

  const clearSession = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    } catch (_) {}
    await convex.setAuth(async () => null);
    lastSessionKeyRef.current = null;
  }, []);

  useEffect(() => {
    if (isConnected && address && chain) {
      if (!wasConnectedRef.current) {
        // Transition: disconnected -> connected
        wasConnectedRef.current = true;
      }
      void performSiwe();
    } else if (!isConnected && status === "disconnected") {
      if (wasConnectedRef.current) {
        // Transition: connected -> disconnected
        wasConnectedRef.current = false;
        void clearSession();
      }
    }
  }, [isConnected, address, chain, status, performSiwe, clearSession]);

  return null;
}


