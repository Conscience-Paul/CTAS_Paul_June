import type { Metadata } from "next";
import "./globals.css";
import ctdsConfig from "../ctds.config.json";
import { ThemeController, type InitialConfig } from "../components/ctds/ThemeController";
import { themeBootScript } from "../components/ctds/themeBootScript";
import { ToastProvider, ToastViewport } from "../components/ctds/Toast";
import { TooltipProvider } from "../components/ctds/Tooltip";
import { AppShell } from "../components/ctas/AppShell";
import { PreviewProvider } from "../lib/preview-state";

export const metadata: Metadata = {
  title: "CTAS",
  description: "SI/SM 자동화 사내 서비스 — 프리뷰",
};

const config = ctdsConfig as InitialConfig & { appliedAt?: string };

/**
 * ctds.config.json → localStorage 시드.
 * CTDS 부트 스크립트와 ThemeController 는 localStorage 와 OS 다크모드만 보고
 * config 파일은 읽지 않는다(ctds 0.2.5). 그래서 부트 스크립트보다 먼저 실행해
 * 온보딩에서 고른 값을 localStorage 기본값으로 넣는다. 사용자가 런타임에 바꾼 값은
 * 유지되고, config 의 appliedAt 이 바뀌면(온보딩 재적용) config 값으로 다시 덮는다.
 */
function configSeedScript(c: typeof config): string {
  const pairs: [string, unknown][] = [
    ["ctds-mode", c.mode],
    ["ctds-palette", c.palette],
    ["ctds-hue", c.hue],
    ["ctds-accent-hue", c.accentHue ?? ""],
    ["ctds-shape", c.shape],
    ["ctds-density", c.density],
    ["ctds-motion", c.motion],
    ["ctds-icon-family", c.iconFamily],
    ["ctds-lang", c.lang],
    ["ctds-focus-ring", c.focusRing],
    ["ctds-voice", c.voice],
  ];
  const entries = pairs.filter(([, v]) => v !== undefined && v !== null);
  return `(function(){try{
var stamp=${JSON.stringify(c.appliedAt ?? "")};
var force=localStorage.getItem('ctds-config-applied')!==stamp;
var kv=${JSON.stringify(entries)};
for(var i=0;i<kv.length;i++){var k=kv[i][0],v=String(kv[i][1]);if(force||localStorage.getItem(k)===null)localStorage.setItem(k,v);}
localStorage.setItem('ctds-config-applied',stamp);
}catch(e){}})();`;
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang={config.lang ?? "ko"} className="h-full antialiased" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: configSeedScript(config) }} />
        <script dangerouslySetInnerHTML={{ __html: themeBootScript({ onboardingPath: "/ctds" }) }} />
      </head>
      <body className="min-h-full flex flex-col">
        <ThemeController initialConfig={config}>
          <TooltipProvider>
            <ToastProvider>
              <PreviewProvider>
                <AppShell>{children}</AppShell>
              </PreviewProvider>
              <ToastViewport placement="bottom-right" />
            </ToastProvider>
          </TooltipProvider>
        </ThemeController>
      </body>
    </html>
  );
}
