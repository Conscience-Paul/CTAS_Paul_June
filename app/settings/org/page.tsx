"use client";

import { Avatar, Badge, Button, Icon, TableHeader, TableRow, useToast } from "@/components/ctas/ctds";
import { Page, PageHeader, Row, Subtle, TableBox } from "@/components/ctas/ui";
import { LABEL, members, projects, type Member } from "@/lib/mock";

const columns = [
  { key: "name", label: "이름", flex: true, minWidth: 200 },
  { key: "role", label: "역할", width: 120 },
  { key: "title", label: "직함", width: 180 },
  { key: "projects", label: "소속 프로젝트", width: 140 },
];

export default function OrgPage() {
  const { toast } = useToast();
  return (
    <Page wide>
      <PageHeader
        title="조직"
        lead="사내 멤버와 역할. 프로젝트 멤버십은 각 프로젝트 설정에서 따로 부여합니다."
        actions={<Button size="sm" variant="primary" leftIcon={<Icon name="plus" />} onClick={() => toast({ title: "멤버 초대 (프리뷰)" })}>멤버 초대</Button>}
      />
      <TableBox>
        <TableHeader columns={columns} variant="line" />
        {members.map((m) => (
          <TableRow<Member>
            key={m.id}
            columns={columns.map((c) => ({ ...c, render: (d: Member) => cell(c.key, d) }))}
            data={m}
            variant="line"
          />
        ))}
      </TableBox>
    </Page>
  );
}

function cell(key: string, m: Member) {
  switch (key) {
    case "name":
      return (
        <Row tight>
          <Avatar size="xs" name={m.name} />
          <span>{m.name}</span>
        </Row>
      );
    case "role":
      return <Badge size="sm" variant="soft" status={m.role === "admin" ? "info" : undefined}>{LABEL.role[m.role]}</Badge>;
    case "title":
      return <Subtle>{m.title}</Subtle>;
    case "projects": {
      const n = projects.filter((p) => p.memberIds.includes(m.id)).length;
      return n > 0 ? `${n}개` : <Subtle>—</Subtle>;
    }
  }
}
