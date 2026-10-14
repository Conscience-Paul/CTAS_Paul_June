"use client";

/**
 * 프리뷰 전용 로컬 상태. 승인·버전·리스크 처리 등 "동작하는 것처럼" 보이는 변화는
 * 전부 여기 메모리에만 쌓인다. 새로고침하면 초기화 — 의도된 동작.
 * 추후 lib/api 가 실제 백엔드로 바뀌면 이 파일은 제거된다.
 */

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { ApprovalState, ContextVersion, Role, Task } from "@/lib/mock";
import { notifications, tasks } from "@/lib/mock";

export interface TaskGroup {
  id: string;
  name: string;
  taskIds: string[];
  createdAt: string;
}

interface PreviewState {
  role: Role;
  setRole: (r: Role) => void;

  approvalDecisions: Record<string, ApprovalState>;
  decideApproval: (id: string, state: ApprovalState) => void;

  extraVersions: Record<string, ContextVersion[]>;
  addVersion: (ownerId: string, v: Omit<ContextVersion, "v">) => number;

  riskStatus: Record<string, "open" | "acknowledged" | "dismissed" | "resolved">;
  setRiskStatus: (id: string, s: "open" | "acknowledged" | "dismissed" | "resolved") => void;

  resolvedConflicts: Record<string, boolean>;
  resolveConflict: (id: string) => void;

  /** 접수 폼으로 만든 개발 항목 — 목 배열에 밀어 넣는다(세션 동안만) */
  addTask: (t: Task) => void;
  taskVersion: number;

  /** 업무 통합 그룹 — 그룹은 AI 스레드를 하나로 공유한다 */
  taskGroups: TaskGroup[];
  addTaskGroup: (taskIds: string[]) => TaskGroup;
  removeTaskGroup: (groupId: string) => void;

  /** 마지막으로 본 프로젝트 — 지식·개발 패널의 "현재 프로젝트" 기준 */
  projectId: string;
  setProjectId: (id: string) => void;

  aiOpen: boolean;
  setAiOpen: (open: boolean) => void;

  /** 알림 읽음 (프리뷰 로컬) */
  readNotifs: Record<string, boolean>;
  markRead: (id: string) => void;
  markAllRead: () => void;

  /** 오른쪽 미리보기 웹뷰 (localhost 등) — Codex 식 프리뷰 패널 */
  previewOpen: boolean;
  previewUrl: string;
  openPreview: (url?: string) => void;
  closePreview: () => void;
  setPreviewUrl: (url: string) => void;
  /** 화면에서 AI 패널로 프롬프트를 밀어 넣을 때. 패널이 닫혀 있으면 열리면서 전달된다. */
  askAi: (text: string) => void;
  /** AiPanel 이 마운트 시 등록. 반환값은 해제 함수. */
  registerAskHandler: (fn: (text: string) => void) => () => void;
  /** 문서를 AI 패널에 멘션(드래그앤드롭·"AI로 보완" 버튼). 패널이 닫혀 있으면 열면서 전달. */
  mentionDoc: (docId: string) => void;
  registerMentionHandler: (fn: (docId: string) => void) => () => void;
}

const Ctx = createContext<PreviewState | null>(null);

export function PreviewProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<Role>("pm");
  const [approvalDecisions, setDecisions] = useState<Record<string, ApprovalState>>({});
  const [extraVersions, setExtraVersions] = useState<Record<string, ContextVersion[]>>({});
  const [riskStatus, setRiskStatusMap] = useState<PreviewState["riskStatus"]>({});
  const [resolvedConflicts, setResolved] = useState<Record<string, boolean>>({});
  const [projectId, setProjectId] = useState("p-hanbit-ims");
  const [taskGroups, setTaskGroups] = useState<TaskGroup[]>([]);
  // 목 배열(tasks)은 모듈 싱글턴이라 push 로 전 화면에 즉시 보인다. 리렌더 신호만 상태로.
  const [taskVersion, setTaskVersion] = useState(0);
  const addTask = useCallback((t: Task) => { tasks.unshift(t); setTaskVersion((v) => v + 1); }, []);
  const addTaskGroup = useCallback((taskIds: string[]) => {
    const g: TaskGroup = { id: `grp-${Date.now().toString(36)}`, name: `통합 ${taskIds.length}건`, taskIds, createdAt: new Date().toISOString() };
    // 이미 다른 그룹에 있던 업무는 새 그룹으로 옮긴다
    setTaskGroups((gs) => [...gs.map((x) => ({ ...x, taskIds: x.taskIds.filter((t) => !taskIds.includes(t)) })).filter((x) => x.taskIds.length > 1), g]);
    return g;
  }, []);
  const removeTaskGroup = useCallback((groupId: string) => setTaskGroups((gs) => gs.filter((g) => g.id !== groupId)), []);
  // AI 는 지식 › AI 채팅 페이지가 주 진입점. 사이드 패널은 요청 시에만 연다.
  const [aiOpen, setAiOpen] = useState(false);
  const [readNotifs, setReadNotifs] = useState<Record<string, boolean>>({});
  const markRead = useCallback((id: string) => setReadNotifs((m) => ({ ...m, [id]: true })), []);
  const markAllRead = useCallback(() => setReadNotifs((m) => { const n = { ...m }; notifications.forEach((x) => (n[x.id] = true)); return n; }), []);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState("http://localhost:3000");
  const openPreview = useCallback((url?: string) => { if (url) setPreviewUrl(url); setPreviewOpen(true); }, []);
  const closePreview = useCallback(() => setPreviewOpen(false), []);
  // 패널이 아직 안 떠 있을 때 들어온 프롬프트는 보관했다가 등록 시점에 흘려보낸다
  const askHandler = useRef<((text: string) => void) | null>(null);
  const pendingPrompt = useRef<string | null>(null);
  const mentionHandler = useRef<((docId: string) => void) | null>(null);
  const pendingMentions = useRef<string[]>([]);

  const decideApproval = useCallback((id: string, state: ApprovalState) => {
    setDecisions((d) => ({ ...d, [id]: state }));
  }, []);

  const addVersion = useCallback((ownerId: string, v: Omit<ContextVersion, "v">) => {
    let next = 0;
    setExtraVersions((m) => {
      const existing = m[ownerId] ?? [];
      next = existing.length + 1; // 호출부가 base 길이를 더해 실제 v 번호를 만든다
      return { ...m, [ownerId]: [...existing, { ...v, v: next }] };
    });
    return next;
  }, []);

  const setRiskStatus = useCallback((id: string, s: PreviewState["riskStatus"][string]) => {
    setRiskStatusMap((m) => ({ ...m, [id]: s }));
  }, []);

  const resolveConflict = useCallback((id: string) => {
    setResolved((m) => ({ ...m, [id]: true }));
  }, []);

  const mentionDoc = useCallback((docId: string) => {
    setAiOpen(true);
    if (mentionHandler.current) mentionHandler.current(docId);
    else pendingMentions.current.push(docId);
  }, []);
  const registerMentionHandler = useCallback((fn: (docId: string) => void) => {
    mentionHandler.current = fn;
    const queued = pendingMentions.current;
    pendingMentions.current = [];
    queued.forEach(fn);
    return () => {
      if (mentionHandler.current === fn) mentionHandler.current = null;
    };
  }, []);
  const askAi = useCallback((text: string) => {
    setAiOpen(true);
    if (askHandler.current) askHandler.current(text);
    else pendingPrompt.current = text;
  }, []);
  const registerAskHandler = useCallback((fn: (text: string) => void) => {
    askHandler.current = fn;
    if (pendingPrompt.current) {
      const t = pendingPrompt.current;
      pendingPrompt.current = null;
      fn(t);
    }
    return () => {
      if (askHandler.current === fn) askHandler.current = null;
    };
  }, []);

  const value = useMemo<PreviewState>(
    () => ({
      role,
      setRole,
      approvalDecisions,
      decideApproval,
      extraVersions,
      addVersion,
      riskStatus,
      setRiskStatus,
      resolvedConflicts,
      resolveConflict,
      addTask,
      taskVersion,
      taskGroups,
      addTaskGroup,
      removeTaskGroup,
      projectId,
      setProjectId,
      aiOpen,
      setAiOpen,
      readNotifs,
      markRead,
      markAllRead,
      previewOpen,
      previewUrl,
      openPreview,
      closePreview,
      setPreviewUrl,
      askAi,
      registerAskHandler,
      mentionDoc,
      registerMentionHandler,
    }),
    [role, approvalDecisions, decideApproval, extraVersions, addVersion, riskStatus, setRiskStatus, resolvedConflicts, resolveConflict, addTask, taskVersion, taskGroups, addTaskGroup, removeTaskGroup, projectId, aiOpen, readNotifs, markRead, markAllRead, previewOpen, previewUrl, openPreview, closePreview, askAi, registerAskHandler, mentionDoc, registerMentionHandler],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function usePreview() {
  const v = useContext(Ctx);
  if (!v) throw new Error("usePreview must be used inside <PreviewProvider>");
  return v;
}
