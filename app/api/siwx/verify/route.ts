import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { SiweMessage } from "siwe";
import { signAuthJwt } from "@/lib/jwt";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { message, signature } = body as { message: string; signature: string };
    if (!message || !signature) {
      return NextResponse.json({ error: "Missing message or signature" }, { status: 400 });
    }

    const siwe = new SiweMessage(message);
    const nonce = req.headers.get("cookie")?.split(";").find((c) => c.trim().startsWith("siwx_nonce="))?.split("=")[1] ?? null;
    if (!nonce) {
      return NextResponse.json({ error: "Missing nonce" }, { status: 400 });
    }

    const hdrs = await headers();
    const host = hdrs.get("host") || "localhost:3000";
    const protocol = (hdrs.get("x-forwarded-proto") || "http").split(",")[0];
    const domain = host.split(":")[0];
    const origin = `${protocol}://${host}`;

    const verifyResult = await siwe.verify({
      signature,
      domain,
      nonce,
      time: new Date().toISOString(),
    });
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
        type: "siwe",
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


