"use client";

import { Badge, Button, Icon, useToast } from "@/components/ctas/ctds";
import { Grid, Muted, Page, PageHeader, Panel, Row, Stack, Subtle } from "@/components/ctas/ui";
import { LABEL, templates } from "@/lib/mock";
import styles from "../knowledge.module.css";

export default function TemplatesPage() {
  const { toast } = useToast();
  return (
    <Page wide>
      <PageHeader
        title="템플릿"
        lead="산출물 생성의 틀. 교차 프로젝트 자산이며, 프로젝트 안에서 「산출물 생성」할 때 선택합니다."
        actions={<Button size="sm" variant="primary" leftIcon={<Icon name="plus" />} onClick={() => toast({ title: "새 템플릿 (프리뷰)" })}>새 템플릿</Button>}
      />
      <Grid cols={3}>
        {templates.map((t) => (
          <Panel key={t.id}>
            <Row tight>
              <Badge size="sm" variant="soft">{LABEL.deliverableKind[t.kind]}</Badge>
              <Subtle>사용 {t.usedCount}회</Subtle>
            </Row>
            <div className={styles.cardTitle}>{t.name}</div>
            <Muted>{t.description}</Muted>
            <Stack tight>
              {t.sections.map((s, i) => (
                <Row key={s} tight>
                  <Subtle style={{ fontFamily: "var(--font-mono)" }}>{String(i + 1).padStart(2, "0")}</Subtle>
                  <span style={{ fontSize: "var(--text-sm)" }}>{s}</span>
                </Row>
              ))}
            </Stack>
            <div className={styles.cardFoot}>
              <Button size="xs" variant="outline" leftIcon={<Icon name="clipboard-text" />} onClick={() => toast({ title: `${t.name} 으로 생성 (프리뷰)`, description: "프로젝트 › 산출물에서 근거를 골라 생성합니다." })}>
                이 템플릿으로 생성
              </Button>
            </div>
          </Panel>
        ))}
      </Grid>
    </Page>
  );
}
