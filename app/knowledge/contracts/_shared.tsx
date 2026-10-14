"use client";

/**
 * 지식 › 계약문서 공용 — 톤 매핑, 폴더 트리 노드, 문서 뷰어(편집 → draft → 승인 시 Drive 배포).
 */

import { useState } from "react";
import { Badge, Button, FileIcon, Icon, Input, Tabs, Textarea, useToast } from "@/components/ctas/ctds";
import { DocFrame } from "@/components/ctas/DocFrame";
import { DocWorkspace, DraftBanner, useDocVersions } from "@/components/ctas/DocVersions";
import { KV, Panel, Row, Section, Subtle } from "@/components/ctas/ui";
import {
  CONTRACT_LABEL,
  CONTRACT_STATUS_LABEL,
  DELIVERY_LABEL,
  LABEL,
  daysUntil,
  docFolders,
  docsInFolder,
  fmtDate,
  getProject,
  type ContractDoc,
  type ContractStatus,
  type DeliveryStatus,
} from "@/lib/mock";
import styles from "./contracts.module.css";

export const STATUS_TONE: Record<ContractStatus, "success" | "warning" | "info" | "destructive" | undefined> = {
  draft: undefined,
  review: "info",
  signed: "success",
  expired: "destructive",
};
export const DELIVERY_TONE: Record<DeliveryStatus, "success" | "warning" | "info" | "destructive" | undefined> = {
  not_sent: undefined,
  scheduled: "info",
  sent: "info",
  acknowledged: "success",
  signed_back: "success",
};

export function FolderNode({ id, depth, active, onSelect }: { id: string; depth: number; active: string | null; onSelect: (id: string) => void }) {
  const f = docFolders.find((x) => x.id === id)!;
  const children = docFolders.filter((x) => x.parentId === id);
  const count = docsInFolder(id).length;
  return (
    <>
      <button type="button" className={styles.treeItem} style={{ "--depth": depth } as React.CSSProperties} data-active={active === id || undefined} onClick={() => onSelect(id)}>
        <Icon name={children.length > 0 ? "squares-four" : "rectangle"} size={16} />
        <span className={styles.treeName}>{f.name}</span>
        <span className={styles.treeCount}>{count}</span>
      </button>
      {children.map((c) => <FolderNode key={c.id} id={c.id} depth={depth + 1} active={active} onSelect={onSelect} />)}
    </>
  );
}


export function DocDrawer({ doc, delivery, inline, onDelivery, onClose, onAskAi }: { doc: ContractDoc; delivery: DeliveryStatus; inline?: boolean; onDelivery: (s: DeliveryStatus) => void; onClose: () => void; onAskAi: () => void }) {
  const { toast } = useToast();
  // 계약 문서는 원본이 항상 Google Drive — 승인하면 그 파일을 덮어쓴다
  const flow = useDocVersions(doc.id, doc.versions, { service: "Google Docs", url: doc.source.url, where: doc.title });
  const [tab, setTab] = useState("content");

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [summary, setSummary] = useState("");
  const startEdit = () => { setDraft(flow.editBase); setSummary(flow.draft?.summary ?? ""); setEditing(true); setTab("content"); };
  const save = () => {
    flow.save({
      at: new Date().toISOString(),
      author: { kind: "human", memberId: "m-seoyeon" },
      summary: summary.trim() || "수동 편집",
      basedOn: [],
      body: draft,
    });
    setEditing(false);
  };

  const project = doc.projectId ? getProject(doc.projectId) : undefined;

  return (
    <DocFrame
      inline={inline}
      onClose={onClose}
      title={<><FileIcon ext={doc.ext} size="sm" />{doc.title}</>}
      description={<Row tight><Badge size="sm" variant="soft">{CONTRACT_LABEL[doc.kind]}</Badge><Badge size="sm" variant="soft" status={STATUS_TONE[doc.status]}>{CONTRACT_STATUS_LABEL[doc.status]}</Badge><Subtle>{project?.name ?? "표준 양식"} · {doc.counterpart}</Subtle></Row>}
      footer={
        editing ? (
          <>
            <Button variant="ghost" onClick={() => setEditing(false)}>취소</Button>
            <Button variant="primary" leftIcon={<Icon name="check" />} onClick={save} disabled={draft.trim() === flow.editBase.trim()}>v{flow.draftV} draft 로 저장</Button>
          </>
        ) : (
          <>
            <Button variant="ghost" leftIcon={<Icon name="arrow-square-out" />} onClick={() => window.open(doc.source.url, "_blank", "noopener")}>{doc.source.label} 원본</Button>
            <Button variant="outline" leftIcon={<Icon name="chat-circle" />} onClick={onAskAi}>AI 로 보완</Button>
            <Button variant="primary" leftIcon={<Icon name="pencil-simple" />} onClick={startEdit}>{flow.draft ? "draft 편집" : "편집"}</Button>
          </>
        )
      }
    >
      {!editing && <DraftBanner flow={flow} onCompare={() => { flow.setSelected(flow.draftV); flow.setMode("diff"); setTab("content"); }} />}
      <Tabs value={tab} onValueChange={setTab} variant="underline" size="sm">
        <Tabs.List aria-label="문서 보기">
          <Tabs.Trigger value="content">문서 · 버전 {flow.versions.length}{flow.draft ? " + draft" : ""}</Tabs.Trigger>
          <Tabs.Trigger value="delivery">전달</Tabs.Trigger>
        </Tabs.List>

        <Tabs.Panel value="content">
          <DocWorkspace
            flow={flow}
            editor={editing ? (
              <>
                <Input size="sm" label="변경 요약" placeholder="예: §4 대금 조항 수정" value={summary} onChange={(e) => setSummary(e.target.value)} />
                <Textarea className={styles.editor} label="본문" value={draft} onChange={(e) => setDraft(e.target.value)} autoResize minRows={14} maxRows={30} />
              </>
            ) : undefined}
            meta={
              <KV items={[
                { k: "상대방", v: doc.counterpart },
                { k: "금액", v: doc.amount ?? "—" },
                { k: "체결", v: doc.signedAt ?? "—" },
                { k: "만료", v: doc.expiresAt ?? "—" },
                { k: "열람 권한", v: "관리자 전용" },
                { k: "원본", v: <Row tight><Icon name="arrow-square-out" size={12} />{doc.source.label}<Subtle>(클릭 시 새 탭)</Subtle></Row> },
              ]} />
            }
          />
        </Tabs.Panel>

        <Tabs.Panel value="delivery">
          <div className={styles.drawerBody} style={{ paddingTop: "var(--space-4)" }}>
            <Section title="전달 상태" icon="envelope">
              <Panel>
                <KV items={[
                  { k: "상태", v: <Badge size="sm" variant="soft" status={DELIVERY_TONE[delivery]}>{DELIVERY_LABEL[delivery]}</Badge> },
                  { k: "수신", v: doc.delivery.to ?? "—" },
                  { k: "채널", v: doc.delivery.channel ? LABEL.source[doc.delivery.channel] : "—" },
                  { k: "발송 예정", v: doc.delivery.scheduledAt ? `${fmtDate(doc.delivery.scheduledAt)} (D-${daysUntil(doc.delivery.scheduledAt)})` : "—" },
                  { k: "발송일", v: doc.delivery.sentAt ? fmtDate(doc.delivery.sentAt) : "—" },
                ]} />
                {doc.kind !== "template" && (
                  <Row tight>
                    {delivery === "not_sent" && <Button size="sm" variant="outline" leftIcon={<Icon name="calendar-blank" />} onClick={() => { onDelivery("scheduled"); toast({ title: "발송 예약", description: "전달 상태가 발송 예정으로 바뀌었습니다.", tone: "neutral" }); }}>발송 예약</Button>}
                    {(delivery === "not_sent" || delivery === "scheduled") && <Button size="sm" variant="primary" leftIcon={<Icon name="envelope" />} onClick={() => { onDelivery("sent"); toast({ title: "고객 발송 승인 요청", description: "승인 큐(customer_send)에 올라갔습니다. 프리뷰에서는 전달됨으로 표시.", tone: "success" }); }}>고객 발송 (승인 필요)</Button>}
                    {delivery === "sent" && <Button size="sm" variant="outline" leftIcon={<Icon name="check" />} onClick={() => onDelivery("acknowledged")}>고객 확인 기록</Button>}
                    {delivery === "acknowledged" && <Button size="sm" variant="outline" leftIcon={<Icon name="seal-check" />} onClick={() => onDelivery("signed_back")}>서명 회수 기록</Button>}
                  </Row>
                )}
              </Panel>
            </Section>
            <Section title="전달 이력" icon="clock">
              <Panel>
                <div className={styles.history}>
                  {doc.delivery.history.length === 0 && <Subtle>아직 전달 이력이 없습니다.</Subtle>}
                  {doc.delivery.history.map((h, i) => (
                    <div key={i} className={styles.historyRow}>
                      <span className={styles.historyAt}>{h.at}</span>
                      <span>{h.event}</span>
                    </div>
                  ))}
                </div>
              </Panel>
            </Section>
            {(doc.reviewDue || doc.expiresAt) && (
              <Section title="관련 일정" icon="calendar-dots">
                <Panel>
                  <KV items={[
                    ...(doc.reviewDue ? [{ k: "내부 검토 기한", v: `${fmtDate(doc.reviewDue)} (D-${daysUntil(doc.reviewDue)})` }] : []),
                    ...(doc.expiresAt ? [{ k: "만료", v: doc.expiresAt }, { k: "갱신 협의", v: "만료 45일 전 자동 일정" }] : []),
                  ]} />
                </Panel>
              </Section>
            )}
          </div>
        </Tabs.Panel>
      </Tabs>
    </DocFrame>
  );
}
