import type {
  ComplianceProfile,
  Customer,
  Member,
  Milestone,
  Project,
} from "./types";

export const members: Member[] = [
  { id: "m-doyun", name: "최도윤", role: "admin", title: "대표 / 관리자" },
  { id: "m-seoyeon", name: "김서연", role: "pm", title: "PM" },
  { id: "m-junho", name: "이준호", role: "engineer", title: "백엔드 엔지니어" },
  { id: "m-minji", name: "박민지", role: "engineer", title: "프론트엔드 엔지니어" },
  { id: "m-hyun", name: "정하윤", role: "viewer", title: "영업" },
];

export const complianceProfiles: ComplianceProfile[] = [
  {
    id: "cp-standard",
    name: "표준",
    allowExternalAI: true,
    retentionDays: 365,
    dataRegion: "kr",
    allowedChannels: ["slack", "email", "gdrive", "git", "meeting", "manual"],
    requireApprovalForCustomerSend: true,
  },
  {
    id: "cp-strict",
    name: "금융·보안 강화",
    allowExternalAI: false,
    retentionDays: 90,
    dataRegion: "kr",
    allowedChannels: ["email", "meeting", "manual"],
    requireApprovalForCustomerSend: true,
  },
];

export const customers: Customer[] = [
  {
    id: "c-hanbit",
    name: "한빛유통",
    industry: "유통·물류",
    noraWorkspace: "ws-hanbit",
    complianceProfileId: "cp-standard",
  },
  {
    id: "c-sejong",
    name: "세종캐피탈",
    industry: "금융",
    noraWorkspace: "ws-sejong",
    complianceProfileId: "cp-strict",
  },
];

export const projects: Project[] = [
  {
    id: "p-hanbit-ims",
    customerId: "c-hanbit",
    name: "한빛유통 재고관리 시스템 구축",
    kind: "SI",
    stage: "build",
    pmId: "m-seoyeon",
    memberIds: ["m-seoyeon", "m-junho", "m-minji"],
    startDate: "2026-07-01",
    endDate: "2026-12-15",
    summary:
      "전국 12개 물류센터의 재고를 실시간으로 통합 조회·이동하는 웹 시스템. 기존 ERP(SAP)와 양방향 연동.",
    gate: [
      { id: "g1", label: "확정 요구사항 문서(v2 이상) 존재", done: true, evidenceId: "ctx-req-spec" },
      { id: "g2", label: "계약 범위와 WBS 일치", done: true, evidenceId: "del-wbs" },
      { id: "g3", label: "검수 기준서 고객 합의", done: false, evidenceId: "ctx-conv-review-criteria" },
      { id: "g4", label: "결제 모듈 요구사항 확정", done: false, evidenceId: "ctx-req-payment" },
    ],
  },
  {
    id: "p-hanbit-mobile",
    customerId: "c-hanbit",
    name: "한빛유통 현장 모바일 앱",
    kind: "SI",
    stage: "requirements",
    pmId: "m-seoyeon",
    memberIds: ["m-seoyeon", "m-minji"],
    startDate: "2026-09-20",
    endDate: "2027-03-31",
    summary: "물류센터 작업자용 바코드 스캔·입출고 모바일 앱. 재고관리 시스템 API 재사용.",
    gate: [
      { id: "g1", label: "요구사항 인터뷰 3회 완료", done: true },
      { id: "g2", label: "범위 문서 고객 승인", done: false },
      { id: "g3", label: "견적서 발송", done: false },
    ],
  },
  {
    id: "p-sejong-portal",
    customerId: "c-sejong",
    name: "세종캐피탈 고객 포털 유지보수",
    kind: "SM",
    stage: "maintenance",
    pmId: "m-seoyeon",
    memberIds: ["m-seoyeon", "m-junho"],
    startDate: "2026-01-01",
    endDate: "2026-12-31",
    summary: "2025년 구축한 대출 고객 포털의 월 단위 유지보수. SLA 48시간. 외부 AI 사용 불가 정책.",
    gate: [
      { id: "g1", label: "월간 SLA 보고서 발송", done: true },
      { id: "g2", label: "보안 패치 적용 확인", done: true },
    ],
  },
];

/** 팀원 투입률 — 운영 › 리소스. 합이 100% 를 넘으면 과투입. */
export const allocations: { memberId: string; projectId: string; percent: number }[] = [
  { memberId: "m-seoyeon", projectId: "p-hanbit-ims", percent: 50 },
  { memberId: "m-seoyeon", projectId: "p-hanbit-mobile", percent: 30 },
  { memberId: "m-seoyeon", projectId: "p-sejong-portal", percent: 20 },
  { memberId: "m-junho", projectId: "p-hanbit-ims", percent: 80 },
  { memberId: "m-junho", projectId: "p-sejong-portal", percent: 40 },
  { memberId: "m-minji", projectId: "p-hanbit-ims", percent: 70 },
  { memberId: "m-minji", projectId: "p-hanbit-mobile", percent: 20 },
  { memberId: "m-doyun", projectId: "p-hanbit-ims", percent: 10 },
];

export const milestones: Milestone[] = [
  {
    id: "ms-1",
    projectId: "p-hanbit-ims",
    title: "SAP 연동 인터페이스 완료",
    due: "2026-10-10",
    ownerId: "m-junho",
    state: "done",
    taskIds: ["t-sap-sync"],
  },
  {
    id: "ms-2",
    projectId: "p-hanbit-ims",
    title: "재고 이동 기능 1차 검수",
    due: "2026-10-17",
    ownerId: "m-minji",
    state: "at_risk",
    taskIds: ["t-move-ui", "t-move-approval", "t-review-criteria"],
  },
  {
    id: "ms-3",
    projectId: "p-hanbit-ims",
    title: "결제·정산 모듈 개발 착수",
    due: "2026-10-24",
    ownerId: "m-junho",
    state: "planned",
    taskIds: ["t-payment"],
  },
  {
    id: "ms-4",
    projectId: "p-hanbit-ims",
    title: "통합 테스트 · 최종 인수",
    due: "2026-12-05",
    ownerId: "m-seoyeon",
    state: "planned",
    taskIds: [],
  },
  {
    id: "ms-5",
    projectId: "p-hanbit-mobile",
    title: "범위 문서 고객 승인",
    due: "2026-10-20",
    ownerId: "m-seoyeon",
    state: "planned",
    taskIds: [],
  },
  {
    id: "ms-6",
    projectId: "p-sejong-portal",
    title: "10월 SLA 보고",
    due: "2026-10-31",
    ownerId: "m-seoyeon",
    state: "planned",
    taskIds: ["t-sejong-login"],
  },
];
