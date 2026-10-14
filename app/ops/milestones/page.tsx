"use client";

/**
 * 운영 › 마일스톤 — 전 프로젝트 마일스톤. 타임라인 / 캘린더 / 테이블 뷰,
 * 프로젝트·담당자 그룹, 프로젝트·담당자·상태 필터.
 */

import Link from "next/link";
import { useState } from "react";
import { Avatar, Badge, EventChip, FilterButton, Icon, IconButton, MetricCard, TableHeader, TableRow, Tabs } from "@/components/ctas/ctds";
import { Grid, MilestoneBadge, Page, PageHeader, Panel, Row, Subtle, TaskStateBadge, TableBox } from "@/components/ctas/ui";
import {
  LABEL,
  TODAY,
  daysUntil,
  fmtDate,
  getMember,
  getProject,
  getTask,
  members,
  milestones,
  projects,
  type Milestone,
  type MilestoneState,
} from "@/lib/mock";
import styles from "./milestones.module.css";

type View = "timeline" | "calendar" | "table";
type GroupBy = "project" | "owner";

const columns = [
  { key: "title", label: "마일스톤", flex: true, minWidth: 260 },
  { key: "project", label: "프로젝트", width: 220 },
  { key: "owner", label: "담당", width: 120 },
  { key: "due", label: "기한", width: 100 },
  { key: "dday", label: "D-day", width: 90, align: "end" as const },
  { key: "state", label: "상태", width: 100 },
  { key: "tasks", label: "연결 업무", width: 200 },
];

const STATES: MilestoneState[] = ["planned", "at_risk", "missed", "done"];
const EVENT_TONE: Record<MilestoneState, "info" | "warning" | "danger" | "success"> = {
  planned: "info",
  at_risk: "warning",
  missed: "danger",
  done: "success",
};

/* 타임라인 범위: 오늘 기준 -2주 ~ +10주 */
const DAY = 86_400_000;
const start = new Date(new Date(TODAY).getTime() - 14 * DAY);
const end = new Date(new Date(TODAY).getTime() + 70 * DAY);
const span = end.getTime() - start.getTime();
const pct = (iso: string) => Math.min(100, Math.max(0, ((new Date(iso).getTime() - start.getTime()) / span) * 100));

export default function MilestonesPage() {
  const [view, setView] = useState<View>("timeline");
  const [groupBy, setGroupBy] = useState<GroupBy>("project");
  const [projectFilter, setProjectFilter] = useState<string | null>(null);
  const [ownerFilter, setOwnerFilter] = useState<string | null>(null);
  const [stateFilter, setStateFilter] = useState<MilestoneState | null>(null);

  const list = milestones
    .filter((m) => (!projectFilter || m.projectId === projectFilter) && (!ownerFilter || m.ownerId === ownerFilter) && (!stateFilter || m.state === stateFilter))
    .sort((a, b) => a.due.localeCompare(b.due));

  const atRisk = milestones.filter((m) => m.state === "at_risk" || m.state === "missed").length;
  const soon = milestones.filter((m) => m.state === "planned" && daysUntil(m.due) <= 14).length;
  const done = milestones.filter((m) => m.state === "done").length;
  const owners = members.filter((m) => milestones.some((x) => x.ownerId === m.id));

  const groups: { key: string; label: string; items: Milestone[] }[] =
    groupBy === "project"
      ? projects.map((p) => ({ key: p.id, label: p.name, items: list.filter((m) => m.projectId === p.id) }))
      : owners.map((o) => ({ key: o.id, label: `${o.name} · ${o.title}`, items: list.filter((m) => m.ownerId === o.id) }));

  return (
    <Page wide>
      <PageHeader title="마일스톤" lead="전 프로젝트의 마일스톤을 시간축·달력·표로. 위험·놓침은 리스크 감지와 연결됩니다." />
      <Grid cols={3}>
        <MetricCard label="위험·놓침" value={atRisk} icon="warning-circle" />
        <MetricCard label="14일 이내" value={soon} icon="calendar-dots" />
        <MetricCard label="완료" value={done} icon="check-circle" description={`전체 ${milestones.length}`} />
      </Grid>

      <div className={styles.toolbar}>
        <Tabs value={view} onValueChange={(v) => setView(v as View)} variant="segmented" size="sm">
          <Tabs.List aria-label="보기">
            <Tabs.Trigger value="timeline" leadingIcon={<Icon name="line-segments" />}>타임라인</Tabs.Trigger>
            <Tabs.Trigger value="calendar" leadingIcon={<Icon name="calendar-blank" />}>캘린더</Tabs.Trigger>
            <Tabs.Trigger value="table" leadingIcon={<Icon name="table" />}>테이블</Tabs.Trigger>
          </Tabs.List>
        </Tabs>
        {view === "timeline" && (
          <Tabs value={groupBy} onValueChange={(v) => setGroupBy(v as GroupBy)} variant="segmented" size="sm">
            <Tabs.List aria-label="그룹">
              <Tabs.Trigger value="project">프로젝트별</Tabs.Trigger>
              <Tabs.Trigger value="owner">담당자별</Tabs.Trigger>
            </Tabs.List>
          </Tabs>
        )}
      </div>

      <div className={styles.filters}>
        <span className={styles.filterLabel}>프로젝트</span>
        <FilterButton size="sm" selected={projectFilter === null} onClick={() => setProjectFilter(null)}>전체</FilterButton>
        {projects.map((p) => (
          <FilterButton key={p.id} size="sm" selected={projectFilter === p.id} onClick={() => setProjectFilter(p.id)}>{p.kind} · {p.name.replace(/^한빛유통 |^세종캐피탈 /, "")}</FilterButton>
        ))}
        <span className={styles.filterLabel}>담당</span>
        <FilterButton size="sm" selected={ownerFilter === null} onClick={() => setOwnerFilter(null)}>전체</FilterButton>
        {owners.map((o) => (
          <FilterButton key={o.id} size="sm" selected={ownerFilter === o.id} onClick={() => setOwnerFilter(o.id)}>{o.name}</FilterButton>
        ))}
        <span className={styles.filterLabel}>상태</span>
        <FilterButton size="sm" selected={stateFilter === null} onClick={() => setStateFilter(null)}>전체</FilterButton>
        {STATES.map((s) => (
          <FilterButton key={s} size="sm" selected={stateFilter === s} onClick={() => setStateFilter(s)}>{LABEL.milestoneState[s]}</FilterButton>
        ))}
      </div>

      {view === "timeline" && <Timeline groups={groups} />}
      {view === "calendar" && <Calendar items={list} />}
      {view === "table" && (
        <TableBox>
          <TableHeader columns={columns} variant="line" />
          {list.map((m) => (
            <TableRow<Milestone>
              key={m.id}
              href={`/projects/${m.projectId}`}
              variant="line"
              data={m}
              columns={columns.map((c) => ({ ...c, render: (d: Milestone) => cell(c.key, d) }))}
            />
          ))}
        </TableBox>
      )}
    </Page>
  );
}

/* ── 타임라인 ─────────────────────────────────── */
function Timeline({ groups }: { groups: { key: string; label: string; items: Milestone[] }[] }) {
  const weeks: { label: string; left: number }[] = [];
  for (let t = start.getTime(); t < end.getTime(); t += 7 * DAY) {
    const d = new Date(t);
    weeks.push({ label: `${d.getMonth() + 1}/${d.getDate()}`, left: pct(d.toISOString()) });
  }
  return (
    <Panel flush>
      <div className={styles.timeline}>
        <div className={styles.tlHead}>
          <div className={styles.tlAxis} />
          <div className={styles.tlAxis}>
            {weeks.map((w) => (
              <span key={w.label} className={styles.tlWeek} style={{ left: `${w.left}%` }}>{w.label}</span>
            ))}
          </div>
        </div>
        {groups.map((g) => (
          <div key={g.key} style={{ display: "contents" }}>
            <div className={styles.tlGroup}>{g.label} <Subtle>· {g.items.length}</Subtle></div>
            {g.items.map((m) => (
              <div key={m.id} style={{ display: "contents" }}>
                <div className={styles.tlLabel}>
                  <span>{m.title}</span>
                  <span className={styles.tlSub}>{getMember(m.ownerId)?.name} · {fmtDate(m.due)}</span>
                </div>
                <div className={styles.tlTrack}>
                  {weeks.map((w) => <span key={w.label} className={styles.tlGrid} style={{ left: `${w.left}%` }} />)}
                  <span className={styles.tlToday} style={{ left: `${pct(TODAY)}%` }} />
                  <Link href={`/projects/${m.projectId}`} className={styles.tlMarker} style={{ left: `${pct(m.due)}%` }} title={`${m.title} · ${fmtDate(m.due)} · ${LABEL.milestoneState[m.state]}`}>
                    <span className={styles.tlDot} data-state={m.state} />
                    <span className={styles.tlTitle}>{LABEL.milestoneState[m.state]}{m.state !== "done" && ` · D${daysUntil(m.due) >= 0 ? "-" : "+"}${Math.abs(daysUntil(m.due))}`}</span>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ))}
        <div className={styles.tlLabel}><span className={styles.tlSub}>오늘 {fmtDate(TODAY)}</span></div>
        <div className={styles.tlTrack} style={{ minHeight: "var(--control-h-sm)" }}>
          <span className={styles.tlToday} style={{ left: `${pct(TODAY)}%` }} />
          <span className={styles.tlTodayLabel} style={{ left: `${pct(TODAY)}%` }}>오늘</span>
        </div>
      </div>
    </Panel>
  );
}

/* ── 캘린더 ──────────────────────────────────── */
function Calendar({ items }: { items: Milestone[] }) {
  const [ym, setYm] = useState({ y: 2026, m: 9 }); // 0-based: 10월
  const first = new Date(ym.y, ym.m, 1);
  const startDow = first.getDay();
  const daysInMonth = new Date(ym.y, ym.m + 1, 0).getDate();
  const cells: { date: Date; outside: boolean }[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(ym.y, ym.m, i - startDow + 1);
    cells.push({ date: d, outside: d.getMonth() !== ym.m });
    if (i >= 34 && d.getDate() === daysInMonth && d.getMonth() === ym.m && (i + 1) % 7 === 0) break;
  }
  const key = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const byDay = new Map<string, Milestone[]>();
  items.forEach((m) => byDay.set(m.due, [...(byDay.get(m.due) ?? []), m]));
  const shift = (d: number) => setYm(({ y, m }) => { const n = new Date(y, m + d, 1); return { y: n.getFullYear(), m: n.getMonth() }; });

  return (
    <Panel flush>
      <div className={styles.calHead}>
        <IconButton size="sm" variant="ghost" icon={<Icon name="caret-left" />} aria-label="이전 달" onClick={() => shift(-1)} />
        <span className={styles.calMonth}>{ym.y}년 {ym.m + 1}월</span>
        <IconButton size="sm" variant="ghost" icon={<Icon name="caret-right" />} aria-label="다음 달" onClick={() => shift(1)} />
      </div>
      <div className={styles.calGrid}>
        {["일", "월", "화", "수", "목", "금", "토"].map((d) => <div key={d} className={styles.calDow}>{d}</div>)}
        {cells.map(({ date, outside }) => {
          const k = key(date);
          const evs = byDay.get(k) ?? [];
          return (
            <div key={k} className={styles.calCell} data-outside={outside || undefined} data-today={k === TODAY || undefined}>
              <span className={styles.calDay}>{date.getDate()}</span>
              {evs.map((m) => (
                <Link key={m.id} href={`/projects/${m.projectId}`} className={styles.calEvent} title={`${m.title} · ${getProject(m.projectId)?.name}`}>
                  <EventChip title={m.title} tone={EVENT_TONE[m.state]} faded={outside} />
                </Link>
              ))}
            </div>
          );
        })}
      </div>
    </Panel>
  );
}

function cell(key: string, m: Milestone) {
  const d = daysUntil(m.due);
  switch (key) {
    case "title": return m.title;
    case "project": return <Subtle>{getProject(m.projectId)?.name}</Subtle>;
    case "owner": { const o = getMember(m.ownerId); return <Row tight><Avatar size="xs" name={o?.name} />{o?.name}</Row>; }
    case "due": return fmtDate(m.due);
    case "dday": return m.state === "done" ? <Subtle>—</Subtle> : d < 0 ? <Badge size="sm" variant="soft" status="destructive">+{-d}</Badge> : <span>D-{d}</span>;
    case "state": return <MilestoneBadge state={m.state} />;
    case "tasks": {
      const ts = m.taskIds.map(getTask).filter(Boolean);
      if (ts.length === 0) return <Subtle>—</Subtle>;
      return <Row tight>{ts.map((t) => <TaskStateBadge key={t!.id} state={t!.state} />)}</Row>;
    }
  }
}
