import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

export type StoredMember = {
  id: string;
  name?: string;
  role: "관리자" | "회원";
  grade?: "예비신사" | "신사" | "구사";
  team?: string;
  position?: string;
};

export const getAdminServices = () => {
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!projectId || !clientEmail || !privateKey) {
    throw new Error("Firebase 관리자 환경 변수가 설정되지 않았습니다.");
  }
  const app = getApps()[0] || initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
  });
  return { adminAuth: getAuth(app), adminDb: getFirestore(app) };
};

export const authenticatedMember = async (authorization: string | null) => {
  const token = authorization?.startsWith("Bearer ") ? authorization.slice(7) : "";
  if (!token) return null;
  const { adminAuth, adminDb } = getAdminServices();
  const decoded = await adminAuth.verifyIdToken(token);
  const studentId = decoded.email?.split("@")[0];
  if (!studentId) return null;
  const clubRef = adminDb.collection("clubs").doc("simgunghoe");
  const snapshot = await clubRef.get();
  const members = (snapshot.data()?.members || []) as StoredMember[];
  return {
    adminAuth,
    adminDb,
    clubRef,
    members,
    member: members.find((item) => item.id === studentId),
  };
};
