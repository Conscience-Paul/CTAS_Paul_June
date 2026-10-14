"use client";

/**
 * 승인 목록 — 전 프로젝트에서 사람이 결정하는 지점. 5그룹 11종:
 *   문서(배포 · 지식 충돌 · 지식 확정) · 개발(착수 · 구현 결과 · 운영 배포) · 요청(분류 · 범위·변경요청)
 *   · 일정·리스크(일정 변경 · 리스크 대응) · 대외(고객 발송)
 * 문서 draft 는 저장되는 즉시 여기 "문서 배포"로 올라온다. 지식 충돌을 승인하면 업데이트 draft 가 생겨 다시 "문서 배포"로.
 * 얇은 리스트 + 행 클릭 → Drawer. Drawer 안에서 ⌘→ / ⌘← 로 다음·이전 항목.
 */

import Link from "next/link";
import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Badge, Button, Callout, Drawer, Icon, IconButton, Select, TableHeader, TableRow, Tabs, Textarea, useToast } from "@/components/ctas/ctds";
import { KV, Panel, Prose, Row, Section, Subtle, TableBox, TaskStateBadge } from "@/components/ctas/ui";
import { DiffView } from "@/components/ctas/DiffView";
import { authorLabel } from "@/components/ctas/VersionRail";
import { useAllApprovals } from "@/components/ctas/useApprovals";
import {
  APPROVAL_GROUP,
  APPROVAL_GROUP_ICON,
  APPROVAL_ICON,
  LABEL,
  TONE,
  conflicts,
  deployTargetOf,
  fmtDate,
  fmtDateTime,
  findDocLike,
  findKEntry,
  getContext,
  getDeliverable,
  getMember,
  getMilestone,
  getProject,
  getRisk,
  getRun,
  getTask,
  type Approval,
  type ApprovalGroup,
  type ApprovalKind,
  type ApprovalState,
  type ContextVersion,
} from "@/lib/mock";
import { usePreview } from "@/lib/preview-state";
import styles from "./approvals.module.css";

const STATE_TONE: Record<ApprovalState, "warning" | "success" | "destructive"> = { pending: "warning", approved: "success", rejected: "destructive" };
const STATE_LABEL: Record<ApprovalState, string> = { pending: "대기", approved: "승인", rejected: "반려" };
const GROUPS: ApprovalGroup[] = ["doc", "dev", "request", "plan", "external"];
const KINDS = Object.keys(LABEL.approvalKind) as ApprovalKind[];

/** 유형별 버튼 문구 — 승인/반려가 실제로 무슨 일인지 보이게 */
const ACTIONS: Record<ApprovalKind, { approve: string; reject: string; done: string }> = {
  doc_publish: { approve: "배포", reject: "draft 폐기", done: "새 버전으로 확정되어 배포됐습니다." },
  knowledge_conflict: { approve: "업데이트 draft 만들기", reject: "충돌 아님", done: "나머지 문서의 업데이트 draft 를 만들어 '문서 배포'로 올렸습니다." },
  knowledge_confirm: { approve: "지식으로 등록", reject: "버리기", done: "지식 › 의사결정에 등록됐습니다 (프리뷰)." },
  dev_start: { approve: "착수 허용", reject: "보류", done: "Nora 실행이 대기열에 들어갔습니다 (프리뷰)." },
  dev_result: { approve: "반영", reject: "반려", done: "머지 단계로 넘어갑니다 (프리뷰)." },
  dev_release: { approve: "운영 배포", reject: "보류", done: "운영 배포를 시작합니다 (프리뷰)." },
  triage: { approve: "분류 확정", reject: "반려", done: "업무로 등록됐습니다 (프리뷰)." },
  scope: { approve: "범위 내로 흡수", reject: "범위 밖 → 변경요청", done: "범위 내 업무로 진행합니다 (프리뷰)." },
  schedule: { approve: "기한 변경", reject: "반려", done: "마일스톤 기한이 바뀌었습니다 (프리뷰)." },
  risk: { approve: "수용", reject: "조치 필요", done: "리스크를 수용했습니다 (프리뷰)." },
  customer_send: { approve: "발송", reject: "반려", done: "고객에게 발송됩니다 (프리뷰)." },
};

// 홈의 넓은 칸에 맞춘 폭 — 요청자는 서랍에서
const columns = [
  { key: "state", label: "상태", width: 64 },
  { key: "kind", label: "유형", width: 120 },
  { key: "title", label: "제목", flex: true, minWidth: 240 },
  { key: "project", label: "프로젝트", width: 150 },
  { key: "at", label: "요청 시각", width: 100 },
];

/**
 * 홈(대시보드)에 들어가는 승인 목록 보드. 별도 페이지 없이 홈이 곧 승인 목록이다.
 * ?open=<id> 로 들어오면 그 항목을 바로 연다(알림·리스크·업무 링크). useSearchParams 를 쓰므로 Suspense 로 감싼다.
 */
export function ApprovalsBoard() {
  return (
    <Suspense>
      <Approvals />
    </Suspense>
  );
}

function Approvals() {
  // 목업 승인 + 프리뷰 문서 draft + 리스크 대응 — 홈 상단 요약과 같은 데이터
  const { all, stateOf } = useAllApprovals();
  const params = useSearchParams();

  const [state, setState] = useState<ApprovalState | "all">("pending");
  const [group, setGroup] = useState<ApprovalGroup | null>(null);
  const [kind, setKind] = useState<ApprovalKind | null>(null);
  const [openId, setOpenId] = useState<string | null>(() => params.get("open"));

  const byState = all.filter((a) => state === "all" || stateOf(a) === state);
  const list = byState
    .filter((a) => (!group || APPROVAL_GROUP[a.kind] === group) && (!kind || a.kind === kind))
    .sort((a, b) => b.requestedAt.localeCompare(a.requestedAt));
  const groupCount = (g: ApprovalGroup) => byState.filter((a) => APPROVAL_GROUP[a.kind] === g).length;
  const stateCount = (s: ApprovalState) => all.filter((a) => stateOf(a) === s).length;
  const kindOptions = KINDS.filter((k) => !group || APPROVAL_GROUP[k] === group);
  const openIdx = openId ? list.findIndex((a) => a.id === openId) : -1;

  return (
    <section className={styles.board} aria-label="승인 목록">
      <div className={styles.boardHead}>
        <h2 className={styles.boardTitle}><Icon name="check-circle" size={16} />승인 목록</h2>
        <div className={styles.stateTabs}>
          <Tabs value={state} onValueChange={(v) => { setState(v as ApprovalState | "all"); setOpenId(null); }} variant="segmented" size="sm">
            <Tabs.List aria-label="상태">
              <Tabs.Trigger value="pending">대기 {stateCount("pending")}</Tabs.Trigger>
              <Tabs.Trigger value="approved">승인 {stateCount("approved")}</Tabs.Trigger>
              <Tabs.Trigger value="rejected">반려 {stateCount("rejected")}</Tabs.Trigger>
              <Tabs.Trigger value="all">전체 {all.length}</Tabs.Trigger>
            </Tabs.List>
          </Tabs>
        </div>
      </div>

      {/* 유형 — 그룹 칩(아이콘·건수) + 세부 유형 드롭다운 */}
      <div className={styles.toolbar}>
        <div className={styles.chips} role="group" aria-label="유형 그룹">
          <button type="button" className={styles.chip} data-active={!group || undefined} onClick={() => { setGroup(null); setKind(null); }}>
            전체 <span className={styles.count}>{byState.length}</span>
          </button>
          {GROUPS.map((g) => (
            <button key={g} type="button" className={styles.chip} data-active={group === g || undefined} onClick={() => { setGroup(group === g ? null : g); setKind(null); }}>
              <Icon name={APPROVAL_GROUP_ICON[g]} size={12} />
              {LABEL.approvalGroup[g]}
              <span className={styles.count}>{groupCount(g)}</span>
            </button>
          ))}
        </div>
        <label className={styles.kindSelect}>
          <span className={styles.selectLabel}>세부 유형</span>
          <Select size="sm" width={180} value={kind ?? "__all"} onValueChange={(v) => setKind(v === "__all" ? null : (v as ApprovalKind))}>
            <Select.Trigger aria-label="세부 유형" />
            <Select.Content>
              <Select.Item value="__all">전체</Select.Item>
              {kindOptions.map((k) => (
                <Select.Item key={k} value={k}>{LABEL.approvalKind[k]} ({byState.filter((a) => a.kind === k).length})</Select.Item>
              ))}
            </Select.Content>
          </Select>
        </label>
      </div>

      <TableBox>
        <TableHeader columns={columns} variant="line" />
        {list.map((a, i) => (
          <TableRow<Approval> key={a.id} variant="line" data={a} onClick={() => setOpenId(list[i].id)} columns={columns.map((c) => ({ ...c, render: (d: Approval) => cell(c.key, d, stateOf(d)) }))} />
        ))}
      </TableBox>
      {list.length === 0 && <Subtle>조건에 맞는 항목이 없습니다.</Subtle>}

      {openIdx >= 0 && (
        <ApprovalDrawer
          approval={list[openIdx]}
          index={openIdx}
          total={list.length}
          onMove={(d) => setOpenId(list[Math.min(list.length - 1, Math.max(0, openIdx + d))]?.id ?? null)}
          onClose={() => setOpenId(null)}
        />
      )}
    </section>
  );
}

function cell(key: string, a: Approval, s: ApprovalState) {
  switch (key) {
    case "state": return <Badge size="sm" variant="soft" status={STATE_TONE[s]}>{STATE_LABEL[s]}</Badge>;
    case "kind": return <Row tight><Icon name={APPROVAL_ICON[a.kind]} size={14} /><span>{LABEL.approvalKind[a.kind]}</span></Row>;
    case "title": return <span className={styles.ellipsis}>{a.title}</span>;
    case "project": return <Subtle>{getProject(a.projectId)?.name}</Subtle>;
    case "by": return <Subtle>{a.requestedBy}</Subtle>;
    case "at": return <Subtle>{fmtDateTime(a.requestedAt)}</Subtle>;
  }
}

/* ── Drawer: 근거 + 유형별 결정 + ⌘←/⌘→ ─────────── */
function ApprovalDrawer({ approval: a, index, total, onMove, onClose }: { approval: Approval; index: number; total: number; onMove: (d: 1 | -1) => void; onClose: () => void }) {
  const { toast } = useToast();
  const { approvalDecisions, decideApproval, drafts, publishDraft, discardDraft, saveDraft, addVersion, resolveConflict, setRiskStatus } = usePreview();
  const state = approvalDecisions[a.id] ?? a.state;
  const act = ACTIONS[a.kind];
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  // 지식 충돌 — 기준으로 삼을 문서 (기본: Nora 추천 = 첫 당사자)
  const conflict = a.ref.type === "conflict" ? conflicts.find((c) => c.id === a.ref.id) : undefined;
  const [basis, setBasis] = useState<string | null>(conflict?.parties[0]?.id ?? null);

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

  const next = () => { if (index < total - 1) onMove(1); else onClose(); };

  const approve = () => {
    // 유형별로 실제 반영
    if (a.kind === "doc_publish" && a.ref.type === "draft") {
      const docId = a.ref.id;
      if (drafts[docId]) {
        const entry = findKEntry(docId)?.entry;
        publishDraft(docId, entry ? deployTargetOf(entry).where : findDocLike(docId)?.title ?? docId);
      } else if (a.draft) {
        addVersion(docId, { at: new Date().toISOString(), author: { kind: "ai", model: a.draft.by }, summary: a.draft.summary, basedOn: [], body: a.draft.body });
      }
    }
    if (a.kind === "knowledge_conflict" && conflict && basis) {
      const basisTitle = findDocLike(basis)?.title ?? basis;
      conflict.parties.filter((p) => p.type === "context" && p.id !== basis).forEach((p) => {
        const doc = findDocLike(p.id);
        const latest = doc?.versions[doc.versions.length - 1];
        saveDraft(p.id, {
          at: new Date().toISOString(),
          author: { kind: "ai", model: "Nora · 지식 충돌 해결" },
          summary: `지식 충돌 해결 — 「${basisTitle}」 기준으로 맞춤`,
          basedOn: [basis],
          body: `${latest?.body ?? ""}\n\n> 업데이트: ${conflict.suggestion}`,
        });
      });
      resolveConflict(conflict.id);
    }
    if (a.kind === "risk" && a.ref.type === "risk") setRiskStatus(a.ref.id, "acknowledged");
    decideApproval(a.id, "approved");
    toast({ title: `${act.approve} 완료`, description: act.done, tone: "success" });
    next();
  };
  const reject = () => {
    if (a.kind === "doc_publish" && a.ref.type === "draft" && drafts[a.ref.id]) discardDraft(a.ref.id);
    decideApproval(a.id, "rejected");
    toast({ title: act.reject, description: reason ? `사유: ${reason}` : "사유 없이 처리", tone: "warning" });
    setRejecting(false);
    setReason("");
    next();
  };

  return (
    <Drawer
      open
      onOpenChange={(o) => !o && onClose()}
      size="lg"
      title={a.title}
      description={
        <span className={styles.drawerMeta}>
          <Badge size="sm" variant="soft"><Icon name={APPROVAL_ICON[a.kind]} size={12} />{LABEL.approvalKind[a.kind]}</Badge>
          <Badge size="sm" variant="soft" status={STATE_TONE[state]}>{STATE_LABEL[state]}</Badge>
          <Subtle>{getProject(a.projectId)?.name} · {a.requestedBy} · {fmtDateTime(a.requestedAt)}</Subtle>
        </span>
      }
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
                <Button variant="destructive" leftIcon={<Icon name="x" />} onClick={reject}>{act.reject} 확정</Button>
              </>
            ) : (
              <>
                <Button variant="outline" leftIcon={<Icon name="x" />} onClick={() => setRejecting(true)}>{act.reject}</Button>
                <Button variant="primary" leftIcon={<Icon name="check" />} onClick={approve} disabled={a.kind === "knowledge_conflict" && !basis}>{act.approve}</Button>
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
          <Textarea size="sm" label="사유" description="에이전트 결과·draft 라면 이 사유가 다음 시도에 들어갑니다." value={reason} onChange={(e) => setReason(e.target.value)} autoResize minRows={2} />
        )}
        <KindDetail a={a} basis={basis} onBasis={setBasis} />
      </div>
    </Drawer>
  );
}

/* 유형별 근거 — 에이전트 출력이 아니라 실제 결과물(diff·문서·일정)을 보여준다 */
function KindDetail({ a, basis, onBasis }: { a: Approval; basis: string | null; onBasis: (id: string) => void }) {
  const { drafts } = usePreview();

  // 문서 배포 — 현재 버전 ↔ draft 비교
  if (a.kind === "doc_publish" && a.ref.type === "draft") {
    const doc = findDocLike(a.ref.id);
    const latest = doc?.versions[doc.versions.length - 1];
    const d = drafts[a.ref.id];
    const after = d?.body ?? a.draft?.body ?? "";
    const target = (() => { const e = findKEntry(a.ref.id)?.entry; return e ? deployTargetOf(e) : undefined; })();
    return (
      <Section title="바뀌는 내용" icon="upload-simple" hint={target ? `배포 위치 · ${target.service} · ${target.where}` : undefined}>
        <KV items={[
          { k: "문서", v: doc?.title ?? a.ref.id },
          { k: "버전", v: `v${doc?.versions.length ?? 0} → v${(doc?.versions.length ?? 0) + 1}` },
          { k: "변경 요약", v: d?.summary ?? a.draft?.summary ?? "—" },
          { k: "작성", v: d ? authorLabel(d.author) : a.draft?.by ?? "—" },
        ]} />
        <DiffView before={latest?.body ?? ""} after={after} beforeLabel={`v${latest?.v ?? 0} (현재)`} afterLabel="draft" />
      </Section>
    );
  }

  // 지식 충돌 — 문서별 해당 내용 + 기준 고르기
  if (a.kind === "knowledge_conflict" && a.ref.type === "conflict") {
    const c = conflicts.find((x) => x.id === a.ref.id);
    if (!c) return null;
    return (
      <Section title="충돌하는 문서 — 기준 고르기" icon="split-horizontal" hint="기준이 아닌 문서는 업데이트 draft 가 만들어집니다">
        <Panel subtle><Prose text={c.detail} /></Panel>
        <div className={styles.parties} role="radiogroup" aria-label="기준 문서">
          {c.parties.map((p, i) => {
            const doc = findDocLike(p.id);
            const latest = doc?.versions[doc.versions.length - 1];
            return (
              <button key={p.id} type="button" role="radio" aria-checked={basis === p.id} className={styles.party} data-active={basis === p.id || undefined} onClick={() => onBasis(p.id)}>
                <span className={styles.partyHead}>
                  <span className={styles.radio} />
                  <strong>{doc?.title ?? p.id}</strong>
                  {latest && <Subtle>v{latest.v} · {fmtDate(latest.at)}</Subtle>}
                  {i === 0 && <Badge size="sm" variant="soft" status="info">Nora 추천</Badge>}
                  {basis === p.id ? <Badge size="sm" variant="soft" status="success">기준</Badge> : <Badge size="sm" variant="soft" status="warning">업데이트 필요</Badge>}
                </span>
                {latest && <span className={styles.partyBody}>{latest.body.slice(0, 160)}{latest.body.length > 160 ? "…" : ""}</span>}
              </button>
            );
          })}
        </div>
        <Callout tone="brand" variant="outline" icon="chat-circle" title="Nora 제안">{c.suggestion}</Callout>
      </Section>
    );
  }

  // 지식 확정 — 후보 + 출처
  if (a.kind === "knowledge_confirm" && a.candidate) {
    const src = a.ref.type === "context" ? getContext(a.ref.id) : undefined;
    return (
      <Section title={a.candidate.kind === "decision" ? "결정 후보" : "요구사항 후보"} icon="seal-check" hint={src ? `출처 · ${src.title}` : undefined}>
        <Panel>
          <strong>{a.candidate.title}</strong>
          <Prose text={a.candidate.body} />
        </Panel>
      </Section>
    );
  }

  // 일정 변경 — 기한 전후 + 영향
  if (a.kind === "schedule" && a.schedule && a.ref.type === "milestone") {
    const m = getMilestone(a.ref.id);
    return (
      <Section title="마일스톤 기한" icon="calendar-dots">
        <KV items={[
          { k: "마일스톤", v: m?.title ?? a.ref.id },
          { k: "담당", v: m ? getMember(m.ownerId)?.name : "—" },
          { k: "기한", v: <Row tight><s>{fmtDate(a.schedule.from)}</s><Icon name="arrow-right" size={12} /><strong>{fmtDate(a.schedule.to)}</strong></Row> },
          { k: "영향", v: a.schedule.impact },
          { k: "연결 업무", v: m ? <Row tight>{m.taskIds.map((id) => { const t = getTask(id); return t ? <Row key={id} tight><TaskStateBadge state={t.state} /><Subtle>{t.title}</Subtle></Row> : null; })}</Row> : "—" },
        ]} />
      </Section>
    );
  }

  // 운영 배포 — 대상·버전·롤백 + 업무
  if (a.kind === "dev_release" && a.release) {
    return (
      <>
        <Section title="배포" icon="rows-plus-bottom">
          <KV items={[
            { k: "환경", v: a.release.env },
            { k: "버전", v: a.release.version },
            { k: "롤백", v: a.release.rollback },
          ]} />
        </Section>
        <RefDetail a={a} />
      </>
    );
  }

  return <RefDetail a={a} />;
}

/* 승인 근거 — ref 종류별 요약 */
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
          {/* 리스크는 별도 페이지가 없어 여기서 다 본다 — 심각도 · 감지 시각 · 근거 */}
          <Row tight>
            <Badge size="sm" variant="soft" status={r.severity === "critical" ? "destructive" : r.severity === "high" ? "warning" : r.severity === "medium" ? "info" : undefined}>{LABEL.severity[r.severity]}</Badge>
            <Subtle>{fmtDateTime(r.detectedAt)} 감지</Subtle>
          </Row>
          <Prose text={r.detail} />
          {r.evidence.length > 0 && <RiskEvidence evidence={r.evidence} />}
          <Callout tone="brand" variant="outline" icon="chat-circle" title={r.suggestion.title}>{r.suggestion.body}</Callout>
          {r.suggestion.draft && <Panel subtle><Prose text={r.suggestion.draft} /></Panel>}
        </Panel>
      </Section>
    );
  }
  if (a.ref.type === "deliverable") {
    const d = getDeliverable(a.ref.id);
    if (!d) return null;
    const v: ContextVersion = d.versions[d.versions.length - 1];
    return (
      <Section title={d.title} icon="clipboard-text" hint={`v${v.v}`}>
        <Panel subtle><Prose text={v.body} /></Panel>
      </Section>
    );
  }
  return null;
}

/** 리스크 근거 — 문서는 근거 서랍으로, 업무·마일스톤은 해당 화면으로 */
function RiskEvidence({ evidence }: { evidence: { type: "context" | "task" | "milestone"; id: string }[] }) {
  const { setPeekDocId } = usePreview();
  return (
    <Row tight>
      <Subtle>근거</Subtle>
      {evidence.map((e) => {
        if (e.type === "context") {
          return <Button key={e.id} size="xs" variant="outline" leftIcon={<Icon name="sidebar-simple" />} onClick={() => setPeekDocId(e.id)}>{getContext(e.id)?.title ?? e.id}</Button>;
        }
        const label = e.type === "task" ? getTask(e.id)?.title : getMilestone(e.id)?.title;
        const href = e.type === "task" ? `/projects/${getTask(e.id)?.projectId}/tasks/${e.id}` : `/projects/${getMilestone(e.id)?.projectId}`;
        return <Button key={e.id} size="xs" variant="outline" leftIcon={<Icon name="arrow-square-out" />} asChild><Link href={href}>{label ?? e.id}</Link></Button>;
      })}
    </Row>
  );
}
