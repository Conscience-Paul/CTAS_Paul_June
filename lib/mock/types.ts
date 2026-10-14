/**
 * CTAS 도메인 모델 — spec.md §1 과 1:1.
 * 프리뷰 단계지만 용어·상태 머신은 최종안 그대로 쓴다.
 */

/* ── 조직 ─────────────────────────────────────────── */

export type Role = "admin" | "pm" | "engineer" | "viewer";

export interface Member {
  id: string;
  name: string;
  role: Role;
  title: string;
}

export interface ComplianceProfile {
  id: string;
  name: string;
  allowExternalAI: boolean;
  retentionDays: number;
  dataRegion: "kr" | "global";
  allowedChannels: SourceKind[];
  requireApprovalForCustomerSend: boolean;
}

export interface Customer {
  id: string;
  name: string;
  industry: string;
  /** Nora 워크스페이스 1:1 매핑 — 데이터 격리 단위 */
  noraWorkspace: string;
  complianceProfileId: string;
}

export type ProjectKind = "SI" | "SM";
export type Stage =
  | "lead"
  | "requirements"
  | "contract"
  | "build"
  | "review"
  | "acceptance"
  | "maintenance";

export const STAGES: { id: Stage; label: string; hint: string }[] = [
  { id: "lead", label: "미팅", hint: "리드·초기 미팅" },
  { id: "requirements", label: "요구사항 정의", hint: "범위·요구사항 확정" },
  { id: "contract", label: "계약", hint: "견적·계약 체결" },
  { id: "build", label: "구축", hint: "설계·개발" },
  { id: "review", label: "중간 검수", hint: "고객 검수·피드백" },
  { id: "acceptance", label: "완료·인수", hint: "최종 인수" },
  { id: "maintenance", label: "유지보수", hint: "SM 계약 운영" },
];

export interface GateItem {
  id: string;
  label: string;
  done: boolean;
  /** 미충족 시 근거 컨텍스트 항목 */
  evidenceId?: string;
}

export interface Project {
  id: string;
  customerId: string;
  name: string;
  kind: ProjectKind;
  stage: Stage;
  pmId: string;
  memberIds: string[];
  startDate: string;
  endDate: string;
  summary: string;
  /** 현재 단계 → 다음 단계 게이트 체크리스트 */
  gate: GateItem[];
}

export type MilestoneState = "planned" | "at_risk" | "done" | "missed";

export interface Milestone {
  id: string;
  projectId: string;
  title: string;
  due: string;
  ownerId: string;
  state: MilestoneState;
  taskIds: string[];
}

/* ── Context ─────────────────────────────────────── */

export type SourceKind =
  | "slack"
  | "discord"
  | "kakao"
  | "email"
  | "gdrive"
  | "git"
  | "meeting"
  | "manual";

export interface Source {
  id: string;
  projectId: string;
  kind: SourceKind;
  label: string;
  /** 연결 경로 — 채널명, 폴더명, 메일함 등 */
  target: string;
  lastSyncedAt: string;
  itemCount: number;
}

export type ContextKind =
  | "conversation"
  | "customer_doc"
  | "our_doc"
  | "meeting_note"
  | "requirement"
  | "decision"
  | "change";

export type ContextState = "raw" | "processed" | "curated";

export interface ContextVersion {
  v: number;
  at: string;
  author: { kind: "human"; memberId: string } | { kind: "ai"; model: string };
  summary: string;
  /** 이 버전을 만들 때 근거로 쓴 항목 */
  basedOn: string[];
  body: string;
}

export interface ContextItem {
  id: string;
  projectId: string;
  kind: ContextKind;
  title: string;
  sourceId: string;
  origin: { channel: string; at: string; by: string };
  state: ContextState;
  tags: string[];
  versions: ContextVersion[];
}

export type LinkRel =
  | "derived_from"
  | "decided_by"
  | "implements"
  | "changed_by"
  | "evidences"
  | "conflicts_with";

export interface Link {
  from: string;
  to: string;
  rel: LinkRel;
}

/* ── Workflow ────────────────────────────────────── */

export type Triage = "join" | "new" | "out_of_scope" | "pending";

export interface Request {
  id: string;
  projectId: string;
  from: string;
  channel: SourceKind;
  at: string;
  text: string;
  triage: Triage;
  /** join 이면 합류한 Task */
  taskId?: string;
  contextItemId?: string;
}

export type TaskState =
  | "new"
  | "triaged"
  | "preflight"
  | "in_progress"
  | "pending_review"
  | "done"
  | "verified"
  | "blocked"
  | "wont_do";

export type TaskKind = "bug" | "feature" | "change_request" | "ops" | "doc";
export type Scope = "in" | "out" | "unclear";
export type Severity = "low" | "medium" | "high" | "critical";

export interface PreflightCheck {
  id: string;
  label: string;
  status: "pass" | "fail" | "warn";
  detail: string;
  evidenceId?: string;
}

export interface Task {
  id: string;
  projectId: string;
  title: string;
  kind: TaskKind;
  state: TaskState;
  scope: Scope;
  ownerId: string;
  severity: Severity;
  priority: 1 | 2 | 3;
  createdAt: string;
  due?: string;
  blockedReason?: string;
  dedupKey: string;
  clusterId?: string;
  description: string;
  preflight: PreflightCheck[];
  /** 근거 컨텍스트 항목 */
  contextIds: string[];
  timeline: { at: string; who: string; text: string; kind: TaskEventKind }[];
}

/**
 * 업무 이력 한 줄의 종류 — 운영 › 타임라인의 사건 유형을 정한다.
 *   개발: pr · submit(Nora 제출) · reject(리뷰 반려) · analysis(원인 분석)
 *   고객 피드백: verify(고객 검수)
 *   이슈: blocked · risk · delay · incident(장애 접수)
 *   타임라인 제외(관리 기록): create · start · triage · merge · comm
 */
export type TaskEventKind =
  | "create" | "start" | "triage" | "merge" | "comm"
  | "pr" | "submit" | "reject" | "analysis"
  | "verify"
  | "blocked" | "risk" | "delay" | "incident";

export type RunState =
  | "queued"
  | "running"
  | "submitted"
  | "approved"
  | "rejected"
  | "failed";

export interface AgentRun {
  id: string;
  taskId: string;
  attempt: number;
  state: RunState;
  startedAt: string;
  agent: string;
  plan: string;
  summary: string;
  diff?: string;
  rejectReason?: string;
}

export type ApprovalKind = "triage" | "preflight" | "result" | "customer_send";
export type ApprovalState = "pending" | "approved" | "rejected";

export interface Approval {
  id: string;
  projectId: string;
  kind: ApprovalKind;
  state: ApprovalState;
  title: string;
  requestedBy: string;
  requestedAt: string;
  /** 승인 근거 — Task, AgentRun, Risk 중 하나 */
  ref: { type: "task" | "run" | "risk" | "deliverable"; id: string };
  message: string;
}

export type ConflictKind =
  | "duplicate_task"
  | "owner_overlap"
  | "requirement_conflict"
  | "scope_creep";

export interface Conflict {
  id: string;
  projectId: string;
  kind: ConflictKind;
  title: string;
  detail: string;
  /** 충돌 당사자 — Task 또는 Context 항목 id */
  parties: { type: "task" | "context"; id: string }[];
  suggestion: string;
  resolved: boolean;
}

/* ── Risk ────────────────────────────────────────── */

export type RiskKind =
  | "missing_requirement"
  | "schedule_delay"
  | "policy_conflict"
  | "no_response"
  | "scope_creep"
  | "owner_overlap";

export interface Risk {
  id: string;
  projectId: string;
  kind: RiskKind;
  severity: Severity;
  title: string;
  detectedAt: string;
  detail: string;
  /** 근거 — Context, Task, Milestone id */
  evidence: { type: "context" | "task" | "milestone"; id: string }[];
  suggestion: { title: string; body: string; draft?: string };
  status: "open" | "acknowledged" | "dismissed" | "resolved";
}

/* ── Knowledge ───────────────────────────────────── */

export type DeliverableKind =
  | "wbs"
  | "report"
  | "meeting_minutes"
  | "customer_doc"
  | "proposal";

export interface Deliverable {
  id: string;
  projectId: string;
  kind: DeliverableKind;
  title: string;
  templateId?: string;
  generatedFrom: string[];
  versions: ContextVersion[];
}

export interface Template {
  id: string;
  kind: DeliverableKind;
  name: string;
  description: string;
  sections: string[];
  usedCount: number;
}

export type PatternKind = "requirement" | "risk" | "problem" | "solution";
export type PatternState = "draft" | "anonymized" | "reviewed" | "published";

export interface Pattern {
  id: string;
  kind: PatternKind;
  state: PatternState;
  title: string;
  summary: string;
  when: string;
  how: string;
  usedCount: number;
  /** 원본 프로젝트 — admin 감사용. UI에선 노출하지 않는다. */
  originProjectIds: string[];
  tags: string[];
}

/* ── AI 패널 ─────────────────────────────────────── */

export interface AiTurn {
  role: "user" | "ai";
  text: string;
  sources?: { id: string; label: string }[];
  /** "적용" 버튼 — 눌렀을 때 로컬 상태 변경을 흉내.
   *  effect `version:<id>` 는 payload 의 summary/body 로 새 버전을 만든다. */
  action?: { label: string; effect: string; payload?: { summary: string; body: string } };
}

export interface AiScenario {
  /** 라우트 prefix 매칭 — 가장 긴 것이 이김 */
  route: string;
  suggestions: string[];
  turns: AiTurn[];
}
