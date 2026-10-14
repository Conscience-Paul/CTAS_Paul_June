"use client";

/**
 * 대시보드 › 승인 요약 — 승인 대기 총 건수 + 개발·문서·리스크·기타 분포, 날짜 가까운 순 3건.
 * 자세한 건 승인 목록에서. 숫자는 승인 목록·사이드바와 같은 useAllApprovals 기준.
 */

import Link from "next/link";
import { Badge, Button, Icon, ListItem } from "@/components/ctas/ctds";
import { List, Row, Section, Subtle } from "@/components/ctas/ui";
import { useAllApprovals } from "@/components/ctas/useApprovals";
import { APPROVAL_GROUP, APPROVAL_ICON, LABEL, fmtDate, getProject, type Approval } from "@/lib/mock";
import styles from "./ApprovalSummary.module.css";

/** 대시보드에선 네 갈래로만 — 개발 · 문서 · 리스크(리스크 대응) · 기타(요청·일정·대외) */
type Bucket = "dev" | "doc" | "risk" | "etc";
const bucketOf = (a: Approval): Bucket =>
  a.kind === "risk" ? "risk" : APPROVAL_GROUP[a.kind] === "dev" ? "dev" : APPROVAL_GROUP[a.kind] === "doc" ? "doc" : "etc";
const BUCKETS: { key: Bucket; label: string }[] = [
  { key: "dev", label: "개발" },
  { key: "doc", label: "문서" },
  { key: "risk", label: "리스크" },
  { key: "etc", label: "기타" },
];


export function ApprovalSummary({ limit = 3 }: { limit?: number }) {
  const { pending } = useAllApprovals();
  const count = (b: Bucket) => pending.filter((a) => bucketOf(a) === b).length;
  // 날짜 가까운 순 = 요청이 최근인 것부터
  const top = [...pending].sort((a, b) => b.requestedAt.localeCompare(a.requestedAt)).slice(0, limit);

  return (
    <Section
      title="승인 대기"
      icon="check-circle"
      actions={<Button size="xs" variant="ghost" asChild><Link href="/approvals">승인 목록</Link></Button>}
    >
      <Link href="/approvals" className={styles.summary}>
        <span className={styles.total}>{pending.length}<span className={styles.unit}>건</span></span>
        <span className={styles.split}>
          {BUCKETS.map((b) => (
            <span key={b.key} className={styles.bucket}>
              <span className={styles.bucketLabel}>{b.label}</span>
              <span className={styles.bucketCount}>{count(b.key)}</span>
            </span>
          ))}
        </span>
      </Link>
      <List>
        {top.map((a) => (
          <ListItem
            key={a.id}
            href={`/approvals?open=${encodeURIComponent(a.id)}`}
            variant="activity"
            layout="stacked"
            leading={<Icon name={APPROVAL_ICON[a.kind]} size={16} />}
            from={<Row tight><Badge size="sm" variant="soft">{LABEL.approvalKind[a.kind]}</Badge><Subtle>{getProject(a.projectId)?.name}</Subtle></Row>}
            body={a.title}
            meta={fmtDate(a.requestedAt)}
          />
        ))}
      </List>
    </Section>
  );
}
