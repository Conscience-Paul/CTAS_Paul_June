"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Badge, Button, Chip, Disclosure, EmptyState, Icon, Stepper } from "@/components/ctas/ctds";
import { KV, Page, PageHeader, Panel, Prose, Row, Section, Split, Stack, Subtle } from "@/components/ctas/ui";
import { LABEL, getPattern, getProject, type PatternState } from "@/lib/mock";
import { usePreview } from "@/lib/preview-state";
import styles from "../../knowledge.module.css";

const STATE_ORDER: PatternState[] = ["draft", "anonymized", "reviewed", "published"];
const STATE_TONE: Record<PatternState, "success" | "warning" | "info" | undefined> = {
  published: "success",
  reviewed: "info",
  anonymized: "warning",
  draft: undefined,
};

export default function PatternDetail() {
  const { id } = useParams<{ id: string }>();
  const p = getPattern(id);
  const { role, askAi } = usePreview();

  if (!p) {
    return (
      <Page>
        <EmptyState icon="empty" title="패턴을 찾을 수 없습니다" actions={<Button asChild><Link href="/knowledge/patterns">목록으로</Link></Button>} />
      </Page>
    );
  }

  const stepIndex = STATE_ORDER.indexOf(p.state);

  return (
    <Page>
      <PageHeader
        eyebrow={
          <>
            <Badge size="sm" variant="soft">{LABEL.patternKind[p.kind]}</Badge>
            <Badge size="sm" variant="soft" status={STATE_TONE[p.state]}>{LABEL.patternState[p.state]}</Badge>
          </>
        }
        title={p.title}
        lead={p.summary}
        actions={
          <Button size="sm" variant="outline" leftIcon={<Icon name="chat-circle" />} onClick={() => askAi(`이 패턴이 적용될 현재 프로젝트 찾아줘: ${p.title}`)}>
            현재 프로젝트에 적용할 곳
          </Button>
        }
      />

      <Split>
        <Stack style={{ gap: "var(--space-6)" }}>
          <Section title="언제" icon="clock">
            <Panel>
              <Prose text={p.when} />
            </Panel>
          </Section>
          <Section title="어떻게" icon="steps">
            <Panel>
              <Prose text={p.how} />
            </Panel>
          </Section>
          <Section title="승격 상태" icon="seal-check" hint="Secure Abstraction">
            <Panel>
              <Stepper activeIndex={stepIndex} orientation="horizontal" marker="dot">
                <Stepper.Item title="초안" hint="프로젝트에서 추출" />
                <Stepper.Item title="익명화" hint="식별자 치환" />
                <Stepper.Item title="검토" hint="리뷰어 확인" />
                <Stepper.Item title="게시" hint="교차 프로젝트 공개" />
              </Stepper>
            </Panel>
          </Section>
        </Stack>

        <Stack style={{ gap: "var(--space-6)" }}>
          <Section title="속성" icon="info">
            <Panel>
              <KV
                items={[
                  { k: "종류", v: LABEL.patternKind[p.kind] },
                  { k: "상태", v: LABEL.patternState[p.state] },
                  { k: "사용 횟수", v: `${p.usedCount}회` },
                  {
                    k: "태그",
                    v: (
                      <Row tight>
                        {p.tags.map((t) => (
                          <Chip key={t} size="sm" variant="outline">{t}</Chip>
                        ))}
                      </Row>
                    ),
                  },
                ]}
              />
            </Panel>
          </Section>

          {role === "admin" && (
            <Panel subtle>
              <Disclosure>
                <Disclosure.Trigger>원본 추적 (감사용)</Disclosure.Trigger>
                <Disclosure.Body>
                  <Stack tight className={styles.audit}>
                    <Subtle>관리자 전용. 감사 로그에만 기록됩니다.</Subtle>
                    {p.originProjectIds.map((pid) => (
                      <Link key={pid} href={`/projects/${pid}`}>
                        <Chip size="sm" variant="soft" leftIcon={<Icon name="arrow-square-out" size={10} />}>
                          {getProject(pid)?.name ?? pid}
                        </Chip>
                      </Link>
                    ))}
                  </Stack>
                </Disclosure.Body>
              </Disclosure>
            </Panel>
          )}
        </Stack>
      </Split>
    </Page>
  );
}
