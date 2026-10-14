"use client";

/**
 * 개발 — orbit 의 Operate 화면을 본뜬 허브. 전 프로젝트 업무를 한 표에서 보고,
 * 탭으로 유지보수 · 에이전트 · 배포 · 종결 · 리포트를 오간다.
 */

import Link from "next/link";
import { useState } from "react";
import { Avatar, Badge, Button, Callout, FilterButton, Icon, Input, MetricCard, TableHeader, TableRow, Tabs } from "@/components/ctas/ctds";
import { Grid, List, Page, PageHeader, Row, SeverityBadge, Stack, Strong, Subtle, TaskStateBadge, TableBox } from "@/components/ctas/ui";
import { Prose } from "@/components/ctas/ui";
import { ListItem } from "@/components/ctas/ctds";
import {
  LABEL,
  TONE,
  agentRuns,
  approvals,
  contextItems,
  daysUntil,
  deliverables,
  fmtDate,
  fmtDateTime,
  getMember,
  getProject,
  getTask,
  projects,
  requests,
  tasks,
  type Task,
} from "@/lib/mock";
import { usePreview } from "@/lib/preview-state";
import styles from "./dev.module.css";

const OPEN = (t: Task) => !["done", "verified", "wont_do"].includes(t.state);

const columns = [
  { key: "num", label: "#", width: 56 },
  { key: "state", label: "상태", width: 100 },
  { key: "kind", label: "종류", width: 96 },
  { key: "title", label: "제목", flex: true, minWidth: 320 },
  { key: "project", label: "프로젝트", width: 200 },
  { key: "owner", label: "담당", width: 110 },
  { key: "severity", label: "심각도", width: 90 },
  { key: "due", label: "기한", width: 90, align: "end" as const },
];

export default function DevPage() {
  const { approvalDecisions } = usePreview();
  const [projectFilter, setProjectFilter] = useState<string | null>(null);
  const [who, setWho] = useState<"all" | "mine">("all");
  const [scope, setScope] = useState<"open" | "review" | "done" | "all">("open");

  const inProject = (pid: string) => !projectFilter || pid === projectFilter;
  const base = tasks.filter((t) => inProject(t.projectId) && (who === "all" || t.ownerId === "m-seoyeon"));
  const open = base.filter(OPEN);
  const critical = base.filter((t) => t.severity === "critical" || t.state === "blocked").filter(OPEN);
  const review = base.filter((t) => t.state === "pending_review");
  const inbox = requests.filter((r) => inProject(r.projectId) && r.triage === "pending");
  const myPending = approvals.filter((a) => inProject(a.projectId) && a.kind === "result" && (approvalDecisions[a.id] ?? a.state) === "pending");

  const listed = base.filter((t) =>
    scope === "all" ? true : scope === "open" ? OPEN(t) : scope === "review" ? t.state === "pending_review" : !OPEN(t),
  );
  const num = (t: Task) => tasks.indexOf(t) + 101;

  return (
    <Page wide>
      <PageHeader
        eyebrow="orbit Operate 흐름 — 접수 → 분류 → 실행 → 검증 → 종결"
        title="유지보수·개발"
        lead="전 프로젝트의 업무를 한 곳에서. 에이전트가 고치고, 승인은 사람이, 상태 전이는 러너가."
        actions={<Button size="sm" variant="primary" leftIcon={<Icon name="plus" />}>장애 기록</Button>}
      />

      <Row>
        <FilterButton size="sm" selected={projectFilter === null} onClick={() => setProjectFilter(null)}>전체</FilterButton>
        {projects.map((p) => (
          <FilterButton key={p.id} size="sm" selected={projectFilter === p.id} onClick={() => setProjectFilter(p.id)}>{p.name}</FilterButton>
        ))}
      </Row>

      <Tabs defaultValue="maint" variant="underline" size="md">
        <Tabs.List aria-label="개발 영역">
          <Tabs.Trigger value="maint">유지보수</Tabs.Trigger>
          <Tabs.Trigger value="agents">에이전트</Tabs.Trigger>
          <Tabs.Trigger value="deploy">배포</Tabs.Trigger>
          <Tabs.Trigger value="closed">종결</Tabs.Trigger>
          <Tabs.Trigger value="reports">리포트</Tabs.Trigger>
        </Tabs.List>

        <Tabs.Panel value="maint">
          <Stack className={styles.tab}>
            <Grid cols={4}>
              <MetricCard label="미해결" value={open.length} icon="list" />
              <MetricCard label="치명·차단" value={critical.length} icon="warning" description={critical.length > 0 ? "즉시 확인" : undefined} />
              <MetricCard label="검토 대기" value={review.length} icon="seal-check" />
              <MetricCard label="고객 접수 (분류 전)" value={inbox.length} icon="envelope" />
            </Grid>

            <Row style={{ justifyContent: "space-between" }}>
              <Row tight>
                <Subtle>누구의</Subtle>
                <FilterButton size="sm" selected={who === "all"} onClick={() => setWho("all")}>전체</FilterButton>
                <FilterButton size="sm" selected={who === "mine"} onClick={() => setWho("mine")}>내 담당</FilterButton>
                <span className={styles.vsep} />
                <FilterButton size="sm" selected={scope === "all"} onClick={() => setScope("all")}>전체</FilterButton>
                <FilterButton size="sm" selected={scope === "open"} onClick={() => setScope("open")}>미해결</FilterButton>
                <FilterButton size="sm" selected={scope === "review"} onClick={() => setScope("review")}>리뷰</FilterButton>
                <FilterButton size="sm" selected={scope === "done"} onClick={() => setScope("done")}>완료</FilterButton>
              </Row>
              <Input size="sm" width="md" leftIcon={<Icon name="search" />} placeholder="제목 · 증상 · 리포터 · 태그 검색" aria-label="업무 검색" />
            </Row>

            {myPending.length > 0 && (
              <Callout tone="brand" variant="outline" icon="seal-check" title={`에이전트가 올린 ${myPending.length}건이 결과 승인을 기다리고 있어요`} actions={<Button size="xs" variant="ghost" asChild><Link href="/approvals">보기 →</Link></Button>} actionsPlacement="right">
                확인하고 승인하면 다음 단계(배포·고객 보고)로 넘어갑니다.
              </Callout>
            )}

            <TableBox>
              <TableHeader columns={columns} variant="line" />
              {listed.map((t) => (
                <TableRow<Task>
                  key={t.id}
                  href={`/projects/${t.projectId}/tasks/${t.id}`}
                  variant="line"
                  data={t}
                  columns={columns.map((c) => ({ ...c, render: (d: Task) => cell(c.key, d, num(d)) }))}
                />
              ))}
            </TableBox>
          </Stack>
        </Tabs.Panel>

        <Tabs.Panel value="agents">
          <Stack className={styles.tab}>
            <Subtle>에이전트는 &ldquo;고쳤다&rdquo;까지. 반려 사유는 다음 시도 프롬프트에 들어갑니다.</Subtle>
            <List>
              {agentRuns.filter((r) => inProject(getTask(r.taskId)?.projectId ?? "")).map((r) => {
                const t = getTask(r.taskId)!;
                return (
                  <ListItem
                    key={r.id}
                    href={`/projects/${t.projectId}/tasks/${t.id}`}
                    variant="activity"
                    layout="stacked"
                    leading={<Badge size="sm" variant="soft" status={TONE.runState[r.state]}>{LABEL.runState[r.state]}</Badge>}
                    from={<Row tight><Strong>{t.title}</Strong><Subtle>#{r.attempt} · {r.agent}</Subtle></Row>}
                    body={<Stack tight><span>{r.summary}</span>{r.rejectReason && <Subtle>반려: {r.rejectReason}</Subtle>}</Stack>}
                    meta={fmtDateTime(r.startedAt)}
                  />
                );
              })}
            </List>
          </Stack>
        </Tabs.Panel>

        <Tabs.Panel value="deploy">
          <Stack className={styles.tab}>
            <Subtle>승인된 결과만 배포됩니다. 변경은 컨텍스트(`change`)로 기록돼 요구사항과 연결됩니다.</Subtle>
            <List>
              {contextItems.filter((c) => c.kind === "change" && inProject(c.projectId)).map((c) => (
                <ListItem
                  key={c.id}
                  href={`/projects/${c.projectId}/context/${c.id}`}
                  variant="activity"
                  layout="stacked"
                  leading={<Badge size="sm" variant="soft" status="success">배포됨</Badge>}
                  from={<Strong>{c.title}</Strong>}
                  body={<Prose text={c.versions[c.versions.length - 1].body} />}
                  meta={fmtDate(c.origin.at)}
                />
              ))}
              {agentRuns.filter((r) => r.state === "submitted").map((r) => {
                const t = getTask(r.taskId)!;
                return (
                  <ListItem
                    key={r.id}
                    href={`/projects/${t.projectId}/tasks/${t.id}`}
                    variant="activity"
                    layout="stacked"
                    leading={<Badge size="sm" variant="soft" status="warning">승인 대기</Badge>}
                    from={<Strong>{t.title}</Strong>}
                    body={<Subtle>결과 승인 후 배포 큐로 이동 · {r.diff?.split("\n").length ?? 0}개 파일</Subtle>}
                    meta={fmtDate(r.startedAt)}
                  />
                );
              })}
            </List>
          </Stack>
        </Tabs.Panel>

        <Tabs.Panel value="closed">
          <Stack className={styles.tab}>
            <List>
              {tasks.filter((t) => !OPEN(t) && inProject(t.projectId)).map((t) => (
                <ListItem
                  key={t.id}
                  href={`/projects/${t.projectId}/tasks/${t.id}`}
                  variant="activity"
                  leading={<TaskStateBadge state={t.state} />}
                  body={<Row tight><Strong>{t.title}</Strong><Subtle>{getProject(t.projectId)?.name}</Subtle></Row>}
                  meta={t.timeline.length ? fmtDateTime(t.timeline[t.timeline.length - 1].at) : undefined}
                />
              ))}
            </List>
          </Stack>
        </Tabs.Panel>

        <Tabs.Panel value="reports">
          <Stack className={styles.tab}>
            <Subtle>고객 발송 리포트는 승인(customer_send)을 거칩니다.</Subtle>
            <List>
              {deliverables.filter((d) => d.kind === "report" && inProject(d.projectId)).map((d) => (
                <ListItem
                  key={d.id}
                  href={`/projects/${d.projectId}/deliverables/${d.id}`}
                  variant="activity"
                  leading={<Badge size="sm" variant="soft">v{d.versions.length}</Badge>}
                  body={<Row tight><Strong>{d.title}</Strong><Subtle>{getProject(d.projectId)?.name}</Subtle></Row>}
                  meta={fmtDate(d.versions[d.versions.length - 1].at)}
                />
              ))}
            </List>
          </Stack>
        </Tabs.Panel>
      </Tabs>
    </Page>
  );
}

function cell(key: string, t: Task, n: number) {
  switch (key) {
    case "num": return <Subtle>{n}</Subtle>;
    case "state": return <TaskStateBadge state={t.state} />;
    case "kind": return <Badge size="sm" variant="soft" status={t.kind === "bug" ? "destructive" : undefined}>{LABEL.taskKind[t.kind]}</Badge>;
    case "title": return t.title;
    case "project": return <Subtle>{getProject(t.projectId)?.name}</Subtle>;
    case "owner": { const o = getMember(t.ownerId); return <Row tight><Avatar size="xs" name={o?.name} />{o?.name}</Row>; }
    case "severity": return <SeverityBadge severity={t.severity} />;
    case "due": return t.due ? <span>{daysUntil(t.due) < 0 ? <Badge size="sm" variant="soft" status="destructive">+{-daysUntil(t.due)}</Badge> : `D-${daysUntil(t.due)}`}</span> : <Subtle>—</Subtle>;
  }
}
