"use client";

/**
 * 승인 대기 — 전 프로젝트 승인 큐. 종류: 분류 / 사전 점검 / 결과 / 고객 발송.
 * 얇은 리스트 + 행 클릭 → Drawer. Drawer 안에서 ⌘→ / ⌘← 로 다음·이전 항목.
 */

import { useCallback, useEffect, useState } from "react";
import { Badge, Button, Callout, Drawer, Icon, IconButton, TableHeader, TableRow, Textarea, useToast } from "@/components/ctas/ctds";
import { KV, Page, PageHeader, Panel, Prose, Row, Section, Subtle, TableBox, TaskStateBadge } from "@/components/ctas/ui";
import { CountFilter } from "@/app/dev/_shared";
import {
  LABEL,
  TONE,
  approvals,
  fmtDateTime,
  getDeliverable,
  getProject,
  getRisk,
  getRun,
  getTask,
  hrefFor,
  type Approval,
  type ApprovalKind,
  type ApprovalState,
} from "@/lib/mock";
import { usePreview } from "@/lib/preview-state";
import styles from "./approvals.module.css";

const KIND_ICON = { triage: "tag", preflight: "steps", result: "seal-check", customer_send: "envelope" } as const;
const STATE_TONE: Record<ApprovalState, "warning" | "success" | "destructive"> = { pending: "warning", approved: "success", rejected: "destructive" };
const STATE_LABEL: Record<ApprovalState, string> = { pending: "대기", approved: "승인", rejected: "반려" };

const columns = [
  { key: "state", label: "상태", width: 80 },
  { key: "kind", label: "종류", width: 100 },
  { key: "title", label: "제목", flex: true, minWidth: 320 },
  { key: "project", label: "프로젝트", width: 180 },
  { key: "by", label: "요청", width: 160 },
  { key: "at", label: "요청 시각", width: 110 },
];

export default function ApprovalsPage() {
  const { approvalDecisions } = usePreview();
  const stateOf = (a: Approval) => approvalDecisions[a.id] ?? a.state;
  const [kind, setKind] = useState<ApprovalKind[]>([]);
  const [state, setState] = useState<ApprovalState[]>(["pending"]);
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  const base = approvals.filter((a) => kind.length === 0 || kind.includes(a.kind));
  const list = base.filter((a) => state.length === 0 || state.includes(stateOf(a))).sort((a, b) => b.requestedAt.localeCompare(a.requestedAt));
  const count = (k: ApprovalKind) => base.filter((a) => a.kind === k && (state.length === 0 || state.includes(stateOf(a)))).length;

  return (
    <Page wide>
      <PageHeader title="승인 목록" lead="사람이 결정하는 네 지점 — 분류 · 사전 점검 · 결과 · 고객 발송. 열어서 근거를 보고 승인하거나 반려합니다." />
      <div className={styles.filters}>
        <CountFilter<ApprovalState>
          value={state}
          onChange={setState}
          options={[
            { id: "pending", label: "대기", count: base.filter((a) => stateOf(a) === "pending").length },
            { id: "approved", label: "승인", count: base.filter((a) => stateOf(a) === "approved").length },
            { id: "rejected", label: "반려", count: base.filter((a) => stateOf(a) === "rejected").length },
          ]}
        />
        <span className={styles.vsep} />
        <CountFilter<ApprovalKind>
          value={kind}
          onChange={setKind}
          options={(Object.keys(LABEL.approvalKind) as ApprovalKind[]).map((k) => ({ id: k, label: LABEL.approvalKind[k], count: count(k) }))}
        />
      </div>

      <TableBox>
        <TableHeader columns={columns} variant="line" />
        {list.map((a, i) => (
          <TableRow<Approval> key={a.id} variant="line" data={a} onClick={() => setOpenIdx(i)} columns={columns.map((c) => ({ ...c, render: (d: Approval) => cell(c.key, d, stateOf(d)) }))} />
        ))}
      </TableBox>
      {list.length === 0 && <Subtle>조건에 맞는 항목이 없습니다.</Subtle>}

      {openIdx !== null && list[openIdx] && (
        <ApprovalDrawer
          approval={list[openIdx]}
          index={openIdx}
          total={list.length}
          onMove={(d) => setOpenIdx((i) => (i === null ? null : Math.min(list.length - 1, Math.max(0, i + d))))}
          onClose={() => setOpenIdx(null)}
        />
      )}
    </Page>
  );
}

function cell(key: string, a: Approval, s: ApprovalState) {
  switch (key) {
    case "state": return <Badge size="sm" variant="soft" status={STATE_TONE[s]}>{STATE_LABEL[s]}</Badge>;
    case "kind": return <Row tight><Icon name={KIND_ICON[a.kind]} size={14} /><span>{LABEL.approvalKind[a.kind]}</span></Row>;
    case "title": return <span className={styles.ellipsis}>{a.title}</span>;
    case "project": return <Subtle>{getProject(a.projectId)?.name}</Subtle>;
    case "by": return <Subtle>{a.requestedBy}</Subtle>;
    case "at": return <Subtle>{fmtDateTime(a.requestedAt)}</Subtle>;
  }
}

/* ── Drawer: 근거 + 승인/반려 + ⌘←/⌘→ ─────────── */
function ApprovalDrawer({ approval: a, index, total, onMove, onClose }: { approval: Approval; index: number; total: number; onMove: (d: 1 | -1) => void; onClose: () => void }) {
  const { toast } = useToast();
  const { approvalDecisions, decideApproval } = usePreview();
  const state = approvalDecisions[a.id] ?? a.state;
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");

  // ⌘→ 다음 · ⌘← 이전 (Drawer 열린 동안)
  const onKey = useCallback((e: KeyboardEvent) => {
    if (!(e.metaKey || e.ctrlKey)) return;
    if (e.key === "ArrowRight") { e.preventDefault(); onMove(1); }
    if (e.key === "ArrowLeft") { e.preventDefault(); onMove(-1); }
  }, [onMove]);
  useEffect(() => {
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onKey]);

  const approve = () => {
    decideApproval(a.id, "approved");
    toast({ title: "승인됨", description: a.kind === "customer_send" ? "고객에게 발송됩니다 (프리뷰)." : "다음 단계로 진행합니다.", tone: "success" });
    if (index < total - 1) onMove(1); else onClose();
  };
  const reject = () => {
    decideApproval(a.id, "rejected");
    toast({ title: "반려됨", description: reason ? `사유: ${reason}` : "사유 없이 반려", tone: "warning" });
    setRejecting(false);
    setReason("");
    if (index < total - 1) onMove(1); else onClose();
  };

  const refHref = hrefFor(a.ref.id);

  return (
    <Drawer
      open
      onOpenChange={(o) => !o && onClose()}
      size="lg"
      title={a.title}
      description={<Row tight><Badge size="sm" variant="soft">{LABEL.approvalKind[a.kind]}</Badge><Badge size="sm" variant="soft" status={STATE_TONE[state]}>{STATE_LABEL[state]}</Badge><Subtle>{getProject(a.projectId)?.name} · {a.requestedBy} · {fmtDateTime(a.requestedAt)}</Subtle></Row>}
      footer={
        <>
          <div className={styles.nav}>
            <IconButton size="sm" variant="ghost" icon={<Icon name="caret-left" />} aria-label="이전 항목 (⌘←)" disabled={index === 0} onClick={() => onMove(-1)} />
            <span className={styles.navPos}>{index + 1} / {total}</span>
            <IconButton size="sm" variant="ghost" icon={<Icon name="caret-right" />} aria-label="다음 항목 (⌘→)" disabled={index >= total - 1} onClick={() => onMove(1)} />
            <span className={styles.kbd}>⌘←</span><span className={styles.kbd}>⌘→</span>
          </div>
          {state === "pending" ? (
            rejecting ? (
              <>
                <Button variant="ghost" onClick={() => setRejecting(false)}>취소</Button>
                <Button variant="destructive" leftIcon={<Icon name="x" />} onClick={reject}>반려 확정</Button>
              </>
            ) : (
              <>
                <Button variant="outline" leftIcon={<Icon name="x" />} onClick={() => setRejecting(true)}>반려</Button>
                <Button variant="primary" leftIcon={<Icon name="check" />} onClick={approve}>승인</Button>
              </>
            )
          ) : (
            <Subtle>{STATE_LABEL[state]} 처리됨</Subtle>
          )}
        </>
      }
    >
      <div className={styles.drawerBody}>
        <Panel subtle><Prose text={a.message} /></Panel>
        {rejecting && (
          <Textarea size="sm" label="반려 사유" description="에이전트 결과라면 이 사유가 다음 시도 프롬프트에 들어갑니다." value={reason} onChange={(e) => setReason(e.target.value)} autoResize minRows={2} />
        )}
        <RefDetail a={a} />
        {refHref && <Row tight><Button size="xs" variant="ghost" leftIcon={<Icon name="arrow-square-out" />} asChild><a href={refHref}>근거 전체 보기</a></Button></Row>}
      </div>
    </Drawer>
  );
}

/* 승인 근거 — ref 종류별 요약. 에이전트 출력이 아니라 실제 결과물(diff·문서)을 보여준다 */
function RefDetail({ a }: { a: Approval }) {
  if (a.ref.type === "run") {
    const r = getRun(a.ref.id);
    const t = r && getTask(r.taskId);
    if (!r) return null;
    return (
      <Section title={`실행 결과 #${r.attempt}`} icon="waveform" hint={r.agent}>
        <Panel>
          <KV items={[
            { k: "업무", v: t?.title ?? r.taskId },
            { k: "상태", v: <Badge size="sm" variant="soft" status={TONE.runState[r.state]}>{LABEL.runState[r.state]}</Badge> },
            { k: "계획", v: <Prose text={r.plan} /> },
            { k: "결과", v: r.summary },
          ]} />
          {r.diff && <Panel subtle><pre className={styles.diff}>{r.diff}</pre></Panel>}
          {r.rejectReason && <Callout tone="destructive" variant="outline" icon="warning-circle" title="이전 반려 사유">{r.rejectReason}</Callout>}
        </Panel>
      </Section>
    );
  }
  if (a.ref.type === "task") {
    const t = getTask(a.ref.id);
    if (!t) return null;
    return (
      <Section title="업무" icon="list">
        <Panel>
          <Row tight><TaskStateBadge state={t.state} /><Badge size="sm" variant="soft">{LABEL.taskKind[t.kind]}</Badge><span>{t.title}</span></Row>
          <Prose text={t.description} />
          <KV items={t.preflight.map((c) => ({ k: c.label, v: <Row tight><Badge size="sm" variant="soft" status={c.status === "pass" ? "success" : c.status === "warn" ? "warning" : "destructive"}>{c.status}</Badge><Subtle>{c.detail}</Subtle></Row> }))} />
        </Panel>
      </Section>
    );
  }
  if (a.ref.type === "risk") {
    const r = getRisk(a.ref.id);
    if (!r) return null;
    return (
      <Section title="리스크" icon="warning-circle" hint={LABEL.riskKind[r.kind]}>
        <Panel>
          <Prose text={r.detail} />
          <Callout tone="brand" variant="outline" icon="chat-circle" title={r.suggestion.title}>{r.suggestion.body}</Callout>
          {r.suggestion.draft && <Panel subtle><Prose text={r.suggestion.draft} /></Panel>}
        </Panel>
      </Section>
    );
  }
  if (a.ref.type === "deliverable") {
    const d = getDeliverable(a.ref.id);
    if (!d) return null;
    const v = d.versions[d.versions.length - 1];
    return (
      <Section title={d.title} icon="clipboard-text" hint={`v${v.v}`}>
        <Panel subtle><Prose text={v.body} /></Panel>
      </Section>
    );
  }
  return null;
}
