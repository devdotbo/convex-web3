"use client";

import { useState } from "react";
import { useAppKitAccount, useDisconnect } from "@reown/appkit/react";
import { convex } from "@/components/ConvexClientProvider";

export default function DisconnectButton() {
  const { isConnected } = useAppKitAccount();
  const { disconnect } = useDisconnect();
  const [pending, setPending] = useState(false);

  const onDisconnect = async () => {
    if (pending) return;
    setPending(true);
    try {
      await disconnect();
    } catch {
      // swallow disconnect errors; continue to clear local/session state
    }
    try {
      await convex.setAuth(async () => null);
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    } catch {}
    setPending(false);
  };

  return (
    <button
      className="bg-slate-900 text-white text-sm px-3 py-1.5 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
      disabled={!isConnected || pending}
      onClick={onDisconnect}
      aria-disabled={!isConnected || pending}
    >
      {pending ? "Disconnecting..." : "Disconnect"}
    </button>
  );
}


