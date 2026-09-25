import { NextRequest, NextResponse } from "next/server";
import { authenticatedMember } from "@/app/lib/firebaseAdmin";
import { normalizeSignupName, normalizeSignupPermissions } from "@/lib/signupPermissions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const requireAdmin = async (request: NextRequest) => {
  const authenticated = await authenticatedMember(request.headers.get("authorization"));
  if (!authenticated?.member || authenticated.member.role !== "관리자") return null;
  return authenticated;
};

export async function POST(request: NextRequest) {
  try {
    const authenticated = await requireAdmin(request);
    if (!authenticated) return NextResponse.json({ error: "관리자만 설정할 수 있습니다." }, { status: 403 });
    const body = await request.json() as Partial<{ studentId: string; name: string }>;
    const studentId = body.studentId?.trim() || "";
    const name = normalizeSignupName(body.name || "");
    if (!/^\d+$/.test(studentId) || !name) {
      return NextResponse.json({ error: "이름과 학번을 확인해주세요." }, { status: 400 });
    }
    await authenticated.adminDb.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(authenticated.clubRef);
      const data = snapshot.data() || {};
      const permissions = normalizeSignupPermissions(data.signupPermissions);
      const members = Array.isArray(data.members) ? data.members : [];
      if (members.some((member) => member?.id === studentId)) throw new Error("existing-member");
      if (permissions.some((item) => item.studentId === studentId)) throw new Error("existing-permission");
      transaction.set(authenticated.clubRef, {
        signupPermissions: [...permissions, { studentId, name, createdAt: new Date().toISOString() }],
      }, { merge: true });
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "existing-member") return NextResponse.json({ error: "이미 가입한 학번입니다." }, { status: 409 });
    if (message === "existing-permission") return NextResponse.json({ error: "이미 가입 허용 명단에 있는 학번입니다." }, { status: 409 });
    console.error("Signup permission creation failed", error);
    return NextResponse.json({ error: "가입 허용 정보를 저장하지 못했어요." }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const authenticated = await requireAdmin(request);
    if (!authenticated) return NextResponse.json({ error: "관리자만 설정할 수 있습니다." }, { status: 403 });
    const studentId = request.nextUrl.searchParams.get("studentId")?.trim() || "";
    if (!/^\d+$/.test(studentId)) return NextResponse.json({ error: "학번을 확인해주세요." }, { status: 400 });
    await authenticated.adminDb.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(authenticated.clubRef);
      const permissions = normalizeSignupPermissions(snapshot.data()?.signupPermissions);
      transaction.set(authenticated.clubRef, {
        signupPermissions: permissions.filter((item) => item.studentId !== studentId),
      }, { merge: true });
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Signup permission deletion failed", error);
    return NextResponse.json({ error: "가입 허용 정보를 삭제하지 못했어요." }, { status: 500 });
  }
}
