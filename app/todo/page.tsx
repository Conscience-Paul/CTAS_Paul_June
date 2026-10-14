"use client";

/**
 * 대시보드 › 투두 — "내가" 오늘 처리할 것. 승인·내 업무·차단 해제·리스크 확인·마일스톤.
 * 체크는 로컬 상태(프리뷰).
 */

import Link from "next/link";
import { useState } from "react";
import { Badge, Button, Checkbox, Icon, MetricCard } from "@/components/ctas/ctds";
import { Grid, List, Page, PageHeader, Row, Section, SeverityBadge, Stack, Strong, Subtle, TaskStateBadge } from "@/components/ctas/ui";
import { LABEL, approvals, daysUntil, fmtDate, getProject, milestones, risks, tasks } from "@/lib/mock";
import { usePreview } from "@/lib/preview-state";

const ME = "m-seoyeon";

export default function TodoPage() {
  const { approvalDecisions, riskStatus, askAi } = usePreview();
  const [done, setDone] = useState<Record<string, boolean>>({});
  const toggle = (id: string) => setDone((d) => ({ ...d, [id]: !d[id] }));

  const pending = approvals.filter((a) => (approvalDecisions[a.id] ?? a.state) === "pending");
  const myTasks = tasks.filter((t) => t.ownerId === ME && !["done", "verified", "wont_do"].includes(t.state));
  const blocked = tasks.filter((t) => t.state === "blocked");
  const openRisks = risks.filter((r) => (riskStatus[r.id] ?? r.status) === "open");
  const myMilestones = milestones.filter((m) => m.ownerId === ME && m.state !== "done" && daysUntil(m.due) <= 14);
  const total = pending.length + myTasks.length + blocked.length + openRisks.length + myMilestones.length;
  const checked = Object.values(done).filter(Boolean).length;

  const row = (id: string, body: React.ReactNode, meta: React.ReactNode, href: string) => (
    <Row key={id} style={{ justifyContent: "space-between", flexWrap: "nowrap", opacity: done[id] ? 0.5 : 1 }}>
      <Row tight style={{ flexWrap: "nowrap", minWidth: 0 }}>
        <Checkbox checked={!!done[id]} onChange={() => toggle(id)} aria-label="완료" />
        <Link href={href} style={{ textDecoration: done[id] ? "line-through" : "none", color: "inherit", minWidth: 0 }}>{body}</Link>
      </Row>
      <Subtle style={{ flexShrink: 0 }}>{meta}</Subtle>
    </Row>
  );

  return (
    <Page>
      <PageHeader
        eyebrow="김서연 · PM · 2026-10-13"
        title="투두"
        lead="내 결정·내 업무·내가 풀어야 할 차단을 한 줄씩. 체크는 이 세션에만 남습니다."
        actions={<Button size="sm" variant="outline" leftIcon={<Icon name="chat-circle" />} onClick={() => askAi("오늘 내가 결정해야 할 것")}>우선순위 정해줘</Button>}
      />

      <Grid cols={3}>
        <MetricCard label="오늘 할 일" value={total} icon="check-square" description={`완료 ${checked}`} />
        <MetricCard label="승인 대기" value={pending.length} icon="check-circle" href="/approvals" />
        <MetricCard label="차단 해제 필요" value={blocked.length} icon="warning" description="고객 응답·문서 대기" />
      </Grid>

      <Section title="승인" icon="check-circle" hint={`${pending.length}건`}>
        <List>
          {pending.map((a) =>
            row(a.id, <Row tight><Badge size="sm" variant="soft">{LABEL.approvalKind[a.kind]}</Badge><Strong>{a.title}</Strong></Row>, fmtDate(a.requestedAt), "/approvals"),
          )}
        </List>
      </Section>

      <Section title="차단 해제" icon="warning" hint="고객·문서 대기 중인 업무">
        <List>
          {blocked.map((t) =>
            row(t.id, <Stack tight><Strong>{t.title}</Strong><Subtle>{t.blockedReason}</Subtle></Stack>, t.due ? `D${daysUntil(t.due) >= 0 ? "-" : "+"}${Math.abs(daysUntil(t.due))}` : "", `/projects/${t.projectId}/tasks/${t.id}`),
          )}
        </List>
      </Section>

      <Section title="내 업무" icon="list" hint={`${myTasks.length}건`}>
        <List>
          {myTasks.map((t) =>
            row(`my-${t.id}`, <Row tight><TaskStateBadge state={t.state} /><Strong>{t.title}</Strong><Subtle>{getProject(t.projectId)?.name}</Subtle></Row>, t.due ? fmtDate(t.due) : "", `/projects/${t.projectId}/tasks/${t.id}`),
          )}
        </List>
      </Section>

      <Section title="리스크 확인" icon="warning-circle" hint="아직 확인하지 않은 것">
        <List>
          {openRisks.map((r) =>
            row(r.id, <Row tight><SeverityBadge severity={r.severity} /><Strong>{r.title}</Strong></Row>, fmtDate(r.detectedAt), `/projects/${r.projectId}/risks`),
          )}
        </List>
      </Section>

      <Section title="내 마일스톤" icon="calendar-dots" hint="14일 이내">
        <List>
          {myMilestones.map((m) =>
            row(m.id, <Row tight><Strong>{m.title}</Strong><Subtle>{getProject(m.projectId)?.name}</Subtle></Row>, `${fmtDate(m.due)} · D-${daysUntil(m.due)}`, `/projects/${m.projectId}`),
          )}
        </List>
      </Section>
    </Page>
  );
}
