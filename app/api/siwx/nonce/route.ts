import { NextResponse } from "next/server";

function randomNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function GET() {
  const nonce = randomNonce();
  const isProd = process.env.NODE_ENV === "production";
  const res = NextResponse.json({ nonce });
  res.cookies.set("siwx_nonce", nonce, {
    httpOnly: true,
    sameSite: "lax",
    secure: isProd,
    path: "/",
    maxAge: 10 * 60,
  });
  return res;
}


