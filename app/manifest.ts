import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "한양대학교 국궁동아리 심궁회",
    short_name: "심궁회",
    description: "심궁회 교육, 습사, 장비 및 회원 관리",
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#eef9ff",
    theme_color: "#1684c3",
    orientation: "portrait-primary",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
