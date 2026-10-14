"use client";

/**
 * 지식 › 문서함 공용 — 문서 뷰어(본문 영역, 내용 보기/편집 → draft → 승인 시 v+1 + Drive 배포 · 버전 비교 · 연결).
 * 계약문서 뷰어와 같은 뼈대. 컨텍스트·산출물은 편집 가능, 패턴·템플릿은 읽기.
 */

import Link from "next/link";
import { useState } from "react";
import { Badge, Button, Chip, FileIcon, Icon, Input, Tabs, Textarea } from "@/components/ctas/ctds";
import { DocFrame } from "@/components/ctas/DocFrame";
import { DocWorkspace, DraftBanner, useDocVersions } from "@/components/ctas/DocVersions";
import { KV, Panel, Row, Section, Subtle } from "@/components/ctas/ui";
import {
  LABEL,
  TONE,
  deployTargetOf,
  fmtDateTime,
  getContext,
  getDeliverable,
  getProject,
  getTask,
  hrefFor,
  kExt,
  kOrigin,
  lineageOf,
  linksFor,
  tasks,
  type KEntry,
  type LinkRel,
} from "@/lib/mock";
import { findDocLike } from "@/lib/mock";
import styles from "./knowledge-fs.module.css";

const REL_LABEL: Record<LinkRel, string> = {
  derived_from: "근거",
  decided_by: "결정",
  implements: "구현",
  changed_by: "변경",
  evidences: "증거",
  conflicts_with: "충돌",
};

export function entryTitle(e: KEntry) {
  if (e.type === "template") return e.item.name;
  if (e.type === "run") return `${getTask(e.item.taskId)?.title ?? e.item.taskId} — 실행 결과`;
  return e.item.title;
}

export function KnowledgeDrawer({ entry, inline, onClose, onAskAi }: { entry: KEntry; inline?: boolean; onClose: () => void; onAskAi: () => void }) {
  const doc = findDocLike(entry.id)!;
  const editable = entry.type === "context" || entry.type === "deliverable";
  const runTask = entry.type === "run" ? getTask(entry.item.taskId) : undefined;
  const origin = kOrigin(entry);

  // 배포 위치 — 쓰기 가능한 원본이면 그 문서, 아니면 지식 폴더 구조 그대로 Google Docs
  const flow = useDocVersions(doc.id, doc.versions, deployTargetOf(entry), entry.type === "run" && entry.item.state === "submitted");
  const { versions, setSelected } = flow;
  const [tab, setTab] = useState("content");

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [summary, setSummary] = useState("");
  const save = () => {
    flow.save({ at: new Date().toISOString(), author: { kind: "human", memberId: "m-seoyeon" }, summary: summary.trim() || "수동 편집", basedOn: [], body: draft });
    setEditing(false);
  };

  const projectId = entry.type === "context" || entry.type === "deliverable" ? entry.item.projectId : runTask?.projectId;
  const project = projectId ? getProject(projectId) : undefined;
  const links = entry.type === "context" || entry.type === "deliverable" ? linksFor(entry.id) : [];
  const linkedTasks = entry.type === "context" ? tasks.filter((t) => t.contextIds.includes(entry.id)) : [];
  // 계보 — 근거로 쓴 문서 / 이 문서로 만든 문서 (운영 › 마일스톤의 추적 타임라인·AI 답변과 같은 lineageOf)
  const lineage = entry.type === "context" || entry.type === "deliverable" || entry.type === "run" ? lineageOf(entry.id) : { parents: [], children: [] };

  const subtitle =
    entry.type === "context" ? LABEL.contextKind[entry.item.kind]
    : entry.type === "deliverable" ? LABEL.deliverableKind[entry.item.kind]
    : entry.type === "run" ? `Nora · 시도 ${versions.length}회`
    : entry.type === "pattern" ? `${LABEL.patternKind[entry.item.kind]} 패턴`
    : "템플릿";

  return (
    <DocFrame
      inline={inline}
      onClose={onClose}
      title={<><FileIcon ext={kExt(entry)} size="sm" />{doc.title}</>}
      description={<Row tight><Badge size="sm" variant="soft">{doc.kindLabel}</Badge><Subtle>{subtitle}{project ? ` · ${project.name}` : ""}</Subtle></Row>}
      footer={
        editing ? (
          <>
            <Button variant="ghost" onClick={() => setEditing(false)}>취소</Button>
            <Button variant="primary" leftIcon={<Icon name="check" />} onClick={save} disabled={draft.trim() === flow.editBase.trim()}>v{flow.draftV} draft 로 저장</Button>
          </>
        ) : (
          <>
            {origin.url !== "#" && <Button variant="ghost" leftIcon={<Icon name="arrow-square-out" />} onClick={() => window.open(origin.url, "_blank", "noopener")}>{origin.label} 원본</Button>}
            <Button variant="outline" leftIcon={<Icon name="chat-circle" />} onClick={onAskAi}>AI 로 보완</Button>
            {editable && <Button variant="primary" leftIcon={<Icon name="pencil-simple" />} onClick={() => { setDraft(flow.editBase); setSummary(flow.draft?.summary ?? ""); setEditing(true); setTab("content"); }}>{flow.draft ? "draft 편집" : "편집"}</Button>}
          </>
        )
      }
    >
      {!editing && <DraftBanner flow={flow} onCompare={() => { setSelected(flow.draftV); flow.setMode("diff"); setTab("content"); }} />}
      <Tabs value={tab} onValueChange={setTab} variant="underline" size="sm">
        <Tabs.List aria-label="문서 보기">
          <Tabs.Trigger value="content">문서 · 버전 {versions.length}{flow.draft ? " + draft" : ""}</Tabs.Trigger>
          <Tabs.Trigger value="links">연결 {lineage.parents.length + lineage.children.length + linkedTasks.length}</Tabs.Trigger>
        </Tabs.List>

        <Tabs.Panel value="content">
          <DocWorkspace
            flow={flow}
            editor={editing ? (
              <>
                <Input size="sm" label="변경 요약" placeholder="예: R-03 동기화 주기 수정" value={summary} onChange={(e) => setSummary(e.target.value)} />
                <Textarea label="본문" value={draft} onChange={(e) => setDraft(e.target.value)} autoResize minRows={14} maxRows={30} />
              </>
            ) : undefined}
            meta={
              <>
                {entry.type === "context" && (
                  <KV items={[
                    // 출처 = 원본 — 이름을 누르면 원본이 새 탭으로
                    { k: "원본", v: origin.url !== "#"
                      ? <a href={origin.url} target="_blank" rel="noopener" className={styles.linkTitle}><Row tight><Icon name="arrow-square-out" size={12} />{entry.item.origin.channel} · {entry.item.origin.by}</Row></a>
                      : `${entry.item.origin.channel} · ${entry.item.origin.by}` },
                    { k: "수집", v: fmtDateTime(entry.item.origin.at) },
                    { k: "태그", v: <Row tight>{entry.item.tags.map((t) => <Chip key={t} size="sm" variant="outline">{t}</Chip>)}</Row> },
                  ]} />
                )}
                {entry.type === "deliverable" && (
                  <KV items={[
                    { k: "템플릿", v: entry.item.templateId ?? "—" },
                    { k: "근거", v: <Row tight>{entry.item.generatedFrom.map((id) => { const h = hrefFor(id); const t = getContext(id)?.title ?? getDeliverable(id)?.title ?? id; return h ? <Link key={id} href={h} style={{ textDecoration: "none" }}><Chip size="sm" variant="outline">{t}</Chip></Link> : <Chip key={id} size="sm" variant="outline">{t}</Chip>; })}</Row> },
                  ]} />
                )}
                {entry.type === "run" && runTask && (
                  <KV items={[
                    { k: "업무", v: <Link href={`/projects/${runTask.projectId}/tasks/${runTask.id}`} className={styles.linkTitle}>{runTask.title} ↗</Link> },
                    { k: "근거 컨텍스트", v: <Row tight>{runTask.contextIds.map((id) => { const h = hrefFor(id); const tt = getContext(id)?.title ?? id; return h ? <Link key={id} href={h} style={{ textDecoration: "none" }}><Chip size="sm" variant="outline">{tt}</Chip></Link> : <Chip key={id} size="sm" variant="outline">{tt}</Chip>; })}</Row> },
                  ]} />
                )}
                {entry.type === "pattern" && (
                  <KV items={[
                    { k: "언제", v: entry.item.when },
                    { k: "어떻게", v: entry.item.how },
                    { k: "사용", v: `${entry.item.usedCount}회` },
                    { k: "태그", v: <Row tight>{entry.item.tags.map((t) => <Chip key={t} size="sm" variant="outline">{t}</Chip>)}</Row> },
                  ]} />
                )}
                {entry.type === "template" && (
                  <KV items={[
                    { k: "섹션", v: entry.item.sections.join(" → ") },
                    { k: "사용", v: `${entry.item.usedCount}회` },
                  ]} />
                )}
              </>
            }
          />
        </Tabs.Panel>

        <Tabs.Panel value="links">
          <div className={styles.drawerBody}>
            {links.length === 0 && linkedTasks.length === 0 && lineage.parents.length === 0 && lineage.children.length === 0 && <Subtle>연결된 항목이 없습니다.</Subtle>}
            {(lineage.parents.length > 0 || lineage.children.length > 0) && (
              <Section title="계보" icon="path" hint="어느 버전이 무엇을 근거로 썼는지">
                <Panel>
                  <div className={styles.linkList}>
                    {lineage.parents.map((h) => {
                      const hr = hrefFor(h.id);
                      return (
                        <div key={"p" + h.id} className={styles.linkRow}>
                          <Badge size="sm" variant="soft">{h.via}</Badge>
                          <Icon name="caret-left" size={12} />
                          {hr ? <Link href={hr} className={styles.linkTitle} title={h.title}>{h.title}</Link> : <span className={styles.linkTitle} title={h.title}>{h.title}</span>}
                        </div>
                      );
                    })}
                    {lineage.children.map((h) => {
                      const hr = hrefFor(h.id);
                      return (
                        <div key={"c" + h.id} className={styles.linkRow}>
                          <Badge size="sm" variant="soft" status="info">{h.via}</Badge>
                          <Icon name="arrow-right" size={12} />
                          {hr ? <Link href={hr} className={styles.linkTitle} title={h.title}>{h.title}</Link> : <span className={styles.linkTitle} title={h.title}>{h.title}</span>}
                        </div>
                      );
                    })}
                  </div>
                </Panel>
              </Section>
            )}
            {links.length > 0 && (
              <Section title="추적 링크" icon="line-segments">
                <Panel>
                  <div className={styles.linkList}>
                    {links.map((l, i) => {
                      const other = l.from === entry.id ? l.to : l.from;
                      const title = getContext(other)?.title ?? getTask(other)?.title ?? getDeliverable(other)?.title ?? other;
                      const h = hrefFor(other);
                      return (
                        <div key={i} className={styles.linkRow}>
                          <Badge size="sm" variant="soft" status={l.rel === "conflicts_with" ? "destructive" : undefined}>{REL_LABEL[l.rel]}</Badge>
                          <Icon name={l.from === entry.id ? "arrow-right" : "caret-left"} size={12} />
                          {h ? <Link href={h} className={styles.linkTitle}>{title}</Link> : <span className={styles.linkTitle}>{title}</span>}
                        </div>
                      );
                    })}
                  </div>
                </Panel>
              </Section>
            )}
            {linkedTasks.length > 0 && (
              <Section title="연결된 업무" icon="list">
                <Panel>
                  <div className={styles.linkList}>
                    {linkedTasks.map((t) => (
                      <div key={t.id} className={styles.linkRow}>
                        <Badge size="sm" variant="soft" status={TONE.taskState[t.state]}>{LABEL.taskState[t.state]}</Badge>
                        <Link href={`/projects/${t.projectId}/tasks/${t.id}`} className={styles.linkTitle}>{t.title}</Link>
                      </div>
                    ))}
                  </div>
                </Panel>
              </Section>
            )}
          </div>
        </Tabs.Panel>
      </Tabs>
    </DocFrame>
  );
}
