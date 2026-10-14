"use client";

/**
 * 근거 문서 패널 — 문서의 근거 칩을 누르면 오른쪽에서 화면을 덮어 열린다.
 * 새로 만들지 않고 기존 문서 서랍을 그대로 쓴다: 지식 문서는 KnowledgeDrawer, 계약은 DocDrawer.
 */

import { KnowledgeDrawer } from "@/app/knowledge/_shared";
import { DocDrawer } from "@/app/knowledge/contracts/_shared";
import { contracts, findKEntry } from "@/lib/mock";
import { usePreview } from "@/lib/preview-state";

export function DocPeek({ id }: { id: string }) {
  const { setPeekDocId, mentionDoc, role } = usePreview();
  const close = () => setPeekDocId(null);

  const k = findKEntry(id);
  if (k) return <KnowledgeDrawer entry={k.entry} onClose={close} onAskAi={() => { close(); mentionDoc(id); }} />;

  // 계약문서는 보안 문서 — 관리자만 연다
  const contract = contracts.find((c) => c.id === id);
  if (contract && role === "admin") {
    return <DocDrawer doc={contract} delivery={contract.delivery.status} onDelivery={() => {}} onClose={close} onAskAi={() => { close(); mentionDoc(id); }} />;
  }
  return null;
}
