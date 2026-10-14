/**
 * 홈 타임라인 띠의 사건 목록 — 알림이 아니라 실제 기록에서 만든다.
 *  - 업무 진행 기록 (착수 · 차단 · PR · 검증 · 반려 …)
 *  - 문서 버전 기록 (컨텍스트 · 산출물의 확정 버전)
 *  - 리스크 감지
 * 다가오는 일은 마일스톤이 따로 맡는다.
 */

import type { IconName } from "@/components/ctas/ctds";
import { authorLabel } from "@/components/ctas/VersionRail";
import { contextItems, deliverables, risks, riskHref, tasks, type TaskEventKind } from "@/lib/mock";

export type Activity = { id: string; at: string; projectId: string; icon: IconName; title: string; sub: string; href: string };

const TASK_EVENT_ICON: Record<TaskEventKind, IconName> = {
  create: "plus", start: "steps", triage: "tag", merge: "split-horizontal", comm: "chat-text",
  pr: "brackets-square", submit: "upload-simple", reject: "x", analysis: "waveform",
  verify: "seal-check", blocked: "warning", risk: "warning-circle", delay: "clock", incident: "warning",
};

/** 최신순 */
export function activities(): Activity[] {
  const fromTasks: Activity[] = tasks.flatMap((t) =>
    t.timeline.map((e, i) => ({
      id: `${t.id}#${i}`, at: e.at, projectId: t.projectId, icon: TASK_EVENT_ICON[e.kind],
      title: t.title, sub: `${e.who} · ${e.text}`, href: `/projects/${t.projectId}/tasks/${t.id}`,
    })),
  );
  const fromDocs: Activity[] = [
    ...contextItems.flatMap((c) => c.versions.map((v) => ({ doc: c, v, href: `/projects/${c.projectId}/context/${c.id}` }))),
    ...deliverables.flatMap((d) => d.versions.map((v) => ({ doc: d, v, href: `/projects/${d.projectId}/deliverables/${d.id}` }))),
  ].map(({ doc, v, href }) => ({
    id: `${doc.id}@v${v.v}`, at: v.at, projectId: doc.projectId, icon: "article" as const,
    title: `${doc.title} — v${v.v}`, sub: `${authorLabel(v.author)} · ${v.summary}`, href,
  }));
  const fromRisks: Activity[] = risks.map((r) => ({
    id: r.id, at: r.detectedAt, projectId: r.projectId, icon: "warning-circle" as const,
    title: `리스크 감지 — ${r.title}`, sub: r.suggestion.title, href: riskHref(r.id),
  }));
  return [...fromTasks, ...fromDocs, ...fromRisks].sort((a, b) => b.at.localeCompare(a.at));
}
