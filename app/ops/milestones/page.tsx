"use client";

/**
 * 운영 › 타임라인 — 날짜를 행으로, 같은 행에 [마일스톤 | 타임라인].
 * 페이지 설정(기간 · 목록/트랙 · 프로젝트 필터)은 하나 — 마일스톤과 타임라인에 함께 적용.
 * 담당·상태 필터는 마일스톤에만, 레인 칩은 타임라인에만.
 */

import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { DatePicker, Icon, Select, Tabs, type RangePreset } from "@/components/ctas/ctds";
import { Page, PageHeader } from "@/components/ctas/ui";
import { TimelineBoard, parseLocal, type BoardView } from "@/components/ctas/TraceTimeline";
import { LABEL, TODAY, members, milestones, projects, type Milestone, type MilestoneState } from "@/lib/mock";
import styles from "./milestones.module.css";

const STATES: MilestoneState[] = ["planned", "at_risk", "missed", "done"];

/* 기간 프리셋 — 목업 기준일(TODAY) 기준 */
const shift = (n: number) => { const d = parseLocal(TODAY); d.setDate(d.getDate() + n); return d; };
const RANGE_PRESETS: RangePreset[] = [
  { label: "어제·오늘", getValue: () => ({ from: shift(-1), to: shift(0) }) },
  { label: "최근 7일", getValue: () => ({ from: shift(-6), to: shift(0) }) },
  { label: "최근 30일", getValue: () => ({ from: shift(-29), to: shift(0) }) },
  { label: "앞뒤 2주", getValue: () => ({ from: shift(-14), to: shift(14) }) },
  { label: "앞으로 30일", getValue: () => ({ from: shift(0), to: shift(30) }) },
  { label: "이번 분기", getValue: () => ({ from: new Date(2026, 9, 1), to: new Date(2026, 11, 31) }) },
  { label: "올해 전체", getValue: () => ({ from: new Date(2026, 0, 1), to: new Date(2026, 11, 31) }) },
];

// 홈 타임라인 띠의 → 는 ?range=recent 로 들어온다(어제·오늘만). 주소를 읽으므로 Suspense 로 감싼다
export default function MilestonesPage() {
  return (
    <Suspense>
      <MilestonesView />
    </Suspense>
  );
}

function MilestonesView() {
  const params = useSearchParams();
  // 기본 기간: 최근 30일 ~ 오늘 (최신이 맨 위). ?range=recent 면 어제·오늘
  const [range, setRange] = useState<{ from: Date; to: Date }>(() =>
    params.get("range") === "recent" ? { from: shift(-1), to: shift(0) } : { from: shift(-30), to: shift(0) },
  );
  const [draft, setDraft] = useState<{ from: Date | null; to: Date | null }>(range);
  const [view, setView] = useState<BoardView>("list");
  const [projectFilter, setProjectFilter] = useState<string | null>(null);
  const [ownerFilter, setOwnerFilter] = useState<string | null>(null);
  const [stateFilter, setStateFilter] = useState<MilestoneState | null>(null);

  const inRange = (m: Milestone) => { const t = parseLocal(m.due).getTime(); return t >= range.from.getTime() && t <= range.to.getTime(); };
  const list = milestones
    .filter((m) => inRange(m) && (!projectFilter || m.projectId === projectFilter) && (!ownerFilter || m.ownerId === ownerFilter) && (!stateFilter || m.state === stateFilter))
    .sort((a, b) => a.due.localeCompare(b.due));

  const owners = members.filter((m) => milestones.some((x) => x.ownerId === m.id));

  // 기간 끝 다음의 첫 마일스톤 — "더 보기"로 거기까지 기간을 넓힌다 (프로젝트·담당·상태 필터는 그대로)
  const nextMilestone = milestones
    .filter((m) => parseLocal(m.due).getTime() > range.to.getTime() && (!projectFilter || m.projectId === projectFilter) && (!ownerFilter || m.ownerId === ownerFilter) && (!stateFilter || m.state === stateFilter))
    .sort((a, b) => a.due.localeCompare(b.due))[0];
  const projectIds = projectFilter ? [projectFilter] : projects.map((p) => p.id);

  return (
    <Page wide>
      <PageHeader
        title="타임라인"
        actions={
          <div className={styles.pageTools}>
            <div className={styles.viewToggle}>
              <Tabs value={view} onValueChange={(v) => setView(v as BoardView)} variant="segmented" size="sm">
                <Tabs.List aria-label="보기 — 마일스톤과 타임라인에 함께 적용">
                  <Tabs.Trigger value="list" leadingIcon={<Icon name="list" />}>목록</Tabs.Trigger>
                  <Tabs.Trigger value="track" leadingIcon={<Icon name="line-segments" />}>트랙</Tabs.Trigger>
                </Tabs.List>
              </Tabs>
            </div>
            <div className={styles.rangePicker}>
              <DatePicker
                mode="range"
                months={2}
                size="sm"
                withPresets
                presets={RANGE_PRESETS}
                rangeValue={draft}
                onRangeChange={(v) => {
                  setDraft(v);
                  if (v.from && v.to) setRange({ from: v.from, to: v.to });
                }}
                aria-label="기간 — 마일스톤과 타임라인에 함께 적용"
              />
            </div>
          </div>
        }
      />

      <div className={styles.filters}>
        <FilterSelect
          label="프로젝트"
          width={240}
          value={projectFilter}
          onChange={setProjectFilter}
          options={projects.map((p) => ({ value: p.id, label: `${p.kind} · ${p.name.replace(/^한빛유통 |^세종캐피탈 /, "")}` }))}
        />
        <FilterSelect label="담당" width={140} value={ownerFilter} onChange={setOwnerFilter} options={owners.map((o) => ({ value: o.id, label: o.name }))} />
        <FilterSelect
          label="상태"
          width={120}
          value={stateFilter}
          onChange={(v) => setStateFilter(v as MilestoneState | null)}
          options={STATES.map((s) => ({ value: s, label: LABEL.milestoneState[s] }))}
        />
      </div>

      <TimelineBoard
        view={view}
        projectIds={projectIds}
        from={range.from}
        to={range.to}
        milestones={list}
        nextMilestone={nextMilestone}
        onShowMore={(m) => {
          const next = { from: range.from, to: parseLocal(m.due) };
          setRange(next);
          setDraft(next);
        }}
        onRevealDate={(d) => {
          // 연결을 따라 기간 밖으로 가면 그 날짜까지 기간을 넓힌다
          const next = { from: d < range.from ? d : range.from, to: d > range.to ? d : range.to };
          setRange(next);
          setDraft(next);
        }}
      />
    </Page>
  );
}

/** 라벨 + 드롭다운. null = 전체 */
const ALL = "__all";
function FilterSelect({
  label,
  width,
  value,
  onChange,
  options,
}: {
  label: string;
  width: number;
  value: string | null;
  onChange: (v: string | null) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className={styles.filterField}>
      <span className={styles.filterLabel}>{label}</span>
      <Select size="sm" width={width} value={value ?? ALL} onValueChange={(v) => onChange(v === ALL ? null : v)}>
        <Select.Trigger aria-label={label} />
        <Select.Content>
          <Select.Item value={ALL}>전체</Select.Item>
          {options.map((o) => (
            <Select.Item key={o.value} value={o.value}>{o.label}</Select.Item>
          ))}
        </Select.Content>
      </Select>
    </label>
  );
}
