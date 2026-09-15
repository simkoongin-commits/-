import { NextRequest, NextResponse } from "next/server";
import { authenticatedMember, type StoredMember } from "../../../../lib/firebaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const canRespond = (member: StoredMember | undefined) => Boolean(
  member && (member.role === "관리자" || member.grade === "구사" || member.team === "홍보팀"),
);

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ questionId: string }> },
) {
  try {
    const authenticated = await authenticatedMember(request.headers.get("authorization"));
    if (!authenticated?.member) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    const { questionId } = await context.params;
    const body = await request.json() as { answer?: string };
    const answer = body.answer?.trim();
    if (!answer || answer.length > 4000) {
      return NextResponse.json({ error: "답변은 1자 이상 4,000자 이하로 입력해주세요." }, { status: 400 });
    }
    const questionRef = authenticated.adminDb.collection("public").doc("simgunghoe").collection("qa").doc(questionId);
    const snapshot = await questionRef.get();
    if (!snapshot.exists) return NextResponse.json({ error: "질문을 찾을 수 없습니다." }, { status: 404 });
    const question = snapshot.data() as { status?: string };
    const isPublished = question.status === "answered";
    if ((isPublished && authenticated.member.role !== "관리자") || (!isPublished && !canRespond(authenticated.member))) {
      return NextResponse.json({ error: isPublished ? "관리자만 공개 답변을 수정할 수 있습니다." : "답변 권한이 없습니다." }, { status: 403 });
    }
    await questionRef.set({
      answer,
      status: "answered",
      answeredBy: authenticated.member.position || authenticated.member.name || "심궁회",
    }, { merge: true });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Q&A answer update failed", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "답변을 저장하지 못했습니다." }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ questionId: string }> },
) {
  try {
    const authenticated = await authenticatedMember(request.headers.get("authorization"));
    if (!authenticated?.member) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    const { questionId } = await context.params;
    const questionRef = authenticated.adminDb.collection("public").doc("simgunghoe").collection("qa").doc(questionId);
    const snapshot = await questionRef.get();
    if (!snapshot.exists) return NextResponse.json({ ok: true });
    const isPublished = snapshot.data()?.status === "answered";
    if ((isPublished && authenticated.member.role !== "관리자") || (!isPublished && !canRespond(authenticated.member))) {
      return NextResponse.json({ error: isPublished ? "관리자만 공개 Q&A를 삭제할 수 있습니다." : "폐기 권한이 없습니다." }, { status: 403 });
    }
    await questionRef.delete();
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Q&A deletion failed", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Q&A를 삭제하지 못했습니다." }, { status: 500 });
  }
}
