import { NextRequest, NextResponse } from "next/server";
import { authenticatedMember } from "@/app/lib/firebaseAdmin";
import { recordCollection, walletPoints, walletReference } from "@/app/lib/heartFiveServer";
import { parseHeartFiveRecord } from "@/lib/heartFive";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticatedMember(request.headers.get("authorization"));
    if (!auth?.member) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    const body = await request.json().catch(() => ({})) as { recordId?: unknown };
    if (typeof body.recordId !== "string" || !/^heartFive-[a-zA-Z0-9-]{1,90}$/.test(body.recordId)) {
      return NextResponse.json({ error: "기록을 확인해주세요." }, { status: 400 });
    }
    const wallet = walletReference(auth.adminDb, auth.uid);
    const unlock = wallet.collection("unlocks").doc(body.recordId);
    const recordRef = recordCollection(auth.adminDb).doc(body.recordId);
    const result = await auth.adminDb.runTransaction(async (transaction) => {
      const [recordSnapshot, walletSnapshot, unlockSnapshot] = await Promise.all([
        transaction.get(recordRef), transaction.get(wallet), transaction.get(unlock),
      ]);
      const record = recordSnapshot.exists ? parseHeartFiveRecord(recordSnapshot.id, recordSnapshot.data() || {}) : null;
      if (!record || !record.finalized || record.shots.length < 5) return { error: "열람할 기록이 없습니다.", status: 404 };
      if (record.ownerUid === auth.uid || unlockSnapshot.exists) return { ok: true, points: walletPoints(walletSnapshot.data()?.points) };
      const balance = walletPoints(walletSnapshot.data()?.points);
      if (balance < 1) return { error: "포인트가 부족합니다.", status: 409 };
      transaction.set(wallet, { points: balance - 1 }, { merge: true });
      transaction.create(unlock, { recordId: body.recordId, unlockedAt: new Date().toISOString() });
      return { ok: true, points: balance - 1 };
    });
    return NextResponse.json(result, { status: "status" in result ? result.status : 200 });
  } catch (error) {
    console.error("Heart-five unlock failed", error);
    return NextResponse.json({ error: "기록 열람에 실패했습니다." }, { status: 500 });
  }
}
