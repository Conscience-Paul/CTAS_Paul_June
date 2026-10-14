/**
 * 줄 단위 diff — 버전 비교 스플릿 뷰용. 문서가 짧아 LCS(O(n·m))로 충분하다.
 * 연속된 삭제·추가 묶음은 같은 행에 짝지어 "수정"으로 보여준다.
 */

export interface DiffCell {
  /** 원래 문서의 줄 번호 (1부터) */
  n: number;
  text: string;
}

export interface DiffRow {
  kind: "same" | "changed" | "removed" | "added";
  left?: DiffCell;
  right?: DiffCell;
}

type Op = { t: "eq" | "del" | "add"; a?: number; b?: number };

function lineOps(a: string[], b: string[]): Op[] {
  const n = a.length;
  const m = b.length;
  // lcs[i][j] = a[i..], b[j..] 의 LCS 길이
  const lcs = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      lcs[i][j] = a[i] === b[j] ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
    }
  }
  const ops: Op[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) { ops.push({ t: "eq", a: i++, b: j++ }); }
    else if (lcs[i + 1][j] >= lcs[i][j + 1]) { ops.push({ t: "del", a: i++ }); }
    else { ops.push({ t: "add", b: j++ }); }
  }
  while (i < n) ops.push({ t: "del", a: i++ });
  while (j < m) ops.push({ t: "add", b: j++ });
  return ops;
}

export function diffRows(before: string, after: string): DiffRow[] {
  // 빈 문서는 "빈 줄 1개"가 아니라 줄 0개
  const a = before === "" ? [] : before.split("\n");
  const b = after === "" ? [] : after.split("\n");
  const ops = lineOps(a, b);
  const rows: DiffRow[] = [];
  let k = 0;
  while (k < ops.length) {
    const op = ops[k];
    if (op.t === "eq") {
      rows.push({ kind: "same", left: { n: op.a! + 1, text: a[op.a!] }, right: { n: op.b! + 1, text: b[op.b!] } });
      k++;
      continue;
    }
    const dels: number[] = [];
    const adds: number[] = [];
    while (k < ops.length && ops[k].t !== "eq") {
      if (ops[k].t === "del") dels.push(ops[k].a!);
      else adds.push(ops[k].b!);
      k++;
    }
    for (let x = 0; x < Math.max(dels.length, adds.length); x++) {
      const l = dels[x];
      const r = adds[x];
      rows.push({
        kind: l !== undefined && r !== undefined ? "changed" : l !== undefined ? "removed" : "added",
        left: l !== undefined ? { n: l + 1, text: a[l] } : undefined,
        right: r !== undefined ? { n: r + 1, text: b[r] } : undefined,
      });
    }
  }
  return rows;
}
