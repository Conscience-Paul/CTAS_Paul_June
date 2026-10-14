import type { ContextVersion, Role, SourceKind } from "./types";

/**
 * 운영 › 계약·문서 — 높은 권한이 필요한 문서함.
 * 폴더(고객사 › 프로젝트 › …) 라이브러리 + 원본 링크 + 버전 + 전달 상태 + 서류 일정.
 */
export type ContractKind = "contract" | "quote" | "nda" | "sla" | "amendment" | "template";
export type ContractStatus = "draft" | "review" | "signed" | "expired";
export type DeliveryStatus = "not_sent" | "scheduled" | "sent" | "acknowledged" | "signed_back";

export interface DocFolder {
  id: string;
  name: string;
  parentId: string | null;
  customerId?: string;
  projectId?: string;
}

export interface DocSource {
  kind: SourceKind;
  /** 원본 위치. 아이콘만 보여주고 클릭 시 새 탭으로 이동 */
  url: string;
  label: string;
}

export interface Delivery {
  status: DeliveryStatus;
  to?: string;
  channel?: SourceKind;
  scheduledAt?: string;
  sentAt?: string;
  history: { at: string; event: string }[];
}

export interface ContractDoc {
  id: string;
  folderId: string;
  projectId?: string;
  kind: ContractKind;
  ext: "docx" | "pdf" | "xlsx";
  title: string;
  status: ContractStatus;
  /** 열람 가능한 최소 역할 */
  requiredRole: Extract<Role, "pm" | "admin">;
  amount?: string;
  signedAt?: string;
  expiresAt?: string;
  /** 내부 검토 기한 */
  reviewDue?: string;
  counterpart: string;
  source: DocSource;
  delivery: Delivery;
  versions: ContextVersion[];
}

const seoyeon = { kind: "human", memberId: "m-seoyeon" } as const;
const doyun = { kind: "human", memberId: "m-doyun" } as const;
const ai = { kind: "ai", model: "Nora · claude-opus" } as const;

export const CONTRACT_LABEL: Record<ContractKind, string> = {
  contract: "계약서",
  quote: "견적서",
  nda: "NDA",
  sla: "SLA",
  amendment: "변경 계약",
  template: "표준 양식",
};

export const CONTRACT_STATUS_LABEL: Record<ContractStatus, string> = {
  draft: "초안",
  review: "검토 중",
  signed: "체결",
  expired: "만료",
};

export const DELIVERY_LABEL: Record<DeliveryStatus, string> = {
  not_sent: "미전달",
  scheduled: "발송 예정",
  sent: "전달됨",
  acknowledged: "고객 확인",
  signed_back: "서명 회수",
};

export const docFolders: DocFolder[] = [
  { id: "f-hanbit", name: "한빛유통", parentId: null, customerId: "c-hanbit" },
  { id: "f-hanbit-ims", name: "재고관리 시스템 구축", parentId: "f-hanbit", projectId: "p-hanbit-ims" },
  { id: "f-hanbit-mobile", name: "현장 모바일 앱", parentId: "f-hanbit", projectId: "p-hanbit-mobile" },
  { id: "f-sejong", name: "세종캐피탈", parentId: null, customerId: "c-sejong" },
  { id: "f-sejong-portal", name: "고객 포털 유지보수", parentId: "f-sejong", projectId: "p-sejong-portal" },
  { id: "f-templates", name: "표준 양식", parentId: null },
];

const gdrive = (path: string): DocSource => ({ kind: "gdrive", url: `https://drive.google.com/drive/folders/1CTAS-${path}`, label: "Google Drive" });

export const contracts: ContractDoc[] = [
  {
    id: "ct-hanbit-nda",
    folderId: "f-hanbit-ims",
    projectId: "p-hanbit-ims",
    kind: "nda",
    ext: "pdf",
    title: "한빛유통 비밀유지계약",
    status: "signed",
    requiredRole: "pm",
    signedAt: "2026-06-20",
    expiresAt: "2029-06-20",
    counterpart: "한빛유통 법무팀",
    source: gdrive("hanbit/ims/nda"),
    delivery: {
      status: "signed_back",
      to: "한빛유통 법무팀",
      channel: "email",
      sentAt: "2026-06-18",
      history: [
        { at: "2026-06-18", event: "이메일 발송 (v1)" },
        { at: "2026-06-19", event: "고객 수정안 회신" },
        { at: "2026-06-20", event: "양측 서명 완료 (v2)" },
      ],
    },
    versions: [
      { v: 1, at: "2026-06-18T10:00:00", author: seoyeon, summary: "표준 NDA 양식에서 생성", basedOn: ["ct-tpl-nda"], body: "제1조 목적\n본 계약은 한빛유통 재고관리 시스템 구축 과정에서 교환되는 정보의 비밀 유지를 목적으로 한다.\n\n제2조 비밀정보의 범위\n…\n\n제7조 유효기간\n계약 체결일로부터 3년" },
      { v: 2, at: "2026-06-20T15:00:00", author: doyun, summary: "한빛 법무 수정안 반영 — 제6조 손해배상 상한 추가", basedOn: [], body: "제1조 목적\n본 계약은 한빛유통 재고관리 시스템 구축 과정에서 교환되는 정보의 비밀 유지를 목적으로 한다.\n\n제2조 비밀정보의 범위\n…\n\n제6조 손해배상\n손해배상 책임은 **용역계약 금액의 100%** 를 상한으로 한다.\n\n제7조 유효기간\n계약 체결일로부터 3년" },
    ],
  },
  {
    id: "ct-hanbit-quote",
    folderId: "f-hanbit-ims",
    projectId: "p-hanbit-ims",
    kind: "quote",
    ext: "xlsx",
    title: "재고관리 시스템 구축 견적서",
    status: "signed",
    requiredRole: "pm",
    amount: "₩248,000,000",
    signedAt: "2026-06-28",
    counterpart: "한빛유통 IT팀",
    source: gdrive("hanbit/ims/quote"),
    delivery: {
      status: "acknowledged",
      to: "박정우 (한빛 IT팀장)",
      channel: "email",
      sentAt: "2026-06-27",
      history: [
        { at: "2026-06-23", event: "v1 내부 검토" },
        { at: "2026-06-27", event: "이메일 발송 (v2)" },
        { at: "2026-06-28", event: "고객 확인 — 계약 진행 회신" },
      ],
    },
    versions: [
      { v: 1, at: "2026-06-22T11:00:00", author: ai, summary: "요구사항 인터뷰 기반 자동 산출", basedOn: ["ctx-meet-kickoff"], body: "총 ₩262,000,000\n- 재고 조회 42MD\n- 재고 이동 58MD\n- SAP 연동 70MD\n- 검수·인수 20MD" },
      { v: 2, at: "2026-06-27T09:00:00", author: seoyeon, summary: "결제·정산 제외, SAP 연동 공수 조정", basedOn: ["ctx-dec-payment-defer"], body: "총 ₩248,000,000\n- 재고 조회 42MD\n- 재고 이동 58MD\n- SAP 연동 62MD\n- 검수·인수 20MD\n\n※ 결제·정산 모듈은 10월 재논의 후 별도 견적" },
    ],
  },
  {
    id: "ct-hanbit-main",
    folderId: "f-hanbit-ims",
    projectId: "p-hanbit-ims",
    kind: "contract",
    ext: "pdf",
    title: "재고관리 시스템 구축 용역계약",
    status: "signed",
    requiredRole: "admin",
    amount: "₩248,000,000",
    signedAt: "2026-06-30",
    expiresAt: "2026-12-31",
    counterpart: "한빛유통 (주)",
    source: gdrive("hanbit/ims/contract"),
    delivery: {
      status: "signed_back",
      to: "한빛유통 구매팀",
      channel: "email",
      sentAt: "2026-06-29",
      history: [
        { at: "2026-06-29", event: "전자서명 발송" },
        { at: "2026-06-30", event: "양측 서명 완료" },
      ],
    },
    versions: [
      { v: 1, at: "2026-06-29T14:00:00", author: doyun, summary: "표준 용역계약 + 견적 v2 첨부", basedOn: ["ct-hanbit-quote"], body: "§3 범위\n요구사항 정의서 v1 기준 R-01~R-03\n\n§7 검수\n1차 10/17, 2차 11/14\n\n§9 대금\n착수 30% · 중간 40% · 인수 30%" },
    ],
  },
  {
    id: "ct-hanbit-cr1",
    folderId: "f-hanbit-ims",
    projectId: "p-hanbit-ims",
    kind: "amendment",
    ext: "docx",
    title: "변경 계약 — 결제·정산 모듈 (조건부)",
    status: "draft",
    requiredRole: "pm",
    amount: "₩58,000,000 (추정)",
    reviewDue: "2026-10-16",
    counterpart: "한빛유통 IT팀·재무팀",
    source: gdrive("hanbit/ims/cr-payment"),
    delivery: {
      status: "scheduled",
      to: "박정우 (한빛 IT팀장)",
      channel: "email",
      scheduledAt: "2026-10-17",
      history: [{ at: "2026-10-12", event: "AI 초안 생성 (v1)" }],
    },
    versions: [
      { v: 1, at: "2026-10-12T17:00:00", author: ai, summary: "결제 모듈 포함 시 변경 계약 초안 — 요구사항 미확정으로 범위·금액 추정치", basedOn: ["ctx-req-payment", "ctx-dec-payment-defer"], body: "§1 추가 범위\n결제·정산 모듈 (요구사항 확정 후 확정)\n\n§2 추가 금액\n약 ₩58,000,000\n\n§3 일정\n인수 12/5 → 12/19 이후" },
    ],
  },
  {
    id: "ct-sejong-sla",
    folderId: "f-sejong-portal",
    projectId: "p-sejong-portal",
    kind: "sla",
    ext: "pdf",
    title: "고객 포털 유지보수 SLA",
    status: "signed",
    requiredRole: "pm",
    amount: "₩4,500,000 / 월",
    signedAt: "2025-12-20",
    expiresAt: "2026-12-31",
    reviewDue: "2026-11-15",
    counterpart: "세종캐피탈 IT운영팀",
    source: gdrive("sejong/portal/sla"),
    delivery: {
      status: "signed_back",
      to: "세종캐피탈 IT운영팀",
      channel: "email",
      sentAt: "2025-12-15",
      history: [
        { at: "2025-12-15", event: "이메일 발송" },
        { at: "2025-12-20", event: "서명 회수" },
      ],
    },
    versions: [
      { v: 1, at: "2025-12-15T10:00:00", author: seoyeon, summary: "SM 표준 SLA 양식에서 생성", basedOn: ["ct-tpl-sla"], body: "장애 대응 48시간\n월 20MD\n보안 패치 분기별\n**외부 AI 사용 불가**\n\n유효기간 2026-12-31 — 갱신 협의는 만료 45일 전" },
    ],
  },
  {
    id: "ct-mobile-quote",
    folderId: "f-hanbit-mobile",
    projectId: "p-hanbit-mobile",
    kind: "quote",
    ext: "xlsx",
    title: "현장 모바일 앱 견적서",
    status: "review",
    requiredRole: "pm",
    amount: "₩96,000,000 (안)",
    reviewDue: "2026-10-15",
    counterpart: "한빛유통 물류운영팀",
    source: gdrive("hanbit/mobile/quote"),
    delivery: {
      status: "scheduled",
      to: "김하늘 (한빛 물류운영)",
      channel: "email",
      scheduledAt: "2026-10-20",
      history: [{ at: "2026-10-08", event: "AI 초안 생성 (v1)" }],
    },
    versions: [
      { v: 1, at: "2026-10-08T16:00:00", author: ai, summary: "유사 프로젝트(D사 WMS) 공수 기반 초안", basedOn: ["ctx-req-mobile-scope"], body: "총 ₩96,000,000 (안)\n- 스캔 입출고 30MD\n- 오프라인 큐 18MD\n- API 재사용 12MD\n- 검수 10MD" },
    ],
  },
  {
    id: "ct-sejong-monthly",
    folderId: "f-sejong-portal",
    projectId: "p-sejong-portal",
    kind: "contract",
    ext: "pdf",
    title: "10월 SLA 이행 보고서 (서명본)",
    status: "draft",
    requiredRole: "pm",
    counterpart: "세종캐피탈 IT운영팀",
    source: gdrive("sejong/portal/report-2026-10"),
    delivery: {
      status: "scheduled",
      to: "세종캐피탈 IT운영팀",
      channel: "email",
      scheduledAt: "2026-10-31",
      history: [],
    },
    versions: [
      { v: 1, at: "2026-10-13T09:00:00", author: ai, summary: "10월 장애·대응 시간 집계 초안", basedOn: ["t-sejong-login"], body: "10월 장애 1건 (세션 만료) — 접수 10/12 08:50, 대응 중\nSLA 48h 이내 처리 예정\n보안 패치: 10/5 적용" },
    ],
  },
  {
    id: "ct-tpl-nda",
    folderId: "f-templates",
    kind: "template",
    ext: "docx",
    title: "표준 NDA 양식",
    status: "signed",
    requiredRole: "pm",
    counterpart: "—",
    source: gdrive("templates/nda"),
    delivery: { status: "not_sent", history: [] },
    versions: [
      { v: 1, at: "2025-03-01T10:00:00", author: doyun, summary: "법무 검토 완료 양식", basedOn: [], body: "제1조 목적 … 제7조 유효기간 [N]년" },
      { v: 2, at: "2026-06-21T10:00:00", author: doyun, summary: "손해배상 상한 조항을 기본 포함 (한빛 NDA 경험 반영)", basedOn: ["ct-hanbit-nda"], body: "제1조 목적 … 제6조 손해배상 상한(계약금액 100%) … 제7조 유효기간 [N]년" },
    ],
  },
  {
    id: "ct-tpl-sla",
    folderId: "f-templates",
    kind: "template",
    ext: "docx",
    title: "SM 표준 SLA 양식",
    status: "signed",
    requiredRole: "pm",
    counterpart: "—",
    source: gdrive("templates/sla"),
    delivery: { status: "not_sent", history: [] },
    versions: [
      { v: 1, at: "2025-05-10T10:00:00", author: seoyeon, summary: "SM 계약 공통 조항", basedOn: [], body: "장애 대응 [N]시간 · 월 [N]MD · 보안 패치 분기별 · 갱신 협의 만료 45일 전" },
    ],
  },
];

export const folderPath = (folderId: string): DocFolder[] => {
  const path: DocFolder[] = [];
  let cur = docFolders.find((f) => f.id === folderId);
  while (cur) {
    path.unshift(cur);
    cur = cur.parentId ? docFolders.find((f) => f.id === cur!.parentId) : undefined;
  }
  return path;
};

/** 폴더와 그 하위 폴더에 속한 문서 */
export const docsInFolder = (folderId: string | null): ContractDoc[] => {
  if (!folderId) return contracts;
  const ids = new Set<string>([folderId]);
  let grew = true;
  while (grew) {
    grew = false;
    docFolders.forEach((f) => {
      if (f.parentId && ids.has(f.parentId) && !ids.has(f.id)) {
        ids.add(f.id);
        grew = true;
      }
    });
  }
  return contracts.filter((c) => ids.has(c.folderId));
};

/** 서류 일정 — 발송 예정 · 검토 기한 · 만료 · 갱신 협의 */
export interface DocEvent {
  docId: string;
  at: string;
  kind: "send" | "review" | "expire" | "renew";
  label: string;
}

export const docEvents = (): DocEvent[] => {
  const ev: DocEvent[] = [];
  contracts.forEach((c) => {
    if (c.delivery.scheduledAt) ev.push({ docId: c.id, at: c.delivery.scheduledAt, kind: "send", label: `발송 예정 → ${c.delivery.to ?? ""}` });
    if (c.reviewDue) ev.push({ docId: c.id, at: c.reviewDue, kind: "review", label: "내부 검토 기한" });
    if (c.expiresAt && c.status === "signed") {
      ev.push({ docId: c.id, at: c.expiresAt, kind: "expire", label: "만료" });
      const d = new Date(c.expiresAt);
      d.setDate(d.getDate() - 45);
      ev.push({ docId: c.id, at: d.toISOString().slice(0, 10), kind: "renew", label: "갱신 협의 시작 (만료 45일 전)" });
    }
  });
  return ev.sort((a, b) => a.at.localeCompare(b.at));
};
