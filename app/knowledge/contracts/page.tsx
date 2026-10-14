"use client";

/**
 * 지식 › 계약문서 — 관리자 전용 보안 문서함. Finder / Google Drive 식 탐색.
 * 한 리스트에 현재 폴더의 하위 폴더(위) + 문서(아래). 폴더 행을 누르면 들어가고,
 * 상단 경로로 되돌아온다. 문서 행(또는 사이드바 트리의 파일) 클릭 → 본문에 문서 뷰어.
 * 원본(Google Drive)은 행 끝 아이콘.
 */

import { useState } from "react";
import { Badge, Button, Callout, EmptyState, FileIcon, FilterButton, Icon, IconButton, Input, TableHeader, TableRow, Tooltip } from "@/components/ctas/ctds";
import { Page, PageHeader, Panel, Row, Subtle, TableBox } from "@/components/ctas/ui";
import {
  CONTRACT_LABEL,
  CONTRACT_STATUS_LABEL,
  DELIVERY_LABEL,
  contracts,
  daysUntil,
  docFolders,
  docsInFolder,
  fmtDate,
  folderPath,
  type ContractDoc,
  type ContractStatus,
  type DeliveryStatus,
  type DocFolder,
} from "@/lib/mock";
import { DOC_MIME, endDocDrag, startDocDrag } from "@/lib/drag";
import { usePreview } from "@/lib/preview-state";
import { DELIVERY_TONE, DocDrawer, STATUS_TONE } from "./_shared";
import styles from "./contracts.module.css";

const columns = [
  { key: "doc", label: "이름", flex: true, minWidth: 280 },
  { key: "kind", label: "종류", width: 96 },
  { key: "status", label: "상태", width: 90 },
  { key: "delivery", label: "전달", width: 100 },
  { key: "counterpart", label: "상대방", width: 180 },
  { key: "amount", label: "금액", width: 150 },
  { key: "next", label: "다음 일정", width: 150 },
  { key: "version", label: "수정", width: 120 },
  { key: "source", label: "원본", width: 56, align: "center" as const },
];

const STATUSES: ContractStatus[] = ["draft", "review", "signed", "expired"];
const DELIVERIES: DeliveryStatus[] = ["not_sent", "scheduled", "sent", "acknowledged", "signed_back"];

/** 리스트 한 행 — 폴더 또는 문서 */
type Entry = { type: "folder"; folder: DocFolder } | { type: "doc"; doc: ContractDoc };

export default function ContractsLibraryPage() {
  // 현재 폴더·열린 문서는 사이드바 트리와 공유
  const { role, mentionDoc, contractFolderId: folderId, setContractFolderId, openDocId, setOpenDocId } = usePreview();
  const canView = role === "admin";

  const setFolderId = (id: string | null) => { setContractFolderId(id); setOpenDocId(null); };
  const [statusFilter, setStatusFilter] = useState<ContractStatus | null>(null);
  const [deliveryFilter, setDeliveryFilter] = useState<DeliveryStatus | null>(null);
  const [deliveryOverride, setDeliveryOverride] = useState<Record<string, DeliveryStatus>>({});
  const deliveryOf = (c: ContractDoc) => deliveryOverride[c.id] ?? c.delivery.status;

  if (!canView) {
    return (
      <Page>
        <PageHeader title="계약문서" />
        <EmptyState icon="eye-slash" title="관리자 전용 보안 문서함입니다" description="계약서 · 견적서 · NDA · SLA 는 관리자만 열람할 수 있습니다. 상단 '역할로 보기'를 관리자로 바꿔 보세요." />
      </Page>
    );
  }

  const openDoc = openDocId ? contracts.find((c) => c.id === openDocId) : undefined;
  if (openDoc) {
    return (
      <Page wide>
        <DocDrawer
          key={openDoc.id}
          doc={openDoc}
          inline
          delivery={deliveryOf(openDoc)}
          onDelivery={(s) => setDeliveryOverride((m) => ({ ...m, [openDoc.id]: s }))}
          onClose={() => setOpenDocId(null)}
          onAskAi={() => mentionDoc(openDoc.id)}
        />
      </Page>
    );
  }

  const path = folderId ? folderPath(folderId) : [];
  const subfolders = docFolders.filter((f) => f.parentId === folderId);
  const here = contracts.filter((c) => c.folderId === folderId);
  const docs = here.filter((c) => (!statusFilter || c.status === statusFilter) && (!deliveryFilter || deliveryOf(c) === deliveryFilter));
  const scope = docsInFolder(folderId); // 하위 포함 — 필터 건수용
  const count = (pred: (c: ContractDoc) => boolean) => scope.filter(pred).length;
  const entries: Entry[] = [...subfolders.map((f) => ({ type: "folder", folder: f }) as Entry), ...docs.map((d) => ({ type: "doc", doc: d }) as Entry)];
  const goUp = () => setFolderId(path.length >= 2 ? path[path.length - 2].id : null);

  return (
    <Page wide>
      <PageHeader
        title="계약문서"
        lead="계약서 · 견적서 · NDA · SLA · 변경 계약. 원본은 Google Drive 에, 정제본과 버전·전달 이력은 여기에."
        actions={<Button size="sm" variant="primary" leftIcon={<Icon name="upload-simple" />}>문서 등록</Button>}
      />

      <Callout tone="warning" variant="outline" icon="eye-slash" title="보안 문서함 — 관리자 전용">
        금액·조항이 포함된 문서입니다. 관리자 외 역할은 열람할 수 없으며, 열람·편집·발송은 모두 기록됩니다.
      </Callout>

      {/* 경로 — Finder 식 */}
      <Row style={{ justifyContent: "space-between" }}>
        <div className={styles.nav}>
          <IconButton size="sm" variant="ghost" icon={<Icon name="caret-left" />} aria-label="상위 폴더" disabled={!folderId} onClick={goUp} />
          <Button size="sm" variant={folderId ? "ghost" : "secondary"} leftIcon={<Icon name="stack" />} onClick={() => setFolderId(null)}>계약문서</Button>
          {path.map((f, i) => (
            <span key={f.id} className={styles.nav}>
              <span className={styles.navSep}><Icon name="caret-right" size={12} /></span>
              <Button size="sm" variant={i === path.length - 1 ? "secondary" : "ghost"} onClick={() => setFolderId(f.id)}>{f.name}</Button>
            </span>
          ))}
          <Subtle>· 폴더 {subfolders.length} · 문서 {here.length}</Subtle>
        </div>
      </Row>

      {/* 상태·전달 필터 + 검색 한 줄 — 건수는 하위 폴더 포함 */}
      <div className={styles.filters}>
        <Input size="sm" width="md" leftIcon={<Icon name="search" />} placeholder="이 폴더와 하위에서 검색" aria-label="문서 검색" />
        <span className={styles.filterLabel}>상태</span>
        <FilterButton size="sm" selected={statusFilter === null} onClick={() => setStatusFilter(null)}>전체 {scope.length}</FilterButton>
        {STATUSES.map((s) => {
          const n = count((c) => c.status === s);
          return n > 0 ? <FilterButton key={s} size="sm" selected={statusFilter === s} onClick={() => setStatusFilter(statusFilter === s ? null : s)}>{CONTRACT_STATUS_LABEL[s]} {n}</FilterButton> : null;
        })}
        <span className={styles.filterLabel}>전달</span>
        {DELIVERIES.map((d) => {
          const n = count((c) => c.kind !== "template" && deliveryOf(c) === d);
          return n > 0 ? <FilterButton key={d} size="sm" selected={deliveryFilter === d} onClick={() => setDeliveryFilter(deliveryFilter === d ? null : d)}>{DELIVERY_LABEL[d]} {n}</FilterButton> : null;
        })}
      </div>

      {entries.length === 0 ? (
        <Panel><EmptyState size="sm" icon="empty" title="비어 있습니다" description={statusFilter || deliveryFilter ? "필터를 해제하거나 하위 폴더를 확인하세요." : undefined} /></Panel>
      ) : (
        <TableBox>
          <TableHeader columns={columns} variant="line" />
          {entries.map((e) =>
            e.type === "folder" ? (
              <TableRow<Entry>
                key={e.folder.id}
                variant="line"
                data={e}
                onClick={() => setFolderId(e.folder.id)}
                columns={columns.map((col) => ({ ...col, render: () => folderCell(col.key, e.folder) }))}
              />
            ) : (
              <TableRow<Entry>
                key={e.doc.id}
                variant="line"
                data={e}
                onClick={() => setOpenDocId(e.doc.id)}
                draggable
                onDragStart={(ev: React.DragEvent) => { startDocDrag(e.doc.id); ev.dataTransfer.setData(DOC_MIME, e.doc.id); ev.dataTransfer.setData("text/plain", e.doc.title); ev.dataTransfer.effectAllowed = "copyLink"; }}
                onDragEnd={() => endDocDrag()}
                columns={columns.map((col) => ({ ...col, render: () => docCell(col.key, e.doc, deliveryOf(e.doc)) }))}
              />
            ),
          )}
        </TableBox>
      )}
    </Page>
  );
}

function folderCell(key: string, f: DocFolder) {
  const n = docsInFolder(f.id).length;
  const sub = docFolders.filter((x) => x.parentId === f.id).length;
  switch (key) {
    case "doc":
      return (
        <Row tight style={{ flexWrap: "nowrap", minWidth: 0 }}>
          <span className={styles.folderMark} aria-hidden />
          <span className={styles.folderName}>{f.name}</span>
        </Row>
      );
    case "kind": return <Subtle>폴더</Subtle>;
    case "version": return <Subtle>{sub > 0 ? `폴더 ${sub} · ` : ""}문서 {n}</Subtle>;
    default: return <Subtle>—</Subtle>;
  }
}

function nextEvent(c: ContractDoc, delivery: DeliveryStatus): { label: string; at: string } | null {
  const cands: { label: string; at: string }[] = [];
  if (c.delivery.scheduledAt && delivery === "scheduled") cands.push({ label: "발송", at: c.delivery.scheduledAt });
  if (c.reviewDue) cands.push({ label: "검토", at: c.reviewDue });
  if (c.expiresAt && c.status === "signed") cands.push({ label: "만료", at: c.expiresAt });
  return cands.filter((x) => daysUntil(x.at) >= -14).sort((a, b) => a.at.localeCompare(b.at))[0] ?? null;
}

function docCell(key: string, c: ContractDoc, delivery: DeliveryStatus) {
  switch (key) {
    case "doc":
      return (
        <Row tight style={{ flexWrap: "nowrap", minWidth: 0 }}>
          <FileIcon ext={c.ext} size="sm" />
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.title}</span>        </Row>
      );
    case "kind": return <Badge size="sm" variant="soft">{CONTRACT_LABEL[c.kind]}</Badge>;
    case "status": return <Badge size="sm" variant="soft" status={STATUS_TONE[c.status]}>{CONTRACT_STATUS_LABEL[c.status]}</Badge>;
    case "delivery": return c.kind === "template" ? <Subtle>—</Subtle> : <Badge size="sm" variant="soft" status={DELIVERY_TONE[delivery]}>{DELIVERY_LABEL[delivery]}</Badge>;
    case "counterpart": return <Subtle>{c.counterpart}</Subtle>;
    case "amount": return c.amount ? <span>{c.amount}</span> : <Subtle>—</Subtle>;
    case "next": {
      const n = nextEvent(c, delivery);
      if (!n) return <Subtle>—</Subtle>;
      const d = daysUntil(n.at);
      return <Row tight><Subtle>{n.label}</Subtle><span>{fmtDate(n.at)}</span><Badge size="sm" variant="soft" status={d < 0 ? "destructive" : d <= 7 ? "warning" : undefined}>{d < 0 ? `+${-d}` : `D-${d}`}</Badge></Row>;
    }
    case "version": return <Row tight><span>v{c.versions.length}</span><Subtle>{fmtDate(c.versions[c.versions.length - 1].at)}</Subtle></Row>;
    case "source":
      return (
        <Tooltip content={`${c.source.label} 원본 열기`}>
          <IconButton
            size="sm"
            variant="ghost"
            icon={<Icon name="arrow-square-out" />}
            aria-label={`${c.source.label} 원본 열기`}
            onClick={(e) => { e.stopPropagation(); window.open(c.source.url, "_blank", "noopener"); }}
          />
        </Tooltip>
      );
  }
}
