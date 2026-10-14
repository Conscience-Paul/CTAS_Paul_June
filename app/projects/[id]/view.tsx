"use client";

/**
 * 프로젝트 개요 = 운영(Operations) 화면.
 * 단계 트래커 · 단계 게이트 · 마일스톤 · 담당자 · 진행 모니터링 · 리스크 요약.
 */

import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Avatar,
  Badge,
  Button,
  Callout,
  Checkbox,
  EmptyState,
  Icon,
  ListItem,
  MetricCard,
  Stepper,
} from "@/components/ctas/ctds";
import {
  Grid,
  KV,
  MilestoneBadge,
  Muted,
  Page,
  PageHeader,
  Panel,
  Row,
  Section,
  SeverityBadge,
  Split,
  Stack,
  Strong,
  Subtle,
  TaskStateBadge,
  TextLink, List } from "@/components/ctas/ui";
import {
  LABEL,
  STAGES,
  byProject,
  daysUntil,
  fmtDate,
  getCompliance,
  getContext,
  getMember,
  getProject,
  getTask,
  projectCustomer,
} from "@/lib/mock";
import { usePreview } from "@/lib/preview-state";

export default function ProjectOverview() {
  const { id } = useParams<{ id: string }>();
  const project = getProject(id);
  const { askAi, riskStatus } = usePreview();

  if (!project) {
    return (
      <Page>
        <EmptyState icon="empty" title="프로젝트를 찾을 수 없습니다" actions={<Button asChild><Link href="/projects">목록으로</Link></Button>} />
      </Page>
    );
  }

  const customer = projectCustomer(project.id);
  const compliance = customer && getCompliance(customer.complianceProfileId);
  const tasks = byProject.tasks(project.id);
  const milestones = byProject.milestones(project.id);
  const risks = byProject.risks(project.id).filter((r) => (riskStatus[r.id] ?? r.status) === "open");
  const stageIndex = STAGES.findIndex((s) => s.id === project.stage);
  const nextStage = STAGES[stageIndex + 1];

  const done = tasks.filter((t) => t.state === "done" || t.state === "verified").length;
  const blocked = tasks.filter((t) => t.state === "blocked");
  const waitingCustomer = tasks.filter((t) => t.blockedReason?.includes("고객")).length;
  const overdue = tasks.filter((t) => t.due && daysUntil(t.due) < 0 && t.state !== "done" && t.state !== "verified").length;
  const gateDone = project.gate.filter((g) => g.done).length;

  return (
    <Page wide>
      <PageHeader
        eyebrow={<><Badge size="sm" variant="soft">{project.kind}</Badge>{customer?.name} · {customer?.industry}</>}
        title={project.name}
        lead={project.summary}
        actions={
          <>
            <Button size="sm" variant="ghost" leftIcon={<Icon name="warning-circle" />} asChild>
              <Link href={`/projects/${project.id}/risks`}>리스크 {risks.length > 0 ? risks.length : ""}</Link>
            </Button>
            <Button size="sm" variant="ghost" leftIcon={<Icon name="sliders" />} asChild>
              <Link href={`/projects/${project.id}/settings`}>프로젝트 설정</Link>
            </Button>
            <Button size="sm" variant="outline" leftIcon={<Icon name="chat-circle" />} onClick={() => askAi("이번 주 검수 가능한가?")}>
              이번 주 검수 가능한가?
            </Button>
            <Button size="sm" variant="primary" leftIcon={<Icon name="clipboard-text" />} asChild>
              <Link href={`/projects/${project.id}/deliverables`}>주간 보고 생성</Link>
            </Button>
          </>
        }
      />

      {/* 단계 트래커 */}
      <Section title="단계" icon="steps" hint={`${LABEL.stage[project.stage]} 진행 중`}>
        <Panel>
          <Stepper activeIndex={stageIndex} orientation="horizontal" marker="number">
            {STAGES.map((s) => (
              <Stepper.Item key={s.id} title={s.label} hint={s.hint} />
            ))}
          </Stepper>
        </Panel>
      </Section>

      {/* 진행 모니터링 */}
      <Grid cols={4}>
        <MetricCard label="업무 완료" value={`${done} / ${tasks.length}`} icon="check-circle" description={`진행 중 ${tasks.filter((t) => t.state === "in_progress").length}`} />
        <MetricCard label="차단됨" value={blocked.length} icon="warning" description={`고객 응답 대기 ${waitingCustomer}`} trend={blocked.length > 0 ? "up" : "flat"} deltaLabel={blocked.length > 0 ? "이번 주 +2" : "변동 없음"} />
        <MetricCard label="기한 초과" value={overdue} icon="clock" />
        <MetricCard label="열린 리스크" value={risks.length} icon="warning-circle" description={risks.some((r) => r.severity === "critical") ? "치명 1건 포함" : undefined} href={`/projects/${project.id}/risks`} />
      </Grid>

      <Split>
        <Stack style={{ gap: "var(--space-6)" }}>
          {/* 단계 게이트 */}
          <Section
            title={nextStage ? `${nextStage.label} 단계 게이트` : "게이트"}
            icon="seal-check"
            hint={`${gateDone}/${project.gate.length} 충족`}
            actions={<Button size="xs" variant="outline" disabled={gateDone < project.gate.length}>다음 단계로</Button>}
          >
            <Panel>
              <Stack>
                {project.gate.map((g) => {
                  const ev = g.evidenceId ? getContext(g.evidenceId) : undefined;
                  return (
                    <Row key={g.id} style={{ justifyContent: "space-between" }}>
                      <Checkbox checked={g.done} readOnly>{g.label}</Checkbox>
                      {g.evidenceId && (
                        <TextLink href={ev ? `/projects/${project.id}/context/${g.evidenceId}` : `/projects/${project.id}/deliverables/${g.evidenceId}`}>
                          <Subtle>근거 ↗</Subtle>
                        </TextLink>
                      )}
                    </Row>
                  );
                })}
              </Stack>
              {gateDone < project.gate.length && (
                <Callout tone="warning" variant="outline" icon="warning-circle" title={`미충족 ${project.gate.length - gateDone}건`}>
                  Pre-flight 엔진이 단계 게이트로 동작합니다. 미충족 항목은 연결된 업무·리스크에서 해결하세요.
                </Callout>
              )}
            </Panel>
          </Section>

          {/* 마일스톤 */}
          <Section title="마일스톤" icon="calendar-dots">
            <List>
              {milestones.map((m) => {
                const d = daysUntil(m.due);
                const linked = m.taskIds.map(getTask).filter(Boolean);
                const linkedDone = linked.filter((t) => t!.state === "done" || t!.state === "verified").length;
                return (
                  <ListItem
                    key={m.id}
                    variant="activity"
                    layout="stacked"
                    leading={<MilestoneBadge state={m.state} />}
                    from={<Row tight><Strong>{m.title}</Strong></Row>}
                    body={
                      <Row tight>
                        <Subtle>{fmtDate(m.due)} · {getMember(m.ownerId)?.name}</Subtle>
                        {linked.length > 0 && <Subtle>· 연결 업무 {linkedDone}/{linked.length}</Subtle>}
                        {linked.map((t) => (
                          <TaskStateBadge key={t!.id} state={t!.state} />
                        ))}
                      </Row>
                    }
                    meta={m.state === "done" ? "완료" : d < 0 ? `${-d}일 지남` : d === 0 ? "오늘" : `D-${d}`}
                  />
                );
              })}
            </List>
          </Section>

          {/* 리스크 요약 */}
          <Section title="열린 리스크" icon="warning-circle" actions={<Button size="xs" variant="ghost" asChild><Link href={`/projects/${project.id}/risks`}>전체</Link></Button>}>
            <List>
              {risks.length === 0 && <EmptyState size="sm" icon="check-circle" title="열린 리스크 없음" />}
              {risks.slice(0, 4).map((r) => (
                <ListItem
                  key={r.id}
                  href={`/projects/${project.id}/risks`}
                  variant="activity"
                  layout="stacked"
                  leading={<SeverityBadge severity={r.severity} />}
                  from={<Subtle>{LABEL.riskKind[r.kind]}</Subtle>}
                  body={r.title}
                  meta={fmtDate(r.detectedAt)}
                />
              ))}
            </List>
          </Section>
        </Stack>

        <Stack style={{ gap: "var(--space-6)" }}>
          <Section title="담당자" icon="user">
            <Panel>
              <Stack>
                {project.memberIds.map((mid) => {
                  const m = getMember(mid)!;
                  const owned = tasks.filter((t) => t.ownerId === mid);
                  return (
                    <Row key={mid} style={{ justifyContent: "space-between" }}>
                      <Row tight>
                        <Avatar size="sm" name={m.name} />
                        <Stack tight>
                          <Strong>{m.name}{mid === project.pmId && <Subtle> · PM</Subtle>}</Strong>
                          <Subtle>{m.title}</Subtle>
                        </Stack>
                      </Row>
                      <Subtle>업무 {owned.length}</Subtle>
                    </Row>
                  );
                })}
              </Stack>
            </Panel>
          </Section>

          <Section title="계약·정책" icon="identification-card">
            <Panel>
              <KV
                items={[
                  { k: "기간", v: `${project.startDate} – ${project.endDate}` },
                  { k: "유형", v: project.kind === "SI" ? "구축 (SI)" : "유지보수 (SM)" },
                  { k: "컴플라이언스", v: compliance ? <Row tight><span>{compliance.name}</span>{!compliance.allowExternalAI && <Badge size="sm" variant="soft" status="warning">외부 AI 불가</Badge>}</Row> : "—" },
                  { k: "데이터 격리", v: <Muted>Nora {customer?.noraWorkspace}</Muted> },
                  { k: "고객 발송", v: compliance?.requireApprovalForCustomerSend ? "승인 필요" : "자유" },
                ]}
              />
            </Panel>
          </Section>

          <Section title="차단된 업무" icon="warning">
            <List>
              {blocked.length === 0 && <EmptyState size="sm" icon="check-circle" title="없음" />}
              {blocked.map((t) => (
                <ListItem
                  key={t.id}
                  href={`/projects/${project.id}/tasks/${t.id}`}
                  variant="activity"
                  layout="stacked"
                  leading={<Icon name="warning" size={16} />}
                  from={<Strong>{t.title}</Strong>}
                  body={<Subtle>{t.blockedReason}</Subtle>}
                  meta={t.due ? `D${daysUntil(t.due) >= 0 ? "-" : "+"}${Math.abs(daysUntil(t.due))}` : ""}
                />
              ))}
            </List>
          </Section>
        </Stack>
      </Split>
    </Page>
  );
}
