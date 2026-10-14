"use client";

/**
 * 대시보드 — "지금 무슨 일이 있는지" 한 화면에. 결정할 것의 상세는 승인 목록에서.
 *  - 승인 대기: 총 건수 + 개발·문서·리스크·기타, 최근 3건 → 승인 목록
 *  - 타임라인: 다가오는 마일스톤 · 지금 · 어제·오늘 한 일을 시간축 하나로 → 운영 › 타임라인
 * 리스크는 승인(리스크 대응)으로 합쳐 별도 카드 없음. 운영 현황 차트는 운영 › 인사이트.
 */

import { Button, Icon } from "@/components/ctas/ctds";
import { Page, PageHeader } from "@/components/ctas/ui";
import { ApprovalSummary } from "@/components/ctas/ApprovalSummary";
import { TimelineSummary } from "@/components/ctas/TimelineSummary";
import { usePreview } from "@/lib/preview-state";

export default function Dashboard() {
  const { askAi } = usePreview();

  return (
    <Page>
      <PageHeader
        eyebrow={<>2026년 10월 13일 (월)</>}
        title="대시보드"
        actions={
          <Button size="sm" variant="outline" leftIcon={<Icon name="chat-circle" />} onClick={() => askAi("오늘 내가 결정해야 할 것")}>
            오늘 뭘 결정해야 하지?
          </Button>
        }
      />

      <ApprovalSummary />
      <TimelineSummary />
    </Page>
  );
}
