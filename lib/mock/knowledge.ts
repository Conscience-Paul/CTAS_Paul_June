import type { Deliverable, Pattern, Template } from "./types";

const seoyeon = { kind: "human", memberId: "m-seoyeon" } as const;
const ai = { kind: "ai", model: "Nora · claude-opus" } as const;

export const templates: Template[] = [
  { id: "tpl-wbs", kind: "wbs", name: "SI 표준 WBS", description: "요구사항 → 설계 → 개발 → 검수 → 인수 5단계 분해", sections: ["요구사항 정의", "설계", "개발", "검수", "인수·이관"], usedCount: 11 },
  { id: "tpl-weekly", kind: "report", name: "주간 보고", description: "진행률 · 이슈 · 다음 주 계획 · 결정 요청", sections: ["요약", "진행 현황", "이슈·리스크", "다음 주 계획", "결정 요청"], usedCount: 94 },
  { id: "tpl-minutes", kind: "meeting_minutes", name: "회의록", description: "참석 · 논의 · 결정 · 액션", sections: ["참석", "논의", "결정", "액션 아이템"], usedCount: 212 },
  { id: "tpl-cr", kind: "customer_doc", name: "변경 요청(CR) 안내서", description: "범위 외 요청에 대한 영향·견적 안내", sections: ["요청 요약", "현재 범위와의 차이", "영향(일정·비용)", "제안"], usedCount: 7 },
  { id: "tpl-proposal", kind: "proposal", name: "제안서", description: "과거 유사 프로젝트 기반 제안서", sections: ["배경", "범위", "접근 방법", "일정", "견적"], usedCount: 5 },
];

export const deliverables: Deliverable[] = [
  {
    id: "del-wbs",
    projectId: "p-hanbit-ims",
    kind: "wbs",
    title: "WBS — 한빛유통 재고관리",
    templateId: "tpl-wbs",
    generatedFrom: ["ctx-req-spec", "ctx-meet-kickoff"],
    versions: [
      { v: 1, at: "2026-07-20T10:00:00", author: ai, summary: "요구사항 v1 기반 자동 생성", basedOn: ["ctx-req-spec"], body: "1. 요구사항 정의 (7/1–7/31)\n2. 설계 (8/1–8/20)\n3. 개발\n  3.1 재고 조회 (8/21–9/15)\n  3.2 SAP 연동 (8/21–10/10)\n  3.3 재고 이동 (9/16–10/15)\n4. 검수 (10/17, 11/14)\n5. 인수 (12/5)" },
      { v: 2, at: "2026-08-03T09:00:00", author: seoyeon, summary: "요구사항 v2 반영 — 4.1 알림 추가, 이동에 승인 단계", basedOn: ["ctx-req-spec"], body: "1. 요구사항 정의 (7/1–7/31)\n2. 설계 (8/1–8/20)\n3. 개발\n  3.1 재고 조회 (8/21–9/15)\n  3.2 SAP 연동 (8/21–10/10)\n  3.3 재고 이동 + 승인 (9/16–10/15)\n4. 부가 기능\n  4.1 안전 재고 알림 (10/16–10/30)\n5. 검수 (10/17, 11/14)\n6. 인수 (12/5)" },
      { v: 3, at: "2026-10-12T11:00:00", author: ai, summary: "계획 인텔리전스 — 과거 SAP 연동 프로젝트 기준 검수 구간 지연 확률 62% 반영, 버퍼 추가", basedOn: ["ctx-meet-1009", "ctx-req-spec"], body: "1. 요구사항 정의 (7/1–7/31) ✓\n2. 설계 (8/1–8/20) ✓\n3. 개발\n  3.1 재고 조회 (8/21–9/15) ✓\n  3.2 SAP 연동 (8/21–10/10) ✓\n  3.3 재고 이동 + 승인 (9/16–10/15) ●\n4. 부가 기능\n  4.1 안전 재고 알림 (10/16–10/30)\n  4.2 결제·정산 (조건부, 10/24–11/20) ⚠ 요구사항 미확정\n5. 검수 (1차 10/17 → **버퍼 10/21**, 2차 11/14)\n6. 인수 (12/5)" },
    ],
  },
  {
    id: "del-weekly-1010",
    projectId: "p-hanbit-ims",
    kind: "report",
    title: "주간 보고 (10/10)",
    templateId: "tpl-weekly",
    generatedFrom: ["ctx-meet-1009", "del-wbs"],
    versions: [
      { v: 1, at: "2026-10-10T15:00:00", author: ai, summary: "10/9 미팅·업무 상태 기반 생성", basedOn: ["ctx-meet-1009"], body: "## 요약\n전체 진행률 68%. SAP 연동 완료. 재고 이동 승인 기능 검수 준비 중.\n\n## 이슈·리스크\n- 검수 기준서 10/11 수령 예정\n- 결제·정산 범위 10/14 재논의\n\n## 결정 요청\n- 결제·정산 확인 질문 4건 회신" },
      { v: 2, at: "2026-10-10T16:30:00", author: seoyeon, summary: "표현 완화, 결정 요청에 기한 추가", basedOn: [], body: "## 요약\n전체 진행률 68%. SAP 연동 완료. 재고 이동 승인 기능 검수 준비 중입니다.\n\n## 이슈·리스크\n- 검수 기준서 10/11 수령 예정\n- 결제·정산 범위 10/14 재논의\n\n## 결정 요청\n- 결제·정산 확인 질문 4건 회신 (**10/14 미팅 전까지**)" },
    ],
  },
  {
    id: "del-minutes-1009",
    projectId: "p-hanbit-ims",
    kind: "meeting_minutes",
    title: "회의록 — 주간 미팅 10/09 (고객 발송용)",
    templateId: "tpl-minutes",
    generatedFrom: ["ctx-meet-1009"],
    versions: [
      { v: 1, at: "2026-10-09T11:30:00", author: ai, summary: "내부 회의록 → 고객 발송용 정리", basedOn: ["ctx-meet-1009"], body: "## 참석\n한빛 박정우·김하늘 / CT 김서연·박민지\n\n## 결정\n- 1차 검수 10/17\n- 결제·정산 재논의 10/14\n\n## 액션\n- 한빛: 검수 기준서 10/11\n- CT: 결제 모듈 질문 리스트 10/13" },
    ],
  },
  {
    id: "del-cr-dashboard",
    projectId: "p-hanbit-ims",
    kind: "customer_doc",
    title: "CR 안내 — 재고 회전율 대시보드",
    templateId: "tpl-cr",
    generatedFrom: ["ctx-req-spec"],
    versions: [
      { v: 1, at: "2026-10-12T19:00:00", author: ai, summary: "rq-3 범위 밖 판정 → CR 안내서 초안", basedOn: ["ctx-req-spec"], body: "## 요청 요약\n센터별 재고 회전율 대시보드\n\n## 현재 범위와의 차이\n요구사항 R-01~R-04 에 해당 없음\n\n## 영향\n약 3주 / 별도 견적\n\n## 제안\n모바일 앱 2차 또는 별도 CR" },
    ],
  },
];

export const patterns: Pattern[] = [
  {
    id: "pt-sap-proxy",
    kind: "problem",
    state: "published",
    title: "운영 ERP 외부망 직접 접근 불가",
    summary: "대기업 SAP/ERP 는 외부망 직접 접근을 막는다. 연동 설계 전에 DMZ 프록시·RFC 사용자·IP 화이트리스트 절차를 먼저 확인.",
    when: "ERP 연동이 범위에 있는 모든 SI",
    how: "킥오프에서 네트워크 접근 방식 확인을 액션으로 고정. 프록시 구축 기간(평균 2주)을 WBS 에 선반영.",
    usedCount: 4,
    originProjectIds: ["p-hanbit-ims"],
    tags: ["ERP", "SAP", "네트워크"],
  },
  {
    id: "pt-approval-threshold",
    kind: "requirement",
    state: "published",
    title: "금액 기준 승인 분기 + 대리 승인",
    summary: "승인 흐름 요구사항은 거의 항상 '금액 임계값'과 '승인자 부재 시 대리'로 확장된다. 처음부터 두 조건을 질문.",
    when: "승인/결재 워크플로우가 포함된 요구사항 정의",
    how: "요구사항 인터뷰 체크리스트에 임계값·대리 승인·사후 알림 3항목 포함.",
    usedCount: 6,
    originProjectIds: ["p-hanbit-ims"],
    tags: ["승인", "워크플로우"],
  },
  {
    id: "pt-no-response",
    kind: "risk",
    state: "published",
    title: "고객 재무·법무 검토가 걸리면 평균 9일 지연",
    summary: "요구사항 확인이 고객사 타 부서(재무·법무)로 넘어가면 응답까지 평균 9영업일. 3일 내 응답 가정은 거의 틀린다.",
    when: "질문의 답변자가 IT 담당이 아닌 경우",
    how: "질문 발송 시점에 마일스톤 버퍼 1주 선반영. 3일 미응답 시 리마인드 자동 제안.",
    usedCount: 8,
    originProjectIds: ["p-hanbit-ims", "p-sejong-portal"],
    tags: ["미응답", "일정"],
  },
  {
    id: "pt-notify-policy",
    kind: "solution",
    state: "reviewed",
    title: "외부 SaaS 알림에 민감 수치 제외 — 건수+링크 패턴",
    summary: "보안 정책이 외부 메신저로의 수치 전송을 막는 경우, 알림은 '건수 + 시스템 링크'만 보내고 상세는 시스템 안에서 보게 한다.",
    when: "Slack/카카오 알림 요구 + 고객 보안 정책 존재",
    how: "알림 템플릿을 정책 프로필에 따라 두 가지로 분기.",
    usedCount: 2,
    originProjectIds: ["p-hanbit-ims"],
    tags: ["보안", "알림"],
  },
  {
    id: "pt-session-regression",
    kind: "problem",
    state: "anonymized",
    title: "쿠키 속성 변경 배포 후 세션 조기 만료",
    summary: "SameSite/Secure 속성 변경이 포함된 배포는 세션 회귀를 자주 일으킨다.",
    when: "인증·쿠키 관련 변경이 포함된 배포",
    how: "배포 Pre-flight 에 '쿠키 속성 변경 여부' 체크 추가. 변경 시 세션 유지 E2E 필수.",
    usedCount: 0,
    originProjectIds: ["p-sejong-portal"],
    tags: ["배포", "인증"],
  },
  {
    id: "pt-review-criteria",
    kind: "risk",
    state: "draft",
    title: "검수 기준서를 고객이 작성하면 검수 1주 전까지 안 온다",
    summary: "검수 기준서 작성 주체가 고객이면 거의 항상 지연. 우리가 초안을 쓰고 고객이 확인하는 방식이 빠르다.",
    when: "검수 일정이 고객 산출물에 의존할 때",
    how: "검수 기준서 초안을 Auto Deliverables 로 먼저 생성해 보낸다.",
    usedCount: 0,
    originProjectIds: ["p-hanbit-ims"],
    tags: ["검수", "일정"],
  },
];

/* ── Planning Intelligence (목 통계) ─────────────── */
export const insights = {
  stageDuration: [
    { stage: "요구사항 정의", plannedDays: 21, actualDays: 29 },
    { stage: "설계", plannedDays: 15, actualDays: 17 },
    { stage: "개발", plannedDays: 55, actualDays: 63 },
    { stage: "검수", plannedDays: 10, actualDays: 19 },
    { stage: "인수", plannedDays: 5, actualDays: 6 },
  ],
  delayCauses: [
    { cause: "고객 응답 지연", share: 38 },
    { cause: "요구사항 변경", share: 27 },
    { cause: "외부 시스템 연동", share: 18 },
    { cause: "내부 리소스", share: 11 },
    { cause: "기타", share: 6 },
  ],
  estimateBias: [
    { kind: "ERP 연동", bias: 1.35 },
    { kind: "승인 워크플로우", bias: 1.2 },
    { kind: "조회 화면", bias: 1.05 },
    { kind: "알림", bias: 1.1 },
    { kind: "보고서·문서", bias: 0.95 },
  ],
  similarProjects: [
    { name: "D사 물류센터 WMS 구축 (2025)", similarity: 0.86, outcome: "검수 2주 지연 — 고객 기준서 지연", lesson: "검수 기준서 초안을 우리가 먼저 작성" },
    { name: "E사 ERP 재고 연동 (2024)", similarity: 0.79, outcome: "일정 준수", lesson: "DMZ 프록시를 킥오프 액션으로 고정" },
    { name: "F사 결재 시스템 (2025)", similarity: 0.71, outcome: "범위 확대로 CR 2건", lesson: "대리 승인·임계값을 초기에 질문" },
  ],
  /** 패턴 수치의 반기별 추이 — 제안 카드에서 "지금까지 어떻게 변해왔나" */
  trends: {
    stage: [{ period: "24 상", value: 130 }, { period: "24 하", value: 120 }, { period: "25 상", value: 105 }, { period: "25 하", value: 95 }, { period: "26 상", value: 90 }],
    cause: [{ period: "24 상", value: 45 }, { period: "24 하", value: 44 }, { period: "25 상", value: 41 }, { period: "25 하", value: 40 }, { period: "26 상", value: 38 }],
    bias: [{ period: "24 상", value: 1.5 }, { period: "24 하", value: 1.46 }, { period: "25 상", value: 1.42 }, { period: "25 하", value: 1.38 }, { period: "26 상", value: 1.35 }],
  },
};

/**
 * Nora 계획 제안 — 반복되는 패턴을 근거로 Nora 가 계획(WBS·리스크 규칙) 변경을 제안하고, 사람이 반영하거나 보류한다.
 * 지난 제안은 결정·효과와 함께 계속 남는다.
 */
export type PlanningPattern = "stage" | "cause" | "bias";
export type ProposalStatus = "proposed" | "applied" | "held" | "expired";

export interface PlanningProposal {
  id: string;
  /** 어떤 패턴에서 나왔나 — 카드의 막대·추이 */
  pattern: PlanningPattern;
  proposedAt: string;
  /** 큰 숫자 */
  metric: string;
  /** 무엇을 봤나 */
  finding: string;
  /** 무엇을 바꾸자는가 */
  proposal: string;
  status: ProposalStatus;
  decidedAt?: string;
  decidedBy?: string;
  /** 보류·만료 사유 */
  reason?: string;
  /** 반영 후 효과 */
  effect?: string;
}

/** 패턴의 근거 — 어떤 과거 프로젝트에서, 무슨 일로, 어떻게 계산했나. 반영하면 지금 무엇이 바뀌나 */
export interface PatternEvidence {
  /** 카드 한 줄 요약 */
  summary: string;
  confidence: "높음" | "보통" | "참고용";
  method: string[];
  projects: { name: string; period: string; value: string; reason: string }[];
  cases: { project: string; date: string; source: string; quote: string }[];
  /** 반영하면 바뀌는 것 — schedule 은 승인 목록의 "일정 변경"으로 올라간다 */
  impacts: (
    | { kind: "schedule"; projectId: string; milestoneId: string; from: string; to: string; note: string }
    | { kind: "rule"; label: string }
  )[];
}

export const patternEvidence: Record<PlanningPattern, PatternEvidence> = {
  stage: {
    summary: "지난 프로젝트 9건 중 7건에서 검수가 밀림 · 대표 사례 D사 WMS 검수 2주 지연",
    confidence: "높음",
    method: ["SI 프로젝트 9건 (SM 5건 제외 — 단계 구분 없음)", "계획 = 착수 시점 WBS, 실제 = 단계 게이트 통과일", "2024-01 ~ 2026-09 종료·진행 프로젝트"],
    projects: [
      { name: "D사 물류센터 WMS 구축", period: "2025-03 ~ 2025-09", value: "10일 → 24일", reason: "고객 검수 기준서 2주 지연" },
      { name: "F사 결재 시스템", period: "2025-05 ~ 2025-11", value: "8일 → 17일", reason: "범위 확대(CR) 후 재검수" },
      { name: "G사 영업관리 고도화", period: "2024-09 ~ 2025-02", value: "10일 → 18일", reason: "고객 담당자 교체" },
      { name: "H사 MES 연동", period: "2025-01 ~ 2025-07", value: "12일 → 21일", reason: "기준서 미합의로 2회 검수" },
      { name: "I사 구매 포털", period: "2024-04 ~ 2024-10", value: "10일 → 16일", reason: "고객 검수 인력 부족" },
      { name: "J사 재고 대시보드", period: "2025-08 ~ 2026-01", value: "7일 → 12일", reason: "데이터 정합성 이슈" },
      { name: "E사 ERP 재고 연동", period: "2024-02 ~ 2024-08", value: "10일 → 10일", reason: "기준서를 우리가 먼저 작성 — 지연 없음" },
    ],
    cases: [
      { project: "D사 물류센터 WMS 구축", date: "2025-08-21", source: "메일 · D사 물류팀", quote: "검수 기준서 내부 결재가 늦어져 다음 주 수요일에 전달드리겠습니다." },
      { project: "한빛유통 재고관리 (진행 중)", date: "2026-10-11", source: "카카오톡 · 김하늘(한빛)", quote: "검수 기준서 내부 검토가 길어져서 화요일(10/14)에 드릴게요." },
    ],
    impacts: [
      { kind: "schedule", projectId: "p-hanbit-ims", milestoneId: "ms-2", from: "2026-10-17", to: "2026-10-24", note: "검수 +1주 버퍼 적용 · 박민지가 올린 10/21 조정 요청과 겹침 — 둘 중 하나만 승인" },
      { kind: "rule", label: "새 WBS 템플릿 — 검수 단계 기본 기간 +5영업일" },
    ],
  },
  cause: {
    summary: "지연 건 34건 중 13건(38%)이 고객 응답 대기 · 평균 대기 8.4일",
    confidence: "높음",
    method: ["지연된 업무 34건의 지연 사유 분류 (Nora 가 업무 이력·메일에서 추출, 사람이 검수)", "사유가 둘 이상이면 가장 긴 대기 하나만", "2024-01 ~ 2026-09"],
    projects: [
      { name: "한빛유통 재고관리 (진행 중)", period: "2026-07 ~", value: "3건", reason: "결제·정산 질문 7일 미응답 외" },
      { name: "D사 물류센터 WMS 구축", period: "2025-03 ~ 2025-09", value: "4건", reason: "검수 기준서·인터페이스 명세 회신 지연" },
      { name: "F사 결재 시스템", period: "2025-05 ~ 2025-11", value: "3건", reason: "임계값 정책 확인 지연" },
      { name: "G사 영업관리 고도화", period: "2024-09 ~ 2025-02", value: "2건", reason: "담당자 교체로 회신 공백" },
      { name: "I사 구매 포털", period: "2024-04 ~ 2024-10", value: "1건", reason: "보안 검토 회신 지연" },
    ],
    cases: [
      { project: "한빛유통 재고관리 (진행 중)", date: "2026-10-06", source: "Slack · #hanbit-ims-외부", quote: "결제·정산 모듈 관련 4가지 확인 부탁드립니다. (응답 없음)" },
      { project: "F사 결재 시스템", date: "2025-07-02", source: "메일 · F사 재무팀", quote: "대리 승인 임계값은 내부 회의 후 회신드리겠습니다." },
    ],
    impacts: [
      { kind: "rule", label: "리스크 감지 — 고객 미응답 기준 7일 → 5일" },
      { kind: "rule", label: "미응답 5일째 리마인드 초안 자동 생성 → 승인 목록 '고객 발송'" },
    ],
  },
  bias: {
    summary: "ERP 연동 업무 11건 평균 ×1.35 · 승인 워크플로우 8건 ×1.20",
    confidence: "보통",
    method: ["업무 단위 추정 공수 vs 실제 공수 (업무 이력의 착수 ~ 검증 완료)", "유형은 WBS 태그 기준 · 표본 5건 미만 유형은 제외", "2024-01 ~ 2026-09"],
    projects: [
      { name: "E사 ERP 재고 연동", period: "2024-02 ~ 2024-08", value: "×1.28", reason: "DMZ 프록시 구성 지연" },
      { name: "H사 MES 연동", period: "2025-01 ~ 2025-07", value: "×1.52", reason: "RFC 호출량 제한 대응" },
      { name: "D사 물류센터 WMS 구축", period: "2025-03 ~ 2025-09", value: "×1.31", reason: "SAP 필드 매핑 재작업" },
      { name: "한빛유통 재고관리 (진행 중)", period: "2026-07 ~", value: "×1.30", reason: "동기화 주기 변경(15→5분)" },
    ],
    cases: [
      { project: "한빛유통 재고관리 (진행 중)", date: "2026-10-08", source: "GitHub · PR #142", quote: "SAP 동기화 주기 15분 → 5분 (RFC 호출량 확인 필요)" },
    ],
    impacts: [
      { kind: "rule", label: "새 WBS — ERP 연동 항목 추정 ×1.35, 승인 워크플로우 ×1.2 자동 적용" },
      { kind: "rule", label: "진행 중 프로젝트는 바꾸지 않음 (다음 WBS 부터)" },
    ],
  },
};

export const planningProposals: PlanningProposal[] = [
  /* 지금 제안 — 결정 대기 */
  {
    id: "pp-2610-stage",
    pattern: "stage",
    proposedAt: "2026-10-12",
    metric: "+90%",
    finding: "검수 단계가 계획보다 가장 크게 밀립니다 — 계획 10일 → 실제 19일. 고객 산출물(검수 기준서) 의존이 주원인.",
    proposal: "새 WBS 의 검수 단계에 +1주 버퍼를 기본으로 붙이고, 한빛 재고관리 1차 검수(10/17)에도 적용",
    status: "proposed",
  },
  {
    id: "pp-2610-cause",
    pattern: "cause",
    proposedAt: "2026-10-12",
    metric: "38%",
    finding: "지연 원인 1위는 고객 응답 지연. 7월에 반영한 1주 버퍼 이후 45% → 38% 로 줄었지만 여전히 1위.",
    proposal: "미응답 리스크 감지 기준을 7일 → 5일로 앞당기고, 5일째 리마인드 초안을 자동 생성",
    status: "proposed",
  },
  {
    id: "pp-2610-bias",
    pattern: "bias",
    proposedAt: "2026-10-12",
    metric: "×1.35",
    finding: "ERP 연동은 추정보다 1.35배 오래 걸립니다. 승인 워크플로우(×1.20)도 과소 추정.",
    proposal: "새 WBS 에서 ERP 연동 ×1.35, 승인 워크플로우 ×1.2 버퍼를 자동으로 곱함",
    status: "proposed",
  },

  /* 지난 제안 — 결정과 효과가 남는다 */
  {
    id: "pp-2607-cause",
    pattern: "cause",
    proposedAt: "2026-07-14",
    metric: "45%",
    finding: "지연의 45% 가 고객 응답 지연.",
    proposal: "질문 발송 시 일정에 1주 버퍼 · 7일 미응답이면 리스크 자동 감지",
    status: "applied",
    decidedAt: "2026-07-15",
    decidedBy: "김서연",
    effect: "고객 응답 지연 비중 45% → 38%",
  },
  {
    id: "pp-2604-bias",
    pattern: "bias",
    proposedAt: "2026-04-01",
    metric: "×1.42",
    finding: "ERP 연동 추정 편차 ×1.42.",
    proposal: "ERP 연동 항목 추정에 ×1.3 버퍼",
    status: "applied",
    decidedAt: "2026-04-02",
    decidedBy: "이준호",
    effect: "E사 연동 일정 준수 · 편차 ×1.42 → ×1.35",
  },
  {
    id: "pp-2601-stage",
    pattern: "stage",
    proposedAt: "2026-01-19",
    metric: "+15%",
    finding: "개발 단계가 계획보다 15% 길어짐.",
    proposal: "개발 단계 일정에 +10% 버퍼",
    status: "held",
    decidedAt: "2026-01-20",
    decidedBy: "김서연",
    reason: "인력 1명 증원으로 대체 — 버퍼 대신 리소스로 대응",
  },
  {
    id: "pp-2510-stage",
    pattern: "stage",
    proposedAt: "2025-10-04",
    metric: "+120%",
    finding: "검수 단계 +120% — 고객이 기준서를 쓰면 거의 항상 지연.",
    proposal: "검수 기준서 초안을 우리가 먼저 작성해 보내기 (패턴 라이브러리 등록)",
    status: "applied",
    decidedAt: "2025-10-05",
    decidedBy: "김서연",
    effect: "검수 지연 +120% → +90%",
  },
  {
    id: "pp-2506-stage",
    pattern: "stage",
    proposedAt: "2025-06-10",
    metric: "+38%",
    finding: "요구사항 정의 단계 +38%.",
    proposal: "요구사항 정의 단계를 2주 연장",
    status: "expired",
    decidedAt: "2025-07-10",
    reason: "30일 동안 결정 없음 — 근거 프로젝트 3건으로 부족",
  },
  {
    id: "pp-2503-bias",
    pattern: "bias",
    proposedAt: "2025-03-01",
    metric: "×0.95",
    finding: "보고서·문서는 추정보다 빨리 끝남.",
    proposal: "보고서·문서 추정은 그대로 유지 (버퍼 없음)",
    status: "applied",
    decidedAt: "2025-03-02",
    decidedBy: "박민지",
    effect: "변동 없음 — 계속 ×0.95 안팎",
  },
];
