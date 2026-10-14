"use client";

/**
 * 홈 › 타임라인 띠 — 가로 한 줄: 지난 일 · 지금 · 다가오는 마일스톤.
 * 사건이 많으면 띠를 잡고 좌우로 끌어 넘긴다(트랙패드 가로 스크롤도). 처음엔 "지금" 이후는 하나만 보인다.
 * 아래 승인 목록이 전체 폭을 쓰도록 얇게. → 는 운영 › 타임라인 페이지.
 * 사건은 알림이 아니라 실제 기록(업무 진행 · 문서 버전 · 리스크 감지) — activity.ts
 */

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ctas/ctds";
import { daysUntil, fmtDate, milestones } from "@/lib/mock";
import { activities } from "./activity";
import styles from "./TimelineSummary.module.css";

const dday = (iso: string) => {
  const d = daysUntil(iso);
  return d < 0 ? `+${-d}` : d === 0 ? "오늘" : `D-${d}`;
};
const when = (iso: string) => {
  const d = daysUntil(iso.slice(0, 10));
  const time = iso.slice(11, 16); // 날짜만 있는 기록은 시각이 없다
  return d === 0 ? time || "오늘" : d === -1 ? `어제 ${time}`.trim() : fmtDate(iso);
};

/** 이만큼 넘게 움직이면 클릭이 아니라 끌기 */
const DRAG_THRESHOLD = 5;

export function TimelineSummary({ ahead = 6, behind = 10 }: { ahead?: number; behind?: number }) {
  // 지난 일 — 오래된 것 → 최근 순으로 왼쪽에서 "지금" 쪽으로
  const recent = activities().slice(0, behind).reverse();
  // 다가오는 것 — 가까운 것부터 "지금" 오른쪽으로
  const upcoming = milestones.filter((m) => m.state !== "done").sort((a, b) => a.due.localeCompare(b.due)).slice(0, ahead);

  const trackRef = useRef<HTMLOListElement>(null);
  const nowRef = useRef<HTMLLIElement>(null);
  const drag = useRef<{ x: number; left: number; moved: boolean } | null>(null);
  const justDragged = useRef(false);
  const [dragging, setDragging] = useState(false);

  // 처음엔 "지금" 오른쪽에 다가오는 일 하나만 보이게 — 나머지 화면은 지난 일. 더 먼 일정은 끌어서
  useEffect(() => {
    const track = trackRef.current;
    const now = nowRef.current;
    if (!track || !now) return;
    const next = now.nextElementSibling as HTMLElement | null;
    const end = now.offsetLeft + now.offsetWidth + (next?.offsetWidth ?? 0);
    track.scrollLeft = Math.max(0, end - track.clientWidth);
  }, []);

  const onPointerDown = (e: React.PointerEvent<HTMLOListElement>) => {
    if (e.pointerType !== "mouse" || e.button !== 0) return; // 터치는 기본 스크롤에 맡긴다
    drag.current = { x: e.clientX, left: e.currentTarget.scrollLeft, moved: false };
  };
  const onPointerMove = (e: React.PointerEvent<HTMLOListElement>) => {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.x;
    if (!d.moved && Math.abs(dx) > DRAG_THRESHOLD) {
      d.moved = true;
      setDragging(true);
      e.currentTarget.setPointerCapture(e.pointerId);
    }
    if (d.moved) e.currentTarget.scrollLeft = d.left - dx;
  };
  const endDrag = () => {
    // pointerup 다음에 오는 click 을 막아야 하므로, 끌었다면 이번 틱 동안만 표시를 남긴다
    if (drag.current?.moved) {
      justDragged.current = true;
      setTimeout(() => { justDragged.current = false; }, 0);
    }
    drag.current = null;
    setDragging(false);
  };
  // 끌고 난 직후의 클릭은 링크로 보내지 않는다
  const onClickCapture = (e: React.MouseEvent) => {
    if (justDragged.current) { e.preventDefault(); e.stopPropagation(); }
  };

  return (
    <section className={styles.strip} aria-label="타임라인 요약">
      <ol
        ref={trackRef}
        className={styles.track}
        data-dragging={dragging || undefined}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onClickCapture={onClickCapture}
      >
        {recent.map((n) => (
          <li key={n.id} className={styles.item} data-side="behind">
            <Link href={n.href} className={styles.link} title={`${n.title} — ${n.sub}`} draggable={false}>
              <span className={styles.when}><Icon name={n.icon} size={12} />{when(n.at)}</span>
              <span className={styles.title}>{n.title}</span>
            </Link>
          </li>
        ))}
        <li ref={nowRef} className={styles.now} aria-label="지금"><span>지금</span></li>
        {upcoming.map((m) => (
          <li key={m.id} className={styles.item} data-side="ahead">
            <Link href="/ops/milestones" className={styles.link} title={`${m.title} — ${fmtDate(m.due)}`} draggable={false}>
              <span className={styles.when}>{dday(m.due)}</span>
              <span className={styles.title}>{m.title}</span>
            </Link>
          </li>
        ))}
      </ol>
      <Link href="/ops/milestones" className={styles.more} aria-label="타임라인 페이지로" title="운영 › 타임라인">
        <Icon name="arrow-right" size={14} />
      </Link>
    </section>
  );
}
