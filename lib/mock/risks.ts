import type { Risk } from "./types";

export const risks: Risk[] = [
  {
    id: "risk-noresp",
    projectId: "p-hanbit-ims",
    kind: "no_response",
    severity: "critical",
    title: "결제·정산 질문 7일 미응답 — 10/24 착수 마일스톤 위협",
    detectedAt: "2026-10-13T09:00:00",
    detail:
      "10/6 발송한 4가지 확인 질문에 응답이 없습니다. t-payment 가 blocked 상태이며, 내일(10/14)까지 응답이 없으면 결제 모듈 착수(10/24) 일정 조율이 필요합니다.",
    evidence: [
      { type: "context", id: "ctx-conv-payment-q" },
      { type: "task", id: "t-payment" },
      { type: "milestone", id: "ms-3" },
    ],
    suggestion: {
      title: "리마인드 발송 + 조건부 일정 조율 제안",
      body: "오늘 리마인드를 보내고, 10/14 재논의 미팅에서 답변을 받는 것으로 묶어 제안합니다. 응답이 없으면 착수를 10/31로 1주 연기하는 안을 함께 제시합니다.",
      draft:
        "박정우 팀장님, 안녕하세요.\n\n10/6에 드린 결제·정산 모듈 확인 사항 4건에 대해 아직 회신을 못 받아 연락드립니다. 10/24 착수를 위해서는 늦어도 10/14(화) 재논의 미팅에서 확정이 필요합니다.\n\n혹시 재무팀 검토가 더 필요하시면 착수를 10/31로 조정하는 안도 가능하니 편하신 쪽으로 알려주세요.\n\n감사합니다.\n김서연 드림",
    },
    status: "open",
  },
  {
    id: "risk-missing-req",
    projectId: "p-hanbit-ims",
    kind: "missing_requirement",
    severity: "high",
    title: "결제·정산 모듈 요구사항 미정의 — 계약 범위 후보인데 문서 없음",
    detectedAt: "2026-10-10T08:00:00",
    detail:
      "킥오프 결정에 따라 10월 재논의 대상이지만 요구사항 항목이 질문 리스트 외엔 없습니다. 포함 결정 시 설계 착수까지 최소 1주가 추가로 필요합니다.",
    evidence: [
      { type: "context", id: "ctx-dec-payment-defer" },
      { type: "context", id: "ctx-req-payment" },
    ],
    suggestion: {
      title: "요구사항 정의 미팅 선제 제안",
      body: "10/14 재논의 미팅을 '포함 여부 결정'이 아니라 '요구사항 정의 워크숍'으로 격상해 한 번에 끝내는 것을 제안합니다.",
    },
    status: "open",
  },
  {
    id: "risk-delay-review",
    projectId: "p-hanbit-ims",
    kind: "schedule_delay",
    severity: "high",
    title: "1차 검수(10/17) 지연 가능 — 기준서 미수령, 연결 업무 1/3 완료",
    detectedAt: "2026-10-12T08:00:00",
    detail:
      "마일스톤 ms-2 의 연결 업무 3건 중 완료 0건, 진행 1건, blocked 2건. 검수 기준서가 10/14에 와도 합의에 2일이 필요해 10/17 검수는 빠듯합니다.",
    evidence: [
      { type: "milestone", id: "ms-2" },
      { type: "task", id: "t-review-criteria" },
      { type: "context", id: "ctx-conv-review-criteria" },
    ],
    suggestion: {
      title: "검수를 10/21로 조정하거나 범위를 축소",
      body: "안 1: 검수일을 10/21(화)로 2영업일 연기. 안 2: 10/17은 조회·SAP 연동만 검수하고 재고 이동은 10/24 2차 검수로 분리.",
    },
    status: "acknowledged",
  },
  {
    id: "risk-policy-alert",
    projectId: "p-hanbit-ims",
    kind: "policy_conflict",
    severity: "medium",
    title: "안전 재고 알림이 Slack 으로 수량을 보내면 보안 정책 §5.1 위반",
    detectedAt: "2026-10-12T14:00:00",
    detail:
      "R-04 알림 설계가 아직 없으나, 기존 승인 알림과 같은 Slack 채널을 쓰면 수량이 외부 SaaS로 나갑니다.",
    evidence: [
      { type: "context", id: "ctx-doc-security-policy" },
      { type: "task", id: "t-stock-alert" },
    ],
    suggestion: {
      title: "알림 본문에서 수량 제거, 시스템 링크만",
      body: "승인 알림과 같은 방식(건수 + 링크)으로 통일. Pre-flight 항목에 §5.1 확인을 추가했습니다.",
    },
    status: "open",
  },
  {
    id: "risk-owner-overlap",
    projectId: "p-hanbit-ims",
    kind: "owner_overlap",
    severity: "low",
    title: "안전 재고 알림 업무가 두 담당자에게 중복 생성",
    detectedAt: "2026-10-12T16:00:00",
    detail: "같은 요구사항 R-04 를 이준호·박민지가 각각 업무로 만들었습니다.",
    evidence: [
      { type: "task", id: "t-stock-alert" },
      { type: "task", id: "t-stock-alert-dup" },
    ],
    suggestion: { title: "병합", body: "충돌 cf-1 에서 병합 처리하세요." },
    status: "open",
  },
  {
    id: "risk-scope-dash",
    projectId: "p-hanbit-ims",
    kind: "scope_creep",
    severity: "medium",
    title: "재고 회전율 대시보드 요청 — 계약 범위 밖",
    detectedAt: "2026-10-12T18:00:00",
    detail: "rq-3 요청. 요구사항 R-01~R-04 어디에도 없음.",
    evidence: [{ type: "task", id: "t-excel-export" }],
    suggestion: { title: "CR 견적으로 전환", body: "충돌 cf-4 에서 처리 완료. 고객에게 CR 안내 필요." },
    status: "resolved",
  },
  {
    id: "risk-sj-sla",
    projectId: "p-sejong-portal",
    kind: "schedule_delay",
    severity: "high",
    title: "세션 만료 장애 SLA 48h 중 26h 경과",
    detectedAt: "2026-10-13T09:00:00",
    detail: "10/12 08:50 접수. 온프렘 러너 실행 중. 10/14 08:50 까지 수정 배포 필요.",
    evidence: [{ type: "task", id: "t-sejong-login" }],
    suggestion: { title: "중간 보고 발송", body: "원인 후보 확인 사실을 고객에게 중간 보고(외부 AI 미사용 명시)." },
    status: "open",
  },
];
