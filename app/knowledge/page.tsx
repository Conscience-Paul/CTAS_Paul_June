"use client";

/**
 * 지식 › 문서함 — 모든 문서의 집합소. 계약·문서와 같은 Finder 식 탐색.
 * 고객사 › 프로젝트 › (회의록·요구사항·의사결정·고객 문서·우리 문서·대화·변경·산출물),
 * 그리고 교차 프로젝트의 패턴 라이브러리·템플릿. 행(또는 사이드바 트리의 파일) 클릭 → 본문에 문서 뷰어.
 * 드래그 → AI 패널 멘션.
 */

import { useState } from "react";
import { Avatar, Badge, Button, EmptyState, FileIcon, FilterButton, Icon, IconButton, Input, TableHeader, TableRow } from "@/components/ctas/ctds";
import { Page, PageHeader, Panel, Row, Subtle, TableBox } from "@/components/ctas/ui";
import {
  LABEL,
  deployTargetOf,
  findDocLike,
  findKEntry,
  fmtDate,
  getMember,
  kCountIn,
  kEntriesIn,
  kExt,
  kFolderPath,
  kFolders,
  kOrigin,
  type ContextVersion,
  type KEntry,
  type KFolder,
} from "@/lib/mock";
import { DOC_MIME, endDocDrag, startDocDrag } from "@/lib/drag";
import { usePreview } from "@/lib/preview-state";
import { DeployLink } from "@/components/ctas/DocVersions";
import { KnowledgeDrawer, entryTitle } from "./_shared";
import styles from "./knowledge-fs.module.css";

const COLUMNS = [
  { key: "name", label: "이름", flex: true, minWidth: 300 },
  { key: "kind", label: "종류", width: 110 },
  { key: "state", label: "상태", width: 210 },
  { key: "author", label: "최근 작성", width: 150 },
  { key: "version", label: "수정", width: 100 },
  { key: "source", label: "원본", width: 220 },
];

type Row_ = { type: "folder"; folder: KFolder } | { type: "entry"; entry: KEntry };

/** 문서함의 상태 = 버전 상태. 최신이 draft 인지(승인 전) 배포됨인지 + 번호·시각·작성자 */
type VStat = { v: number; draft: boolean; at: string; author: ContextVersion["author"] };
type StatFilter = "draft" | "deployed";

export default function KnowledgeLibraryPage() {
  // 현재 폴더·열린 문서는 사이드바 트리와 공유
  const { mentionDoc, kFolderId: folderId, setKFolderId, openDocId, setOpenDocId, drafts, extraVersions } = usePreview();
  const setFolderId = (id: string | null) => { setKFolderId(id); setOpenDocId(null); };
  const [stateFilter, setStateFilter] = useState<StatFilter | null>(null);

  const statOf = (e: KEntry): VStat => {
    // 실행 결과: 시도 번호가 버전. 제출됨 = 검토 대기(draft), 승인됨 = 배포됨
    if (e.type === "run") return { v: e.item.attempt, draft: e.item.state === "submitted", at: e.item.startedAt, author: { kind: "ai", model: "Nora" } };
    const vs = [...(findDocLike(e.id)?.versions ?? []), ...(extraVersions[e.id] ?? [])];
    const d = drafts[e.id];
    if (d) return { v: vs.length + 1, draft: true, at: d.at, author: d.author };
    const last = vs[vs.length - 1];
    return { v: vs.length, draft: false, at: last?.at ?? "", author: last?.author ?? { kind: "ai", model: "Nora" } };
  };
  const open = openDocId ? findKEntry(openDocId)?.entry : undefined;

  if (open) {
    return (
      <Page wide>
        <KnowledgeDrawer key={open.id} entry={open} inline onClose={() => setOpenDocId(null)} onAskAi={() => mentionDoc(open.id)} />
      </Page>
    );
  }

  const path = folderId ? kFolderPath(folderId) : [];
  const subfolders = kFolders.filter((f) => f.parentId === folderId);
  const here = kEntriesIn(folderId);
  const matches = (e: KEntry, f: StatFilter) => statOf(e).draft === (f === "draft");
  const entries = here.filter((e) => !stateFilter || matches(e, stateFilter));
  const rows: Row_[] = [...subfolders.map((f) => ({ type: "folder", folder: f }) as Row_), ...entries.map((e) => ({ type: "entry", entry: e }) as Row_)];
  // 컨텍스트 종류(회의록·요구사항…)는 폴더 이름과 같으니, 다른 종류가 섞인 폴더에서만 종류 칸을 보인다
  const columns = here.some((e) => e.type !== "context") ? COLUMNS : COLUMNS.filter((c) => c.key !== "kind");
  const goUp = () => setFolderId(path.length >= 2 ? path[path.length - 2].id : null);
  const stateCount = (f: StatFilter) => here.filter((e) => matches(e, f)).length;

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
        {here.length > 0 && (
          <>
            <span className={styles.filterLabel}>상태</span>
            <FilterButton size="sm" selected={stateFilter === null} onClick={() => setStateFilter(null)}>전체 {here.length}</FilterButton>
            {(["draft", "deployed"] as const).map((s) => { const n = stateCount(s); return n > 0 ? <FilterButton key={s} size="sm" selected={stateFilter === s} onClick={() => setStateFilter(stateFilter === s ? null : s)}>{s === "draft" ? "draft" : "배포됨"} {n}</FilterButton> : null; })}
          </>
        )}
      </div>

      {rows.length === 0 ? (
        <Panel><EmptyState size="sm" icon="empty" title="비어 있습니다" /></Panel>
      ) : (
        // 폴더에 따라 종류 칸이 생기고 빠지므로, 칸 구성이 바뀌면 표를 새로 그린다 (머리글이 칸 순서를 기억해 어긋나지 않게)
        <TableBox key={columns.map((c) => c.key).join(",")}>
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
                onClick={() => setOpenDocId(r.entry.id)}
                draggable
                onDragStart={(ev: React.DragEvent) => { startDocDrag(r.entry.id); ev.dataTransfer.setData(DOC_MIME, r.entry.id); ev.dataTransfer.setData("text/plain", entryTitle(r.entry)); ev.dataTransfer.effectAllowed = "copyLink"; }}
                onDragEnd={() => endDocDrag()}
                columns={columns.map((c) => ({ ...c, render: () => entryCell(c.key, r.entry, statOf(r.entry)) }))}
              />
            ),
          )}
        </TableBox>
      )}
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

function entryCell(key: string, e: KEntry, st: VStat) {
  switch (key) {
    case "name": return <Row tight style={{ flexWrap: "nowrap", minWidth: 0 }}><FileIcon ext={kExt(e)} size="sm" /><span className={styles.ellipsis}>{entryTitle(e)}</span></Row>;
    case "kind":
      return <Badge size="sm" variant="soft">{e.type === "context" ? LABEL.contextKind[e.item.kind] : e.type === "deliverable" ? LABEL.deliverableKind[e.item.kind] : e.type === "run" ? "실행 결과" : e.type === "pattern" ? `${LABEL.patternKind[e.item.kind]} 패턴` : "템플릿"}</Badge>;
    case "state":
      // 배포됨이면 어디에 배포됐는지(Google Docs·Notion …) 링크까지
      return (
        <Row tight style={{ flexWrap: "nowrap" }}>
          <span>v{st.v}</span>
          <Badge size="sm" variant="soft" status={st.draft ? "warning" : "success"}>{st.draft ? "draft" : "배포됨"}</Badge>
          {!st.draft && <DeployLink target={deployTargetOf(e)} />}
        </Row>
      );
    case "author": {
      // AI 작성자는 모델·에이전트 이름 없이 "Nora" 로만
      const a = st.author;
      return a.kind === "ai" ? <Row tight><Icon name="waveform" size={12} /><Subtle>Nora</Subtle></Row> : <Row tight><Avatar size="xs" name={getMember(a.memberId)?.name} /><span>{getMember(a.memberId)?.name}</span></Row>;
    }
    case "version": return st.at ? <Subtle>{fmtDate(st.at)}</Subtle> : <Subtle>—</Subtle>;
    case "source": {
      // 출처 + 원본 링크를 한 칸에 — 누르면 원본이 새 탭으로
      const o = kOrigin(e);
      const label = e.type === "context" ? `${o.label} · ${e.item.origin.by}` : o.label;
      if (o.url === "#") return <Subtle>{label}</Subtle>;
      return (
        <a href={o.url} target="_blank" rel="noopener" className={styles.sourceLink} title={`${label} — 원본 열기`} onClick={(ev) => ev.stopPropagation()}>
          <Icon name="arrow-square-out" size={12} />
          <span className={styles.ellipsis}>{label}</span>
        </a>
      );
    }
  }
}
