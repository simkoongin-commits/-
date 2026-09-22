import { NextRequest, NextResponse } from "next/server";
import { authenticatedMember } from "@/app/lib/firebaseAdmin";
import { recordCollection, walletPoints, walletReference } from "@/app/lib/heartFiveServer";
import { isShotMark, koreanToday, newlyEarnedPoints, parseHeartFiveRecord, type ShotMark } from "@/lib/heartFive";
import { defaultPracticePlaces } from "@/lib/practicePlaces";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const validRecordId = (id: string) => /^heartFive-[a-zA-Z0-9-]{1,90}$/.test(id);
const validDate = (date: unknown): date is string => typeof date === "string"
  && /^\d{4}-\d{2}-\d{2}$/.test(date)
  && !Number.isNaN(new Date(`${date}T00:00:00Z`).valueOf())
  && new Date(`${date}T00:00:00Z`).toISOString().slice(0, 10) === date;

export async function PUT(request: NextRequest, context: { params: Promise<{ recordId: string }> }) {
  try {
    const auth = await authenticatedMember(request.headers.get("authorization"));
    if (!auth?.member) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    const { recordId } = await context.params;
    if (!validRecordId(recordId)) return NextResponse.json({ error: "기록을 확인해주세요." }, { status: 400 });
    const body = await request.json().catch(() => ({})) as { date?: unknown; place?: unknown; mode?: unknown; shots?: unknown };
    if (!validDate(body.date) || typeof body.place !== "string" || !body.place.trim() || body.place.length > 100
      || (body.mode !== undefined && body.mode !== "원사" && body.mode !== "근사")
      || !Array.isArray(body.shots) || body.shots.length < 1 || body.shots.length > 5000 || !body.shots.every(isShotMark)) {
      return NextResponse.json({ error: "날짜, 장소와 시위 기록을 확인해주세요." }, { status: 400 });
    }
    const shots = body.shots as ShotMark[];
    const place = body.place.trim();
    const clubSnapshot = await auth.clubRef.get();
    const storedPlaces = clubSnapshot.data()?.practicePlaces;
    const availablePlaces = Array.isArray(storedPlaces) ? storedPlaces.filter((value): value is string => typeof value === "string") : defaultPracticePlaces;
    const recordRef = recordCollection(auth.adminDb).doc(recordId);
    const wallet = walletReference(auth.adminDb, auth.uid);
    const today = koreanToday();
    const result = await auth.adminDb.runTransaction(async (transaction) => {
      const [currentSnapshot, walletSnapshot] = await Promise.all([transaction.get(recordRef), transaction.get(wallet)]);
      const current = currentSnapshot.exists ? parseHeartFiveRecord(recordId, currentSnapshot.data() || {}) : null;
      if (currentSnapshot.exists && !current) return { error: "기록을 읽을 수 없습니다.", status: 409 };
      if (current && current.ownerUid !== auth.uid) return { error: "본인 기록만 수정할 수 있습니다.", status: 403 };
      if (current && current.date < today) return { error: "지난 날짜의 기록은 수정할 수 없습니다.", status: 403 };
      if (!current && body.date! < today) return { error: "지난 날짜로 새 기록을 추가할 수 없습니다.", status: 400 };
      if (!availablePlaces.includes(place) && current?.place !== place) return { error: "장소 선택지에서 장소를 골라주세요.", status: 400 };
      const alreadyRewarded = currentSnapshot.data()?.rewarded === true;
      const award = newlyEarnedPoints(alreadyRewarded, shots);
      const rewarded = alreadyRewarded || award > 0;
      transaction.set(recordRef, {
        ownerUid: auth.uid,
        memberId: auth.member!.id,
        memberName: auth.member!.name || auth.member!.id,
        date: body.date,
        place,
        mode: body.mode || current?.mode || "원사",
        createdAt: current?.createdAt || new Date().toISOString(),
        shots,
        rewarded,
      });
      if (award) transaction.set(wallet, { points: walletPoints(walletSnapshot.data()?.points) + award }, { merge: true });
      return { ok: true, points: walletPoints(walletSnapshot.data()?.points) + award };
    });
    return NextResponse.json(result, { status: "status" in result ? result.status : 200 });
  } catch (error) {
    console.error("Heart-five autosave failed", error);
    return NextResponse.json({ error: "자동저장에 실패했습니다." }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ recordId: string }> }) {
  try {
    const auth = await authenticatedMember(request.headers.get("authorization"));
    if (!auth?.member) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    const { recordId } = await context.params;
    if (!validRecordId(recordId)) return NextResponse.json({ error: "기록을 확인해주세요." }, { status: 400 });
    const recordRef = recordCollection(auth.adminDb).doc(recordId);
    const result = await auth.adminDb.runTransaction(async (transaction) => {
      const currentSnapshot = await transaction.get(recordRef);
      const current = currentSnapshot.exists ? parseHeartFiveRecord(recordId, currentSnapshot.data() || {}) : null;
      if (!current) return { error: "기록을 찾을 수 없습니다.", status: 404 };
      const isAdmin = auth.member!.role === "관리자";
      if (!isAdmin && current.ownerUid !== auth.uid) return { error: "본인 기록만 삭제할 수 있습니다.", status: 403 };
      if (!isAdmin && current.date < koreanToday()) return { error: "지난 날짜의 기록은 관리자만 삭제할 수 있습니다.", status: 403 };
      const wallet = walletReference(auth.adminDb, current.ownerUid);
      const walletSnapshot = await transaction.get(wallet);
      transaction.delete(recordRef);
      if (currentSnapshot.data()?.rewarded === true) transaction.set(wallet, { points: walletPoints(walletSnapshot.data()?.points) - 2 }, { merge: true });
      return { ok: true };
    });
    return NextResponse.json(result, { status: "status" in result ? result.status : 200 });
  } catch (error) {
    console.error("Heart-five record deletion failed", error);
    return NextResponse.json({ error: "기록을 삭제하지 못했습니다." }, { status: 500 });
  }
}
