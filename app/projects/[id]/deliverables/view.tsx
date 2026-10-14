"use client";

/**
 * 산출물 — Auto Deliverables. 프로젝트 안에서 생성되는 문서들(컨텍스트의 연장).
 * 「산출물 생성」 3단계 위저드는 로컬 상태만 바꾼다 (프리뷰).
 */

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import {
  Badge,
  Button,
  Checkbox,
  Chip,
  EmptyState,
  Icon,
  Modal,
  SelectableCard,
  Stepper,
  useToast,
} from "@/components/ctas/ctds";
import { authorLabel } from "@/components/ctas/VersionRail";
import {
  Grid,
  Muted,
  Page,
  PageHeader,
  Panel,
  Prose,
  Row,
  Section,
  Stack,
  Strong,
  Subtle,
} from "@/components/ctas/ui";
import {
  LABEL,
  byProject,
  fmtDateTime,
  getContext,
  getProject,
  getTemplate,
  templates,
} from "@/lib/mock";
import { usePreview } from "@/lib/preview-state";
import styles from "./deliverables.module.css";

const DRAFT_PREVIEW = `## 요약
전체 진행률 71%. 재고 이동 승인 API 결과 승인 대기, 화면 개발 진행 중.

## 이슈·리스크
- 결제·정산 질문 4건 **7일 미응답** — 10/24 착수 일정 조율 필요
- 1차 검수(10/17) 기준서 미수령 — 10/21 조정안 제시

## 다음 주 계획
- 재고 이동 화면 완료 · 승인 API 머지
- 결제·정산 요구사항 워크숍(10/14)

## 결정 요청
- 검수일 10/17 유지 vs 10/21 조정`;

export default function DeliverablesPage() {
  const { id } = useParams<{ id: string }>();
  const project = getProject(id);
  const { askAi } = usePreview();
  const { toast } = useToast();

  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [tpl, setTpl] = useState<string>("tpl-weekly");
  const [picked, setPicked] = useState<Record<string, boolean>>({ "ctx-meet-1009": true, "ctx-req-spec": true });

  if (!project) {
    return (
      <Page>
        <EmptyState icon="empty" title="프로젝트를 찾을 수 없습니다" />
      </Page>
    );
  }

  const list = byProject.deliverables(project.id);
  const ctx = byProject.context(project.id);
  const pickedCount = Object.values(picked).filter(Boolean).length;

  const reset = () => {
    setOpen(false);
    setStep(0);
  };

  const finish = () => {
    toast({ title: "초안 v1 생성 (프리뷰)", description: `${getTemplate(tpl)?.name} · 근거 ${pickedCount}건`, tone: "success" });
    reset();
  };

  return (
    <Page wide>
      <PageHeader
        eyebrow={<>{project.name}</>}
        title="산출물"
        lead="축적된 컨텍스트에서 WBS·보고서·회의록·고객 문서를 생성합니다. 모든 산출물은 컨텍스트와 같은 방식으로 버전이 쌓입니다."
        actions={
          <>
            <Button size="sm" variant="outline" leftIcon={<Icon name="chat-circle" />} onClick={() => askAi("검수 기준서 초안을 우리가 먼저 써줘")}>
              검수 기준서 초안 써줘
            </Button>
            <Button size="sm" variant="primary" leftIcon={<Icon name="plus" />} onClick={() => setOpen(true)}>
              산출물 생성
            </Button>
          </>
        }
      />

      <Grid cols={2}>
        {list.map((d) => {
          const latest = d.versions[d.versions.length - 1];
          const t = d.templateId ? getTemplate(d.templateId) : undefined;
          return (
            <Panel key={d.id} href={`/projects/${project.id}/deliverables/${d.id}`}>
              <Row style={{ justifyContent: "space-between" }}>
                <Row tight>
                  <Badge size="sm" variant="soft">{LABEL.deliverableKind[d.kind]}</Badge>
                  <Strong>{d.title}</Strong>
                </Row>
                <Badge size="sm" variant="soft" status="info">v{latest.v}</Badge>
              </Row>
              <Muted>{latest.summary}</Muted>
              <Row tight>
                <Subtle>
                  {authorLabel(latest.author)} · {fmtDateTime(latest.at)}
                </Subtle>
                {t && <Subtle>· 템플릿 {t.name}</Subtle>}
              </Row>
              <Row tight>
                <Subtle>근거</Subtle>
                {d.generatedFrom.map((gid) => (
                  <Chip key={gid} size="sm" variant="outline" leftIcon={<Icon name="arrow-square-out" size={10} />}>
                    {getContext(gid)?.title ?? gid}
                  </Chip>
                ))}
              </Row>
            </Panel>
          );
        })}
      </Grid>

      <Section title="생성 가능한 템플릿" icon="layout" hint="교차 프로젝트 자산">
        <Row>
          {templates.map((t) => (
            <Chip key={t.id} size="md" variant="soft">
              {t.name}
            </Chip>
          ))}
          <Button size="xs" variant="ghost" asChild>
            <Link href="/knowledge/templates">템플릿 관리 →</Link>
          </Button>
        </Row>
      </Section>

      <Modal
        open={open}
        onOpenChange={(o) => (o ? setOpen(true) : reset())}
        title="산출물 생성"
        description="종류·템플릿 → 근거 컨텍스트 → 미리보기. 생성된 초안은 v1 이 되고, AI 패널에서 수정할 때마다 버전이 올라갑니다."
        footer={
          <>
            <Button size="sm" variant="ghost" onClick={() => (step === 0 ? reset() : setStep(step - 1))}>
              {step === 0 ? "취소" : "이전"}
            </Button>
            {step < 2 ? (
              <Button size="sm" variant="primary" onClick={() => setStep(step + 1)} disabled={step === 1 && pickedCount === 0}>
                다음
              </Button>
            ) : (
              <Button size="sm" variant="primary" leftIcon={<Icon name="check" />} onClick={finish}>
                초안 생성
              </Button>
            )}
          </>
        }
      >
        <Stack className={styles.wizard}>
          <Stepper activeIndex={step} orientation="horizontal" marker="number">
            <Stepper.Item title="종류·템플릿" />
            <Stepper.Item title="근거 컨텍스트" />
            <Stepper.Item title="미리보기" />
          </Stepper>

          {step === 0 && (
            <Grid cols={2}>
              {templates.map((t) => (
                <SelectableCard
                  key={t.id}
                  mode="radio"
                  name="tpl"
                  value={t.id}
                  checked={tpl === t.id}
                  onChange={() => setTpl(t.id)}
                  title={
                    <Row tight>
                      <Badge size="sm" variant="soft">{LABEL.deliverableKind[t.kind]}</Badge>
                      {t.name}
                    </Row>
                  }
                  description={t.description}
                />
              ))}
            </Grid>
          )}

          {step === 1 && (
            <Stack>
              <Subtle>선택한 항목이 생성 근거(generatedFrom)로 기록되고, 추적 그래프에 derived_from 링크가 생깁니다.</Subtle>
              <Panel flush>
                <div className={styles.checkList}>
                  {ctx.map((c) => (
                    <Checkbox key={c.id} checked={!!picked[c.id]} onChange={(e) => setPicked({ ...picked, [c.id]: e.target.checked })}>
                      <Row tight>
                        <Badge size="sm" variant="soft">{LABEL.contextKind[c.kind]}</Badge>
                        {c.title}
                        <Subtle>v{c.versions.length}</Subtle>
                      </Row>
                    </Checkbox>
                  ))}
                </div>
              </Panel>
            </Stack>
          )}

          {step === 2 && (
            <Stack>
              <Row tight>
                <Badge size="sm" variant="soft">{getTemplate(tpl)?.name}</Badge>
                <Subtle>근거 {pickedCount}건</Subtle>
                <Badge size="sm" variant="soft" status="info">v1 초안</Badge>
              </Row>
              <Panel subtle>
                <Prose text={DRAFT_PREVIEW} />
              </Panel>
              <Subtle>프리뷰 — 실제로는 Nora 가 선택한 근거를 읽고 템플릿 섹션별로 초안을 작성합니다.</Subtle>
            </Stack>
          )}
        </Stack>
      </Modal>
    </Page>
  );
}
