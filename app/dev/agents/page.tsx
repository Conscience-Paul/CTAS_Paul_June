"use client";

/**
 * 개발 › 에이전트 — Nora 실행 시도(AgentRun). 행 클릭 → 실행 결과 문서 Drawer.
 * 에이전트는 "고쳤다"까지. 반려 사유는 다음 시도 프롬프트에 들어간다.
 */

import { useState } from "react";
import { Badge, Button, Icon, TableHeader, TableRow } from "@/components/ctas/ctds";
import { Page, PageHeader, Row, Subtle, TableBox } from "@/components/ctas/ui";
import { DevDrawer } from "../_drawer";
import { LABEL, TONE, agentRuns, fmtDateTime, getProject, getTask, type AgentRun, type RunState } from "@/lib/mock";
import { usePreview } from "@/lib/preview-state";
import { CountFilter, ProjectSelect } from "../_shared";
import styles from "../dev.module.css";

const columns = [
  { key: "attempt", label: "#", width: 56 },
  { key: "state", label: "상태", width: 110 },
  { key: "task", label: "개발 항목", flex: true, minWidth: 320 },
  { key: "project", label: "프로젝트", width: 170 },
  { key: "agent", label: "에이전트", width: 170 },
  { key: "summary", label: "결과", width: 320 },
  { key: "at", label: "시작", width: 110 },
];

export default function AgentsPage() {
  const { openPreview } = usePreview();
  const [projectFilter, setProjectFilter] = useState<string | null>(null);
  const [state, setState] = useState<RunState[]>([]);
  const [openTaskId, setOpenTaskId] = useState<string | null>(null);
  const { taskGroups } = usePreview();
  const base = agentRuns.filter((r) => !projectFilter || getTask(r.taskId)?.projectId === projectFilter);
  const runs = base.filter((r) => state.length === 0 || state.includes(r.state)).sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  const count = (s: RunState) => base.filter((r) => r.state === s).length;

  return (
    <Page wide>
      <PageHeader title="에이전트" lead="실행 시도별 계획 · 결과 · diff. 승인은 사람이 하고 반려 사유는 다음 시도에 들어갑니다." actions={<Button size="sm" variant="outline" leftIcon={<Icon name="devices" />} onClick={() => openPreview()}>미리보기</Button>} />
      <div className={styles.filters}>
        <ProjectSelect value={projectFilter} onChange={setProjectFilter} />
        <span className={styles.vsep} />
        <CountFilter<RunState>
          value={state}
          onChange={setState}
          options={[
            { id: "running", label: "수정 중", count: count("running") },
            { id: "submitted", label: "승인 요청", count: count("submitted") },
            { id: "rejected", label: "반려", count: count("rejected") },
            { id: "approved", label: "승인됨", count: count("approved") },
            { id: "queued", label: "큐", count: count("queued") },
            { id: "failed", label: "실패", count: count("failed") },
          ]}
        />
      </div>
      <TableBox>
        <TableHeader columns={columns} variant="line" />
        {runs.map((r) => (
          <TableRow<AgentRun> key={r.id} variant="line" data={r} onClick={() => setOpenTaskId(r.taskId)} columns={columns.map((c) => ({ ...c, render: (d: AgentRun) => cell(c.key, d) }))} />
        ))}
      </TableBox>
      {openTaskId && getTask(openTaskId) && <DevDrawer task={getTask(openTaskId)!} group={taskGroups.find((g) => g.taskIds.includes(openTaskId))} onClose={() => setOpenTaskId(null)} />}
    </Page>
  );
}

function cell(key: string, r: AgentRun) {
  const t = getTask(r.taskId);
  switch (key) {
    case "attempt": return <Subtle>#{r.attempt}</Subtle>;
    case "state": return <Badge size="sm" variant="soft" status={TONE.runState[r.state]}>{LABEL.runState[r.state]}</Badge>;
    case "task": return t?.title ?? r.taskId;
    case "project": return <Subtle>{t ? getProject(t.projectId)?.name.replace(/^한빛유통 |^세종캐피탈 /, "") : "—"}</Subtle>;
    case "agent": return <Subtle>{r.agent}</Subtle>;
    case "summary": return <Row tight><span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.rejectReason ? `반려: ${r.rejectReason}` : r.summary}</span></Row>;
    case "at": return <Subtle>{fmtDateTime(r.startedAt)}</Subtle>;
  }
}
