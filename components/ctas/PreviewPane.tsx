"use client";

/**
 * 미리보기 패널 — Codex 식 오른쪽 웹뷰. localhost 로 띄운 개발 서버나 배포 환경을
 * 앱 안에서 바로 본다. URL 입력 · 새로고침 · 외부 브라우저 열기. 프리셋은 목.
 */

import { useState } from "react";
import { Button, Icon, IconButton, Input } from "@/components/ctas/ctds";
import { usePreview } from "@/lib/preview-state";
import styles from "./PreviewPane.module.css";

const PRESETS = [
  { label: "CTAS (dev)", url: "http://localhost:3000" },
  { label: "한빛 재고관리 (dev)", url: "http://localhost:5173" },
  { label: "세종 포털 (staging)", url: "http://localhost:8080" },
];

export function PreviewPane() {
  const { previewUrl, setPreviewUrl, closePreview } = usePreview();
  const [draft, setDraft] = useState(previewUrl);
  const [nonce, setNonce] = useState(0);
  const [loaded, setLoaded] = useState(false);

  const go = (url: string) => {
    const u = url.trim() || "http://localhost:3000";
    setDraft(u);
    setPreviewUrl(u);
    setLoaded(false);
    setNonce((n) => n + 1);
  };

  return (
    <div className={styles.root}>
      <div className={styles.bar}>
        <Icon name="devices" size={16} />
        <Input
          size="sm"
          className={styles.url}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") go(draft); }}
          placeholder="http://localhost:3000"
          aria-label="미리보기 URL"
        />
        <IconButton size="sm" variant="ghost" icon={<Icon name="circle-notch" />} aria-label="새로고침" onClick={() => go(draft)} />
        <IconButton size="sm" variant="ghost" icon={<Icon name="arrow-square-out" />} aria-label="브라우저에서 열기" onClick={() => window.open(previewUrl, "_blank", "noopener")} />
        <IconButton size="sm" variant="ghost" icon={<Icon name="x" />} aria-label="미리보기 닫기" onClick={closePreview} />
      </div>
      <div className={styles.presets}>
        {PRESETS.map((p) => (
          <Button key={p.url} size="xs" variant={previewUrl === p.url ? "secondary" : "ghost"} onClick={() => go(p.url)}>{p.label}</Button>
        ))}
      </div>
      <div className={styles.frameWrap}>
        {!loaded && (
          <div className={styles.hint}>
            <Icon name="devices" size={24} />
            <span>{previewUrl} 을 불러오는 중…</span>
            <span>응답이 없으면 해당 포트에 서버가 떠 있는지 확인하세요.</span>
          </div>
        )}
        <iframe
          key={nonce}
          className={styles.frame}
          src={previewUrl}
          title="미리보기"
          onLoad={() => setLoaded(true)}
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
        />
      </div>
    </div>
  );
}
