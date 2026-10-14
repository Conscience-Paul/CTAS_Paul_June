"use client";

/**
 * 추적 타임라인 — 1일 단위 열 × 레인(입력 · 요구·결정 · 설계·변경 · 업무 · 산출물 · 계약·문서).
 * 칩은 짧은 제목만. 클릭 → Drawer(내용 · 버전 · 연결/계보). 프로젝트는 상단 드롭다운으로 전환.
 * 외부 라이브러리 없음. 좌표는 계산값(px), 색은 토큰.
 */

import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { EmptyState, Select } from "@/components/ctas/ctds";
import { Page, PageHeader, Panel } from "@/components/ctas/ui";
import { KnowledgeDrawer } from "@/app/knowledge/_shared";
import { LABEL, TODAY, byProject, contracts, fmtDate, getProject, getTask, latestRuns, projects, runsOfTask, type ContextKind, type KEntry } from "@/lib/mock";
import { usePreview } from "@/lib/preview-state";
import styles from "./graph.module.css";

type Kind = ContextKind | "task" | "deliverable" | "contract";

interface Chip {
  id: string;
  title: string;
  kind: Kind;
  kindLabel: string;
  lane: number;
  day: number;
  at: string;
  version: number;
  row: number;
}

const LANES: { title: string; kinds: Kind[] }[] = [
  { title: "입력", kinds: ["meeting_note", "conversation", "customer_doc"] },
  { title: "요구·결정", kinds: ["requirement", "decision"] },
  { title: "설계·변경", kinds: ["our_doc", "change"] },
  { title: "실행 결과", kinds: ["task"] },
  { title: "산출물", kinds: ["deliverable"] },
  { title: "계약·문서", kinds: ["contract"] },
];

const DAY = 86_400_000;
const DAY_W = 112;
const CHIP_H = 30;
const CHIP_GAP = 4;
const LANE_PAD = 6;

export default function TraceTimelinePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const project = getProject(id);
  const { extraVersions } = usePreview();
  const [open, setOpen] = useState<KEntry | null>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);

  const { chips, start, days, laneRows } = useMemo(() => {
    if (!project) return { chips: [] as Chip[], start: new Date(TODAY), days: 1, laneRows: [] as number[] };
    const ctx = byProject.context(project.id);
    const dels = byProject.deliverables(project.id);
    const cts = contracts.filter((c) => c.projectId === project.id);
    const runs = latestRuns(project.id);
    const laneOf = (k: Kind) => LANES.findIndex((l) => l.kinds.includes(k));
    const vcount = (docId: string, base: number) => base + (extraVersions[docId]?.length ?? 0);

    const raw: Omit<Chip, "day" | "row">[] = [
      ...ctx.map((c) => ({ id: c.id, title: c.title, kind: c.kind as Kind, kindLabel: LABEL.contextKind[c.kind], lane: laneOf(c.kind), at: c.versions[0].at, version: vcount(c.id, c.versions.length) })),
      ...dels.map((d) => ({ id: d.id, title: d.title, kind: "deliverable" as Kind, kindLabel: LABEL.deliverableKind[d.kind], lane: laneOf("deliverable"), at: d.versions[0].at, version: vcount(d.id, d.versions.length) })),
      ...cts.map((c) => ({ id: c.id, title: c.title, kind: "contract" as Kind, kindLabel: "계약·문서", lane: laneOf("contract"), at: c.versions[0].at, version: vcount(c.id, c.versions.length) })),
      // 업무 자체가 아니라 업무가 만들어낸 문서(실행 결과서). 시도 횟수가 버전.
      ...runs.map((r) => ({ id: r.id, title: `${getTask(r.taskId)?.title ?? r.taskId} — 실행 결과`, kind: "task" as Kind, kindLabel: "실행 결과", lane: laneOf("task"), at: runsOfTask(r.taskId)[0].startedAt, version: r.attempt })),
    ].sort((a, b) => a.at.localeCompare(b.at));

    const times = raw.map((r) => new Date(r.at).getTime());
    const s = new Date(Math.min(...times) - 2 * DAY);
    s.setHours(0, 0, 0, 0);
    const e = new Date(Math.max(...times, new Date(TODAY).getTime()) + 3 * DAY);
    const d = Math.ceil((e.getTime() - s.getTime()) / DAY);

    // 같은 레인·같은 날은 세로로 쌓는다
    const rowsUsed = new Map<string, number>();
    const placed: Chip[] = raw.map((r) => {
      const dayIdx = Math.floor((new Date(r.at).getTime() - s.getTime()) / DAY);
      const key = `${r.lane}:${dayIdx}`;
      const row = rowsUsed.get(key) ?? 0;
      rowsUsed.set(key, row + 1);
      return { ...r, day: dayIdx, row };
    });
    const laneMax = LANES.map((_, i) => Math.max(1, ...placed.filter((c) => c.lane === i).map((c) => c.row + 1)));
    return { chips: placed, start: s, days: d, laneRows: laneMax };
  }, [project, extraVersions]);

  // 처음엔 오늘 근처가 보이도록 스크롤
  const todayIdx = Math.floor((new Date(TODAY).getTime() - start.getTime()) / DAY);
  useEffect(() => {
    const el = scrollerRef.current;
    if (el) el.scrollLeft = Math.max(0, todayIdx * DAY_W - el.clientWidth + DAY_W * 3 + 128);
  }, [todayIdx, project?.id]);

  if (!project) return <Page><EmptyState icon="empty" title="프로젝트를 찾을 수 없습니다" /></Page>;

  const width = days * DAY_W;
  const dayList = Array.from({ length: days }, (_, i) => new Date(start.getTime() + i * DAY));
  const openChip = (c: Chip) => {
    if (c.kind === "task") { const r = latestRuns(project.id).find((x) => x.id === c.id); if (r) setOpen({ type: "run", id: r.id, item: r }); return; }
    if (c.kind === "contract") return router.push(`/ops/contracts`);
    const ctx = byProject.context(project.id).find((x) => x.id === c.id);
    if (ctx) return setOpen({ type: "context", id: c.id, item: ctx });
    const del = byProject.deliverables(project.id).find((x) => x.id === c.id);
    if (del) setOpen({ type: "deliverable", id: c.id, item: del });
  };

  return (
    <Page wide>
      <PageHeader
        title="추적 타임라인"
        actions={
          <Select size="sm" width={280} value={project.id} onValueChange={(v) => router.push(`/projects/${v}/context/graph`)}>
            <Select.Trigger aria-label="프로젝트 선택" />
            <Select.Content>
              {projects.map((p) => (
                <Select.Item key={p.id} value={p.id}>{p.name}</Select.Item>
              ))}
            </Select.Content>
          </Select>
        }
      />

      <div className={styles.toolbar}>
        <div className={styles.legend} role="list">
          {LANES.map((l) => (
            <span key={l.title} className={styles.legendItem} role="listitem"><span className={styles.swatch} style={{ background: `var(${{ "요구·결정": "--primary", 입력: "--border-strong", "설계·변경": "--info", "실행 결과": "--warning", 산출물: "--success", "계약·문서": "--destructive" }[l.title]})` }} />{l.title}</span>
          ))}
        </div>
      </div>

      {chips.length === 0 ? (
        <Panel><EmptyState size="sm" icon="line-segments" title="문서가 없습니다" /></Panel>
      ) : (
        <Panel flush>
          <div className={styles.scroller} ref={scrollerRef}>
            <div className={styles.row}>
              <div className={styles.labelCell} />
              <div className={styles.axis} style={{ width }}>
                {dayList.map((dt, i) => {
                  const iso = dt.toISOString().slice(0, 10);
                  const wk = dt.getDay() === 0 || dt.getDay() === 6;
                  return (
                    <span key={iso} className={styles.day} data-today={iso === TODAY || undefined} data-weekend={wk || undefined} data-month={dt.getDate() === 1 || i === 0 || undefined} style={{ left: i * DAY_W, width: DAY_W }}>
                      {(dt.getDate() === 1 || i === 0) && <span>{dt.getMonth() + 1}월</span>}
                      <span>{dt.getDate()} {["일", "월", "화", "수", "목", "금", "토"][dt.getDay()]}</span>
                    </span>
                  );
                })}
              </div>
            </div>
            {LANES.map((l, i) => {
              const h = laneRows[i] * (CHIP_H + CHIP_GAP) + LANE_PAD * 2;
              return (
                <div key={l.title} className={styles.row} style={{ height: h }}>
                  <div className={styles.labelCell}>
                    <span className={styles.laneTitle}>{l.title}</span>
                    <span className={styles.laneCount}>{chips.filter((c) => c.lane === i).length}</span>
                  </div>
                  <div className={styles.lane} style={{ width, height: h, "--day-w": `${DAY_W}px` } as React.CSSProperties}>
                    {dayList.map((dt, di) => {
                      const wk = dt.getDay() === 0 || dt.getDay() === 6;
                      return <span key={di} className={styles.grid} data-weekend={wk || undefined} style={{ left: di * DAY_W }} />;
                    })}
                    <span className={styles.today} style={{ left: todayIdx * DAY_W }} />
                    {chips.filter((c) => c.lane === i).map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        className={styles.chip}
                        data-kind={c.kind}
                        style={{ left: c.day * DAY_W + 3, top: LANE_PAD + c.row * (CHIP_H + CHIP_GAP), width: DAY_W - 6, height: CHIP_H }}
                        title={`${c.title} · ${c.kindLabel} · v${c.version} · ${fmtDate(c.at)}`}
                        onClick={() => openChip(c)}
                      >
                        <span className={styles.chipText}>{c.title}</span>
                        {c.version > 1 && <span className={styles.chipVer}>v{c.version}</span>}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>
      )}

      {open && <KnowledgeDrawer entry={open} onClose={() => setOpen(null)} onAskAi={() => setOpen(null)} />}
    </Page>
  );
}
