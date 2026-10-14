/**
 * 백엔드 경계 — 추후 Rust(Tauri) 커맨드가 될 함수 시그니처.
 *
 * 지금은 전부 목(lib/mock)으로 즉시 resolve. 실제 연동 시 각 함수 본문을
 * `invoke("<command>", args)` 로 교체하고 화면은 손대지 않는다.
 *
 * 커맨드 이름은 Rust 쪽 함수명과 1:1 — snake_case 로 주석에 병기.
 */

import {
  aiScenarios,
  approvals,
  byProject,
  contextItems,
  customers,
  deliverables,
  getContext,
  getProject,
  getTask,
  linksFor,
  members,
  patterns,
  projects,
  risks,
  runsForTask,
  templates,
  type AiTurn,
  type ApprovalState,
  type ContextVersion,
  type Link,
  type Role,
} from "@/lib/mock";

const ok = <T,>(v: T) => Promise.resolve(v);

/* ── 세션 ──────────────────────────────────────── */
/** `get_session` — 현재 사용자·역할. 데스크톱은 OS 계정, 웹은 SSO. */
export const getSession = () => ok({ memberId: "m-seoyeon", role: "pm" as Role });

/* ── 조직 ──────────────────────────────────────── */
/** `list_customers` — 접근 가능한 고객사만 (Data Isolation) */
export const listCustomers = () => ok(customers);
/** `list_projects` */
export const listProjects = () => ok(projects);
/** `get_project` */
export const getProjectById = (id: string) => ok(getProject(id));
/** `list_members` */
export const listMembers = () => ok(members);

/* ── Context ───────────────────────────────────── */
/** `list_context_items` — 프로젝트 범위 고정 */
export const listContextItems = (projectId: string) => ok(byProject.context(projectId));
/** `get_context_item` — versions 포함 */
export const getContextItem = (id: string) => ok(getContext(id));
/** `create_context_version` — 버전은 불변, 항상 append. 반환은 새 버전 번호 */
export const createContextVersion = (itemId: string, v: Omit<ContextVersion, "v">): Promise<number> =>
  ok((getContext(itemId)?.versions.length ?? 0) + 1 + (v ? 0 : 0));
/** `list_links` — 추적 링크 그래프 (CTAS 소유) */
export const listLinks = (id: string): Promise<Link[]> => ok(linksFor(id));
/** `search_context` — Nora 벡터 검색 호출. 범위 = 프로젝트의 Nora 워크스페이스/폴더 */
export const searchContext = (projectId: string, query: string) =>
  ok(contextItems.filter((c) => c.projectId === projectId && c.title.includes(query)).slice(0, 5));

/* ── Workflow ──────────────────────────────────── */
/** `list_tasks` */
export const listTasks = (projectId: string) => ok(byProject.tasks(projectId));
/** `get_task` */
export const getTaskById = (id: string) => ok(getTask(id));
/** `list_agent_runs` */
export const listAgentRuns = (taskId: string) => ok(runsForTask(taskId));
/** `run_preflight` — Checklist 엔진. 단계 게이트와 업무 착수가 같은 엔진을 쓴다 */
export const runPreflight = (taskId: string) => ok(getTask(taskId)?.preflight ?? []);
/** `list_approvals` — 전 프로젝트, 내 역할이 결정할 수 있는 것만 */
export const listApprovals = () => ok(approvals);
/** `decide_approval` — 상태 전이는 러너(백엔드)가 쥔다. 에이전트는 호출 불가 */
export const decideApproval = (id: string, state: ApprovalState, reason?: string) => ok({ id, state, reason });
/** `triage_request` — Nora 군집 판정 호출 (join | new | out_of_scope) */
export const triageRequest = (requestId: string) => ok({ requestId, triage: "pending" as const });

/* ── Risk ──────────────────────────────────────── */
/** `list_risks` */
export const listRisks = (projectId: string) => ok(byProject.risks(projectId));
/** `update_risk_status` */
export const updateRiskStatus = (id: string, status: (typeof risks)[number]["status"]) => ok({ id, status });

/* ── Knowledge ─────────────────────────────────── */
/** `list_deliverables` */
export const listDeliverables = (projectId: string) => ok(byProject.deliverables(projectId));
/** `generate_deliverable` — Nora 플로우 호출. 템플릿 + 근거 컨텍스트 → v1 */
export const generateDeliverable = (projectId: string, templateId: string, contextIds: string[]) =>
  ok({ id: `del-new`, projectId, templateId, contextIds, v: 1 });
/** `list_templates` */
export const listTemplates = () => ok(templates);
/** `list_patterns` — originProjectIds 는 admin 에게만 내려간다 (Secure Abstraction) */
export const listPatterns = (role: Role) =>
  ok(role === "admin" ? patterns : patterns.map((p) => ({ ...p, originProjectIds: [] })));
/** `promote_pattern` — 익명화 → 리뷰 → 게시 */
export const promotePattern = (sourceIds: string[]) => ok({ patternId: "pt-new", sourceIds });

/* ── AI ────────────────────────────────────────── */
/** `ask_ai` — Nora 플로우. 범위(scope)는 항상 현재 프로젝트로 잠긴다 */
export const askAi = (scope: { projectId?: string; itemId?: string }, text: string): Promise<AiTurn> =>
  ok(aiScenarios.flatMap((s) => s.turns).find((t) => t.role === "ai") ?? { role: "ai", text: `(${scope.projectId ?? "global"}) ${text}` });

// deliverables 를 참조만 해두어 미사용 경고 방지 — 실제 구현 시 제거
void deliverables;
