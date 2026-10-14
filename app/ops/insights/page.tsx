"use client";

/**
 * 인사이트 — Planning Intelligence. 과거 프로젝트 통계(목)로 WBS·일정 계획을 보정.
 * 차트는 CSS 바: 단일 hue(primary) 는 "실제/현재", 중립(border-strong) 은 "계획/기준".
 * 값·라벨은 텍스트 토큰, 시리즈 색은 마크에만.
 */

import { Badge, MetricCard } from "@/components/ctas/ctds";
import { Grid, Muted, Page, PageHeader, Panel, Row, Section, Stack, Strong, Subtle } from "@/components/ctas/ui";
import { insights } from "@/lib/mock";
import styles from "../../knowledge/knowledge.module.css";

const ANALYZED_PROJECTS = 14;

function pct(n: number) {
  return `${Math.round(n)}%`;
}

export default function InsightsPage() {
  const { stageDuration, delayCauses, estimateBias, similarProjects } = insights;

  const totalPlanned = stageDuration.reduce((a, s) => a + s.plannedDays, 0);
  const totalActual = stageDuration.reduce((a, s) => a + s.actualDays, 0);
  const avgDelay = ((totalActual - totalPlanned) / totalPlanned) * 100;
  const maxDays = Math.max(...stageDuration.map((s) => s.actualDays));
  const worstBias = [...estimateBias].sort((a, b) => b.bias - a.bias)[0];
  const maxBias = Math.max(...estimateBias.map((b) => b.bias), 1.5);
  const maxShare = Math.max(...delayCauses.map((d) => d.share));

  return (
    <Page wide>
      <PageHeader
        title="인사이트"
        lead="과거 프로젝트의 일정·업무·변경 데이터를 분석해 WBS 와 일정 계획을 보정하고 지연을 예측합니다. 패턴과 달리 수치 자산입니다."
      />

      <Grid cols={3}>
        <MetricCard label="평균 지연률" value={pct(avgDelay)} icon="clock" trend="up" deltaLabel="계획 대비" description={`계획 ${totalPlanned}일 → 실제 ${totalActual}일`} />
        <MetricCard label="최대 추정 편차" value={`×${worstBias.bias.toFixed(2)}`} icon="trend-up" description={worstBias.kind} />
        <MetricCard label="분석 프로젝트" value={ANALYZED_PROJECTS} icon="squares-four" description="2024 – 2026 · SI 9 · SM 5" />
      </Grid>

      <Grid cols={2}>
        <Section title="단계별 계획 vs 실제" icon="steps" hint="영업일">
          <Panel>
            <div className={styles.legend} role="list" aria-label="범례">
              <span className={styles.legendItem} role="listitem"><span className={`${styles.swatch} ${styles.swatchMuted}`} />계획</span>
              <span className={styles.legendItem} role="listitem"><span className={`${styles.swatch} ${styles.swatchPrimary}`} />실제</span>
            </div>
            <div className={styles.chart}>
              {stageDuration.map((s) => (
                <div key={s.stage} className={styles.barRow} title={`${s.stage}: 계획 ${s.plannedDays}일 · 실제 ${s.actualDays}일`}>
                  <span className={styles.barLabel}>{s.stage}</span>
                  <div className={styles.barTrack}>
                    <div className={`${styles.bar} ${styles.barMuted}`} style={{ width: `${(s.plannedDays / maxDays) * 100}%` }} />
                    <div className={`${styles.bar} ${styles.barPrimary}`} style={{ width: `${(s.actualDays / maxDays) * 100}%` }} />
                  </div>
                  <span className={styles.barValue}>
                    {s.plannedDays} → {s.actualDays}
                  </span>
                </div>
              ))}
            </div>
            <Subtle>검수 단계가 가장 크게 벌어집니다 (+{Math.round(((19 - 10) / 10) * 100)}%). 고객 산출물(기준서) 의존이 주원인.</Subtle>
          </Panel>
        </Section>

        <Section title="지연 원인" icon="warning-circle" hint="지연 건 기준 비중">
          <Panel>
            <div className={styles.chart}>
              {delayCauses.map((d) => (
                <div key={d.cause} className={styles.barRow} title={`${d.cause}: ${d.share}%`}>
                  <span className={styles.barLabel}>{d.cause}</span>
                  <div className={styles.barTrack}>
                    <div className={`${styles.bar} ${styles.barPrimary}`} style={{ width: `${(d.share / maxShare) * 100}%` }} />
                  </div>
                  <span className={styles.barValue}>{d.share}%</span>
                </div>
              ))}
            </div>
            <Subtle>고객 응답 지연이 1위 — 리스크 감지의 「미응답」 규칙과 질문 발송 시 1주 버퍼 선반영의 근거.</Subtle>
          </Panel>
        </Section>
      </Grid>

      <Grid cols={2}>
        <Section title="공수 추정 편차" icon="ruler" hint="실제 ÷ 추정 · 1.0 = 정확">
          <Panel>
            <div className={styles.chart}>
              {estimateBias.map((b) => {
                const over = b.bias > 1;
                return (
                  <div key={b.kind} className={styles.barRow} title={`${b.kind}: ×${b.bias.toFixed(2)}`}>
                    <span className={styles.barLabel}>{b.kind}</span>
                    <div className={styles.barTrack}>
                      <span className={styles.refLine} style={{ left: `${(1 / maxBias) * 100}%` }} aria-hidden />
                      <div className={`${styles.bar} ${over ? styles.barWarning : styles.barMuted}`} style={{ width: `${(b.bias / maxBias) * 100}%` }} />
                    </div>
                    <span className={styles.barValue}>×{b.bias.toFixed(2)}</span>
                  </div>
                );
              })}
              <div className={styles.refLabel}>세로선 = 1.0 (추정과 실제 일치) · 주황 = 과소 추정</div>
            </div>
            <Subtle>ERP 연동은 추정의 1.35배가 걸립니다. 새 WBS 에서 해당 항목에 자동으로 버퍼가 붙습니다.</Subtle>
          </Panel>
        </Section>

        <Section title="유사 프로젝트" icon="path" hint="현재 프로젝트: 한빛유통 재고관리 기준">
          <Stack>
            {similarProjects.map((s) => (
              <Panel key={s.name}>
                <div className={styles.similar}>
                  <span className={styles.similarity}>{Math.round(s.similarity * 100)}%</span>
                  <Stack tight>
                    <Strong>{s.name}</Strong>
                    <Row tight>
                      <Badge size="sm" variant="soft" status={s.outcome.includes("지연") || s.outcome.includes("CR") ? "warning" : "success"}>
                        {s.outcome}
                      </Badge>
                    </Row>
                    <Muted>교훈: {s.lesson}</Muted>
                  </Stack>
                </div>
              </Panel>
            ))}
          </Stack>
        </Section>
      </Grid>
    </Page>
  );
}
