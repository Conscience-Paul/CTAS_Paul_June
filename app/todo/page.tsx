"use client";

/**
 * 대시보드 › 투두 — "내가" 오늘 처리할 것. 대시보드와 같은 원칙: 결정(승인)은 승인 목록이 원본이라 요약만.
 *  - 승인: 최근 3건 + 승인 목록으로 (리스크도 여기 — 리스크 대응)
 *  - 차단 해제 · 내 업무 · 내 마일스톤(14일) 체크리스트
 * 체크는 로컬 상태(프리뷰).
 */

import Link from "next/link";
import { useState } from "react";
import { Badge, Button, Checkbox, Icon } from "@/components/ctas/ctds";
import { List, Page, PageHeader, Row, Section, Stack, Strong, Subtle, TaskStateBadge } from "@/components/ctas/ui";
import { LABEL, daysUntil, fmtDate, getProject, milestones, tasks } from "@/lib/mock";
import { useAllApprovals } from "@/components/ctas/useApprovals";
import { usePreview } from "@/lib/preview-state";

const ME = "m-seoyeon";
const APPROVAL_TOP = 3;

export default function TodoPage() {
  const { askAi } = usePreview();
  const [done, setDone] = useState<Record<string, boolean>>({});
  const toggle = (id: string) => setDone((d) => ({ ...d, [id]: !d[id] }));

  const { pending } = useAllApprovals(); // 목업 승인 + 문서 draft + 리스크 대응
  const topApprovals = [...pending].sort((a, b) => b.requestedAt.localeCompare(a.requestedAt)).slice(0, APPROVAL_TOP);
  // 차단된 내 업무는 "차단 해제"에만 — 두 번 나오지 않게
  const myTasks = tasks.filter((t) => t.ownerId === ME && !["done", "verified", "wont_do", "blocked"].includes(t.state));
  const blocked = tasks.filter((t) => t.state === "blocked");
  const myMilestones = milestones.filter((m) => m.ownerId === ME && m.state !== "done" && daysUntil(m.due) <= 14);
  // 승인은 승인 목록에서 처리하므로 여기 보이는 3건만 셈한다
  const total = topApprovals.length + blocked.length + myTasks.length + myMilestones.length;
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
        lead={`오늘 할 일 ${total}개 중 ${checked}개 완료 · 체크는 이 세션에만 남습니다.`}
        actions={<Button size="sm" variant="outline" leftIcon={<Icon name="chat-circle" />} onClick={() => askAi("오늘 내가 결정해야 할 것")}>우선순위 정해줘</Button>}
      />

      <Section
        title="승인"
        icon="check-circle"
        hint={`최근 ${topApprovals.length}건 · 전체 ${pending.length}건`}
        actions={<Button size="xs" variant="ghost" asChild><Link href="/approvals">승인 목록</Link></Button>}
      >
        <List>
          {topApprovals.map((a) =>
            row(a.id, <Row tight><Badge size="sm" variant="soft">{LABEL.approvalKind[a.kind]}</Badge><Strong>{a.title}</Strong></Row>, fmtDate(a.requestedAt), `/approvals?open=${encodeURIComponent(a.id)}`),
          )}
        </List>
      </Section>

      {/* 비어 있는 칸은 숨긴다 */}
      {blocked.length > 0 && (
        <Section title="차단 해제" icon="warning" hint="고객·문서 대기 중인 업무">
          <List>
            {blocked.map((t) =>
              row(t.id, <Stack tight><Strong>{t.title}</Strong><Subtle>{t.blockedReason}</Subtle></Stack>, t.due ? `D${daysUntil(t.due) >= 0 ? "-" : "+"}${Math.abs(daysUntil(t.due))}` : "", `/projects/${t.projectId}/tasks/${t.id}`),
            )}
          </List>
        </Section>
      )}

      {myTasks.length > 0 && (
        <Section title="내 업무" icon="list" hint={`${myTasks.length}건`}>
          <List>
            {myTasks.map((t) =>
              row(`my-${t.id}`, <Row tight><TaskStateBadge state={t.state} /><Strong>{t.title}</Strong><Subtle>{getProject(t.projectId)?.name}</Subtle></Row>, t.due ? fmtDate(t.due) : "", `/projects/${t.projectId}/tasks/${t.id}`),
            )}
          </List>
        </Section>
      )}

      {myMilestones.length > 0 && (
        <Section title="내 마일스톤" icon="calendar-dots" hint="14일 이내">
          <List>
            {myMilestones.map((m) =>
              row(m.id, <Row tight><Strong>{m.title}</Strong><Subtle>{getProject(m.projectId)?.name}</Subtle></Row>, `${fmtDate(m.due)} · D-${daysUntil(m.due)}`, `/projects/${m.projectId}`),
            )}
          </List>
        </Section>
      )}
    </Page>
  );
}
