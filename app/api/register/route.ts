import { NextRequest, NextResponse } from "next/server";
import { getAdminServices } from "@/app/lib/firebaseAdmin";
import { gradeFor } from "@/lib/members";
import { validTerm } from "@/lib/membershipHistory";
import { availableSignupPermission, normalizeSignupName, normalizeSignupPermissions } from "@/lib/signupPermissions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  let createdUid = "";
  try {
    const body = await request.json() as Partial<{
      studentId: string;
      password: string;
      name: string;
      joinTerm: string;
    }>;
    const studentId = body.studentId?.trim() || "";
    const password = body.password || "";
    const name = normalizeSignupName(body.name || "");
    const joinTerm = body.joinTerm?.trim() || "";
    if (!/^\d+$/.test(studentId) || password.length < 6 || !name || !validTerm(joinTerm)) {
      return NextResponse.json({ error: "가입 정보를 다시 확인해주세요." }, { status: 400 });
    }

    const { adminAuth, adminDb } = await getAdminServices();
    const clubRef = adminDb.collection("clubs").doc("simgunghoe");
    const before = await clubRef.get();
    if (!before.exists) return NextResponse.json({ error: "가입 준비가 완료되지 않았어요." }, { status: 503 });
    const permissions = normalizeSignupPermissions(before.data()?.signupPermissions);
    if (!availableSignupPermission(permissions, studentId, name)) {
      return NextResponse.json({ error: "관리자가 가입을 허용한 이름과 학번이 아닙니다." }, { status: 403 });
    }

    const user = await adminAuth.createUser({
      email: `${studentId}@simgunghoe.local`,
      password,
      displayName: name,
    });
    createdUid = user.uid;
    await adminDb.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(clubRef);
      const data = snapshot.data() || {};
      const latestPermissions = normalizeSignupPermissions(data.signupPermissions);
      if (!availableSignupPermission(latestPermissions, studentId, name)) {
        throw new Error("signup-permission-used");
      }
      const members = Array.isArray(data.members) ? data.members : [];
      if (members.some((member) => member?.id === studentId)) throw new Error("duplicate-member");
      const currentTerm = typeof data.currentTerm === "string" ? data.currentTerm : "26-2";
      const member = {
        id: studentId,
        name,
        joinTerm,
        grade: gradeFor(joinTerm, currentTerm),
        role: "회원",
        position: "",
      };
      const usedAt = new Date().toISOString();
      transaction.set(clubRef, {
        members: [...members, member],
        signupPermissions: latestPermissions.map((item) => item.studentId === studentId
          ? { ...item, usedAt, usedBy: user.uid }
          : item),
      }, { merge: true });
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (createdUid) {
      try {
        const { adminAuth } = await getAdminServices();
        await adminAuth.deleteUser(createdUid);
      } catch (rollbackError) {
        console.error("Registration rollback failed", rollbackError);
      }
    }
    const code = (error as { code?: string }).code;
    const message = error instanceof Error ? error.message : "";
    if (code === "auth/email-already-exists" || message === "duplicate-member") {
      return NextResponse.json({ error: "이미 가입된 학번입니다. 로그인해주세요." }, { status: 409 });
    }
    if (message === "signup-permission-used") {
      return NextResponse.json({ error: "이미 사용된 가입 허용 정보입니다." }, { status: 409 });
    }
    console.error("Member registration failed", error);
    return NextResponse.json({ error: "회원가입을 완료하지 못했어요. 잠시 후 다시 시도해주세요." }, { status: 500 });
  }
}
