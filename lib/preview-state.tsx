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
import type { ApprovalState, ContextVersion, Role } from "@/lib/mock";

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

  /**
   * 문서당 draft 하나. 사람·Nora 의 수정은 전부 여기에 덮어써지고, 승인 전엔 Google Drive 에 안 나간다.
   * 승인(publishDraft) → 다음 버전으로 확정 + Drive 배포. 원본 쪽 수정은 수집되어 addVersion 으로 들어오고 draft 는 그대로.
   */
  drafts: Record<string, Omit<ContextVersion, "v">>;
  saveDraft: (ownerId: string, d: Omit<ContextVersion, "v">) => void;
  discardDraft: (ownerId: string) => void;
  publishDraft: (ownerId: string, drivePath: string) => void;
  /** Drive 에 배포된 적 있는 문서 → 그 파일 경로. 원본이 없던 문서는 첫 승인 때 생긴다. */
  drivePaths: Record<string, string>;

  riskStatus: Record<string, "open" | "acknowledged" | "dismissed" | "resolved">;
  setRiskStatus: (id: string, s: "open" | "acknowledged" | "dismissed" | "resolved") => void;

  resolvedConflicts: Record<string, boolean>;
  resolveConflict: (id: string) => void;

  /** 업무 통합 그룹 — 그룹은 AI 스레드를 하나로 공유한다 */
  taskGroups: TaskGroup[];
  addTaskGroup: (taskIds: string[]) => TaskGroup;
  removeTaskGroup: (groupId: string) => void;

  /** 마지막으로 본 프로젝트 — 지식·개발 패널의 "현재 프로젝트" 기준 */
  projectId: string;
  setProjectId: (id: string) => void;

  /** 지식 문서함 — 사이드바 트리와 본문이 공유하는 현재 폴더·열린 문서 */
  kFolderId: string | null;
  setKFolderId: (id: string | null) => void;
  contractFolderId: string | null;
  setContractFolderId: (id: string | null) => void;
  openDocId: string | null;
  setOpenDocId: (id: string | null) => void;
  /** 근거 문서 사이드 패널 — AI 패널처럼 화면 오른쪽에 붙는다 */
  peekDocId: string | null;
  setPeekDocId: (id: string | null) => void;

  aiOpen: boolean;
  setAiOpen: (open: boolean) => void;
  /** 화면에서 AI 패널로 프롬프트를 밀어 넣을 때. 패널이 닫혀 있으면 열리면서 전달된다. */
  askAi: (text: string) => void;
  /** AiPanel 이 마운트 시 등록. 반환값은 해제 함수. */
  registerAskHandler: (fn: (text: string) => void) => () => void;
  /** 문서를 AI 패널에 멘션(드래그앤드롭·"AI로 보완" 버튼). 패널이 닫혀 있으면 열면서 전달. */
  mentionDoc: (docId: string) => void;
  registerMentionHandler: (fn: (docId: string) => void) => () => void;
}

const Ctx = createContext<PreviewState | null>(null);

/** 프리뷰 시작 시 열려 있는 draft — 배너·draft 배지·변경 비교·승인 흐름을 바로 볼 수 있게. 회의록은 전부 draft 가 있다 */
const nora = { kind: "ai", model: "Nora" } as const;
const SEED_DRAFTS: Record<string, Omit<ContextVersion, "v">> = {
  "ctx-meet-kickoff": {
    at: "2026-10-13T09:00:00",
    author: nora,
    summary: "액션 진행 상태 갱신 — 요구사항 초안·SAP 명세 완료 표시",
    basedOn: ["ctx-req-spec"],
    body: "## 참석\n한빛유통 IT팀장 박정우, 물류운영팀 과장 김하늘 / CT 김서연(PM), 이준호\n\n## 결정\n- 1차 범위: 12개 센터 재고 통합 조회, 센터 간 이동, SAP 연동\n- **결제·정산은 10월 2주차에 범위 포함 여부 재논의** (고객 요청)\n\n## 액션\n- ~~CT: 요구사항 정의서 초안 7/15까지~~ ✅ 7/15 v1 공유\n- ~~한빛: SAP 인터페이스 명세 7/10까지 전달~~ ✅ 7/11 수령",
  },
  "ctx-meet-0925": {
    at: "2026-10-13T09:05:00",
    author: nora,
    summary: "결정 사항 정리 + 대리 승인 사후 알림 추가 (AgentRun #1 반려 사유 반영)",
    basedOn: ["ctx-req-spec"],
    body: "## 논의\n- 센터 간 재고 이동 시 **센터장 승인** 필요 여부 → 한빛: 500만원 이상만 승인\n- 승인자 부재 시 대리 승인 가능해야 함\n- 대리 승인 시 **원 승인자에게 사후 알림** 필요 (합의)\n\n## 결정\n- 승인 기준: 이동 금액 500만원 이상\n- 대리 승인 허용, 원 승인자 사후 알림 필수\n\n## 액션\n- ~~CT: 승인 흐름 설계안 10/2 공유~~ ✅ 10/2 공유",
  },
  "ctx-meet-1009": {
    at: "2026-10-13T09:10:00",
    author: nora,
    summary: "검수 기준서 미수령 반영, 결제 범위 논의 10/14 확정",
    basedOn: [],
    body: "## 논의\n- 1차 검수 10/17 예정. 검수 기준서는 한빛 측이 10/11까지 전달하기로 함\n- 결제·정산 범위 논의는 **10/14 (화) 14:00** 로 확정 (한빛 재무팀 참석)\n\n## 액션\n- 한빛: 검수 기준서 10/11 — ⚠️ 10/13 현재 미수령, 리마인드 필요\n- CT: 결제 모듈 요구사항 질문 리스트 10/13",
  },
  "ctx-req-spec": {
    at: "2026-10-13T10:20:00",
    author: nora,
    summary: "R-03 SAP 동기화 주기 15분 → 5분 (PR #142), BASIS 팀 확인 조건",
    basedOn: [],
    body: "# 요구사항 정의서 v4\n\n## R-01 재고 통합 조회\n12개 센터의 재고를 SKU 단위로 실시간 조회…\n\n## R-02 센터 간 재고 이동\n이동 요청 → 승인 → 출고 → 입고 확인 4단계.\n- 승인은 **이동 금액 500만원 이상**일 때만 필요\n- 승인자 부재 시 **대리 승인자** 지정 가능\n\n## R-03 SAP 연동\n재고 수량 양방향 동기화 (**5분 주기**, PR #142)\n- 단, SAP RFC 호출량 제한에 따라 **한빛 BASIS 팀 확인**을 조건으로 함\n\n## R-04 재고 부족 알림\n안전 재고 이하 시 담당자 알림…",
  },
};

export function PreviewProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<Role>("pm");
  const [approvalDecisions, setDecisions] = useState<Record<string, ApprovalState>>({});
  const [extraVersions, setExtraVersions] = useState<Record<string, ContextVersion[]>>({});
  const [riskStatus, setRiskStatusMap] = useState<PreviewState["riskStatus"]>({});
  const [resolvedConflicts, setResolved] = useState<Record<string, boolean>>({});
  const [projectId, setProjectId] = useState("p-hanbit-ims");
  // 처음엔 현재 프로젝트 폴더에서 시작 — 매번 루트부터 내려가지 않도록
  const [kFolderId, setKFolderId] = useState<string | null>("kf-p-hanbit-ims");
  const [contractFolderId, setContractFolderId] = useState<string | null>(null);
  const [openDocId, setOpenDocId] = useState<string | null>(null);
  const [peekDocId, setPeekDocId] = useState<string | null>(null);
  const [taskGroups, setTaskGroups] = useState<TaskGroup[]>([]);
  const addTaskGroup = useCallback((taskIds: string[]) => {
    const g: TaskGroup = { id: `grp-${Date.now().toString(36)}`, name: `통합 ${taskIds.length}건`, taskIds, createdAt: new Date().toISOString() };
    // 이미 다른 그룹에 있던 업무는 새 그룹으로 옮긴다
    setTaskGroups((gs) => [...gs.map((x) => ({ ...x, taskIds: x.taskIds.filter((t) => !taskIds.includes(t)) })).filter((x) => x.taskIds.length > 1), g]);
    return g;
  }, []);
  const removeTaskGroup = useCallback((groupId: string) => setTaskGroups((gs) => gs.filter((g) => g.id !== groupId)), []);
  // AI 는 지식 › AI 채팅 페이지가 주 진입점. 사이드 패널은 요청 시에만 연다.
  const [aiOpen, setAiOpen] = useState(false);
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

  const [drafts, setDrafts] = useState<Record<string, Omit<ContextVersion, "v">>>(SEED_DRAFTS);
  const [drivePaths, setDrivePaths] = useState<Record<string, string>>({});
  const saveDraft = useCallback((ownerId: string, d: Omit<ContextVersion, "v">) => {
    setDrafts((m) => ({ ...m, [ownerId]: d }));
  }, []);
  const discardDraft = useCallback((ownerId: string) => {
    setDrafts((m) => { const n = { ...m }; delete n[ownerId]; return n; });
  }, []);
  const publishDraft = useCallback((ownerId: string, drivePath: string) => {
    const d = drafts[ownerId];
    if (!d) return;
    addVersion(ownerId, { ...d, at: new Date().toISOString() });
    discardDraft(ownerId);
    setDrivePaths((m) => ({ ...m, [ownerId]: drivePath }));
  }, [drafts, addVersion, discardDraft]);

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
      drafts,
      saveDraft,
      discardDraft,
      publishDraft,
      drivePaths,
      riskStatus,
      setRiskStatus,
      resolvedConflicts,
      resolveConflict,
      taskGroups,
      addTaskGroup,
      removeTaskGroup,
      projectId,
      setProjectId,
      kFolderId,
      setKFolderId,
      contractFolderId,
      setContractFolderId,
      openDocId,
      setOpenDocId,
      peekDocId,
      setPeekDocId,
      aiOpen,
      setAiOpen,
      askAi,
      registerAskHandler,
      mentionDoc,
      registerMentionHandler,
    }),
    [role, approvalDecisions, decideApproval, extraVersions, addVersion, drafts, saveDraft, discardDraft, publishDraft, drivePaths, riskStatus, setRiskStatus, resolvedConflicts, resolveConflict, taskGroups, addTaskGroup, removeTaskGroup, projectId, kFolderId, contractFolderId, openDocId, peekDocId, aiOpen, askAi, registerAskHandler, mentionDoc, registerMentionHandler],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function usePreview() {
  const v = useContext(Ctx);
  if (!v) throw new Error("usePreview must be used inside <PreviewProvider>");
  return v;
}
