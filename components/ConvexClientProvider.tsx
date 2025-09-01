"use client";

import { ReactNode, useState } from "react";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import { useEffect } from "react";

export const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export default function ConvexClientProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    (async () => {
      await convex.setAuth(async () => {
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
      setReady(true);
    })();
  }, []);

  if (!ready) return null;
  return <ConvexProvider client={convex}>{children}</ConvexProvider>;
}
