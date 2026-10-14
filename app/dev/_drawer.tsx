"use client";

/**
 * 개발 Drawer — 단계가 진행될수록 탭이 쌓인다.
 *   접수      : 「접수 내용」 (orbit intake 폼에 입력한 그대로)
 *   에이전트  : + 「분석」 (군집 판정 · 원인 · 영향 범위 · 계획)
 *   배포      : + 「수정」 (diff · 테스트 · 검토)
 *   종결      : + 「배포 결과」 (배포 일시 · 환경 · 검증)
 * 어느 탭까지 보일지는 데이터(실행 기록)로 결정 — 페이지가 아니라 항목의 진행 단계.
 */

import { Avatar, Badge, Button, Callout, Chip, Drawer, Icon, Tabs, useToast } from "@/components/ctas/ctds";
import { KV, Panel, Prose, Row, Section, SeverityBadge, Stack, Strong, Subtle, TaskStateBadge } from "@/components/ctas/ui";
import Link from "next/link";
import { LABEL, TONE, fmtDateTime, getContext, getMember, getProject, hrefFor, runsForTask, type AgentRun, type Task } from "@/lib/mock";
import { usePreview, type TaskGroup } from "@/lib/preview-state";
import styles from "./dev.module.css";

const KIND_LABEL: Record<string, string> = { bug: "버그", feature: "신규 기능", change_request: "변경 요청" };
const LINE_LABEL: Record<string, string> = { 어디서: "어디서", 어디에: "어디에", 어디를: "어디를", 재현: "재현 방법", 필요: "무엇이 필요한가", 변경: "무엇을 바꾸나", 결과: "실제 결과", 이유: "왜 필요한가", 단서: "단서", 참고: "참고", 환경: "환경" };

/** 접수 폼이 합쳐 넣은 "어디서: …" 줄을 다시 필드로. 옛 목데이터(자유 문장)는 '상황' 하나로 */
function parseIntake(desc: string): { k: string; v: string }[] {
  const rows = desc.split("\n").map((l) => l.trim()).filter(Boolean);
  const parsed = rows.map((l) => { const m = l.match(/^([^:：]{1,6})[:：]\s*(.+)$/); return m && LINE_LABEL[m[1]] ? { k: LINE_LABEL[m[1]], v: m[2] } : null; });
  return parsed.every(Boolean) && parsed.length > 0 ? (parsed as { k: string; v: string }[]) : [{ k: "상황", v: desc }];
}

export function DevDrawer({ task, group, onClose }: { task: Task; group?: TaskGroup; onClose: () => void }) {
  const { toast } = useToast();
  const { mentionDoc, removeTaskGroup } = usePreview();
  const runs = runsForTask(task.id);
  const latest = runs[runs.length - 1] as AgentRun | undefined;
  const closed = ["done", "verified", "wont_do"].includes(task.state);

  // 단계별 탭 노출
  const hasAnalysis = runs.length > 0;
  const hasFix = runs.some((r) => r.diff || r.fix || r.state === "submitted" || r.state === "approved");
  const hasDeploy = closed || runs.some((r) => r.deploy);
  const stage = hasDeploy ? "종결" : hasFix ? "배포" : hasAnalysis ? "에이전트" : "접수";

  const threadIds = group ? group.taskIds : [task.id];
  const openThread = () => { threadIds.forEach((id) => mentionDoc(id)); onClose(); };
  const project = getProject(task.projectId);
  const intake = parseIntake(task.description);

  return (
    <Drawer
      open
      onOpenChange={(o) => !o && onClose()}
      size="lg"
      title={task.title}
      description={<Row tight><TaskStateBadge state={task.state} /><Badge size="sm" variant="soft" status={task.kind === "bug" ? "destructive" : task.kind === "feature" ? "info" : undefined}>{KIND_LABEL[task.kind] ?? LABEL.taskKind[task.kind]}</Badge><SeverityBadge severity={task.severity} /><Subtle>{project?.name} · 단계: {stage}</Subtle>{task.reopenCount ? <Chip size="sm" variant="soft">재접수 {task.reopenCount}</Chip> : null}{group && <Chip size="sm" variant="soft" leftIcon={<Icon name="stack" size={10} />}>{group.name}</Chip>}</Row>}
      footer={
        <>
          {group && <Button variant="ghost" onClick={() => { removeTaskGroup(group.id); toast({ title: "통합 해제" }); onClose(); }}>통합 해제</Button>}
          <Button variant="ghost" leftIcon={<Icon name="arrow-square-out" />} asChild><Link href={`/projects/${task.projectId}/tasks/${task.id}`}>전체 페이지</Link></Button>
          <Button variant="primary" leftIcon={<Icon name="chat-circle" />} onClick={openThread}>AI 분석{group ? ` (그룹 · ${group.taskIds.length}건)` : ""}</Button>
        </>
      }
    >
      <Tabs defaultValue="intake" variant="underline" size="sm">
        <Tabs.List aria-label="개발 항목">
          <Tabs.Trigger value="intake">접수 내용</Tabs.Trigger>
          {hasAnalysis && <Tabs.Trigger value="analysis">분석</Tabs.Trigger>}
          {hasFix && <Tabs.Trigger value="fix">수정</Tabs.Trigger>}
          {hasDeploy && <Tabs.Trigger value="deploy">배포 결과</Tabs.Trigger>}
        </Tabs.List>

        {/* ── 접수 내용 — 입력한 그대로 ── */}
        <Tabs.Panel value="intake">
          <div className={styles.drawerBody}>
            <KV items={[
              { k: "프로젝트", v: project?.name ?? task.projectId },
              { k: "종류", v: KIND_LABEL[task.kind] ?? LABEL.taskKind[task.kind] },
              { k: "심각도", v: LABEL.severity[task.severity] },
              { k: "우선순위", v: `P${task.priority}` },
              { k: "접수 경로", v: task.reporter === "external" ? "고객 포털" : "내부" },
              { k: "접수일", v: task.createdAt },
              { k: "담당", v: <Row tight><Avatar size="xs" name={getMember(task.ownerId)?.name} />{getMember(task.ownerId)?.name}</Row> },
            ]} />
            <Section title={task.kind === "bug" ? "상황" : "내용"} icon="article">
              <Panel subtle>
                <KV items={intake.map((r) => ({ k: r.k, v: <Prose text={r.v} /> }))} />
              </Panel>
            </Section>
            {task.blockedReason && <Callout tone="destructive" variant="outline" icon="warning" title="차단됨">{task.blockedReason}</Callout>}
            {task.contextIds.length > 0 && (
              <Section title="관련 컨텍스트" icon="path">
                <Row tight>{task.contextIds.map((cid) => { const h = hrefFor(cid); const t = getContext(cid)?.title ?? cid; return h ? <Link key={cid} href={h} style={{ textDecoration: "none" }}><Chip size="sm" variant="outline">{t}</Chip></Link> : <Chip key={cid} size="sm" variant="outline">{t}</Chip>; })}</Row>
              </Section>
            )}
            <Section title="접수 이후" icon="clock">
              <Panel>
                <Stack tight>
                  {task.timeline.map((e, i) => (
                    <Row key={i} tight style={{ flexWrap: "nowrap", alignItems: "flex-start" }}>
                      <Subtle style={{ flexShrink: 0, fontFamily: "var(--font-mono)" }}>{e.at}</Subtle>
                      <Strong>{e.who}</Strong>
                      <span>{e.text}</span>
                    </Row>
                  ))}
                </Stack>
              </Panel>
            </Section>
          </div>
        </Tabs.Panel>

        {/* ── 분석 — 에이전트가 기록 ── */}
        {hasAnalysis && (
          <Tabs.Panel value="analysis">
            <div className={styles.drawerBody}>
              {runs.map((r) => (
                <Section key={r.id} title={`#${r.attempt} 분석`} icon="waveform" hint={`${r.agent} · ${fmtDateTime(r.startedAt)}`}>
                  <Panel>
                    <KV items={[
                      { k: "군집 판정", v: r.analysis?.cluster ?? "—" },
                      { k: "원인", v: r.analysis?.cause ?? "—" },
                      { k: "영향 범위", v: r.analysis?.scope ?? "—" },
                      { k: "리스크", v: r.analysis?.risk ?? "—" },
                      { k: "계획", v: <Prose text={r.plan} /> },
                    ]} />
                  </Panel>
                </Section>
              ))}
            </div>
          </Tabs.Panel>
        )}

        {/* ── 수정 — diff · 테스트 · 검토 ── */}
        {hasFix && (
          <Tabs.Panel value="fix">
            <div className={styles.drawerBody}>
              {runs.filter((r) => r.diff || r.fix || r.state === "submitted" || r.state === "approved" || r.state === "rejected").map((r) => (
                <Section key={r.id} title={`#${r.attempt} 수정`} icon="pencil-simple" hint={LABEL.runState[r.state]}>
                  <Panel>
                    <Row tight><Badge size="sm" variant="soft" status={TONE.runState[r.state]}>{LABEL.runState[r.state]}</Badge><span>{r.summary}</span></Row>
                    {r.diff && <Panel subtle><pre className={styles.diff}>{r.diff}</pre></Panel>}
                    <KV items={[
                      { k: "테스트", v: r.fix?.tests ?? "—" },
                      { k: "검토", v: r.fix?.review ?? "—" },
                    ]} />
                    {r.rejectReason && <Callout tone="destructive" variant="outline" icon="warning-circle" title="반려 사유 — 다음 시도 프롬프트에 포함">{r.rejectReason}</Callout>}
                  </Panel>
                </Section>
              ))}
            </div>
          </Tabs.Panel>
        )}

        {/* ── 배포 결과 ── */}
        {hasDeploy && (
          <Tabs.Panel value="deploy">
            <div className={styles.drawerBody}>
              {latest?.deploy ? (
                <Panel>
                  <KV items={[
                    { k: "배포", v: fmtDateTime(latest.deploy.at) },
                    { k: "환경", v: latest.deploy.env },
                    { k: "검증", v: latest.deploy.verifiedBy },
                    { k: "메모", v: latest.deploy.note },
                  ]} />
                </Panel>
              ) : (
                <Panel>
                  <KV items={[
                    { k: "상태", v: <TaskStateBadge state={task.state} /> },
                    { k: "검증", v: task.timeline.filter((e) => /검증|완료/.test(e.text)).map((e) => `${e.at} ${e.who} — ${e.text}`).join("\n") || "—" },
                    { k: "재접수", v: task.reopenCount ? `${task.reopenCount}회` : "없음" },
                  ]} />
                </Panel>
              )}
              <Subtle>같은 증상이 다시 접수되면 이 항목에 재접수로 쌓이고, 에이전트는 이전 수정 기록을 보고 시작합니다.</Subtle>
            </div>
          </Tabs.Panel>
        )}
      </Tabs>
    </Drawer>
  );
}
