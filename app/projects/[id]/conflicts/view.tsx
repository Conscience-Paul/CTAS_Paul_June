"use client";

/**
 * 충돌 — 중복 업무 · 담당자 겹침 · 요구사항 충돌 · 범위 초과.
 * 접수·분류 시점에 자동 탐지되고, 처리는 병합/경계 명시/supersede/CR 전환 중 하나.
 */

import { useParams } from "next/navigation";
import {
  Badge,
  Button,
  Chip,
  Disclosure,
  EmptyState,
  Icon,
  useToast,
} from "@/components/ctas/ctds";
import {
  Page,
  PageHeader,
  Panel,
  Prose,
  Row,
  Section,
  Stack,
  Strong,
  Subtle,
  TextLink,
} from "@/components/ctas/ui";
import {
  LABEL,
  byProject,
  getContext,
  getProject,
  getTask,
  hrefFor,
  type Conflict,
  type ConflictKind,
} from "@/lib/mock";
import { usePreview } from "@/lib/preview-state";

const KINDS: ConflictKind[] = ["duplicate_task", "owner_overlap", "requirement_conflict", "scope_creep"];

const ACTION: Record<ConflictKind, { label: string; icon: "arrows-down-up" | "split-horizontal" | "arrow-right" | "tag"; toast: string }> = {
  duplicate_task: { label: "병합", icon: "arrows-down-up", toast: "중복 업무를 병합했습니다. 담당자에게 알림이 갑니다." },
  owner_overlap: { label: "경계 명시", icon: "split-horizontal", toast: "두 업무의 범위 설명에 경계를 기록했습니다." },
  requirement_conflict: { label: "supersede (v+1)", icon: "arrow-right", toast: "요구사항 v+1 이 생성되고 이전 버전은 supersede 됩니다 (프리뷰)." },
  scope_creep: { label: "CR 전환", icon: "tag", toast: "변경 요청(CR) 안내서 초안이 산출물에 추가됩니다." },
};

export default function ConflictsPage() {
  const { id } = useParams<{ id: string }>();
  const project = getProject(id);
  const { toast } = useToast();
  const { resolvedConflicts, resolveConflict } = usePreview();

  if (!project) return null;

  const all = byProject.conflicts(project.id).map((c) => ({ ...c, resolved: resolvedConflicts[c.id] || c.resolved }));
  const open = all.filter((c) => !c.resolved);
  const resolved = all.filter((c) => c.resolved);

  const partyLabel = (p: Conflict["parties"][number]) =>
    p.type === "task" ? getTask(p.id)?.title : getContext(p.id)?.title;

  const card = (c: Conflict & { resolved: boolean }) => (
    <Panel key={c.id}>
      <Row style={{ justifyContent: "space-between" }}>
        <Row tight>
          <Chip size="sm" variant="outline">{LABEL.conflictKind[c.kind]}</Chip>
          {c.resolved && <Badge size="sm" variant="soft" status="success">해결됨</Badge>}
        </Row>
      </Row>
      <Strong style={{ fontSize: "var(--text-base)" }}>{c.title}</Strong>
      <Prose text={c.detail} />
      <Stack tight>
        <Subtle>당사자</Subtle>
        <Row tight>
          {c.parties.map((p) => {
            const href = hrefFor(p.id, project.id);
            const label = partyLabel(p) ?? p.id;
            return href ? (
              <TextLink key={p.id} href={href}>
                <Chip size="sm" variant="outline" leftIcon={<Icon name={p.type === "task" ? "list" : "article"} size={10} />}>{label}</Chip>
              </TextLink>
            ) : (
              <Chip key={p.id} size="sm" variant="outline">{label}</Chip>
            );
          })}
        </Row>
      </Stack>
      <Panel subtle>
        <Row tight>
          <Icon name="waveform" size={14} />
          <Strong>제안</Strong>
        </Row>
        <Prose text={c.suggestion} />
      </Panel>
      {!c.resolved && (
        <Row>
          <Button size="sm" variant="primary" leftIcon={<Icon name={ACTION[c.kind].icon} />} onClick={() => { resolveConflict(c.id); toast({ title: ACTION[c.kind].label, description: ACTION[c.kind].toast, tone: "success" }); }}>
            {ACTION[c.kind].label}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => { resolveConflict(c.id); toast({ title: "충돌 아님으로 처리", description: "판정 결과는 군집 모델 학습에 반영됩니다 (프리뷰)." }); }}>
            충돌 아님
          </Button>
        </Row>
      )}
    </Panel>
  );

  return (
    <Page wide>
      <PageHeader
        eyebrow={project.name}
        title="충돌"
        lead="업무 중복·담당자 겹침은 접수 시 dedupKey와 군집 판정으로, 요구사항 충돌은 링크 그래프의 conflicts_with 에서 탐지합니다."
      />

      {open.length === 0 && (
        <Panel>
          <EmptyState size="sm" icon="check-circle" title="열린 충돌 없음" />
        </Panel>
      )}

      {KINDS.map((k) => {
        const items = open.filter((c) => c.kind === k);
        if (items.length === 0) return null;
        return (
          <Section key={k} title={LABEL.conflictKind[k]} icon="split-horizontal" hint={`${items.length}건`}>
            <Stack style={{ gap: "var(--space-4)" }}>{items.map(card)}</Stack>
          </Section>
        );
      })}

      {resolved.length > 0 && (
        <Disclosure>
          <Disclosure.Trigger>해결됨 ({resolved.length})</Disclosure.Trigger>
          <Disclosure.Body>
            <Stack style={{ gap: "var(--space-4)", paddingTop: "var(--space-3)" }}>{resolved.map(card)}</Stack>
          </Disclosure.Body>
        </Disclosure>
      )}
    </Page>
  );
}
