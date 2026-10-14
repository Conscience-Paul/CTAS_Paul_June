# 디자인 결정

> 생성일: 2026-10-12 · 온보딩 적용 결과
> 머신 리더블 소스는 [ctds.config.json](ctds.config.json)에.

**spare** 테마 기반. 자세한 원칙·Do/Don't는 [prompts/themes/spare.md](prompts/themes/spare.md) 참조.

## 축 값

| Axis | Value | 설명 |
|---|---|---|
| Mode | `light` | 밝은 배경 |
| Palette | `standard` | 원본 hue · 중간 채도 (기본) |
| Hue | `274°`  | 브랜드 색상 축 |
| Shape | `crisp` | 딱딱, 전문 |
| Density | `default` | 표준 (100%) |
| Motion | `calm` | 차분 |
| Icon Family | `phosphor` | 아이콘 세트 |
| Voice | `neutral` | 표준 존대 |
| Lang | `ko` | UI 언어 |
| Focus Ring | `off` | 포커스 링 숨김 |

## AI 에이전트에게

이 프로젝트는 위 축 값으로 고정됐습니다. 컴포넌트·페이지를 생성할 때:

- **하드코딩 금지** — 색/간격/radius/shadow/motion은 전부 CTDS 토큰 경유.
- 축 값은 [ctds.config.json](ctds.config.json)이 소스 오브 트루스.
  런타임엔 `ThemeController`가 관리하며, 사용자가 축을 바꿀 때마다 `<html data-*>` 속성이 갱신됩니다.
- 토큰·축의 상세 규칙은 [prompts/](prompts/) 하위 문서들을 참조하세요.
- 이 프로젝트의 "성격"은 [prompts/themes/spare.md](prompts/themes/spare.md)의 Do/Don't·Signature·Negative에 정의돼 있습니다.

## 변경 이력

- 2026-10-12: 온보딩 적용
