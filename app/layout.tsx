import type { Metadata, Viewport } from "next";
import PwaRegistration from "./components/PwaRegistration";
import "./globals.css";

const siteUrl = new URL("https://simkoong.vercel.app");

export const metadata: Metadata = {
  metadataBase: siteUrl,
  title: "심궁회 | 한양대학교 국궁동아리",
  description: "한양대학교 국궁동아리 심궁회의 회원 활동과 장비, 일정을 관리하는 공식 웹사이트입니다.",
  alternates: {
    canonical: "/",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "ko_KR",
    url: "/",
    siteName: "심궁회",
    title: "심궁회 | 한양대학교 국궁동아리",
    description: "한양대학교 국궁동아리 심궁회의 공식 웹사이트입니다.",
    images: [{ url: "/icon-512.png", width: 512, height: 512, alt: "심궁회" }],
  },
  twitter: {
    card: "summary",
    title: "심궁회 | 한양대학교 국궁동아리",
    description: "한양대학교 국궁동아리 심궁회의 공식 웹사이트입니다.",
    images: ["/icon-512.png"],
  },
  verification: process.env.GOOGLE_SITE_VERIFICATION
    ? { google: process.env.GOOGLE_SITE_VERIFICATION }
    : undefined,
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icon-192.png", sizes: "192x192", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "심궁회",
  },
};

export const viewport: Viewport = {
  themeColor: "#1684c3",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>
        {children}
        <PwaRegistration />
      </body>
    </html>
  );
}
