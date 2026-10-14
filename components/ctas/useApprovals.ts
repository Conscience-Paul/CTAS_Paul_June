"use client";

/**
 * 승인 목록 데이터 — 목업 승인 + 프리뷰 문서 draft("문서 배포") + 리스크("리스크 대응").
 * draft 는 저장되는 즉시 승인 대기로 올라온다. 승인 목록·사이드바 배지·홈·투두가 같은 숫자를 보게 공용으로.
 */

import { authorLabel } from "@/components/ctas/VersionRail";
import { approvals, findDocLike, findKEntry, getContext, riskApprovalId, risks, type Approval, type ApprovalState } from "@/lib/mock";
import { usePreview } from "@/lib/preview-state";

/** 프리뷰 draft → "문서 배포" 승인 항목 */
export function useDraftApprovals(): Approval[] {
  const { drafts } = usePreview();
  return Object.entries(drafts).map(([docId, d]) => {
    const doc = findDocLike(docId);
    const entry = findKEntry(docId)?.entry;
    const projectId = entry && (entry.type === "context" || entry.type === "deliverable") ? entry.item.projectId : getContext(docId)?.projectId ?? "";
    return {
      id: `draft:${docId}`,
      projectId,
      kind: "doc_publish" as const,
      state: "pending" as const,
      title: `${doc?.title ?? docId} — v${(doc?.versions.length ?? 0) + 1} 배포`,
      requestedBy: authorLabel(d.author),
      requestedAt: d.at,
      ref: { type: "draft" as const, id: docId },
      message: d.summary,
    };
  });
}

/**
 * 리스크 → "리스크 대응" 승인 항목. 리스크는 별도 페이지 없이 여기서 결정한다(수용 / 조치 필요).
 * 승인 id 는 risk:<리스크 id> 로 고정 — 대시보드·알림·근거 링크가 riskHref 로 바로 연다.
 * 목업에 같은 리스크의 승인 문구가 있으면 그 제목·메시지를 쓴다.
 */
export function useRiskApprovals(): Approval[] {
  const { riskStatus } = usePreview();
  return risks.map((r) => {
    const mock = approvals.find((a) => a.kind === "risk" && a.ref.id === r.id);
    const status = riskStatus[r.id] ?? r.status;
    return {
      id: riskApprovalId(r.id),
      projectId: r.projectId,
      kind: "risk" as const,
      state: status === "open" ? ("pending" as const) : status === "dismissed" ? ("rejected" as const) : ("approved" as const),
      title: mock?.title ?? `${r.title} — 대응`,
      requestedBy: mock?.requestedBy ?? "리스크 감지",
      requestedAt: mock?.requestedAt ?? r.detectedAt,
      ref: { type: "risk" as const, id: r.id },
      message: mock?.message ?? r.suggestion.title,
    };
  });
}

/** 전체 승인 — 같은 문서의 목업 draft 승인은 프리뷰 draft 로, 목업 리스크 승인은 리스크 항목으로 대체 */
export function useAllApprovals() {
  const { approvalDecisions, extraApprovals } = usePreview();
  const draftApprovals = useDraftApprovals();
  const riskApprovals = useRiskApprovals();
  const all = [
    ...draftApprovals,
    ...riskApprovals,
    // 화면에서 새로 올린 것 (인사이트 제안 반영 → 일정 변경 등)
    ...extraApprovals,
    ...approvals.filter((a) => a.kind !== "risk" && !(a.kind === "doc_publish" && draftApprovals.some((d) => d.ref.id === a.ref.id))),
  ];
  const stateOf = (a: Approval): ApprovalState => approvalDecisions[a.id] ?? a.state;
  return { all, stateOf, pending: all.filter((a) => stateOf(a) === "pending") };
}
