"use client";

/**
 * 프로젝트 컨텍스트 — 항목 / 소스 / 인박스.
 * 수집은 이미 끝난 상태로 가정: 소스는 "연결됨"만 보여주고 연동 UI는 없다.
 */

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import {
  Badge,
  Button,
  Chip,
  EmptyState,
  FilterButton,
  Icon,
  Input,
  ListItem,
  Tabs,
  useToast,
  type IconName,
} from "@/components/ctas/ctds";
import { Grid, KV, Muted, Page, PageHeader, Panel, Row, Section, Stack, Strong, Subtle, List } from "@/components/ctas/ui";
import {
  LABEL,
  TONE,
  byProject,
  fmtDate,
  fmtDateTime,
  getProject,
  type ContextItem,
  type ContextKind,
  type ContextState,
  type SourceKind,
} from "@/lib/mock";
import styles from "./context.module.css";

const KIND_ORDER: ContextKind[] = ["requirement", "decision", "meeting_note", "customer_doc", "our_doc", "conversation", "change"];
const KIND_ICON: Record<ContextKind, IconName> = {
  requirement: "list-bullets",
  decision: "seal-check",
  meeting_note: "chat-text",
  customer_doc: "article",
  our_doc: "textbox",
  conversation: "chat-circle",
  change: "path",
};
const SOURCE_ICON: Record<SourceKind, IconName> = {
  slack: "chat-circle",
  discord: "chat-text",
  kakao: "chat-circle",
  email: "envelope",
  gdrive: "stack",
  git: "brackets-square",
  meeting: "broadcast",
  manual: "pencil-simple",
};
const STATES: ContextState[] = ["raw", "processed", "curated"];

export default function ContextPage() {
  const { id } = useParams<{ id: string }>();
  const project = getProject(id);
  const { toast } = useToast();
  const [kinds, setKinds] = useState<ContextKind[]>([]);
  const [state, setState] = useState<ContextState | null>(null);
  const [curatedIds, setCuratedIds] = useState<string[]>([]);

  if (!project) {
    return (
      <Page>
        <EmptyState icon="empty" title="프로젝트를 찾을 수 없습니다" />
      </Page>
    );
  }

  const items = byProject.context(id);
  const sources = byProject.sources(id);
  const sourceOf = (item: ContextItem) => sources.find((s) => s.id === item.sourceId);
  const stateOf = (item: ContextItem): ContextState => (curatedIds.includes(item.id) ? "curated" : item.state);

  const filtered = items.filter((it) => (kinds.length === 0 || kinds.includes(it.kind)) && (state === null || stateOf(it) === state));
  const inbox = items.filter((it) => stateOf(it) !== "curated");

  const toggleKind = (k: ContextKind) => setKinds((ks) => (ks.includes(k) ? ks.filter((x) => x !== k) : [...ks, k]));

  return (
    <Page wide>
      <PageHeader
        eyebrow={<>{project.name}</>}
        title="컨텍스트"
        lead="이 프로젝트에 대해 아는 모든 것. 원본·전처리·검색은 Nora, 버전과 추적 링크는 CTAS가 가집니다."
        actions={
          <Button size="sm" variant="outline" leftIcon={<Icon name="line-segments" />} asChild>
            <Link href="/ops/milestones">추적 타임라인</Link>
          </Button>
        }
      />

      <Tabs defaultValue="items" variant="underline" size="md">
        <Tabs.List aria-label="컨텍스트 보기">
          <Tabs.Trigger value="items">항목</Tabs.Trigger>
          <Tabs.Trigger value="sources">소스</Tabs.Trigger>
          <Tabs.Trigger value="inbox">인박스</Tabs.Trigger>
        </Tabs.List>

        {/* ── 항목 ── */}
        <Tabs.Panel value="items">
          <Stack style={{ gap: "var(--space-4)", paddingTop: "var(--space-4)" }}>
            <div className={styles.filters}>
              {KIND_ORDER.map((k) => (
                <FilterButton key={k} size="sm" selected={kinds.includes(k)} onToggle={() => toggleKind(k)} leftIcon={<Icon name={KIND_ICON[k]} />} count={items.filter((i) => i.kind === k).length}>
                  {LABEL.contextKind[k]}
                </FilterButton>
              ))}
              <span className={styles.filtersSpacer} />
              <Row tight>
                {STATES.map((s) => (
                  <Chip key={s} size="sm" variant={state === s ? "soft" : "outline"} onRemove={state === s ? () => setState(null) : undefined} removeLabel="필터 해제">
                    <button type="button" onClick={() => setState(state === s ? null : s)} style={{ all: "unset", cursor: "pointer" }}>
                      {LABEL.contextState[s]}
                    </button>
                  </Chip>
                ))}
              </Row>
              <Input size="sm" className={styles.search} leftIcon={<Icon name="search" />} placeholder="항목 검색 (현재 프로젝트)" aria-label="항목 검색" />
            </div>

            <List>
              {filtered.length === 0 && <EmptyState size="sm" icon="empty" title="조건에 맞는 항목이 없습니다" />}
              {filtered.map((it) => {
                const latest = it.versions[it.versions.length - 1];
                const st = stateOf(it);
                return (
                  <ListItem
                    key={it.id}
                    href={`/projects/${id}/context/${it.id}`}
                    variant="activity"
                    layout="stacked"
                    leading={<Icon name={KIND_ICON[it.kind]} size={16} />}
                    from={
                      <Row tight>
                        <Badge size="sm" variant="soft">{LABEL.contextKind[it.kind]}</Badge>
                        <Strong>{it.title}</Strong>
                        <Badge size="sm" variant="soft" status={TONE.contextState[st]}>{LABEL.contextState[st]}</Badge>
                      </Row>
                    }
                    body={
                      <Row tight>
                        <Subtle>{sourceOf(it)?.label ?? LABEL.source[sourceOf(it)?.kind ?? "manual"]}</Subtle>
                        <Subtle>·</Subtle>
                        <Subtle>{it.origin.by}</Subtle>
                        <Subtle>·</Subtle>
                        <Subtle>v{latest.v} — {latest.summary}</Subtle>
                      </Row>
                    }
                    meta={fmtDate(it.origin.at)}
                  />
                );
              })}
            </List>
          </Stack>
        </Tabs.Panel>

        {/* ── 소스 ── */}
        <Tabs.Panel value="sources">
          <Stack style={{ gap: "var(--space-4)", paddingTop: "var(--space-4)" }}>
            <Muted>연결된 채널. 수집·전처리·임베딩은 Nora 워크스페이스에서 돌고, CTAS는 결과를 참조합니다.</Muted>
            <Grid cols={3}>
              {sources.map((s) => (
                <Panel key={s.id}>
                  <Row style={{ justifyContent: "space-between" }}>
                    <Row tight>
                      <Icon name={SOURCE_ICON[s.kind]} size={16} />
                      <Strong>{s.label}</Strong>
                    </Row>
                    <Badge size="sm" variant="soft" status="success">Nora 커넥터 · 연결됨</Badge>
                  </Row>
                  <KV
                    items={[
                      { k: "대상", v: <span style={{ wordBreak: "break-all" }}>{s.target}</span> },
                      { k: "항목", v: `${s.itemCount}건` },
                      { k: "마지막 동기화", v: fmtDateTime(s.lastSyncedAt) },
                    ]}
                  />
                  <Row>
                    <Button size="xs" variant="outline" leftIcon={<Icon name="arrows-down-up" />} onClick={() => toast({ title: "동기화 요청됨", description: "프리뷰 — 실제 호출 없음", tone: "neutral" })}>
                      동기화
                    </Button>
                  </Row>
                </Panel>
              ))}
            </Grid>
          </Stack>
        </Tabs.Panel>

        {/* ── 인박스 ── */}
        <Tabs.Panel value="inbox">
          <Stack style={{ gap: "var(--space-4)", paddingTop: "var(--space-4)" }}>
            <Section title="정리 대기" icon="list-dashes" hint={`${inbox.length}건`}>
              <List>
                {inbox.length === 0 && <EmptyState size="sm" icon="check-circle" title="인박스가 비었습니다" />}
                {inbox.map((it) => {
                  const st = stateOf(it);
                  return (
                    <ListItem
                      key={it.id}
                      variant="notification"
                      layout="stacked"
                      unread={st === "raw"}
                      leading={<Icon name={SOURCE_ICON[sourceOf(it)?.kind ?? "manual"]} size={16} />}
                      from={
                        <Row tight>
                          <Badge size="sm" variant="soft" status={TONE.contextState[st]}>{LABEL.contextState[st]}</Badge>
                          <Link href={`/projects/${id}/context/${it.id}`} style={{ color: "inherit", textDecoration: "none" }}>
                            <Strong>{it.title}</Strong>
                          </Link>
                        </Row>
                      }
                      body={<Subtle>{it.versions[it.versions.length - 1].summary}</Subtle>}
                      meta={fmtDate(it.origin.at)}
                      trailing={
                        <Button
                          size="xs"
                          variant="outline"
                          onClick={() => {
                            setCuratedIds((c) => [...c, it.id]);
                            toast({ title: "정리됨으로 표시", description: it.title, tone: "success" });
                          }}
                        >
                          정리됨으로 표시
                        </Button>
                      }
                    />
                  );
                })}
              </List>
            </Section>
          </Stack>
        </Tabs.Panel>
      </Tabs>
    </Page>
  );
}
