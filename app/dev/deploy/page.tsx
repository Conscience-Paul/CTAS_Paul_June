"use client";

/**
 * 개발 › 배포 — 승인된 결과만 배포. 변경은 컨텍스트(change)로 기록돼 요구사항과 연결된다.
 * 행 클릭 → 변경 문서 Drawer (승인 대기 건은 실행 결과 Drawer).
 */

import { useState } from "react";
import { Badge, Button, Icon, TableHeader, TableRow } from "@/components/ctas/ctds";
import { Page, PageHeader, Subtle, TableBox } from "@/components/ctas/ui";
import { KnowledgeDrawer } from "@/app/knowledge/_shared";
import { agentRuns, contextItems, fmtDate, getProject, getTask, type AgentRun, type ContextItem, type KEntry } from "@/lib/mock";
import { usePreview } from "@/lib/preview-state";
import { CountFilter, ProjectFilter } from "../_shared";
import styles from "../dev.module.css";

type Status = "deployed" | "pending" | "conflict";
type DeployRow = { id: string; status: Status; title: string; projectId: string; detail: string; at: string; entry: KEntry };

const columns = [
  { key: "status", label: "상태", width: 110 },
  { key: "title", label: "변경", flex: true, minWidth: 320 },
  { key: "project", label: "프로젝트", width: 170 },
  { key: "detail", label: "내용", width: 360 },
  { key: "at", label: "일시", width: 100 },
];

export default function DeployPage() {
  const { openPreview } = usePreview();
  const [projectFilter, setProjectFilter] = useState<string | null>(null);
  const [status, setStatus] = useState<Status | null>(null);
  const [open, setOpen] = useState<KEntry | null>(null);
  const inProject = (pid: string) => !projectFilter || pid === projectFilter;

  const base: DeployRow[] = [
    ...contextItems.filter((c) => c.kind === "change" && inProject(c.projectId)).map((c: ContextItem) => ({ id: c.id, status: (c.id === "ctx-change-sap-sync" ? "conflict" : "deployed") as Status, title: c.title, projectId: c.projectId, detail: c.versions[c.versions.length - 1].summary, at: c.origin.at, entry: { type: "context" as const, id: c.id, item: c } })),
    ...agentRuns.filter((r) => r.state === "submitted" && inProject(getTask(r.taskId)?.projectId ?? "")).map((r: AgentRun) => { const t = getTask(r.taskId)!; return { id: r.id, status: "pending" as Status, title: t.title, projectId: t.projectId, detail: `결과 승인 후 배포 · ${r.diff?.split("\n").length ?? 0}개 파일`, at: r.startedAt, entry: { type: "run" as const, id: r.id, item: r } }; }),
    ...agentRuns.filter((r) => r.state === "approved" && inProject(getTask(r.taskId)?.projectId ?? "")).map((r: AgentRun) => { const t = getTask(r.taskId)!; return { id: r.id, status: "deployed" as Status, title: t.title, projectId: t.projectId, detail: r.summary, at: r.startedAt, entry: { type: "run" as const, id: r.id, item: r } }; }),
  ].sort((a, b) => b.at.localeCompare(a.at));
  const rows = base.filter((r) => !status || r.status === status);
  const count = (s: Status) => base.filter((r) => r.status === s).length;

  return (
    <Page wide>
      <PageHeader title="배포" lead="승인된 결과만 배포됩니다. 배포된 변경은 컨텍스트로 남아 요구사항과의 충돌을 추적합니다." actions={<Button size="sm" variant="outline" leftIcon={<Icon name="devices" />} onClick={() => openPreview()}>미리보기</Button>} />
      <div className={styles.filters}>
        <Subtle className={styles.filterLabel}>프로젝트</Subtle>
        <ProjectFilter value={projectFilter} onChange={setProjectFilter} />
        <span className={styles.vsep} />
        <CountFilter<Status>
          label="상태"
          value={status}
          onChange={setStatus}
          options={[
            { id: "deployed", label: "배포됨", count: count("deployed") },
            { id: "pending", label: "승인 대기", count: count("pending") },
            { id: "conflict", label: "요구사항 충돌", count: count("conflict") },
          ]}
        />
      </div>
      <TableBox>
        <TableHeader columns={columns} variant="line" />
        {rows.map((r) => (
          <TableRow<DeployRow> key={r.id} variant="line" data={r} onClick={() => setOpen(r.entry)} columns={columns.map((c) => ({ ...c, render: (d: DeployRow) => cell(c.key, d) }))} />
        ))}
      </TableBox>
      {open && <KnowledgeDrawer entry={open} onClose={() => setOpen(null)} onAskAi={() => setOpen(null)} />}
    </Page>
  );
}

function cell(key: string, r: DeployRow) {
  switch (key) {
    case "status": return r.status === "deployed" ? <Badge size="sm" variant="soft" status="success">배포됨</Badge> : r.status === "conflict" ? <Badge size="sm" variant="soft" status="destructive">충돌</Badge> : <Badge size="sm" variant="soft" status="warning">승인 대기</Badge>;
    case "title": return r.title;
    case "project": return <Subtle>{getProject(r.projectId)?.name.replace(/^한빛유통 |^세종캐피탈 /, "")}</Subtle>;
    case "detail": return <Subtle>{r.detail}</Subtle>;
    case "at": return <Subtle>{fmtDate(r.at)}</Subtle>;
  }
}
