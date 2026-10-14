"use client";

/**
 * 승인 대기 — 전 프로젝트 승인 큐. 종류: 분류 / 사전 점검 / 결과 / 고객 발송.
 * 사람이 결정하는 지점은 이 네 곳으로 고정 (orbit 모델).
 */

import { useState } from "react";
import {
  Badge,
  Button,
  Icon,
  Modal,
  Tabs,
  Textarea,
  EmptyState,
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
  approvals,
  fmtDateTime,
  getProject,
  hrefFor,
  type Approval,
  type ApprovalKind,
} from "@/lib/mock";
import { usePreview } from "@/lib/preview-state";

const KINDS: ApprovalKind[] = ["triage", "preflight", "result", "customer_send"];
const KIND_ICON: Record<ApprovalKind, "tag" | "steps" | "seal-check" | "envelope"> = {
  triage: "tag",
  preflight: "steps",
  result: "seal-check",
  customer_send: "envelope",
};

export default function ApprovalsPage() {
  const { toast } = useToast();
  const { approvalDecisions, decideApproval } = usePreview();
  const [tab, setTab] = useState("all");
  const [rejecting, setRejecting] = useState<Approval | null>(null);
  const [reason, setReason] = useState("");

  const all = approvals.map((a) => ({ ...a, state: approvalDecisions[a.id] ?? a.state }));
  const filtered = tab === "all" ? all : all.filter((a) => a.kind === tab);
  const pending = filtered.filter((a) => a.state === "pending");
  const done = filtered.filter((a) => a.state !== "pending");

  const submitReject = () => {
    if (!rejecting) return;
    decideApproval(rejecting.id, "rejected");
    toast({ title: "반려됨", description: reason ? `사유: ${reason}` : "사유 없이 반려", tone: "warning" });
    setRejecting(null);
    setReason("");
  };

  const card = (a: Approval) => {
    const href = hrefFor(a.ref.id, a.projectId);
    return (
      <Panel key={a.id}>
        <Row style={{ justifyContent: "space-between" }}>
          <Row tight>
            <Icon name={KIND_ICON[a.kind]} size={14} />
            <Badge size="sm" variant="soft" status={a.kind === "customer_send" ? "warning" : a.kind === "result" ? "info" : undefined}>{LABEL.approvalKind[a.kind]}</Badge>
            <Subtle>{getProject(a.projectId)?.name}</Subtle>
          </Row>
          {a.state !== "pending" && (
            <Badge size="sm" variant="soft" status={a.state === "approved" ? "success" : "destructive"}>{a.state === "approved" ? "승인됨" : "반려됨"}</Badge>
          )}
        </Row>
        <Strong style={{ fontSize: "var(--text-base)" }}>{a.title}</Strong>
        <Subtle>{a.requestedBy} · {fmtDateTime(a.requestedAt)}</Subtle>
        <Prose text={a.message} />
        <Row style={{ justifyContent: "space-between" }}>
          {href ? <TextLink href={href}><Subtle>근거 열기 ↗</Subtle></TextLink> : <span />}
          {a.state === "pending" && (
            <Row tight>
              <Button size="sm" variant="primary" leftIcon={<Icon name="check" />} onClick={() => { decideApproval(a.id, "approved"); toast({ title: "승인됨", description: a.kind === "customer_send" ? "고객에게 발송됩니다 (프리뷰)." : "다음 단계로 진행합니다.", tone: "success" }); }}>
                승인
              </Button>
              <Button size="sm" variant="outline" onClick={() => setRejecting(a)}>
                반려
              </Button>
            </Row>
          )}
        </Row>
      </Panel>
    );
  };

  return (
    <Page>
      <PageHeader
        title="승인 대기"
        lead="에이전트는 '했다'까지. 승인은 사람이 합니다. 반려 사유는 다음 시도의 프롬프트에 들어갑니다."
      />

      <Tabs value={tab} onValueChange={setTab} variant="underline" size="md">
        <Tabs.List aria-label="승인 종류">
          <Tabs.Trigger value="all">전체 ({all.filter((a) => a.state === "pending").length})</Tabs.Trigger>
          {KINDS.map((k) => (
            <Tabs.Trigger key={k} value={k} leadingIcon={<Icon name={KIND_ICON[k]} />}>
              {LABEL.approvalKind[k]} ({all.filter((a) => a.kind === k && a.state === "pending").length})
            </Tabs.Trigger>
          ))}
        </Tabs.List>
      </Tabs>

      <Stack style={{ gap: "var(--space-4)" }}>
        {pending.length === 0 && (
          <Panel>
            <EmptyState size="sm" icon="check-circle" title="대기 중인 승인 없음" />
          </Panel>
        )}
        {pending.map(card)}
      </Stack>

      {done.length > 0 && (
        <Section title="처리됨" icon="check-circle" hint={`${done.length}건`}>
          <Stack style={{ gap: "var(--space-4)" }}>{done.map(card)}</Stack>
        </Section>
      )}

      <Modal
        open={rejecting !== null}
        onOpenChange={(o) => { if (!o) { setRejecting(null); setReason(""); } }}
        title="반려 사유"
        description={rejecting?.title}
        footer={
          <>
            <Button size="sm" variant="ghost" onClick={() => { setRejecting(null); setReason(""); }}>취소</Button>
            <Button size="sm" variant="destructive" onClick={submitReject}>반려</Button>
          </>
        }
      >
        <Textarea
          label="사유"
          description="다음 시도의 프롬프트에 그대로 포함됩니다."
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={4}
          placeholder="예: 대리 승인 시 원 승인자 알림 누락"
        />
      </Modal>
    </Page>
  );
}
