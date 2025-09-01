import { NextResponse } from "next/server";
import { getPublicJwks } from "@/lib/jwt";

export const dynamic = "force-dynamic";

export async function GET() {
  const jwks = await getPublicJwks();
  return NextResponse.json(jwks, { headers: { "cache-control": "public, max-age=300, s-maxage=300" } });
}


