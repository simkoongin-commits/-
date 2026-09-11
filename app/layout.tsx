import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "심궁회 습사 일정", description: "한양대학교 국궁동아리 심궁회의 습사 일정과 참가 신청을 관리합니다." };
export default function RootLayout({children}:{children:React.ReactNode}) { return <html lang="ko"><body>{children}</body></html>; }
