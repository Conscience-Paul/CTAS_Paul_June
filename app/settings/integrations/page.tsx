"use client";

/**
 * 연동 — Nora 연결, Foundry 전처리, 소스 커넥터. 프리뷰: 수집 완료 상태로 가정.
 */

import { Badge, Callout, Icon, Switch, type IconName } from "@/components/ctas/ctds";
import { Grid, KV, Page, PageHeader, Panel, Row, Section, Stack, Strong, Subtle } from "@/components/ctas/ui";
import { LABEL, customers, sources, type SourceKind } from "@/lib/mock";
import styles from "../settings.module.css";

const KIND_ICON: Record<SourceKind, IconName> = {
  slack: "chat-circle",
  discord: "chat-text",
  kakao: "chat-circle",
  email: "envelope",
  gdrive: "stack",
  git: "brackets-square",
  meeting: "waveform",
  manual: "upload-simple",
};

const KIND_NOTE: Partial<Record<SourceKind, string>> = {
  kakao: "공식 API 없음 — 내보내기 파일 업로드로 수집",
  discord: "커넥터 준비됨 · 연결된 프로젝트 없음",
  manual: "직접 업로드",
};

const ALL_KINDS: SourceKind[] = ["slack", "discord", "kakao", "email", "gdrive", "git", "meeting", "manual"];

export default function IntegrationsPage() {
  return (
    <Page wide>
      <PageHeader title="연동" lead="수집·전처리·검색은 Nora 가 담당하고, CTAS 는 버전·추적·프로젝트 의미 구조를 가집니다." />

      <Callout tone="neutral" variant="outline" icon="info" title="프리뷰 — 수집 완료 상태로 가정">
        커넥터 연결·동기화는 실제 개발 단계에서 붙입니다. 아래는 연결된 모습의 목입니다.
      </Callout>

      <Grid cols={2}>
        <Section title="Nora" icon="waveform">
          <Panel>
            <Row style={{ justifyContent: "space-between" }}>
              <Strong>Nora 연결</Strong>
              <Badge size="sm" variant="soft" status="success">연결됨</Badge>
            </Row>
            <KV
              items={[
                { k: "엔드포인트", v: <span style={{ fontFamily: "var(--font-mono)" }}>nora.internal.conscience.technology</span> },
                {
                  k: "워크스페이스 매핑",
                  v: (
                    <Stack tight>
                      {customers.map((c) => (
                        <Row key={c.id} tight>
                          <span>{c.name}</span>
                          <Subtle>→</Subtle>
                          <span style={{ fontFamily: "var(--font-mono)" }}>{c.noraWorkspace}</span>
                        </Row>
                      ))}
                    </Stack>
                  ),
                },
                { k: "승인 게이트", v: "Nora 플로우 approval → CTAS 승인 큐 webhook" },
              ]}
            />
          </Panel>
        </Section>

        <Section title="Foundry 전처리 파이프라인" icon="path">
          <Panel>
            <Row style={{ justifyContent: "space-between" }}>
              <Strong>문서 → AI 친화 형태</Strong>
              <Badge size="sm" variant="soft" status="success">연결됨</Badge>
            </Row>
            <KV
              items={[
                { k: "단계", v: "수집 → 파싱 → 요약·엔티티 → 청크·임베딩 → 라이브러리" },
                { k: "트리거", v: "폴더 Watch (delta) · 수동 일괄 ingest" },
                { k: "마지막 실행", v: "10/13 09:45 · 문서 4건 · 0 오류" },
                { k: "CTAS 캐시", v: <Subtle>요약·분류 라벨만 (열린 결정 §7)</Subtle> },
              ]}
            />
          </Panel>
        </Section>
      </Grid>

      <Section title="소스 커넥터" icon="broadcast" hint="종류별 · 바인딩된 프로젝트 수">
        <Panel>
          {ALL_KINDS.map((k) => {
            const bound = sources.filter((s) => s.kind === k);
            return (
              <div key={k} className={styles.connectorRow}>
                <Row>
                  <Icon name={KIND_ICON[k]} size={16} />
                  <Stack tight>
                    <Strong>{LABEL.source[k]}</Strong>
                    <Subtle>{KIND_NOTE[k] ?? `${bound.length}개 프로젝트 바인딩 · 항목 ${bound.reduce((a, s) => a + s.itemCount, 0)}`}</Subtle>
                  </Stack>
                </Row>
                <Row tight>
                  {bound.length > 0 && <Badge size="sm" variant="soft" status="success">동기화 중</Badge>}
                  <Switch size="sm" defaultChecked={bound.length > 0} aria-label={`${LABEL.source[k]} 사용`} />
                </Row>
              </div>
            );
          })}
        </Panel>
      </Section>
    </Page>
  );
}
