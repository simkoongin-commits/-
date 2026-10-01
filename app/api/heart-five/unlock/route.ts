import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Kept as a compatibility endpoint for older cached clients. Records are now freely readable. */
export async function POST() {
  return NextResponse.json({ ok: true, freeAccess: true });
}
