"use client";

/**
 * 프로젝트 개요 = 운영(Operations) 화면. "이 프로젝트 괜찮나? 내가 뭘 해야 하나?"에만 답한다.
 *   상태 한 줄  — 단계(+ 다음 단계 게이트, 펼치기) · 다음 마일스톤 1건
 *   지금 처리할 것 — 막힌 업무(한 건씩) + 승인 대기를 승인 종류별 한 줄로(리스크 대응 포함). 급한 순, 누르면 서랍
 *   요약 한 줄  — 업무 진행 숫자 + 업무·타임라인 바로가기
 *   프로젝트 정보 — 담당자 · 계약·정책 (맨 아래, 항상)
 */

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { Avatar, Badge, Button, Drawer, DropdownMenu, EmptyState, Icon, IconButton, type IconName } from "@/components/ctas/ctds";
import { KV, MilestoneBadge, Muted, Page, Panel, Row, SeverityBadge, Stack, Strong, Subtle } from "@/components/ctas/ui";
import { TaskDrawer } from "@/app/projects/[id]/tasks/_drawer";
import { useAllApprovals } from "@/components/ctas/useApprovals";
import {
  APPROVAL_ICON,
  LABEL,
  STAGES,
  byProject,
  daysUntil,
  fmtDate,
  getCompliance,
  getMember,
  getProject,
  getRisk,
  projectCustomer,
  type Approval,
  type ApprovalKind,
  type Task,
} from "@/lib/mock";
import { usePreview } from "@/lib/preview-state";
import styles from "./overview.module.css";

/** 지금 처리할 것 한 줄 — 누르면 서랍 */
interface Act {
  key: string;
  /** 작을수록 급함 */
  rank: number;
  /** 왼쪽 칸 — 막힌 업무 또는 승인 종류 */
  label: string;
  icon: IconName;
  tone: "danger" | "primary" | "muted";
  lead?: React.ReactNode;
  title: string;
  sub?: string;
  meta?: string;
  open: () => void;
}

/** 승인 종류별 급한 정도 — 작을수록 위 */
const KIND_RANK: Partial<Record<ApprovalKind, number>> = { dev_release: 2, schedule: 2, risk: 2, dev_result: 3, customer_send: 3, knowledge_conflict: 3, scope: 3, triage: 3, dev_start: 3, knowledge_confirm: 4, doc_publish: 4 };

const dday = (iso: string) => { const d = daysUntil(iso); return d === 0 ? "오늘" : d > 0 ? `D-${d}` : `${-d}일 지남`; };

export default function ProjectOverview() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const project = getProject(id);
  const { askAi } = usePreview();
  const { pending } = useAllApprovals();
  const [gateOpen, setGateOpen] = useState(false);
  const [openTask, setOpenTask] = useState<Task | null>(null);
  const [openKind, setOpenKind] = useState<ApprovalKind | null>(null);

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
  const stageIndex = STAGES.findIndex((s) => s.id === project.stage);
  const nextStage = STAGES[stageIndex + 1];
  const gateDone = project.gate.filter((g) => g.done).length;

  const done = tasks.filter((t) => t.state === "done" || t.state === "verified").length;
  const inProgress = tasks.filter((t) => t.state === "in_progress").length;
  const blocked = tasks.filter((t) => t.state === "blocked");
  const overdue = tasks.filter((t) => t.due && daysUntil(t.due) < 0 && t.state !== "done" && t.state !== "verified").length;

  // 다음 마일스톤 1건 — 아직 안 끝난 것 중 가장 이른 기한
  const nextMs = byProject.milestones(project.id).filter((m) => m.state !== "done").sort((a, b) => a.due.localeCompare(b.due))[0];

  // 지금 처리할 것 — 막힌 업무 + 이 프로젝트의 승인 대기(리스크 대응 포함)를 승인 종류별로.
  //   막힌 업무는 한 건씩, 승인은 종류마다 한 줄(1건이면 그 제목). 누르면 서랍.
  //   급한 순: 치명 리스크 → 막힌 업무 → 운영 배포·일정 변경·리스크 → 그 밖의 승인 → 문서
  const myApprovals = pending.filter((a) => a.projectId === project.id);
  const byKind = new Map<ApprovalKind, Approval[]>();
  myApprovals.forEach((a) => byKind.set(a.kind, [...(byKind.get(a.kind) ?? []), a]));
  const sevOf = (a: Approval) => (a.ref.type === "risk" ? getRisk(a.ref.id)?.severity : undefined);

  const acts: Act[] = [
    ...blocked.map((t): Act => ({
      key: t.id, rank: 1, label: "막힌 업무", icon: "warning", tone: "danger",
      title: t.title, sub: t.blockedReason ? `막힌 이유 — ${t.blockedReason}` : undefined, meta: t.due ? dday(t.due) : undefined,
      open: () => setOpenTask(t),
    })),
    ...[...byKind.entries()].map(([kind, items]): Act => {
      const critical = items.some((a) => sevOf(a) === "critical");
      const top = items.find((a) => sevOf(a) === "critical") ?? items[0];
      return {
        key: kind,
        rank: critical ? 0 : KIND_RANK[kind] ?? 3,
        label: LABEL.approvalKind[kind],
        icon: APPROVAL_ICON[kind],
        tone: kind === "risk" ? "danger" : "primary",
        lead: sevOf(top) ? <SeverityBadge severity={sevOf(top)!} /> : undefined,
        title: items.length === 1 ? top.title : `${top.title} 외 ${items.length - 1}건`,
        sub: items.length === 1 ? top.message : `${LABEL.approvalKind[kind]} ${items.length}건 대기`,
        meta: fmtDate(top.requestedAt),
        open: () => setOpenKind(kind),
      };
    }),
  ].sort((a, b) => a.rank - b.rank);
  const kindItems = openKind ? byKind.get(openKind) ?? [] : [];

  return (
    <Page wide>
      {/* 헤더 — 제목 + 고객·유형·기간은 작게. 버튼은 주간 보고 하나, 나머지는 ⋯ */}
      <header className={styles.head}>
        <div className={styles.titleBlock}>
          <h1 className={styles.title}>{project.name}</h1>
          <span className={styles.meta}>
            <Badge size="sm" variant="soft">{project.kind}</Badge>
            {customer?.name} · {project.startDate} – {project.endDate}
          </span>
        </div>
        <div className={styles.headActions}>
          <Button size="sm" variant="primary" leftIcon={<Icon name="clipboard-text" />} asChild>
            <Link href={`/projects/${project.id}/deliverables`}>주간 보고 생성</Link>
          </Button>
          <DropdownMenu>
            <DropdownMenu.Trigger asChild>
              <IconButton size="sm" variant="ghost" icon={<Icon name="dots-three" />} aria-label="더보기" />
            </DropdownMenu.Trigger>
            <DropdownMenu.Content align="end">
              <DropdownMenu.Item leadingActions={[<Icon key="a" name="chat-circle" />]} onSelect={() => askAi("이번 주 검수 가능한가?")}>AI에게 — 이번 주 검수 가능한가?</DropdownMenu.Item>
              <DropdownMenu.Item leadingActions={[<Icon key="s" name="sliders" />]} onSelect={() => router.push(`/projects/${project.id}/settings`)}>프로젝트 설정</DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu>
        </div>
      </header>

      {/* 상태 한 줄 — 단계(+ 게이트 펼치기) · 다음 마일스톤 */}
      <Panel>
        <div className={styles.statusRow}>
          <div className={styles.stages} aria-label="단계">
            {STAGES.map((s, i) => (
              <span key={s.id} className={styles.stage} data-state={i < stageIndex ? "past" : i === stageIndex ? "current" : "future"} title={s.hint}>
                {i < stageIndex && <Icon name="check" size={10} />}
                {s.label}
              </span>
            ))}
            {nextStage && (
              <button type="button" className={styles.gateBtn} aria-expanded={gateOpen} onClick={() => setGateOpen((o) => !o)}>
                {nextStage.label} 게이트 <strong>{gateDone}/{project.gate.length}</strong>
                <Icon name={gateOpen ? "caret-up" : "caret-down"} size={12} />
              </button>
            )}
          </div>
          {nextMs && (
            <Link href="/ops/milestones" className={styles.nextMs} title="운영 › 타임라인에서 보기">
              <Subtle>다음 마일스톤</Subtle>
              <MilestoneBadge state={nextMs.state} />
              <Strong>{nextMs.title}</Strong>
              <Subtle>{fmtDate(nextMs.due)} ({dday(nextMs.due)})</Subtle>
              <Icon name="caret-right" size={12} />
            </Link>
          )}
        </div>
        {gateOpen && (
          <ul className={styles.gateList}>
            {project.gate.map((g) => (
              <li key={g.id} data-done={g.done || undefined}>
                <Icon name={g.done ? "check-circle" : "square"} size={14} />
                {g.label}
              </li>
            ))}
          </ul>
        )}
      </Panel>

      {/* 지금 처리할 것 */}
      <section className={styles.section}>
        <h2 className={styles.h2}>지금 처리할 것 <span className={styles.count}>{acts.length}</span></h2>
        <Panel flush>
          {acts.length === 0 ? (
            <EmptyState size="sm" icon="check-circle" title="처리할 것이 없습니다" />
          ) : (
            <ul className={styles.acts}>
              {acts.map((a) => (
                <li key={a.key}>
                  <button type="button" className={styles.act} data-tone={a.tone} onClick={a.open}>
                    <span className={styles.actKind}><Icon name={a.icon} size={12} />{a.label}</span>
                    {a.lead && <span className={styles.actLead}>{a.lead}</span>}
                    <span className={styles.actText}>
                      <span className={styles.actTitle}>{a.title}</span>
                      {a.sub && <span className={styles.actSub}>{a.sub}</span>}
                    </span>
                    {a.meta && <span className={styles.actMeta}>{a.meta}</span>}
                    <Icon name="caret-right" size={14} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </section>

      {/* 요약 한 줄 + 바로가기 */}
      <div className={styles.summary}>
        <span>
          업무 <strong>{tasks.length}</strong>건 중 완료 <strong>{done}</strong> · 진행 <strong>{inProgress}</strong> · 차단 <strong data-warn={blocked.length > 0 || undefined}>{blocked.length}</strong> · 기한 초과 <strong data-warn={overdue > 0 || undefined}>{overdue}</strong>
        </span>
        <span className={styles.links}>
          <Link href={`/projects/${project.id}/tasks`}>업무 →</Link>
          <Link href="/ops/milestones">타임라인 →</Link>        </span>
      </div>

      {/* 프로젝트 정보 — 맨 아래에 항상 */}
      <section className={styles.section}>
        <h2 className={styles.h2}>프로젝트 정보</h2>
          <div className={styles.info}>
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
          </div>
      </section>

      {openTask && <TaskDrawer task={openTask} onClose={() => setOpenTask(null)} />}

      {/* 승인 종류 서랍 — 이 프로젝트의 그 종류 승인 대기 목록. 하나씩 승인 목록에서 연다 */}
      {openKind && (
        <Drawer
          open
          onOpenChange={(o) => !o && setOpenKind(null)}
          size="md"
          title={`${LABEL.approvalKind[openKind]} ${kindItems.length}건`}
          description={<Subtle>{project.name} · 승인 대기</Subtle>}
          footer={
            <Button variant="outline" rightIcon={<Icon name="arrow-right" />} asChild>
              <Link href="/approvals">승인 목록에서 모두 보기</Link>
            </Button>
          }
        >
          <ul className={styles.kindList}>
            {kindItems.map((a) => (
              <li key={a.id}>
                <Link href={`/approvals?open=${encodeURIComponent(a.id)}`} className={styles.kindItem}>
                  <span className={styles.kindItemHead}>
                    {sevOf(a) && <SeverityBadge severity={sevOf(a)!} />}
                    <strong>{a.title}</strong>
                  </span>
                  <span className={styles.actSub}>{a.message}</span>
                  <span className={styles.kindItemMeta}>{a.requestedBy} · {fmtDate(a.requestedAt)} <span>열기 →</span></span>
                </Link>
              </li>
            ))}
          </ul>
        </Drawer>
      )}
    </Page>
  );
}
