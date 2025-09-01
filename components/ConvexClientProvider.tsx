"use client";

import { ReactNode } from "react";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import { useEffect } from "react";

export const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export default function ConvexClientProvider({
  children,
}: {
  children: ReactNode;
}) {
  useEffect(() => {
    void convex.setAuth(async () => {
      try {
        const res = await fetch("/api/auth/token", {
          cache: "no-store",
          credentials: "include",
        });
        const { token } = (await res.json()) as { token: string | null };
        if (process.env.NODE_ENV !== "production") {
          console.log("[Convex setAuth] token present:", Boolean(token));
        }
        return token ?? null;
      } catch (err) {
        console.warn("Failed to fetch auth token", err);
        return null;
      }
    });
  }, []);

  return <ConvexProvider client={convex}>{children}</ConvexProvider>;
}
