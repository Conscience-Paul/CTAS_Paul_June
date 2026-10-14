"use client";

/**
 * 패턴 승격 — Secure Abstraction 파이프라인.
 * 후보 선택 → 자동 익명화(before/after) → 리뷰 → 게시. 원본 참조는 admin 감사 로그에만.
 */

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { Badge, Button, Callout, Checkbox, Icon, SelectableCard, Stepper, useToast } from "@/components/ctas/ctds";
import { Page, PageHeader, Panel, Row, Section, Split, Stack, Strong, Subtle } from "@/components/ctas/ui";
import { LABEL, byProject, getProject } from "@/lib/mock";
import styles from "../../knowledge.module.css";

/* 익명화 규칙 — 프리뷰용 고정 사전. 실제로는 Nora 가 NER 로 식별자를 뽑는다. */
const RULES: { re: RegExp; to: string }[] = [
  { re: /한빛유통|한빛/g, to: "[고객사]" },
  { re: /세종캐피탈|세종/g, to: "[고객사]" },
  { re: /박정우|김하늘|이준호|박민지|김서연/g, to: "[담당자]" },
  { re: /SAP(?: FI| BASIS)?/g, to: "[시스템]" },
  { re: /\d[\d,]*만원/g, to: "[금액]" },
  { re: /\d{1,2}\/\d{1,2}/g, to: "[날짜]" },
];

function anonymize(text: string) {
  return RULES.reduce((t, r) => t.replace(r.re, r.to), text);
}

/** 치환된 자리에 하이라이트 — before 는 원문 강조, after 는 치환 토큰 강조 */
function highlight(text: string, mode: "before" | "after"): ReactNode[] {
  if (mode === "after") {
    return text.split(/(\[[^\]]+\])/g).map((part, i) =>
      /^\[[^\]]+\]$/.test(part) ? <mark key={i} className={styles.diffMark}>{part}</mark> : part,
    );
  }
  const combined = new RegExp(`(${RULES.map((r) => r.re.source).join("|")})`, "g");
  return text.split(combined).map((part, i) =>
    part && RULES.some((r) => new RegExp(`^(?:${r.re.source})$`).test(part)) ? <mark key={i} className={styles.diffOrig}>{part}</mark> : part,
  );
}

const PID = "p-hanbit-ims";

export default function PromotePage() {
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [candidate, setCandidate] = useState<string>("risk-noresp");
  const [review, setReview] = useState<Record<string, boolean>>({});

  const risks = byProject.risks(PID);
  const conflicts = byProject.conflicts(PID);
  const ctx = byProject.context(PID).filter((c) => c.kind === "decision" || c.kind === "requirement");

  const candidates: { id: string; group: string; title: string; text: string }[] = [
    ...risks.map((r) => ({ id: r.id, group: `리스크 · ${LABEL.riskKind[r.kind]}`, title: r.title, text: `${r.detail}\n\n제안: ${r.suggestion.body}` })),
    ...conflicts.map((c) => ({ id: c.id, group: `충돌 · ${LABEL.conflictKind[c.kind]}`, title: c.title, text: `${c.detail}\n\n제안: ${c.suggestion}` })),
    ...ctx.map((c) => ({ id: c.id, group: `컨텍스트 · ${LABEL.contextKind[c.kind]}`, title: c.title, text: c.versions[c.versions.length - 1].body })),
  ];
  const chosen = candidates.find((c) => c.id === candidate) ?? candidates[0];
  const before = `${chosen.title}\n\n${chosen.text}`;
  const after = anonymize(before);

  const REVIEW_ITEMS = [
    { id: "r1", label: "고객사·인명·시스템명 등 식별 정보 없음" },
    { id: "r2", label: "금액·일정 수치는 구간 또는 토큰으로 치환됨" },
    { id: "r3", label: "다른 프로젝트에서도 재사용 가능한 일반 서술" },
    { id: "r4", label: "고객 컴플라이언스 프로필 위반 없음 (외부 공유 허용 범위)" },
  ];
  const reviewed = REVIEW_ITEMS.every((r) => review[r.id]);

  const publish = () => {
    toast({ title: "패턴 게시 (프리뷰)", description: `${chosen.title.slice(0, 24)}… → 패턴 라이브러리. 원본 참조는 감사 로그에만 기록.`, tone: "success" });
    setStep(0);
    setReview({});
  };

  return (
    <Page wide>
      <PageHeader
        eyebrow={<Link href="/knowledge/patterns">← 패턴 라이브러리</Link>}
        title="패턴 승격"
        lead="고객의 민감한 원본은 보호하면서, 재사용 가능한 경험·패턴으로 추상화합니다. 식별자를 지우고, 사람이 확인한 뒤에만 교차 프로젝트로 나갑니다."
      />

      <div className={styles.promote}>
        <Panel>
          <Stepper activeIndex={step} orientation="vertical" marker="number" onStepClick={(i) => i < step && setStep(i)}>
            <Stepper.Item title="후보 선택" hint={`프로젝트: ${getProject(PID)?.name}`} />
            <Stepper.Item title="자동 익명화" hint="식별자 치환" />
            <Stepper.Item title="리뷰" hint="before / after 확인" />
            <Stepper.Item title="게시" hint="패턴 라이브러리" />
          </Stepper>
        </Panel>

        <Stack style={{ gap: "var(--space-4)" }}>
          {step === 0 && (
            <Section title="후보 선택" icon="selection" hint="리스크·충돌·결정·요구사항 중 하나">
              <div className={styles.candidates}>
                {candidates.map((c) => (
                  <SelectableCard
                    key={c.id}
                    mode="radio"
                    name="candidate"
                    value={c.id}
                    checked={candidate === c.id}
                    onChange={() => setCandidate(c.id)}
                    title={c.title}
                    description={c.group}
                  />
                ))}
              </div>
            </Section>
          )}

          {step === 1 && (
            <Section title="자동 익명화" icon="eye-slash" hint="고객명 · 인명 · 시스템명 · 금액 · 날짜">
              <Split even>
                <Panel>
                  <Row tight>
                    <Badge size="sm" variant="soft" status="warning">before</Badge>
                    <Subtle>원본 — 프로젝트 안에서만 보임</Subtle>
                  </Row>
                  <div style={{ whiteSpace: "pre-wrap", fontSize: "var(--text-sm)", lineHeight: "var(--lh-base)" }}>{highlight(before, "before")}</div>
                </Panel>
                <Panel>
                  <Row tight>
                    <Badge size="sm" variant="soft" status="success">after</Badge>
                    <Subtle>추상화 — 교차 프로젝트로 나가는 것</Subtle>
                  </Row>
                  <div style={{ whiteSpace: "pre-wrap", fontSize: "var(--text-sm)", lineHeight: "var(--lh-base)" }}>{highlight(after, "after")}</div>
                </Panel>
              </Split>
              <Subtle>프리뷰 — 고정 사전으로 치환. 실제로는 Nora 가 식별자를 추출하고, 금액·일정은 구간화합니다.</Subtle>
            </Section>
          )}

          {step === 2 && (
            <Section title="리뷰" icon="check-square" hint="전부 확인해야 게시 가능">
              <Panel>
                <Stack>
                  {REVIEW_ITEMS.map((r) => (
                    <Checkbox key={r.id} checked={!!review[r.id]} onChange={(e) => setReview({ ...review, [r.id]: e.target.checked })}>
                      {r.label}
                    </Checkbox>
                  ))}
                </Stack>
              </Panel>
              <Callout tone="neutral" variant="outline" icon="info" title="원본 참조는 감사 로그에만 남습니다">
                게시된 패턴에서 원본 프로젝트로의 역추적은 관리자만 가능합니다. 일반 화면에는 매핑이 노출되지 않습니다.
              </Callout>
            </Section>
          )}

          {step === 3 && (
            <Section title="게시" icon="seal-check">
              <Panel>
                <Stack>
                  <Strong>{chosen.title}</Strong>
                  <Subtle>{chosen.group} → 패턴 라이브러리 (상태: 게시됨)</Subtle>
                  <Row tight>
                    <Badge size="sm" variant="soft" status="success">익명화 완료</Badge>
                    <Badge size="sm" variant="soft" status="success">리뷰 {REVIEW_ITEMS.length}/{REVIEW_ITEMS.length}</Badge>
                  </Row>
                </Stack>
              </Panel>
            </Section>
          )}

          <Row style={{ justifyContent: "flex-end" }}>
            {step > 0 && (
              <Button size="sm" variant="ghost" onClick={() => setStep(step - 1)}>
                이전
              </Button>
            )}
            {step < 3 ? (
              <Button size="sm" variant="primary" rightIcon={<Icon name="arrow-right" />} onClick={() => setStep(step + 1)} disabled={step === 2 && !reviewed}>
                다음
              </Button>
            ) : (
              <Button size="sm" variant="primary" leftIcon={<Icon name="check" />} onClick={publish}>
                게시
              </Button>
            )}
          </Row>
        </Stack>
      </div>
    </Page>
  );
}
