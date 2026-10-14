"use client";

/**
 * 리스크 — 감지된 리스크와 AI 조율 제안. 고객 발송은 승인(customer_send)을 거친다.
 */

import { useParams } from "next/navigation";
import { useState } from "react";
import {
  Button,
  Chip,
  Disclosure,
  EmptyState,
  FilterButton,
  Icon,
  MetricCard,
  useToast,
} from "@/components/ctas/ctds";
import {
  Grid,
  Page,
  PageHeader,
  Panel,
  Prose,
  Row,
  SeverityBadge,
  Stack,
  Strong,
  Subtle,
  TextLink,
} from "@/components/ctas/ui";
import {
  LABEL,
  byProject,
  fmtDateTime,
  getContext,
  getMilestone,
  getProject,
  getTask,
  hrefFor,
  type Risk,
} from "@/lib/mock";
import { usePreview } from "@/lib/preview-state";

type Status = Risk["status"];
const STATUSES: Status[] = ["open", "acknowledged", "resolved", "dismissed"];
const ORDER = ["critical", "high", "medium", "low"];

export default function RisksPage() {
  const { id } = useParams<{ id: string }>();
  const project = getProject(id);
  const { toast } = useToast();
  const { riskStatus, setRiskStatus, askAi } = usePreview();
  const [filter, setFilter] = useState<Status[]>(["open"]);

  if (!project) return null;

  const all = byProject.risks(project.id).map((r) => ({ ...r, status: riskStatus[r.id] ?? r.status }));
  const open = all.filter((r) => r.status === "open");
  const visible = all
    .filter((r) => filter.length === 0 || filter.includes(r.status))
    .sort((a, b) => ORDER.indexOf(a.severity) - ORDER.indexOf(b.severity));

  const toggle = (s: Status) => setFilter((f) => (f.includes(s) ? f.filter((x) => x !== s) : [...f, s]));

  const evidenceLabel = (e: Risk["evidence"][number]) =>
    e.type === "context" ? getContext(e.id)?.title : e.type === "task" ? getTask(e.id)?.title : getMilestone(e.id)?.title;

  return (
    <Page wide>
      <PageHeader
        eyebrow={project.name}
        title="리스크"
        lead="축적된 컨텍스트에서 자동 감지. 각 리스크는 근거와 AI 조율 제안을 가집니다."
        actions={
          <Button size="sm" variant="outline" leftIcon={<Icon name="chat-circle" />} onClick={() => askAi("리스크 우선순위 정리")}>
            우선순위 정리
          </Button>
        }
      />

      <Grid cols={3}>
        <MetricCard label="치명" value={open.filter((r) => r.severity === "critical").length} icon="warning-circle" description="열린 것" />
        <MetricCard label="높음" value={open.filter((r) => r.severity === "high").length} icon="warning" description="열린 것" />
        <MetricCard label="보통 · 낮음" value={open.filter((r) => r.severity === "medium" || r.severity === "low").length} icon="info" description="열린 것" />
      </Grid>

      <Row>
        {STATUSES.map((s) => (
          <FilterButton key={s} size="sm" selected={filter.includes(s)} onToggle={() => toggle(s)} count={all.filter((r) => r.status === s).length}>
            {LABEL.riskStatus[s]}
          </FilterButton>
        ))}
      </Row>

      {visible.length === 0 && (
        <Panel>
          <EmptyState size="sm" icon="check-circle" title="해당하는 리스크 없음" />
        </Panel>
      )}

      <Stack style={{ gap: "var(--space-4)" }}>
        {visible.map((r) => (
          <Panel key={r.id}>
            <Row style={{ justifyContent: "space-between" }}>
              <Row tight>
                <SeverityBadge severity={r.severity} />
                <Chip size="sm" variant="outline">{LABEL.riskKind[r.kind]}</Chip>
                <Chip size="sm" variant="soft">{LABEL.riskStatus[r.status]}</Chip>
              </Row>
              <Subtle>{fmtDateTime(r.detectedAt)} 감지</Subtle>
            </Row>
            <Strong style={{ fontSize: "var(--text-base)" }}>{r.title}</Strong>
            <Prose text={r.detail} />

            <Stack tight>
              <Subtle>근거</Subtle>
              <Row tight>
                {r.evidence.map((e) => {
                  const href = hrefFor(e.id, project.id);
                  const label = evidenceLabel(e) ?? e.id;
                  return href ? (
                    <TextLink key={e.id} href={href}>
                      <Chip size="sm" variant="outline" leftIcon={<Icon name="arrow-square-out" size={10} />}>{label}</Chip>
                    </TextLink>
                  ) : (
                    <Chip key={e.id} size="sm" variant="outline">{label}</Chip>
                  );
                })}
              </Row>
            </Stack>

            <Panel subtle>
              <Row tight>
                <Icon name="waveform" size={14} />
                <Strong>AI 제안 — {r.suggestion.title}</Strong>
              </Row>
              <Prose text={r.suggestion.body} />
              {r.suggestion.draft && (
                <Disclosure>
                  <Disclosure.Trigger>초안 보기</Disclosure.Trigger>
                  <Disclosure.Body>
                    <Panel>
                      <Prose text={r.suggestion.draft} />
                    </Panel>
                  </Disclosure.Body>
                </Disclosure>
              )}
            </Panel>

            {r.status !== "resolved" && r.status !== "dismissed" && (
              <Row>
                {r.suggestion.draft && (
                  <Button size="sm" variant="primary" leftIcon={<Icon name="envelope" />} onClick={() => toast({ title: "승인 큐에 추가됨", description: "customer_send 승인이 생성됐습니다. 승인 후 발송됩니다.", tone: "success" })}>
                    고객에게 보내기 (승인 필요)
                  </Button>
                )}
                {(r.kind === "schedule_delay" || r.kind === "no_response") && (
                  <Button size="sm" variant="outline" leftIcon={<Icon name="calendar" />} onClick={() => toast({ title: "일정 조정 제안", description: "마일스톤 조정안이 운영 화면에 반영됩니다 (프리뷰)." })}>
                    일정 조정
                  </Button>
                )}
                {r.status === "open" && (
                  <Button size="sm" variant="ghost" leftIcon={<Icon name="check" />} onClick={() => setRiskStatus(r.id, "acknowledged")}>
                    확인
                  </Button>
                )}
                <Button size="sm" variant="ghost" onClick={() => { setRiskStatus(r.id, "dismissed"); toast({ title: "무시됨", description: "사유는 감사 로그에 남습니다 (프리뷰)." }); }}>
                  무시
                </Button>
              </Row>
            )}
          </Panel>
        ))}
      </Stack>
    </Page>
  );
}
