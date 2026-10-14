"use client";

import { Badge, Button, Icon, TableHeader, TableRow, AvatarGroup, Avatar } from "@/components/ctas/ctds";
import { Page, PageHeader, Row, Strong, Subtle, TableBox } from "@/components/ctas/ui";
import {
  LABEL,
  byProject,
  customers,
  getMember,
  projects,
  type Project,
} from "@/lib/mock";

const columns = [
  { key: "name", label: "프로젝트", flex: true, minWidth: 240 },
  { key: "stage", label: "단계", width: 140 },
  { key: "pm", label: "PM", width: 120 },
  { key: "members", label: "멤버", width: 120 },
  { key: "tasks", label: "업무", width: 120 },
  { key: "risks", label: "리스크", width: 100 },
  { key: "period", label: "기간", width: 160 },
];

export default function ProjectsPage() {
  return (
    <Page wide>
      <PageHeader
        title="프로젝트"
        lead="고객사별로 묶입니다. 고객사가 데이터 격리 단위이고, Nora 워크스페이스와 1:1로 매핑됩니다."
        actions={<Button size="sm" variant="primary" leftIcon={<Icon name="plus" />}>새 프로젝트</Button>}
      />

      {customers.map((c) => {
        const list = projects.filter((p) => p.customerId === c.id);
        return (
          <TableBox key={c.id}>
            <div style={{ padding: "var(--space-3) var(--space-4)", borderBottom: "1px solid var(--border)" }}>
              <Row>
                <Strong>{c.name}</Strong>
                <Subtle>{c.industry}</Subtle>
                <Subtle>·</Subtle>
                <Subtle>Nora {c.noraWorkspace}</Subtle>
              </Row>
            </div>
            <TableHeader columns={columns} variant="line" />
            {list.map((p) => (
              <TableRow<Project>
                key={p.id}
                href={`/projects/${p.id}`}
                columns={columns.map((col) => ({ ...col, render: (d: Project) => renderCell(col.key, d) }))}
                data={p}
                variant="line"
              />
            ))}
          </TableBox>
        );
      })}
    </Page>
  );
}

function renderCell(key: string, p: Project) {
  const tasks = byProject.tasks(p.id);
  const risks = byProject.risks(p.id).filter((r) => r.status === "open");
  switch (key) {
    case "name":
      return (
        <Row tight>
          <Badge size="sm" variant="soft">{p.kind}</Badge>
          <span>{p.name}</span>
        </Row>
      );
    case "stage":
      return LABEL.stage[p.stage];
    case "pm":
      return getMember(p.pmId)?.name;
    case "members":
      return (
        <AvatarGroup size="xs">
          {p.memberIds.map((id) => (
            <Avatar key={id} size="xs" name={getMember(id)?.name} />
          ))}
        </AvatarGroup>
      );
    case "tasks": {
      const done = tasks.filter((t) => t.state === "done" || t.state === "verified").length;
      const blocked = tasks.filter((t) => t.state === "blocked").length;
      return (
        <Row tight>
          <span>{done}/{tasks.length}</span>
          {blocked > 0 && <Badge size="sm" variant="soft" status="destructive">차단 {blocked}</Badge>}
        </Row>
      );
    }
    case "risks":
      return risks.length > 0 ? <Badge size="sm" variant="soft" status={risks.some((r) => r.severity === "critical") ? "destructive" : "warning"}>{risks.length}</Badge> : <Subtle>—</Subtle>;
    case "period":
      return <Subtle>{p.startDate.slice(5).replace("-", "/")} – {p.endDate.slice(5).replace("-", "/")}</Subtle>;
  }
}
