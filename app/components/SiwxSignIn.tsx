"use client";

import { useCallback, useState } from "react";
import { useAccount, useSignMessage } from "wagmi";
import { SiweMessage } from "siwe";

export default function SiwxSignIn() {
  const { address, chain } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const [status, setStatus] = useState<string | null>(null);

  const signIn = useCallback(async () => {
    try {
      setStatus("Requesting nonce...");
      const nonceRes = await fetch("/api/siwx/nonce", { cache: "no-store" });
      const { nonce } = (await nonceRes.json()) as { nonce: string };

      if (!address || !chain) {
        setStatus("Connect wallet first.");
        return;
      }

      const domain = window.location.host;
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

      setStatus("Signing...");
      const signature = await signMessageAsync({ message: prepared });

      setStatus("Verifying...");
      const verifyRes = await fetch("/api/siwx/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: prepared, signature }),
      });

      if (!verifyRes.ok) {
        const data = await verifyRes.json();
        setStatus(`Verification failed: ${data.error || verifyRes.status}`);
        return;
      }

      setStatus("Signed in.");
    } catch (err) {
      console.error(err);
      setStatus("Error during sign-in");
    }
  }, [address, chain, signMessageAsync]);

  const signOut = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setStatus("Signed out.");
  }, []);

  return (
    <div className="flex gap-2 items-center justify-center">
      <button
        className="bg-foreground text-background text-sm px-3 py-1 rounded-md"
        onClick={signIn}
      >
        SIWE Sign In
      </button>
      <button
        className="bg-slate-700 text-white text-sm px-3 py-1 rounded-md"
        onClick={signOut}
      >
        Sign Out
      </button>
      {status && <span className="text-xs opacity-80">{status}</span>}
    </div>
  );
}


