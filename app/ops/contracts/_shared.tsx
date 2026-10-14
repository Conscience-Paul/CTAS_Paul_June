"use client";

/**
 * 운영 › 계약·문서 공용 — 톤 매핑, 폴더 트리 노드, 문서 Drawer, 일정 헬퍼.
 * 문서함(/ops/contracts) · AI 채팅(/ops/contracts/ai) · 일정(/ops/contracts/schedule) 이 공유.
 */

import { useState } from "react";
import { Badge, Button, Drawer, FileIcon, Icon, Input, Tabs, Textarea, useToast } from "@/components/ctas/ctds";
import { KV, Panel, Prose, Row, Section, Subtle } from "@/components/ctas/ui";
import { VersionRail, authorLabel, useVersions } from "@/components/ctas/VersionRail";
import {
  CONTRACT_LABEL,
  CONTRACT_STATUS_LABEL,
  DELIVERY_LABEL,
  LABEL,
  daysUntil,
  docFolders,
  docsInFolder,
  fmtDate,
  fmtDateTime,
  getProject,
  type ContractDoc,
  type ContractStatus,
  type DeliveryStatus,
  type DocEvent,
} from "@/lib/mock";
import { usePreview } from "@/lib/preview-state";
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
export const EVENT_TONE: Record<DocEvent["kind"], "success" | "warning" | "info" | "destructive" | undefined> = {
  send: "info",
  review: "warning",
  expire: "destructive",
  renew: "warning",
};
export const EVENT_LABEL: Record<DocEvent["kind"], string> = { send: "발송", review: "검토", expire: "만료", renew: "갱신" };

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


export function DocDrawer({ doc, delivery, onDelivery, onClose, onAskAi }: { doc: ContractDoc; delivery: DeliveryStatus; onDelivery: (s: DeliveryStatus) => void; onClose: () => void; onAskAi: () => void }) {
  const { toast } = useToast();
  const { addVersion } = usePreview();
  const versions = useVersions(doc.id, doc.versions);
  const [selected, setSelected] = useState(versions.length);
  const [seen, setSeen] = useState(versions.length);
  if (seen !== versions.length) { setSeen(versions.length); setSelected(versions.length); }
  const ver = versions.find((v) => v.v === selected) ?? versions[versions.length - 1];

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [summary, setSummary] = useState("");
  const startEdit = () => { setDraft(ver.body); setSummary(""); setEditing(true); };
  const save = () => {
    addVersion(doc.id, {
      at: new Date().toISOString(),
      author: { kind: "human", memberId: "m-seoyeon" },
      summary: summary.trim() || "수동 편집",
      basedOn: [],
      body: draft,
    });
    setEditing(false);
    toast({ title: `v${versions.length + 1} 저장됨`, description: "버전 히스토리에 기록됐습니다.", tone: "success" });
  };

  const project = doc.projectId ? getProject(doc.projectId) : undefined;
  const isLatest = selected === versions.length;

  return (
    <Drawer
      open
      onOpenChange={(o) => !o && onClose()}
      size="lg"
      title={<Row tight><FileIcon ext={doc.ext} size="sm" />{doc.title}</Row>}
      description={<Row tight><Badge size="sm" variant="soft">{CONTRACT_LABEL[doc.kind]}</Badge><Badge size="sm" variant="soft" status={STATUS_TONE[doc.status]}>{CONTRACT_STATUS_LABEL[doc.status]}</Badge><Subtle>{project?.name ?? "표준 양식"} · {doc.counterpart}</Subtle></Row>}
      footer={
        editing ? (
          <>
            <Button variant="ghost" onClick={() => setEditing(false)}>취소</Button>
            <Button variant="primary" leftIcon={<Icon name="check" />} onClick={save} disabled={draft.trim() === ver.body.trim()}>v{versions.length + 1} 로 저장</Button>
          </>
        ) : (
          <>
            <Button variant="ghost" leftIcon={<Icon name="arrow-square-out" />} onClick={() => window.open(doc.source.url, "_blank", "noopener")}>{doc.source.label} 원본</Button>
            <Button variant="outline" leftIcon={<Icon name="chat-circle" />} onClick={onAskAi}>AI 로 보완</Button>
            <Button variant="primary" leftIcon={<Icon name="pencil-simple" />} onClick={startEdit} disabled={!isLatest}>편집</Button>
          </>
        )
      }
    >
      <Tabs defaultValue="content" variant="underline" size="sm">
        <Tabs.List aria-label="문서 보기">
          <Tabs.Trigger value="content">내용 {!isLatest && <Badge size="sm" variant="soft" status="warning">v{selected} 보는 중</Badge>}</Tabs.Trigger>
          <Tabs.Trigger value="versions">버전 {versions.length}</Tabs.Trigger>
          <Tabs.Trigger value="delivery">전달</Tabs.Trigger>
        </Tabs.List>

        <Tabs.Panel value="content">
          <div className={styles.drawerBody} style={{ paddingTop: "var(--space-4)" }}>
            {editing ? (
              <>
                <Input size="sm" label="변경 요약" placeholder="예: §4 대금 조항 수정" value={summary} onChange={(e) => setSummary(e.target.value)} />
                <Textarea className={styles.editor} label="본문" value={draft} onChange={(e) => setDraft(e.target.value)} autoResize minRows={14} maxRows={30} />
              </>
            ) : (
              <>
                <Row tight>
                  <Subtle>v{ver.v} · {authorLabel(ver.author)} · {fmtDateTime(ver.at)}</Subtle>
                  {!isLatest && <Button size="xs" variant="ghost" onClick={() => setSelected(versions.length)}>최신으로</Button>}
                </Row>
                <Panel subtle><Prose text={ver.body} /></Panel>
                <KV items={[
                  { k: "상대방", v: doc.counterpart },
                  { k: "금액", v: doc.amount ?? "—" },
                  { k: "체결", v: doc.signedAt ?? "—" },
                  { k: "만료", v: doc.expiresAt ?? "—" },
                  { k: "열람 권한", v: doc.requiredRole === "admin" ? "관리자 전용" : "PM 이상" },
                  { k: "원본", v: <Row tight><Icon name="arrow-square-out" size={12} />{doc.source.label}<Subtle>(클릭 시 새 탭)</Subtle></Row> },
                ]} />
              </>
            )}
          </div>
        </Tabs.Panel>

        <Tabs.Panel value="versions">
          <div className={styles.drawerBody} style={{ paddingTop: "var(--space-4)" }}>
            <Subtle>버전은 불변 — 수정은 항상 v+1 로 쌓입니다. 클릭하면 내용 탭이 그 버전을 보여줍니다.</Subtle>
            <VersionRail versions={versions} selected={selected} onSelect={setSelected} />
          </div>
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
                    {delivery === "not_sent" && <Button size="sm" variant="outline" leftIcon={<Icon name="calendar-blank" />} onClick={() => { onDelivery("scheduled"); toast({ title: "발송 예약", description: "일정 탭에 반영됐습니다.", tone: "neutral" }); }}>발송 예약</Button>}
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
    </Drawer>
  );
}


export function groupByDate(evs: DocEvent[]): [string, DocEvent[]][] {
  const m = new Map<string, DocEvent[]>();
  evs.forEach((e) => m.set(e.at, [...(m.get(e.at) ?? []), e]));
  return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0]));
}
export function dow(iso: string) {
  return ["일", "월", "화", "수", "목", "금", "토"][new Date(iso).getDay()];
}
