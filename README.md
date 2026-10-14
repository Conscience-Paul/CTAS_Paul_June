# CTAS — SI/SM 자동화 사내 서비스 (프리뷰)

Next.js 16 + CTDS 로 만든 **프론트 프리뷰**. 백엔드·DB·Nora 연동 없이 목데이터로 시스템 구조를 보여준다. 기능 정의는 [spec.md](spec.md).

## 실행

```sh
npm install
npm run dev            # http://localhost:3000
npm run desktop:dev    # Tauri 데스크톱 창 (dev 서버 필요)
npm run desktop:build  # 정적 내보내기 → .app / .dmg (src-tauri/target/release/bundle/)
```

Tauri 빌드에는 Rust 툴체인(cargo)과 Xcode Command Line Tools 가 필요하다.

## 구조

```
app/                 라우트. 동적 세그먼트는 page.tsx(정적 파라미터) + view.tsx(화면)
components/ctds/     CTDS 컴포넌트 — 수정 금지, `npx ctds update` 로만 갱신
components/ctas/     CTAS 셸·공통 조각 (AppShell, AiPanel, VersionRail, ui, ctds 배럴)
lib/mock/            목데이터 — "한빛유통 재고관리 구축" 하나의 이야기
lib/api/             Rust/Tauri 커맨드가 될 시그니처 (지금은 목 구현)
lib/preview-state    프리뷰 로컬 상태 (승인·버전·리스크 처리 — 새로고침 시 초기화)
src-tauri/           Tauri 2 셸
```

## 프리뷰에서 눌러볼 것

- `/projects/p-hanbit-ims/context/ctx-req-spec` → AI 패널 "SAP 동기화 주기 충돌 반영해서 v4 만들어줘" → **v4 로 적용**
- `/projects/p-hanbit-ims/tasks/t-move-approval` → AgentRun #2 **결과 승인**
- `/projects/p-hanbit-ims/risks` → 미응답 리스크의 리마인드 초안
- 상단 "역할로 보기" 를 관리자로 바꾸면 패턴 원본 추적이 노출된다
# CTAS_Paul_June
