"use client";

/**
 * 타임라인 보드 — 기간(from~to) 안의 날짜를 행으로, 같은 행에 [마일스톤 | 타임라인].
 * 보기: 목록(기본, 날짜 행 접기) / 트랙(날짜 열 — 위 마일스톤 구역, 아래 타임라인 구역. 같은 가로 스크롤이라 열이 맞는다).
 * 타임라인 = "무슨 일이 있었나" 사건 (ains 데일리 타임라인과 같은 6유형):
 *   회의 · 범위 변경 · 진행 · 기획 변경 · 고객 피드백 · 결정.
 *   산출물은 넣지 않는다 — 액션마다 있을 수도 없을 수도 있어, 반영처(→)로만 보인다.
 * 필터: 유형 칩 — 전체가 켜진 상태에서 누르면 그 유형만, 아니면 켜고 끄기.
 * 각 사건은 누가·어디서 + 근거(parents) → 반영처(children)를 한 줄에. 클릭 → Drawer(내용 · 버전 · 연결/계보).
 */

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Button, EmptyState, Icon, useToast, type IconName } from "@/components/ctas/ctds";
import { MilestoneBadge, Panel } from "@/components/ctas/ui";
import { KnowledgeDrawer } from "@/app/knowledge/_shared";
import { DocDrawer } from "@/app/knowledge/contracts/_shared";
import { TaskDrawer } from "@/app/projects/[id]/tasks/_drawer";
import {
  LABEL,
  TODAY,
  byProject,
  contracts,
  daysUntil,
  fmtDate,
  getContext,
  getDeliverable,
  getMember,
  getProject,
  getRun,
  getTask,
  lineageOf,
  members,
  runsOfTask,
  type ContextKind,
  type ContractDoc,
  type DeliveryStatus,
  type KEntry,
  type LineageHop,
  type Milestone,
  type Task,
  type TaskEventKind,
} from "@/lib/mock";
import { usePreview } from "@/lib/preview-state";
import styles from "./TraceTimeline.module.css";

/**
 * 사건 유형 7가지 — ains EVENT_KINDS 를 바탕으로, ains 의 "진행"을 개발 · 이슈로 나눴다.
 * 검수·전달은 따로 두지 않는다: 발송물은 액션의 산출물로, 고객 검수는 고객 피드백, 승인은 결정.
 * 업무 생성·착수·분류 같은 관리 기록은 넣지 않는다 (업무 화면에 있음).
 */
type LaneKey = "meeting" | "decision" | "plan" | "scope" | "feedback" | "dev" | "issue";

interface Item {
  /** 화면 키 (업무 이력은 업무 id + 순번) */
  id: string;
  /** 어디서 왔나 — Drawer·이동 대상 */
  src: { type: "context" | "contract" | "run"; id: string } | { type: "task"; id: string };
  projectId: string;
  title: string;
  /** 원본 종류 (회의록·대화·실행 결과·업무 이력 …) */
  srcLabel: string;
  lane: LaneKey;
  at: string;
  /** 업무 이력처럼 날짜만 있는 사건 */
  dateOnly?: boolean;
  /** 누가 · 어디서 */
  who?: string;
  channel?: string;
  version: number;
  parents: LineageHop[];
  children: LineageHop[];
  /** 산출물을 직접 지정할 때 (Nora 제출 → 실행 결과서). 없으면 children 중 산출물 */
  outputs?: LineageHop[];
}

/** 한 사건의 앞뒤 연결 */
interface Links {
  /** 근거 — target 이 있으면 타임라인 안 그 사건으로 이동 */
  prev: { hop: LineageHop; target?: Item }[];
  /** 이 사건이 낳은 산출물 (없을 수도 있음) */
  outputs: LineageHop[];
  /** 이 사건·산출물을 근거로 쓴 다음 액션 */
  next: { item: Item; via?: string }[];
}

/** 연결 칩은 종류마다 이 개수까지 보이고 나머지는 "+N개 더" */
const LINK_LIMIT = 3;

const LANES: { key: LaneKey; title: string; icon: IconName; color: string }[] = [
  { key: "meeting", title: "회의", icon: "waveform", color: "--fg-muted" },
  { key: "decision", title: "결정", icon: "seal-check", color: "--primary" },
  { key: "plan", title: "기획 변경", icon: "pencil-simple", color: "--info" },
  { key: "scope", title: "범위 변경", icon: "arrows-down-up", color: "--warning" },
  { key: "feedback", title: "고객 피드백", icon: "chat-text", color: "--success" },
  { key: "dev", title: "개발", icon: "brackets-square", color: "--fg-strong" },
  { key: "issue", title: "이슈", icon: "warning-circle", color: "--destructive" },
];

/** 업무 이력 종류 → 사건 유형. null = 타임라인에서 뺀다 (관리 기록) */
const LANE_OF_TASK_EVENT: Record<TaskEventKind, LaneKey | null> = {
  create: null, start: null, triage: null, merge: null, comm: null,
  pr: "dev", submit: "dev", reject: "dev", analysis: "dev",
  verify: "feedback",
  blocked: "issue", risk: "issue", delay: "issue", incident: "issue",
};

/** 고객이 보낸 것 중 결함·장애·지연이면 이슈 */
const ISSUE_WORDS = /오류|장애|지연|미응답|불가/;
const ALL_LANES = LANES.map((l) => l.key);
const laneMeta = (k: LaneKey) => LANES.find((l) => l.key === k)!;

/** 우리 팀이 남긴 것인지 — 아니면 고객이 보낸 것 */
const isInternal = (by: string) => by === "자동 녹취" || by === "수동 생성" || by.startsWith("Nora") || members.some((m) => m.name === by);

/** 컨텍스트 항목 → 사건 유형. null = 뺀다 (우리 팀 내부 대화 — 의미 있는 건 고객 응답·이슈로 따로 잡힌다) */
const laneOfContext = (kind: ContextKind, title: string, channel: string, by: string): LaneKey | null => {
  switch (kind) {
    case "meeting_note": return "meeting";
    case "decision": return "decision";
    case "requirement":
    case "our_doc": return "plan";
    case "customer_doc": return "feedback";
    case "conversation": return isInternal(by) ? null : ISSUE_WORDS.test(title) ? "issue" : "feedback";
    case "change": return channel === "GitHub" ? "dev" : "scope";
  }
};

const DAY = 86_400_000;
const DOW = ["일", "월", "화", "수", "목", "금", "토"];

/** "2026-10-13" 또는 "2026-10-13T09:00:00" → 로컬 Date */
export const parseLocal = (iso: string) => (iso.length <= 10 ? new Date(`${iso}T00:00:00`) : new Date(iso));
/** 로컬 날짜 키 yyyy-mm-dd */
export const dayKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const hm = (iso: string) => { const d = parseLocal(iso); return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`; };
/** 오른쪽 메타용 짧은 프로젝트 이름 — 고객사 접두어 제거 */
const shortProject = (id: string) => getProject(id)?.name.replace(/^\S+\s/, "") ?? id;
const dday = (m: Milestone) => { const d = daysUntil(m.due); return `D${d >= 0 ? "-" : "+"}${Math.abs(d)}`; };

export type BoardView = "list" | "track";

export function TimelineBoard({
  view,
  projectIds,
  from,
  to,
  milestones,
  nextMilestone,
  onShowMore,
  onRevealDate,
}: {
  /** 목록 / 트랙 — 페이지에서 한 번 정하면 마일스톤·타임라인에 함께 */
  view: BoardView;
  /** 타임라인에 보일 프로젝트 — 마일스톤 필터와 같은 범위 */
  projectIds: string[];
  /** 보는 기간 — 마일스톤과 추적 타임라인에 함께 */
  from: Date;
  to: Date;
  /** 이미 필터·기간이 적용된 마일스톤 */
  milestones: Milestone[];
  /** 기간 끝 다음의 첫 마일스톤 — 있으면 맨 위에 "더 보기" */
  nextMilestone?: Milestone;
  /** "더 보기" — 페이지가 기간 끝을 그 마일스톤 기한까지 넓힌다 */
  onShowMore?: (m: Milestone) => void;
  /** 연결을 따라 기간 밖 사건으로 이동할 때 — 페이지가 기간을 그 날짜까지 넓힌다 */
  onRevealDate?: (d: Date) => void;
}) {
  const { extraVersions, role } = usePreview();
  const { toast } = useToast();
  const [open, setOpen] = useState<KEntry | null>(null);
  const [lanes, setLanes] = useState<Set<LaneKey>>(() => new Set(ALL_LANES));
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const multi = projectIds.length > 1;

  const fromT = from.getTime();
  const toT = to.getTime() + DAY - 1; // to 는 그날 끝까지
  const pidKey = projectIds.join(",");

  /* 모든 사건 (기간·유형 필터 전) — 연결(근거·다음)은 기간 밖까지 따라간다 */
  const universe = useMemo<Item[]>(() => {
    const vcount = (docId: string, base: number) => base + (extraVersions[docId]?.length ?? 0);
    return pidKey
      .split(",")
      .filter(Boolean)
      .flatMap((pid): Item[] => [
        // 회의·결정·기획·고객 피드백·대화·변경 — 컨텍스트 항목
        ...byProject.context(pid).flatMap((c) => {
          const lane = laneOfContext(c.kind, c.title, c.origin.channel, c.origin.by);
          return lane ? [{
            id: c.id, src: { type: "context" as const, id: c.id }, projectId: pid, title: c.title, srcLabel: LABEL.contextKind[c.kind],
            lane, at: c.versions[0].at, who: c.origin.by, channel: c.origin.channel,
            version: vcount(c.id, c.versions.length), ...lineageOf(c.id),
          }] : [];
        }),
        // 계약은 변경 계약(CR)만 — 범위 변경 사건. 나머지 계약 문서는 지식 › 계약문서에서
        ...contracts.filter((c) => c.projectId === pid && c.title.includes("변경")).map((c) => ({
          id: c.id, src: { type: "contract" as const, id: c.id }, projectId: pid, title: c.title, srcLabel: "변경 계약",
          lane: "scope" as LaneKey, at: c.versions[0].at, version: vcount(c.id, c.versions.length), ...lineageOf(c.id),
        })),
        // 업무 이력 — 종류로 개발·고객 피드백·이슈를 가르고 관리 기록은 뺀다. 근거는 그 업무의 컨텍스트.
        // Nora 제출(submit)의 산출물 = 그 시도의 실행 결과서 (따로 사건으로 두지 않는다)
        ...byProject.tasks(pid).flatMap((t) => {
          const runs = runsOfTask(t.id);
          let submitN = 0;
          return t.timeline.flatMap((e, i) => {
            const lane = LANE_OF_TASK_EVENT[e.kind];
            const run = e.kind === "submit" ? runs[submitN++] : undefined;
            return lane ? [{
              id: `${t.id}#${i}`, src: { type: "task" as const, id: t.id }, projectId: pid, title: `${e.text} · ${t.title}`, srcLabel: "업무 이력",
              lane, at: e.at, dateOnly: e.at.length <= 10, who: e.who, version: 1,
              parents: t.contextIds.map((cid) => ({ id: cid, title: getContext(cid)?.title ?? cid, via: "업무 근거" })),
              children: run ? lineageOf(run.id).children : [],
              outputs: run ? [{ id: run.id, title: `실행 결과서 #${run.attempt}`, via: run.agent }] : undefined,
            }] : [];
          });
        }),
      ])
      .sort((a, b) => parseLocal(a.at).getTime() - parseLocal(b.at).getTime());
  }, [pidKey, extraVersions]);

  /* 기간 안의 사건 */
  const all = useMemo(() => universe.filter((x) => { const t = parseLocal(x.at).getTime(); return t >= fromT && t <= toT; }), [universe, fromT, toT]);

  /* 사건 사이의 연결 — 근거(앞) · 산출물 · 다음 액션(뒤). 문서 id 를 그 문서를 만든/담은 사건으로 바꾼다 */
  const graph = useMemo(() => {
    const byId = new Map(universe.map((x) => [x.id, x]));
    const firstOfTask = new Map<string, Item>();
    const producer = new Map<string, Item>(); // 산출물 id → 그것을 낳은 사건 (가장 최근)
    const outputsOf = (x: Item) => x.outputs ?? x.children.filter((c) => getDeliverable(c.id));
    universe.forEach((x) => {
      if (x.src.type === "task" && !firstOfTask.has(x.src.id)) firstOfTask.set(x.src.id, x);
      outputsOf(x).forEach((o) => producer.set(o.id, x));
    });
    // 업무 id 는 그 업무의 첫 사건, 산출물·실행 결과 id 는 그것을 낳은 사건으로
    const resolve = (id: string) => byId.get(id) ?? firstOfTask.get(id) ?? producer.get(id);

    const links = new Map<string, Links>();
    universe.forEach((x) => {
      // 근거·다음 칩도 최신이 앞 (타임라인 밖 문서는 맨 뒤)
      const prev = x.parents
        .map((hop) => ({ hop, target: resolve(hop.id) }))
        .filter((p) => p.target?.id !== x.id)
        .sort((a, b) => (b.target?.at ?? "").localeCompare(a.target?.at ?? ""));
      const outputs = outputsOf(x);
      const outIds = new Set(outputs.map((o) => o.id));
      const next = new Map<string, { item: Item; via?: string }>();
      x.children.filter((c) => !outIds.has(c.id) && !getDeliverable(c.id)).forEach((c) => { const t = resolve(c.id); if (t && t.id !== x.id) next.set(t.id, { item: t }); });
      // 산출물을 근거로 쓴 다음 액션
      outputs.forEach((o) => lineageOf(o.id).children.forEach((c) => { const t = resolve(c.id); if (t && t.id !== x.id && !next.has(t.id)) next.set(t.id, { item: t, via: o.title }); }));
      links.set(x.id, { prev, outputs, next: [...next.values()].sort((a, b) => b.item.at.localeCompare(a.item.at)) });
    });
    return { byId, links };
  }, [universe]);

  const items = all.filter((x) => lanes.has(x.lane));
  const allOn = lanes.size === ALL_LANES.length;
  const toggleLane = (k: LaneKey) => {
    const next = allOn ? new Set<LaneKey>([k]) : new Set(lanes);
    if (!allOn) {
      if (next.has(k)) next.delete(k);
      else next.add(k);
    }
    setLanes(next.size ? next : new Set(ALL_LANES));
  };

  /* 날짜 행 — 마일스톤 기한 ∪ 문서 날짜 */
  const rows = useMemo(() => {
    const map = new Map<string, { ms: Milestone[]; docs: Item[] }>();
    const at = (k: string) => { if (!map.has(k)) map.set(k, { ms: [], docs: [] }); return map.get(k)!; };
    milestones.forEach((m) => at(m.due).ms.push(m));
    items.forEach((x) => at(dayKey(parseLocal(x.at))).docs.push(x));
    // 최신이 위 — 날짜도, 같은 날 안의 사건도 내림차순 (트랙 보기는 시간축이라 왼→오 그대로)
    return [...map.entries()]
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([key, v]) => ({ key, ms: v.ms, docs: [...v.docs].reverse() }));
  }, [milestones, items]);

  const keys = rows.map((r) => r.key);
  const allCollapsed = keys.length > 0 && keys.every((k) => collapsed.has(k));
  const toggleRow = (k: string) => {
    const n = new Set(collapsed);
    if (n.has(k)) n.delete(k);
    else n.add(k);
    setCollapsed(n);
  };

  /* 열기는 전부 사이드 패널 — 타임라인 페이지를 떠나지 않는다 */
  const [openTask, setOpenTask] = useState<Task | null>(null);
  const [openContract, setOpenContract] = useState<ContractDoc | null>(null);
  const [delivery, setDelivery] = useState<Record<string, DeliveryStatus>>({});
  /** 문서·업무·계약·실행 결과 id → 맞는 사이드 패널 */
  const openById = (id: string) => {
    const ctx = getContext(id);
    if (ctx) return setOpen({ type: "context", id, item: ctx });
    const del = getDeliverable(id);
    if (del) return setOpen({ type: "deliverable", id, item: del });
    const task = getTask(id);
    if (task) return setOpenTask(task);
    const run = getRun(id);
    if (run) { const latest = runsOfTask(run.taskId).at(-1)!; return setOpen({ type: "run", id: latest.id, item: latest }); }
    const ct = contracts.find((c) => c.id === id);
    if (ct) {
      if (role !== "admin") return toast({ title: "계약문서는 관리자만 열 수 있습니다", tone: "warning" });
      return setOpenContract(ct);
    }
  };
  const openItem = (c: Item) => openById(c.src.id);
  const selectMs = (id: string) => setSelectedId((s) => (s === id ? null : id));

  /* ── 연결 따라가기: 이동 · 이전 위치 · 흐름 강조 ── */
  const [history, setHistory] = useState<string[]>([]);
  const [flashId, setFlashId] = useState<string | null>(null);
  const [flowId, setFlowId] = useState<string | null>(null);
  const [moreOpen, setMoreOpen] = useState<Set<string>>(() => new Set());
  const toggleMore = (k: string) => setMoreOpen((s) => { const n = new Set(s); if (n.has(k)) n.delete(k); else n.add(k); return n; });

  /** 대상 사건이 보이게: 유형 필터·접힘·기간을 풀고 그 자리로 스크롤 + 잠깐 강조 */
  const reveal = (target: Item) => {
    if (!lanes.has(target.lane)) setLanes(new Set(ALL_LANES));
    const k = dayKey(parseLocal(target.at));
    if (collapsed.has(k)) setCollapsed((s) => { const n = new Set(s); n.delete(k); return n; });
    const t = parseLocal(target.at).getTime();
    if (t < fromT || t > toT) onRevealDate?.(parseLocal(target.at));
    setFlashId(target.id);
    setPickedId(target.id); // 트랙 보기에선 그 점을 골라 상세를 펼친다
    window.setTimeout(() => setFlashId((cur) => (cur === target.id ? null : cur)), 1800);
  };
  const jump = (origin: Item, target: Item) => {
    setHistory((h) => [...h, origin.id].slice(-30));
    reveal(target);
  };
  const back = () => {
    const id = history[history.length - 1];
    setHistory((h) => h.slice(0, -1));
    const t = id ? graph.byId.get(id) : undefined;
    if (t) reveal(t);
  };
  useEffect(() => {
    if (!flashId) return;
    document.querySelector(`[data-item="${CSS.escape(flashId)}"]`)?.scrollIntoView({ block: "center", inline: "center" });
  }, [flashId, view]);

  /** 흐름 강조 — 고른 사건에서 근거 쪽으로 거슬러 올라가고, 다음 액션 쪽으로 따라 내려간 사건들 */
  const flowSet = useMemo(() => {
    if (!flowId) return null;
    const s = new Set([flowId]);
    const walk = (dir: "prev" | "next") => {
      const stack = [flowId];
      while (stack.length) {
        const l = graph.links.get(stack.pop()!);
        const ids = dir === "prev" ? (l?.prev ?? []).map((p) => p.target?.id) : (l?.next ?? []).map((n) => n.item.id);
        ids.forEach((id) => { if (id && !s.has(id)) { s.add(id); stack.push(id); } });
      }
    };
    walk("prev");
    walk("next");
    return s;
  }, [flowId, graph]);
  const flowItem = flowId ? graph.byId.get(flowId) : undefined;

  /* 트랙에서 고른 점 — 아래 상세로 펼친다. 연결로 이동해 오면 그 사건을 고른다 */
  const [pickedId, setPickedId] = useState<string | null>(null);
  const picked = pickedId ? graph.byId.get(pickedId) : undefined;

  /** 사건 한 줄 — 목록과 트랙 상세가 같이 쓴다. withDate: 트랙 상세처럼 날짜 행이 없을 때 시간 앞에 날짜 */
  const renderEvent = (x: Item, withDate = false) => {
    const lane = laneMeta(x.lane);
    const inFlow = flowSet?.has(x.id);
    const time = `${withDate ? `${fmtDate(x.at)} ` : ""}${x.dateOnly ? "" : hm(x.at)}`;
    return (
      <div key={x.id} className={styles.event} data-item={withDate ? undefined : x.id} data-wide-time={withDate || undefined} data-flash={(!withDate && flashId === x.id) || undefined} data-dim={(flowSet && !inFlow) || undefined} data-flow={(flowId === x.id) || undefined}>
        {/* 1줄: 시간 · 어떤 행위(배지) · 무엇(제목) ……… 누가 · 어디서 · 프로젝트 (작게) */}
        <div className={styles.eventHead}>
          <span className={styles.eventTime}>{time}</span>
          <span className={styles.typePill} style={{ "--lane": `var(${lane.color})` } as React.CSSProperties}>
            <Icon name={lane.icon} size={12} />{lane.title}
          </span>
          <button type="button" className={styles.eventTitle} onClick={() => openItem(x)} title={`${x.srcLabel} — 사이드 패널로 열기`}>
            <span className={styles.eventText}>{x.title}</span>
            {x.version > 1 && <span className={styles.chipVer}>v{x.version}</span>}
          </button>
          {/* 오른쪽 메타. hover 하면 맨 오른쪽에 흐름 보기 버튼이 메타 위로 겹쳐 뜬다 */}
          <span className={styles.eventMeta}>
            {[x.who, x.channel, multi ? shortProject(x.projectId) : null].filter(Boolean).join(" · ")}
            <button
              type="button"
              className={styles.flowBtn}
              data-on={flowId === x.id || undefined}
              onClick={() => setFlowId((f) => (f === x.id ? null : x.id))}
              aria-label={flowId === x.id ? "흐름 보기 끄기" : "흐름 보기"}
              aria-pressed={flowId === x.id}
              title={flowId === x.id ? "흐름 보기 끄기" : "흐름 보기 — 이 액션과 앞뒤로 연결된 액션만 진하게"}
            >
              <Icon name="line-segments" size={14} />
            </button>
          </span>
        </div>
        {/* 아래: 근거 · 산출물 · 다음 — 연결선으로 들여쓰기 */}
        <ItemLinks
          item={x}
          links={graph.links.get(x.id)!}
          moreOpen={moreOpen}
          onToggleMore={toggleMore}
          onJump={(t) => jump(x, t)}
          onOpenDoc={openById}
        />
      </div>
    );
  };

  return (
    <>
      <div className={styles.tools}>
        <div className={styles.filters} role="group" aria-label="타임라인 유형 필터">
          <span className={styles.toolLabel}>타임라인</span>
          <button type="button" className={styles.filter} data-active={allOn || undefined} onClick={() => setLanes(new Set(ALL_LANES))}>
            전체 <span className={styles.count}>{all.length}</span>
          </button>
          {LANES.map((l) => (
            <button key={l.key} type="button" className={styles.filter} data-active={(!allOn && lanes.has(l.key)) || undefined} onClick={() => toggleLane(l.key)}>
              <span style={{ color: `var(${l.color})`, display: "inline-flex" }}><Icon name={l.icon} size={12} /></span>
              {l.title}
              <span className={styles.count}>{all.filter((x) => x.lane === l.key).length}</span>
            </button>
          ))}
        </div>
        {history.length > 0 && (
          <Button size="xs" variant="outline" leftIcon={<Icon name="caret-left" />} onClick={back} title={graph.byId.get(history[history.length - 1])?.title}>
            이전 위치
          </Button>
        )}
        {view === "list" && keys.length > 0 && (
          <Button size="xs" variant="ghost" leftIcon={<Icon name={allCollapsed ? "caret-down" : "caret-up"} />} onClick={() => setCollapsed(allCollapsed ? new Set() : new Set(keys))}>
            {allCollapsed ? "모두 펼치기" : "모두 접기"}
          </Button>
        )}
      </div>

      {flowItem && (
        <div className={styles.flowBar} role="status">
          <span>
            <strong>흐름 보기</strong> · 「{flowItem.title}」 과 앞뒤로 연결된 액션 {(flowSet?.size ?? 1) - 1}건만 진하게 보여주는 중입니다. 나머지는 흐리게 처리했습니다.
          </span>
          <Button size="xs" variant="outline" onClick={() => setFlowId(null)}>흐름 보기 끄기</Button>
        </div>
      )}

      {/* 트랙·빈 화면에선 보드 위에 "더 보기" (목록은 보드 첫 줄) */}
      {nextMilestone && (view === "track" || rows.length === 0) && <ShowMore m={nextMilestone} onClick={() => onShowMore?.(nextMilestone)} />}

      {rows.length === 0 ? (
        <Panel><EmptyState size="sm" icon="line-segments" title="이 기간에 마일스톤·사건이 없습니다" /></Panel>
      ) : view === "list" ? (
        <Panel flush>
          <div className={styles.board}>
            <div className={styles.boardHead}>
              <span>날짜</span>
              <span>마일스톤 <span className={styles.count}>{milestones.length}</span></span>
              <span>타임라인 <span className={styles.count}>{items.length}</span></span>
            </div>
            {nextMilestone && <ShowMore m={nextMilestone} onClick={() => onShowMore?.(nextMilestone)} inBoard />}
            {rows.map((r) => {
              const d = parseLocal(r.key);
              const isCollapsed = collapsed.has(r.key);
              return (
                <div key={r.key} className={styles.boardRow} data-today={r.key === TODAY || undefined} data-selected={r.ms.some((m) => m.id === selectedId) || undefined}>
                  <button type="button" className={styles.dateCell} aria-expanded={!isCollapsed} onClick={() => toggleRow(r.key)}>
                    <span className={styles.dateCaret}><Icon name={isCollapsed ? "caret-right" : "caret-down"} size={12} /></span>
                    <span className={styles.dayLabel}>{d.getMonth() + 1}/{d.getDate()} ({DOW[d.getDay()]})</span>
                    {r.key === TODAY && <span className={styles.todayTag}>오늘</span>}
                  </button>

                  {/* 마일스톤 칸 */}
                  <div className={styles.msCell}>
                    {isCollapsed ? (
                      r.ms.length > 0 && <span className={styles.peek}>마일스톤 {r.ms.length}</span>
                    ) : (
                      r.ms.map((m) => (
                        <button key={m.id} type="button" className={styles.ms} data-selected={m.id === selectedId || undefined} onClick={() => selectMs(m.id)}>
                          <span className={styles.diamond} data-state={m.state} />
                          <span className={styles.msText}>
                            <span className={styles.msTitle}>{m.title}</span>
                            <span className={styles.msSub}>{multi ? `${getProject(m.projectId)?.name} · ` : ""}{getMember(m.ownerId)?.name}</span>
                          </span>
                          <MilestoneBadge state={m.state} />
                          {m.state !== "done" && <span className={styles.chipVer}>{dday(m)}</span>}
                        </button>
                      ))
                    )}
                  </div>

                  {/* 타임라인 칸 */}
                  <div className={styles.docCell}>
                    {isCollapsed ? (
                      r.docs.length > 0 && (
                        <span className={styles.peek}>
                          {LANES.filter((l) => r.docs.some((x) => x.lane === l.key)).map((l) => <span key={l.key} style={{ color: `var(${l.color})`, display: "inline-flex" }} title={l.title}><Icon name={l.icon} size={12} /></span>)}
                          사건 {r.docs.length}
                        </span>
                      )
                    ) : (
                      r.docs.map((x) => renderEvent(x))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>
      ) : (
        <TrackView
          items={items}
          milestones={milestones}
          lanes={LANES.filter((l) => lanes.has(l.key))}
          from={from}
          to={to}
          selectedId={selectedId}
          pickedId={picked?.id ?? null}
          flashId={flashId}
          flowSet={flowSet}
          onSelectMs={selectMs}
          onPick={setPickedId}
          detail={picked ? renderEvent(picked, true) : null}
        />
      )}

      {open && <KnowledgeDrawer entry={open} onClose={() => setOpen(null)} onAskAi={() => setOpen(null)} />}
      {openTask && <TaskDrawer task={openTask} onClose={() => setOpenTask(null)} />}
      {openContract && (
        <DocDrawer
          doc={openContract}
          delivery={delivery[openContract.id] ?? openContract.delivery.status}
          onDelivery={(s) => setDelivery((m) => ({ ...m, [openContract.id]: s }))}
          onClose={() => setOpenContract(null)}
          onAskAi={() => setOpenContract(null)}
        />
      )}
    </>
  );
}

/** 오늘(기간 끝) 위 — 다음 마일스톤까지 기간을 넓혀 더 보기 */
function ShowMore({ m, onClick, inBoard }: { m: Milestone; onClick: () => void; inBoard?: boolean }) {
  return (
    <button type="button" className={styles.showMore} data-in-board={inBoard || undefined} onClick={onClick}>
      <Icon name="caret-up" size={12} />
      다음 마일스톤까지 더 보기
      <span className={styles.showMoreTarget}>
        <span className={styles.diamond} data-state={m.state} />
        {m.title} · {fmtDate(m.due)} ({dday(m)})
      </span>
    </button>
  );
}

/** 타임라인에 없는 연결 문서 — 누르면 사이드 패널 */
function HopButton({ hop, className, onOpen }: { hop: LineageHop; className: string; onOpen: (id: string) => void }) {
  // 업무 id 는 계보에서 제목을 못 찾으므로 업무 제목으로 보완
  const task = getTask(hop.id);
  const title = task ? `업무 · ${task.title}` : hop.title;
  return (
    <button type="button" className={className} title={`${title} · ${hop.via} — 사이드 패널로 열기`} onClick={() => onOpen(hop.id)}>
      <span className={styles.chipLane} data-doc><Icon name={task ? "check-square" : "article"} size={10} /></span>
      <span className={styles.chipText}>{title}</span>
    </button>
  );
}

/** 사건 아래 연결 줄 — 근거 ← · 산출물 · → 다음 액션. 근거·다음은 누르면 타임라인 안 그 사건으로 이동 */
function ItemLinks({
  item,
  links,
  moreOpen,
  onToggleMore,
  onJump,
  onOpenDoc,
}: {
  item: Item;
  links: Links;
  moreOpen: Set<string>;
  onToggleMore: (k: string) => void;
  onJump: (target: Item) => void;
  /** 산출물·타임라인 밖 문서 → 사이드 패널 */
  onOpenDoc: (id: string) => void;
}) {
  const when = (t: Item) => `${fmtDate(t.at)}${t.dateOnly ? "" : ` ${hm(t.at)}`}`;
  const group = (key: string, label: ReactNode, chips: ReactNode[]) => {
    if (chips.length === 0) return null;
    const k = `${item.id}:${key}`;
    const open = moreOpen.has(k);
    const shown = open ? chips : chips.slice(0, LINK_LIMIT);
    const rest = chips.length - LINK_LIMIT;
    return (
      <div className={styles.linkGroup} data-group={key}>
        <span className={styles.linkLabel}>{label}</span>
        {/* 칩은 라벨 오른쪽 칸 안에서만 줄바꿈 — 둘째 줄도 첫 칩과 같은 선에서 시작 */}
        <div className={styles.linkChips}>
          {shown}
          {rest > 0 && (
            <button type="button" className={styles.moreBtn} onClick={() => onToggleMore(k)}>
              {open ? "접기" : `+${rest}개 더`}
            </button>
          )}
        </div>
      </div>
    );
  };

  const prevChips = links.prev.map(({ hop, target }) =>
    target ? (
      <button key={hop.id} type="button" className={styles.sourceChip} onClick={() => onJump(target)} title={`${when(target)} · ${laneMeta(target.lane).title} — 타임라인에서 보기`}>
        <span className={styles.chipLane} style={{ color: `var(${laneMeta(target.lane).color})` }}><Icon name={laneMeta(target.lane).icon} size={10} /></span>
        <span className={styles.chipText}>{hop.title}</span>
        <span className={styles.chipWhen}>{fmtDate(target.at)}</span>
      </button>
    ) : (
      <HopButton key={hop.id} hop={hop} className={styles.sourceChip} onOpen={onOpenDoc} />
    ),
  );
  const outChips = links.outputs.map((o) => (
    <button key={o.id} type="button" className={styles.outputChip} onClick={() => onOpenDoc(o.id)} title={`산출물 · ${o.via}`}>
      <Icon name="stack" size={10} />{o.title}
    </button>
  ));
  const nextChips = links.next.map(({ item: t, via }) => (
    <button key={t.id} type="button" className={styles.affects} onClick={() => onJump(t)} title={`${when(t)} · ${laneMeta(t.lane).title}${via ? ` · 산출물 "${via}" 을 근거로` : ""} — 타임라인에서 보기`}>
      <span className={styles.chipLane} style={{ color: `var(${laneMeta(t.lane).color})` }}><Icon name={laneMeta(t.lane).icon} size={10} /></span>
      <span className={styles.chipText}>{t.title}</span>
      <span className={styles.chipWhen}>{fmtDate(t.at)}</span>
    </button>
  ));

  if (prevChips.length + outChips.length + nextChips.length === 0) return null;
  return (
    <div className={styles.eventLinks}>
      {group("prev", <>← 근거</>, prevChips)}
      {group("out", <>▣ 산출물</>, outChips)}
      {group("next", <>→ 다음</>, nextChips)}
    </div>
  );
}

/* ── 트랙 (ains 방식) — 기간 전체를 화면 폭에 맞춘 시간축 × 행(마일스톤 · 유형별). 가로 스크롤 없음.
 *    점 = 사건 (유형 아이콘·색). 누르면 아래에 목록과 같은 상세(근거 · 산출물 · 다음)가 펼쳐진다. ── */
function TrackView({
  items,
  milestones,
  lanes,
  from,
  to,
  selectedId,
  pickedId,
  flashId,
  flowSet,
  onSelectMs,
  onPick,
  detail,
}: {
  items: Item[];
  milestones: Milestone[];
  lanes: typeof LANES;
  from: Date;
  to: Date;
  selectedId: string | null;
  pickedId: string | null;
  flashId: string | null;
  flowSet: Set<string> | null;
  onSelectMs: (id: string) => void;
  onPick: (id: string | null) => void;
  /** 고른 점의 상세 — 목록과 같은 한 줄 */
  detail: ReactNode;
}) {
  const start = new Date(from.getFullYear(), from.getMonth(), from.getDate()).getTime();
  const end = new Date(to.getFullYear(), to.getMonth(), to.getDate() + 1).getTime(); // 마지막 날 끝까지
  const span = end - start;
  const days = Math.round(span / DAY);
  const pct = (t: number) => Math.min(100, Math.max(0, ((t - start) / span) * 100));
  const pos = (iso: string) => pct(parseLocal(iso).getTime());

  // 눈금: 2주 이하는 매일, 두 달 이하는 매주, 그 이상은 2주마다
  const step = days <= 14 ? 1 : days <= 62 ? 7 : 14;
  const ticks = Array.from({ length: Math.floor((days - 1) / step) + 1 }, (_, i) => {
    const d = new Date(start + i * step * DAY);
    return { key: dayKey(d), left: pct(d.getTime()), label: `${d.getMonth() + 1}/${d.getDate()}${step === 1 ? ` ${DOW[d.getDay()]}` : ""}` };
  });
  const todayT = parseLocal(TODAY).getTime();
  const todayLeft = todayT >= start && todayT < end ? pct(todayT + DAY / 2) : null;

  // 같은 행에서 가까운 점(같은 날)은 세로로 쌓는다
  const stackRows = <T,>(xs: T[], at: (x: T) => string) => {
    const used = new Map<string, number>();
    return xs.map((x) => {
      const k = dayKey(parseLocal(at(x)));
      const row = used.get(k) ?? 0;
      used.set(k, row + 1);
      return { x, row };
    });
  };
  const DOT = 26;
  const heightOf = (rows: number[]) => Math.max(1, ...rows.map((r) => r + 1)) * DOT + 8;

  const grid = (
    <>
      {ticks.map((t) => <span key={t.key} className={styles.trackGrid} style={{ left: `${t.left}%` }} />)}
      {todayLeft !== null && <span className={styles.trackToday} style={{ left: `${todayLeft}%` }} />}
    </>
  );
  const msPlaced = stackRows(milestones, (m) => m.due);

  return (
    <Panel flush>
      <div className={styles.track}>
        {/* 축 */}
        <div className={styles.trackRow} data-axis>
          <span className={styles.trackLabel} />
          <div className={styles.trackLane}>
            {ticks.map((t) => <span key={t.key} className={styles.trackTick} data-today={t.key === TODAY || undefined} style={{ left: `${t.left}%` }}>{t.label}</span>)}
            {todayLeft !== null && <span className={styles.trackTodayLabel} style={{ left: `${todayLeft}%` }}>오늘</span>}
          </div>
        </div>

        {/* 마일스톤 */}
        <div className={styles.trackRow} data-ms style={{ height: heightOf(msPlaced.map((p) => p.row)) }}>
          <span className={styles.trackLabel}><Icon name="calendar-dots" size={12} />마일스톤 <span className={styles.count}>{milestones.length}</span></span>
          <div className={styles.trackLane}>
            {grid}
            {msPlaced.map(({ x: m, row }) => (
              <button
                key={m.id}
                type="button"
                className={styles.trackMs}
                data-selected={m.id === selectedId || undefined}
                style={{ left: `${pos(m.due + "T12:00:00")}%`, top: 4 + row * DOT }}
                title={`${m.title} · ${fmtDate(m.due)} · ${LABEL.milestoneState[m.state]}`}
                onClick={() => onSelectMs(m.id)}
              >
                <span className={styles.diamond} data-state={m.state} />
                <span className={styles.trackMsText}>{m.title}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 유형별 */}
        {lanes.map((l) => {
          const mine = stackRows(items.filter((x) => x.lane === l.key), (x) => x.at);
          return (
            <div key={l.key} className={styles.trackRow} style={{ height: heightOf(mine.map((p) => p.row)) }}>
              <span className={styles.trackLabel}>
                <span style={{ color: `var(${l.color})`, display: "inline-flex" }}><Icon name={l.icon} size={12} /></span>
                {l.title} <span className={styles.count}>{mine.length}</span>
              </span>
              <div className={styles.trackLane}>
                {grid}
                {mine.map(({ x, row }) => (
                  <button
                    key={x.id}
                    type="button"
                    className={styles.trackDot}
                    data-item={x.id}
                    data-picked={pickedId === x.id || undefined}
                    data-flash={flashId === x.id || undefined}
                    data-dim={(flowSet && !flowSet.has(x.id)) || undefined}
                    style={{ left: `${pos(x.at)}%`, top: 4 + row * DOT, color: `var(${l.color})` }}
                    title={`${fmtDate(x.at)}${x.dateOnly ? "" : ` ${hm(x.at)}`} · ${x.title}`}
                    aria-label={`${fmtDate(x.at)} ${l.title} ${x.title}`}
                    onClick={() => onPick(pickedId === x.id ? null : x.id)}
                  >
                    <Icon name={l.icon} size={12} />
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* 고른 점의 상세 — 목록과 같은 한 줄 */}
      <div className={styles.trackDetail}>
        {detail ?? <span className={styles.trackHint}>점을 누르면 근거 · 산출물 · 다음 액션이 여기에 펼쳐집니다</span>}
      </div>
    </Panel>
  );
}
