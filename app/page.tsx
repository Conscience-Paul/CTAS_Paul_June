"use client";

/**
 * 홈(대시보드) — "여기만 봐도 된다". 사이드바 없이 한 화면:
 *  - 위: 타임라인 띠 — 지난 일 · 지금 · 다가오는 마일스톤 (끌어서 넘김, → 는 오늘의 타임라인 드로어)
 *  - 아래(전체 폭): 승인 목록 그 자체 — 탭·유형 필터·종류별 서랍·바로 승인 (예전 /approvals)
 * 막힌 업무는 원인 리스크가 "리스크 대응"으로 승인 목록에 올라오므로 따로 경고하지 않는다.
 * 결정은 여기, 실행(내 업무)은 개발 › 업무, 운영 현황 차트는 운영 › 인사이트.
 */

import { Button, Icon } from "@/components/ctas/ctds";
import { Page, PageHeader } from "@/components/ctas/ui";
import { ApprovalsBoard } from "@/app/approvals/_board";
import { TimelineSummary } from "@/components/ctas/TimelineSummary";
import { usePreview } from "@/lib/preview-state";

export default function Home() {
  const { askAi } = usePreview();

  return (
    <Page wide>
      <PageHeader
        eyebrow={<>2026년 10월 13일 (월)</>}
        title="대시보드"
        actions={
          <Button size="sm" variant="outline" leftIcon={<Icon name="chat-circle" />} onClick={() => askAi("오늘 내가 결정해야 할 것")}>
            오늘 뭘 결정해야 하지?
          </Button>
        }
      />

      {/* 타임라인은 얇은 띠 하나, 승인 목록은 전체 폭 */}
      <TimelineSummary />
      <ApprovalsBoard />
    </Page>
  );
}
