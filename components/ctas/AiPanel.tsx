"use client";

/**
 * 우측 AI 패널 — Cursor 식 컨텍스트 챗. 프리뷰에서는 lib/mock/ai.ts 의 시나리오를
 * 재생한다. 현재 라우트를 보고 "지금 보고 있는 것"을 컨텍스트 범위로 표시.
 */

import { useRouter, usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  AIMessage,
  Button,
  Chip,
  ChatInput,
  Icon,
  IconButton,
  Spinner,
  UserMessage,
  useToast,
} from "@/components/ctas/ctds";
import {
  LABEL,
  contracts,
  findDocLike,
  lineageOf,
  getContext,
  getMember,
  type DocLike,
  getProject,
  getTask,
  hrefFor,
  scenarioFor,
  type AiTurn,
} from "@/lib/mock";
import { DOC_MIME, draggedDoc, endDocDrag } from "@/lib/drag";
import { usePreview } from "@/lib/preview-state";
import styles from "./AiPanel.module.css";

function scopeLabel(pathname: string) {
  const seg = pathname.split("/").filter(Boolean);
  if (seg[0] === "projects" && seg[1]) {
    const p = getProject(seg[1]);
    if (seg[2] === "context" && seg[3]) return getContext(seg[3])?.title ?? p?.name;
    if (seg[2] === "tasks" && seg[3]) return getTask(seg[3])?.title ?? p?.name;
    return p?.name ?? "프로젝트";
  }
  if (seg[0] === "knowledge") return "지식 문서함 (현재 프로젝트 + 교차 패턴)";
  if (seg[0] === "approvals") return "승인 대기 전체";
  return "전체 (내 프로젝트)";
}

function renderBody(text: string) {
  // **굵게** 와 > 인용만 처리 — 프리뷰용 최소 렌더
  return text.split("\n").map((line, i) => {
    const content = line.split(/(\*\*[^*]+\*\*)/g).map((part, j) =>
      part.startsWith("**") ? <strong key={j}>{part.slice(2, -2)}</strong> : part,
    );
    if (line.startsWith("> ")) {
      return <blockquote key={i}>{content.map((c) => (typeof c === "string" ? c.replace(/^> /, "") : c))}</blockquote>;
    }
    return (
      <span key={i}>
        {content}
        {"\n"}
      </span>
    );
  });
}

/* 멘션 문서 기반 목 답변 — 문서 종류별 보완 포인트 + "v+1 로 반영" 액션 */
const KIND_TIPS: Record<string, string[]> = {
  contract: ["§일정 — 순연 조건과 기준일을 명시", "§대금 — 중간금 청구 시점을 검수 완료와 연결", "§손해배상 — 상한을 계약금액 100% 로 (NDA 와 정합)"],
  amendment: ["§일정 — 요구사항 확정일 기준 주 단위 순연 조항", "§대금 — 확정 시 50% · 인수 시 50%", "본 계약 만료일(12/31) 연장 조항 추가"],
  quote: ["ERP 연동 공수는 과거 편차 1.35배 — 버퍼 반영 여부 확인", "조건부 항목(결제·정산)은 옵션 행으로 분리", "검수 2회 공수가 빠져 있지 않은지"],
  nda: ["유효기간 3년 — 유지보수 계약과 기간 정합", "손해배상 상한 조항 유무", "비밀정보 반환·파기 절차"],
  sla: ["갱신 협의 시점(만료 45일 전)과 통지 방법", "외부 AI 사용 불가 조항의 적용 범위(러너·로그)", "장애 등급별 대응 시간 분리"],
  template: ["변수 표기([N]) 를 모두 채웠는지", "최신 경험(손해배상 상한) 반영 여부", "섹션 순서가 고객 발송 문서 관행과 맞는지"],
  requirement: ["각 항목에 근거(회의록·결정) 링크가 있는지", "변경(PR)과 충돌하는 조항 — supersede 필요 여부", "검수 기준으로 바로 풀 수 있게 측정 가능한 문장인지"],
  meeting_note: ["결정 사항을 의사결정 항목으로 분리", "액션 아이템에 담당·기한이 있는지", "고객 발송용 회의록과 내부용 분리"],
  decision: ["결정의 근거와 결정자가 남아 있는지", "영향받는 요구사항 버전 갱신", "번복 시 추적 가능하도록 supersede 로 처리"],
  customer_doc: ["정책 조항이 설계·알림에 반영됐는지", "원본 변경 시 재전처리 필요 여부", "민감 수치가 외부 알림으로 나가지 않는지"],
  our_doc: ["근거 요구사항·결정 링크", "보안 정책 §5.1 준수(알림에 수량·금액 제외)", "고객 공유본과 내부본 구분"],
  conversation: ["질문에 답이 왔는지 — 미응답이면 리스크로 승격", "합의 사항을 결정 항목으로 추출", "기한 언급을 마일스톤에 반영"],
  change: ["요구사항과 충돌 여부(주기·범위)", "고객 측 확인이 필요한 변경인지", "관련 산출물(WBS·보고서) 갱신"],
  deliverable: ["근거 컨텍스트가 최신 버전인지", "고객 발송 전 승인(customer_send) 필요", "과거 유사 프로젝트 교훈 반영 여부"],
  pattern: ["식별 정보가 남아 있지 않은지(익명화)", "적용 조건(언제)이 충분히 일반적인지", "사용 횟수·효과 기록"],
  task: ["Pre-flight 실패·경고 항목의 해소 조건과 담당", "같은 요구사항을 구현하는 업무와의 중복·경계", "차단 해제 시점이 마일스톤에 미치는 영향"],
  generic: ["근거 링크 보강", "최신 버전 여부 확인", "고객 공유 전 승인 필요 여부"],
};

/** 계약 문서 + 지식(컨텍스트·산출물·패턴·템플릿)을 같은 모양으로 */
function resolveDoc(id: string): DocLike | undefined {
  const c = contracts.find((x) => x.id === id);
  if (c) return { id, title: c.title, kind: c.kind, kindLabel: "계약·문서", versions: c.versions };
  const t = getTask(id);
  if (t) {
    const body = `${t.description}\n\n상태: ${LABEL.taskState[t.state]} · 담당: ${getMember(t.ownerId)?.name ?? t.ownerId} · 심각도: ${LABEL.severity[t.severity]}${t.blockedReason ? `\n차단 사유: ${t.blockedReason}` : ""}\n\nPre-flight:\n${t.preflight.map((c) => `- [${c.status}] ${c.label} — ${c.detail}`).join("\n")}\n\n타임라인:\n${t.timeline.map((x) => `- ${x.at} ${x.who}: ${x.text}`).join("\n")}`;
    return { id, title: t.title, kind: "task", kindLabel: "업무", versions: [{ v: 1, at: t.createdAt + "T09:00:00", author: { kind: "human", memberId: t.ownerId }, summary: "업무 생성", basedOn: t.contextIds, body }] };
  }
  return findDocLike(id);
}

function tipsFor(doc: DocLike) {
  return KIND_TIPS[doc.kind] ?? KIND_TIPS[doc.kind.split(":")[0]] ?? KIND_TIPS.generic;
}

function docAnswer(docs: DocLike[], question: string): AiTurn {
  const doc = docs[0];
  const ver = doc.versions[doc.versions.length - 1];
  const tips = tipsFor(doc);
  // 문서 히스토리 — 버전 이력과 계보(근거로 쓴 문서 / 이 문서로 만든 문서)를 답변 근거에 포함
  const { parents, children } = lineageOf(doc.id);
  const history = doc.versions.length > 1
    ? `버전 이력: ${doc.versions.map((x) => `v${x.v} ${x.summary.length > 22 ? x.summary.slice(0, 21) + "…" : x.summary}`).join(" → ")}`
    : `버전 이력: v1 뿐 — 아직 수정 없음`;
  const lineage = [
    parents.length ? `근거로 쓴 문서: ${parents.map((h) => `${h.title}(${h.via})`).join(", ")}` : "근거로 쓴 문서: 없음 — 출처 문서",
    children.length ? `이 문서로 만든 문서: ${children.map((h) => `${h.title}(${h.via})`).join(", ")}` : null,
  ].filter(Boolean).join("\n");
  const ripple = children.length ? `\n\n이 문서를 고치면 ${children.map((h) => h.title).join(", ")} 도 다시 봐야 합니다.` : "";
  let text: string;
  if (docs.length === 1) {
    const excerpt = ver.body.split("\n").filter(Boolean).slice(0, 3).join(" · ");
    text = `**${doc.title}** v${ver.v} 를 기준으로 봤습니다.\n\n> ${excerpt}\n\n${history}\n${lineage}\n\n"${question}" 에 대해 보완할 지점 3가지:\n1. ${tips[0]}\n2. ${tips[1]}\n3. ${tips[2]}${ripple}\n\n적용하면 이 문서에 v${ver.v + 1} 이 기록되고, Drawer 버전 탭에서 전후를 비교할 수 있습니다.`;
  } else {
    // 여러 문서 — 문서별 한 줄 진단 + 문서 간 정합성, 반영은 첫 문서에
    const perDoc = docs.map((d) => {
      const v = d.versions[d.versions.length - 1];
      return `- **${d.title}** v${v.v} (${d.kindLabel}) — ${tipsFor(d)[0]}`;
    });
    text = `문서 ${docs.length}개를 함께 봤습니다.\n\n${perDoc.join("\n")}\n\n"${question}" 관점에서 문서 간 정합성:\n1. 날짜·금액·범위 표기가 문서마다 다르면 최신 결정을 기준으로 통일\n2. 한 문서를 고치면 나머지는 근거 링크로 연결해 추적 가능하게\n3. 고객 발송본과 내부본을 분리\n\n반영은 첫 문서(**${doc.title}**)에 v${ver.v + 1} 로 기록됩니다. 다른 문서는 멘션을 바꿔 따로 반영하세요.`;
  }
  return {
    role: "ai",
    text,
    sources: [...docs.map((d) => ({ id: d.id, label: d.title })), ...parents.map((h) => ({ id: h.id, label: `근거: ${h.title}` }))].slice(0, 6),
    action: {
      label: `${doc.title.length > 14 ? doc.title.slice(0, 13) + "…" : doc.title} v${ver.v + 1} 로 반영`,
      effect: `version:${doc.id}`,
      payload: {
        summary: `AI 보완 — ${question.slice(0, 40)}`,
        body: ver.body + "\n\n---\n[AI 보완]\n" + tips.map((t, i) => `${i + 1}. ${t}`).join("\n"),
      },
    },
  };
}

export function AiPanel({ embedded = false }: { embedded?: boolean }) {
  const pathname = usePathname() ?? "/";
  const router = useRouter();
  const { toast } = useToast();
  const { setAiOpen, registerAskHandler, registerMentionHandler, extraVersions, saveDraft, decideApproval } = usePreview();
  const scenario = scenarioFor(pathname);

  // 스레드는 라우트(=컨텍스트 범위)마다 새로 시작 — AppShell 이 key={pathname} 으로 리마운트한다
  const [turns, setTurns] = useState<AiTurn[]>([]);
  const [draft, setDraft] = useState("");
  const [thinking, setThinking] = useState(false);
  const threadRef = useRef<HTMLDivElement>(null);

  // 멘션된 문서 — 드래그앤드롭 또는 "AI 로 보완" 버튼으로 들어온다. 답변은 이 문서를 본다.
  const [mentions, setMentions] = useState<{ id: string; label: string }[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const mention = useCallback((docId: string) => {
    const c = resolveDoc(docId);
    if (!c) return;
    setMentions((m) => (m.some((x) => x.id === docId) ? m : [...m, { id: docId, label: c.title }]));
  }, []);
  useEffect(() => registerMentionHandler(mention), [registerMentionHandler, mention]);

  const ask = useCallback(
    (text: string) => {
      if (!text.trim()) return;
      setTurns((t) => [...t, { role: "user", text }]);
      setDraft("");
      setThinking(true);
      const reply = scenario?.turns.find((t) => t.role === "ai");
      const matched = scenario?.turns.findIndex((t) => t.role === "user" && t.text === text);
      const mentioned = mentions.map((m) => resolveDoc(m.id)).filter((d): d is DocLike => !!d);
      const answer: AiTurn =
        matched !== undefined && matched >= 0 && scenario
          ? scenario.turns[matched + 1]
          : mentioned.length > 0
            ? docAnswer(mentioned, text)
            : reply ?? {
              role: "ai",
              text: "프리뷰에서는 제안 질문에만 스크립트된 답변이 있습니다. 실제 연동 시 Nora 가 현재 범위의 컨텍스트를 검색해 답합니다.",
            };
      window.setTimeout(() => {
        setTurns((t) => [...t, answer]);
        setThinking(false);
      }, 700);
    },
    [scenario, mentions],
  );

  // 다른 화면의 "AI에게 물어보기" 버튼이 이 핸들러로 들어온다
  useEffect(() => registerAskHandler(ask), [registerAskHandler, ask]);

  useEffect(() => {
    threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight });
  }, [turns, thinking]);

  const runEffect = (action: NonNullable<AiTurn["action"]>) => {
    const [kind, id] = action.effect.split(":");
    if (kind === "version") {
      // 컨텍스트 항목·계약 문서 공용. payload 가 있으면 그 본문으로, 없으면 요구사항 v4 기본 시나리오.
      // Nora 의 제안도 사람 수정과 같이 draft 로만 — 승인해야 확정·Drive 배포.
      const base = (resolveDoc(id)?.versions ?? []).length + (extraVersions[id]?.length ?? 0);
      const payload = action.payload ?? {
        summary: "AI 제안 적용 — R-03 동기화 주기 5분, BASIS 확인 조건부 (충돌 cf-3 supersede)",
        body: "# 요구사항 정의서 v" + (base + 1) + "\n\n## R-03 SAP 연동\n재고 수량 양방향 동기화. 주기 **5분** (PR #142). 단, SAP 명세서의 RFC 호출량 제한에 따라 **한빛 BASIS 팀 확인을 조건**으로 함.\n\n(그 외 항목은 v" + base + " 과 동일)",
      };
      saveDraft(id, {
        at: new Date().toISOString(),
        author: { kind: "ai", model: "Nora · claude-opus" },
        summary: payload.summary,
        basedOn: (turns.findLast?.((t) => t.role === "ai")?.sources ?? []).map((s) => s.id),
        body: payload.body,
      });
      toast({ title: `v${base + 1} draft 생성됨`, description: "문서에서 이전 버전과 비교하고 승인하면 Google Drive 에 배포됩니다.", tone: "success" });
    } else if (kind === "approve") {
      decideApproval(id, "approved");
      toast({ title: "승인됨", description: "승인 큐에서 제거됐습니다.", tone: "success" });
    } else if (kind === "risk") {
      const href = hrefFor(id);
      if (href) router.push(href);
    } else if (kind === "deliverable") {
      toast({ title: "산출물 초안 생성", description: "프리뷰 — 산출물 목록에는 반영되지 않습니다.", tone: "neutral" });
    }
  };

  // WKWebView 는 dragover 중 커스텀 MIME 을 노출하지 않을 수 있어 모듈 폴백(draggedDoc)도 본다
  const isDocDrag = (e: React.DragEvent) => !!draggedDoc() || Array.from(e.dataTransfer.types).includes(DOC_MIME);
  const readDocId = (e: React.DragEvent) => e.dataTransfer.getData(DOC_MIME) || draggedDoc() || "";

  return (
    <div
      className={styles.root}
      data-dragover={dragOver || undefined}
      onDragEnter={(e) => { if (isDocDrag(e)) { e.preventDefault(); setDragOver(true); } }}
      onDragOver={(e) => { if (isDocDrag(e)) { e.preventDefault(); e.dataTransfer.dropEffect = "link"; setDragOver(true); } }}
      onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDragOver(false); }}
      onDrop={(e) => { e.preventDefault(); const id = readDocId(e); if (id) mention(id); endDocDrag(); setDragOver(false); }}
    >
      {dragOver && <div className={styles.dropHint}><Icon name="clipboard-text" size={16} /> 여기에 놓으면 이 문서를 보고 답합니다</div>}
      {!embedded && (
        <div className={styles.head}>
          <Icon name="chat-circle" size={16} />
          AI
          <span className={styles.headSpacer} />
          <IconButton size="sm" variant="ghost" icon={<Icon name="x" />} aria-label="패널 닫기" onClick={() => setAiOpen(false)} />
        </div>
      )}
      <div className={styles.scope}>
        <Icon name="selection" size={12} />
        범위
        <span className={styles.scopeName}>{scopeLabel(pathname)}</span>
        {mentions.length > 0 && <span className={styles.scopeDocs}>· 문서 {mentions.length}</span>}
      </div>

      <div className={styles.thread} ref={threadRef}>
        {turns.length === 0 && scenario && (
          <div className={styles.suggestions}>
            <div className={styles.suggestionsLabel}>이 화면에서 물어볼 수 있는 것</div>
            {scenario.suggestions.map((s) => (
              <Button key={s} size="sm" variant="ghost" className={styles.suggestion} onClick={() => ask(s)}>
                {s}
              </Button>
            ))}
          </div>
        )}

        {turns.map((t, i) =>
          t.role === "user" ? (
            <UserMessage key={i} actions={[]}>
              {t.text}
            </UserMessage>
          ) : (
            <AIMessage
              key={i}
              actions={[]}
              sources={t.sources?.map((s) => ({ id: s.id, label: s.label, href: hrefFor(s.id) }))}
            >
              <div className={styles.aiBody}>{renderBody(t.text)}</div>
              {t.action && (
                <div className={styles.actionRow}>
                  <Button size="xs" variant="primary" onClick={() => runEffect(t.action!)}>
                    {t.action.label}
                  </Button>
                </div>
              )}
            </AIMessage>
          ),
        )}

        {thinking && (
          <div className={styles.thinking}>
            <Spinner size="sm" /> 컨텍스트 검색 중…
          </div>
        )}
      </div>

      <div className={styles.composer}>
        {mentions.length > 0 && (
          <div className={styles.mentions} aria-label="멘션한 문서">
            {mentions.map((m) => {
              const d = resolveDoc(m.id);
              return (
                <Chip key={m.id} size="sm" variant="soft" leftIcon={<Icon name="article" size={12} />} onRemove={() => setMentions((x) => x.filter((y) => y.id !== m.id))} removeLabel={`${m.label} 멘션 제거`} title={m.label}>
                  <span className={styles.mentionLabel}>{m.label}</span>
                  {d && <span className={styles.mentionKind}>{d.kindLabel}</span>}
                </Chip>
              );
            })}
            {mentions.length > 1 && <Button size="xs" variant="ghost" onClick={() => setMentions([])}>모두 제거</Button>}
          </div>
        )}
        <ChatInput
          shape="single"
          value={draft}
          onChange={setDraft}
          onSend={() => ask(draft)}
          placeholder={mentions.length > 0 ? "멘션한 문서에 대해 질문·보완 요청…" : "현재 범위 안에서 질문·작성·수정… (문서를 끌어다 놓아 멘션)"}
          isStreaming={thinking}
        />
      </div>
    </div>
  );
}
