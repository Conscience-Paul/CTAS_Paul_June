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
};
