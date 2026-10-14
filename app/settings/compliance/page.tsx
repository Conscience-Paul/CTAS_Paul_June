"use client";

/**
 * 컴플라이언스 프로필 — 고객사별 보안 정책. 위반 동작은 UI 에서 차단하고 사유를 Callout 으로.
 */

import { Badge, Callout, Chip, Icon } from "@/components/ctas/ctds";
import { Grid, KV, Page, PageHeader, Panel, Row, Section, Strong, Subtle } from "@/components/ctas/ui";
import { LABEL, complianceProfiles, customers } from "@/lib/mock";

export default function CompliancePage() {
  return (
    <Page wide>
      <PageHeader
        title="컴플라이언스"
        lead="고객사의 보안 정책과 데이터 처리 규정을 프로필로 관리합니다. 저장·처리·공유 방식이 프로필을 따릅니다."
      />

      <Grid cols={2}>
        {complianceProfiles.map((cp) => {
          const used = customers.filter((c) => c.complianceProfileId === cp.id);
          return (
            <Panel key={cp.id}>
              <Row style={{ justifyContent: "space-between" }}>
                <Row tight>
                  <Icon name="seal-check" size={16} />
                  <Strong>{cp.name}</Strong>
                </Row>
                <Subtle>적용 {used.map((c) => c.name).join(", ") || "—"}</Subtle>
              </Row>
              <KV
                items={[
                  {
                    k: "외부 AI 사용",
                    v: cp.allowExternalAI ? <Badge size="sm" variant="soft" status="success">허용</Badge> : <Badge size="sm" variant="soft" status="destructive">불가 — 온프렘 러너만</Badge>,
                  },
                  { k: "보존 기간", v: `${cp.retentionDays}일` },
                  { k: "데이터 리전", v: cp.dataRegion === "kr" ? "국내 (KR)" : "글로벌" },
                  {
                    k: "허용 채널",
                    v: (
                      <Row tight>
                        {cp.allowedChannels.map((ch) => (
                          <Chip key={ch} size="sm" variant="outline">{LABEL.source[ch]}</Chip>
                        ))}
                      </Row>
                    ),
                  },
                  { k: "고객 발송", v: cp.requireApprovalForCustomerSend ? "승인 필요 (customer_send)" : "자유" },
                ]}
              />
            </Panel>
          );
        })}
      </Grid>

      <Section title="위반 시 동작 예시" icon="warning-circle">
        <Callout tone="destructive" variant="outline" icon="warning" title="세종캐피탈: 외부 AI 호출 차단">
          프로필 「금융·보안 강화」는 allowExternalAI = false. 세종캐피탈 고객 포털 업무(t-sejong-login)의 AgentRun 은 외부 모델 대신 사내 Nora 온프렘 러너로만 실행되며, AI 패널에서 외부 모델 선택은 비활성화됩니다.
        </Callout>
        <Callout tone="warning" variant="outline" icon="warning-circle" title="한빛유통: Slack 알림에 재고 수량·금액 포함 불가 (§5.1)">
          고객 보안 정책 문서에서 추출된 조항이 Pre-flight 항목으로 들어갑니다. 알림 설계는 「건수 + 링크」 패턴으로 자동 제안됩니다.
        </Callout>
      </Section>
    </Page>
  );
}
