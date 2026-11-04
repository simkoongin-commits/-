import type { Metadata, Viewport } from "next";
import PwaRegistration from "./components/PwaRegistration";
import "./globals.css";

const siteUrl = new URL("https://simkoong.vercel.app");
const siteDescription = "한양대학교 국궁동아리 심궁회의 회원 전용 웹앱입니다. 심궁앱과 심쿵앱으로도 찾아볼 수 있습니다.";
const structuredData = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "심궁회",
  alternateName: ["심궁앱", "심쿵앱"],
  url: siteUrl.href,
  description: siteDescription,
  inLanguage: "ko-KR",
};

export const metadata: Metadata = {
  metadataBase: siteUrl,
  title: "심궁회(심궁앱) | 한양대학교 국궁동아리",
  description: siteDescription,
  keywords: ["심궁회", "심궁앱", "심쿵앱", "한양대학교 국궁동아리", "한양대 국궁"],
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
    title: "심궁회(심궁앱) | 한양대학교 국궁동아리",
    description: siteDescription,
    images: [{ url: "/icon-512.png", width: 512, height: 512, alt: "심궁회" }],
  },
  twitter: {
    card: "summary",
    title: "심궁회(심궁앱) | 한양대학교 국궁동아리",
    description: siteDescription,
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
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
        {children}
        <PwaRegistration />
      </body>
    </html>
  );
}
