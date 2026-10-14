"use client";

/**
 * 컨텍스트 항목 상세 — 좌: 버전 레일 / 중: 본문 / 우: 추적 링크.
 */

import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { useState } from "react";
import { Badge, Button, Chip, EmptyState, Icon, useToast } from "@/components/ctas/ctds";
import { KV, Page, PageHeader, Panel, Prose, Row, Section, Stack, Strong, Subtle, TaskStateBadge } from "@/components/ctas/ui";
import { VersionRail, authorLabel, useVersions } from "@/components/ctas/VersionRail";
import {
  LABEL,
  TONE,
  byProject,
  fmtDateTime,
  getContext,
  getDeliverable,
  getTask,
  hrefFor,
  linksFor,
  scenarioFor,
  type LinkRel,
} from "@/lib/mock";
import { usePreview } from "@/lib/preview-state";
import styles from "../context.module.css";

const REL_LABEL: Record<LinkRel, string> = {
  derived_from: "근거",
  decided_by: "결정",
  implements: "구현",
  changed_by: "변경",
  evidences: "증거",
  conflicts_with: "충돌",
};
const REL_ORDER: LinkRel[] = ["derived_from", "decided_by", "evidences", "implements", "changed_by", "conflicts_with"];

function titleOf(id: string) {
  return getContext(id)?.title ?? getTask(id)?.title ?? getDeliverable(id)?.title ?? id;
}

export default function ContextItemPage() {
  const { id, itemId } = useParams<{ id: string; itemId: string }>();
  const pathname = usePathname() ?? "";
  const item = getContext(itemId);
  const { toast } = useToast();
  const { askAi } = usePreview();

  const versions = useVersions(itemId, item?.versions ?? []);
  const [selected, setSelected] = useState(versions.length);

  // 새 버전이 생기면 최신으로 점프 — 렌더 중 상태 조정 패턴 (effect 불필요)
  const [seenCount, setSeenCount] = useState(versions.length);
  if (versions.length !== seenCount) {
    setSeenCount(versions.length);
    setSelected(versions.length);
  }

  if (!item || item.projectId !== id) {
    return (
      <Page>
        <EmptyState icon="empty" title="항목을 찾을 수 없습니다" actions={<Button asChild><Link href={`/projects/${id}/context`}>컨텍스트로</Link></Button>} />
      </Page>
    );
  }

  const ver = versions.find((v) => v.v === selected) ?? versions[versions.length - 1];
  const source = byProject.sources(id).find((s) => s.id === item.sourceId);
  const links = linksFor(item.id);
  const linkedTasks = byProject.tasks(id).filter((t) => t.contextIds.includes(item.id));
  const scenario = scenarioFor(pathname);
  const prompt = scenario?.suggestions[0] ?? `"${item.title}" 을 최신 컨텍스트 기준으로 정리해줘`;

  return (
    <Page wide>
      <PageHeader
        eyebrow={
          <>
            <Badge size="sm" variant="soft">{LABEL.contextKind[item.kind]}</Badge>
            <Badge size="sm" variant="soft" status={TONE.contextState[item.state]}>{LABEL.contextState[item.state]}</Badge>
            <span>v{versions.length} · {versions.length}개 버전</span>
          </>
        }
        title={item.title}
        lead={`${source?.label ?? LABEL.source[source?.kind ?? "manual"]} · ${item.origin.by} · ${fmtDateTime(item.origin.at)}`}
        actions={
          <>
            <Button size="sm" variant="outline" leftIcon={<Icon name="pencil-simple" />} onClick={() => toast({ title: "수동 편집", description: "프리뷰 — 편집기는 개발 단계에서 추가됩니다.", tone: "neutral" })}>
              v+1 수동 생성
            </Button>
            <Button size="sm" variant="primary" leftIcon={<Icon name="chat-circle" />} onClick={() => askAi(prompt)}>
              AI로 수정
            </Button>
          </>
        }
      />

      <div className={styles.detail}>
        {/* 버전 레일 */}
        <div className={`${styles.col} ${styles.sticky}`}>
          <Section title="버전" icon="clock" hint="최신이 위">
            <Panel>
              <VersionRail versions={versions} selected={ver.v} onSelect={setSelected} />
            </Panel>
          </Section>
        </div>

        {/* 본문 */}
        <div className={styles.col}>
          <Panel>
            <div className={styles.bodyHead}>
              <Row tight>
                <Strong>v{ver.v}</Strong>
                <Subtle>{ver.summary}</Subtle>
              </Row>
              <Row tight>
                {ver.author.kind === "ai" ? <Icon name="waveform" size={14} /> : <Icon name="user" size={14} />}
                <Subtle>{authorLabel(ver.author)} · {fmtDateTime(ver.at)}</Subtle>
              </Row>
            </div>
            <Prose text={ver.body} />
          </Panel>

          <Panel subtle>
            <KV
              items={[
                { k: "출처 채널", v: item.origin.channel },
                { k: "수집 시각", v: fmtDateTime(item.origin.at) },
                { k: "작성자", v: item.origin.by },
                { k: "상태", v: <Badge size="sm" variant="soft" status={TONE.contextState[item.state]}>{LABEL.contextState[item.state]}</Badge> },
                {
                  k: "태그",
                  v: (
                    <div className={styles.tags}>
                      {item.tags.map((t) => (
                        <Chip key={t} size="sm" variant="outline" leftIcon={<Icon name="tag" size={10} />}>{t}</Chip>
                      ))}
                    </div>
                  ),
                },
                { k: "Nora 문서", v: <Subtle>{item.id} (워크스페이스 참조)</Subtle> },
              ]}
            />
          </Panel>
        </div>

        {/* 연결 */}
        <div className={`${styles.col} ${styles.sticky}`}>
          <Section title="연결" icon="line-segments" hint={`${links.length}`}>
            <Panel>
              {links.length === 0 && <Subtle>연결된 항목이 없습니다.</Subtle>}
              <Stack>
                {REL_ORDER.map((rel) => {
                  const group = links.filter((l) => l.rel === rel);
                  if (group.length === 0) return null;
                  return (
                    <div key={rel} className={styles.linkGroup}>
                      <div className={styles.linkGroupTitle}>
                        {rel === "conflicts_with" ? <Badge size="sm" variant="soft" status="destructive">{REL_LABEL[rel]}</Badge> : <span>{REL_LABEL[rel]}</span>}
                      </div>
                      {group.map((l, i) => {
                        const outgoing = l.from === item.id;
                        const other = outgoing ? l.to : l.from;
                        const href = hrefFor(other, id);
                        const row = (
                          <>
                            <Icon name={outgoing ? "arrow-right" : "caret-left"} size={12} />
                            <span className={styles.linkRowLabel}>{titleOf(other)}</span>
                          </>
                        );
                        return href ? (
                          <Link key={i} href={href} className={styles.linkRow}>{row}</Link>
                        ) : (
                          <div key={i} className={styles.linkRow}>{row}</div>
                        );
                      })}
                    </div>
                  );
                })}
              </Stack>
            </Panel>
          </Section>

          <Section title="연결된 업무" icon="list" hint={`${linkedTasks.length}`}>
            <Panel>
              {linkedTasks.length === 0 && <Subtle>이 항목을 근거로 하는 업무가 없습니다.</Subtle>}
              <Stack tight>
                {linkedTasks.map((t) => (
                  <Link key={t.id} href={`/projects/${id}/tasks/${t.id}`} className={styles.linkRow}>
                    <TaskStateBadge state={t.state} />
                    <span className={styles.linkRowLabel}>{t.title}</span>
                  </Link>
                ))}
              </Stack>
            </Panel>
          </Section>
        </div>
      </div>
    </Page>
  );
}
