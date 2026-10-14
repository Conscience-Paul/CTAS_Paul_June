"use client";

/**
 * 업무 — 보드 / 테이블 / 요청 인박스.
 * 요청 접수 → 군집 판정(합류/신규/범위 밖) → 업무 상태 전이.
 */

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import {
  Avatar,
  Badge,
  Button,
  Icon,
  ListItem,
  TableHeader,
  TableRow,
  Tabs,
  useToast,
} from "@/components/ctas/ctds";
import {
  Page,
  PageHeader,
  Panel,
  Row,
  SeverityBadge,
  Subtle,
  Stack,
  TaskStateBadge,
  TextLink, List, TableBox, Strong } from "@/components/ctas/ui";
import {
  LABEL,
  byProject,
  daysUntil,
  fmtDateTime,
  getMember,
  getProject,
  type Task,
  type TaskState,
  type Triage,
} from "@/lib/mock";
import { usePreview } from "@/lib/preview-state";
import { TaskDrawer } from "./_drawer";
import styles from "./tasks.module.css";

const COLUMNS: { label: string; states: TaskState[] }[] = [
  { label: "신규", states: ["new"] },
  { label: "분류 · 사전 점검", states: ["triaged", "preflight"] },
  { label: "진행 중", states: ["in_progress"] },
  { label: "검토 대기", states: ["pending_review"] },
  { label: "차단됨", states: ["blocked"] },
  { label: "완료 · 검증", states: ["done", "verified"] },
];

const TRIAGE_TONE: Record<Triage, "success" | "warning" | "destructive" | "info" | undefined> = {
  join: "info",
  new: "success",
  out_of_scope: "warning",
  pending: undefined,
};

const SCOPE_LABEL = { in: "범위 내", out: "범위 밖", unclear: "불명확" } as const;

const dueLabel = (due?: string) => {
  if (!due) return null;
  const d = daysUntil(due);
  return d < 0 ? `D+${-d}` : d === 0 ? "오늘" : `D-${d}`;
};

export default function TasksPage() {
  const { id } = useParams<{ id: string }>();
  const project = getProject(id);
  const { toast } = useToast();
  const [tab, setTab] = useState("board");
  const { taskGroups, addTaskGroup, mentionDoc } = usePreview();
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [openId, setOpenId] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  if (!project) return null;

  const tasks = byProject.tasks(project.id);
  const requests = byProject.requests(project.id);
  const pendingRequests = requests.filter((r) => r.triage === "pending").length;

  // 통합 그룹 — 이 프로젝트 업무만. 그룹 행 아래에 멤버가 들여쓰기로 붙는다.
  const groups = taskGroups.map((g) => ({ ...g, taskIds: g.taskIds.filter((id) => tasks.some((t) => t.id === id)) })).filter((g) => g.taskIds.length > 0);
  const grouped = new Set(groups.flatMap((g) => g.taskIds));
  const groupOf = (id: string) => groups.find((g) => g.taskIds.includes(id));
  const selectedIds = tasks.filter((t) => selected[t.id]).map((t) => t.id);
  const allChecked = tasks.length > 0 && selectedIds.length === tasks.length;
  const toggle = (id: string, next: boolean) => setSelected((m) => ({ ...m, [id]: next }));
  const toggleMany = (ids: string[], next: boolean) => setSelected((m) => { const n = { ...m }; ids.forEach((id) => (n[id] = next)); return n; });
  const analyze = (ids: string[]) => { ids.forEach((id) => mentionDoc(id)); setSelected({}); };
  const merge = () => {
    const g = addTaskGroup(selectedIds);
    setSelected({});
    toast({ title: `${g.name} 생성`, description: "통합된 업무는 하나의 AI 스레드를 공유합니다.", tone: "success" });
  };
  const openTask = openId ? tasks.find((t) => t.id === openId) : undefined;

  const tableColumns = [
    { key: "title", label: "업무", flex: true, minWidth: 260 },
    { key: "state", label: "상태", width: 110 },
    { key: "kind", label: "종류", width: 100 },
    { key: "owner", label: "담당", width: 120 },
    { key: "severity", label: "심각도", width: 90 },
    { key: "scope", label: "범위", width: 90 },
    { key: "due", label: "기한", width: 90 },
  ];

  const renderCell = (key: string, t: Task) => {
    switch (key) {
      case "title":
        return t.title;
      case "state":
        return <TaskStateBadge state={t.state} />;
      case "kind":
        return LABEL.taskKind[t.kind];
      case "owner":
        return (
          <Row tight>
            <Avatar size="xs" name={getMember(t.ownerId)?.name} />
            <span>{getMember(t.ownerId)?.name}</span>
          </Row>
        );
      case "severity":
        return <SeverityBadge severity={t.severity} />;
      case "scope":
        return <Badge size="sm" variant="soft" status={t.scope === "in" ? "success" : t.scope === "out" ? "warning" : undefined}>{SCOPE_LABEL[t.scope]}</Badge>;
      case "due":
        return <Subtle>{dueLabel(t.due) ?? "—"}</Subtle>;
    }
  };

  const renderGroupCell = (key: string, name: string, members: Task[], isCollapsed: boolean) => {
    switch (key) {
      case "title":
        return (
          <span className={styles.groupTitle}>
            <Icon name={isCollapsed ? "caret-right" : "caret-down"} size={14} />
            <Icon name="stack" size={14} />
            <span className={styles.groupName}>{name}</span>
            <Subtle>· 하나의 AI 스레드</Subtle>
          </span>
        );
      case "state": {
        const blocked = members.filter((t) => t.state === "blocked").length;
        return blocked > 0 ? <Badge size="sm" variant="soft" status="destructive">차단 {blocked}</Badge> : <Subtle>{members.length}건</Subtle>;
      }
      case "kind": return <Subtle>그룹</Subtle>;
      case "owner": {
        const owners = [...new Set(members.map((t) => t.ownerId))];
        return <Row tight>{owners.map((o) => <Avatar key={o} size="xs" name={getMember(o)?.name} />)}</Row>;
      }
      case "severity": { const top = ["critical", "high", "medium", "low"].find((sv) => members.some((t) => t.severity === sv)) as Task["severity"] | undefined; return top ? <SeverityBadge severity={top} /> : null; }
      default: return <Subtle>—</Subtle>;
    }
  };

  return (
    <Page wide>
      <PageHeader
        eyebrow={project.name}
        title="업무"
        lead="요청 접수 → 군집 판정 → Pre-flight → 실행 → 검증. 사람이 결정하는 지점은 분류·사전 점검·결과·고객 발송 4곳."
        actions={<Button size="sm" variant="primary" leftIcon={<Icon name="plus" />} onClick={() => toast({ title: "프리뷰", description: "업무 생성은 실제 연동 시 동작합니다." })}>새 업무</Button>}
      />

      <Tabs value={tab} onValueChange={setTab} variant="underline" size="md">
        <Tabs.List aria-label="업무 보기">
          <Tabs.Trigger value="board" leadingIcon={<Icon name="columns" />}>보드</Tabs.Trigger>
          <Tabs.Trigger value="table" leadingIcon={<Icon name="table" />}>테이블</Tabs.Trigger>
          <Tabs.Trigger value="inbox" leadingIcon={<Icon name="envelope" />}>
            요청 인박스{pendingRequests > 0 && <> ({pendingRequests})</>}
          </Tabs.Trigger>
        </Tabs.List>

        <Tabs.Panel value="board">
          <div className={styles.board}>
            {COLUMNS.map((col) => {
              const items = tasks.filter((t) => col.states.includes(t.state));
              return (
                <div key={col.label} className={styles.column}>
                  <div className={styles.columnHead}>
                    <span>{col.label}</span>
                    <Badge size="sm" variant="soft">{items.length}</Badge>
                  </div>
                  {items.map((t) => (
                    <Panel key={t.id} className={styles.card} role="button" tabIndex={0} style={{ cursor: "pointer" }} onClick={() => setOpenId(t.id)} onKeyDown={(e) => { if (e.key === "Enter") setOpenId(t.id); }}>
                      <Row tight>
                        <Badge size="sm" variant="soft">{LABEL.taskKind[t.kind]}</Badge>
                        <SeverityBadge severity={t.severity} />
                      </Row>
                      <span className={styles.cardTitle}>{t.title}</span>
                      {t.blockedReason && (
                        <span className={styles.blocked}>
                          <Icon name="warning" size={12} />
                          {t.blockedReason}
                        </span>
                      )}
                      <div className={styles.cardFoot}>
                        <Row tight>
                          <Avatar size="xs" name={getMember(t.ownerId)?.name} />
                          <Subtle>{getMember(t.ownerId)?.name}</Subtle>
                        </Row>
                        {t.due && <Subtle>{dueLabel(t.due)}</Subtle>}
                      </div>
                    </Panel>
                  ))}
                </div>
              );
            })}
          </div>
        </Tabs.Panel>

        <Tabs.Panel value="table">
          <Stack style={{ paddingTop: "var(--space-3)" }}>
            <div className={styles.selectBar}>
              {selectedIds.length > 0 ? (
                <>
                  <Strong>{selectedIds.length}건 선택</Strong>
                  <Button size="sm" variant="primary" leftIcon={<Icon name="chat-circle" />} onClick={() => analyze(selectedIds)}>AI 분석</Button>
                  <Button size="sm" variant="outline" leftIcon={<Icon name="stack" />} disabled={selectedIds.length < 2} onClick={merge}>통합</Button>
                  <Button size="sm" variant="ghost" onClick={() => setSelected({})}>선택 해제</Button>
                  <Subtle>통합하면 하나의 AI 스레드를 공유합니다. 그 외는 업무마다 각자의 스레드.</Subtle>
                </>
              ) : (
                <Subtle>체크하면 AI 분석 · 통합을 할 수 있습니다. 행을 누르면 상세가 열립니다.</Subtle>
              )}
            </div>
            <TableBox>
              <TableHeader columns={tableColumns} variant="line" selectable selectAllChecked={allChecked} onSelectAllChange={(next) => toggleMany(tasks.map((t) => t.id), next)} />
              {groups.map((g) => {
                const members = g.taskIds.map((id) => tasks.find((t) => t.id === id)!);
                const allSel = members.every((t) => selected[t.id]);
                const isCollapsed = !!collapsed[g.id];
                return (
                  <div key={g.id} style={{ display: "contents" }}>
                    <TableRow<Task>
                      variant="line"
                      data={members[0]}
                      selectable
                      selected={allSel}
                      onSelectedChange={(next) => toggleMany(g.taskIds, next)}
                      onClick={() => setCollapsed((m) => ({ ...m, [g.id]: !isCollapsed }))}
                      columns={tableColumns.map((c) => ({ ...c, render: () => renderGroupCell(c.key, g.name, members, isCollapsed) }))}
                    />
                    {!isCollapsed && members.map((t) => (
                      <TableRow<Task>
                        key={t.id}
                        variant="line"
                        data={t}
                        selectable
                        selected={!!selected[t.id]}
                        onSelectedChange={(next) => toggle(t.id, next)}
                        onClick={() => setOpenId(t.id)}
                        columns={tableColumns.map((c) => ({ ...c, render: (d: Task) => (c.key === "title" ? <span className={styles.member}><span className={styles.ellipsis}>{d.title}</span></span> : renderCell(c.key, d)) }))}
                      />
                    ))}
                  </div>
                );
              })}
              {tasks.filter((t) => !grouped.has(t.id)).map((t) => (
                <TableRow<Task>
                  key={t.id}
                  variant="line"
                  data={t}
                  selectable
                  selected={!!selected[t.id]}
                  onSelectedChange={(next) => toggle(t.id, next)}
                  onClick={() => setOpenId(t.id)}
                  columns={tableColumns.map((c) => ({ ...c, render: (d: Task) => renderCell(c.key, d) }))}
                />
              ))}
            </TableBox>
          </Stack>
        </Tabs.Panel>

        <Tabs.Panel value="inbox">
          <List>
            {requests.map((r) => (
              <ListItem
                key={r.id}
                variant="activity"
                layout="stacked"
                leading={<Badge size="sm" variant="soft" status={TRIAGE_TONE[r.triage]}>{LABEL.triage[r.triage]}</Badge>}
                from={
                  <Row tight>
                    <Subtle>{LABEL.source[r.channel]}</Subtle>
                    <Subtle>·</Subtle>
                    <span>{r.from}</span>
                  </Row>
                }
                body={
                  <Stack tight>
                    <span>{r.text}</span>
                    {r.taskId && (
                      <TextLink href={`/projects/${project.id}/tasks/${r.taskId}`}>
                        <Subtle>→ {LABEL.triage[r.triage] === "기존 업무 합류" ? "합류한 업무" : "생성된 업무"} 열기</Subtle>
                      </TextLink>
                    )}
                  </Stack>
                }
                meta={fmtDateTime(r.at)}
                trailing={
                  r.triage === "pending" ? (
                    <div className={styles.inboxActions}>
                      <Button size="xs" variant="outline" onClick={() => toast({ title: "기존 업무에 합류", description: "군집 판정 결과를 승인 큐에 반영합니다 (프리뷰).", tone: "success" })}>합류</Button>
                      <Button size="xs" variant="outline" onClick={() => toast({ title: "신규 업무 생성", description: "프리뷰 — 보드에는 반영되지 않습니다.", tone: "success" })}>신규</Button>
                      <Button size="xs" variant="ghost" onClick={() => toast({ title: "범위 밖으로 분류", description: "CR 안내서 초안을 산출물에 제안합니다 (프리뷰).", tone: "warning" })}>범위 밖</Button>
                    </div>
                  ) : undefined
                }
              />
            ))}
          </List>
          <Subtle>
            군집 판정은 접수 즉시 자동. 판정 대기 건만 사람이 결정합니다. 자세한 흐름은 <Link href="/approvals">승인 대기</Link>에서.
          </Subtle>
        </Tabs.Panel>
      </Tabs>
      {openTask && <TaskDrawer task={openTask} group={groupOf(openTask.id)} onClose={() => setOpenId(null)} />}
    </Page>
  );
}
