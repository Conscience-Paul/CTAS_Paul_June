"use client";

/**
 * 프로젝트 설정 — 멤버·역할, 소스 바인딩, 적용된 컴플라이언스 프로필.
 */

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { Avatar, Badge, Button, Chip, EmptyState, Icon, Select, Switch, useToast } from "@/components/ctas/ctds";
import { Grid, KV, Page, PageHeader, Panel, Row, Section, Stack, Strong, Subtle, TextLink } from "@/components/ctas/ui";
import { LABEL, byProject, fmtDateTime, getCompliance, getMember, getProject, projectCustomer, type Role } from "@/lib/mock";

export default function ProjectSettingsPage() {
  const { id } = useParams<{ id: string }>();
  const project = getProject(id);
  const { toast } = useToast();
  const [roles, setRoles] = useState<Record<string, Role>>({});
  const [requireApproval, setRequireApproval] = useState<boolean | null>(null);

  if (!project) {
    return (
      <Page>
        <EmptyState icon="empty" title="프로젝트를 찾을 수 없습니다" actions={<Button asChild><Link href="/projects">목록으로</Link></Button>} />
      </Page>
    );
  }

  const customer = projectCustomer(project.id);
  const cp = customer && getCompliance(customer.complianceProfileId);
  const srcs = byProject.sources(project.id);
  const approvalOn = requireApproval ?? cp?.requireApprovalForCustomerSend ?? true;

  return (
    <Page wide>
      <PageHeader eyebrow={<>{project.name}</>} title="프로젝트 설정" lead="멤버십과 소스 바인딩은 프로젝트 단위, 보안 정책은 고객사 프로필을 상속합니다." />

      <Grid cols={2}>
        <Section title="멤버·역할" icon="user" hint={`${project.memberIds.length}명`} actions={<Button size="xs" variant="outline" leftIcon={<Icon name="plus" />} onClick={() => toast({ title: "멤버 추가 (프리뷰)" })}>추가</Button>}>
          <Panel>
            <Stack>
              {project.memberIds.map((mid) => {
                const m = getMember(mid)!;
                const r = roles[mid] ?? m.role;
                return (
                  <Row key={mid} style={{ justifyContent: "space-between" }}>
                    <Row tight>
                      <Avatar size="sm" name={m.name} />
                      <Stack tight>
                        <Strong>{m.name}{mid === project.pmId && <Subtle> · PM</Subtle>}</Strong>
                        <Subtle>{m.title}</Subtle>
                      </Stack>
                    </Row>
                    <Select size="sm" variant="line" width={120} value={r} onValueChange={(v) => setRoles({ ...roles, [mid]: v as Role })}>
                      <Select.Trigger aria-label={`${m.name} 역할`} />
                      <Select.Content>
                        <Select.Item value="admin">{LABEL.role.admin}</Select.Item>
                        <Select.Item value="pm">{LABEL.role.pm}</Select.Item>
                        <Select.Item value="engineer">{LABEL.role.engineer}</Select.Item>
                        <Select.Item value="viewer">{LABEL.role.viewer}</Select.Item>
                      </Select.Content>
                    </Select>
                  </Row>
                );
              })}
            </Stack>
          </Panel>
        </Section>

        <Section title="컴플라이언스" icon="seal-check" hint={`고객사 프로필 상속 · ${customer?.name}`}>
          <Panel>
            <KV
              items={[
                { k: "프로필", v: <TextLink href="/settings/compliance">{cp?.name}</TextLink> },
                { k: "외부 AI", v: cp?.allowExternalAI ? <Badge size="sm" variant="soft" status="success">허용</Badge> : <Badge size="sm" variant="soft" status="destructive">불가</Badge> },
                { k: "데이터 리전", v: cp?.dataRegion === "kr" ? "국내" : "글로벌" },
                { k: "Nora 워크스페이스", v: <span style={{ fontFamily: "var(--font-mono)" }}>{customer?.noraWorkspace}</span> },
                {
                  k: "고객 발송 승인 필요",
                  v: (
                    <Row tight>
                      <Switch size="sm" checked={approvalOn} onCheckedChange={setRequireApproval} disabled={cp?.requireApprovalForCustomerSend} aria-label="고객 발송 승인 필요" />
                      {cp?.requireApprovalForCustomerSend && <Subtle>프로필이 강제 — 해제 불가</Subtle>}
                    </Row>
                  ),
                },
              ]}
            />
          </Panel>
        </Section>
      </Grid>

      <Section title="소스 바인딩" icon="broadcast" hint={`${srcs.length}개 · 수집 완료 상태(프리뷰)`} actions={<Button size="xs" variant="outline" leftIcon={<Icon name="plus" />} onClick={() => toast({ title: "소스 연결 (프리뷰)", description: "Nora 커넥터 설정에서 채널·폴더를 고릅니다." })}>소스 연결</Button>}>
        <Grid cols={3}>
          {srcs.map((s) => (
            <Panel key={s.id}>
              <Row style={{ justifyContent: "space-between" }}>
                <Row tight>
                  <Badge size="sm" variant="soft">{LABEL.source[s.kind]}</Badge>
                  <Strong>{s.label}</Strong>
                </Row>
                <Chip size="sm" variant="outline">{s.itemCount}</Chip>
              </Row>
              <Subtle style={{ fontFamily: "var(--font-mono)" }}>{s.target}</Subtle>
              <Subtle>마지막 동기화 {fmtDateTime(s.lastSyncedAt)}</Subtle>
            </Panel>
          ))}
        </Grid>
      </Section>
    </Page>
  );
}
