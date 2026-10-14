import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* Tauri 는 out/ 의 정적 파일을 자체 프로토콜로 서빙 — 서버 없는 정적 내보내기.
     동적 라우트는 각 page.tsx 의 generateStaticParams 가 목데이터 id 로 미리 생성. */
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
  turbopack: {
    rules: {
      "*.css": {
        // `as: "*.css"` would turn CSS Modules into global CSS, so skip them.
        condition: { not: { path: /\.module\.css$/ } },
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
