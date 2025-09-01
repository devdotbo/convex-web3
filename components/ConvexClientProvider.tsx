"use client";

import { ReactNode } from "react";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import { useEffect } from "react";

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export default function ConvexClientProvider({
  children,
}: {
  children: ReactNode;
}) {
  useEffect(() => {
    void convex.setAuth(async () => {
      try {
        const res = await fetch("/api/auth/token", { cache: "no-store" });
        const { token } = (await res.json()) as { token: string | null };
        return token ?? null;
      } catch (err) {
        console.warn("Failed to fetch auth token", err);
        return null;
      }
    });
  }, []);

  return <ConvexProvider client={convex}>{children}</ConvexProvider>;
}
