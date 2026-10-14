"use client";

/**
 * VersionRail — ContextItem / Deliverable 공용 버전 레일.
 * 목 버전 + 프리뷰 상태(extraVersions)에서 추가된 버전을 합쳐 보여준다.
 * 선택은 부모가 관리(controlled) — 본문 패널이 같은 버전을 보여줘야 하므로.
 * draft 를 넘기면 맨 위에 "vN+1 · draft" 로 붙는다 (승인 전, Drive 미반영).
 */

import { Badge, Chip, Icon } from "@/components/ctas/ctds";
import { fmtDateTime, getContext, getDeliverable, getMember, hrefFor, type ContextVersion } from "@/lib/mock";
import { usePreview } from "@/lib/preview-state";
import Link from "next/link";
import styles from "./VersionRail.module.css";

/** 목 + 프리뷰 추가 버전을 합친 목록. 번호는 이어 붙인다. */
export function useVersions(ownerId: string, base: ContextVersion[]) {
  const { extraVersions } = usePreview();
  const extra = (extraVersions[ownerId] ?? []).map((v, i) => ({ ...v, v: base.length + i + 1, _new: true as const }));
  return [...base.map((v) => ({ ...v, _new: false as const })), ...extra];
}

export function authorLabel(a: ContextVersion["author"]) {
  // AI 는 모델명 없이 "Nora" 로만 표시
  return a.kind === "ai" ? "Nora" : getMember(a.memberId)?.name ?? a.memberId;
}

export function VersionRail({
  versions,
  selected,
  onSelect,
  draft,
  deployed,
  compact,
}: {
  versions: (ContextVersion & { _new?: boolean })[];
  selected: number;
  onSelect: (v: number) => void;
  /** 승인 전 draft — 맨 위에 다음 번호로 붙는다 */
  draft?: Omit<ContextVersion, "v">;
  /** 배포 흐름(draft → 승인) 문서 — 최신 확정 버전은 당연히 배포됨이라 "최신" 배지를 생략 */
  deployed?: boolean;
  /** 근거 칩 생략 — 선택 버전의 근거를 옆 본문 위에서 따로 보여줄 때 */
  compact?: boolean;
}) {
  const sorted = [...versions].sort((a, b) => b.v - a.v);
  const draftV = versions.length + 1;
  return (
    <div className={styles.root} role="listbox" aria-label="버전">
      {draft && (
        <button
          type="button"
          role="option"
          aria-selected={draftV === selected}
          data-active={draftV === selected || undefined}
          className={[styles.item, styles.new].join(" ")}
          onClick={() => onSelect(draftV)}
        >
          {/* draft 는 번호 없음 — 승인돼야 다음 번호가 붙는다 */}
          <span className={[styles.v, styles.vDraft].join(" ")}>draft</span>
          <span className={styles.body}>
            <span className={styles.summary}>{draft.summary}</span>
            <span className={styles.meta}>
              {draft.author.kind === "ai" ? <Icon name="waveform" size={12} /> : <Icon name="user" size={12} />}
              {authorLabel(draft.author)}
              <span>·</span>
              {fmtDateTime(draft.at)}
            </span>
          </span>
        </button>
      )}
      {sorted.map((ver) => (
        <button
          key={ver.v}
          type="button"
          role="option"
          aria-selected={ver.v === selected}
          data-active={ver.v === selected || undefined}
          className={[styles.item, ver._new ? styles.new : ""].join(" ")}
          onClick={() => onSelect(ver.v)}
        >
          <span className={styles.v}>v{ver.v}</span>
          <span className={styles.body}>
            <span className={styles.summary}>{ver.summary}</span>
            <span className={styles.meta}>
              {ver.author.kind === "ai" ? <Icon name="waveform" size={12} /> : <Icon name="user" size={12} />}
              {authorLabel(ver.author)}
              <span>·</span>
              {fmtDateTime(ver.at)}
              {/* 배포 흐름에선 최신 = 당연히 배포됨이라 배지 생략, draft 만 표시 */}
              {ver.v === sorted[0].v && !deployed && <Badge size="sm" variant="soft" status="info">최신</Badge>}
            </span>
            {!compact && ver.basedOn.length > 0 && (
              <BasisChips ids={ver.basedOn} />
            )}
          </span>
        </button>
      ))}
    </div>
  );
}

/** 버전의 근거 — "근거 [칩…]". 버전 레일과 문서 내용 상단이 공유 */
export function BasisChips({ ids, onOpen }: { ids: string[]; /** 있으면 페이지 이동 대신 옆에 띄운다 */ onOpen?: (id: string) => void }) {
  if (ids.length === 0) return null;
  return (
    <span className={styles.basedOn}>
      <span className={styles.basedOnLabel}>근거</span>
      {ids.map((id) => {
        const label = getContext(id)?.title ?? getDeliverable(id)?.title ?? id;
        const href = hrefFor(id);
        return onOpen ? (
          <button key={id} type="button" className={styles.basisBtn} onClick={(e) => { e.stopPropagation(); onOpen(id); }}>
            <Chip size="sm" variant="outline" leftIcon={<Icon name="sidebar-simple" size={10} />}>{label}</Chip>
          </button>
        ) : href ? (
          <Link key={id} href={href} onClick={(e) => e.stopPropagation()}>
            <Chip size="sm" variant="outline" leftIcon={<Icon name="arrow-square-out" size={10} />}>
              {label}
            </Chip>
          </Link>
        ) : (
          <Chip key={id} size="sm" variant="outline">{label}</Chip>
        );
      })}
    </span>
  );
}
