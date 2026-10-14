"use client";

/**
 * 대시보드 › 타임라인 요약 — 시간축 하나에 다가오는 마일스톤(위) · 지금 · 어제·오늘 한 일(아래).
 * 둘 다 운영 › 타임라인으로 이어지므로 카드 하나로 합쳤다.
 */

import Link from "next/link";
import { Button, Icon } from "@/components/ctas/ctds";
import { MilestoneBadge, Section } from "@/components/ctas/ui";
import { NOTIFICATION_ICON, daysUntil, fmtDate, getProject, milestones, notifications } from "@/lib/mock";
import styles from "./TimelineSummary.module.css";

const dday = (iso: string) => {
  const d = daysUntil(iso);
  return d < 0 ? `${-d}일 지남` : d === 0 ? "오늘" : `D-${d}`;
};
const when = (iso: string) => {
  const d = daysUntil(iso.slice(0, 10));
  return `${d === 0 ? "오늘" : d === -1 ? "어제" : fmtDate(iso)} ${iso.slice(11, 16)}`;
};

export function TimelineSummary({ ahead = 3, behind = 5 }: { ahead?: number; behind?: number }) {
  // 다가오는 것 — 끝나지 않은 마일스톤, 먼 것이 위로 오도록(시간축이 위=미래)
  const upcoming = milestones
    .filter((m) => m.state !== "done")
    .sort((a, b) => a.due.localeCompare(b.due))
    .slice(0, ahead)
    .reverse();
  // 지난 일 — 최근 활동부터
  const recent = [...notifications].sort((a, b) => b.at.localeCompare(a.at)).slice(0, behind);

  return (
    <Section title="타임라인" icon="line-segments" hint="다가오는 일 · 지난 일" actions={<Button size="xs" variant="ghost" asChild><Link href="/ops/milestones">타임라인</Link></Button>}>
      <ol className={styles.axis}>
        {upcoming.map((m) => (
          <li key={m.id} className={styles.item} data-side="ahead">
            <Link href="/ops/milestones" className={styles.row}>
              <span className={styles.when}>{dday(m.due)}</span>
              <span className={styles.dot} aria-hidden />
              <span className={styles.body}>
                <span className={styles.title}><MilestoneBadge state={m.state} />{m.title}</span>
                <span className={styles.sub}>{getProject(m.projectId)?.name} · {fmtDate(m.due)}</span>
              </span>
            </Link>
          </li>
        ))}

        <li className={styles.now} aria-label="지금">
          <span className={styles.when}>지금</span>
          <span className={styles.nowLine} aria-hidden />
        </li>

        {recent.map((n) => (
          <li key={n.id} className={styles.item} data-side="behind">
            <Link href={n.href} className={styles.row}>
              <span className={styles.when}>{when(n.at)}</span>
              <span className={styles.dot} aria-hidden><Icon name={NOTIFICATION_ICON[n.kind]} size={12} /></span>
              <span className={styles.body}>
                <span className={styles.title}>{n.title}</span>
                <span className={styles.sub}>{n.body}</span>
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </Section>
  );
}
