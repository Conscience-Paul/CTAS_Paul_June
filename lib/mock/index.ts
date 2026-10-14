/**
 * 목데이터 진입점 + 조회 헬퍼.
 * 추후 lib/api 가 Tauri invoke 로 바뀌어도 화면은 이 시그니처만 본다.
 */
export * from "./types";
export * from "./org";
export * from "./context";
export * from "./workflow";
export * from "./risks";
export * from "./knowledge";
export * from "./ai";
export * from "./contracts";
export * from "./knowledge-fs";
export * from "./notifications";

import { aiScenarios } from "./ai";
import { contracts } from "./contracts";
import { contextItems, links, sources } from "./context";
import { deliverables, patterns, templates } from "./knowledge";
import { customers, members, milestones, projects, complianceProfiles } from "./org";
import { risks } from "./risks";
import type {
  ApprovalKind,
  ConflictKind,
  ContextKind,
  RiskKind,
  SourceKind,
  Stage,
  TaskState,
  TaskKind,
  Severity,
  Role,
  DeliverableKind,
  PatternKind,
  PatternState,
  Triage,
  MilestoneState,
  RunState,
} from "./types";
import { agentRuns, approvals, conflicts, requests, tasks } from "./workflow";

/* ── 조회 ───────────────────────────────────────── */

export const getProject = (id: string) => projects.find((p) => p.id === id);
export const getCustomer = (id: string) => customers.find((c) => c.id === id);
export const getMember = (id: string) => members.find((m) => m.id === id);
export const getCompliance = (id: string) => complianceProfiles.find((c) => c.id === id);
export const getContext = (id: string) => contextItems.find((c) => c.id === id);
export const getTask = (id: string) => tasks.find((t) => t.id === id);
export const getRisk = (id: string) => risks.find((r) => r.id === id);
export const getMilestone = (id: string) => milestones.find((m) => m.id === id);
export const getDeliverable = (id: string) => deliverables.find((d) => d.id === id);
export const getPattern = (id: string) => patterns.find((p) => p.id === id);
export const getTemplate = (id: string) => templates.find((t) => t.id === id);
export const getRun = (id: string) => agentRuns.find((r) => r.id === id);

export const projectCustomer = (projectId: string) => {
  const p = getProject(projectId);
  return p ? getCustomer(p.customerId) : undefined;
};

export const byProject = {
  sources: (id: string) => sources.filter((s) => s.projectId === id),
  context: (id: string) => contextItems.filter((c) => c.projectId === id),
  milestones: (id: string) => milestones.filter((m) => m.projectId === id),
  tasks: (id: string) => tasks.filter((t) => t.projectId === id),
  requests: (id: string) => requests.filter((r) => r.projectId === id),
  approvals: (id: string) => approvals.filter((a) => a.projectId === id),
  conflicts: (id: string) => conflicts.filter((c) => c.projectId === id),
  risks: (id: string) => risks.filter((r) => r.projectId === id),
  deliverables: (id: string) => deliverables.filter((d) => d.projectId === id),
  contracts: (id: string) => contracts.filter((c) => c.projectId === id),
};

export const runsForTask = (taskId: string) =>
  agentRuns.filter((r) => r.taskId === taskId).sort((a, b) => a.attempt - b.attempt);

/** 항목과 연결된 링크 (양방향) */
export const linksFor = (id: string) => links.filter((l) => l.from === id || l.to === id);

/** 라우트에 맞는 AI 시나리오 — prefix 가 가장 긴 것 */
export const scenarioFor = (pathname: string) =>
  [...aiScenarios]
    .filter((s) => pathname === s.route || pathname.startsWith(s.route === "/" ? "/" : s.route))
    .sort((a, b) => b.route.length - a.route.length)[0];

/** 링크나 근거 id 가 어떤 종류의 엔티티인지 추정해 라우트를 만든다 */
export const hrefFor = (id: string, projectId?: string): string | undefined => {
  const pid = projectId ?? getContext(id)?.projectId ?? getTask(id)?.projectId ?? getRisk(id)?.projectId ?? getDeliverable(id)?.projectId;
  if (id.startsWith("ctx-") && pid) return `/projects/${pid}/context/${id}`;
  if (id.startsWith("t-") && pid) return `/projects/${pid}/tasks/${id}`;
  if (id.startsWith("risk-") && pid) return `/projects/${pid}/risks`;
  if (id.startsWith("del-") && pid) return `/projects/${pid}/deliverables/${id}`;
  if (id.startsWith("ms-") && pid) return `/projects/${pid}`;
  if (id.startsWith("cf-") && pid) return `/projects/${pid}/conflicts`;
  if (id.startsWith("ct-")) return `/knowledge/contracts`;
  if (id.startsWith("ap-")) return `/approvals`;
  if (id.startsWith("run-")) {
    const r = getRun(id);
    const t = r && getTask(r.taskId);
    return t ? `/projects/${t.projectId}/tasks/${t.id}` : undefined;
  }
  if (id.startsWith("pt-")) return `/knowledge/patterns/${id}`;
  if (id === "insights") return `/ops/insights`;
  return undefined;
};

/* ── 라벨 ───────────────────────────────────────── */

export const LABEL = {
  stage: Object.fromEntries(
    [
      ["lead", "미팅"],
      ["requirements", "요구사항 정의"],
      ["contract", "계약"],
      ["build", "구축"],
      ["review", "중간 검수"],
      ["acceptance", "완료·인수"],
      ["maintenance", "유지보수"],
    ] as const,
  ) as Record<Stage, string>,
  source: {
    slack: "Slack",
    discord: "Discord",
    kakao: "카카오톡",
    email: "이메일",
    gdrive: "Google Drive",
    git: "Git",
    meeting: "회의",
    manual: "수동",
  } satisfies Record<SourceKind, string>,
  contextKind: {
    conversation: "대화",
    customer_doc: "고객 문서",
    our_doc: "우리 문서",
    meeting_note: "회의록",
    requirement: "요구사항",
    decision: "의사결정",
    change: "변경",
  } satisfies Record<ContextKind, string>,
  contextState: { raw: "원본", processed: "전처리됨", curated: "정리됨" },
  taskState: {
    new: "신규",
    triaged: "분류됨",
    preflight: "사전 점검",
    in_progress: "진행 중",
    pending_review: "검토 대기",
    done: "완료",
    verified: "검증됨",
    blocked: "차단됨",
    wont_do: "하지 않음",
  } satisfies Record<TaskState, string>,
  taskKind: {
    bug: "버그",
    feature: "기능",
    change_request: "변경 요청",
    ops: "운영",
    doc: "문서",
  } satisfies Record<TaskKind, string>,
  severity: { low: "낮음", medium: "보통", high: "높음", critical: "치명" } satisfies Record<Severity, string>,
  triage: { join: "기존 업무 합류", new: "신규 업무", out_of_scope: "범위 밖", pending: "판정 대기" } satisfies Record<Triage, string>,
  approvalKind: { triage: "분류", preflight: "사전 점검", result: "결과", customer_send: "고객 발송" } satisfies Record<ApprovalKind, string>,
  conflictKind: {
    duplicate_task: "중복 업무",
    owner_overlap: "담당자 겹침",
    requirement_conflict: "요구사항 충돌",
    scope_creep: "범위 초과",
  } satisfies Record<ConflictKind, string>,
  riskKind: {
    missing_requirement: "요구사항 누락",
    schedule_delay: "일정 지연",
    policy_conflict: "정책 충돌",
    no_response: "미응답",
    scope_creep: "범위 초과",
    owner_overlap: "담당자 중복",
  } satisfies Record<RiskKind, string>,
  riskStatus: { open: "열림", acknowledged: "확인됨", dismissed: "무시", resolved: "해결" },
  role: { admin: "관리자", pm: "PM", engineer: "엔지니어", viewer: "뷰어" } satisfies Record<Role, string>,
  deliverableKind: { wbs: "WBS", report: "보고서", meeting_minutes: "회의록", customer_doc: "고객 문서", proposal: "제안서" } satisfies Record<DeliverableKind, string>,
  patternKind: { requirement: "요구사항", risk: "리스크", problem: "문제", solution: "해결" } satisfies Record<PatternKind, string>,
  patternState: { draft: "초안", anonymized: "익명화됨", reviewed: "검토됨", published: "게시됨" } satisfies Record<PatternState, string>,
  milestoneState: { planned: "예정", at_risk: "위험", done: "완료", missed: "놓침" } satisfies Record<MilestoneState, string>,
  runState: { queued: "대기", running: "실행 중", submitted: "제출됨", approved: "승인됨", rejected: "반려됨", failed: "실패" } satisfies Record<RunState, string>,
};

/** 상태 → Badge status 매핑 (CTDS Badge 는 success/warning/destructive/info 4종) */
export const TONE = {
  taskState: {
    new: undefined,
    triaged: "info",
    preflight: "info",
    in_progress: "info",
    pending_review: "warning",
    done: "success",
    verified: "success",
    blocked: "destructive",
    wont_do: undefined,
  } as Record<TaskState, "success" | "warning" | "destructive" | "info" | undefined>,
  severity: {
    low: undefined,
    medium: "info",
    high: "warning",
    critical: "destructive",
  } as Record<Severity, "success" | "warning" | "destructive" | "info" | undefined>,
  milestoneState: {
    planned: "info",
    at_risk: "warning",
    done: "success",
    missed: "destructive",
  } as Record<MilestoneState, "success" | "warning" | "destructive" | "info">,
  contextState: {
    raw: undefined,
    processed: "info",
    curated: "success",
  } as Record<"raw" | "processed" | "curated", "success" | "warning" | "destructive" | "info" | undefined>,
  runState: {
    queued: undefined,
    running: "info",
    submitted: "warning",
    approved: "success",
    rejected: "destructive",
    failed: "destructive",
  } as Record<RunState, "success" | "warning" | "destructive" | "info" | undefined>,
};

export const fmtDate = (iso: string) => {
  // "YYYY-MM-DD" 만 오면 new Date 가 UTC 로 해석해 시간대에 따라 하루 밀린다 → 로컬 자정으로
  const d = new Date(iso.length <= 10 ? `${iso}T00:00:00` : iso);
  return `${d.getMonth() + 1}/${d.getDate()}`;
};
export const fmtDateTime = (iso: string) => {
  const d = new Date(iso);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${d.getMonth() + 1}/${d.getDate()} ${hh}:${mm}`;
};
/** 프리뷰 기준일 — 목데이터의 "오늘" */
export const TODAY = "2026-10-13";
export const daysUntil = (iso: string) =>
  Math.round((new Date(iso).getTime() - new Date(TODAY).getTime()) / 86_400_000);
