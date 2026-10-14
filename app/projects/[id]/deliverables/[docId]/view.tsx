"use client";

/**
 * 산출물 상세 — 컨텍스트 항목과 같은 3열(버전 레일 / 본문 / 근거·템플릿·발송).
 */

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { Badge, Button, Chip, EmptyState, Icon, useToast } from "@/components/ctas/ctds";
import { VersionRail, authorLabel, useVersions } from "@/components/ctas/VersionRail";
import { KV, Page, PageHeader, Panel, Prose, Row, Section, Stack, Subtle, TextLink } from "@/components/ctas/ui";
import { LABEL, fmtDateTime, getCompliance, getContext, getDeliverable, getProject, getTemplate, hrefFor, projectCustomer } from "@/lib/mock";
import { usePreview } from "@/lib/preview-state";
import styles from "../deliverables.module.css";

export default function DeliverableDetail() {
  const { id, docId } = useParams<{ id: string; docId: string }>();
  const project = getProject(id);
  const doc = getDeliverable(docId);
  const { toast } = useToast();
  const { askAi } = usePreview();

  // hooks 는 조건부 return 앞에
  const versions = useVersions(docId, doc?.versions ?? []);
  const [selected, setSelected] = useState<number | null>(null);

  if (!project || !doc) {
    return (
      <Page>
        <EmptyState icon="empty" title="산출물을 찾을 수 없습니다" actions={<Button asChild><Link href={`/projects/${id}/deliverables`}>목록으로</Link></Button>} />
      </Page>
    );
  }

  const latest = versions[versions.length - 1];
  const current = versions.find((v) => v.v === (selected ?? latest.v)) ?? latest;
  const template = doc.templateId ? getTemplate(doc.templateId) : undefined;
  const customer = projectCustomer(project.id);
  const compliance = customer && getCompliance(customer.complianceProfileId);

  return (
    <Page wide>
      <PageHeader
        eyebrow={
          <>
            <Badge size="sm" variant="soft">{LABEL.deliverableKind[doc.kind]}</Badge>
            {project.name}
          </>
        }
        title={doc.title}
        lead={`v${current.v} · ${authorLabel(current.author)} · ${fmtDateTime(current.at)}${current.v !== latest.v ? " (이전 버전 보는 중)" : ""}`}
        actions={
          <>
            <Button size="sm" variant="outline" leftIcon={<Icon name="chat-circle" />} onClick={() => askAi(`${doc.title} 다음 버전 초안 만들어줘`)}>
              AI 로 수정
            </Button>
            <Button size="sm" variant="outline" leftIcon={<Icon name="download-simple" />} onClick={() => toast({ title: "내보내기 (프리뷰)", description: "docx / pdf 내보내기는 개발 단계에서 연결됩니다." })}>
              내보내기
            </Button>
          </>
        }
      />

      <div className={styles.detail}>
        <Section title="버전" icon="stack" hint={`${versions.length}개`}>
          <Panel>
            <VersionRail versions={versions} selected={current.v} onSelect={setSelected} />
          </Panel>
        </Section>

        <Section title="본문" icon="article">
          <Panel className={styles.body}>
            <Prose text={current.body} />
          </Panel>
        </Section>

        <Stack style={{ gap: "var(--space-6)" }}>
          <Section title="근거" icon="path" hint="generatedFrom">
            <Panel>
              <Stack tight>
                {doc.generatedFrom.map((gid) => {
                  const label = getContext(gid)?.title ?? getDeliverable(gid)?.title ?? gid;
                  const href = hrefFor(gid, project.id);
                  return href ? (
                    <TextLink key={gid} href={href}>
                      <Chip size="sm" variant="outline" leftIcon={<Icon name="arrow-square-out" size={10} />}>
                        {label}
                      </Chip>
                    </TextLink>
                  ) : (
                    <Chip key={gid} size="sm" variant="outline">{label}</Chip>
                  );
                })}
                {current.basedOn.length > 0 && (
                  <>
                    <Subtle>이 버전의 근거</Subtle>
                    {current.basedOn.map((bid) => (
                      <Chip key={bid} size="sm" variant="soft">
                        {getContext(bid)?.title ?? getDeliverable(bid)?.title ?? bid}
                      </Chip>
                    ))}
                  </>
                )}
              </Stack>
            </Panel>
          </Section>

          <Section title="템플릿" icon="layout">
            <Panel>
              {template ? (
                <KV
                  items={[
                    { k: "이름", v: <TextLink href="/knowledge/templates">{template.name}</TextLink> },
                    { k: "섹션", v: template.sections.join(" · ") },
                    { k: "사용", v: `${template.usedCount}회` },
                  ]}
                />
              ) : (
                <Subtle>템플릿 없이 작성됨</Subtle>
              )}
            </Panel>
          </Section>

          <Section title="발송" icon="envelope">
            <Panel>
              <Stack>
                <Row tight>
                  <Subtle>고객사 {customer?.name}</Subtle>
                  {compliance?.requireApprovalForCustomerSend && <Badge size="sm" variant="soft" status="warning">승인 필요</Badge>}
                </Row>
                <Button
                  size="sm"
                  variant="primary"
                  leftIcon={<Icon name="envelope" />}
                  onClick={() =>
                    toast({
                      title: "승인 요청 생성 (프리뷰)",
                      description: `customer_send · ${doc.title} v${current.v} — 승인 큐에서 PM 승인 후 발송됩니다.`,
                      tone: "neutral",
                    })
                  }
                >
                  고객 발송 (승인 필요)
                </Button>
                <Subtle>발송은 Approval(customer_send) 를 거칩니다. 외부 AI 사용 여부·채널 제한은 컴플라이언스 프로필을 따릅니다.</Subtle>
              </Stack>
            </Panel>
          </Section>
        </Stack>
      </div>
    </Page>
  );
}
