"use client";

/**
 * 문서 틀 — 기본은 Drawer, inline 이면 에디터처럼 본문 영역에 문서를 띄운다.
 * 지식 문서함 · 계약문서는 inline, 추적 타임라인 등 다른 화면은 Drawer.
 */

import type { ReactNode } from "react";
import { Drawer, Icon, IconButton, Tooltip } from "@/components/ctas/ctds";
import { Row } from "@/components/ctas/ui";
import styles from "./DocFrame.module.css";

export function DocFrame({ inline, title, description, footer, onClose, children }: { inline?: boolean; title: ReactNode; description?: ReactNode; footer?: ReactNode; onClose: () => void; children: ReactNode }) {
  if (!inline) {
    return (
      // Drawer 의 description 은 <p> 라 배지 묶음(div)을 넣을 수 없다 — 본문 맨 위에 둔다
      <Drawer open onOpenChange={(o) => !o && onClose()} size="lg" title={<Row tight>{title}</Row>} footer={footer}>
        {description && <div className={styles.desc}>{description}</div>}
        {children}
      </Drawer>
    );
  }
  return (
    <article className={styles.frame}>
      <header className={styles.head}>
        <div className={styles.headMain}>
          <h1 className={styles.title}>{title}</h1>
          {description && <div className={styles.desc}>{description}</div>}
        </div>
        <div className={styles.actions}>
          {footer}
          <Tooltip content="닫기">
            <IconButton size="sm" variant="ghost" icon={<Icon name="x" />} aria-label="문서 닫기" onClick={onClose} />
          </Tooltip>
        </div>
      </header>
      <div className={styles.body}>{children}</div>
    </article>
  );
}
