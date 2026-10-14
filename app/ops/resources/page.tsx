"use client";

/**
 * 운영 › 리소스 — 팀원 × 프로젝트 투입률, 열린 업무·차단·마일스톤 부하. 매니저용.
 */

import Link from "next/link";
import { Avatar, Badge, Callout, Chip, MetricCard } from "@/components/ctas/ctds";
import { Grid, Page, PageHeader, Panel, Row, Section, Stack, Strong, Subtle } from "@/components/ctas/ui";
import { LABEL, allocations, daysUntil, members, milestones, projects, tasks } from "@/lib/mock";
import styles from "./resources.module.css";

const OPEN = (s: string) => !["done", "verified", "wont_do"].includes(s);

export default function ResourcesPage() {
  const people = members.filter((m) => m.role !== "viewer");
  const rows = people.map((m) => {
    const alloc = allocations.filter((a) => a.memberId === m.id);
    const total = alloc.reduce((s, a) => s + a.percent, 0);
    const open = tasks.filter((t) => t.ownerId === m.id && OPEN(t.state));
    const blocked = open.filter((t) => t.state === "blocked").length;
    const ms = milestones.filter((x) => x.ownerId === m.id && x.state !== "done" && daysUntil(x.due) <= 14).length;
    return { m, alloc, total, open: open.length, blocked, ms };
  });
  const over = rows.filter((r) => r.total > 100);
  const avg = Math.round(rows.reduce((s, r) => s + r.total, 0) / rows.length);

  return (
    <Page wide>
      <PageHeader title="리소스" lead="누가 어디에 얼마나 들어가 있는지. 투입률 합이 100% 를 넘으면 과투입으로 표시됩니다." />

      <Grid cols={4}>
        <MetricCard label="평균 투입률" value={`${avg}%`} icon="speedometer" />
        <MetricCard label="과투입" value={over.length} icon="warning" description={over.map((r) => r.m.name).join(", ") || "없음"} />
        <MetricCard label="열린 업무" value={tasks.filter((t) => OPEN(t.state)).length} icon="list" description={`차단 ${tasks.filter((t) => t.state === "blocked").length}`} />
        <MetricCard label="진행 프로젝트" value={projects.length} icon="squares-four" />
      </Grid>

      {over.length > 0 && (
        <Callout tone="warning" variant="outline" icon="warning-circle" title={`${over.map((r) => r.m.name).join(", ")} 과투입`}>
          세종캐피탈 장애 대응(SLA 48h)이 겹치면서 이준호 투입률이 120% 입니다. 한빛 재고 이동 승인 API 는 결과 승인 대기 중이니, 승인 후 모바일 앱 설계 착수를 1주 미루는 안을 검토하세요.
        </Callout>
      )}

      <Section title="투입률" icon="user-circle" hint="프로젝트별 누적, 100% 기준선">
        <Panel>
          <div className={styles.chart}>
            {rows.map(({ m, alloc, total }) => (
              <div key={m.id} className={styles.row}>
                <div className={styles.who}>
                  <Avatar size="sm" name={m.name} />
                  <Stack tight>
                    <Strong>{m.name}</Strong>
                    <Subtle>{m.title}</Subtle>
                  </Stack>
                </div>
                <div className={styles.track} role="img" aria-label={`${m.name} 투입률 ${total}%`}>
                  {alloc.map((a, i) => (
                    <span
                      key={a.projectId}
                      className={styles.seg}
                      data-over={total > 100 && i === alloc.length - 1 ? true : undefined}
                      style={{ width: `${(a.percent / 140) * 100}%`, "--seg-opacity": 1 - i * 0.25 } as React.CSSProperties}
                      title={`${projects.find((p) => p.id === a.projectId)?.name} ${a.percent}%`}
                    />
                  ))}
                  <span className={styles.cap} style={{ left: `${(100 / 140) * 100}%` }} />
                </div>
                <span className={styles.value} data-over={total > 100 || undefined}>{total}%</span>
                <div className={styles.breakdown}>
                  {alloc.map((a) => (
                    <Link key={a.projectId} href={`/projects/${a.projectId}`} style={{ textDecoration: "none" }}>
                      <Chip size="sm" variant="outline">{projects.find((p) => p.id === a.projectId)?.name.replace(/^한빛유통 |^세종캐피탈 /, "")} {a.percent}%</Chip>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </Section>

      <Section title="부하" icon="list" hint="열린 업무 · 차단 · 14일 내 마일스톤">
        <Panel flush>
          <table className={styles.matrix}>
            <thead>
              <tr>
                <th>팀원</th>
                <th>역할</th>
                {projects.map((p) => <th key={p.id}>{p.name.replace(/^한빛유통 |^세종캐피탈 /, "")}</th>)}
                <th style={{ textAlign: "right" }}>열린 업무</th>
                <th style={{ textAlign: "right" }}>차단</th>
                <th style={{ textAlign: "right" }}>마일스톤</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ m, open, blocked, ms }) => (
                <tr key={m.id}>
                  <td><Row tight><Avatar size="xs" name={m.name} />{m.name}</Row></td>
                  <td><Subtle>{LABEL.role[m.role]}</Subtle></td>
                  {projects.map((p) => {
                    const n = tasks.filter((t) => t.ownerId === m.id && t.projectId === p.id && OPEN(t.state)).length;
                    const a = allocations.find((x) => x.memberId === m.id && x.projectId === p.id);
                    return <td key={p.id}>{a ? <Row tight><span>{a.percent}%</span>{n > 0 && <Subtle>· 업무 {n}</Subtle>}</Row> : <Subtle>—</Subtle>}</td>;
                  })}
                  <td className={styles.num}>{open}</td>
                  <td className={styles.num}>{blocked > 0 ? <Badge size="sm" variant="soft" status="destructive">{blocked}</Badge> : "0"}</td>
                  <td className={styles.num}>{ms}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      </Section>
    </Page>
  );
}
