"use client";

/**
 * 운영 › 계약·문서 › 일정 — 발송 예정 · 내부 검토 기한 · 만료 · 갱신 협의(만료 45일 전 자동).
 * 다른 리스트와 같은 테이블 뷰. 행 클릭 → Drawer.
 */

import { useState } from "react";
import { Badge, FileIcon, FilterButton, TableHeader, TableRow } from "@/components/ctas/ctds";
import { Page, PageHeader, Panel, Row, Subtle, TableBox } from "@/components/ctas/ui";
import { EmptyState } from "@/components/ctas/ctds";
import { CONTRACT_LABEL, contracts, daysUntil, docEvents, fmtDate, type ContractDoc, type DeliveryStatus, type DocEvent } from "@/lib/mock";
import { usePreview } from "@/lib/preview-state";
import { DocDrawer, EVENT_LABEL, EVENT_TONE, dow } from "../_shared";
import styles from "../contracts.module.css";

const KINDS: DocEvent["kind"][] = ["send", "review", "expire", "renew"];

const columns = [
  { key: "date", label: "날짜", width: 120 },
  { key: "dday", label: "D-day", width: 90 },
  { key: "kind", label: "종류", width: 90 },
  { key: "doc", label: "문서", flex: true, minWidth: 260 },
  { key: "detail", label: "내용", width: 260 },
  { key: "counterpart", label: "상대방", width: 180 },
  { key: "docKind", label: "문서 종류", width: 100 },
];

type RowData = { event: DocEvent; doc: ContractDoc };

export default function ContractsSchedulePage() {
  const { role, mentionDoc } = usePreview();
  const canOpen = (requiredRole: "pm" | "admin") => role === "admin" || (role === "pm" && requiredRole === "pm");
  const [kindFilter, setKindFilter] = useState<DocEvent["kind"] | null>(null);
  const [range, setRange] = useState<"2w" | "2m" | "all">("2m");
  const [openId, setOpenId] = useState<string | null>(null);
  const [deliveryOverride, setDeliveryOverride] = useState<Record<string, DeliveryStatus>>({});

  const horizon = range === "2w" ? 14 : range === "2m" ? 60 : 9999;
  const inRange = (e: DocEvent) => daysUntil(e.at) >= -14 && daysUntil(e.at) <= horizon;
  const all = docEvents().filter(inRange);
  const rows: RowData[] = all
    .filter((e) => !kindFilter || e.kind === kindFilter)
    .map((e) => ({ event: e, doc: contracts.find((c) => c.id === e.docId)! }));
  const openDoc = openId ? contracts.find((c) => c.id === openId) : undefined;

  return (
    <Page wide>
      <PageHeader title="서류 일정" lead="고객 발송은 승인(customer_send)을 거칩니다. 체결 문서는 만료 45일 전에 갱신 협의 일정이 자동으로 잡힙니다." />

      <div className={styles.filters}>
        <span className={styles.filterLabel}>기간</span>
        <FilterButton size="sm" selected={range === "2w"} onClick={() => setRange("2w")}>2주</FilterButton>
        <FilterButton size="sm" selected={range === "2m"} onClick={() => setRange("2m")}>2개월</FilterButton>
        <FilterButton size="sm" selected={range === "all"} onClick={() => setRange("all")}>전체</FilterButton>
        <span className={styles.filterLabel}>종류</span>
        <FilterButton size="sm" selected={kindFilter === null} onClick={() => setKindFilter(null)}>전체 {all.length}</FilterButton>
        {KINDS.map((k) => {
          const n = all.filter((e) => e.kind === k).length;
          return n > 0 ? <FilterButton key={k} size="sm" selected={kindFilter === k} onClick={() => setKindFilter(kindFilter === k ? null : k)}>{EVENT_LABEL[k]} {n}</FilterButton> : null;
        })}
      </div>

      {rows.length === 0 ? (
        <Panel><EmptyState size="sm" icon="empty" title="조건에 맞는 일정이 없습니다" /></Panel>
      ) : (
        <TableBox>
          <TableHeader columns={columns} variant="line" />
          {rows.map((r) => (
            <TableRow<RowData>
              key={`${r.event.docId}-${r.event.kind}`}
              variant="line"
              data={r}
              disabled={!canOpen(r.doc.requiredRole)}
              onClick={() => canOpen(r.doc.requiredRole) && setOpenId(r.doc.id)}
              columns={columns.map((c) => ({ ...c, render: (d: RowData) => cell(c.key, d) }))}
            />
          ))}
        </TableBox>
      )}

      {openDoc && (
        <DocDrawer
          doc={openDoc}
          delivery={deliveryOverride[openDoc.id] ?? openDoc.delivery.status}
          onDelivery={(s) => setDeliveryOverride((m) => ({ ...m, [openDoc.id]: s }))}
          onClose={() => setOpenId(null)}
          onAskAi={() => { setOpenId(null); mentionDoc(openDoc.id); }}
        />
      )}
    </Page>
  );
}

function cell(key: string, { event: e, doc }: RowData) {
  const d = daysUntil(e.at);
  switch (key) {
    case "date": return <Row tight><span>{fmtDate(e.at)}</span><Subtle>{dow(e.at)}</Subtle></Row>;
    case "dday": return d === 0 ? <Badge size="sm" variant="soft" status="warning">오늘</Badge> : d < 0 ? <Badge size="sm" variant="soft" status="destructive">+{-d}</Badge> : <Badge size="sm" variant="soft" status={d <= 7 ? "warning" : undefined}>D-{d}</Badge>;
    case "kind": return <Badge size="sm" variant="soft" status={EVENT_TONE[e.kind]}>{EVENT_LABEL[e.kind]}</Badge>;
    case "doc": return <Row tight style={{ flexWrap: "nowrap", minWidth: 0 }}><FileIcon ext={doc.ext} size="sm" /><span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{doc.title}</span></Row>;
    case "detail": return <Subtle>{e.label}</Subtle>;
    case "counterpart": return <Subtle>{doc.counterpart}</Subtle>;
    case "docKind": return <Badge size="sm" variant="soft">{CONTRACT_LABEL[doc.kind]}</Badge>;
  }
}
