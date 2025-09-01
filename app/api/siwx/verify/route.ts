import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { SiweMessage } from "siwe";
import { signAuthJwt } from "@/lib/jwt";
import { verifyMessage } from "viem";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    // Prefer SIWX session format if provided by DefaultSIWX storage
    if ('session' in body) {
      const { session } = body as { session: { data: { domain: string; uri: string; version: string; nonce: string; accountAddress: string; chainId: string }; message: string; signature: string } };
      const nonce = req.headers.get("cookie")?.split(";").find((c) => c.trim().startsWith("siwx_nonce="))?.split("=")[1] ?? null;
      if (!nonce) {
        return NextResponse.json({ error: "Missing nonce" }, { status: 400 });
      }

      const hdrs = await headers();
      const host = hdrs.get("host") || "localhost:3000";
      const protocol = (hdrs.get("x-forwarded-proto") || "http").split(",")[0];
      const origin = `${protocol}://${host}`;

      // For EVM sessions: verify using SiweMessage first, then fall back to signature verification
      let address: string;
      let chainId: number | string;
      try {
        const siwe = new SiweMessage(session.message);
        const verifyResult = await siwe.verify({
          signature: session.signature,
          domain: session.data.domain,
          nonce,
          time: new Date().toISOString(),
        });
        if (!verifyResult.success) {
          return NextResponse.json({ error: "SIWX verification failed" }, { status: 401 });
        }
        address = siwe.address;
        chainId = typeof siwe.chainId === 'string' ? siwe.chainId : Number(siwe.chainId);
      } catch (e) {
        // Fallback: verify raw message signature and minimally validate fields
        const ok = await verifyMessage({
          address: session.data.accountAddress as `0x${string}`,
          message: session.message,
          signature: session.signature as `0x${string}`,
        });
        if (!ok) {
          return NextResponse.json({ error: "Signature verification failed" }, { status: 401 });
        }
        // Validate nonce is embedded in the signed message to prevent replay
        const nonceMatch = session.message.match(/\nNonce:\s*(\S+)/);
        if (!nonceMatch || nonceMatch[1] !== nonce) {
          return NextResponse.json({ error: "Nonce mismatch" }, { status: 401 });
        }
        // Validate domain roughly via first line
        const firstLine = session.message.split("\n")[0] ?? "";
        if (!firstLine.startsWith(`${session.data.domain} wants you to sign in with your Ethereum account`)) {
          return NextResponse.json({ error: "Domain mismatch" }, { status: 401 });
        }
        address = session.data.accountAddress;
        // Try to parse chainId from message, else use session data
        const chainMatch = session.message.match(/\nChain ID:\s*(\d+)/);
        chainId = chainMatch ? Number(chainMatch[1]) : Number(session.data.chainId);
      }
      const subject = `eip155:${chainId}:${address}`;

      const issuer = process.env.JWT_ISSUER || origin;
      const audience = process.env.JWT_APPLICATION_ID || "convex-web3";
      const token = await signAuthJwt({
        subject,
        issuer,
        audience,
        additionalClaims: { wallet: address, chainId: `eip155:${chainId}`, type: 'siwx' },
      });
      const res = NextResponse.json({ ok: true });
      const isProd = process.env.NODE_ENV === 'production';
      res.cookies.set('auth_token', token, { httpOnly: true, sameSite: 'lax', secure: isProd, path: '/', maxAge: 15 * 60 });
      res.cookies.set('siwx_nonce', '', { httpOnly: true, maxAge: 0, path: '/' });
      return res;
    }

    // Backward compatibility: raw SIWE message/signature
    const { message, signature } = body as { message: string; signature: string };
    if (!message || !signature) {
      return NextResponse.json({ error: "Missing message or signature" }, { status: 400 });
    }

    let siwe: SiweMessage;
    try {
      siwe = new SiweMessage(message);
    } catch (e) {
      // Fallback path: verify raw message signature and basic fields
      const hdrs = await headers();
      const host = hdrs.get("host") || "localhost:3000";
      const protocol = (hdrs.get("x-forwarded-proto") || "http").split(",")[0];
      const origin = `${protocol}://${host}`;

      const nonce = req.headers.get("cookie")?.split(";").find((c) => c.trim().startsWith("siwx_nonce="))?.split("=")[1] ?? null;
      if (!nonce) {
        return NextResponse.json({ error: "Missing nonce" }, { status: 400 });
      }

      const ok = await verifyMessage({
        // We cannot recover expected address without parsing; accept any address from signature
        // and rely on message fields checks. verifyMessage does not need address when not provided,
        // but the overload requires it; cast to satisfy types.
        address: "0x0000000000000000000000000000000000000000" as `0x${string}`,
        message,
        signature: signature as `0x${string}`,
      }).catch(() => false);
      if (!ok) {
        return NextResponse.json({ error: "Signature verification failed" }, { status: 401 });
      }
      const nonceMatch = message.match(/\nNonce:\s*(\S+)/);
      if (!nonceMatch || nonceMatch[1] !== nonce) {
        return NextResponse.json({ error: "Nonce mismatch" }, { status: 401 });
      }
      // If fallback succeeded, we cannot reliably extract address/chain; reject to avoid issuing JWT
      return NextResponse.json({ error: "Invalid SIWE message format" }, { status: 400 });
    }
    const nonce = req.headers.get("cookie")?.split(";").find((c) => c.trim().startsWith("siwx_nonce="))?.split("=")[1] ?? null;
    if (!nonce) {
      return NextResponse.json({ error: "Missing nonce" }, { status: 400 });
    }

    const hdrs = await headers();
    const host = hdrs.get("host") || "localhost:3000";
    const protocol = (hdrs.get("x-forwarded-proto") || "http").split(",")[0];
    const origin = `${protocol}://${host}`;

    const verifyResult = await siwe.verify({ signature, domain: siwe.domain, nonce, time: new Date().toISOString() });
    if (!verifyResult.success) {
      return NextResponse.json({ error: "SIWE verification failed" }, { status: 401 });
    }

    const address = siwe.address;
    const chainId = typeof siwe.chainId === "string" ? siwe.chainId : Number(siwe.chainId);
    const subject = `eip155:${chainId}:${address}`;

    const issuer = process.env.JWT_ISSUER || origin;
    const audience = process.env.JWT_APPLICATION_ID || "convex-web3";

    const token = await signAuthJwt({
      subject,
      issuer,
      audience,
      additionalClaims: {
        wallet: address,
        chainId: `eip155:${chainId}`,
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
    // Clear nonce
    res.cookies.set("siwx_nonce", "", { httpOnly: true, maxAge: 0, path: "/" });
    return res;
  } catch (error) {
    console.error("/api/siwx/verify error", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}


