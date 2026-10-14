"use client";

/**
 * CTAS 앱 셸 — AppFrame(sidebar-first) + 2단 사이드바(Rail + Sidebar) + Topbar + AI 패널.
 *
 * Rail 5영역: 대시보드 · 운영 · 지식 · 개발 · 설정. 활성 영역은 라우트에서 유도하고,
 * 사용자가 Rail 을 눌러 다른 영역 메뉴를 미리 볼 수도 있다(라우트 바뀌면 다시 동기화).
 * 지식·개발 패널은 "현재 프로젝트"(마지막으로 본 프로젝트) 기준 메뉴를 보여준다.
 * `/ctds` 온보딩 라우트는 셸 없이 그대로 통과.
 */

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import {
  AppFrame,
  Avatar,
  Badge,
  Breadcrumb,
  Button,
  DropdownMenu,
  Icon,
  IconButton,
  Input,
  Sidebar,
  Tooltip,
  Topbar,
  type IconName,
} from "@/components/ctas/ctds";
import {
  LABEL,
  NOTIFICATION_ICON,
  approvals,
  fmtDateTime,
  notifications,
  byProject,
  getContext,
  getDeliverable,
  getPattern,
  getProject,
  getTask,
} from "@/lib/mock";
import { usePreview } from "@/lib/preview-state";
import { AiPanel } from "./AiPanel";
import { PreviewPane } from "./PreviewPane";
import styles from "./AppShell.module.css";

type Area = "dashboard" | "ops" | "knowledge" | "dev" | "settings";

/* Rail 을 누르면 그 영역의 첫 메뉴(home)로 이동한다 */
const AREAS: { id: Area; icon: IconName; label: string; home: string }[] = [
  { id: "dashboard", icon: "squares-four", label: "대시보드", home: "/" },
  { id: "ops", icon: "compass", label: "운영", home: "/projects" },
  { id: "knowledge", icon: "stack", label: "지식", home: "/knowledge" },
  { id: "dev", icon: "brackets-square", label: "개발", home: "/dev" },
  { id: "settings", icon: "gear", label: "설정", home: "/settings" },
];

/** 라우트 → 영역 */
function areaFor(pathname: string): Area {
  const seg = pathname.split("/").filter(Boolean);
  if (seg.length === 0 || seg[0] === "approvals" || seg[0] === "todo") return "dashboard";
  if (seg[0] === "ops") return "ops";
  if (seg[0] === "knowledge") return "knowledge";
  if (seg[0] === "dev") return "dev";
  if (seg[0] === "settings") return "settings";
  if (seg[0] === "projects") {
    const sub = seg[2];
    if (sub === "context" || sub === "deliverables") return "knowledge";
    if (sub === "tasks" || sub === "conflicts") return "dev";
    return "ops";
  }
  return "dashboard";
}

function routeProjectId(pathname: string) {
  const seg = pathname.split("/").filter(Boolean);
  return seg[0] === "projects" && seg[1] && getProject(seg[1]) ? seg[1] : null;
}

/* ── Breadcrumb ────────────────────────────────── */
function Crumbs() {
  const pathname = usePathname() ?? "/";
  const seg = pathname.split("/").filter(Boolean);
  const crumbs: { label: string; href?: string }[] = [];
  const area = areaFor(pathname);
  const areaMeta = AREAS.find((a) => a.id === area)!;

  const projectSub: Record<string, string> = {
    context: "컨텍스트",
    tasks: "업무",
    risks: "리스크",
    conflicts: "충돌",
    deliverables: "산출물",
    settings: "프로젝트 설정",
  };

  if (seg[0] === "projects") {
    crumbs.push({ label: areaMeta.label, href: area === "ops" ? "/projects" : area === "knowledge" ? "/knowledge" : "/dev" });
    const p = seg[1] && getProject(seg[1]);
    if (p) {
      crumbs.push({ label: p.name, href: `/projects/${p.id}` });
      if (seg[2] && projectSub[seg[2]]) crumbs.push({ label: projectSub[seg[2]], href: `/projects/${p.id}/${seg[2]}` });
      if (seg[3]) {
        const leaf =
          getContext(seg[3])?.title ?? getTask(seg[3])?.title ?? getDeliverable(seg[3])?.title ?? (seg[3] === "graph" ? "추적 타임라인" : seg[3]);
        crumbs.push({ label: leaf });
      }
    } else {
      crumbs.push({ label: "프로젝트" });
    }
  } else if (seg[0] === "approvals") {
    crumbs.push({ label: "대시보드", href: "/" }, { label: "승인 목록" });
  } else if (seg[0] === "todo") {
    crumbs.push({ label: "대시보드", href: "/" }, { label: "투두" });
  } else if (seg[0] === "ops") {
    crumbs.push({ label: "운영", href: "/projects" });
    const sub: Record<string, string> = { milestones: "마일스톤", contracts: "계약·문서", resources: "리소스", insights: "인사이트" };
    if (seg[1] && sub[seg[1]]) crumbs.push({ label: sub[seg[1]], href: `/ops/${seg[1]}` });
    const contractsSub: Record<string, string> = { schedule: "일정" };
    if (seg[1] === "contracts" && seg[2] && contractsSub[seg[2]]) crumbs.push({ label: contractsSub[seg[2]] });
  } else if (seg[0] === "knowledge") {
    crumbs.push({ label: "지식", href: "/knowledge" });
    const sub: Record<string, string> = { patterns: "패턴 라이브러리", templates: "템플릿" };
    if (seg[1] && sub[seg[1]]) crumbs.push({ label: sub[seg[1]], href: `/knowledge/${seg[1]}` });
    if (seg[2]) crumbs.push({ label: seg[2] === "promote" ? "패턴 승격" : getPattern(seg[2])?.title ?? seg[2] });
  } else if (seg[0] === "dev") {
    crumbs.push({ label: "개발", href: "/dev" });
    const sub: Record<string, string> = { agents: "에이전트", deploy: "배포", closed: "종결" };
    if (seg[1] && sub[seg[1]]) crumbs.push({ label: sub[seg[1]] }); else crumbs[crumbs.length - 1] = { label: "개발 목록" };
  } else if (seg[0] === "settings") {
    crumbs.push({ label: "설정", href: "/settings" });
    const sub: Record<string, string> = { org: "조직", roles: "역할·권한", customers: "고객사·격리", compliance: "컴플라이언스", integrations: "연동" };
    if (seg[1] && sub[seg[1]]) crumbs.push({ label: sub[seg[1]] });
  }

  const last = crumbs.length - 1;
  return (
    <Breadcrumb aria-label="현재 위치" className={styles.crumbs}>
      <Breadcrumb.Link asChild leftIcon={<Icon name="house" />}>
        <Link href="/">{crumbs.length === 0 ? "대시보드" : "홈"}</Link>
      </Breadcrumb.Link>
      {crumbs.map((c, i) =>
        i === last || !c.href ? (
          <Breadcrumb.Current key={i}>{c.label}</Breadcrumb.Current>
        ) : (
          <Breadcrumb.Link asChild key={i}>
            <Link href={c.href}>{c.label}</Link>
          </Breadcrumb.Link>
        ),
      )}
    </Breadcrumb>
  );
}

/* ── Sidebar (Rail + Panel) ────────────────────── */
function ShellSidebar() {
  const pathname = usePathname() ?? "/";
  const router = useRouter();
  const { role, approvalDecisions, projectId, setProjectId, aiOpen, setAiOpen } = usePreview();

  // 라우트에서 유도한 영역을 기본으로, Rail 클릭으로 미리보기 전환 허용. 라우트가 바뀌면 재동기화.
  const routeArea = areaFor(pathname);
  const [area, setArea] = useState<Area>(routeArea);
  const [seenPath, setSeenPath] = useState(pathname);
  if (seenPath !== pathname) {
    setSeenPath(pathname);
    setArea(routeArea);
  }

  // 라우트에 프로젝트가 있으면 "현재 프로젝트"로 기억
  const rp = routeProjectId(pathname);
  const [seenRp, setSeenRp] = useState(rp);
  if (rp && rp !== seenRp) {
    setSeenRp(rp);
    setProjectId(rp);
  }

  const pid = projectId;
  const pendingApprovals = approvals.filter((a) => (approvalDecisions[a.id] ?? a.state) === "pending").length;
  const blockedTasks = byProject.tasks(pid).filter((t) => t.state === "blocked").length;

  const is = (href: string) => pathname === href || pathname === href + "/";
  const under = (href: string) => is(href) || pathname.startsWith(href + "/");

  const item = (href: string, icon: IconName, label: string, opts?: { exact?: boolean; count?: number; tone?: "destructive" | "warning" }) => (
    <Sidebar.Item
      asChild
      icon={<Icon name={icon} />}
      label={label}
      active={opts?.exact ? is(href) : under(href)}
      trailing={opts?.count ? <Badge size="sm" variant="soft" status={opts.tone}>{opts.count}</Badge> : undefined}
    >
      <Link href={href}>{label}</Link>
    </Sidebar.Item>
  );

  const panels: Record<Area, ReactNode> = {
    dashboard: (
      <Sidebar.Section>
        {item("/", "house", "개요", { exact: true })}
        {item("/approvals", "check-circle", "승인 목록", { count: pendingApprovals })}
        {item("/todo", "check-square", "투두")}
      </Sidebar.Section>
    ),
    // 운영 = 전 프로젝트·팀원 리소스를 한눈에. 프로젝트별 세부(단계·리스크·설정)는 상세 페이지에서.
    ops: (
      <>
        <Sidebar.Section>
          {item("/projects", "squares-four", "프로젝트")}
          {item("/ops/milestones", "calendar-dots", "마일스톤")}
          {item("/ops/resources", "user-circle", "리소스")}
          {item("/ops/insights", "chart-line", "인사이트")}
          {item("/ops/contracts", "identification-card", "계약·문서")}
        </Sidebar.Section>
        {under("/ops/contracts") && (
          <>
            <Sidebar.Separator />
            <Sidebar.Section title="계약·문서">
              {item("/ops/contracts", "stack", "문서함", { exact: true })}
              {item("/ops/contracts/schedule", "calendar-blank", "일정")}
            </Sidebar.Section>
          </>
        )}
      </>
    ),
    // 지식 = 모든 문서의 집합소. 계약·문서와 같은 문서함 구조. AI 는 탑바 패널(드래그 멘션).
    knowledge: (
      <>
        <Sidebar.Section>
          {item("/knowledge", "stack", "문서함", { exact: true })}
          {item(`/projects/${pid}/context/graph`, "line-segments", "추적 타임라인")}
        </Sidebar.Section>
      </>
    ),
    // 개발 = 전 프로젝트 허브. 프로젝트 선택은 허브 안의 필터로, 사이드바엔 두지 않는다.
    // 개발 = orbit Operate 의 4단계. 충돌은 Nora 에이전트가 처리하므로 메뉴에 두지 않는다.
    dev: (
      <Sidebar.Section>
        {item("/dev", "rows", "개발 목록", { exact: true, count: blockedTasks, tone: "destructive" })}
        {item("/dev/agents", "waveform", "에이전트")}
        {item("/dev/deploy", "upload-simple", "배포")}
        {item("/dev/closed", "check-circle", "종결")}
      </Sidebar.Section>
    ),
    settings: (
      <Sidebar.Section>
        {item("/settings", "gear", "개요", { exact: true })}
        {item("/settings/org", "user-circle", "조직")}
        {item("/settings/roles", "identification-card", "역할·권한")}
        {item("/settings/customers", "globe", "고객사·격리")}
        {item("/settings/compliance", "seal-check", "컴플라이언스")}
        {item("/settings/integrations", "broadcast", "연동")}
      </Sidebar.Section>
    ),
  };

  const areaMeta = AREAS.find((a) => a.id === area)!;

  return (
    <div className={styles.split}>
      {/* Rail */}
      <div className={styles.rail}>
        <div className={styles.railBrand}>
          <Link href="/" aria-label="CTAS 홈">
            <span className={styles.brandMark}>CT</span>
          </Link>
        </div>
        <div className={styles.railItems} role="tablist" aria-orientation="vertical">
          {AREAS.map((a, i) => (
            <span key={a.id} style={{ display: "contents" }}>
              {i === 4 && <span className={styles.railSep} />}
              <Tooltip content={a.label} side="right">
                <IconButton
                  variant={a.id === area ? "secondary" : "ghost"}
                  size="lg"
                  icon={<Icon name={a.icon} weight={a.id === area ? "fill" : "regular"} />}
                  aria-label={a.label}
                  aria-selected={a.id === area}
                  role="tab"
                  onClick={() => { setArea(a.id); router.push(a.home); }}
                />
              </Tooltip>
            </span>
          ))}
        </div>
        <div className={styles.railFooter}>
          <Tooltip content="AI 패널" side="right">
            <IconButton
              variant={aiOpen ? "secondary" : "ghost"}
              size="lg"
              icon={<Icon name="chat-circle" weight={aiOpen ? "fill" : "regular"} />}
              aria-label="AI 패널"
              onClick={() => setAiOpen(!aiOpen)}
            />
          </Tooltip>
          <Avatar size="sm" name="김서연" status="online" />
        </div>
      </div>

      {/* Panel */}
      <Sidebar>
        <Sidebar.Header>
          <div className={styles.panelHead}>
            <div className={styles.panelTitle}>{areaMeta.label}</div>
            <Input size="sm" leftIcon={<Icon name="search" />} placeholder="검색" aria-label={`${areaMeta.label} 검색`} />
          </div>
        </Sidebar.Header>
        <Sidebar.Body>{panels[area]}</Sidebar.Body>
        <Sidebar.Footer>
          <Sidebar.Profile name="김서연" sub={`${LABEL.role[role]} · 프리뷰`} avatar={{ status: "online" }} />
        </Sidebar.Footer>
      </Sidebar>
    </div>
  );
}

/* ── Topbar ────────────────────────────────────── */
function ShellTopbar() {
  const router = useRouter();
  const { aiOpen, setAiOpen, readNotifs, markRead, markAllRead } = usePreview();
  const unread = notifications.filter((n) => !(readNotifs[n.id] ?? n.read)).length;
  const sorted = [...notifications].sort((x, y) => y.at.localeCompare(x.at));
  return (
    <Topbar size="sm" className={styles.topbar}>
      <Crumbs />
      <Topbar.Spacer />
      <div className={styles.topRight}>
        <DropdownMenu>
          <DropdownMenu.Trigger asChild>
            <span className={styles.bellWrap}>
              <IconButton size="md" variant="ghost" icon={<Icon name="bell" size={22} weight={unread > 0 ? "fill" : "regular"} />} aria-label={`알림 ${unread}건 안 읽음`} />
              {unread > 0 && <span className={styles.bellBadge}>{unread}</span>}
            </span>
          </DropdownMenu.Trigger>
          <DropdownMenu.Content align="end" className={styles.notifMenu}>
            <div className={styles.notifHead}>
              <span>알림</span>
              <Button size="xs" variant="ghost" onClick={markAllRead} disabled={unread === 0}>모두 읽음</Button>
            </div>
            {sorted.map((n) => {
              const isRead = readNotifs[n.id] ?? n.read;
              return (
                <DropdownMenu.Item
                  key={n.id}
                  className={styles.notifItem}
                  data-unread={!isRead || undefined}
                  leadingActions={[<Icon key="i" name={NOTIFICATION_ICON[n.kind]} size={16} />]}
                  description={`${n.body} · ${fmtDateTime(n.at)}`}
                  onSelect={() => { markRead(n.id); router.push(n.href); }}
                >
                  {n.title}
                </DropdownMenu.Item>
              );
            })}
          </DropdownMenu.Content>
        </DropdownMenu>
        <IconButton
          size="md"
          variant={aiOpen ? "secondary" : "ghost"}
          icon={<Icon name="chat-circle" size={22} weight={aiOpen ? "fill" : "regular"} />}
          aria-label="AI 패널"
          onClick={() => setAiOpen(!aiOpen)}
        />
      </div>
    </Topbar>
  );
}

/* ── Shell ─────────────────────────────────────── */
export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? "/";
  const { aiOpen, previewOpen } = usePreview();

  if (pathname.startsWith("/ctds")) return <>{children}</>;

  return (
    <AppFrame variant="outlined" layout="sidebar-first">
      <AppFrame.Sidebar>
        <ShellSidebar />
      </AppFrame.Sidebar>
      <AppFrame.Topbar>
        <ShellTopbar />
      </AppFrame.Topbar>
      <AppFrame.Content>
        <div className={styles.body}>
          <main className={styles.main}>{children}</main>
          {previewOpen && (
            <aside className={styles.preview} aria-label="미리보기">
              <PreviewPane />
            </aside>
          )}
          {aiOpen && (
            <aside className={styles.ai} aria-label="AI 패널">
              <AiPanel key={pathname} />
            </aside>
          )}
        </div>
      </AppFrame.Content>
    </AppFrame>
  );
}
