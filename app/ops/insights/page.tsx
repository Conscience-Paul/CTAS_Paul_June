"use client";

/**
 * 인사이트 — "지난 프로젝트에서 배운 것을 지금 무엇에 반영하나"에만 답한다. 탭 없이 한 화면.
 *   1. 지금 프로젝트에 미칠 영향 — 진행 중인 프로젝트마다 주의할 단계 · 과거 평균 지연 · 참고(유사 프로젝트 교훈)
 *   2. 반복되는 패턴 — Nora 제안 목록 하나. 지금 제안과 지난 기록이 같은 목록, 상태 칩으로 거른다.
 *      상태는 셋 — 결정 대기 · 반영(+ 효과) · 반영 안 함(+ 사유, 30일 무결정도 여기).
 *      0건이어도 10건이어도 같은 모양. 줄을 누르면 서랍에서 막대 · 추이 · 근거(과거 프로젝트·대표 사례·계산 방법)
 *      · 반영하면 바뀌는 것 · 같은 패턴의 지난 제안을 본다. 반영하면 일정 변경은 승인 목록으로 올라간다.
 *   3. 근거 데이터 (접어 둠) — 단계별 계획 vs 실제 · 유사 프로젝트
 * 현재 운영 현황(진행률·부하·리스크·마일스톤)은 프로젝트·리소스·리스크·타임라인 화면에 있으므로 여기 두지 않는다.
 * 막대: 강조(실제·현재) = primary, 나머지(계획·기준) = 중립. 값·라벨은 텍스트 토큰.
 */

import Link from "next/link";
import { useState } from "react";
import { Badge, Button, Disclosure, Drawer, Icon, useToast } from "@/components/ctas/ctds";
import { Page, PageHeader, Panel, Subtle } from "@/components/ctas/ui";
import {
  STAGES,
  byProject,
  fmtDate,
  getMilestone,
  getProject,
  insights,
  patternEvidence,
  planningProposals,
  projects,
  type Approval,
  type PlanningPattern,
  type PlanningProposal,
  type ProposalStatus,
  type Stage,
} from "@/lib/mock";
import { usePreview } from "@/lib/preview-state";
import styles from "./insights.module.css";

const ANALYZED_PROJECTS = 14;

/** 프로젝트 단계 → 과거 통계의 단계 이름 */
const HISTORY_STAGE: Partial<Record<Stage, string>> = { requirements: "요구사항 정의", build: "개발", review: "검수", acceptance: "인수" };

const PATTERN_LABEL: Record<PlanningPattern, string> = { stage: "단계 지연", cause: "지연 원인", bias: "추정 편차" };
const STATUS: Record<ProposalStatus, { label: string; tone?: "success" | "warning" | "info" }> = {
  proposed: { label: "결정 대기", tone: "info" },
  applied: { label: "반영", tone: "success" },
  declined: { label: "반영 안 함" },
};
const STATUS_ORDER: ProposalStatus[] = ["proposed", "applied", "declined"];
/** 패턴별 추이 값 표기 */
const TREND_FMT: Record<PlanningPattern, (v: number) => string> = {
  stage: (v) => `+${v}%`,
  cause: (v) => `${v}%`,
  bias: (v) => `×${v.toFixed(2)}`,
};

const pct = (n: number) => `${n > 0 ? "+" : ""}${Math.round(n)}%`;

export default function InsightsPage() {
  const { toast } = useToast();
  const { riskStatus, addApprovals } = usePreview();
  const { stageDuration, similarProjects } = insights;
  const stat = (name: string) => stageDuration.find((s) => s.stage === name);
  const delayOf = (name: string) => { const s = stat(name); return s ? ((s.actualDays - s.plannedDays) / s.plannedDays) * 100 : 0; };

  // 이번 화면에서 내린 결정 — 프리뷰 로컬. 결정되면 상태가 바뀌어 기록으로 남는다
  const [decisions, setDecisions] = useState<Record<string, { status: ProposalStatus; at: string; reason?: string }>>({});
  const proposals = planningProposals.map((p) => {
    const d = decisions[p.id];
    return d ? { ...p, status: d.status, decidedAt: d.at, decidedBy: "김서연", reason: d.reason ?? p.reason } : p;
  });
  const [filter, setFilter] = useState<ProposalStatus | "all">("all");
  const [openId, setOpenId] = useState<string | null>(null);
  const opened = proposals.find((p) => p.id === openId);

  // 결정 대기 먼저, 그 안에서는 최신순
  const sorted = [...proposals].sort((a, b) =>
    (a.status === "proposed" ? 0 : 1) - (b.status === "proposed" ? 0 : 1) || (b.decidedAt ?? b.proposedAt).localeCompare(a.decidedAt ?? a.proposedAt),
  );
  const shown = sorted.filter((p) => filter === "all" || p.status === filter);
  const countOf = (s: ProposalStatus) => proposals.filter((p) => p.status === s).length;

  const decide = (p: PlanningProposal, status: "applied" | "declined", reason?: string) => {
    setDecisions((d) => ({ ...d, [p.id]: { status, at: new Date().toISOString().slice(0, 10), reason } }));
    if (status === "declined") {
      toast({ title: "반영 안 함", description: reason ? `사유: ${reason} — 기록에 남습니다.` : "기록에 남습니다.", tone: "neutral" });
      return;
    }
    // 반영 — 일정 변경은 바로 바꾸지 않고 승인 목록 "일정 변경"으로 올린다
    const schedules = patternEvidence[p.pattern].impacts.filter((i) => i.kind === "schedule");
    const items: Approval[] = schedules.map((i) => ({
      id: `pp:${p.id}:${i.milestoneId}`,
      projectId: i.projectId,
      kind: "schedule",
      state: "pending",
      title: `${getMilestone(i.milestoneId)?.title ?? i.milestoneId} ${fmtDate(i.from)} → ${fmtDate(i.to)} (Nora 제안 반영)`,
      requestedBy: "Nora · 인사이트 제안",
      requestedAt: new Date().toISOString(),
      ref: { type: "milestone", id: i.milestoneId },
      message: `인사이트 제안 「${p.proposal}」 을 반영하면서 올라온 일정 변경입니다. ${i.note}`,
      schedule: { from: i.from, to: i.to, impact: i.note },
    }));
    if (items.length) addApprovals(items);
    toast({
      title: "제안 반영",
      description: items.length ? `규칙은 바로 적용, 일정 변경 ${items.length}건은 승인 목록으로 올렸습니다.` : "규칙에 바로 적용됐습니다.",
      tone: "success",
    });
  };

  // 1. 진행 중인 프로젝트 — 지금 단계와 다음 단계 중 과거에 더 크게 밀린 단계를 "주의할 단계"로
  const rows = projects.map((p) => {
    const i = STAGES.findIndex((s) => s.id === p.stage);
    const candidates = [STAGES[i], STAGES[i + 1]].filter(Boolean).map((s) => ({ s, name: HISTORY_STAGE[s.id] })).filter((c) => c.name && stat(c.name));
    const watch = candidates.sort((a, b) => delayOf(b.name!) - delayOf(a.name!))[0];
    const openRisks = byProject.risks(p.id).filter((r) => (riskStatus[r.id] ?? r.status) === "open").length;
    const similar = p.kind === "SI" && p.stage === "build" ? similarProjects[0] : undefined;
    return { p, stageLabel: STAGES[i]?.label, watch, openRisks, similar };
  });

  return (
    <Page wide>
      <PageHeader
        title="인사이트"
        lead={`지난 ${ANALYZED_PROJECTS}개 프로젝트(2024–2026 · SI 9 · SM 5)에서 배운 것을 지금 프로젝트와 다음 계획에 반영합니다.`}
      />

      {/* 1. 지금 프로젝트에 미칠 영향 — 열 머리를 둔 표 */}
      <section className={styles.section}>
        <h2 className={styles.h2}>지금 프로젝트에 미칠 영향</h2>
        <Panel flush>
          <div className={styles.impact}>
            <div className={styles.impactHead}>
              <span>프로젝트</span>
              <span>주의할 단계</span>
              <span className={styles.num}>과거 평균</span>
              <span>참고</span>
            </div>
            {rows.map(({ p, stageLabel, watch, openRisks, similar }) => {
              const d = watch ? delayOf(watch.name!) : 0;
              const s = watch ? stat(watch.name!) : undefined;
              const note = similar ? `유사 ${similar.name} (${Math.round(similar.similarity * 100)}%) — ${similar.lesson}` : `열린 리스크 ${openRisks}건`;
              return (
                <div key={p.id} className={styles.impactRow}>
                  <Link href={`/projects/${p.id}`} className={styles.projectName}>
                    <span className={styles.kind}>{p.kind}</span>
                    <span className={styles.ellipsis}>{p.name}</span>
                    <span className={styles.stageNow}>{stageLabel}</span>
                  </Link>
                  {watch && s ? (
                    <span className={styles.cellStack}>
                      <strong>{watch.s.label}</strong>
                      <span className={styles.cellSub}>계획 {s.plannedDays}일 → 실제 {s.actualDays}일</span>
                    </span>
                  ) : (
                    <span className={styles.cellStack}>
                      <strong>유지보수</strong>
                      <span className={styles.cellSub}>단계 지연 대신 SLA 기준</span>
                    </span>
                  )}
                  <span className={styles.num}>
                    {watch ? <span className={styles.delay} data-high={d >= 50 || undefined}>{pct(d)}</span> : <span className={styles.cellSub}>—</span>}
                  </span>
                  <span className={styles.note} title={note}>
                    {similar && <Icon name="path" size={12} />}
                    <span className={styles.ellipsis}>{note}</span>
                  </span>
                </div>
              );
            })}
          </div>
        </Panel>
      </section>

      {/* 2. 반복되는 패턴 — Nora 제안 목록 하나 (지금 제안 + 지난 기록) */}
      <section className={styles.section}>
        <div className={styles.listHead}>
          <h2 className={styles.h2}>
            반복되는 패턴 <span className={styles.h2Sub}>Nora 가 패턴을 근거로 계획 변경을 제안합니다</span>
          </h2>
          <div className={styles.chips} role="group" aria-label="상태 필터">
            <button type="button" className={styles.chip} data-active={filter === "all" || undefined} onClick={() => setFilter("all")}>
              전체 <span className={styles.count}>{proposals.length}</span>
            </button>
            {STATUS_ORDER.map((s) => (
              <button key={s} type="button" className={styles.chip} data-active={filter === s || undefined} onClick={() => setFilter(s)}>
                {STATUS[s].label} <span className={styles.count}>{countOf(s)}</span>
              </button>
            ))}
          </div>
        </div>
        <Panel flush>
          {shown.length === 0 ? (
            <div className={styles.empty}>{filter === "proposed" ? "지금 결정할 제안이 없습니다. 새 패턴이 보이면 Nora 가 여기에 올립니다." : "해당하는 제안이 없습니다."}</div>
          ) : (
            <ul className={styles.plist}>
              {shown.map((p) => {
                const ev = patternEvidence[p.pattern];
                return (
                  <li key={p.id} className={styles.prow} data-pending={p.status === "proposed" || undefined}>
                    <button type="button" className={styles.prowMain} onClick={() => setOpenId(p.id)} title="근거 자세히 보기">
                      <span className={styles.prowDate}>
                        {fmtDate(p.decidedAt ?? p.proposedAt)}
                        <span className={styles.year}>{(p.decidedAt ?? p.proposedAt).slice(0, 4)}</span>
                      </span>
                      <span className={styles.prowMetric}>{p.metric}</span>
                      <span className={styles.prowBody}>
                        <span className={styles.prowTop}>
                          <Badge size="sm" variant="soft" status={STATUS[p.status].tone}>{STATUS[p.status].label}</Badge>
                          <span className={styles.patternTag}>{PATTERN_LABEL[p.pattern]}</span>
                          <span className={styles.prowFinding}>{p.finding}</span>
                        </span>
                        <span className={styles.prowProposal}><span className={styles.proposalLabel}>제안</span>{p.proposal}</span>
                        <span className={styles.prowFoot}>
                          {p.effect && <span className={styles.effect}><Icon name="trend-down" size={12} />{p.effect}</span>}
                          {p.reason && <span>{p.reason}</span>}
                          {p.status === "proposed" && <span><Icon name="article" size={12} /> 근거 — {ev.summary}</span>}
                          {p.decidedBy && <span>{p.decidedBy}</span>}
                        </span>
                      </span>
                      <Icon name="caret-right" size={14} />
                    </button>
                    {p.status === "proposed" && (
                      <span className={styles.prowActions}>
                        <DecideActions p={p} onDecide={decide} />
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>
      </section>

      {/* 3. 근거 데이터 — 접어 둠 */}
      <Disclosure>
        <Disclosure.Trigger>근거 데이터 — 단계별 계획 vs 실제 · 유사 프로젝트 {similarProjects.length}건</Disclosure.Trigger>
        <Disclosure.Body>
          <div className={styles.evidence}>
            <Panel>
              <div className={styles.legend} role="list" aria-label="범례">
                <span role="listitem"><span className={styles.swatch} data-tone="plan" />계획</span>
                <span role="listitem"><span className={styles.swatch} data-tone="actual" />실제</span>
                <Subtle>영업일</Subtle>
              </div>
              <div className={styles.bars}>
                {stageDuration.map((s) => {
                  const max = Math.max(...stageDuration.map((x) => x.actualDays));
                  return (
                    <div key={s.stage} className={styles.barRow} title={`${s.stage}: 계획 ${s.plannedDays}일 · 실제 ${s.actualDays}일`}>
                      <span className={styles.barLabel}>{s.stage}</span>
                      <span className={styles.pairBars}>
                        <span className={styles.bar} data-tone="plan" style={{ width: `${(s.plannedDays / max) * 100}%` }} />
                        <span className={styles.bar} data-tone="actual" style={{ width: `${(s.actualDays / max) * 100}%` }} />
                      </span>
                      <span className={styles.barValue}>{s.plannedDays} → {s.actualDays}</span>
                    </div>
                  );
                })}
              </div>
            </Panel>
            <Panel flush>
              <ul className={styles.similar}>
                {similarProjects.map((s) => (
                  <li key={s.name}>
                    <span className={styles.similarity}>{Math.round(s.similarity * 100)}%</span>
                    <span className={styles.similarText}>
                      <strong>{s.name}</strong>
                      <Badge size="sm" variant="soft" status={s.outcome.includes("지연") || s.outcome.includes("CR") ? "warning" : "success"}>{s.outcome}</Badge>
                      <Subtle>교훈: {s.lesson}</Subtle>
                    </span>
                  </li>
                ))}
              </ul>
            </Panel>
          </div>
        </Disclosure.Body>
      </Disclosure>

      <p className={styles.footnote}>
        지금의 운영 현황은 각 화면에서 —{" "}
        <Link href="/projects">프로젝트 진행률</Link> · <Link href="/ops/resources">담당자 부하</Link> · <Link href="/ops/milestones">타임라인</Link>
      </p>

      {opened && (
        <ProposalDrawer
          p={opened}
          others={proposals.filter((x) => x.pattern === opened.pattern && x.id !== opened.id)}
          onOpen={setOpenId}
          onDecide={decide}
          onClose={() => setOpenId(null)}
        />
      )}
    </Page>
  );
}

/* ── 서랍: 제안 하나의 근거를 자세히 ───────────────── */
function ProposalDrawer({
  p,
  others,
  onOpen,
  onDecide,
  onClose,
}: {
  p: PlanningProposal;
  others: PlanningProposal[];
  onOpen: (id: string) => void;
  onDecide: (p: PlanningProposal, s: "applied" | "declined", reason?: string) => void;
  onClose: () => void;
}) {
  const { stageDuration, delayCauses, estimateBias, trends } = insights;
  const ev = patternEvidence[p.pattern];

  const bars =
    p.pattern === "stage" ? (
      <Bars items={stageDuration.map((s) => ({ label: s.stage, value: s.actualDays / s.plannedDays, text: pct(((s.actualDays - s.plannedDays) / s.plannedDays) * 100), highlight: s.stage === "검수" }))} refValue={1} refLabel="계획" />
    ) : p.pattern === "cause" ? (
      <Bars items={delayCauses.map((c, i) => ({ label: c.cause, value: c.share, text: `${c.share}%`, highlight: i === 0 }))} />
    ) : (
      <Bars items={estimateBias.map((b) => ({ label: b.kind, value: b.bias, text: `×${b.bias.toFixed(2)}`, highlight: b.bias > 1.15 }))} refValue={1} refLabel="추정" />
    );

  return (
    <Drawer
      open
      onOpenChange={(o) => !o && onClose()}
      size="lg"
      title={p.proposal}
      description={
        <span className={styles.drawerMeta}>
          <Badge size="sm" variant="soft" status={STATUS[p.status].tone}>{STATUS[p.status].label}</Badge>
          <span className={styles.patternTag}>{PATTERN_LABEL[p.pattern]}</span>
          <Subtle>Nora 제안 · {p.proposedAt}{p.decidedAt ? ` · 결정 ${p.decidedAt}${p.decidedBy ? ` ${p.decidedBy}` : ""}` : ""}</Subtle>
        </span>
      }
      footer={
        p.status === "proposed" ? <DecideActions p={p} onDecide={onDecide} size="md" /> : undefined
      }
    >
      <div className={styles.drawerBody}>
        {/* 무엇을 봤나 */}
        <div className={styles.dHero}>
          <span className={styles.hero}>{p.metric}</span>
          <span className={styles.finding}>{p.finding}</span>
        </div>
        {(p.effect || p.reason) && (
          <div className={styles.dResult} data-tone={p.effect ? "good" : undefined}>
            {p.effect ? <><Icon name="trend-down" size={14} />반영 후 효과 — {p.effect}</> : <>사유 — {p.reason}</>}
          </div>
        )}

        <DSection title="지금 분포">{bars}</DSection>
        <DSection title="반기별 추이"><Trend values={trends[p.pattern]} fmt={TREND_FMT[p.pattern]} /></DSection>

        {/* 근거 */}
        <DSection title={`근거 프로젝트 ${ev.projects.length}건`} hint={`신뢰도 ${ev.confidence}`}>
          <div className={styles.evTable}>
            {ev.projects.map((x) => (
              <div key={x.name} className={styles.evRow}>
                <span className={styles.cellStack}>
                  <strong>{x.name}</strong>
                  <span className={styles.cellSub}>{x.period}</span>
                </span>
                <span className={styles.evValue}>{x.value}</span>
                <span className={styles.cellSub}>{x.reason}</span>
              </div>
            ))}
          </div>
        </DSection>

        <DSection title="대표 사례" hint="원문">
          <div className={styles.cases}>
            {ev.cases.map((c) => (
              <figure key={c.date + c.project} className={styles.case}>
                <blockquote>{c.quote}</blockquote>
                <figcaption>{c.project} · {c.source} · {c.date}</figcaption>
              </figure>
            ))}
          </div>
        </DSection>

        <DSection title="어떻게 계산했나">
          <ul className={styles.method}>
            {ev.method.map((m) => <li key={m}>{m}</li>)}
          </ul>
        </DSection>

        <DSection title="반영하면 바뀌는 것">
          <ul className={styles.impacts}>
            {ev.impacts.map((i, k) =>
              i.kind === "schedule" ? (
                <li key={k}>
                  <Icon name="calendar-dots" size={14} />
                  <span className={styles.cellStack}>
                    <span>{getProject(i.projectId)?.name} · {getMilestone(i.milestoneId)?.title} <strong>{fmtDate(i.from)} → {fmtDate(i.to)}</strong></span>
                    <span className={styles.cellSub}>바로 바꾸지 않고 승인 목록 「일정 변경」으로 올라갑니다 · {i.note}</span>
                  </span>
                </li>
              ) : (
                <li key={k}><Icon name="check-circle" size={14} /><span>{i.label}</span></li>
              ),
            )}
          </ul>
        </DSection>

        {others.length > 0 && (
          <DSection title="같은 패턴의 다른 제안">
            <ul className={styles.others}>
              {others.map((o) => (
                <li key={o.id}>
                  <button type="button" onClick={() => onOpen(o.id)}>
                    <span className={styles.prowDate}>{(o.decidedAt ?? o.proposedAt).slice(0, 7)}</span>
                    <Badge size="sm" variant="soft" status={STATUS[o.status].tone}>{STATUS[o.status].label}</Badge>
                    <span className={styles.ellipsis}>{o.proposal}</span>
                    <span className={styles.prowMetricSm}>{o.metric}</span>
                  </button>
                </li>
              ))}
            </ul>
          </DSection>
        )}
      </div>
    </Drawer>
  );
}

/** 반영 / 반영 안 함 — "반영 안 함"은 사유를 짧게 받고 확정 (빈 사유도 허용) */
function DecideActions({ p, onDecide, size = "sm" }: { p: PlanningProposal; onDecide: (p: PlanningProposal, s: "applied" | "declined", reason?: string) => void; size?: "sm" | "md" }) {
  const [declining, setDeclining] = useState(false);
  const [reason, setReason] = useState("");
  if (declining) {
    return (
      <span className={styles.declineBox}>
        <input
          autoFocus
          className={styles.reasonInput}
          placeholder="반영하지 않는 이유 (선택)"
          aria-label="반영 안 함 사유"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") onDecide(p, "declined", reason.trim() || undefined);
            if (e.key === "Escape") setDeclining(false);
          }}
        />
        <Button size={size} variant="ghost" onClick={() => setDeclining(false)}>취소</Button>
        <Button size={size} variant="outline" onClick={() => onDecide(p, "declined", reason.trim() || undefined)}>확정</Button>
      </span>
    );
  }
  return (
    <>
      <Button size={size} variant="ghost" onClick={() => setDeclining(true)}>반영 안 함</Button>
      <Button size={size} variant="primary" leftIcon={<Icon name="check" />} onClick={() => onDecide(p, "applied")}>반영</Button>
    </>
  );
}

function DSection({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className={styles.dSection}>
      <h3 className={styles.dTitle}>{title}{hint && <span className={styles.h2Sub}>{hint}</span>}</h3>
      {children}
    </section>
  );
}

/** 단일 계열 막대 — 강조 항목만 primary, 나머지 중립. refValue 가 있으면 기준선 */
function Bars({ items, refValue, refLabel }: { items: { label: string; value: number; text: string; highlight?: boolean }[]; refValue?: number; refLabel?: string }) {
  const max = Math.max(...items.map((i) => i.value), refValue ?? 0) * 1.05;
  return (
    <div className={styles.bars}>
      {items.map((i) => (
        <div key={i.label} className={styles.barRow} title={`${i.label}: ${i.text}`}>
          <span className={styles.barLabel}>{i.label}</span>
          <span className={styles.barTrack}>
            {refValue !== undefined && <span className={styles.refLine} style={{ left: `${(refValue / max) * 100}%` }} aria-hidden />}
            <span className={styles.bar} data-tone={i.highlight ? "actual" : "plan"} style={{ width: `${(i.value / max) * 100}%` }} />
          </span>
          <span className={styles.barValue}>{i.text}</span>
        </div>
      ))}
      {refValue !== undefined && <span className={styles.refNote}>세로선 = {refLabel} (1.0)</span>}
    </div>
  );
}

/** 반기별 추이 — 작은 세로 막대. 최신만 강조 */
function Trend({ values, fmt }: { values: { period: string; value: number }[]; fmt: (v: number) => string }) {
  const max = Math.max(...values.map((v) => v.value));
  return (
    <div className={styles.trend} aria-label={`추이 ${values.map((v) => `${v.period} ${fmt(v.value)}`).join(", ")}`}>
      {values.map((v, i) => (
        <span key={v.period} className={styles.trendCol} title={`${v.period}: ${fmt(v.value)}`}>
          <span className={styles.trendValue}>{fmt(v.value)}</span>
          <span className={styles.trendTrack}>
            <span className={styles.trendBar} data-last={i === values.length - 1 || undefined} style={{ height: `${(v.value / max) * 100}%` }} />
          </span>
          <span className={styles.trendPeriod}>{v.period}</span>
        </span>
      ))}
    </div>
  );
}
