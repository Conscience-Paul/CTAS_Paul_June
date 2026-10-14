import type { AiScenario } from "./types";

/**
 * AI 패널 스크립트. 라우트 prefix 가 가장 길게 일치하는 시나리오를 재생한다.
 * 실제 Nora 호출은 없음 — 프리뷰용.
 */
export const aiScenarios: AiScenario[] = [
  {
    route: "/",
    suggestions: ["오늘 내가 결정해야 할 것", "지연 위험이 큰 프로젝트", "이번 주 고객 발송 예정"],
    turns: [
      { role: "user", text: "오늘 내가 결정해야 할 것" },
      {
        role: "ai",
        text: "승인 대기 4건 중 오늘 처리할 것 2건입니다.\n\n1. **결제 모듈 리마인드 발송** — 7일 미응답, 내일까지 답이 없으면 10/24 착수가 밀립니다.\n2. **재고 이동 승인 API 결과 승인** — 반려 사유가 반영됐고 테스트 21개 통과.\n\n나머지 2건(분류·범위 판정)은 이번 주 안에 하면 됩니다.",
        sources: [
          { id: "ap-2", label: "승인 ap-2" },
          { id: "ap-1", label: "승인 ap-1" },
        ],
      },
    ],
  },
  {
    route: "/projects/p-hanbit-ims",
    suggestions: ["이번 주 검수 가능한가?", "결제 모듈 상태 요약", "고객에게 보낼 주간 보고 초안"],
    turns: [
      { role: "user", text: "이번 주 검수 가능한가?" },
      {
        role: "ai",
        text: "**어렵습니다.** 10/17 검수에 연결된 업무 3건 중 완료 0건입니다.\n\n- 재고 이동 화면 — 진행 중 (박민지)\n- 승인 API — 결과 승인 대기\n- 검수 기준서 합의 — **blocked**, 고객 기준서가 10/14에 옵니다\n\n과거 유사 프로젝트(D사 WMS)에서 같은 상황은 2주 지연으로 끝났습니다. 10/21로 조정하거나 재고 이동을 2차 검수로 분리하는 안을 리스크 카드에 준비해 뒀습니다.",
        sources: [
          { id: "ms-2", label: "마일스톤 ms-2" },
          { id: "risk-delay-review", label: "리스크" },
          { id: "pt-review-criteria", label: "패턴: 검수 기준서" },
        ],
        action: { label: "리스크 카드 열기", effect: "risk:risk-delay-review" },
      },
    ],
  },
  {
    route: "/projects/p-hanbit-ims/context/ctx-req-spec",
    suggestions: ["SAP 동기화 주기 충돌 반영해서 v4 만들어줘", "R-04 알림에 보안 정책 조건 추가", "이 문서의 변경 이력 요약"],
    turns: [
      { role: "user", text: "SAP 동기화 주기 충돌 반영해서 v4 만들어줘" },
      {
        role: "ai",
        text: "R-03 을 다음과 같이 고쳐 v4 를 제안합니다.\n\n> **R-03 SAP 연동** — 재고 수량 양방향 동기화. 주기 **5분** (PR #142). 단, SAP 명세서의 RFC 호출량 제한에 따라 **한빛 BASIS 팀 확인을 조건**으로 함.\n\n근거: PR #142 설명, SAP 인터페이스 명세서 §인증, 충돌 cf-3.\n\n적용하면 v4 가 생성되고 충돌 cf-3 은 'supersede 됨'으로 표시됩니다.",
        sources: [
          { id: "ctx-change-sap-sync", label: "PR #142" },
          { id: "ctx-doc-sap-spec", label: "SAP 명세서" },
          { id: "cf-3", label: "충돌 cf-3" },
        ],
        action: { label: "v4 draft 로 적용", effect: "version:ctx-req-spec" },
      },
    ],
  },
  {
    route: "/projects/p-hanbit-ims/context",
    suggestions: ["결제 모듈 관련해서 고객이 말한 것 전부", "검수 기준서 언제 받기로 했지?", "보안 정책에서 알림 관련 조항"],
    turns: [
      { role: "user", text: "결제 모듈 관련해서 고객이 말한 것 전부" },
      {
        role: "ai",
        text: "고객 발언 3건입니다.\n\n1. **7/2 킥오프** — \"일단 빼고 가되 10월에 다시 논의\" (박정우)\n2. **7/2 Slack** — \"재무팀이랑 얘기해야 해서 10월 2주쯤\" (박정우)\n3. **10/9 미팅** — 재논의를 10/14로 연기 요청 (한빛 재무팀 일정)\n\n우리가 보낸 10/6 질문 4건에는 **응답이 없습니다.**",
        sources: [
          { id: "ctx-meet-kickoff", label: "킥오프 회의록" },
          { id: "ctx-conv-kickoff-followup", label: "Slack 7/2" },
          { id: "ctx-meet-1009", label: "10/9 회의록" },
          { id: "ctx-conv-payment-q", label: "Slack 10/6" },
        ],
      },
    ],
  },
  {
    route: "/projects/p-hanbit-ims/tasks/t-move-approval",
    suggestions: ["AgentRun #2 가 반려 사유를 제대로 반영했는지", "이 업무가 의존하는 결정", "승인하면 다음에 뭐가 일어나?"],
    turns: [
      { role: "user", text: "AgentRun #2 가 반려 사유를 제대로 반영했는지" },
      {
        role: "ai",
        text: "**반영됐습니다.** 반려 사유는 \"대리 승인 시 원 승인자 사후 알림 누락\"이었고, #2 diff 에서:\n\n- `delegate.ts` +17 — 대리 승인 완료 시 원 승인자에게 notify 호출\n- `slack.ts` +9 — 사후 알림 템플릿 (금액 미포함, §5.1 준수)\n- 테스트 3개 추가 (대리 승인 → 원 승인자 알림 수신)\n\n9/25 미팅 합의와 일치합니다. 승인해도 됩니다.",
        sources: [
          { id: "run-2", label: "AgentRun #2" },
          { id: "ctx-meet-0925", label: "9/25 회의록" },
        ],
        action: { label: "결과 승인", effect: "approve:ap-1" },
      },
    ],
  },
  {
    route: "/projects/p-hanbit-ims/risks",
    suggestions: ["미응답 리마인드 초안 보여줘", "검수 연기하면 인수 일정 영향은?", "리스크 우선순위 정리"],
    turns: [
      { role: "user", text: "검수 연기하면 인수 일정 영향은?" },
      {
        role: "ai",
        text: "10/17 → 10/21 로 2영업일 연기해도 **12/5 인수에는 영향 없습니다.** WBS v3 에 이미 검수 버퍼가 반영돼 있고, 2차 검수(11/14)와 인수 사이 3주 여유가 있습니다.\n\n단, 결제·정산이 범위에 포함되면 얘기가 다릅니다 — 그 경우 인수는 12/19 이후로 봐야 합니다.",
        sources: [
          { id: "del-wbs", label: "WBS v3" },
          { id: "ms-4", label: "마일스톤 ms-4" },
        ],
      },
    ],
  },
  {
    route: "/projects/p-hanbit-ims/deliverables",
    suggestions: ["10/17 주간 보고 초안 만들어줘", "검수 기준서 초안을 우리가 먼저 써줘", "WBS v3 변경점"],
    turns: [
      { role: "user", text: "검수 기준서 초안을 우리가 먼저 써줘" },
      {
        role: "ai",
        text: "요구사항 정의서 v3 의 R-01~R-03 을 검수 항목으로 풀어 초안을 만들었습니다. 총 24개 항목.\n\n- R-01 조회: 8항목 (센터 필터, SKU 검색, 응답 시간 등)\n- R-02 이동: 11항목 (4단계 전이, 500만 임계, 대리 승인, 알림)\n- R-03 SAP: 5항목 (5분 동기화, 전표, 장애 시 재시도)\n\n패턴 \"검수 기준서를 고객이 작성하면 늦는다\"에 따라, 이걸 먼저 보내고 고객이 가감하게 하는 방식을 권합니다.",
        sources: [
          { id: "ctx-req-spec", label: "요구사항 v3" },
          { id: "pt-review-criteria", label: "패턴" },
        ],
        action: { label: "산출물로 생성", effect: "deliverable:review-criteria" },
      },
    ],
  },
  {
    route: "/knowledge/contracts",
    suggestions: ["변경 계약 초안에 일정·대금 조항 보완해줘", "60일 안에 만료되거나 갱신 협의가 필요한 문서", "이번 주 고객에게 보내야 할 서류"],
    turns: [
      { role: "user", text: "변경 계약 초안에 일정·대금 조항 보완해줘" },
      {
        role: "ai",
        text: "용역계약 §7·§9 와 WBS v3 를 참고해 두 조항을 추가한 v2 를 제안합니다.\n\n> **§3 일정** — 결제·정산 모듈 포함 시 2차 검수 11/14 → 12/5, 최종 인수 12/5 → **12/19**. 요구사항 확정이 10/24 를 넘기면 주 단위로 순연.\n> **§4 대금** — 추가 금액의 50% 는 요구사항 확정 시, 50% 는 인수 시. 본 계약 §9 의 중간금과 합산 청구.\n\n근거: 용역계약 §9, WBS v3 검수 버퍼, 결제 모듈 미응답 리스크.",
        sources: [
          { id: "ct-hanbit-main", label: "용역계약 §9" },
          { id: "del-wbs", label: "WBS v3" },
          { id: "risk-noresp", label: "리스크: 미응답" },
        ],
        action: {
          label: "v2 draft 로 적용",
          effect: "version:ct-hanbit-cr1",
          payload: {
            summary: "AI 보완 — §3 일정(인수 12/19, 주 단위 순연) · §4 대금(50/50) 추가",
            body: "§1 추가 범위\n결제·정산 모듈 (요구사항 확정 후 확정)\n\n§2 추가 금액\n약 ₩58,000,000\n\n§3 일정\n결제·정산 모듈 포함 시 2차 검수 11/14 → 12/5, 최종 인수 12/5 → **12/19**.\n요구사항 확정이 10/24 를 넘기면 주 단위로 순연한다.\n\n§4 대금\n추가 금액의 50% 는 요구사항 확정 시, 50% 는 인수 시 청구한다.\n본 계약 §9 의 중간금과 합산 청구할 수 있다.",
          },
        },
      },
      { role: "user", text: "60일 안에 만료되거나 갱신 협의가 필요한 문서" },
      {
        role: "ai",
        text: "2건입니다.\n\n1. **세종캐피탈 SLA** — 12/31 만료. 갱신 협의 시작일(만료 45일 전)이 **11/16** 이고 내부 검토 기한은 11/15 입니다. 10월 장애 대응 결과가 갱신 조건에 영향을 줄 수 있습니다.\n2. **한빛유통 용역계약** — 12/31 만료. 결제·정산 변경 계약이 체결되면 인수가 12/19 이후라 **계약 기간 연장 조항**이 필요합니다.\n\n표준 NDA 는 2029 년까지라 해당 없음.",
        sources: [
          { id: "ct-sejong-sla", label: "세종 SLA" },
          { id: "ct-hanbit-main", label: "한빛 용역계약" },
        ],
      },
      { role: "user", text: "이번 주 고객에게 보내야 할 서류" },
      {
        role: "ai",
        text: "발송 예정 2건, 검토 기한 2건입니다.\n\n- **10/15 (수)** 현장 모바일 앱 견적서 — 내부 검토 기한. 20일 발송 예정.\n- **10/16 (목)** 변경 계약 초안 — 내부 검토 기한. 17일 발송 예정이지만 결제 모듈 요구사항이 아직 미확정이라 **발송을 10/14 재논의 이후로 미루는 게 안전**합니다.\n- **10/17 (금)** 변경 계약 — 발송 예정 (승인 필요)\n- **10/20 (월)** 모바일 앱 견적서 — 발송 예정 (승인 필요)",
        sources: [
          { id: "ct-hanbit-cr1", label: "변경 계약" },
          { id: "ct-mobile-quote", label: "모바일 견적" },
        ],
      },
    ],
  },
  {
    route: "/knowledge",
    suggestions: ["ERP 연동 프로젝트에서 자주 터진 문제", "결제 모듈 포함 프로젝트 평균 기간", "검수 지연 패턴"],
    turns: [
      { role: "user", text: "ERP 연동 프로젝트에서 자주 터진 문제" },
      {
        role: "ai",
        text: "패턴 라이브러리 기준 3가지입니다.\n\n1. **운영 ERP 외부망 접근 불가** (4회) — DMZ 프록시 평균 2주\n2. **호출량 제한** (3회) — 동기화 주기 단축 요청이 오면 BASIS 확인 필수\n3. **마스터 데이터 불일치** (2회) — SKU 코드 체계 차이\n\n공수 추정 편차는 ERP 연동이 **1.35배**로 가장 큽니다.",
        sources: [
          { id: "pt-sap-proxy", label: "패턴: ERP 접근" },
          { id: "insights", label: "인사이트" },
        ],
      },
    ],
  },
];
