"use client";

/**
 * 지식 › 문서함 — 모든 문서의 집합소. 계약·문서와 같은 Finder 식 탐색.
 * 고객사 › 프로젝트 › (회의록·요구사항·의사결정·고객 문서·우리 문서·대화·변경·산출물),
 * 그리고 교차 프로젝트의 패턴 라이브러리·템플릿. 행 클릭 → Drawer. 드래그 → AI 패널 멘션.
 */

import { useState } from "react";
import { Avatar, Badge, Button, EmptyState, FileIcon, FilterButton, Icon, IconButton, Input, TableHeader, TableRow, Tooltip } from "@/components/ctas/ctds";
import { Page, PageHeader, Panel, Row, Subtle, TableBox } from "@/components/ctas/ui";
import {
  LABEL,
  TONE,
  fmtDate,
  getMember,
  kCountIn,
  kEntriesIn,
  kExt,
  kFolderPath,
  kFolders,
  kOrigin,
  type ContextState,
  type KEntry,
  type KFolder,
} from "@/lib/mock";
import { DOC_MIME, endDocDrag, startDocDrag } from "@/lib/drag";
import { usePreview } from "@/lib/preview-state";
import { KnowledgeDrawer, entryTitle } from "./_shared";
import styles from "./knowledge-fs.module.css";

const columns = [
  { key: "name", label: "이름", flex: true, minWidth: 300 },
  { key: "kind", label: "종류", width: 110 },
  { key: "state", label: "상태", width: 100 },
  { key: "origin", label: "출처", width: 150 },
  { key: "author", label: "최근 작성", width: 150 },
  { key: "version", label: "수정", width: 120 },
  { key: "source", label: "원본", width: 56, align: "center" as const },
];

type Row_ = { type: "folder"; folder: KFolder } | { type: "entry"; entry: KEntry };
const STATES: ContextState[] = ["raw", "processed", "curated"];

export default function KnowledgeLibraryPage() {
  const { mentionDoc, projectId } = usePreview();
  // 처음엔 현재 프로젝트 폴더에서 시작 — 매번 루트부터 내려가지 않도록
  const [folderId, setFolderId] = useState<string | null>(`kf-${projectId}`);
  const [stateFilter, setStateFilter] = useState<ContextState | null>(null);
  const [open, setOpen] = useState<KEntry | null>(null);

  const path = folderId ? kFolderPath(folderId) : [];
  const subfolders = kFolders.filter((f) => f.parentId === folderId);
  const here = kEntriesIn(folderId);
  const entries = here.filter((e) => !stateFilter || (e.type === "context" && e.item.state === stateFilter));
  const rows: Row_[] = [...subfolders.map((f) => ({ type: "folder", folder: f }) as Row_), ...entries.map((e) => ({ type: "entry", entry: e }) as Row_)];
  const goUp = () => setFolderId(path.length >= 2 ? path[path.length - 2].id : null);
  const stateCount = (s: ContextState) => here.filter((e) => e.type === "context" && e.item.state === s).length;

  return (
    <Page wide>
      <PageHeader
        title="문서함"
        lead="프로젝트에서 모이는 모든 문서 — 대화·회의록·요구사항·결정·산출물 — 와 교차 프로젝트의 패턴·템플릿. 수정은 전부 버전으로 남습니다."
        actions={<Button size="sm" variant="primary" leftIcon={<Icon name="upload-simple" />}>문서 등록</Button>}
      />

      <Row style={{ justifyContent: "space-between" }}>
        <div className={styles.nav}>
          <IconButton size="sm" variant="ghost" icon={<Icon name="caret-left" />} aria-label="상위 폴더" disabled={!folderId} onClick={goUp} />
          <Button size="sm" variant={folderId ? "ghost" : "secondary"} leftIcon={<Icon name="stack" />} onClick={() => setFolderId(null)}>문서함</Button>
          {path.map((f, i) => (
            <span key={f.id} className={styles.nav}>
              <span className={styles.navSep}><Icon name="caret-right" size={12} /></span>
              <Button size="sm" variant={i === path.length - 1 ? "secondary" : "ghost"} onClick={() => setFolderId(f.id)}>{f.name}</Button>
            </span>
          ))}
          <Subtle>· 폴더 {subfolders.length} · 문서 {here.length}</Subtle>
        </div>
      </Row>

      <div className={styles.filters}>
        <Input size="sm" width="md" leftIcon={<Icon name="search" />} placeholder="이 폴더와 하위에서 검색" aria-label="문서 검색" />
        {here.some((e) => e.type === "context") && (
          <>
            <span className={styles.filterLabel}>상태</span>
            <FilterButton size="sm" selected={stateFilter === null} onClick={() => setStateFilter(null)}>전체 {here.length}</FilterButton>
            {STATES.map((s) => { const n = stateCount(s); return n > 0 ? <FilterButton key={s} size="sm" selected={stateFilter === s} onClick={() => setStateFilter(stateFilter === s ? null : s)}>{LABEL.contextState[s]} {n}</FilterButton> : null; })}
          </>
        )}
      </div>

      {rows.length === 0 ? (
        <Panel><EmptyState size="sm" icon="empty" title="비어 있습니다" /></Panel>
      ) : (
        <TableBox>
          <TableHeader columns={columns} variant="line" />
          {rows.map((r) =>
            r.type === "folder" ? (
              <TableRow<Row_>
                key={r.folder.id}
                variant="line"
                data={r}
                onClick={() => setFolderId(r.folder.id)}
                columns={columns.map((c) => ({ ...c, render: () => folderCell(c.key, r.folder) }))}
              />
            ) : (
              <TableRow<Row_>
                key={r.entry.id}
                variant="line"
                data={r}
                onClick={() => setOpen(r.entry)}
                draggable
                onDragStart={(ev: React.DragEvent) => { startDocDrag(r.entry.id); ev.dataTransfer.setData(DOC_MIME, r.entry.id); ev.dataTransfer.setData("text/plain", entryTitle(r.entry)); ev.dataTransfer.effectAllowed = "copyLink"; }}
                onDragEnd={() => endDocDrag()}
                columns={columns.map((c) => ({ ...c, render: () => entryCell(c.key, r.entry) }))}
              />
            ),
          )}
        </TableBox>
      )}

      {open && <KnowledgeDrawer entry={open} onClose={() => setOpen(null)} onAskAi={() => { setOpen(null); mentionDoc(open.id); }} />}
    </Page>
  );
}

function folderCell(key: string, f: KFolder) {
  switch (key) {
    case "name": return <Row tight style={{ flexWrap: "nowrap", minWidth: 0 }}><span className={styles.folderMark} aria-hidden /><span className={styles.folderName}>{f.name}</span></Row>;
    case "kind": return <Subtle>폴더</Subtle>;
    case "version": { const sub = kFolders.filter((x) => x.parentId === f.id).length; return <Subtle>{sub > 0 ? `폴더 ${sub} · ` : ""}문서 {kCountIn(f.id)}</Subtle>; }
    default: return <Subtle>—</Subtle>;
  }
}

function entryCell(key: string, e: KEntry) {
  const latest = (() => {
    if (e.type === "context" || e.type === "deliverable") return e.item.versions[e.item.versions.length - 1];
    return null;
  })();
  switch (key) {
    case "name": return <Row tight style={{ flexWrap: "nowrap", minWidth: 0 }}><FileIcon ext={kExt(e)} size="sm" /><span className={styles.ellipsis}>{entryTitle(e)}</span></Row>;
    case "kind":
      return <Badge size="sm" variant="soft">{e.type === "context" ? LABEL.contextKind[e.item.kind] : e.type === "deliverable" ? LABEL.deliverableKind[e.item.kind] : e.type === "run" ? "실행 결과" : e.type === "pattern" ? `${LABEL.patternKind[e.item.kind]} 패턴` : "템플릿"}</Badge>;
    case "state":
      if (e.type === "context") return <Badge size="sm" variant="soft" status={TONE.contextState[e.item.state]}>{LABEL.contextState[e.item.state]}</Badge>;
      if (e.type === "pattern") return <Badge size="sm" variant="soft" status={e.item.state === "published" ? "success" : e.item.state === "reviewed" ? "info" : e.item.state === "anonymized" ? "warning" : undefined}>{LABEL.patternState[e.item.state]}</Badge>;
      if (e.type === "deliverable") return <Subtle>v{e.item.versions.length}</Subtle>;
      if (e.type === "run") return <Badge size="sm" variant="soft" status={TONE.runState[e.item.state]}>{LABEL.runState[e.item.state]}</Badge>;
      return <Subtle>사용 {e.item.usedCount}회</Subtle>;
    case "origin": { const o = kOrigin(e); return <Subtle>{e.type === "context" ? `${o.label} · ${e.item.origin.by}` : o.label}</Subtle>; }
    case "author": {
      if (e.type === "run") return <Row tight><Icon name="waveform" size={12} /><Subtle>{e.item.agent}</Subtle></Row>;
      if (!latest) return <Subtle>—</Subtle>;
      const a = latest.author;
      return a.kind === "ai" ? <Row tight><Icon name="waveform" size={12} /><Subtle>{a.model}</Subtle></Row> : <Row tight><Avatar size="xs" name={getMember(a.memberId)?.name} /><span>{getMember(a.memberId)?.name}</span></Row>;
    }
    case "version": return e.type === "run" ? <Row tight><span>#{e.item.attempt}</span><Subtle>{fmtDate(e.item.startedAt)}</Subtle></Row> : latest ? <Row tight><span>v{latest.v}</span><Subtle>{fmtDate(latest.at)}</Subtle></Row> : <Subtle>—</Subtle>;
    case "source": {
      const o = kOrigin(e);
      if (o.url === "#") return <Subtle>—</Subtle>;
      return (
        <Tooltip content={`${o.label} 원본 열기`}>
          <IconButton size="sm" variant="ghost" icon={<Icon name="arrow-square-out" />} aria-label={`${o.label} 원본 열기`} onClick={(ev) => { ev.stopPropagation(); window.open(o.url, "_blank", "noopener"); }} />
        </Tooltip>
      );
    }
  }
}
