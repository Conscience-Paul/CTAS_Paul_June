import { contextItems, links, sources } from "./context";
import { agentRuns, tasks } from "./workflow";
import { contracts } from "./contracts";
import { deliverables, patterns, templates } from "./knowledge";
import { customers, projects } from "./org";
import type { AgentRun, ContextItem, ContextKind, ContextVersion, Deliverable, Pattern, SourceKind, Template } from "./types";

/**
 * 지식 › 문서함 — 계약·문서와 같은 Finder 식 폴더 구조.
 *   문서함
 *   ├─ <고객사>
 *   │   └─ <프로젝트>
 *   │       ├─ 회의록 · 요구사항 · 의사결정 · 고객 문서 · 우리 문서 · 대화 · 변경   (컨텍스트)
 *   │       └─ 산출물
 *   ├─ 패턴 라이브러리   (교차 프로젝트, 추상화된 것만)
 *   └─ 템플릿
 */

export interface KFolder {
  id: string;
  name: string;
  parentId: string | null;
  /** 프로젝트 폴더면 projectId, 컨텍스트 종류 폴더면 kind */
  projectId?: string;
  contextKind?: ContextKind;
  special?: "deliverables" | "runs" | "patterns" | "templates";
}

const KIND_FOLDERS: { kind: ContextKind; name: string }[] = [
  { kind: "meeting_note", name: "회의록" },
  { kind: "requirement", name: "요구사항" },
  { kind: "decision", name: "의사결정" },
  { kind: "customer_doc", name: "고객 문서" },
  { kind: "our_doc", name: "우리 문서" },
  { kind: "conversation", name: "대화" },
  { kind: "change", name: "변경" },
];

export const kFolders: KFolder[] = [
  ...customers.map((c) => ({ id: `kf-${c.id}`, name: c.name, parentId: null })),
  ...projects.flatMap((p) => [
    { id: `kf-${p.id}`, name: p.name.replace(/^한빛유통 |^세종캐피탈 /, ""), parentId: `kf-${p.customerId}`, projectId: p.id },
    ...KIND_FOLDERS.map((k) => ({ id: `kf-${p.id}-${k.kind}`, name: k.name, parentId: `kf-${p.id}`, projectId: p.id, contextKind: k.kind })),
    { id: `kf-${p.id}-deliverables`, name: "산출물", parentId: `kf-${p.id}`, projectId: p.id, special: "deliverables" as const },
    { id: `kf-${p.id}-runs`, name: "실행 결과", parentId: `kf-${p.id}`, projectId: p.id, special: "runs" as const },
  ]),
  { id: "kf-patterns", name: "패턴 라이브러리", parentId: null, special: "patterns" },
  { id: "kf-templates", name: "템플릿", parentId: null, special: "templates" },
];

export type KEntry =
  | { type: "context"; id: string; item: ContextItem }
  | { type: "deliverable"; id: string; item: Deliverable }
  /** 업무가 만들어낸 문서 — 에이전트 실행 결과서. id 는 그 업무의 최신 AgentRun */
  | { type: "run"; id: string; item: AgentRun }
  | { type: "pattern"; id: string; item: Pattern }
  | { type: "template"; id: string; item: Template };

/** 프로젝트 업무별 최신 실행 결과 (업무 하나 = 문서 하나, 시도는 버전) */
export const latestRuns = (projectId: string): AgentRun[] =>
  tasks
    .filter((t) => t.projectId === projectId)
    .map((t) => agentRuns.filter((r) => r.taskId === t.id).sort((a, b) => b.attempt - a.attempt)[0])
    .filter((r): r is AgentRun => !!r);

export const runsOfTask = (taskId: string) => agentRuns.filter((r) => r.taskId === taskId).sort((a, b) => a.attempt - b.attempt);

export const kFolderPath = (folderId: string): KFolder[] => {
  const path: KFolder[] = [];
  let cur = kFolders.find((f) => f.id === folderId);
  while (cur) {
    path.unshift(cur);
    cur = cur.parentId ? kFolders.find((f) => f.id === cur!.parentId) : undefined;
  }
  return path;
};

/** 폴더 바로 아래의 항목 */
export const kEntriesIn = (folderId: string | null): KEntry[] => {
  if (!folderId) return [];
  const f = kFolders.find((x) => x.id === folderId);
  if (!f) return [];
  if (f.special === "patterns") return patterns.map((p) => ({ type: "pattern", id: p.id, item: p }));
  if (f.special === "templates") return templates.map((t) => ({ type: "template", id: t.id, item: t }));
  if (f.special === "deliverables") return deliverables.filter((d) => d.projectId === f.projectId).map((d) => ({ type: "deliverable", id: d.id, item: d }));
  // 실행 결과는 문서가 된 것만 — 제출됨(= draft) · 승인됨(= 배포됨). 대기·실행 중·실패·반려는 개발 › 업무에서만
  if (f.special === "runs") return latestRuns(f.projectId!).filter((r) => r.state === "submitted" || r.state === "approved").map((r) => ({ type: "run", id: r.id, item: r }));
  if (f.contextKind) return contextItems.filter((c) => c.projectId === f.projectId && c.kind === f.contextKind).map((c) => ({ type: "context", id: c.id, item: c }));
  return [];
};

/** 폴더와 하위 전체 항목 수 */
export const kCountIn = (folderId: string): number => {
  const children = kFolders.filter((f) => f.parentId === folderId);
  return kEntriesIn(folderId).length + children.reduce((s, c) => s + kCountIn(c.id), 0);
};

/** id 로 항목과 그 항목이 들어 있는 폴더를 찾는다 — 사이드바 트리·본문 뷰어 공용 */
export const findKEntry = (id: string): { entry: KEntry; folderId: string } | undefined => {
  for (const f of kFolders) {
    const entry = kEntriesIn(f.id).find((e) => e.id === id);
    if (entry) return { entry, folderId: f.id };
  }
  return undefined;
};

/** 파일 아이콘용 확장자 */
// 문서는 배포 서비스(Google Docs·Notion …)와 무관하게 일반 문서 아이콘 하나로. 형식이 실제로 다른 고객 PDF 만 구분
export const kExt = (e: KEntry): string => {
  if (e.type === "context" && e.item.kind === "customer_doc") return "pdf";
  return "file";
};

/**
 * 배포 위치 — 승인된 버전이 나가는 곳. 서비스마다 다를 수 있어 이름과 링크를 같이 든다.
 * 쓰기 가능한 원본(Google Docs 등)이면 그 문서를 덮어쓰고, 읽기 전용 출처(Slack·카카오·녹취…)면
 * 지식 폴더 구조 그대로 만든 Google Docs 파일로 나간다.
 */
export interface DeployTarget {
  service: string;
  url: string;
  /** 파일 이름 또는 경로 */
  where: string;
}

/** 배포(쓰기)가 가능한 출처 → 서비스 이름. Notion 등이 붙으면 여기에 추가 */
const WRITABLE: Partial<Record<SourceKind, string>> = { gdrive: "Google Docs" };

export const deployTargetOf = (e: KEntry): DeployTarget => {
  const o = kOrigin(e);
  const title = findDocLike(e.id)?.title ?? e.id;
  const service = o.kind !== "ctas" ? WRITABLE[o.kind] : undefined;
  if (service) return { service, url: o.url, where: title };
  const folderId = findKEntry(e.id)?.folderId;
  const where = ["CTAS", ...(folderId ? kFolderPath(folderId).map((f) => f.name) : []), title].join(" › ");
  return { service: "Google Docs", url: `https://docs.google.com/document/d/ctas-${e.id}`, where };
};

/** 원본 위치 — 소스 종류별 목 URL. 아이콘만 보여주고 새 탭으로 */
export const kOrigin = (e: KEntry): { kind: SourceKind | "ctas"; label: string; url: string } => {
  if (e.type === "context") {
    const src = sources.find((s) => s.id === e.item.sourceId);
    const kind = src?.kind ?? "manual";
    const base: Record<SourceKind, [string, string]> = {
      slack: ["Slack", "https://slack.com/app_redirect?channel=hanbit-ims"],
      discord: ["Discord", "https://discord.com/channels/ctas"],
      kakao: ["카카오톡 내보내기", "https://drive.google.com/drive/folders/1CTAS-kakao"],
      email: ["이메일", "https://mail.google.com/mail/u/0/#search/hanbit"],
      gdrive: ["Google Drive", "https://drive.google.com/drive/folders/1CTAS-hanbit"],
      git: ["GitHub", "https://github.com/conscience-tech/hanbit-ims/pull/142"],
      meeting: ["Google Meet 녹취", "https://drive.google.com/drive/folders/1CTAS-meet"],
      manual: ["CTAS", "#"],
    };
    const [label, url] = base[kind];
    return { kind, label, url };
  }
  return { kind: "ctas", label: "CTAS 생성", url: "#" };
};

/** 모든 문서 종류를 같은 모양으로 — AI 멘션·Drawer 공용 */
export interface DocLike {
  id: string;
  title: string;
  kind: string;
  kindLabel: string;
  versions: ContextVersion[];
}

export const findDocLike = (id: string): DocLike | undefined => {
  const c = contextItems.find((x) => x.id === id);
  if (c) return { id, title: c.title, kind: c.kind, kindLabel: "컨텍스트", versions: c.versions };
  const d = deliverables.find((x) => x.id === id);
  if (d) return { id, title: d.title, kind: `deliverable:${d.kind}`, kindLabel: "산출물", versions: d.versions };
  const r = agentRuns.find((x) => x.id === id);
  if (r) {
    const t = tasks.find((x) => x.id === r.taskId);
    const vs = runsOfTask(r.taskId);
    return {
      id,
      title: `${t?.title ?? r.taskId} — 실행 결과`,
      kind: "run",
      kindLabel: "실행 결과",
      versions: vs.map((x) => ({
        v: x.attempt,
        at: x.startedAt,
        author: { kind: "ai" as const, model: x.agent },
        summary: `#${x.attempt} ${x.state} — ${x.summary}`,
        basedOn: t?.contextIds ?? [],
        body: `## 계획\n${x.plan}\n\n## 결과\n${x.summary}${x.diff ? `\n\n## 변경 파일\n${x.diff}` : ""}${x.rejectReason ? `\n\n## 반려 사유\n${x.rejectReason}` : ""}`,
      })),
    };
  }
  const p = patterns.find((x) => x.id === id);
  if (p)
    return {
      id,
      title: p.title,
      kind: "pattern",
      kindLabel: "패턴",
      versions: [{ v: 1, at: "2026-10-01T09:00:00", author: { kind: "ai", model: "Nora" }, summary: "패턴 요약", basedOn: [], body: `${p.summary}\n\n언제: ${p.when}\n어떻게: ${p.how}` }],
    };
  const t = templates.find((x) => x.id === id);
  if (t)
    return {
      id,
      title: t.name,
      kind: "template",
      kindLabel: "템플릿",
      versions: [{ v: 1, at: "2026-01-10T09:00:00", author: { kind: "human", memberId: "m-seoyeon" }, summary: "표준 템플릿", basedOn: [], body: `${t.description}\n\n섹션: ${t.sections.join(" · ")}` }],
    };
  return undefined;
};

/** 문서 계보 — 근거로 쓴 문서(parents) / 이 문서를 근거로 만든 문서(children). AI 답변·그래프 공용 */
export interface LineageHop {
  id: string;
  title: string;
  /** 어떤 버전·경로로 연결됐는지 */
  via: string;
}

const titleOf = (id: string) => findDocLike(id)?.title ?? contracts.find((c) => c.id === id)?.title ?? id;

export const lineageOf = (id: string): { parents: LineageHop[]; children: LineageHop[] } => {
  const parents = new Map<string, LineageHop>();
  const children = new Map<string, LineageHop>();
  const addP = (src: string, via: string) => { if (src !== id && !parents.has(src)) parents.set(src, { id: src, title: titleOf(src), via }); };
  const addC = (dst: string, via: string) => { if (dst !== id && !children.has(dst)) children.set(dst, { id: dst, title: titleOf(dst), via }); };

  const self = findDocLike(id) ?? (() => { const c = contracts.find((x) => x.id === id); return c ? { versions: c.versions } : undefined; })();
  const run = agentRuns.find((x) => x.id === id);
  if (run) tasks.find((t) => t.id === run.taskId)?.contextIds.forEach((src) => addP(src, "업무 근거"));
  self?.versions.forEach((ver) => ver.basedOn.forEach((src) => addP(src, `v${ver.v}`)));
  deliverables.find((d) => d.id === id)?.generatedFrom.forEach((src) => addP(src, "생성"));

  contextItems.forEach((c) => c.versions.forEach((ver) => { if (ver.basedOn.includes(id)) addC(c.id, `v${ver.v}`); }));
  deliverables.forEach((d) => { if (d.generatedFrom.includes(id)) addC(d.id, "생성"); d.versions.forEach((ver) => { if (ver.basedOn.includes(id)) addC(d.id, `v${ver.v}`); }); });
  contracts.forEach((c) => c.versions.forEach((ver) => { if (ver.basedOn.includes(id)) addC(c.id, `v${ver.v}`); }));
  links.forEach((l) => {
    if (l.rel === "derived_from" || l.rel === "decided_by" || l.rel === "implements") {
      if (l.from === id) addP(l.to, "링크");
      if (l.to === id) addC(l.from, "링크");
    }
    if (l.rel === "changed_by") {
      if (l.to === id) addP(l.from, "변경");
      if (l.from === id) addC(l.to, "변경");
    }
  });
  return { parents: [...parents.values()], children: [...children.values()] };
};
