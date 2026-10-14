"use client";

/**
 * 패턴 라이브러리 — 교차 프로젝트로 추상화된 업무 패턴.
 * 원본 프로젝트는 UI 에 노출하지 않는다. admin 만 감사용 Disclosure 로 확인.
 */

import Link from "next/link";
import { useState } from "react";
import { Badge, Button, Chip, Disclosure, FilterButton, Icon } from "@/components/ctas/ctds";
import { Grid, Muted, Page, PageHeader, Panel, Row, Stack, Subtle } from "@/components/ctas/ui";
import { LABEL, getProject, patterns, type PatternKind, type PatternState } from "@/lib/mock";
import { usePreview } from "@/lib/preview-state";
import styles from "../knowledge.module.css";

const PATTERN_STATE_TONE: Record<PatternState, "success" | "warning" | "info" | undefined> = {
  published: "success",
  reviewed: "info",
  anonymized: "warning",
  draft: undefined,
};

const KINDS: PatternKind[] = ["requirement", "risk", "problem", "solution"];
const STATES: PatternState[] = ["published", "reviewed", "anonymized", "draft"];

export default function PatternsPage() {
  const { role } = usePreview();
  const [kinds, setKinds] = useState<Record<string, boolean>>({});
  const [states, setStates] = useState<Record<string, boolean>>({});

  const anyKind = Object.values(kinds).some(Boolean);
  const anyState = Object.values(states).some(Boolean);
  const list = patterns.filter((p) => (!anyKind || kinds[p.kind]) && (!anyState || states[p.state]));

  return (
    <Page wide>
      <PageHeader
        title="패턴 라이브러리"
        lead="반복되는 요구사항·리스크·문제·해결을 일반화한 자산입니다. 프로젝트 컨텍스트에서 익명화·리뷰를 거쳐 승격된 것만 여기 올라옵니다."
        actions={
          <Button size="sm" variant="primary" leftIcon={<Icon name="arrow-right" />} asChild>
            <Link href="/knowledge/patterns/promote">패턴 승격</Link>
          </Button>
        }
      />

      <div className={styles.filters}>
        {KINDS.map((k) => (
          <FilterButton key={k} size="sm" selected={!!kinds[k]} onClick={() => setKinds({ ...kinds, [k]: !kinds[k] })} count={patterns.filter((p) => p.kind === k).length}>
            {LABEL.patternKind[k]}
          </FilterButton>
        ))}
        <span className={styles.filterSep} />
        {STATES.map((s) => (
          <FilterButton key={s} size="sm" selected={!!states[s]} onClick={() => setStates({ ...states, [s]: !states[s] })} count={patterns.filter((p) => p.state === s).length}>
            {LABEL.patternState[s]}
          </FilterButton>
        ))}
        <Subtle style={{ marginLeft: "auto" }}>{list.length}개</Subtle>
      </div>

      <Grid cols={3}>
        {list.map((p) => (
          <Panel key={p.id} href={`/knowledge/patterns/${p.id}`}>
            <Row tight>
              <Badge size="sm" variant="soft">{LABEL.patternKind[p.kind]}</Badge>
              <Badge size="sm" variant="soft" status={PATTERN_STATE_TONE[p.state]}>{LABEL.patternState[p.state]}</Badge>
            </Row>
            <div className={styles.cardTitle}>{p.title}</div>
            <Muted>{p.summary}</Muted>
            <Row tight>
              {p.tags.map((t) => (
                <Chip key={t} size="sm" variant="outline">{t}</Chip>
              ))}
            </Row>
            <div className={styles.cardFoot}>
              <Subtle>사용 {p.usedCount}회</Subtle>
              <Subtle>언제: {p.when}</Subtle>
            </div>
          </Panel>
        ))}
      </Grid>

      {role === "admin" && (
        <Panel subtle>
          <Disclosure>
            <Disclosure.Trigger>원본 추적 (감사용)</Disclosure.Trigger>
            <Disclosure.Body>
              <Stack tight>
                <Subtle>관리자만 볼 수 있습니다. 패턴 ↔ 원본 프로젝트 매핑은 감사 로그에만 남고 일반 화면에는 노출되지 않습니다.</Subtle>
                {list.map((p) => (
                  <Row key={p.id} tight>
                    <Subtle>{p.title}</Subtle>
                    <Subtle>←</Subtle>
                    {p.originProjectIds.map((pid) => (
                      <Chip key={pid} size="sm" variant="soft">{getProject(pid)?.name ?? pid}</Chip>
                    ))}
                  </Row>
                ))}
              </Stack>
            </Disclosure.Body>
          </Disclosure>
        </Panel>
      )}
    </Page>
  );
}
