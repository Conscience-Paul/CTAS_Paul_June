"use client";

/**
 * 업무 상세 — Pre-flight · 실행 시도(AgentRun) · 승인 · 타임라인 · 근거.
 */

import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import {
  Avatar,
  Badge,
  Button,
  Callout,
  Chip,
  CodeBlock,
  EmptyState,
  Icon,
  TooltipProvider,
  useToast,
} from "@/components/ctas/ctds";
import {
  KV,
  MilestoneBadge,
  Mono,
  Page,
  PageHeader,
  Panel,
  Prose,
  Row,
  Section,
  SeverityBadge,
  Split,
  Stack,
  Strong,
  Subtle,
  TaskStateBadge,
  TextLink,
} from "@/components/ctas/ui";
import {
  LABEL,
  TONE,
  approvals,
  byProject,
  daysUntil,
  fmtDate,
  fmtDateTime,
  getContext,
  getMember,
  getProject,
  getTask,
  hrefFor,
  runsForTask,
  scenarioFor,
  type PreflightCheck,
} from "@/lib/mock";
import { usePreview } from "@/lib/preview-state";
import styles from "../tasks.module.css";

const SCOPE_LABEL = { in: "범위 내", out: "범위 밖", unclear: "불명확" } as const;

const CHECK_ICON: Record<PreflightCheck["status"], { name: "check-circle" | "warning" | "warning-circle"; cls: string }> = {
  pass: { name: "check-circle", cls: styles.pass },
  warn: { name: "warning", cls: styles.warn },
  fail: { name: "warning-circle", cls: styles.fail },
};

export default function TaskDetail() {
  const { id, taskId } = useParams<{ id: string; taskId: string }>();
  const pathname = usePathname() ?? "";
  const project = getProject(id);
  const task = getTask(taskId);
  const { toast } = useToast();
  const { askAi, approvalDecisions, decideApproval, riskStatus, resolvedConflicts } = usePreview();

  if (!project || !task) {
    return (
      <Page>
        <EmptyState icon="empty" title="업무를 찾을 수 없습니다" actions={<Button asChild><Link href={`/projects/${id}/tasks`}>업무 목록</Link></Button>} />
      </Page>
    );
  }

  const runs = runsForTask(task.id);
  const milestones = byProject.milestones(project.id).filter((m) => m.taskIds.includes(task.id));
  const risks = byProject.risks(project.id).filter((r) => r.evidence.some((e) => e.type === "task" && e.id === task.id) && (riskStatus[r.id] ?? r.status) !== "resolved");
  const conflicts = byProject.conflicts(project.id).filter((c) => c.parties.some((p) => p.type === "task" && p.id === task.id) && !(resolvedConflicts[c.id] || c.resolved));

  const fails = task.preflight.filter((c) => c.status === "fail").length;
  const warns = task.preflight.filter((c) => c.status === "warn").length;
  const preflightTone = fails > 0 ? "destructive" : warns > 0 ? "warning" : "success";
  const preflightTitle = fails > 0 ? `Pre-flight 미통과 — 실패 ${fails}건` : warns > 0 ? `Pre-flight 조건부 통과 — 주의 ${warns}건` : "Pre-flight 통과";

  const suggestion = scenarioFor(pathname)?.suggestions[0] ?? "이 업무의 근거와 현재 상태를 검토해줘";
  const due = task.due ? daysUntil(task.due) : null;

  return (
    <Page wide>
      <PageHeader
        eyebrow={
          <Row tight>
            <TextLink href={`/projects/${project.id}/tasks`}>업무</TextLink>
            <span>·</span>
            <Mono>{task.id}</Mono>
          </Row>
        }
        title={task.title}
        lead={task.description}
        actions={
          <Button size="sm" variant="outline" leftIcon={<Icon name="chat-circle" />} onClick={() => askAi(suggestion)}>
            AI에게 검토 요청
          </Button>
        }
      />

      <Split>
        <Stack style={{ gap: "var(--space-6)" }}>
          <Panel>
            <Row>
              <Badge size="sm" variant="soft">{LABEL.taskKind[task.kind]}</Badge>
              <TaskStateBadge state={task.state} />
              <SeverityBadge severity={task.severity} />
              <Badge size="sm" variant="soft" status={task.scope === "in" ? "success" : task.scope === "out" ? "warning" : undefined}>{SCOPE_LABEL[task.scope]}</Badge>
              <Badge size="sm" variant="soft">P{task.priority}</Badge>
            </Row>
            <KV
              items={[
                { k: "담당", v: <Row tight><Avatar size="xs" name={getMember(task.ownerId)?.name} />{getMember(task.ownerId)?.name}</Row> },
                { k: "기한", v: task.due ? <Row tight><span>{task.due}</span><Subtle>{due! < 0 ? `${-due!}일 지남` : due === 0 ? "오늘" : `D-${due}`}</Subtle></Row> : "—" },
                { k: "생성", v: task.createdAt },
                { k: "dedupKey", v: <Mono>{task.dedupKey}</Mono> },
                ...(task.blockedReason ? [{ k: "차단 사유", v: <span className={styles.fail}>{task.blockedReason}</span> }] : []),
              ]}
            />
          </Panel>

          {/* Pre-flight */}
          <Section title="Pre-flight" icon="steps" hint="착수 전 자동 점검">
            <Callout tone={preflightTone} variant="fill" icon={CHECK_ICON[fails > 0 ? "fail" : warns > 0 ? "warn" : "pass"].name} title={preflightTitle}>
              {fails > 0
                ? "실패 항목이 해결될 때까지 업무는 blocked 상태로 유지되고, 관련 리스크가 운영 화면에 올라갑니다."
                : warns > 0
                  ? "주의 항목은 착수를 막지 않지만 담당자 확인이 필요합니다."
                  : "누락 정보·정책 충돌·범위 이슈 없음."}
            </Callout>
            <Panel>
              {task.preflight.map((c) => {
                const ic = CHECK_ICON[c.status];
                const href = c.evidenceId ? hrefFor(c.evidenceId, project.id) : undefined;
                const evTitle = c.evidenceId ? getContext(c.evidenceId)?.title ?? c.evidenceId : undefined;
                return (
                  <div key={c.id} className={styles.checkRow}>
                    <span className={ic.cls}><Icon name={ic.name} size={16} /></span>
                    <Stack tight>
                      <Strong>{c.label}</Strong>
                      <Subtle>{c.detail}</Subtle>
                    </Stack>
                    {href ? (
                      <TextLink href={href}><Subtle>{evTitle} ↗</Subtle></TextLink>
                    ) : (
                      <span />
                    )}
                  </div>
                );
              })}
            </Panel>
          </Section>

          {/* AgentRun */}
          <Section title="실행 시도" icon="waveform" hint={runs.length > 0 ? `${runs.length}차` : "없음"}>
            {runs.length === 0 && (
              <Panel>
                <EmptyState size="sm" icon="waveform" title="실행 시도 없음" description="Pre-flight 통과 후 Nora 에이전트 또는 담당자가 착수합니다." />
              </Panel>
            )}
            {runs.map((run) => {
              const approval = approvals.find((a) => a.ref.type === "run" && a.ref.id === run.id);
              const decided = approval ? approvalDecisions[approval.id] ?? approval.state : undefined;
              return (
                <Panel key={run.id}>
                  <div className={styles.runHead}>
                    <Row tight>
                      <Strong>#{run.attempt}</Strong>
                      <Badge size="sm" variant="soft" status={TONE.runState[run.state]}>{LABEL.runState[run.state]}</Badge>
                      <Subtle>{run.agent}</Subtle>
                      <Subtle>· {fmtDateTime(run.startedAt)}</Subtle>
                    </Row>
                    {run.state === "submitted" && approval && decided === "pending" && (
                      <Row tight>
                        <Button size="xs" variant="primary" leftIcon={<Icon name="check" />} onClick={() => { decideApproval(approval.id, "approved"); toast({ title: "결과 승인됨", description: "머지·배포 단계로 넘어갑니다 (프리뷰).", tone: "success" }); }}>결과 승인</Button>
                        <Button size="xs" variant="outline" onClick={() => { decideApproval(approval.id, "rejected"); toast({ title: "반려됨", description: "반려 사유가 다음 시도 프롬프트에 포함됩니다.", tone: "warning" }); }}>반려</Button>
                      </Row>
                    )}
                    {run.state === "submitted" && decided && decided !== "pending" && (
                      <Badge size="sm" variant="soft" status={decided === "approved" ? "success" : "destructive"}>{decided === "approved" ? "승인됨" : "반려됨"}</Badge>
                    )}
                  </div>
                  <Stack tight>
                    <Subtle>계획</Subtle>
                    <Prose text={run.plan} />
                  </Stack>
                  <Stack tight>
                    <Subtle>요약</Subtle>
                    <Prose text={run.summary} />
                  </Stack>
                  {run.diff && (
                    /* CodeBlock 의 복사 버튼이 Tooltip 을 쓰는데 앱 루트에 TooltipProvider 가 없어 로컬로 감쌈 */
                    <TooltipProvider>
                      <CodeBlock language="diff" code={run.diff} />
                    </TooltipProvider>
                  )}
                  {run.rejectReason && (
                    <Callout tone="destructive" variant="outline" icon="warning-circle" title="반려 사유">
                      {run.rejectReason}
                    </Callout>
                  )}
                </Panel>
              );
            })}
          </Section>

          {/* 타임라인 */}
          <Section title="타임라인" icon="clock">
            <Panel>
              <div className={styles.timeline}>
                {task.timeline.map((ev, i) => (
                  <div key={i} className={styles.timelineItem}>
                    <Subtle>{fmtDate(ev.at)}</Subtle>
                    <Strong>{ev.who}</Strong>
                    <span>{ev.text}</span>
                  </div>
                ))}
              </div>
            </Panel>
          </Section>
        </Stack>

        <Stack style={{ gap: "var(--space-6)" }}>
          <Section title="근거 컨텍스트" icon="article">
            <Panel>
              <Stack tight>
                {task.contextIds.map((cid) => {
                  const c = getContext(cid);
                  return (
                    <TextLink key={cid} href={`/projects/${project.id}/context/${cid}`}>
                      <Row tight>
                        <Chip size="sm" variant="outline">{c ? LABEL.contextKind[c.kind] : "?"}</Chip>
                        <span>{c?.title ?? cid}</span>
                      </Row>
                    </TextLink>
                  );
                })}
                {task.contextIds.length === 0 && <Subtle>연결된 컨텍스트 없음</Subtle>}
              </Stack>
            </Panel>
          </Section>

          <Section title="연결 마일스톤" icon="calendar-dots">
            <Panel>
              <Stack tight>
                {milestones.length === 0 && <Subtle>없음</Subtle>}
                {milestones.map((m) => (
                  <Row key={m.id} style={{ justifyContent: "space-between" }}>
                    <TextLink href={`/projects/${project.id}`}>{m.title}</TextLink>
                    <Row tight>
                      <Subtle>{fmtDate(m.due)}</Subtle>
                      <MilestoneBadge state={m.state} />
                    </Row>
                  </Row>
                ))}
              </Stack>
            </Panel>
          </Section>

          <Section title="관련 리스크 · 충돌" icon="warning-circle">
            <Panel>
              <Stack tight>
                {risks.length === 0 && conflicts.length === 0 && <Subtle>없음</Subtle>}
                {risks.map((r) => (
                  <TextLink key={r.id} href={`/projects/${project.id}/risks`}>
                    <Row tight>
                      <SeverityBadge severity={r.severity} />
                      <span>{r.title}</span>
                    </Row>
                  </TextLink>
                ))}
                {conflicts.map((c) => (
                  <TextLink key={c.id} href={`/projects/${project.id}/conflicts`}>
                    <Row tight>
                      <Chip size="sm" variant="outline">{LABEL.conflictKind[c.kind]}</Chip>
                      <span>{c.title}</span>
                    </Row>
                  </TextLink>
                ))}
              </Stack>
            </Panel>
          </Section>
        </Stack>
      </Split>
    </Page>
  );
}
