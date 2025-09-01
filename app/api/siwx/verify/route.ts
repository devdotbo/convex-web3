import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { signAuthJwt } from "@/lib/jwt";
import { verifyMessage } from "viem";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!("session" in body)) {
      return NextResponse.json({ error: "Missing session" }, { status: 400 });
    }

    const { session } = body as {
      session: {
        data: {
          domain: string;
          uri: string;
          version: string;
          nonce?: string;
          accountAddress: string;
          chainId: string;
        };
        message: string;
        signature: string;
      };
    };

    // Require and validate nonce from cookie against session.data.nonce to prevent replay
    const cookieHeader = req.headers.get("cookie") || "";
    const nonceCookie = cookieHeader
      .split(";")
      .map((c) => c.trim())
      .find((c) => c.startsWith("siwx_nonce="))
      ?.split("=")[1] ?? null;
    if (!nonceCookie) {
      return NextResponse.json({ error: "Missing nonce" }, { status: 400 });
    }
    if (!session.data.nonce || session.data.nonce !== nonceCookie) {
      return NextResponse.json({ error: "Nonce mismatch" }, { status: 401 });
    }

    const hdrs = await headers();
    const host = hdrs.get("host") || "localhost:3000";
    const protocol = (hdrs.get("x-forwarded-proto") || "http").split(",")[0];
    const origin = `${protocol}://${host}`;

    // Normalize chain namespace and reference (expecting eip155)
    const chainIdRaw = session.data.chainId;
    const [namespace, chainRefRaw] = chainIdRaw.includes(":")
      ? (chainIdRaw.split(":") as [string, string])
      : (["eip155", chainIdRaw] as [string, string]);
    if (namespace !== "eip155") {
      return NextResponse.json({ error: "Unsupported chain namespace" }, { status: 400 });
    }
    const chainRef = String(chainRefRaw);

    // Pure EIP-155 signature verification (no SIWE parsing, no fallback)
    const verified = await verifyMessage({
      message: session.message.toString(),
      signature: session.signature as `0x${string}`,
      address: session.data.accountAddress as `0x${string}`,
    }).catch(() => false);

    if (!verified) {
      return NextResponse.json({ error: "Signature verification failed" }, { status: 401 });
    }

    const address = session.data.accountAddress;
    const subject = `eip155:${chainRef}:${address}`;

    const issuer = process.env.JWT_ISSUER || origin;
    const audience = process.env.JWT_APPLICATION_ID || "convex-web3";
    const token = await signAuthJwt({
      subject,
      issuer,
      audience,
      additionalClaims: {
        wallet: address,
        chainId: `eip155:${chainRef}`,
        type: "siwx",
      },
    });

    const res = NextResponse.json({ ok: true });
    const isProd = process.env.NODE_ENV === "production";
    res.cookies.set("auth_token", token, {
      httpOnly: true,
      sameSite: "lax",
      secure: isProd,
      path: "/",
      maxAge: 15 * 60,
    });
    // Clear nonce cookie if present (not used for EIP-155 verification)
    res.cookies.set("siwx_nonce", "", { httpOnly: true, maxAge: 0, path: "/" });
    return res;
  } catch (error) {
    console.error("/api/siwx/verify error", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}


