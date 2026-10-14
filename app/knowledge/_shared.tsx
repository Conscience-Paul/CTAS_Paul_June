"use client";

/**
 * 지식 › 문서함 공용 — 항목 Drawer(내용 보기/편집 → v+1 · 버전 · 연결).
 * 계약·문서 Drawer 와 같은 뼈대. 컨텍스트·산출물은 편집 가능, 패턴·템플릿은 읽기.
 */

import Link from "next/link";
import { useState } from "react";
import { Badge, Button, Chip, Drawer, FileIcon, Icon, Input, Tabs, Textarea, useToast } from "@/components/ctas/ctds";
import { KV, Panel, Prose, Row, Section, Subtle } from "@/components/ctas/ui";
import { VersionRail, authorLabel, useVersions } from "@/components/ctas/VersionRail";
import {
  LABEL,
  TONE,
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
import { usePreview } from "@/lib/preview-state";
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

export function KnowledgeDrawer({ entry, onClose, onAskAi }: { entry: KEntry; onClose: () => void; onAskAi: () => void }) {
  const { toast } = useToast();
  const { addVersion } = usePreview();
  const doc = findDocLike(entry.id)!;
  const editable = entry.type === "context" || entry.type === "deliverable";
  const runTask = entry.type === "run" ? getTask(entry.item.taskId) : undefined;
  const versions = useVersions(doc.id, doc.versions);
  const [selected, setSelected] = useState(versions.length);
  const [seen, setSeen] = useState(versions.length);
  if (seen !== versions.length) { setSeen(versions.length); setSelected(versions.length); }
  const ver = versions.find((v) => v.v === selected) ?? versions[versions.length - 1];
  const isLatest = selected === versions.length;

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [summary, setSummary] = useState("");
  const save = () => {
    addVersion(doc.id, { at: new Date().toISOString(), author: { kind: "human", memberId: "m-seoyeon" }, summary: summary.trim() || "수동 편집", basedOn: [], body: draft });
    setEditing(false);
    toast({ title: `v${versions.length + 1} 저장됨`, description: "버전 히스토리에 기록됐습니다.", tone: "success" });
  };

  const origin = kOrigin(entry);
  const projectId = entry.type === "context" || entry.type === "deliverable" ? entry.item.projectId : runTask?.projectId;
  const project = projectId ? getProject(projectId) : undefined;
  const links = entry.type === "context" || entry.type === "deliverable" ? linksFor(entry.id) : [];
  const linkedTasks = entry.type === "context" ? tasks.filter((t) => t.contextIds.includes(entry.id)) : [];
  // 계보 — 근거로 쓴 문서 / 이 문서로 만든 문서 (추적 타임라인·AI 답변과 같은 lineageOf)
  const lineage = entry.type === "context" || entry.type === "deliverable" || entry.type === "run" ? lineageOf(entry.id) : { parents: [], children: [] };

  const subtitle =
    entry.type === "context" ? `${LABEL.contextKind[entry.item.kind]} · ${LABEL.contextState[entry.item.state]}`
    : entry.type === "deliverable" ? LABEL.deliverableKind[entry.item.kind]
    : entry.type === "run" ? `${entry.item.agent} · ${LABEL.runState[entry.item.state]} · 시도 ${versions.length}회`
    : entry.type === "pattern" ? `${LABEL.patternKind[entry.item.kind]} 패턴 · ${LABEL.patternState[entry.item.state]}`
    : "템플릿";

  return (
    <Drawer
      open
      onOpenChange={(o) => !o && onClose()}
      size="lg"
      title={<Row tight><FileIcon ext={kExt(entry)} size="sm" />{doc.title}</Row>}
      description={<Row tight><Badge size="sm" variant="soft">{doc.kindLabel}</Badge><Subtle>{subtitle}{project ? ` · ${project.name}` : ""}</Subtle></Row>}
      footer={
        editing ? (
          <>
            <Button variant="ghost" onClick={() => setEditing(false)}>취소</Button>
            <Button variant="primary" leftIcon={<Icon name="check" />} onClick={save} disabled={draft.trim() === ver.body.trim()}>v{versions.length + 1} 로 저장</Button>
          </>
        ) : (
          <>
            {origin.url !== "#" && <Button variant="ghost" leftIcon={<Icon name="arrow-square-out" />} onClick={() => window.open(origin.url, "_blank", "noopener")}>{origin.label} 원본</Button>}
            <Button variant="outline" leftIcon={<Icon name="chat-circle" />} onClick={onAskAi}>AI 로 보완</Button>
            {editable && <Button variant="primary" leftIcon={<Icon name="pencil-simple" />} onClick={() => { setDraft(ver.body); setSummary(""); setEditing(true); }} disabled={!isLatest}>편집</Button>}
          </>
        )
      }
    >
      <Tabs defaultValue="content" variant="underline" size="sm">
        <Tabs.List aria-label="문서 보기">
          <Tabs.Trigger value="content">내용 {!isLatest && <Badge size="sm" variant="soft" status="warning">v{selected} 보는 중</Badge>}</Tabs.Trigger>
          <Tabs.Trigger value="versions">버전 {versions.length}</Tabs.Trigger>
          <Tabs.Trigger value="links">연결 {lineage.parents.length + lineage.children.length + linkedTasks.length}</Tabs.Trigger>
        </Tabs.List>

        <Tabs.Panel value="content">
          <div className={styles.drawerBody}>
            {editing ? (
              <>
                <Input size="sm" label="변경 요약" placeholder="예: R-03 동기화 주기 수정" value={summary} onChange={(e) => setSummary(e.target.value)} />
                <Textarea label="본문" value={draft} onChange={(e) => setDraft(e.target.value)} autoResize minRows={14} maxRows={30} />
              </>
            ) : (
              <>
                <Row tight>
                  <Subtle>v{ver.v} · {authorLabel(ver.author)} · {fmtDateTime(ver.at)}</Subtle>
                  {!isLatest && <Button size="xs" variant="ghost" onClick={() => setSelected(versions.length)}>최신으로</Button>}
                </Row>
                <Panel subtle><Prose text={ver.body} /></Panel>
                {entry.type === "context" && (
                  <KV items={[
                    { k: "출처", v: `${entry.item.origin.channel} · ${entry.item.origin.by}` },
                    { k: "수집", v: fmtDateTime(entry.item.origin.at) },
                    { k: "상태", v: <Badge size="sm" variant="soft" status={TONE.contextState[entry.item.state]}>{LABEL.contextState[entry.item.state]}</Badge> },
                    { k: "태그", v: <Row tight>{entry.item.tags.map((t) => <Chip key={t} size="sm" variant="outline">{t}</Chip>)}</Row> },
                    { k: "원본", v: <Row tight><Icon name="arrow-square-out" size={12} />{origin.label}</Row> },
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
                    { k: "에이전트", v: entry.item.agent },
                    { k: "상태", v: <Badge size="sm" variant="soft" status={TONE.runState[entry.item.state]}>{LABEL.runState[entry.item.state]}</Badge> },
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
            )}
          </div>
        </Tabs.Panel>

        <Tabs.Panel value="versions">
          <div className={styles.drawerBody}>
            <Subtle>버전은 불변 — 수정은 항상 v+1 로 쌓입니다. 클릭하면 내용 탭이 그 버전을 보여줍니다.</Subtle>
            <VersionRail versions={versions} selected={selected} onSelect={setSelected} />
          </div>
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
    </Drawer>
  );
}
