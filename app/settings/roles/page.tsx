"use client";

/**
 * 역할·권한 매트릭스 — Access Control. spec.md §5.1.
 * ✓ 전체 · ◐ 소속 프로젝트 한정/읽기 · – 불가
 */

import { Badge, Callout, Icon, Select } from "@/components/ctas/ctds";
import { Page, PageHeader, Panel, Row, Subtle } from "@/components/ctas/ui";
import { LABEL, type Role } from "@/lib/mock";
import { usePreview } from "@/lib/preview-state";
import styles from "../settings.module.css";

type Perm = "all" | "scoped" | "read" | "none";

const RESOURCES = ["프로젝트", "컨텍스트", "업무", "승인", "리스크", "산출물", "패턴 원본", "컴플라이언스"] as const;
const ROLES: Role[] = ["admin", "pm", "engineer", "viewer"];

const MATRIX: Record<Role, Perm[]> = {
  admin: ["all", "all", "all", "all", "all", "all", "all", "all"],
  pm: ["scoped", "scoped", "scoped", "scoped", "scoped", "scoped", "none", "read"],
  engineer: ["read", "scoped", "scoped", "read", "read", "scoped", "none", "none"],
  viewer: ["read", "read", "read", "none", "read", "read", "none", "none"],
};

const NOTE: Record<Role, string> = {
  admin: "전부. 패턴 원본 역추적, 컴플라이언스 편집.",
  pm: "소속 프로젝트의 운영·리스크·승인(customer_send 포함)·산출물.",
  engineer: "업무 실행, AgentRun, result 승인 요청. 고객 발송 승인은 불가.",
  viewer: "읽기 전용.",
};

function PermCell({ p }: { p: Perm }) {
  if (p === "all") return <Icon name="check-circle" size={16} className={styles.allow} aria-label="전체" />;
  if (p === "scoped") return <Icon name="check" size={16} className={styles.partial} aria-label="소속 프로젝트" />;
  if (p === "read") return <Icon name="eye" size={16} className={styles.deny} aria-label="읽기" />;
  return <Icon name="minus" size={16} className={styles.deny} aria-label="불가" />;
}

export default function RolesPage() {
  const { role, setRole } = usePreview();
  return (
    <Page wide>
      <PageHeader
        title="역할·권한"
        lead="역할 × 리소스 매트릭스. 모든 화면은 이 표를 가드로 씁니다. 상단 「역할로 보기」를 바꾸면 현재 행이 하이라이트됩니다."
      />
      <Panel flush>
        <table className={styles.matrix}>
          <thead>
            <tr>
              <th>역할</th>
              {RESOURCES.map((r) => (
                <th key={r}>{r}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ROLES.map((r) => (
              <tr key={r} data-current={r === role || undefined}>
                <td>
                  <Row tight>
                    <span>{LABEL.role[r]}</span>
                    {r === role && <Badge size="sm" variant="soft" status="info">현재</Badge>}
                  </Row>
                </td>
                {MATRIX[r].map((p, i) => (
                  <td key={i}>
                    <PermCell p={p} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
      <Row>
        <Subtle><Icon name="check-circle" size={12} /> 전체</Subtle>
        <Subtle><Icon name="check" size={12} /> 소속 프로젝트 한정</Subtle>
        <Subtle><Icon name="eye" size={12} /> 읽기</Subtle>
        <Subtle><Icon name="minus" size={12} /> 불가</Subtle>
      </Row>
      <Row>
        <Subtle>프리뷰 역할 전환 —</Subtle>
        <Select size="sm" width={160} value={role} onValueChange={(v) => setRole(v as Role)}>
          <Select.Trigger aria-label="프리뷰 역할" />
          <Select.Content>
            <Select.Item value="admin">관리자로 보기</Select.Item>
            <Select.Item value="pm">PM으로 보기</Select.Item>
            <Select.Item value="engineer">엔지니어로 보기</Select.Item>
            <Select.Item value="viewer">뷰어로 보기</Select.Item>
          </Select.Content>
        </Select>
        <Subtle>계약·문서 열람, 패턴 원본 추적 등 권한 가드를 시연합니다.</Subtle>
      </Row>
      <Callout tone="neutral" variant="outline" icon="info" title={`${LABEL.role[role]} — ${NOTE[role]}`}>
        고객 포털(추후)은 자기 고객사의 상태·공개 코멘트만 봅니다. diff·반려 사유·내부 코멘트는 노출되지 않습니다.
      </Callout>
    </Page>
  );
}
