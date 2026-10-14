"use client";

/**
 * 지식 사이드바 — 에디터 탐색기처럼 문서함 전체를 폴더·파일 트리로 보여준다. (패널 자체가 문서함)
 *   <고객사> › <프로젝트> › 회의록·요구사항·… (파일)
 *   패턴 라이브러리 · 템플릿
 *   계약문서   ← 보안. 모두에게 보이지만 펼치고 여는 건 관리자만
 * 폴더 클릭 → 본문이 그 폴더 목록, 파일 클릭 → 본문에 문서 뷰어.
 * 폴더에 마우스를 올리면 + → 파일 업로드 · 새 문서 · 새 폴더. 새 항목은 이름을 바로 입력(Enter 확정 / Esc 취소).
 *   추가분은 프리뷰 로컬 상태 — 업로드 파일은 "전처리 대기"로 표시된다.
 */

import { usePathname, useRouter } from "next/navigation";
import { useRef, useState, type CSSProperties, type ReactNode } from "react";
import { DropdownMenu, FileIcon, Icon, useToast } from "@/components/ctas/ctds";
import { entryTitle } from "@/app/knowledge/_shared";
import { contracts, docFolders, findKEntry, folderPath, kEntriesIn, kExt, kFolderPath, kFolders } from "@/lib/mock";
import { usePreview } from "@/lib/preview-state";
import styles from "./DocTree.module.css";

const CONTRACTS = "contracts";

/** 트리에서 새로 만든 항목 (프리뷰 로컬) */
interface Added {
  id: string;
  parentId: string;
  kind: "folder" | "doc" | "upload";
  name: string;
  ext: string;
}
type Creating = { parentId: string; kind: "folder" | "doc" } | null;

const extOf = (name: string) => (name.includes(".") ? name.split(".").pop()!.toLowerCase() : "md");

function TreeRow({ depth, label, icon, active, expanded, muted, badge, actions, onClick, onToggle }: { depth: number; label: string; icon: ReactNode; active?: boolean; expanded?: boolean; muted?: boolean; badge?: string; actions?: ReactNode; onClick: () => void; onToggle?: () => void }) {
  return (
    <div className={styles.row} style={{ "--depth": depth } as CSSProperties} data-active={active || undefined} data-muted={muted || undefined}>
      {onToggle ? (
        <button type="button" className={styles.caret} aria-label={expanded ? `${label} 접기` : `${label} 펼치기`} aria-expanded={expanded} onClick={onToggle}>
          <Icon name={expanded ? "caret-down" : "caret-right"} size={12} />
        </button>
      ) : (
        <span className={styles.caret} aria-hidden />
      )}
      <button type="button" className={styles.label} onClick={onClick} title={label}>
        {icon}
        <span className={styles.name}>{label}</span>
        {badge && <span className={styles.badge}>{badge}</span>}
      </button>
      {actions && <span className={styles.actions}>{actions}</span>}
    </div>
  );
}

/** 새 문서·폴더 이름 입력 줄 — Enter 확정, Esc·빈 값 취소 */
function NameInput({ depth, kind, onDone }: { depth: number; kind: "folder" | "doc"; onDone: (name: string | null) => void }) {
  const [v, setV] = useState("");
  return (
    <div className={styles.row} style={{ "--depth": depth } as CSSProperties} data-editing>
      <span className={styles.caret} aria-hidden />
      <span className={styles.label}>
        {kind === "folder" ? <span className={styles.folder} aria-hidden /> : <FileIcon ext="md" size="sm" />}
        <input
          autoFocus
          className={styles.nameInput}
          value={v}
          placeholder={kind === "folder" ? "새 폴더 이름" : "새 문서 제목"}
          aria-label={kind === "folder" ? "새 폴더 이름" : "새 문서 제목"}
          onChange={(e) => setV(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") onDone(v.trim() || null);
            if (e.key === "Escape") onDone(null);
          }}
          onBlur={() => onDone(v.trim() || null)}
        />
      </span>
    </div>
  );
}

export function DocTree() {
  const router = useRouter();
  const pathname = usePathname() ?? "/";
  const { role, kFolderId, setKFolderId, contractFolderId, setContractFolderId, openDocId, setOpenDocId } = usePreview();
  const isAdmin = role === "admin";
  const onContracts = pathname.startsWith("/knowledge/contracts");
  const onKnowledge = !onContracts && (pathname === "/knowledge" || pathname === "/knowledge/");

  const { toast } = useToast();
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const [added, setAdded] = useState<Added[]>([]);
  const [creating, setCreating] = useState<Creating>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const uploadTo = useRef<string | null>(null);
  const seq = useRef(0);
  const toggle = (id: string) => setExpanded((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const expand = (ids: string[]) => setExpanded((s) => (ids.every((id) => s.has(id)) ? s : new Set([...s, ...ids])));

  // 본문에서 폴더를 옮기거나 문서를 열면 트리도 그 위치까지 펼친다
  const contractDoc = openDocId ? contracts.find((c) => c.id === openDocId) : undefined;
  const focus = onContracts
    ? [CONTRACTS, ...folderPath(contractDoc?.folderId ?? contractFolderId ?? "").map((f) => f.id)]
    : onKnowledge
      ? kFolderPath((openDocId && findKEntry(openDocId)?.folderId) || kFolderId || "").map((f) => f.id)
      : [];
  const focusKey = `${pathname}|${focus.join(",")}`;
  const [seenFocus, setSeenFocus] = useState("");
  if (seenFocus !== focusKey) {
    setSeenFocus(focusKey);
    if (focus.length > 0 && (isAdmin || !onContracts)) expand(focus);
  }

  const goKnowledge = (folderId: string | null, docId: string | null = null) => {
    setKFolderId(folderId);
    setOpenDocId(docId);
    if (!onKnowledge) router.push("/knowledge");
  };
  const goContracts = (folderId: string | null, docId: string | null = null) => {
    setContractFolderId(folderId);
    setOpenDocId(docId);
    if (!onContracts) router.push("/knowledge/contracts");
  };

  const folderIcon = <span className={styles.folder} aria-hidden />;

  /* ── 추가: 파일 업로드 · 새 문서 · 새 폴더 ── */
  const newId = () => `add-${++seq.current}`;
  const startUpload = (parentId: string) => { uploadTo.current = parentId; fileRef.current?.click(); };
  const onFiles = (files: FileList | null) => {
    const parentId = uploadTo.current;
    if (!files?.length || !parentId) return;
    setAdded((a) => [...a, ...[...files].map((f) => ({ id: newId(), parentId, kind: "upload" as const, name: f.name, ext: extOf(f.name) }))]);
    expand([parentId]);
    toast({ title: `${files.length}개 파일 업로드됨`, description: "Nora 전처리 후 문서함에서 열 수 있습니다.", tone: "success" });
    if (fileRef.current) fileRef.current.value = "";
  };
  const startCreate = (parentId: string, kind: "folder" | "doc") => { setCreating({ parentId, kind }); expand([parentId]); };
  const finishCreate = (name: string | null) => {
    if (creating && name) {
      const item: Added = { id: newId(), parentId: creating.parentId, kind: creating.kind, name, ext: "md" };
      setAdded((a) => [...a, item]);
      toast({ title: creating.kind === "folder" ? `폴더 "${name}" 생성` : `문서 "${name}" 생성`, tone: "success" });
    }
    setCreating(null);
  };

  const addMenu = (parentId: string, label: string) => (
    <DropdownMenu>
      <DropdownMenu.Trigger asChild>
        <button type="button" className={styles.action} aria-label={`${label}에 추가`} title="추가">
          <Icon name="plus" size={12} />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Content align="start">
        <DropdownMenu.Item leadingActions={[<Icon key="u" name="upload-simple" />]} onSelect={() => startUpload(parentId)}>파일 업로드…</DropdownMenu.Item>
        <DropdownMenu.Item leadingActions={[<Icon key="d" name="article" />]} onSelect={() => startCreate(parentId, "doc")}>새 문서</DropdownMenu.Item>
        <DropdownMenu.Item leadingActions={[<Icon key="f" name="stack" />]} onSelect={() => startCreate(parentId, "folder")}>새 폴더</DropdownMenu.Item>
      </DropdownMenu.Content>
    </DropdownMenu>
  );

  /** 이 폴더 아래에 새로 만든 항목 + 이름 입력 줄 */
  const addedUnder = (parentId: string, depth: number): ReactNode => (
    <>
      {creating?.parentId === parentId && <NameInput key="creating" depth={depth} kind={creating.kind} onDone={finishCreate} />}
      {added.filter((a) => a.parentId === parentId).map((a) =>
        a.kind === "folder" ? (
          <div key={a.id}>
            <TreeRow
              depth={depth}
              label={a.name}
              icon={folderIcon}
              expanded={expanded.has(a.id)}
              actions={addMenu(a.id, a.name)}
              onToggle={added.some((x) => x.parentId === a.id) ? () => toggle(a.id) : undefined}
              onClick={() => toggle(a.id)}
            />
            {expanded.has(a.id) && addedUnder(a.id, depth + 1)}
          </div>
        ) : (
          <TreeRow
            key={a.id}
            depth={depth}
            label={a.name}
            icon={<FileIcon ext={a.ext} size="sm" />}
            badge={a.kind === "upload" ? "전처리 대기" : "새 문서"}
            onClick={() => toast({ title: a.name, description: a.kind === "upload" ? "Nora 가 전처리 중입니다. 끝나면 열 수 있어요." : "빈 문서입니다. 편집기는 다음 단계에서 연결됩니다." })}
          />
        ),
      )}
    </>
  );

  const knowledgeFolder = (id: string, depth: number): ReactNode => {
    const f = kFolders.find((x) => x.id === id)!;
    const subs = kFolders.filter((x) => x.parentId === id);
    const files = kEntriesIn(id);
    const isOpen = expanded.has(id);
    return (
      <div key={id}>
        <TreeRow
          depth={depth}
          label={f.name}
          icon={folderIcon}
          expanded={isOpen}
          active={onKnowledge && !openDocId && kFolderId === id}
          actions={addMenu(id, f.name)}
          onToggle={subs.length + files.length > 0 || added.some((a) => a.parentId === id) ? () => toggle(id) : undefined}
          onClick={() => { goKnowledge(id); expand([id]); }}
        />
        {isOpen && (
          <>
            {addedUnder(id, depth + 1)}
            {subs.map((s) => knowledgeFolder(s.id, depth + 1))}
            {files.map((e) => (
              <TreeRow
                key={e.id}
                depth={depth + 1}
                label={entryTitle(e)}
                icon={<FileIcon ext={kExt(e)} size="sm" />}
                active={onKnowledge && openDocId === e.id}
                onClick={() => goKnowledge(id, e.id)}
              />
            ))}
          </>
        )}
      </div>
    );
  };

  const contractFolder = (id: string, depth: number): ReactNode => {
    const f = docFolders.find((x) => x.id === id)!;
    const subs = docFolders.filter((x) => x.parentId === id);
    const files = contracts.filter((c) => c.folderId === id);
    const isOpen = expanded.has(id);
    return (
      <div key={id}>
        <TreeRow
          depth={depth}
          label={f.name}
          icon={folderIcon}
          expanded={isOpen}
          active={onContracts && !openDocId && contractFolderId === id}
          actions={addMenu(id, f.name)}
          onToggle={subs.length + files.length > 0 || added.some((a) => a.parentId === id) ? () => toggle(id) : undefined}
          onClick={() => { goContracts(id); expand([id]); }}
        />
        {isOpen && (
          <>
            {addedUnder(id, depth + 1)}
            {subs.map((s) => contractFolder(s.id, depth + 1))}
            {files.map((c) => (
              <TreeRow
                key={c.id}
                depth={depth + 1}
                label={c.title}
                icon={<FileIcon ext={c.ext} size="sm" />}
                active={onContracts && openDocId === c.id}
                onClick={() => goContracts(id, c.id)}
              />
            ))}
          </>
        )}
      </div>
    );
  };

  const contractsOpen = isAdmin && expanded.has(CONTRACTS);

  return (
    <nav className={styles.tree} aria-label="문서함">
      <input ref={fileRef} type="file" multiple hidden onChange={(e) => onFiles(e.target.files)} />
      {kFolders.filter((f) => f.parentId === null).map((f) => knowledgeFolder(f.id, 0))}
      <TreeRow
        depth={0}
        label="계약문서"
        icon={<Icon name="eye-slash" size={16} />}
        muted={!isAdmin}
        expanded={contractsOpen}
        active={onContracts && !openDocId && contractFolderId === null}
        onToggle={isAdmin ? () => toggle(CONTRACTS) : undefined}
        onClick={() => { goContracts(null); if (isAdmin) expand([CONTRACTS]); }}
      />
      {contractsOpen && docFolders.filter((f) => f.parentId === null).map((f) => contractFolder(f.id, 1))}
    </nav>
  );
}
