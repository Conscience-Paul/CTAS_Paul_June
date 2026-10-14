"use client";

/**
 * 대시보드.
 *  - 오늘: 내가 결정할 것 — 승인 대기 · 리스크 상위 · 지연 마일스톤
 *  - 운영 현황: 프로젝트 진행률 · 업무 상태 분포 · 리스크 분포 · 담당자 부하 · 다가오는 마일스톤
 */

import Link from "next/link";
import { useState } from "react";
import { Badge, Button, Icon, ListItem, MetricCard, Tabs } from "@/components/ctas/ctds";
import {
  Grid,
  MilestoneBadge,
  Muted,
  Page,
  PageHeader,
  Panel,
  Row,
  Section,
  SeverityBadge,
  Stack,
  Strong,
  Subtle, List } from "@/components/ctas/ui";
import {
  LABEL,
  approvals,
  byProject,
  daysUntil,
  fmtDate,
  getMember,
  getProject,
  members,
  milestones,
  projectCustomer,
  projects,
  risks,
  tasks,
  type RiskKind,
  type TaskState,
} from "@/lib/mock";
import { usePreview } from "@/lib/preview-state";
import styles from "./dashboard.module.css";

const approvalIcon = { triage: "tag", preflight: "steps", result: "seal-check", customer_send: "envelope" } as const;
const SEV_ORDER = ["critical", "high", "medium", "low"];

/* 업무 상태 → 표시 그룹 (상태색은 라벨과 함께) */
const STATE_GROUPS: { key: string; label: string; states: TaskState[]; tone: keyof typeof styles }[] = [
  { key: "done", label: "완료·검증", states: ["done", "verified"], tone: "success" },
  { key: "active", label: "진행·검토", states: ["in_progress", "pending_review"], tone: "info" },
  { key: "ready", label: "신규·분류", states: ["new", "triaged", "preflight"], tone: "muted" },
  { key: "blocked", label: "차단", states: ["blocked"], tone: "destructive" },
];

export default function Dashboard() {
  const { approvalDecisions, riskStatus, askAi } = usePreview();
  const [tab, setTab] = useState("today");

  const pending = approvals.filter((a) => (approvalDecisions[a.id] ?? a.state) === "pending");
  const openRisks = risks
    .filter((r) => (riskStatus[r.id] ?? r.status) === "open")
    .sort((a, b) => SEV_ORDER.indexOf(a.severity) - SEV_ORDER.indexOf(b.severity));
  const lateMilestones = milestones.filter((m) => m.state === "at_risk" || m.state === "missed" || (m.state === "planned" && daysUntil(m.due) <= 7));
  const active = projects.filter((p) => p.stage !== "acceptance");

  return (
    <Page>
      <PageHeader
        eyebrow={<>2026년 10월 13일 (월) · 프리뷰 기준일</>}
        title="대시보드"
        lead="결정이 필요한 것은 「오늘」에, 전체 흐름은 「운영 현황」에."
        actions={
          <Button size="sm" variant="outline" leftIcon={<Icon name="chat-circle" />} onClick={() => askAi("오늘 내가 결정해야 할 것")}>
            오늘 뭘 결정해야 하지?
          </Button>
        }
      />

      <Grid cols={4}>
        <MetricCard label="승인 대기" value={pending.length} icon="check-circle" description="내 결정이 필요한 것" href="/approvals" />
        <MetricCard label="열린 리스크" value={openRisks.length} icon="warning-circle" trend="up" deltaLabel="+2 이번 주" />
        <MetricCard label="지연 위험 마일스톤" value={lateMilestones.length} icon="calendar-dots" description="7일 이내 · 위험" />
        <MetricCard label="진행 중 프로젝트" value={active.length} icon="squares-four" description={`SI ${active.filter((p) => p.kind === "SI").length} · SM ${active.filter((p) => p.kind === "SM").length}`} />
      </Grid>

      <Tabs value={tab} onValueChange={setTab} variant="underline" size="md">
        <Tabs.List aria-label="대시보드 보기">
          <Tabs.Trigger value="today" leadingIcon={<Icon name="check-circle" />}>오늘</Tabs.Trigger>
          <Tabs.Trigger value="ops" leadingIcon={<Icon name="chart-line" />}>운영 현황</Tabs.Trigger>
        </Tabs.List>

        <Tabs.Panel value="today">
          <Stack style={{ gap: "var(--space-6)", paddingTop: "var(--space-4)" }}>
            <Grid cols={2}>
              <Section title="승인 대기" icon="check-circle" hint={`${pending.length}건`} actions={<Button size="xs" variant="ghost" asChild><Link href="/approvals">전체</Link></Button>}>
                <List>
                  {pending.slice(0, 4).map((a) => (
                    <ListItem
                      key={a.id}
                      href="/approvals"
                      variant="activity"
                      layout="stacked"
                      leading={<Icon name={approvalIcon[a.kind]} size={16} />}
                      from={<Row tight><Badge size="sm" variant="soft">{LABEL.approvalKind[a.kind]}</Badge><Subtle>{getProject(a.projectId)?.name}</Subtle></Row>}
                      body={a.title}
                      meta={fmtDate(a.requestedAt)}
                    />
                  ))}
                </List>
              </Section>

              <Section title="리스크 상위" icon="warning-circle" hint="열린 것, 심각도순">
                <List>
                  {openRisks.slice(0, 4).map((r) => (
                    <ListItem
                      key={r.id}
                      href={`/projects/${r.projectId}/risks`}
                      variant="activity"
                      layout="stacked"
                      leading={<SeverityBadge severity={r.severity} />}
                      from={<Subtle>{LABEL.riskKind[r.kind]} · {getProject(r.projectId)?.name}</Subtle>}
                      body={r.title}
                      meta={fmtDate(r.detectedAt)}
                    />
                  ))}
                </List>
              </Section>
            </Grid>

            <Grid cols={2}>
              <Section title="지연 위험 마일스톤" icon="calendar-dots">
                <List>
                  {lateMilestones.map((m) => {
                    const d = daysUntil(m.due);
                    return (
                      <ListItem
                        key={m.id}
                        href={`/projects/${m.projectId}`}
                        variant="activity"
                        leading={<MilestoneBadge state={m.state} />}
                        body={<Stack tight><Strong>{m.title}</Strong><Subtle>{getProject(m.projectId)?.name} · {getMember(m.ownerId)?.name}</Subtle></Stack>}
                        meta={d < 0 ? `${-d}일 지남` : d === 0 ? "오늘" : `D-${d}`}
                      />
                    );
                  })}
                </List>
              </Section>

              <Section title="프로젝트" icon="squares-four">
                <Stack>
                  {active.map((p) => {
                    const t = byProject.tasks(p.id);
                    const blocked = t.filter((x) => x.state === "blocked").length;
                    const done = t.filter((x) => x.state === "done" || x.state === "verified").length;
                    return (
                      <Panel key={p.id} href={`/projects/${p.id}`}>
                        <Row>
                          <Badge size="sm" variant="soft">{p.kind}</Badge>
                          <Strong>{p.name}</Strong>
                        </Row>
                        <Row>
                          <Muted>{projectCustomer(p.id)?.name}</Muted>
                          <Subtle>·</Subtle>
                          <Muted>{LABEL.stage[p.stage]}</Muted>
                          <Subtle>·</Subtle>
                          <Muted>업무 {done}/{t.length} 완료</Muted>
                          {blocked > 0 && <Badge size="sm" variant="soft" status="destructive">차단 {blocked}</Badge>}
                        </Row>
                      </Panel>
                    );
                  })}
                </Stack>
              </Section>
            </Grid>
          </Stack>
        </Tabs.Panel>

        <Tabs.Panel value="ops">
          <Stack style={{ gap: "var(--space-6)", paddingTop: "var(--space-4)" }}>
            <OpsOverview />
          </Stack>
        </Tabs.Panel>
      </Tabs>
    </Page>
  );
}

/* ── 운영 현황 ───────────────────────────────────── */

function OpsOverview() {
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
