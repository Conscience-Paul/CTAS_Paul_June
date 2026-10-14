"use client";

/**
 * 운영 › 인사이트 › 현재 운영 현황 — 대시보드에서 옮겨 온 차트.
 * 프로젝트 진행률 · 업무 상태 분포 · 열린 리스크 종류 · 담당자 부하 · 다가오는 마일스톤.
 */

import Link from "next/link";
import { Badge, ListItem } from "@/components/ctas/ctds";
import { Grid, List, MilestoneBadge, Panel, Row, Section, Stack, Strong, Subtle } from "@/components/ctas/ui";
import {
  LABEL,
  byProject,
  daysUntil,
  fmtDate,
  getMember,
  getProject,
  members,
  milestones,
  projects,
  risks,
  tasks,
  type RiskKind,
  type TaskState,
} from "@/lib/mock";
import { usePreview } from "@/lib/preview-state";
import styles from "../../dashboard.module.css";

const SEV_ORDER = ["critical", "high", "medium", "low"];

/* 업무 상태 → 표시 그룹 (상태색은 라벨과 함께) */
const STATE_GROUPS: { key: string; label: string; states: TaskState[]; tone: keyof typeof styles }[] = [
  { key: "done", label: "완료·검증", states: ["done", "verified"], tone: "success" },
  { key: "active", label: "진행·검토", states: ["in_progress", "pending_review"], tone: "info" },
  { key: "ready", label: "신규·분류", states: ["new", "triaged", "preflight"], tone: "muted" },
  { key: "blocked", label: "차단", states: ["blocked"], tone: "destructive" },
];

export function OpsOverview() {
  const { riskStatus } = usePreview();
  const openRisks = risks.filter((r) => (riskStatus[r.id] ?? r.status) === "open");

  // 업무 상태 분포 (전체)
  const groupCounts = STATE_GROUPS.map((g) => ({ ...g, n: tasks.filter((t) => g.states.includes(t.state)).length }));
  const total = tasks.length;

  // 리스크 종류 분포
  const riskKinds = (Object.keys(LABEL.riskKind) as RiskKind[])
    .map((k) => ({ k, n: openRisks.filter((r) => r.kind === k).length }))
    .filter((x) => x.n > 0)
    .sort((a, b) => b.n - a.n);
  const riskMax = Math.max(1, ...riskKinds.map((x) => x.n));

  // 담당자 부하
  const load = members
    .filter((m) => m.role !== "viewer")
    .map((m) => {
      const mine = tasks.filter((t) => t.ownerId === m.id && t.state !== "done" && t.state !== "verified" && t.state !== "wont_do");
      return { m, open: mine.length, blocked: mine.filter((t) => t.state === "blocked").length };
    })
    .sort((a, b) => b.open - a.open);
  const loadMax = Math.max(1, ...load.map((x) => x.open));

  // 다가오는 마일스톤 (14일)
  const upcoming = milestones
    .filter((m) => m.state !== "done" && daysUntil(m.due) <= 14)
    .sort((a, b) => a.due.localeCompare(b.due));

  return (
    <>
      <Grid cols={2}>
        <Section title="프로젝트별 진행률" icon="squares-four" hint="업무 기준">
          <Panel>
            <div className={styles.legend} role="list" aria-label="범례">
              <span className={styles.legendItem} role="listitem"><span className={`${styles.swatch} ${styles.success}`} />완료</span>
              <span className={styles.legendItem} role="listitem"><span className={`${styles.swatch} ${styles.info}`} />진행</span>
              <span className={styles.legendItem} role="listitem"><span className={`${styles.swatch} ${styles.muted}`} />대기</span>
              <span className={styles.legendItem} role="listitem"><span className={`${styles.swatch} ${styles.destructive}`} />차단</span>
            </div>
            <div className={styles.chart}>
              {projects.map((p) => {
                const t = byProject.tasks(p.id);
                const seg = STATE_GROUPS.map((g) => ({ g, n: t.filter((x) => g.states.includes(x.state)).length }));
                const done = seg[0].n;
                return (
                  <div key={p.id} className={styles.row} title={`${p.name}: ${seg.map((s) => `${s.g.label} ${s.n}`).join(" · ")}`}>
                    <Link href={`/projects/${p.id}`} className={styles.label}>{p.name}</Link>
                    <div className={styles.track} role="img" aria-label={`${p.name} 완료 ${done}/${t.length}`}>
                      {seg.filter((s) => s.n > 0).map((s) => (
                        <span key={s.g.key} className={`${styles.seg} ${styles[s.g.tone]}`} style={{ flex: s.n }} />
                      ))}
                      {t.length === 0 && <span className={`${styles.seg} ${styles.subtle}`} style={{ flex: 1 }} />}
                    </div>
                    <span className={styles.value}>{done}/{t.length}</span>
                  </div>
                );
              })}
            </div>
          </Panel>
        </Section>

        <Section title="업무 상태 분포" icon="list" hint={`전체 ${total}건`}>
          <Panel>
            <div className={styles.stack} role="img" aria-label={groupCounts.map((g) => `${g.label} ${g.n}`).join(", ")}>
              {groupCounts.filter((g) => g.n > 0).map((g) => (
                <span key={g.key} className={`${styles.stackSeg} ${styles[g.tone]}`} style={{ flex: g.n }} title={`${g.label} ${g.n}`} />
              ))}
            </div>
            <div className={styles.counts}>
              {groupCounts.map((g) => (
                <span key={g.key} className={styles.count}>
                  <span className={`${styles.swatch} ${styles[g.tone]}`} />
                  {g.label} <span className={styles.countNum}>{g.n}</span>
                </span>
              ))}
            </div>
            <Subtle>차단 {groupCounts[3].n}건 중 고객 응답 대기 {tasks.filter((t) => t.blockedReason?.includes("고객")).length}건</Subtle>
          </Panel>
        </Section>
      </Grid>

      <Grid cols={2}>
        <Section title="열린 리스크 종류" icon="warning-circle" hint={`${openRisks.length}건`}>
          <Panel>
            <div className={styles.chart}>
              {riskKinds.map((x) => (
                <div key={x.k} className={styles.row}>
                  <span className={styles.label}>{LABEL.riskKind[x.k]}</span>
                  <div className={styles.track}>
                    <span className={`${styles.seg} ${styles.primary}`} style={{ width: `${(x.n / riskMax) * 100}%` }} />
                  </div>
                  <span className={styles.value}>{x.n}</span>
                </div>
              ))}
            </div>
            <Row tight>
              {SEV_ORDER.map((s) => {
                const n = openRisks.filter((r) => r.severity === s).length;
                return n > 0 ? <Badge key={s} size="sm" variant="soft" status={s === "critical" ? "destructive" : s === "high" ? "warning" : s === "medium" ? "info" : undefined}>{LABEL.severity[s as keyof typeof LABEL.severity]} {n}</Badge> : null;
              })}
            </Row>
          </Panel>
        </Section>

        <Section title="담당자 부하" icon="user" hint="열린 업무 수">
          <Panel>
            <div className={styles.chart}>
              {load.map(({ m, open, blocked }) => (
                <div key={m.id} className={styles.row} title={`${m.name}: 열린 업무 ${open}, 차단 ${blocked}`}>
                  <span className={styles.label}>{m.name} <Subtle>{LABEL.role[m.role]}</Subtle></span>
                  <div className={styles.track}>
                    {open - blocked > 0 && <span className={`${styles.seg} ${styles.primary}`} style={{ width: `${((open - blocked) / loadMax) * 100}%` }} />}
                    {blocked > 0 && <span className={`${styles.seg} ${styles.destructive}`} style={{ width: `${(blocked / loadMax) * 100}%` }} />}
                  </div>
                  <span className={styles.value}>{open}{blocked > 0 ? ` (차단 ${blocked})` : ""}</span>
                </div>
              ))}
            </div>
          </Panel>
        </Section>
      </Grid>

      <Section title="다가오는 마일스톤" icon="calendar-dots" hint="14일 이내">
        <List>
          {upcoming.map((m) => {
            const d = daysUntil(m.due);
            const linked = m.taskIds.length;
            const linkedDone = m.taskIds.filter((id) => { const t = tasks.find((x) => x.id === id); return t && (t.state === "done" || t.state === "verified"); }).length;
            return (
              <ListItem
                key={m.id}
                href={`/projects/${m.projectId}`}
                variant="activity"
                leading={<MilestoneBadge state={m.state} />}
                body={<Stack tight><Strong>{m.title}</Strong><Subtle>{getProject(m.projectId)?.name} · {getMember(m.ownerId)?.name}{linked > 0 && ` · 연결 업무 ${linkedDone}/${linked}`}</Subtle></Stack>}
                meta={`${fmtDate(m.due)} · ${d < 0 ? `${-d}일 지남` : d === 0 ? "오늘" : `D-${d}`}`}
              />
            );
          })}
        </List>
      </Section>
    </>
  );
}
