"use client";

/**
 * 개발 › 개발 목록 — 버그 리포트·신규 기능·변경 요청. 전부 Nora 에이전트가 처리.
 * 체크 → AI 분석 · 통합(그룹 = AI 스레드 하나). 행 클릭 → Drawer.
 */

import Link from "next/link";
import { useState } from "react";
import { Avatar, Badge, Button, Callout, Icon, Input, TableHeader, TableRow } from "@/components/ctas/ctds";
import { Page, PageHeader, Row, SeverityBadge, Stack, Strong, Subtle, TableBox } from "@/components/ctas/ui";
import { DevDrawer } from "./_drawer";
import { IntakeDrawer } from "./_intake";
import { approvals, getMember, type Task, type TaskKind } from "@/lib/mock";
import { usePreview } from "@/lib/preview-state";
import { CountFilter, OPEN, ProjectSelect, WhoSelect, devTasks, taskCell, taskColumns } from "./_shared";
import styles from "./dev.module.css";

type Scope = "open" | "review" | "blocked" | "done";

export default function DevListPage() {
  const { approvalDecisions, taskGroups, addTaskGroup, mentionDoc } = usePreview();
  const [projectFilter, setProjectFilter] = useState<string | null>(null);
  const [who, setWho] = useState<"all" | "mine">("all");
  const [scope, setScope] = useState<Scope[]>(["open"]);
  const [kind, setKind] = useState<TaskKind[]>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [openId, setOpenId] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [intake, setIntake] = useState(false);

  const all = devTasks();
  const base = all.filter((t) => (!projectFilter || t.projectId === projectFilter) && (who === "all" || t.ownerId === "m-seoyeon" || t.ownerId === "m-junho"));
  const scopeOf = (t: Task): Scope => (!OPEN(t) ? "done" : t.state === "blocked" ? "blocked" : t.state === "pending_review" ? "review" : "open");
  const listed = base.filter((t) => (scope.length === 0 || scope.includes(scopeOf(t))) && (kind.length === 0 || kind.includes(t.kind)));
  const myPending = approvals.filter((a) => (!projectFilter || a.projectId === projectFilter) && a.kind === "result" && (approvalDecisions[a.id] ?? a.state) === "pending");

  const groups = taskGroups.map((g) => ({ ...g, taskIds: g.taskIds.filter((id) => listed.some((t) => t.id === id)) })).filter((g) => g.taskIds.length > 0);
  const grouped = new Set(groups.flatMap((g) => g.taskIds));
  const groupOf = (id: string) => groups.find((g) => g.taskIds.includes(id));
  const selectedIds = listed.filter((t) => selected[t.id]).map((t) => t.id);
  const toggle = (id: string, next: boolean) => setSelected((m) => ({ ...m, [id]: next }));
  const toggleMany = (ids: string[], next: boolean) => setSelected((m) => { const n = { ...m }; ids.forEach((id) => (n[id] = next)); return n; });
  const openTask = openId ? all.find((t) => t.id === openId) : undefined;

  const groupCell = (key: string, name: string, members: Task[], isCollapsed: boolean) => {
    switch (key) {
      case "num": return <Icon name={isCollapsed ? "caret-right" : "caret-down"} size={14} />;
      case "title": return <span className={styles.groupTitle}><Icon name="stack" size={14} /><span className={styles.groupName}>{name}</span><Subtle>· 하나의 AI 스레드</Subtle></span>;
      case "state": { const b = members.filter((t) => t.state === "blocked").length; return b > 0 ? <Badge size="sm" variant="soft" status="destructive">차단 {b}</Badge> : <Subtle>{members.length}건</Subtle>; }
      case "kind": return <Subtle>그룹</Subtle>;
      case "owner": return <Row tight>{[...new Set(members.map((t) => t.ownerId))].map((o) => <Avatar key={o} size="xs" name={getMember(o)?.name} />)}</Row>;
      case "severity": { const top = ["critical", "high", "medium", "low"].find((sv) => members.some((t) => t.severity === sv)) as Task["severity"] | undefined; return top ? <SeverityBadge severity={top} /> : null; }
      default: return <Subtle>—</Subtle>;
    }
  };

  return (
    <Page wide>
      <PageHeader
        title="개발 목록"
        lead="버그 리포트 · 신규 기능 · 변경 요청. 접수 → 분류 → 에이전트 수정 → 결과 승인 → 배포."
        actions={<Button size="sm" variant="primary" leftIcon={<Icon name="plus" />} onClick={() => setIntake(true)}>접수</Button>}
      />

      <div className={styles.filters}>
        <ProjectSelect value={projectFilter} onChange={setProjectFilter} />
        <WhoSelect value={who} onChange={setWho} />
        <span className={styles.vsep} />
        <CountFilter<Scope>
          value={scope}
          onChange={setScope}
          options={[
            { id: "open", label: "미해결", count: base.filter((t) => scopeOf(t) === "open").length },
            { id: "review", label: "승인 대기", count: base.filter((t) => scopeOf(t) === "review").length },
            { id: "blocked", label: "차단", count: base.filter((t) => scopeOf(t) === "blocked").length },
            { id: "done", label: "완료", count: base.filter((t) => scopeOf(t) === "done").length },
          ]}
        />
        <span className={styles.vsep} />
        <CountFilter<TaskKind>
          value={kind}
          onChange={setKind}
          options={[
            { id: "bug", label: "버그", count: base.filter((t) => t.kind === "bug").length },
            { id: "feature", label: "신규 기능", count: base.filter((t) => t.kind === "feature").length },
            { id: "change_request", label: "변경 요청", count: base.filter((t) => t.kind === "change_request").length },
          ]}
        />
        <span style={{ flex: 1 }} />
        <Input size="sm" width="md" leftIcon={<Icon name="search" />} placeholder="제목 · 증상 · 리포터 검색" aria-label="검색" />
      </div>

      {myPending.length > 0 && (
        <Callout tone="brand" variant="outline" icon="seal-check" title={`에이전트가 올린 ${myPending.length}건이 결과 승인을 기다리고 있어요`} actions={<Button size="xs" variant="ghost" asChild><Link href="/approvals">보기 →</Link></Button>} actionsPlacement="right">
          확인하고 승인하면 배포 단계로 넘어갑니다.
        </Callout>
      )}

      <Stack>
        <div className={styles.selectBar}>
          {selectedIds.length > 0 ? (
            <>
              <Strong>{selectedIds.length}건 선택</Strong>
              <Button size="sm" variant="primary" leftIcon={<Icon name="chat-circle" />} onClick={() => { selectedIds.forEach((id) => mentionDoc(id)); setSelected({}); }}>AI 분석</Button>
              <Button size="sm" variant="outline" leftIcon={<Icon name="stack" />} disabled={selectedIds.length < 2} onClick={() => { addTaskGroup(selectedIds); setSelected({}); }}>통합</Button>
              <Button size="sm" variant="ghost" onClick={() => setSelected({})}>선택 해제</Button>
              <Subtle>통합하면 하나의 AI 스레드를 공유합니다.</Subtle>
            </>
          ) : (
            <Subtle>{listed.length}건 · 체크하면 AI 분석 · 통합. 행을 누르면 상세.</Subtle>
          )}
        </div>
        <TableBox>
          <TableHeader columns={taskColumns} variant="line" selectable selectAllChecked={listed.length > 0 && selectedIds.length === listed.length} onSelectAllChange={(next) => toggleMany(listed.map((t) => t.id), next)} />
          {groups.map((g) => {
            const members = g.taskIds.map((id) => all.find((t) => t.id === id)!);
            const isCollapsed = !!collapsed[g.id];
            return (
              <div key={g.id} style={{ display: "contents" }}>
                <TableRow<Task> variant="line" data={members[0]} selectable selected={members.every((t) => selected[t.id])} onSelectedChange={(next) => toggleMany(g.taskIds, next)} onClick={() => setCollapsed((m) => ({ ...m, [g.id]: !isCollapsed }))} columns={taskColumns.map((c) => ({ ...c, render: () => groupCell(c.key, g.name, members, isCollapsed) }))} />
                {!isCollapsed && members.map((t) => (
                  <TableRow<Task> key={t.id} variant="line" data={t} selectable selected={!!selected[t.id]} onSelectedChange={(next) => toggle(t.id, next)} onClick={() => setOpenId(t.id)} columns={taskColumns.map((c) => ({ ...c, render: (d: Task) => (c.key === "title" ? <span className={styles.member}><span className={styles.ellipsis}>{d.title}</span></span> : taskCell(c.key, d)) }))} />
                ))}
              </div>
            );
          })}
          {listed.filter((t) => !grouped.has(t.id)).map((t) => (
            <TableRow<Task> key={t.id} variant="line" data={t} selectable selected={!!selected[t.id]} onSelectedChange={(next) => toggle(t.id, next)} onClick={() => setOpenId(t.id)} columns={taskColumns.map((c) => ({ ...c, render: (d: Task) => taskCell(c.key, d) }))} />
          ))}
        </TableBox>
      </Stack>

      {openTask && <DevDrawer task={openTask} group={groupOf(openTask.id)} onClose={() => setOpenId(null)} />}
      {intake && <IntakeDrawer onClose={() => setIntake(false)} defaultProjectId={projectFilter ?? undefined} />}
    </Page>
  );
}
