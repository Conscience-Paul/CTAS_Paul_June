"use client";

import { Icon, type IconName } from "@/components/ctas/ctds";
import { Grid, Muted, Page, PageHeader, Panel, Row, Strong } from "@/components/ctas/ui";
import { complianceProfiles, customers, members } from "@/lib/mock";

const CARDS: { href: string; icon: IconName; title: string; desc: string }[] = [
  { href: "/settings/org", icon: "user-circle", title: "조직", desc: `멤버 ${members.length}명 · 역할 부여` },
  { href: "/settings/roles", icon: "identification-card", title: "역할·권한", desc: "역할 × 리소스 × 액션 매트릭스 (Access Control)" },
  { href: "/settings/customers", icon: "squares-four", title: "고객사·격리", desc: `고객사 ${customers.length} · Nora 워크스페이스 1:1 (Data Isolation)` },
  { href: "/settings/compliance", icon: "seal-check", title: "컴플라이언스", desc: `프로필 ${complianceProfiles.length} · 외부 AI · 보존 · 리전 · 채널 (Compliance)` },
  { href: "/settings/integrations", icon: "broadcast", title: "연동", desc: "Nora 커넥터 · Foundry 전처리 · 소스 채널" },
];

export default function SettingsPage() {
  return (
    <Page>
      <PageHeader title="설정" lead="조직·권한·격리·컴플라이언스·연동. 보안은 가로지르는 층이라 모든 화면의 가드가 여기 정의를 따릅니다." />
      <Grid cols={2}>
        {CARDS.map((c) => (
          <Panel key={c.href} href={c.href}>
            <Row>
              <Icon name={c.icon} size={18} />
              <Strong>{c.title}</Strong>
            </Row>
            <Muted>{c.desc}</Muted>
          </Panel>
        ))}
      </Grid>
    </Page>
  );
}
