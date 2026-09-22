import { NextRequest, NextResponse } from "next/server";
import { authenticatedMember } from "../../../../lib/firebaseAdmin";
import { normalizeTermSnapshots, normalizeWithdrawals, termOrder, validTerm } from "@/lib/membershipHistory";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ studentId: string }> },
) {
  try {
    const authenticated = await authenticatedMember(request.headers.get("authorization"));
    const { studentId } = await context.params;
    if (!authenticated) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    if (!/^\d+$/.test(studentId)) {
      return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
    }
    const { adminAuth, clubRef, members, member: caller } = authenticated;
    if (!caller) return NextResponse.json({ error: "회원 정보를 찾을 수 없습니다." }, { status: 403 });

    const orphanOnly = request.nextUrl.searchParams.get("orphanOnly") === "true";
    const isAdmin = caller.role === "관리자";
    const isSelf = caller.id === studentId;
    if (!isAdmin && !isSelf) {
      return NextResponse.json({ error: "본인 또는 관리자만 계정을 삭제할 수 있습니다." }, { status: 403 });
    }
    if (orphanOnly && !isAdmin) {
      return NextResponse.json({ error: "관리자만 가입 정보를 초기화할 수 있습니다." }, { status: 403 });
    }
    const target = members.find((member) => member.id === studentId);
    const body = await request.json().catch(() => ({})) as { mode?: string; withdrawnTerm?: string };
    const mode = body.mode === "withdraw" ? "withdraw" : "delete";
    if (mode === "withdraw" && (!target || !target.name || !target.joinTerm || !body.withdrawnTerm || !validTerm(body.withdrawnTerm) || !validTerm(target.joinTerm) || termOrder(body.withdrawnTerm) < termOrder(target.joinTerm))) {
      return NextResponse.json({ error: "탈퇴 학기를 확인해주세요." }, { status: 400 });
    }
    if (orphanOnly && target) {
      return NextResponse.json({ error: "현재 회원 목록에 있는 계정입니다. 회원 목록에서 삭제해주세요." }, { status: 409 });
    }
    if (target?.role === "관리자" && members.filter((member) => member.role === "관리자").length === 1) {
      return NextResponse.json({ error: "마지막 관리자 계정은 삭제할 수 없습니다." }, { status: 409 });
    }

    let authDeleted = false;
    try {
      const targetUser = await adminAuth.getUserByEmail(`${studentId}@simgunghoe.local`);
      await adminAuth.deleteUser(targetUser.uid);
      authDeleted = true;
    } catch (error) {
      const code = (error as { code?: string }).code;
      if (code !== "auth/user-not-found") throw error;
    }

    if (!orphanOnly) {
      const latest = await clubRef.get();
      const data = latest.data() || {};
      const historyId = `withdrawn-${crypto.randomUUID()}`;
      const termSnapshots = normalizeTermSnapshots(data.termSnapshots).map((snapshot) => ({
        ...snapshot,
        members: mode === "delete" ? snapshot.members.filter((member) => member.id !== studentId) : snapshot.members.map((member) => member.id === studentId ? { ...member, id: historyId } : member),
      }));
      const withdrawals = normalizeWithdrawals(data.withdrawals);
      if (mode === "withdraw" && target?.name && target.joinTerm) withdrawals.push({ name: target.name, joinTerm: target.joinTerm, withdrawnTerm: body.withdrawnTerm! });
      const practices = Array.isArray(data.practices) ? data.practices.map((practice: {
        applicants?: string[];
        applicantIds?: string[];
        attendeeIds?: string[];
        [key: string]: unknown;
      }) => ({
        ...practice,
        applicants: (practice.applicants || []).filter((name) => name !== target?.name),
        applicantIds: (practice.applicantIds || []).filter((id) => id !== studentId),
        attendeeIds: (practice.attendeeIds || []).filter((id) => id !== studentId),
      })) : [];
      await clubRef.update({
        members: ((Array.isArray(data.members) ? data.members : members) as typeof members).filter((member) => member.id !== studentId),
        termSnapshots,
        withdrawals,
        practices,
      });
    }
    return NextResponse.json({ ok: true, authDeleted });
  } catch (error) {
    console.error("Admin member deletion failed", error);
    const message = error instanceof Error ? error.message : "계정을 삭제하지 못했습니다.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
