"use client";

/**
 * 개발 영역 공용 — orbit Operate 를 본뜬 개발 항목 모델.
 * 개발 항목 = 버그 리포트 · 신규 기능 · 변경 요청(코드가 바뀌는 것). 문서·운영 업무는 제외.
 * 모두 Nora 에이전트가 처리하고, 사람은 분류·결과 승인·고객 발송만 한다.
 */

import { Avatar, Badge, Chip, FilterButton, Icon, Select } from "@/components/ctas/ctds";
import { Row, SeverityBadge, Subtle, TaskStateBadge } from "@/components/ctas/ui";
import { LABEL, daysUntil, getMember, getProject, projects, runsForTask, tasks, type RunState, type Task, type TaskKind } from "@/lib/mock";

export const DEV_KINDS: TaskKind[] = ["bug", "feature", "change_request"];
export const isDev = (t: Task) => DEV_KINDS.includes(t.kind);
export const devTasks = () => tasks.filter(isDev);
export const OPEN = (t: Task) => !["done", "verified", "wont_do"].includes(t.state);
export const taskNum = (t: Task) => devTasks().indexOf(t) + 101;

/** 에이전트가 지금 어디까지 왔는지 — 최신 시도 상태 */
export const agentStatus = (t: Task): { label: string; tone: "info" | "warning" | "success" | "destructive" | undefined } => {
  const r = runsForTask(t.id).slice(-1)[0];
  if (!r) return t.state === "new" ? { label: "대기", tone: undefined } : { label: "사람", tone: undefined };
  const m: Record<RunState, { label: string; tone: "info" | "warning" | "success" | "destructive" | undefined }> = {
    queued: { label: "큐", tone: undefined },
    running: { label: "수정 중", tone: "info" },
    submitted: { label: "승인 요청", tone: "warning" },
    approved: { label: "승인됨", tone: "success" },
    rejected: { label: "반려 → 재시도", tone: "destructive" },
    failed: { label: "실패", tone: "destructive" },
  };
  return m[r.state];
};

/** 프로젝트 — 하나만 고르므로 드롭다운. "all" = 전체 */
export function ProjectSelect({ value, onChange }: { value: string | null; onChange: (id: string | null) => void }) {
  return (
    <Select size="sm" width={200} value={value ?? "all"} onValueChange={(v) => onChange(v === "all" ? null : v)}>
      <Select.Trigger aria-label="프로젝트" leftIcon={<Icon name="squares-four" />} />
      <Select.Content>
        <Select.Item value="all">전체 프로젝트</Select.Item>
        {projects.map((p) => <Select.Item key={p.id} value={p.id}>{p.name}</Select.Item>)}
      </Select.Content>
    </Select>
  );
}

/** 담당 — 하나만 고르므로 드롭다운 */
export function WhoSelect({ value, onChange }: { value: "all" | "mine"; onChange: (v: "all" | "mine") => void }) {
  return (
    <Select size="sm" width={130} value={value} onValueChange={(v) => onChange(v as "all" | "mine")}>
      <Select.Trigger aria-label="담당" leftIcon={<Icon name="user" />} />
      <Select.Content>
        <Select.Item value="all">모든 담당</Select.Item>
        <Select.Item value="mine">내 담당</Select.Item>
      </Select.Content>
    </Select>
  );
}

/** 건수 달린 다중 선택 필터. 비어 있으면 전체. "전체" 를 누르면 비운다 */
export function CountFilter<T extends string>({ label, value, options, onChange }: { label?: string; value: T[]; options: { id: T; label: string; count: number }[]; onChange: (v: T[]) => void }) {
  const total = options.reduce((s, o) => s + o.count, 0);
  const toggle = (id: T) => onChange(value.includes(id) ? value.filter((x) => x !== id) : [...value, id]);
  return (
    <>
      {label && <Subtle style={{ marginInline: "var(--space-1)" }}>{label}</Subtle>}
      <FilterButton size="sm" selected={value.length === 0} onClick={() => onChange([])}>전체 {total}</FilterButton>
      {options.filter((o) => o.count > 0).map((o) => (
        <FilterButton key={o.id} size="sm" selected={value.includes(o.id)} onClick={() => toggle(o.id)}>{o.label} {o.count}</FilterButton>
      ))}
    </>
  );
}

export const taskColumns = [
  { key: "num", label: "#", width: 56 },
  { key: "state", label: "상태", width: 100 },
  { key: "kind", label: "종류", width: 96 },
  { key: "title", label: "제목", flex: true, minWidth: 320 },
  { key: "project", label: "프로젝트", width: 170 },
  { key: "reporter", label: "접수", width: 80 },
  { key: "agent", label: "에이전트", width: 120 },
  { key: "owner", label: "담당", width: 110 },
  { key: "severity", label: "심각도", width: 90 },
  { key: "due", label: "기한", width: 90, align: "end" as const },
];

export function taskCell(key: string, t: Task) {
  switch (key) {
    case "num": return <Subtle>{taskNum(t)}</Subtle>;
    case "state": return <TaskStateBadge state={t.state} />;
    case "kind": return <Badge size="sm" variant="soft" status={t.kind === "bug" ? "destructive" : t.kind === "feature" ? "info" : undefined}>{t.kind === "feature" ? "신규 기능" : LABEL.taskKind[t.kind]}</Badge>;
    case "title":
      return (
        <Row tight style={{ flexWrap: "nowrap", minWidth: 0 }}>
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.title}</span>
          {t.reopenCount ? <Chip size="sm" variant="soft" leftIcon={<Icon name="circle-notch" size={10} />}>재접수{t.reopenCount > 1 ? ` ${t.reopenCount}` : ""}</Chip> : null}
        </Row>
      );
    case "project": return <Subtle>{getProject(t.projectId)?.name.replace(/^한빛유통 |^세종캐피탈 /, "")}</Subtle>;
    case "reporter": return <Subtle>{t.reporter === "external" ? "고객" : "내부"}</Subtle>;
    case "agent": { const a = agentStatus(t); return <Badge size="sm" variant="soft" status={a.tone}>{a.label}</Badge>; }
    case "owner": { const o = getMember(t.ownerId); return <Row tight><Avatar size="xs" name={o?.name} />{o?.name}</Row>; }
    case "severity": return <SeverityBadge severity={t.severity} />;
    case "due": return t.due ? <span>{daysUntil(t.due) < 0 ? <Badge size="sm" variant="soft" status="destructive">+{-daysUntil(t.due)}</Badge> : `D-${daysUntil(t.due)}`}</span> : <Subtle>—</Subtle>;
  }
}
