# CTAS — SI/SM 자동화 사내 서비스 스펙

> 상태: 프리뷰(껍데기) 단계. 화면·라우팅·목데이터로 시스템 구조를 눈으로 확인하는 것이 목적.
> 백엔드(Rust)·DB·Nora 연동은 **경계만 정의**하고 구현하지 않는다.
>
> 스택: Next.js 16 App Router + CTDS(spare 테마, `ctds.config.json`) → Tauri 데스크톱 앱. 백엔드 Rust(추후). AI는 Nora.
> 참고: 업무 자동화·승인 구조는 orbit(`~/Desktop/Projects/orbit`), 군집·충돌 처리는 agent_os(`~/Desktop/Research/main_research/agent_os`)에서 차용.

---

## 0. 한 장 요약

CTAS는 **프로젝트 컨텍스트**를 중심에 두고, 그 위에 **운영(시간축)** 과 **워크플로우(실행축)** 를 얹고, 프로젝트가 끝나면 **지식(교차 프로젝트)** 으로 추상화해 쌓는 구조다.

```
                 ┌──────────────────────────────────────────┐
  Slack/Discord  │  1. Context  (프로젝트 안의 모든 사실)     │
  카톡/이메일 ──▶│  수집 → 전처리(Nora) → 버전·추적 → 검색    │
  Drive/Git      └───────────────┬──────────────────────────┘
                                 │ 근거
          ┌──────────────────────┼──────────────────────┐
          ▼                      ▼                      ▼
  2. Operations           3. Workflow            4. Knowledge
  프로젝트 시간축          업무 실행축             교차 프로젝트
  단계·마일스톤·담당자      요청→업무→실행→검증      산출물·패턴·계획
  리스크 감지·조율 제안     Pre-flight·충돌 관리     (Secure Abstraction 거쳐 승격)
          └──────────────────────┼──────────────────────┘
                                 ▼
                 5. Security — 역할·격리·추상화·컴플라이언스 (가로지르는 층)
```

요구된 16개 능력(Capability)이 어디에 사는지:

| Capability | 사는 곳 | 비고 |
|---|---|---|
| Context Integration | Context (수집) | Nora 커넥터 + Foundry 전처리 |
| Context Traceability | Context (링크 그래프) | CTAS가 소유 |
| Smart Retrieval | Context (검색) + AI 패널 | Nora 벡터 검색을 CTAS가 호출 |
| Risk Detection | Operations › 리스크 | 프로젝트 레벨 |
| Pre-flight Check | **Workflow** (업무 착수 전) + Operations 단계 게이트에서 재사용 | §3.1 참고 |
| Task Automation | Workflow | orbit 승인 3지점 모델 |
| Progress Monitoring | **Operations** (프로젝트 대시보드) | Workflow 상태를 집계 |
| Scope & Conflict Control | Workflow (접수·분류 시점) | agent_os 군집 모델 |
| Auto Deliverables | Knowledge › 산출물 | 프로젝트 안에서 생성, 템플릿은 교차 |
| Knowledge Reuse / Pattern Library / Planning Intelligence | Knowledge | 교차 프로젝트 |
| Access Control / Data Isolation / Secure Abstraction / Compliance | Security (설정 + 모든 화면의 가드) | |

---

## 1. 핵심 개념과 도메인 모델

프리뷰에서도 **용어와 상태 머신은 최종안 그대로** 쓴다. 목데이터는 이 모델을 따른다.

### 1.1 조직 단위

- **Customer(고객사)** — 데이터 격리의 최상위 단위. 보안 정책(Compliance Profile)을 가진다.
- **Project(프로젝트)** — 고객사 아래. SI(구축) 또는 SM(유지보수) 유형. 단계(Stage), 마일스톤, 멤버, 컨텍스트, 업무, 리스크, 산출물을 가진다.
- **Member / Role** — 사내 사용자. 역할은 §5.1.

### 1.2 Context (컨텍스트)

- **Source(소스)** — 연결된 채널. `slack | discord | kakao | email | gdrive | git | meeting | manual`. 고객사·프로젝트에 바인딩.
- **ContextItem(컨텍스트 항목)** — 프로젝트 안의 사실 한 덩어리. 종류: `conversation | customer_doc | our_doc | meeting_note | requirement | decision | change`.
  - `origin`: 어느 소스에서 언제 왔는지(출처).
  - `versions[]`: **ContextVersion** 배열. 수정될 때마다 v+1, 이전 버전은 불변. 각 버전은 `author(사람|AI)`, `summary(변경 요약)`, `basedOn(근거 항목 id들)`을 가진다.
  - `state`: `raw → processed → curated`. raw는 수집 원본, processed는 Nora 전처리 결과(AI 친화 형태), curated는 사람이 확인·정리한 것.
- **Link(추적 링크)** — 항목 간 방향성 간선. `derived_from | decided_by | implements | changed_by | evidences | conflicts_with`. 요구사항 → 의사결정 → 업무 → 산출물 → 변경 의 연결을 만든다. (orbit SystemSpec의 `source` 필드를 일반화한 것)

**저장 위치 제안 (CTAS vs Nora)** — 둘로 나눈다.

| | Nora | CTAS |
|---|---|---|
| 원본 파일·메시지 | ✅ 라이브러리 문서 (소스 커넥터 Watch/ingest) | 참조 id만 |
| 전처리(청크·임베딩·요약) | ✅ Foundry 파이프라인 | 결과 요약 캐시 |
| 벡터 검색 | ✅ | 호출만 |
| **버전 히스토리** | ✗ | ✅ 소스 오브 트루스 |
| **추적 링크 그래프** | ✗ | ✅ |
| 고객사 격리 | 워크스페이스/폴더 단위 | Customer 단위 (Nora 워크스페이스와 1:1 매핑) |

근거: Nora가 이미 하는 일(수집·전처리·검색)은 중복하지 않고, Nora가 안 하는 일(버전·추적·프로젝트 의미 구조)만 CTAS가 가진다. CTAS가 "이 프로젝트에 대해 아는 것"의 시스템 오브 레코드.

### 1.3 Operations (운영)

- **Stage(단계)** — 고정 순서의 라이프사이클.
  `lead(미팅) → requirements(요구사항 정의) → contract(계약) → build(구축) → review(중간 검수) → acceptance(완료/인수) → maintenance(유지보수)`
  SM 프로젝트는 `maintenance`에서 시작한다. 단계 전환은 **게이트 체크리스트**(§3.1 Pre-flight의 단계 버전)를 통과해야 한다.
- **Milestone** — 단계 안의 날짜가 있는 목표. `planned | at_risk | done | missed`. 담당자(owner), 연결된 Task들.
- **Risk(리스크)** — 자동 감지 + 수동 등록. §2.3.

### 1.4 Workflow (워크플로우)

- **Request(요청)** — 고객 또는 내부에서 들어온 원문. 소스(어떤 대화·메일)를 가리킨다. 접수 즉시 **군집 판정**(기존 Task에 합류 / 새 Task / 범위 밖).
- **Task(업무)** — 실행 단위. 상태는 orbit BugReport를 일반화:
  `new → triaged → preflight → in_progress → pending_review → done → verified`, 종결 `wont_do`, 보류 `blocked(사유: 고객 미응답 등)`.
  필드: `kind(bug|feature|change_request|ops|doc)`, `scope(in|out|unclear)`, `owner`, `severity`, `priority`, `dedupKey`, `clusterId`, `links[]`.
- **AgentRun(실행 시도)** — Task 하나에 n차 시도. `queued → running → submitted → approved | rejected | failed`. 각 시도: plan, summary, diff/PR 또는 산출물, 반려 사유(다음 시도 프롬프트에 포함).
- **Approval(승인)** — 사람이 결정하는 지점. 종류 `triage | preflight | result | customer_send`. (orbit의 "분류 / 코드 승인 / 고객 발송" 3지점 + Pre-flight 1지점)
- **Conflict(충돌)** — `duplicate_task | owner_overlap | requirement_conflict | scope_creep`. 근거 링크와 제안 조치를 가진다.

### 1.5 Knowledge (지식)

- **Deliverable(산출물)** — 프로젝트 안에서 생성. `wbs | report | meeting_minutes | customer_doc | proposal`. ContextItem처럼 `versions[]`를 가지며 `generatedFrom(근거 항목들)`을 기록.
- **Template(템플릿)** — 산출물 생성의 틀. 교차 프로젝트.
- **Pattern(업무 패턴)** — 반복 요구사항·리스크·문제·해결의 일반화. `draft → anonymized → reviewed → published`. 원본 프로젝트 id는 내부 감사용으로만 보관(§5.3).
- **Insight(계획 인텔리전스)** — 과거 데이터 통계. 공수 추정 편차, 단계별 지연 확률, 지연 원인 분포.

---

## 2. 기능 명세

### 2.1 Context 관리

**화면**: `/projects/[id]/context`

| 기능 | 설명 | 프리뷰에서 보여줄 것 |
|---|---|---|
| 소스 연결 | 프로젝트에 Slack 채널·Drive 폴더·메일함·Git 레포를 바인딩 | 연결된 소스 카드 목록, 마지막 동기화 시각, "Nora 커넥터" 배지 |
| 수집 큐(Inbox) | 새로 들어온 raw 항목. 전처리 상태 표시 | 상태 Chip(`raw/processed/curated`), 소스 아이콘, 미리보기 |
| 항목 상세 | 본문 + 버전 레일 + 출처 + 연결 그래프 | 좌: 버전 리스트(v1…vN), 중: 본문, 우: 링크 패널 |
| **AI 챗뷰로 편집** | 우측 패널에서 "이 요구사항 정리해줘" → AI가 수정 제안 → 적용하면 v+1 | 스크립트된 대화 + 버전 증가 애니메이션 |
| 추적 그래프 | 요구사항→결정→업무→산출물→변경 경로 시각화 | 선택 항목 기준 2-hop 그래프 |
| Smart Retrieval | 자연어 질의 → 근거 항목 목록 + 발췌 + 출처 | 검색창 + 결과 카드(`MessageSources` 컴포넌트) |

**AI 챗뷰(공통 패널)**: 모든 화면 우측에 접었다 펼 수 있는 패널. Cursor처럼 현재 보고 있는 항목이 컨텍스트로 잡힌다. 프리뷰에서는 목 시나리오를 재생한다.

#### 2.1.1 문서 버전 · draft · 배포 (CTAS = 원본 저장소, Google Drive = 배포 대상)

```
수집   Google Drive·Docs · 카카오톡 · Discord · …  → CTAS 에 항상 저장·갱신 (자동)
생성   Nora 가 CTAS 를 근거로 정의된 문서 생성/수정
draft  사람·Nora 의 수정은 전부 draft 로 — 승인 전엔 Drive 미반영
배포   사람 승인 → 다음 버전으로 확정 + Google Drive 에 씀 (수동)
```

| 규칙 | 내용 |
|---|---|
| draft 는 문서당 하나 | 다시 고치면 같은 draft 를 덮어쓴다. 표시: `v22 · draft`, 문서 상단 "업데이트 있음" 배너 |
| 승인 | 누구나 승인 가능. 단 보안 문서(계약문서)는 관리자만. 승인 → `v22 · 배포됨` |
| 배포 대상 | Google Drive(문서)만. 카카오·Discord 등은 읽기 전용 소스 |
| 원본이 Drive 에 있으면 | 승인 시 그 파일을 새 버전으로 덮어쓴다 |
| 원본이 없는 새 문서 | 승인 시 지식 폴더 구조 그대로 Drive 에 새 파일 생성 (`CTAS › 고객사 › 프로젝트 › 종류 › 제목`) |
| Drive 원본을 사람이 직접 수정 | 수집되어 새 확정 버전으로 들어온다. 기존 draft 는 그대로 유지 |
| 폐기 | draft 를 버리면 확정 버전은 그대로 |
| 배포 실패 | 당분간 고려하지 않음 |
| 버전 비교 | 버전 탭 = 좌: 버전 목록(draft 맨 위), 우: 선택 버전 vs 이전 버전 스플릿 diff (Cursor 식 — 삭제 빨강, 추가 초록, 줄 번호) |

### 2.2 운영 프로세스

**화면**: `/projects/[id]` (개요), `/projects/[id]/operations`

| 기능 | 설명 | 프리뷰 |
|---|---|---|
| 단계 트래커 | 7단계 Stepper. 현재 단계, 각 단계 게이트 통과 여부 | `Stepper` 컴포넌트 |
| 마일스톤 | 타임라인 + 리스트. 담당자, 연결 업무, 상태 | `EventChip`, 테이블 |
| 담당자 | 역할별 멤버, 투입률 | `Avatar` 그룹 |
| 단계 게이트 | 다음 단계로 넘어갈 때 체크리스트 (요구사항 확정됐나, 계약서 있나 …) | `Checkbox` 리스트 + 미충족 항목 `Callout` |
| **진행 모니터링** | 업무 상태 집계, 고객 응답 대기 건, 지연 건 | `MetricCard` 4개 + 업무 상태 분포 |

### 2.3 리스크 감지와 조율 제안

**화면**: `/projects/[id]/risks`, 대시보드 요약

리스크 타입과 감지 근거:

| 타입 | 감지 조건(예) | AI 제안(예) |
|---|---|---|
| `missing_requirement` | 계약 범위에 있으나 요구사항 항목이 없음 | "결제 모듈 요구사항 정의 미팅 요청 메일 초안" |
| `schedule_delay` | 마일스톤 D-3, 연결 업무 50% 미만 | "일정 3일 연기 또는 범위 축소안 2개" |
| `policy_conflict` | 고객 보안 정책 vs 제안 아키텍처 충돌 | "외부 API 호출을 온프렘 프록시로 대체 제안" |
| `no_response` | 고객 질문 후 N일 무응답, 후속 업무 blocked | "**내일까지 응답 없으면 일정 조율 필요** — 리마인드 메시지 초안" |
| `scope_creep` | 접수 요청이 계약 범위 밖으로 판정 | "변경 요청(CR)으로 전환 제안" |
| `owner_overlap` | 두 담당자의 업무가 같은 요구사항을 구현 | "담당 통합 또는 분할 제안" |

리스크 카드: 심각도, 근거(링크된 컨텍스트 항목), 제안 조치, 액션 버튼(`고객에게 보내기(승인 필요)` / `일정 조정` / `무시(사유)`). "고객에게 보내기"는 Approval `customer_send`를 만든다.

### 2.4 Workflow 관리

**화면**: `/projects/[id]/tasks` (보드/테이블), `/projects/[id]/tasks/[taskId]`, 글로벌 `/approvals`

파이프라인 (orbit 운영 루프 + agent_os 군집을 합침):

```
Request 접수 ─▶ 군집 판정 ─▶ [승인: triage] ─▶ Pre-flight ─▶ [승인: preflight]
   (소스 연결)    기존 Task 합류?        담당·심각도      누락 정보·정책 충돌·범위
                  새 Task? 범위 밖?                       → 통과 못 하면 blocked + 리스크

─▶ 실행(AgentRun n차 / 사람) ─▶ 결과 검증 ─▶ [승인: result] ─▶ 후속 조치 ─▶ [승인: customer_send]
                                 diff·산출물      반려 사유는          고객 보고·리포트
                                                 다음 시도에 포함
```

| 기능 | 설명 | 프리뷰 |
|---|---|---|
| 요청 인박스 | 접수된 Request, 군집 판정 결과(합류/신규/범위밖) | 리스트 + 판정 Chip |
| **Pre-flight 체크** | 착수 전 자동 점검 결과: 누락 정보, 정책 충돌, 범위 이슈 | Task 상세 상단 `Callout` 묶음, 통과/미통과 |
| 업무 보드 | 상태별 칸반 + 테이블 토글 | `Tabs` + 카드/`TableRow` |
| Task 상세 | 타임라인, 실행 시도 목록, 승인 이력, 연결 컨텍스트 | 좌 본문, 우 사이드 패널 |
| AgentRun 뷰 | 시도별 plan/summary/diff, 승인·반려 | `CodeBlock`, 반려 사유 `Textarea` |
| 승인 큐 | 전 프로젝트 승인 대기 (종류별 필터) | 글로벌 메뉴 |
| **충돌 관리** | 중복 업무, 담당자 겹침, 요구사항 충돌 목록. 각각 병합/분할/supersede 액션 | `/projects/[id]/conflicts` |

설계 원칙(orbit에서 그대로):
- 에이전트는 "했다"까지. 승인은 사람. 상태 전이는 러너(CTAS)가 쥔다.
- 승인 근거는 에이전트 출력이 아니라 실제 결과물(diff·파일).
- 막히면 반려가 아니라 승인 대기로 남긴다.

### 2.5 Knowledge 관리

**화면**: 프로젝트 안 `/projects/[id]/deliverables`, 글로벌 `/knowledge/*`

Context와의 경계: **Context는 프로젝트 안의 사실, Knowledge는 프로젝트를 가로지르는 일반화**. 산출물은 프로젝트 안에서 만들어지지만(Context의 연장) 템플릿·패턴·인사이트는 교차 프로젝트다.

| 기능 | 위치 | 설명 | 프리뷰 |
|---|---|---|---|
| Auto Deliverables | 프로젝트 › 산출물 | "WBS 생성" → 근거 컨텍스트 선택 → 템플릿 선택 → 초안 v1 → AI 챗으로 수정 → v+1 | 생성 위저드(3단계) + 버전 레일 |
| Knowledge Reuse | AI 패널 + Knowledge › 검색 | 현재 프로젝트 상황과 유사한 과거 사례 추천 | "비슷한 프로젝트 3건" 카드 |
| Pattern Library | `/knowledge/patterns` | 패턴 목록(요구사항/리스크/문제/해결). 승격 상태, 사용 횟수 | 카드 그리드 + 상세 |
| Planning Intelligence | `/knowledge/insights` | 단계별 평균 소요·지연 확률, 공수 추정 편차. 새 WBS에 "예상 지연 구간" 표시 | 차트 2~3개(목) |

### 2.6 보안

**화면**: `/settings/*` + 모든 화면의 가드(프리뷰는 역할 전환 스위치로 시연)

| 기능 | 설명 | 프리뷰 |
|---|---|---|
| Access Control | 역할 × 리소스 × 액션 매트릭스. 프로젝트 멤버십 기반 | `/settings/roles` 매트릭스 표, 상단 "역할로 보기" 스위치 |
| Data Isolation | Customer = Nora 워크스페이스 1:1. 프로젝트 간 교차 조회 불가. 검색은 현재 프로젝트 범위 고정 | `/settings/customers` 격리 다이어그램, 검색창 범위 배지 |
| Secure Abstraction | Context → Pattern 승격 파이프라인: 식별자 제거 → 리뷰 → 게시. 원본 역추적은 관리자만 | `/knowledge/patterns/promote` 위저드 (before/after 비교) |
| Compliance | 고객사별 정책 프로필: 외부 AI 허용 여부, 보존 기간, 데이터 지역, 공유 채널 제한 | `/settings/compliance` 프로필 카드, 위반 시 `Callout` |

---

## 3. 운영 vs 워크플로우 — 설계 제안

질문: Pre-flight·Progress Monitoring은 운영에 두나, 워크플로우에 두나.

**제안: 축으로 나눈다.** 운영은 *프로젝트의 시간축*(계약 단계·마일스톤·리스크), 워크플로우는 *업무의 실행축*(요청→실행→검증). 같은 능력이 두 축에서 다른 입도로 나타난다.

| | Operations (프로젝트, 주 단위) | Workflow (업무, 시간 단위) |
|---|---|---|
| Pre-flight | **단계 게이트** — "계약으로 넘어가도 되나" 체크리스트 | **착수 점검** — "이 업무 시작해도 되나" (누락 정보·정책·범위) |
| Progress Monitoring | **대시보드** — 업무 집계, 마일스톤 vs 실제, 응답 대기 | **보드** — 개별 업무 상태, blocked 사유 |
| Risk | 소유 (감지·제안·조율) | 리스크를 *발생*시킴 (blocked, 지연) |
| Scope/Conflict | 범위 정의(계약) 소유 | 판정·탐지 (접수 시점) |

### 3.1 Pre-flight 체크 하나의 엔진, 두 개의 입구

점검 항목은 하나의 **Checklist 엔진**으로 정의하고 호출 지점만 다르다.

| 점검 | 단계 게이트에서 | 업무 착수에서 |
|---|---|---|
| 필수 컨텍스트 존재 | "확정 요구사항 문서 있나" | "이 업무의 근거 요구사항이 연결됐나" |
| 정책 충돌 | 고객 컴플라이언스 vs 아키텍처 | 이 업무의 변경이 정책에 걸리나 |
| 범위 | 계약 범위 확정됐나 | 이 업무가 범위 안인가 |
| 미응답 | 고객 확인 대기 항목 | 이 업무가 기다리는 답변 |

결론: 메뉴상 Pre-flight는 **워크플로우(Task 상세)** 에 보이고, 운영의 단계 트래커는 같은 엔진을 "게이트"라는 이름으로 쓴다. Progress Monitoring은 **운영(프로젝트 개요)** 에 둔다.

---

## 4. 정보 구조 (IA) 와 라우팅

### 4.1 내비게이션

`AppFrame layout="sidebar-first"`. 사이드바는 **Rail(영역 5개) + Panel(영역 메뉴)** 2단. CTDS 규칙대로 `SidebarSplit` 대신 flex 로 Rail + `Sidebar` 를 직접 조립. 활성 영역은 라우트에서 유도하고, 지식·개발 패널은 "현재 프로젝트"(마지막으로 본 프로젝트, 패널 상단 스위처로 변경) 기준 메뉴를 보여준다.

```
Rail            Panel (검색 + 메뉴)
──────          ─────────────────────────────────────────────
▣ 대시보드       개요 /  ·  승인 목록 /approvals  ·  투두 /todo

◎ 운영          프로젝트 /projects · 마일스톤 /ops/milestones (타임라인·캘린더·테이블,
 (매니저)        프로젝트/담당자 그룹, 필터) · 리소스 /ops/resources (팀원 투입률·부하) · 인사이트 /ops/insights
                ※ 단계·리스크·프로젝트 설정은 프로젝트 상세 안에서 — 운영 패널엔 현재 프로젝트 섹션 없음

▤ 지식          문서함 /knowledge (Finder 식: 고객사 › 프로젝트 › 회의록·요구사항·
 (문서 집합소)   의사결정·고객 문서·우리 문서·대화·변경·산출물 + 루트의 패턴 라이브러리·템플릿)
                (인사이트는 운영으로 이동)
                [현재 프로젝트 ▾] 추적 그래프
                보안 · 관리자 전용 — 계약문서 /knowledge/contracts (메뉴는 모두에게 보이고, 열람은 관리자만)
                AI 는 탑바 패널 — 문서 행을 끌어다 놓으면 멘션

</> 개발        개발 목록 /dev (버그·신규 기능·변경 요청만, 문서·운영 업무 제외) · 에이전트 /dev/agents · 배포 /dev/deploy · 종결 /dev/closed
                (orbit Operate 4단계. 충돌은 Nora 에이전트가 처리 — 메뉴 없음. 프로젝트 선택은 각 페이지 필터)

⚙ 설정          개요 · 조직 · 역할·권한 · 고객사·격리 · 컴플라이언스 · 연동

Rail 하단: AI 사이드 패널 토글 · 프로필
```

영역 경계: **운영**은 매니저 공간(단계·마일스톤·리스크·계약처럼 높은 권한이 필요한 것), **지식**은 모든 문서의 집합소(컨텍스트·산출물·패턴·템플릿, 버전 관리)이며 AI 채팅의 주 진입점, **개발**은 업무 실행축(orbit 과 같은 구조).

Topbar: 현재 경로 `Breadcrumb` 왼쪽, 오른쪽 끝에 알림(안 읽음 배지 · 드롭다운 리스트 · 항목 클릭 시 관련 화면으로 이동 · 모두 읽음) · 미리보기 토글(오른쪽 localhost 웹뷰) · AI 패널 토글. 역할 전환은 설정 › 역할·권한에.

**AI**: 주 화면은 지식 › AI 채팅(전체 폭, 범위 = 현재 프로젝트). 우측 사이드 패널은 "AI로 수정" 같은 화면 내 버튼이 열 때만 등장(기본 닫힘).

### 4.2 라우트 목록

| 경로 | 화면 | 핵심 컴포넌트 |
|---|---|---|
| `/` | 대시보드 — 탭 「오늘」: 승인 대기·리스크 상위·지연 마일스톤·프로젝트 / 「운영 현황」: 프로젝트별 진행률·업무 상태 분포·리스크 종류·담당자 부하·14일 내 마일스톤 | MetricCard, Tabs, ListItem, CSS 바 차트 |
| `/todo` | 투두: 승인·차단 해제·내 업무·리스크 확인·내 마일스톤 (체크는 로컬) | Checkbox, List |
| `/ops/milestones` | 전 프로젝트 마일스톤 — 타임라인(오늘선, 주 눈금, 프로젝트/담당자 그룹) · 캘린더(월 이동, EventChip) · 테이블. 프로젝트·담당·상태 필터 | Tabs(segmented), EventChip, TableRow |
| `/ops/resources` | 팀원 × 프로젝트 투입률(100% 기준선, 과투입 경고) + 부하 매트릭스(열린 업무·차단·마일스톤) | MetricCard, Callout |
| `/knowledge/contracts` | 지식 › **계약문서** (보안 · 관리자 전용) — 상단 보안 안내 Callout. Finder/Drive 식 탐색: 한 리스트에 하위 폴더(위) + 문서(아래), 폴더 행 클릭으로 진입, 상단 경로(계약문서 › 고객사 › 프로젝트)와 ← 로 복귀. 리스트 컬럼(문서·종류·상태·전달·상대방·금액·다음 일정·버전·원본 아이콘). 상태/전달 FilterButton 이 지표 역할. 행 클릭 → Drawer(내용 보기/편집 → v+1 · 버전 히스토리 · 전달 상태·이력·발송 예약/고객 발송). 메뉴는 모든 역할에 보이고, 관리자 외 역할이 들어오면 잠금 화면 | TableRow, Drawer, FileIcon, VersionRail, Textarea, Callout |
| (계약문서 우상단 💬) | 우측 AI 사이드 패널. 문서 행을 **드래그앤드롭**하면 패널에 멘션(첨부 칩)되고 AI 가 그 문서를 보고 답한다. Drawer 의 "AI 로 보완"도 같은 멘션. 제안 적용 시 해당 문서에 v+1 | AiPanel, ChatInput attachments |
| `/knowledge` | 지식 문서함 — Finder 식 폴더 + 리스트(이름·종류·상태·출처·최근 작성·수정·원본 아이콘). 상태 = 버전 상태(`v3 · 배포됨` / `v4 · draft`), 수정 = 날짜, 필터 전체/draft/배포됨. 종류는 컨텍스트만 있는 폴더(회의록 등)에선 숨김. 실행 결과는 제출됨(draft)·승인됨(배포됨)만 노출. AI 작성자는 "Nora". 처음엔 현재 프로젝트 폴더에서 시작. 행 클릭 → Drawer(내용 보기/편집 → v+1 · 버전 · 연결: 추적 링크·연결 업무). 드래그 → AI 패널 멘션 | TableRow, Drawer, VersionRail |
| `/dev` | 개발 › 개발 목록 — 개발 항목(버그·신규 기능·변경 요청)만. 지표 카드 없이 프로젝트·담당·상태·종류 건수 필터. 재접수 칩, 접수(고객/내부), 에이전트 진행 상태(수정 중/승인 요청/반려) 컬럼. 「접수」→ 접수 Drawer(orbit intake: 제목·프로젝트·종류·환경·심각도·우선순위·접수 경로 + 종류별 시나리오(어디서/재현/결과/단서 · 어디에/필요/이유/참고) + 첨부 + 관련 컨텍스트 + Nora 위임) → state=new 로 목록에 추가, Nora 군집 판정(목), 체크 → AI 분석 · 통합(그룹 = AI 스레드 하나), 행 클릭 → 업무 Drawer | TableRow(selectable), Drawer |
| `/dev/agents` | 개발 › 에이전트 — AgentRun 목록(실행 중·승인 대기·반려·승인됨 지표), 행 클릭 → 실행 결과 문서 Drawer | TableRow, KnowledgeDrawer |
| `/dev/deploy` | 개발 › 배포 — 배포된 변경(change 컨텍스트) + 승인 대기 결과, 행 클릭 → Drawer | TableRow |
| `/dev/closed` | 개발 › 종결 — 검증됨·완료·하지 않음 업무, 행 클릭 → 업무 Drawer | TableRow |
| `/projects` | 프로젝트 목록(고객사별 그룹, 단계·리스크 수·담당 PM) | TableRow, Chip, Avatar |
| `/projects/[id]` | 운영 개요: 단계 Stepper, 마일스톤, 담당자, 진행 지표, 리스크 요약 | Stepper, MetricCard, EventChip |
| `/projects/[id]/context` | 소스·인박스·항목 리스트 | Tabs, ListItem, FileIcon |
| `/projects/[id]/context/[itemId]` | 항목 상세: 버전 레일 / 본문 / 링크 패널 | SidebarSplit, Disclosure, Badge |
| `/projects/[id]/context/graph` | 추적 타임라인 — 가로 날짜 × 세로 레인(입력·요구·결정·설계·변경·업무·산출물·계약). 선 없이 카드마다 근거(←)·파생(→) 표기, 선택 시 계보만 하이라이트, 우측에 근거/파생 목록, 더블클릭 → Drawer. AI 답변도 같은 계보(lineageOf)와 버전 이력을 근거로 인용 | CSS 타임라인, KnowledgeDrawer |
| `/projects/[id]/tasks` | 요청 인박스 + 보드/테이블. 보드 카드·테이블 행 클릭 → **업무 Drawer**(개요·Pre-flight / 실행 / 타임라인 / AI 스레드). 테이블은 체크박스 선택 → 「AI 분석」(선택 업무를 AI 패널에 멘션) · 「통합」(그룹 행 아래 멤버 들여쓰기, 접기/펼치기). **통합 그룹은 AI 스레드 하나를 공유**, 그 외 업무는 각자 스레드. Drawer AI 스레드 탭에서 통합 해제 | Tabs, TableRow(selectable), Drawer |
| `/projects/[id]/tasks/[taskId]` | Task 상세: Pre-flight, 타임라인, AgentRun, 승인 | Callout, CodeBlock, Stepper |
| `/projects/[id]/risks` | 리스크 목록·상세·제안 조치 | Callout, Button, Modal |
| `/projects/[id]/conflicts` | 중복/겹침/요구충돌 목록, 병합·supersede | TableRow, SplitButton |
| `/projects/[id]/deliverables` | 산출물 목록 + 생성 위저드 | Stepper, SelectableCard |
| `/projects/[id]/deliverables/[docId]` | 산출물 상세(버전 레일 동일) | SidebarSplit |
| `/projects/[id]/settings` | 멤버·역할, 소스 바인딩, 컴플라이언스 프로필 적용 | Select, Switch |
| `/approvals` | 전 프로젝트 승인 큐 — 얇은 리스트(상태·종류 건수 필터), 행 클릭 → Drawer(메시지 + 근거: 실행 결과 diff / 업무 Pre-flight / 리스크 제안·초안 / 산출물 본문). Drawer 안에서 승인·반려(사유) 후 다음 항목으로, **⌘← / ⌘→** 로 이전·다음 이동, 위치 n/total | TableRow, Drawer |
| `/knowledge/patterns` `/[id]` `/promote` | 패턴 라이브러리·상세·승격 위저드 | GalleryItem, Stepper |
| `/knowledge/templates` | 산출물 템플릿 | GalleryItem |
| `/ops/insights` | 인사이트(계획 인텔리전스) — 단계별 계획 vs 실제, 지연 원인, 공수 추정 편차, 유사 프로젝트. 운영(리스크 옆)으로 이동 | MetricCard + 차트 |
| `/settings/{org,roles,customers,compliance,integrations}` | 조직 설정 | TableHeader/Row, Switch |

---

## 5. 보안 모델 상세

### 5.1 역할

| 역할 | 범위 | 할 수 있는 것 |
|---|---|---|
| `admin` | 조직 | 전부. 패턴 원본 역추적, 컴플라이언스 편집 |
| `pm` | 소속 프로젝트 | 운영·리스크·승인(customer_send 포함)·산출물 |
| `engineer` | 소속 프로젝트 | 업무 실행, AgentRun, result 승인 요청 |
| `viewer` | 소속 프로젝트 | 읽기 |
| `customer` *(추후 포털)* | 자기 고객사 | 상태·공개 코멘트만. diff·반려 사유·내부 코멘트 비노출 (orbit 포털 규칙) |

### 5.2 격리

Customer ↔ Nora 워크스페이스 1:1. 검색·AI 패널의 컨텍스트 범위는 항상 **현재 프로젝트**로 잠긴다. 교차 프로젝트 접근은 Knowledge 층(추상화된 것)으로만 가능.

### 5.3 Secure Abstraction 승격 파이프라인

```
프로젝트 Context/Risk/Task ─▶ 후보 선택 ─▶ 자동 익명화(고객명·금액·인명·시스템명 치환)
  ─▶ 리뷰어 확인(before/after 비교) ─▶ 게시(Pattern) ─▶ 원본 참조는 admin 감사 로그에만
```

### 5.4 컴플라이언스 프로필 (고객사별)

`allowExternalAI`, `retentionDays`, `dataRegion`, `allowedChannels[]`, `requireApprovalForCustomerSend`. 프로필 위반 동작은 UI에서 차단하고 사유를 `Callout`으로 표시.

---

## 6. 프리뷰 구현 규칙

1. **동작하지 않아도 된다. 보여야 한다.** 모든 데이터는 `lib/mock/` 아래 TS 모듈. API·DB·Nora 호출 없음.
   **수집은 이미 끝난 상태로 가정** — 소스 연결·동기화 화면은 "연결됨" 상태의 목만 보여주고, 실제 커넥터 연동은 개발 단계에서 추가.
2. **하나의 이야기로 묶인 목데이터.** 고객사 2곳, 프로젝트 3개(SI 2, SM 1). 메인 시나리오: "A사 재고관리 시스템 구축" — 요구사항 1건 누락, 고객 미응답으로 blocked된 업무 1건, 담당자 겹침 1건, WBS v3까지 버전 히스토리. 모든 화면이 이 데이터를 참조해 서로 연결돼 보이게.
3. **AI 패널은 스크립트.** `mock/ai-scenarios.ts`에 화면별 대화 시나리오. "적용" 클릭 시 버전이 올라가는 것처럼 로컬 상태만 변경(새로고침하면 초기화).
4. **상태 전이는 로컬 상태.** 승인·반려·상태 변경 버튼은 동작하되 메모리에만 반영.
5. **CTDS 절대 규칙 준수.** 색·크기·시간 하드코딩 금지, 토큰·프리미티브 경유. 플로팅은 `.m-float`. 축은 `ctds.config.json`(spare/light/274°/crisp/phosphor).
6. **백엔드 경계만 선언.** `lib/api/` 에 Rust/Tauri 커맨드가 될 함수 시그니처를 두고 목 구현을 붙인다. 추후 `invoke()`로 교체.
7. **Tauri 래핑** — `src-tauri/` (Tauri 2, 크레이트 `ctas`). Next 는 `output: "export"` 정적 내보내기(`out/`)이며 동적 라우트는 각 `page.tsx` 의 `generateStaticParams` 가 목데이터 id 로 미리 생성하고 화면 본체는 같은 폴더의 `view.tsx`("use client") 에 있다.
   - `npm run desktop:dev` — 데스크톱 창에서 dev 서버(:3000) 로드
   - `npm run desktop:build` — `out/` 빌드 후 `.app` / `.dmg` 번들 (`src-tauri/target/release/bundle/`)
   - CTDS 온보딩 라우트(`app/ctds`)는 서버 액션을 써서 정적 내보내기와 충돌 → `ctds-onboarding.disabled/` 로 옮겨 둠. 온보딩을 다시 돌리려면 `app/ctds` 로 되돌린 뒤 `npm run dev`.

### 6.1 디렉터리

```
app/                 라우트 (§4.2)
components/ctds/     CTDS (수정 금지, update로만 갱신)
components/ctas/     CTAS 조합 컴포넌트 (VersionRail, TraceGraph, RiskCard, PreflightPanel, AiPanel …)
lib/api/             백엔드 경계 (타입 + 목 구현)
lib/mock/            목데이터 (customers, projects, context, tasks, risks, patterns, ai-scenarios)
spec.md              이 문서
```

### 6.2 단계

| 단계 | 범위 |
|---|---|
| P0 | AppFrame 셸, 사이드바 2단 구조, Topbar, AI 패널 뼈대, 목데이터 모델·시드 |
| P1 | 프로젝트 목록·개요(운영), Context 리스트·상세(버전 레일·링크 패널), AI 챗 시나리오 1개 |
| P2 | Workflow: 요청 인박스, 보드, Task 상세(Pre-flight·AgentRun·승인), 리스크, 충돌, 승인 큐 |
| P3 | Knowledge: 산출물 위저드, 패턴·승격 위저드, 인사이트. 설정: 역할 매트릭스, 격리, 컴플라이언스 |
| P4 | 대시보드 운영 현황 탭, 역할 전환 시연, Tauri 래핑 — 완료 |

---

## 6.3 구현 메모 (프리뷰 빌드 중 발견)

- `components/ctds/index.ts` 가 번들에 없는 `./Calendar` 를 export 해 빌드가 깨진다(ctds 0.2.5). CTDS 파일은 건드리지 않고 `components/ctas/ctds.ts` 에 그 줄만 뺀 배럴을 두고 **모든 CTAS 코드는 이 배럴에서 import** 한다.
- `Select` 는 문서의 `<Select><Select.Item/></Select>` 표면이 실제로는 동작하지 않는다 — `Select.Trigger` + `Select.Content` 를 명시해야 한다.
- `create-next-app` 기본 `next.config.ts` 의 Turbopack `*.css` 규칙이 CSS Module 을 전역 CSS 로 바꿔 클래스가 `undefined` 가 된다. `condition: { not: { path: /\.module\.css$/ } }` 로 제외.
- CLI 의존성 안내에 `lottie-react`, `@radix-ui/react-dropdown-menu` 가 빠져 있다.
- 온보딩 `Onboarding/actions.ts` 는 서버 액션이라 `output: "export"` 와 충돌. 루트 배럴에도 포함돼 있어 배럴 import 만으로 그래프에 들어온다.
- `CodeBlock` 은 `TooltipProvider` 없이 throw. `init` 이 `layout.tsx` 패치 시 `TooltipProvider`·`ToastProvider` 도 넣어주는 게 맞다.
- `FilterButton.onToggle` 이 React 19 네이티브 `onToggle` 타입과 충돌해 사용 불가. `Chip` 은 `onClick` 이 없어 클릭 가능한 칩을 만들 수 없다. `SplitButton` 은 `menuLabel`·드롭다운 연결이 필수.
- spare 테마 프리셋은 `shape: standard` 인데 온보딩이 `crisp` 를 기록. 의도된 조정이면 DESIGN.md 에 Why 가 있어야 한다.
- `ctds` 스킬이 하위 스킬(`ctds-page` 등)로 라우팅하지만 `init` 이 하위 스킬을 복사하지 않는다. 스킬의 온보딩 경로도 `/onboarding` 이 아니라 `/ctds`.
- 스크롤바는 `app/globals.css` 에서 전역 숨김(스크롤은 유지). CTDS `--scrollbar-size` 토큰을 덮는다.
- `ListItem` 은 음의 margin 으로 부모 row 의 padding 을 되찾는 구조라 **row wrapper 없이는 항목이 겹치고 hover 가 이웃을 침범**한다. 문서에 wrapper 예시가 없어 전 페이지가 같은 실수를 함. CTAS 는 `ui.tsx` 의 `List` 로 감싼다 — CTDS 가 컨테이너를 같이 제공해야 한다.
- **`ctds.config.json` 이 적용되지 않는다** — `init` 이 패치한 `layout.tsx` 는 `ThemeController` 에 `initialConfig` 를 안 넘기고, 부트 스크립트·ThemeController 는 localStorage 와 OS 다크모드만 본다. 온보딩에서 light/274° 를 골라도 다크/210° 로 뜬다. CTAS 는 `app/layout.tsx` 에서 config 를 import 해 `initialConfig` 로 넘기고, 부트 스크립트 앞에 config → localStorage 시드 스크립트를 둔다(`ctds-config-applied` 스탬프로 재적용 감지).
- `TableHeader`/`TableRow` 의 `line` variant 는 "페이지 표면에 얹는 눈금자"라 첫/끝 셀 padding 이 0 — 테두리 카드(`Panel flush`) 안에 넣으면 셀이 경계에 붙는다. CTAS 는 테두리 없는 `TableBox` 래퍼에 바로 얹는다. 카드 안에 넣으려면 `plate` variant 를 써야 하는데, 문서에 이 구분이 "variant 선택 기준" 한 줄뿐이라 놓치기 쉽다.
- `Page` 에 `--content-max` 폭 제한을 걸면 AI 패널 옆이 비어 보인다. 콘텐츠는 남는 폭을 전부 쓰게 둔다.
- 프리뷰 "오늘"은 `lib/mock/index.ts` 의 `TODAY = 2026-10-13` 으로 고정. D-day 계산은 전부 이 값 기준.

## 7. 열린 결정

- [ ] 카카오톡 수집 경로 — 공식 API 없음. 내보내기 파일 업로드(`manual`)로 시작할지.
- [ ] Git 소스 — 커밋/PR을 ContextItem(`change`)으로 넣을지, Task의 AgentRun 결과로만 둘지.
- [ ] 고객 포털 — CTAS 안에 두는지(orbit처럼) 별도인지. 프리뷰 범위 밖.
- [ ] Nora Foundry 전처리 결과 중 무엇을 CTAS에 캐시할지(요약·엔티티·분류 라벨).
- [ ] 승인 알림 채널 — 데스크톱 알림 / Slack.
- [ ] 패턴 익명화 범위 — 금액·일정 수치를 구간화할지 제거할지.
