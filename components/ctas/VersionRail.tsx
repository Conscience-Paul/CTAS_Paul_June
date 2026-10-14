"use client";

/**
 * VersionRail — ContextItem / Deliverable 공용 버전 레일.
 * 목 버전 + 프리뷰 상태(extraVersions)에서 추가된 버전을 합쳐 보여준다.
 * 선택은 부모가 관리(controlled) — 본문 패널이 같은 버전을 보여줘야 하므로.
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
  return a.kind === "ai" ? a.model : getMember(a.memberId)?.name ?? a.memberId;
}

export function VersionRail({
  versions,
  selected,
  onSelect,
}: {
  versions: (ContextVersion & { _new?: boolean })[];
  selected: number;
  onSelect: (v: number) => void;
}) {
  const sorted = [...versions].sort((a, b) => b.v - a.v);
  return (
    <div className={styles.root} role="listbox" aria-label="버전">
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
              {ver.v === sorted[0].v && <Badge size="sm" variant="soft" status="info">최신</Badge>}
            </span>
            {ver.basedOn.length > 0 && (
              <span className={styles.basedOn}>
                {ver.basedOn.map((id) => {
                  const label = getContext(id)?.title ?? getDeliverable(id)?.title ?? id;
                  const href = hrefFor(id);
                  return href ? (
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
            )}
          </span>
        </button>
      ))}
    </div>
  );
}
