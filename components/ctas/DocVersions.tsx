"use client";

/**
 * 문서 버전 흐름 — 지식 문서함 · 계약문서 뷰어 공용.
 *
 *   v21 (배포됨 — 배포 위치: Google Docs·Notion 등, 링크로 표시)
 *     └ 수정(사람·Nora) → v22 draft   … 문서당 하나, 다시 고치면 덮어씀. 배포 위치엔 아직 v21
 *         └ 승인(누구나, 보안 문서는 관리자) → v22 확정 + 배포
 *             쓰기 가능한 원본이면 그 문서를 덮어쓰기, 아니면 지식 폴더 구조 그대로 Google Docs 에
 *   원본을 사람이 직접 고치면 → 수집되어 새 확정 버전으로 들어오고 draft 는 그대로.
 */

import { useState, type ReactNode } from "react";
import { Badge, Button, Callout, FilterButton, Icon, IconButton, Tooltip, useToast } from "@/components/ctas/ctds";
import { Panel, Prose, Row, Subtle } from "@/components/ctas/ui";
import { DiffView } from "@/components/ctas/DiffView";
import { BasisChips, VersionRail, authorLabel, useVersions } from "@/components/ctas/VersionRail";
import { fmtDateTime, type ContextVersion, type DeployTarget } from "@/lib/mock";
import { usePreview } from "@/lib/preview-state";
import styles from "./DocVersions.module.css";

/** 배포 위치 링크 — "Google Docs ↗". 문서 상태 배지·목록이 공유 */
export function DeployLink({ target }: { target: DeployTarget }) {
  return (
    <a href={target.url} target="_blank" rel="noopener" className={styles.deployLink} title={`${target.service} — ${target.where}`} onClick={(e) => e.stopPropagation()}>
      {target.service}
      <Icon name="arrow-square-out" size={12} />
    </a>
  );
}

/** latestPending — 최신 버전 자체가 아직 승인 전(예: 실행 결과 "제출됨")이면 draft 로 표시 */
export function useDocVersions(docId: string, base: ContextVersion[], target: DeployTarget, latestPending = false) {
  const { toast } = useToast();
  const { drafts, saveDraft, discardDraft, publishDraft } = usePreview();
  const versions = useVersions(docId, base);
  const draft = drafts[docId];
  const draftV = versions.length + 1;
  const topV = draft ? draftV : versions.length;

  /** 본문을 그대로 볼지, 이전 버전과의 diff 로 볼지. draft 가 있으면 최신 버전과의 diff 가 기본 */
  const [mode, setMode] = useState<"doc" | "diff">(draft ? "diff" : "doc");

  // draft 가 생기거나 승인되면 맨 위 버전을 다시 보여준다 (draft 면 diff 로)
  const [selected, setSelected] = useState(topV);
  const [seen, setSeen] = useState(topV);
  if (seen !== topV) { setSeen(topV); setSelected(topV); setMode(draft ? "diff" : "doc"); }

  const isDraft = !!draft && selected === draftV;
  const ver: ContextVersion & { draft?: boolean } = isDraft
    ? { ...draft, v: draftV, draft: true }
    : versions.find((v) => v.v === selected) ?? versions[versions.length - 1];
  const prev = isDraft ? versions[versions.length - 1] : versions.find((v) => v.v === ver.v - 1);

  // 확정 버전이 하나도 없으면 아직 배포된 적 없는 새 문서 — 첫 승인 때 배포 위치에 파일이 생긴다
  const dest = target;
  const isNew = versions.length === 0;

  /** 수정 저장 — 확정 버전이 아니라 draft 로 */
  const save = (d: Omit<ContextVersion, "v">) => {
    saveDraft(docId, d);
    toast({ title: `v${draftV} draft 저장됨`, description: `승인하면 ${dest.service} 에 배포됩니다.`, tone: "neutral" });
  };
  const approve = () => {
    publishDraft(docId, dest.where);
    toast({
      title: `v${draftV} 승인 · 배포됨`,
      description: isNew ? `${dest.service} 에 새로 만듦 — ${dest.where}` : `${dest.service} — ${dest.where} · v${draftV} 로 덮어씀`,
      tone: "success",
    });
  };
  const discard = () => {
    discardDraft(docId);
    toast({ title: `v${draftV} draft 폐기`, description: `확정 버전은 v${versions.length} 그대로입니다.`, tone: "neutral" });
  };

  return { versions, draft, draftV, selected, setSelected, mode, setMode, ver, prev, latestPending, isLatest: selected === topV, editBase: draft?.body ?? versions[versions.length - 1]?.body ?? "", dest, isNew, save, approve, discard };
}

type Flow = ReturnType<typeof useDocVersions>;

/** 지금 보고 있는 버전의 상태 — draft / 배포됨(배포 위치 링크) / 이전 버전 */
export function VersionStatus({ flow }: { flow: Flow }) {
  if (flow.ver.draft) return <Badge size="sm" variant="soft" status="warning">draft · 미배포</Badge>;
  if (flow.latestPending && flow.ver.v === flow.versions.length) return <Badge size="sm" variant="soft" status="warning">draft · 검토 대기</Badge>;
  if (flow.ver.v === flow.versions.length) return <Row tight><Badge size="sm" variant="soft" status="success">배포됨</Badge><DeployLink target={flow.dest} /></Row>;
  return <Badge size="sm" variant="soft">이전 버전</Badge>;
}

/** 본문 위 배너 — draft 가 있을 때만 */
export function DraftBanner({ flow, onCompare }: { flow: Flow; onCompare: () => void }) {
  if (!flow.draft) return null;
  const live = flow.versions.length;
  return (
    <Callout
      tone="warning"
      variant="outline"
      icon="warning-circle"
      title={`업데이트 있음 — v${flow.draftV} draft`}
      actionsPlacement="right"
      actions={
        <>
          <Button size="sm" variant="ghost" onClick={onCompare}>변경 비교</Button>
          <Button size="sm" variant="ghost" onClick={flow.discard}>폐기</Button>
          <Button size="sm" variant="primary" onClick={flow.approve}>승인하고 배포</Button>
        </>
      }
    >
      {flow.isNew
        ? <>아직 배포된 적 없음 — 승인하면 {flow.dest.service} 에 새로 만듭니다: {flow.dest.where}</>
        : <><DeployLink target={flow.dest} /> 에는 아직 v{live} — 승인하면 v{flow.draftV} 로 덮어씁니다.</>}
    </Callout>
  );
}

/**
 * 문서 작업 영역 — 왼쪽 버전 목록(v1, v2 … draft), 오른쪽 위 상태·근거·메타정보,
 * 그 아래 [문서 | 변경 비교] 중 고른 방식으로 본문. 편집 중이면 오른쪽이 에디터.
 */
export function DocWorkspace({ flow, meta, editor }: { flow: Flow; meta?: ReactNode; editor?: ReactNode }) {
  const { ver, prev } = flow;
  // 버전 목록: 펼치면 요약·작성자까지, 접으면 번호만 (본문을 넓게)
  const [railOpen, setRailOpen] = useState(true);
  // 근거 칩을 누르면 페이지 이동 대신 화면 오른쪽 사이드 패널(AppShell)에 그 문서를 띄운다
  const { setPeekDocId } = usePreview();
  const numbers = [...(flow.draft ? [flow.draftV] : []), ...flow.versions.map((v) => v.v).sort((a, b) => b - a)];
  return (
    <div className={styles.split}>
      <div className={styles.rail} data-collapsed={!railOpen || undefined}>
        <div className={styles.railHead}>
          {railOpen && <span>버전 {flow.versions.length}{flow.draft ? " + draft" : ""}</span>}
          {railOpen && (
            <Tooltip content="버전은 불변 — 수정은 draft 로 쌓이고, 승인하면 다음 버전으로 확정됩니다.">
              <span className={styles.railHint} aria-label="버전 규칙"><Icon name="info" size={12} /></span>
            </Tooltip>
          )}
          <Tooltip content={railOpen ? "간단히 보기" : "자세히 보기"}>
            <IconButton size="sm" variant="ghost" className={styles.railToggle} icon={<Icon name={railOpen ? "caret-left" : "caret-right"} />} aria-label={railOpen ? "버전 목록 간단히 보기" : "버전 목록 자세히 보기"} onClick={() => setRailOpen(!railOpen)} />
          </Tooltip>
        </div>
        {railOpen ? (
          <VersionRail versions={flow.versions} selected={flow.selected} onSelect={flow.setSelected} draft={flow.draft} deployed={!flow.latestPending} compact />
        ) : (
          <div className={styles.railMini} role="listbox" aria-label="버전">
            {numbers.map((n) => {
              const isDraft = !!flow.draft && n === flow.draftV;
              return (
                <button key={n} type="button" role="option" aria-selected={flow.selected === n} data-active={flow.selected === n || undefined} data-draft={isDraft || undefined} className={styles.miniItem} onClick={() => flow.setSelected(n)}>
                  v{n}{isDraft && <span className={styles.miniDraft}>draft</span>}
                </button>
              );
            })}
          </div>
        )}
      </div>
      <div className={styles.main}>
        {editor ?? (
          <>
            <div className={styles.toolbar}>
              <Row tight>
                <VersionStatus flow={flow} />
                <Subtle>v{ver.v} · {authorLabel(ver.author)} · {fmtDateTime(ver.at)}</Subtle>
                {!flow.isLatest && <Button size="xs" variant="ghost" onClick={() => flow.setSelected(flow.draft ? flow.draftV : flow.versions.length)}>최신으로</Button>}
              </Row>
              <Row tight>
                <FilterButton size="sm" selected={flow.mode === "doc"} onClick={() => flow.setMode("doc")}>문서</FilterButton>
                <FilterButton size="sm" selected={flow.mode === "diff"} onClick={() => flow.setMode("diff")}>변경 비교</FilterButton>
              </Row>
            </div>
            <BasisChips ids={ver.basedOn} onOpen={setPeekDocId} />
            {meta}
            {flow.mode === "diff" ? (
              <DiffView
                before={prev?.body ?? ""}
                after={ver.body}
                beforeLabel={prev ? `v${prev.v}` : "첫 버전 — 이전 버전 없음"}
                afterLabel={`v${ver.v}${ver.draft ? " · draft" : ""}`}
              />
            ) : (
              <Panel subtle><Prose text={ver.body} /></Panel>
            )}
          </>
        )}
      </div>
    </div>
  );
}
