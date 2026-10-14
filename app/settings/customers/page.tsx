"use client";

/**
 * 고객사·격리 — Data Isolation. Customer ↔ Nora 워크스페이스 1:1.
 * 검색·AI 범위는 항상 현재 프로젝트. 교차는 Knowledge 층(추상화된 것)으로만.
 */

import Link from "next/link";
import { Badge, Callout, Icon } from "@/components/ctas/ctds";
import { Grid, KV, Page, PageHeader, Panel, Row, Section, Stack, Strong, Subtle, TextLink } from "@/components/ctas/ui";
import { LABEL, customers, getCompliance, projects } from "@/lib/mock";
import styles from "../settings.module.css";

function Tenant({ customerId }: { customerId: string }) {
  const c = customers.find((x) => x.id === customerId)!;
  const list = projects.filter((p) => p.customerId === c.id);
  return (
    <div className={styles.tenant}>
      <div className={styles.node}>
        <Icon name="identification-card" size={14} />
        <Strong>{c.name}</Strong>
        <Subtle>Customer</Subtle>
      </div>
      <div className={styles.edge} aria-hidden>↓</div>
      <div className={`${styles.node} ${styles.nodeNora}`}>
        <Icon name="waveform" size={14} />
        <span>Nora {c.noraWorkspace}</span>
        <Subtle>원본 · 전처리 · 벡터</Subtle>
      </div>
      <div className={styles.edge} aria-hidden>↓</div>
      <div className={styles.children}>
        {list.map((p) => (
          <div key={p.id} className={styles.node}>
            <Badge size="sm" variant="soft">{p.kind}</Badge>
            <span>{p.name}</span>
            <Subtle>버전 · 링크 · 업무 (CTAS)</Subtle>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function CustomersPage() {
  return (
    <Page wide>
      <PageHeader
        title="고객사·격리"
        lead="고객사가 데이터 격리의 최상위 단위입니다. Nora 워크스페이스와 1:1로 매핑되고, 프로젝트 간 교차 조회는 불가합니다."
      />

      <Section title="격리 구조" icon="split-horizontal">
        <Panel>
          <div className={styles.isolation}>
            <Tenant customerId={customers[0].id} />
            <div className={styles.wall}>
              <span className={styles.wallLabel}>교차 조회 불가</span>
            </div>
            <Tenant customerId={customers[1].id} />
          </div>
        </Panel>
        <Callout tone="brand" variant="outline" icon="path" title="교차 프로젝트로 나가는 유일한 길 = 지식 층">
          원본은 워크스페이스 안에 머물고, <TextLink href="/knowledge/patterns/promote">익명화·리뷰를 거친 패턴</TextLink>만 교차 프로젝트로 공개됩니다. 검색과 AI 패널의 범위는 항상 현재 프로젝트로 잠깁니다.
        </Callout>
      </Section>

      <Grid cols={2}>
        {customers.map((c) => {
          const cp = getCompliance(c.complianceProfileId);
          const list = projects.filter((p) => p.customerId === c.id);
          return (
            <Panel key={c.id}>
              <Row style={{ justifyContent: "space-between" }}>
                <Strong>{c.name}</Strong>
                <Subtle>{c.industry}</Subtle>
              </Row>
              <KV
                items={[
                  { k: "Nora 워크스페이스", v: <span style={{ fontFamily: "var(--font-mono)" }}>{c.noraWorkspace}</span> },
                  {
                    k: "컴플라이언스",
                    v: (
                      <Row tight>
                        <TextLink href="/settings/compliance">{cp?.name}</TextLink>
                        {cp && !cp.allowExternalAI && <Badge size="sm" variant="soft" status="warning">외부 AI 불가</Badge>}
                      </Row>
                    ),
                  },
                  {
                    k: "프로젝트",
                    v: (
                      <Stack tight>
                        {list.map((p) => (
                          <Link key={p.id} href={`/projects/${p.id}`}>
                            <Row tight>
                              <Badge size="sm" variant="soft">{p.kind}</Badge>
                              <span>{p.name}</span>
                              <Subtle>· {LABEL.stage[p.stage]}</Subtle>
                            </Row>
                          </Link>
                        ))}
                      </Stack>
                    ),
                  },
                ]}
              />
            </Panel>
          );
        })}
      </Grid>
    </Page>
  );
}
