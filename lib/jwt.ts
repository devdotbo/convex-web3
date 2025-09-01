import { cookies } from "next/headers";
import { SignJWT, exportJWK, importJWK, generateKeyPair } from "jose";

type PrivateJwk = {
  kty: string;
  crv?: string;
  d?: string;
  x?: string;
  y?: string;
  kid?: string;
  alg?: string;
};

declare global {
  var __JWT_PRIVATE_JWK__: PrivateJwk | undefined;
}

const DEFAULT_KID = "app-key-1";

async function ensureKey(): Promise<PrivateJwk> {
  if (global.__JWT_PRIVATE_JWK__) return global.__JWT_PRIVATE_JWK__;

  const envJwk = process.env.JWT_PRIVATE_JWK;
  if (envJwk) {
    try {
      const jwk = JSON.parse(envJwk) as PrivateJwk;
      if (!jwk.kid) jwk.kid = DEFAULT_KID;
      global.__JWT_PRIVATE_JWK__ = jwk;
      return jwk;
    } catch {
      console.error("Invalid JWT_PRIVATE_JWK env var; falling back to ephemeral key.");
    }
  }

  const { privateKey } = await generateKeyPair("ES256");
  const priv = (await exportJWK(privateKey)) as PrivateJwk;
  priv.kid = DEFAULT_KID;
  // Store only private; public part will be derived on demand
  global.__JWT_PRIVATE_JWK__ = priv;
  console.warn("Generated ephemeral ES256 key for JWTs. Set JWT_PRIVATE_JWK in .env for persistence.");
  return priv;
}

export async function getPublicJwks() {
  const privJwk = await ensureKey();
  const pub: PrivateJwk = { ...privJwk };
  delete pub.d;
  return { keys: [pub] };
}

export async function signAuthJwt(params: {
  subject: string; // CAIP-10 subject e.g. eip155:1:0xabc
  issuer: string; // e.g. https://your-app.com
  audience: string; // applicationID configured in Convex
  expiresInSeconds?: number;
  additionalClaims?: Record<string, unknown>;
}) {
  const { subject, issuer, audience, expiresInSeconds = 15 * 60, additionalClaims = {} } = params;
  const now = Math.floor(Date.now() / 1000);
  const privJwk = await ensureKey();
  const alg = "ES256";
  const kid = privJwk.kid || DEFAULT_KID;
  const key = await importJWK(privJwk, alg);

  const jwt = await new SignJWT({ ...additionalClaims })
    .setProtectedHeader({ alg, kid, typ: "JWT" })
    .setSubject(subject)
    .setIssuer(issuer)
    .setAudience(audience)
    .setIssuedAt(now)
    .setExpirationTime(now + expiresInSeconds)
    .sign(key);

  return jwt;
}

export async function setAuthCookie(token: string) {
  const c = await cookies();
  const isProd = process.env.NODE_ENV === "production";
  c.set("auth_token", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: isProd,
    path: "/",
    maxAge: 15 * 60,
    priority: "high",
  });
}

export async function clearAuthCookie() {
  const c = await cookies();
  c.delete("auth_token");
}


