/**
 * 알림 — 승인 요청·리스크 감지·에이전트 결과·멘션·배포·문서 이벤트.
 * href 로 관련 화면으로 이동. 읽음 상태는 프리뷰 로컬.
 */
export type NotificationKind = "approval" | "risk" | "agent" | "mention" | "deploy" | "doc" | "schedule";

export interface Notification {
  id: string;
  kind: NotificationKind;
  at: string;
  title: string;
  body: string;
  href: string;
  /** 프리뷰 초기 읽음 여부 */
  read: boolean;
}

export const NOTIFICATION_ICON: Record<NotificationKind, "seal-check" | "warning-circle" | "waveform" | "chat-circle" | "upload-simple" | "article" | "calendar-dots"> = {
  approval: "seal-check",
  risk: "warning-circle",
  agent: "waveform",
  mention: "chat-circle",
  deploy: "upload-simple",
  doc: "article",
  schedule: "calendar-dots",
};

export const notifications: Notification[] = [
  { id: "n-1", kind: "risk", at: "2026-10-14T09:02:00", title: "결제·정산 질문 8일 미응답", body: "오늘까지 응답 없으면 10/24 착수 조정 필요 — 리마인드 초안 준비됨", href: "/projects/p-hanbit-ims/risks", read: false },
  { id: "n-2", kind: "approval", at: "2026-10-14T08:40:00", title: "결과 승인 요청 — 안전 재고 알림 Slack 전송", body: "Nora · build-agent #1 · 테스트 9개 통과", href: "/approvals", read: false },
  { id: "n-3", kind: "agent", at: "2026-10-13T18:20:00", title: "SAP 전표 중복 전송 — 군집 판정 완료", body: "기존 사례 ‘동기화 주기’ 에 합류. 분류 승인 대기", href: "/dev", read: false },
  { id: "n-4", kind: "mention", at: "2026-10-13T17:05:00", title: "이준호 님이 멘션했습니다", body: "\"재고 조회 응답 지연 — 집계 뷰 설계 검토 부탁드려요\"", href: "/dev", read: false },
  { id: "n-5", kind: "schedule", at: "2026-10-13T09:00:00", title: "서류 일정 — 내일 변경 계약 내부 검토 기한", body: "변경 계약 — 결제·정산 모듈 (조건부) · 검토 10/15 · 발송 10/17", href: "/ops/contracts/schedule", read: false },
  { id: "n-6", kind: "deploy", at: "2026-10-12T16:30:00", title: "배포됨 — PR #142 SAP 동기화 주기 5분", body: "요구사항 R-03(15분)과 충돌 — supersede 필요", href: "/dev/deploy", read: true },
  { id: "n-7", kind: "doc", at: "2026-10-12T11:10:00", title: "WBS v3 생성 — 검수 버퍼 반영", body: "과거 SAP 연동 프로젝트 지연 확률 62% 반영", href: "/projects/p-hanbit-ims/deliverables/del-wbs", read: true },
  { id: "n-8", kind: "approval", at: "2026-10-11T15:20:00", title: "결과 승인 요청 — 재고 이동 승인 API #2", body: "반려 사유(원 승인자 사후 알림) 반영 완료", href: "/approvals", read: true },
  { id: "n-9", kind: "risk", at: "2026-10-12T08:00:00", title: "1차 검수(10/17) 지연 가능", body: "연결 업무 3건 중 완료 0 · 검수 기준서 미수령", href: "/projects/p-hanbit-ims/risks", read: true },
  { id: "n-10", kind: "agent", at: "2026-10-13T09:30:00", title: "세션 만료 장애 — 에이전트 실행 시작", body: "Nora · onprem-runner · SLA 48h 중 26h 경과", href: "/dev/agents", read: true },
];
