import { NextRequest, NextResponse } from "next/server";
import { authenticatedMember } from "@/app/lib/firebaseAdmin";
import { migrateLegacyHeartFiveRecords, recordCollection } from "@/app/lib/heartFiveServer";
import { compareHeartFiveRecords, parseHeartFiveRecord, recordStats } from "@/lib/heartFive";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticatedMember(request.headers.get("authorization"));
    if (!auth?.member) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    await migrateLegacyHeartFiveRecords(auth.adminDb);
    const recordsSnapshot = await recordCollection(auth.adminDb).get();
    const records = recordsSnapshot.docs
      .map((item) => parseHeartFiveRecord(item.id, item.data()))
      .filter((item): item is NonNullable<typeof item> => item !== null)
      .filter((item) => item.ownerUid === auth.uid || (item.finalized && item.shots.length >= 5))
      .sort(compareHeartFiveRecords)
      .map((record) => {
        const own = record.ownerUid === auth.uid;
        const stats = recordStats(record.shots);
        return {
          id: record.id,
          memberId: record.memberId,
          memberName: record.memberName,
          date: record.date,
          place: record.place,
          mode: record.mode,
          finalized: record.finalized,
          createdAt: record.createdAt,
          own,
          unlocked: true,
          completed: record.finalized && record.shots.length >= 5,
          shots: record.shots,
          stats,
          hits: stats.hits,
        };
      });
    return NextResponse.json({ records }, { headers: { "Cache-Control": "private, max-age=10, stale-while-revalidate=30" } });
  } catch (error) {
    console.error("Heart-five record listing failed", error);
    return NextResponse.json({ error: "습사 기록을 확인하지 못했습니다." }, { status: 500 });
  }
}
