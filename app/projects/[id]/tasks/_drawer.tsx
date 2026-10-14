"use client";

/**
 * 업무 Drawer — 리스트/보드에서 클릭 시. 개요(Pre-flight) · 실행(AgentRun) · 타임라인 · AI 스레드.
 * 스레드: 통합 그룹에 속하면 그룹 하나의 스레드, 아니면 업무 각자의 스레드.
 */

import Link from "next/link";
import { Avatar, Badge, Button, Callout, Chip, Drawer, Icon, Tabs, useToast } from "@/components/ctas/ctds";
import { KV, Panel, Prose, Row, Section, SeverityBadge, Stack, Strong, Subtle, TaskStateBadge } from "@/components/ctas/ui";
import { LABEL, TONE, daysUntil, fmtDateTime, getContext, getMember, getTask, hrefFor, runsForTask, type Task } from "@/lib/mock";
import { usePreview, type TaskGroup } from "@/lib/preview-state";
import styles from "./tasks.module.css";

const SCOPE_LABEL = { in: "범위 내", out: "범위 밖", unclear: "불명확" } as const;
const CHECK_ICON = { pass: "check-circle", warn: "warning", fail: "warning-circle" } as const;

export function TaskDrawer({ task, group, onClose }: { task: Task; group?: TaskGroup; onClose: () => void }) {
  const { toast } = useToast();
  const { mentionDoc, removeTaskGroup } = usePreview();
  const runs = runsForTask(task.id);
  const fails = task.preflight.filter((c) => c.status === "fail").length;
  const warns = task.preflight.filter((c) => c.status === "warn").length;
  const threadIds = group ? group.taskIds : [task.id];
  const openThread = () => { threadIds.forEach((id) => mentionDoc(id)); onClose(); };

  return (
    <Drawer
      open
      onOpenChange={(o) => !o && onClose()}
      size="lg"
      title={task.title}
      description={<Row tight><TaskStateBadge state={task.state} /><Badge size="sm" variant="soft">{LABEL.taskKind[task.kind]}</Badge><SeverityBadge severity={task.severity} /><Subtle>{getMember(task.ownerId)?.name}{task.due ? ` · 기한 ${task.due.slice(5).replace("-", "/")} (D${daysUntil(task.due) >= 0 ? "-" : "+"}${Math.abs(daysUntil(task.due))})` : ""}</Subtle>{group && <Chip size="sm" variant="soft" leftIcon={<Icon name="stack" size={10} />}>{group.name}</Chip>}</Row>}
      footer={
        <>
          <Button variant="ghost" leftIcon={<Icon name="arrow-square-out" />} asChild><Link href={`/projects/${task.projectId}/tasks/${task.id}`}>전체 페이지</Link></Button>
          <Button variant="primary" leftIcon={<Icon name="chat-circle" />} onClick={openThread}>AI 분석{group ? ` (그룹 스레드 · ${group.taskIds.length}건)` : ""}</Button>
        </>
      }
    >
      <Tabs defaultValue="overview" variant="underline" size="sm">
        <Tabs.List aria-label="업무 보기">
          <Tabs.Trigger value="overview">개요</Tabs.Trigger>
          <Tabs.Trigger value="runs">실행 {runs.length > 0 && <Badge size="sm" variant="soft">{runs.length}</Badge>}</Tabs.Trigger>
          <Tabs.Trigger value="timeline">타임라인</Tabs.Trigger>
          <Tabs.Trigger value="thread">AI 스레드</Tabs.Trigger>
        </Tabs.List>

        <Tabs.Panel value="overview">
          <div className={styles.drawerBody}>
            <Panel subtle><Prose text={task.description} /></Panel>
            {task.blockedReason && <Callout tone="destructive" variant="outline" icon="warning" title="차단됨">{task.blockedReason}</Callout>}
            <Section title="Pre-flight" icon="steps" hint={fails > 0 ? `실패 ${fails}` : warns > 0 ? `경고 ${warns}` : "통과"}>
              <Panel>
                <Stack tight>
                  {task.preflight.map((c) => (
                    <div key={c.id} className={styles.check} data-status={c.status}>
                      <Icon name={CHECK_ICON[c.status]} size={14} />
                      <Stack tight style={{ minWidth: 0 }}>
                        <Strong>{c.label}</Strong>
                        <Subtle>{c.detail}{c.evidenceId && hrefFor(c.evidenceId) && <> · <Link href={hrefFor(c.evidenceId)!}>근거 ↗</Link></>}</Subtle>
                      </Stack>
                    </div>
                  ))}
                </Stack>
              </Panel>
            </Section>
            <KV items={[
              { k: "범위", v: SCOPE_LABEL[task.scope] },
              { k: "우선순위", v: `P${task.priority}` },
              { k: "dedupKey", v: <code style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-xs)" }}>{task.dedupKey}</code> },
              { k: "근거 컨텍스트", v: <Row tight>{task.contextIds.map((cid) => { const h = hrefFor(cid); const t = getContext(cid)?.title ?? cid; return h ? <Link key={cid} href={h} style={{ textDecoration: "none" }}><Chip size="sm" variant="outline">{t}</Chip></Link> : <Chip key={cid} size="sm" variant="outline">{t}</Chip>; })}</Row> },
            ]} />
          </div>
        </Tabs.Panel>

        <Tabs.Panel value="runs">
          <div className={styles.drawerBody}>
            {runs.length === 0 && <Subtle>아직 실행 시도가 없습니다. 에이전트는 &ldquo;고쳤다&rdquo;까지, 승인은 사람이 합니다.</Subtle>}
            {runs.map((r) => (
              <Panel key={r.id}>
                <Row style={{ justifyContent: "space-between" }}>
                  <Row tight><Strong>#{r.attempt}</Strong><Badge size="sm" variant="soft" status={TONE.runState[r.state]}>{LABEL.runState[r.state]}</Badge><Subtle>{r.agent}</Subtle></Row>
                  <Subtle>{fmtDateTime(r.startedAt)}</Subtle>
                </Row>
                <Prose text={r.summary} />
                {r.diff && <Panel subtle><pre style={{ margin: 0, fontFamily: "var(--font-mono)", fontSize: "var(--text-xs)", whiteSpace: "pre-wrap" }}>{r.diff}</pre></Panel>}
                {r.rejectReason && <Callout tone="destructive" variant="outline" icon="warning-circle" title="반려 사유">{r.rejectReason}</Callout>}
              </Panel>
            ))}
          </div>
        </Tabs.Panel>

        <Tabs.Panel value="timeline">
          <div className={styles.drawerBody}>
            <Panel>
              <Stack>
                {task.timeline.map((e, i) => (
                  <Row key={i} tight style={{ flexWrap: "nowrap", alignItems: "flex-start" }}>
                    <Subtle style={{ flexShrink: 0, fontFamily: "var(--font-mono)" }}>{e.at}</Subtle>
                    <Avatar size="xs" name={e.who} />
                    <span>{e.text}</span>
                  </Row>
                ))}
              </Stack>
            </Panel>
          </div>
        </Tabs.Panel>

        <Tabs.Panel value="thread">
          <div className={styles.drawerBody}>
            {group ? (
              <Callout tone="brand" variant="outline" icon="stack" title={`${group.name} — 그룹 스레드`} actions={<Button size="xs" variant="ghost" onClick={() => { removeTaskGroup(group.id); toast({ title: "통합 해제", description: "각 업무가 다시 개별 스레드를 가집니다." }); onClose(); }}>통합 해제</Button>} actionsPlacement="right">
                통합된 업무 {group.taskIds.length}건이 하나의 AI 스레드를 공유합니다. 어느 업무에서 열어도 같은 대화가 이어집니다.
              </Callout>
            ) : (
              <Callout tone="neutral" variant="outline" icon="chat-circle" title="개별 스레드">이 업무만의 AI 스레드입니다. 다른 업무와 함께 보려면 리스트에서 체크 후 「통합」하세요.</Callout>
            )}
            <Section title="스레드 범위" icon="selection">
              <Panel>
                <Stack tight>
                  {threadIds.map((id) => { const t = getTask(id)!; return <Row key={id} tight><TaskStateBadge state={t.state} /><span>{t.title}</span></Row>; })}
                </Stack>
              </Panel>
            </Section>
            <Row>
              <Button variant="primary" leftIcon={<Icon name="chat-circle" />} onClick={openThread}>스레드 열기 — AI 분석</Button>
              <Subtle>프리뷰 — 대화 내용은 세션 동안 AI 패널에만 남습니다.</Subtle>
            </Row>
          </div>
        </Tabs.Panel>
      </Tabs>
    </Drawer>
  );
}
