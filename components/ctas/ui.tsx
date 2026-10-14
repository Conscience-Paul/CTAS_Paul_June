"use client";

/**
 * CTAS 페이지 공통 조각 — CTDS 위에 얹는 얇은 레이아웃 헬퍼.
 * 시각 표현은 ui.module.css 가 토큰으로만 정의한다.
 */

import Link from "next/link";
import { Children, type CSSProperties, type HTMLAttributes, type ReactNode } from "react";
import { Badge, Icon, type IconName } from "@/components/ctas/ctds";
import { cn } from "@/components/ctas/ctds";
import {
  LABEL,
  TONE,
  getMember,
  type MilestoneState,
  type Severity,
  type TaskState,
} from "@/lib/mock";
import styles from "./ui.module.css";

export function Page({ wide, className, ...rest }: HTMLAttributes<HTMLDivElement> & { wide?: boolean }) {
  return <div className={cn(styles.page, wide && styles.pageWide, className)} {...rest} />;
}

export function PageHeader({
  eyebrow,
  title,
  lead,
  actions,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  lead?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className={styles.header}>
      <div className={styles.headerText}>
        {eyebrow && <div className={styles.eyebrow}>{eyebrow}</div>}
        <h1 className={styles.title}>{title}</h1>
        {lead && <p className={styles.lead}>{lead}</p>}
      </div>
      {actions && <div className={styles.actions}>{actions}</div>}
    </div>
  );
}

export function Section({
  title,
  icon,
  hint,
  actions,
  children,
  className,
}: {
  title?: ReactNode;
  icon?: IconName;
  hint?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn(styles.section, className)}>
      {(title || actions) && (
        <div className={styles.sectionHead}>
          <h2 className={styles.sectionTitle}>
            {icon && <Icon name={icon} size={16} />}
            {title}
            {hint && <span className={styles.sectionHint}>{hint}</span>}
          </h2>
          {actions && <div className={styles.actions}>{actions}</div>}
        </div>
      )}
      {children}
    </section>
  );
}

export function Panel({
  subtle,
  flush,
  href,
  className,
  ...rest
}: HTMLAttributes<HTMLDivElement> & { subtle?: boolean; flush?: boolean; href?: string }) {
  const cls = cn(styles.panel, subtle && styles.panelSubtle, flush && styles.panelFlush, href && styles.panelInteractive, className);
  if (href) {
    return <Link href={href} className={cls} {...(rest as object)} />;
  }
  return <div className={cls} {...rest} />;
}

export function Grid({ cols = 2, className, style, ...rest }: HTMLAttributes<HTMLDivElement> & { cols?: number }) {
  return <div className={cn(styles.grid, className)} style={{ ...style, "--cols": cols } as CSSProperties} {...rest} />;
}

export function Split({ even, className, ...rest }: HTMLAttributes<HTMLDivElement> & { even?: boolean }) {
  return <div className={cn(styles.split, even && styles.splitEven, className)} {...rest} />;
}

export function Row({ tight, className, ...rest }: HTMLAttributes<HTMLDivElement> & { tight?: boolean }) {
  return <div className={cn(styles.row, tight && styles.rowTight, className)} {...rest} />;
}

export function Stack({ tight, className, ...rest }: HTMLAttributes<HTMLDivElement> & { tight?: boolean }) {
  return <div className={cn(styles.stack, tight && styles.stackTight, className)} {...rest} />;
}

export function Muted({ className, ...rest }: HTMLAttributes<HTMLSpanElement>) {
  return <span className={cn(styles.muted, className)} {...rest} />;
}
export function Subtle({ className, ...rest }: HTMLAttributes<HTMLSpanElement>) {
  return <span className={cn(styles.subtle, className)} {...rest} />;
}
export function Strong({ className, ...rest }: HTMLAttributes<HTMLSpanElement>) {
  return <span className={cn(styles.strong, className)} {...rest} />;
}
export function Mono({ className, ...rest }: HTMLAttributes<HTMLSpanElement>) {
  return <span className={cn(styles.mono, className)} {...rest} />;
}

export function KV({ items }: { items: { k: ReactNode; v: ReactNode }[] }) {
  return (
    <dl className={styles.kv}>
      {items.map((it, i) => (
        <div key={i} style={{ display: "contents" }}>
          <dt className={styles.kvKey}>{it.k}</dt>
          <dd className={styles.kvVal}>{it.v}</dd>
        </div>
      ))}
    </dl>
  );
}

/** 목 본문 — `**굵게**` 와 `## 헤딩` 정도만 가볍게 처리 */
export function Prose({ text }: { text: string }) {
  const nodes = text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith("**") ? <strong key={i}>{part.slice(2, -2)}</strong> : part,
  );
  return <div className={styles.prose}>{nodes}</div>;
}

export function DividedList({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn(styles.list, className)} {...rest} />;
}

/** TableHeader + TableRow(line) 컨테이너. 테두리 없음 — line 테이블은 페이지 표면에 바로 얹는다. */
export function TableBox({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn(styles.tableBox, className)} {...rest} />;
}

/** ListItem 들을 담는 패널. 각 항목을 여백·hairline 을 가진 row 로 감싼다. */
export function List({ children, className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn(styles.listPanel, className)} {...rest}>
      {Children.map(children, (child) =>
        child === null || child === undefined || child === false ? null : <div className={styles.listRow}>{child}</div>,
      )}
    </div>
  );
}

export function TextLink({ href, children, className }: { href: string; children: ReactNode; className?: string }) {
  return (
    <Link href={href} className={cn(styles.link, className)}>
      {children}
    </Link>
  );
}

export function Center({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn(styles.center, className)} {...rest} />;
}

/* ── 상태 배지 ──────────────────────────────────── */

export function TaskStateBadge({ state }: { state: TaskState }) {
  return (
    <Badge size="sm" variant="soft" status={TONE.taskState[state]}>
      {LABEL.taskState[state]}
    </Badge>
  );
}

export function SeverityBadge({ severity }: { severity: Severity }) {
  return (
    <Badge size="sm" variant="soft" status={TONE.severity[severity]}>
      {LABEL.severity[severity]}
    </Badge>
  );
}

export function MilestoneBadge({ state }: { state: MilestoneState }) {
  return (
    <Badge size="sm" variant="soft" status={TONE.milestoneState[state]}>
      {LABEL.milestoneState[state]}
    </Badge>
  );
}

export function MemberName({ id }: { id: string }) {
  return <>{getMember(id)?.name ?? id}</>;
}
