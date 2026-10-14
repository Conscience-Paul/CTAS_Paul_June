import type { ContextItem, Link, Source } from "./types";

export const sources: Source[] = [
  { id: "src-slack", projectId: "p-hanbit-ims", kind: "slack", label: "Slack", target: "#hanbit-ims-외부", lastSyncedAt: "2026-10-13T09:42:00", itemCount: 148 },
  { id: "src-email", projectId: "p-hanbit-ims", kind: "email", label: "이메일", target: "pm@conscience.technology ↔ it@hanbit.co.kr", lastSyncedAt: "2026-10-13T09:40:00", itemCount: 37 },
  { id: "src-drive", projectId: "p-hanbit-ims", kind: "gdrive", label: "Google Drive", target: "/고객사/한빛유통/재고관리", lastSyncedAt: "2026-10-13T08:00:00", itemCount: 22 },
  { id: "src-git", projectId: "p-hanbit-ims", kind: "git", label: "GitHub", target: "conscience-tech/hanbit-ims", lastSyncedAt: "2026-10-13T09:45:00", itemCount: 212 },
  { id: "src-meet", projectId: "p-hanbit-ims", kind: "meeting", label: "회의록", target: "Google Meet 자동 녹취", lastSyncedAt: "2026-10-12T16:30:00", itemCount: 9 },
  { id: "src-kakao", projectId: "p-hanbit-ims", kind: "kakao", label: "카카오톡", target: "한빛유통 IT팀 (내보내기 업로드)", lastSyncedAt: "2026-10-11T18:00:00", itemCount: 61 },
  { id: "src-mob-meet", projectId: "p-hanbit-mobile", kind: "meeting", label: "회의록", target: "Google Meet 자동 녹취", lastSyncedAt: "2026-10-12T11:00:00", itemCount: 3 },
  { id: "src-sj-email", projectId: "p-sejong-portal", kind: "email", label: "이메일", target: "support@conscience.technology ↔ sejong", lastSyncedAt: "2026-10-13T09:00:00", itemCount: 84 },
];

const seoyeon = { kind: "human", memberId: "m-seoyeon" } as const;
const junho = { kind: "human", memberId: "m-junho" } as const;
const minji = { kind: "human", memberId: "m-minji" } as const;
const ai = { kind: "ai", model: "Nora · claude-opus" } as const;

export const contextItems: ContextItem[] = [
  /* ── 회의록 ── */
  {
    id: "ctx-meet-kickoff",
    projectId: "p-hanbit-ims",
    kind: "meeting_note",
    title: "킥오프 미팅 (2026-07-02)",
    sourceId: "src-meet",
    origin: { channel: "Google Meet", at: "2026-07-02T14:00:00", by: "자동 녹취" },
    state: "curated",
    tags: ["킥오프", "범위"],
    versions: [
      { v: 1, at: "2026-07-02T15:10:00", author: ai, summary: "녹취 → 회의록 자동 생성", basedOn: [], body: "## 참석\n한빛유통 IT팀장 박정우, 물류운영 김하늘 / CT 김서연, 이준호\n\n## 결정\n- 1차 범위: 12개 센터 재고 통합 조회, 센터 간 이동, SAP 연동\n- 결제·정산은 2차 범위로 검토 (고객: \"일단 빼고 가되 10월에 다시 논의\")\n\n## 액션\n- CT: 요구사항 정의서 초안 7/15까지\n- 한빛: SAP 인터페이스 명세 전달" },
      { v: 2, at: "2026-07-03T09:20:00", author: seoyeon, summary: "결제·정산 재논의 시점 명시, 참석자 직함 보정", basedOn: ["ctx-conv-kickoff-followup"], body: "## 참석\n한빛유통 IT팀장 박정우, 물류운영팀 과장 김하늘 / CT 김서연(PM), 이준호\n\n## 결정\n- 1차 범위: 12개 센터 재고 통합 조회, 센터 간 이동, SAP 연동\n- **결제·정산은 10월 2주차에 범위 포함 여부 재논의** (고객 요청)\n\n## 액션\n- CT: 요구사항 정의서 초안 7/15까지\n- 한빛: SAP 인터페이스 명세 7/10까지 전달" },
    ],
  },
  {
    id: "ctx-meet-0925",
    projectId: "p-hanbit-ims",
    kind: "meeting_note",
    title: "주간 미팅 (2026-09-25) — 재고 이동 승인 흐름",
    sourceId: "src-meet",
    origin: { channel: "Google Meet", at: "2026-09-25T10:00:00", by: "자동 녹취" },
    state: "curated",
    tags: ["재고이동", "승인"],
    versions: [
      { v: 1, at: "2026-09-25T11:05:00", author: ai, summary: "녹취 → 회의록 자동 생성", basedOn: [], body: "## 논의\n- 센터 간 재고 이동 시 **센터장 승인** 필요 여부 → 한빛: 500만원 이상만 승인\n- 승인자 부재 시 대리 승인 가능해야 함\n\n## 액션\n- CT: 승인 흐름 설계안 10/2 공유" },
    ],
  },
  {
    id: "ctx-meet-1009",
    projectId: "p-hanbit-ims",
    kind: "meeting_note",
    title: "주간 미팅 (2026-10-09) — 검수 일정",
    sourceId: "src-meet",
    origin: { channel: "Google Meet", at: "2026-10-09T10:00:00", by: "자동 녹취" },
    state: "processed",
    tags: ["검수", "일정"],
    versions: [
      { v: 1, at: "2026-10-09T11:00:00", author: ai, summary: "녹취 → 회의록 자동 생성", basedOn: [], body: "## 논의\n- 1차 검수 10/17 예정. 검수 기준서는 한빛 측이 10/11까지 전달하기로 함\n- 결제·정산 범위 논의는 10/14로 연기 요청(한빛 재무팀 일정)\n\n## 액션\n- 한빛: 검수 기준서 10/11\n- CT: 결제 모듈 요구사항 질문 리스트 10/13" },
    ],
  },

  /* ── 요구사항 ── */
  {
    id: "ctx-req-spec",
    projectId: "p-hanbit-ims",
    kind: "requirement",
    title: "요구사항 정의서",
    sourceId: "src-drive",
    origin: { channel: "Google Drive", at: "2026-07-15T18:00:00", by: "김서연" },
    state: "curated",
    tags: ["요구사항", "확정"],
    versions: [
      { v: 1, at: "2026-07-15T18:00:00", author: seoyeon, summary: "초안 작성", basedOn: ["ctx-meet-kickoff"], body: "# 요구사항 정의서 v1\n\n## R-01 재고 통합 조회\n12개 센터의 재고를 SKU 단위로 실시간 조회…\n\n## R-02 센터 간 재고 이동\n이동 요청 → 출고 → 입고 확인 3단계…\n\n## R-03 SAP 연동\n재고 수량 양방향 동기화 (15분 주기)…" },
      { v: 2, at: "2026-08-02T11:00:00", author: seoyeon, summary: "고객 피드백 반영 — R-02 승인 단계 추가, R-04 알림 신설", basedOn: ["ctx-doc-feedback-0730"], body: "# 요구사항 정의서 v2\n\n## R-01 재고 통합 조회\n12개 센터의 재고를 SKU 단위로 실시간 조회…\n\n## R-02 센터 간 재고 이동\n이동 요청 → **승인** → 출고 → 입고 확인 4단계…\n\n## R-03 SAP 연동\n재고 수량 양방향 동기화 (15분 주기)…\n\n## R-04 재고 부족 알림\n안전 재고 이하 시 담당자 알림…" },
      { v: 3, at: "2026-09-26T09:30:00", author: ai, summary: "9/25 미팅 반영 — R-02 승인 조건(500만원 이상·대리 승인) 구체화", basedOn: ["ctx-meet-0925"], body: "# 요구사항 정의서 v3\n\n## R-01 재고 통합 조회\n12개 센터의 재고를 SKU 단위로 실시간 조회…\n\n## R-02 센터 간 재고 이동\n이동 요청 → 승인 → 출고 → 입고 확인 4단계.\n- 승인은 **이동 금액 500만원 이상**일 때만 필요\n- 승인자 부재 시 **대리 승인자** 지정 가능\n\n## R-03 SAP 연동\n재고 수량 양방향 동기화 (15분 주기)…\n\n## R-04 재고 부족 알림\n안전 재고 이하 시 담당자 알림…" },
    ],
  },
  {
    id: "ctx-req-payment",
    projectId: "p-hanbit-ims",
    kind: "requirement",
    title: "결제·정산 모듈 요구사항 (미확정)",
    sourceId: "src-drive",
    origin: { channel: "수동 생성", at: "2026-10-06T10:00:00", by: "김서연" },
    state: "raw",
    tags: ["결제", "미확정"],
    versions: [
      { v: 1, at: "2026-10-06T10:00:00", author: seoyeon, summary: "질문 리스트만 작성. 고객 답변 대기", basedOn: ["ctx-meet-kickoff", "ctx-conv-payment-q"], body: "# 결제·정산 모듈 — 확인 필요 사항\n\n1. 정산 주기 (일/주/월)?\n2. 센터 간 이동 시 내부 거래 정산 포함?\n3. 기존 SAP FI 모듈과 연동 범위?\n4. 세금계산서 발행 자동화 필요?\n\n> 10/6 Slack으로 질문 발송. **응답 없음.**" },
    ],
  },
  {
    id: "ctx-req-mobile-scope",
    projectId: "p-hanbit-mobile",
    kind: "requirement",
    title: "모바일 앱 범위 문서 (초안)",
    sourceId: "src-mob-meet",
    origin: { channel: "수동 생성", at: "2026-10-05T15:00:00", by: "김서연" },
    state: "processed",
    tags: ["범위"],
    versions: [
      { v: 1, at: "2026-10-05T15:00:00", author: ai, summary: "인터뷰 3회 녹취 기반 초안", basedOn: [], body: "# 범위 초안\n- 바코드 스캔 입출고\n- 오프라인 큐잉\n- 재고관리 시스템 API 재사용" },
    ],
  },

  /* ── 의사결정 ── */
  {
    id: "ctx-dec-approval-threshold",
    projectId: "p-hanbit-ims",
    kind: "decision",
    title: "결정: 이동 승인 기준 500만원",
    sourceId: "src-meet",
    origin: { channel: "Google Meet", at: "2026-09-25T10:40:00", by: "박정우(한빛)" },
    state: "curated",
    tags: ["결정", "재고이동"],
    versions: [
      { v: 1, at: "2026-09-25T11:10:00", author: ai, summary: "회의록에서 결정 추출", basedOn: ["ctx-meet-0925"], body: "**결정**: 센터 간 재고 이동은 이동 금액 500만원 이상일 때만 센터장 승인.\n**근거**: 전체 이동의 약 80%가 500만원 미만 소액이라 전부 승인하면 병목.\n**결정자**: 박정우(한빛 IT팀장)" },
    ],
  },
  {
    id: "ctx-dec-payment-defer",
    projectId: "p-hanbit-ims",
    kind: "decision",
    title: "결정: 결제·정산은 10월 재논의",
    sourceId: "src-meet",
    origin: { channel: "Google Meet", at: "2026-07-02T14:30:00", by: "박정우(한빛)" },
    state: "curated",
    tags: ["결정", "범위"],
    versions: [
      { v: 1, at: "2026-07-03T09:25:00", author: seoyeon, summary: "킥오프 결정 사항 분리", basedOn: ["ctx-meet-kickoff"], body: "**결정**: 결제·정산 모듈은 1차 범위에서 제외하되 10월 2주차에 포함 여부 재논의.\n**리스크**: 포함될 경우 12월 인수 일정 영향." },
    ],
  },

  /* ── 고객 문서 ── */
  {
    id: "ctx-doc-sap-spec",
    projectId: "p-hanbit-ims",
    kind: "customer_doc",
    title: "SAP 재고 인터페이스 명세서 (한빛 제공)",
    sourceId: "src-drive",
    origin: { channel: "Google Drive", at: "2026-07-11T09:00:00", by: "한빛유통 IT팀" },
    state: "processed",
    tags: ["SAP", "연동"],
    versions: [
      { v: 1, at: "2026-07-11T09:30:00", author: ai, summary: "PDF 42p → 구조화 요약", basedOn: [], body: "## 요약\n- BAPI_MATERIAL_STOCK_REQ_LIST 기반 조회\n- IDoc WMMBXY 로 입출고 전표 전송\n- 인증: SAP RFC 사용자, IP 화이트리스트\n\n## 주의\n- 운영 SAP는 **외부망 직접 접근 불가** → 한빛 DMZ 프록시 경유 필요" },
    ],
  },
  {
    id: "ctx-doc-feedback-0730",
    projectId: "p-hanbit-ims",
    kind: "customer_doc",
    title: "요구사항 정의서 v1 고객 피드백",
    sourceId: "src-email",
    origin: { channel: "이메일", at: "2026-07-30T17:20:00", by: "박정우(한빛)" },
    state: "curated",
    tags: ["피드백"],
    versions: [
      { v: 1, at: "2026-07-30T17:25:00", author: ai, summary: "메일 본문 → 항목화", basedOn: [], body: "1. 재고 이동에 승인 단계 필요\n2. 안전 재고 알림 기능 추가 요청\n3. 조회 화면에 센터별 필터" },
    ],
  },
  {
    id: "ctx-doc-security-policy",
    projectId: "p-hanbit-ims",
    kind: "customer_doc",
    title: "한빛유통 정보보안 정책 (외부 개발사용)",
    sourceId: "src-email",
    origin: { channel: "이메일", at: "2026-07-05T11:00:00", by: "한빛유통 보안팀" },
    state: "processed",
    tags: ["보안", "정책"],
    versions: [
      { v: 1, at: "2026-07-05T11:30:00", author: ai, summary: "정책 PDF → 개발 관련 조항 추출", basedOn: [], body: "## 개발사 관련 조항\n- §4.2 고객 데이터는 **국내 리전**에만 저장\n- §5.1 외부 SaaS 알림(Slack 등)으로 **재고 수량·금액 전송 금지**\n- §6.3 운영 시스템 접근은 VPN + 2FA" },
    ],
  },

  /* ── 우리 문서 ── */
  {
    id: "ctx-our-approval-design",
    projectId: "p-hanbit-ims",
    kind: "our_doc",
    title: "재고 이동 승인 흐름 설계안",
    sourceId: "src-drive",
    origin: { channel: "Google Drive", at: "2026-10-02T14:00:00", by: "이준호" },
    state: "curated",
    tags: ["설계", "재고이동"],
    versions: [
      { v: 1, at: "2026-10-02T14:00:00", author: junho, summary: "초안", basedOn: ["ctx-req-spec", "ctx-dec-approval-threshold"], body: "# 승인 흐름 설계\n\n상태: REQUESTED → (금액 ≥ 500만) APPROVAL_PENDING → APPROVED → SHIPPED → RECEIVED\n\n대리 승인: 승인자 부재 플래그 시 delegate_id 에게 라우팅" },
      { v: 2, at: "2026-10-04T10:00:00", author: minji, summary: "화면 흐름 추가, 알림 채널 명시", basedOn: ["ctx-doc-security-policy"], body: "# 승인 흐름 설계\n\n상태: REQUESTED → (금액 ≥ 500만) APPROVAL_PENDING → APPROVED → SHIPPED → RECEIVED\n\n대리 승인: 승인자 부재 플래그 시 delegate_id 에게 라우팅\n\n## 화면\n- 승인 대기 목록 / 승인 상세 / 대리 승인자 설정\n\n## 알림\n- **Slack 알림에 금액 미포함** (보안 정책 §5.1) — 건수와 링크만" },
    ],
  },

  /* ── 대화 ── */
  {
    id: "ctx-conv-kickoff-followup",
    projectId: "p-hanbit-ims",
    kind: "conversation",
    title: "Slack: 킥오프 후속 — 결제 모듈 재논의 시점",
    sourceId: "src-slack",
    origin: { channel: "#hanbit-ims-외부", at: "2026-07-02T18:40:00", by: "박정우(한빛)" },
    state: "processed",
    tags: ["결제"],
    versions: [
      { v: 1, at: "2026-07-02T18:41:00", author: ai, summary: "스레드 요약", basedOn: [], body: "박정우: 결제 쪽은 재무팀이랑 얘기해야 해서 10월 2주쯤 다시 보시죠\n김서연: 네, 10/13 주간으로 잡아두겠습니다" },
    ],
  },
  {
    id: "ctx-conv-payment-q",
    projectId: "p-hanbit-ims",
    kind: "conversation",
    title: "Slack: 결제·정산 모듈 확인 질문 (응답 없음)",
    sourceId: "src-slack",
    origin: { channel: "#hanbit-ims-외부", at: "2026-10-06T10:12:00", by: "김서연" },
    state: "processed",
    tags: ["결제", "미응답"],
    versions: [
      { v: 1, at: "2026-10-06T10:13:00", author: ai, summary: "질문 스레드 — 7일째 미응답", basedOn: [], body: "김서연: 결제·정산 모듈 관련 4가지 확인 부탁드립니다 (정산 주기 / 내부거래 정산 / SAP FI 연동 범위 / 세금계산서)\n\n_(응답 없음 — 10/13 기준 7일 경과)_" },
    ],
  },
  {
    id: "ctx-conv-review-criteria",
    projectId: "p-hanbit-ims",
    kind: "conversation",
    title: "카카오톡: 검수 기준서 전달 지연",
    sourceId: "src-kakao",
    origin: { channel: "한빛유통 IT팀", at: "2026-10-11T18:02:00", by: "김하늘(한빛)" },
    state: "raw",
    tags: ["검수"],
    versions: [
      { v: 1, at: "2026-10-11T18:05:00", author: ai, summary: "내보내기 파일에서 추출", basedOn: [], body: "김하늘: 검수 기준서 내부 검토가 길어져서 화요일(10/14)에 드릴게요 ㅠㅠ\n김서연: 네 확인했습니다. 17일 검수 일정은 유지 가능할지 내일 다시 말씀드릴게요" },
    ],
  },
  {
    id: "ctx-conv-filter-request",
    projectId: "p-hanbit-ims",
    kind: "conversation",
    title: "이메일: 조회 화면 엑셀 내보내기 요청",
    sourceId: "src-email",
    origin: { channel: "이메일", at: "2026-10-10T09:30:00", by: "김하늘(한빛)" },
    state: "processed",
    tags: ["요청", "범위"],
    versions: [
      { v: 1, at: "2026-10-10T09:32:00", author: ai, summary: "메일 → 요청 추출", basedOn: [], body: "조회 화면에서 필터 결과를 엑셀로 내려받을 수 있으면 좋겠습니다. 센터별 월말 보고에 쓰려고요." },
    ],
  },

  /* ── 변경 ── */
  {
    id: "ctx-change-sap-sync",
    projectId: "p-hanbit-ims",
    kind: "change",
    title: "PR #142 SAP 동기화 주기 15분 → 5분",
    sourceId: "src-git",
    origin: { channel: "GitHub", at: "2026-10-08T16:20:00", by: "이준호" },
    state: "processed",
    tags: ["SAP", "변경"],
    versions: [
      { v: 1, at: "2026-10-08T16:21:00", author: ai, summary: "PR 설명 요약", basedOn: [], body: "요구사항 R-03은 15분 주기였으나 한빛 운영팀 요청으로 5분으로 단축. SAP RFC 호출량 3배 증가 — 한빛 BASIS 팀 확인 필요." },
    ],
  },

  /* ── 세종 (SM) ── */
  {
    id: "ctx-sj-login-report",
    projectId: "p-sejong-portal",
    kind: "conversation",
    title: "이메일: 로그인 후 세션 만료 오류 제보",
    sourceId: "src-sj-email",
    origin: { channel: "이메일", at: "2026-10-12T08:50:00", by: "세종캐피탈 CS팀" },
    state: "processed",
    tags: ["장애"],
    versions: [
      { v: 1, at: "2026-10-12T08:52:00", author: ai, summary: "장애 제보 구조화", basedOn: [], body: "증상: 로그인 후 2~3분 내 세션 만료. 10/11 배포 이후 발생. 영향: 고객 문의 14건." },
    ],
  },
];

export const links: Link[] = [
  { from: "ctx-req-spec", to: "ctx-meet-kickoff", rel: "derived_from" },
  { from: "ctx-req-spec", to: "ctx-doc-feedback-0730", rel: "derived_from" },
  { from: "ctx-req-spec", to: "ctx-dec-approval-threshold", rel: "decided_by" },
  { from: "ctx-dec-approval-threshold", to: "ctx-meet-0925", rel: "derived_from" },
  { from: "ctx-dec-payment-defer", to: "ctx-meet-kickoff", rel: "derived_from" },
  { from: "ctx-req-payment", to: "ctx-dec-payment-defer", rel: "derived_from" },
  { from: "ctx-req-payment", to: "ctx-conv-payment-q", rel: "evidences" },
  { from: "ctx-our-approval-design", to: "ctx-req-spec", rel: "implements" },
  { from: "ctx-our-approval-design", to: "ctx-dec-approval-threshold", rel: "derived_from" },
  { from: "ctx-our-approval-design", to: "ctx-doc-security-policy", rel: "derived_from" },
  { from: "ctx-change-sap-sync", to: "ctx-req-spec", rel: "changed_by" },
  { from: "ctx-change-sap-sync", to: "ctx-doc-sap-spec", rel: "conflicts_with" },
  { from: "t-move-approval", to: "ctx-our-approval-design", rel: "implements" },
  { from: "t-move-ui", to: "ctx-req-spec", rel: "implements" },
  { from: "t-sap-sync", to: "ctx-doc-sap-spec", rel: "implements" },
  { from: "t-payment", to: "ctx-req-payment", rel: "implements" },
  { from: "t-excel-export", to: "ctx-conv-filter-request", rel: "derived_from" },
  { from: "del-wbs", to: "ctx-req-spec", rel: "derived_from" },
  { from: "del-weekly-1010", to: "ctx-meet-1009", rel: "derived_from" },
];
