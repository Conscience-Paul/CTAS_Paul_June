"use client";

/**
 * 버전 비교 스플릿 뷰 — 에디터(Cursor)처럼 왼쪽 이전 버전, 오른쪽 선택 버전.
 * 삭제는 왼쪽 빨강, 추가는 오른쪽 초록, 수정은 같은 행에 양쪽.
 */

import { useMemo } from "react";
import { diffRows, type DiffCell } from "@/lib/diff";
import styles from "./DiffView.module.css";

function Cell({ cell, kind }: { cell?: DiffCell; kind: "same" | "del" | "add" | "empty" }) {
  return (
    <>
      <span className={styles.ln} data-kind={kind}>{cell?.n ?? ""}</span>
      <span className={styles.code} data-kind={kind}>
        {cell && kind !== "same" && <span className={styles.sign}>{kind === "del" ? "−" : "+"}</span>}
        {cell?.text ?? ""}
      </span>
    </>
  );
}

export function DiffView({ before, after, beforeLabel, afterLabel }: { before: string; after: string; beforeLabel: string; afterLabel: string }) {
  const rows = useMemo(() => diffRows(before, after), [before, after]);
  const added = rows.filter((r) => r.right && r.kind !== "same").length;
  const removed = rows.filter((r) => r.left && r.kind !== "same").length;

  return (
    <div className={styles.root}>
      <div className={styles.head}>
        <span className={styles.side}>{beforeLabel}</span>
        <span className={styles.side}>
          {afterLabel}
          <span className={styles.stat}>
            <span data-kind="add">+{added}</span> <span data-kind="del">−{removed}</span>
          </span>
        </span>
      </div>
      {added + removed === 0 ? (
        <div className={styles.empty}>달라진 내용이 없습니다.</div>
      ) : (
        <div className={styles.grid}>
          {rows.map((r, i) => (
            <div key={i} className={styles.row}>
              <Cell cell={r.left} kind={!r.left ? "empty" : r.kind === "same" ? "same" : "del"} />
              <Cell cell={r.right} kind={!r.right ? "empty" : r.kind === "same" ? "same" : "add"} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
