"use client";

/**
 * 접수 폼 — orbit bug-intake-panel 을 본뜸.
 * 종류(버그/신규 기능/변경 요청)에 따라 시나리오 필드가 바뀌고, 제출하면 개발 목록에
 * state=new 로 들어가 Nora 군집 판정(목)을 거친다. 프리뷰: 세션 동안만 남는다.
 */

import { useState } from "react";
import { Button, Callout, Checkbox, Drawer, Icon, Input, Select, Textarea, useToast } from "@/components/ctas/ctds";
import { Panel, Row, Section, Stack, Subtle } from "@/components/ctas/ui";
import { byProject, projects, type Severity, type Task, type TaskKind } from "@/lib/mock";
import { usePreview } from "@/lib/preview-state";
import styles from "./dev.module.css";

type Kind = Extract<TaskKind, "bug" | "feature" | "change_request">;
type ScenarioKey = "where" | "repro" | "result" | "clue";
interface Field { key: ScenarioKey; label: string; line: string; hint: string; placeholder: string; required: boolean; rows?: number }

const FIELDS: Record<Kind, Field[]> = {
  bug: [
    { key: "where", label: "어디서", line: "어디서", hint: "화면 · 메뉴 · 기능", placeholder: "예: 재고 조회 화면 센터 필터", required: false },
    { key: "repro", label: "재현 방법", line: "재현", hint: "어떤 설정 · 입력으로 무엇을 실행했나", placeholder: "예: 센터 12개 전체 선택 후 SKU 검색", required: true, rows: 2 },
    { key: "result", label: "실제 결과", line: "결과", hint: "오류 문구는 그대로 복사. 잘못 성공한 것도 결과", placeholder: "예: 4초 이상 응답 없음 후 타임아웃", required: true, rows: 3 },
    { key: "clue", label: "단서", line: "단서", hint: "되는 경우와 비교 · 언제부터 · 짐작 가는 원인", placeholder: "예: 센터 1개만 고르면 정상. 10/8 배포 이후", required: false, rows: 2 },
  ],
  feature: [
    { key: "where", label: "어디에", line: "어디에", hint: "화면 · 메뉴", placeholder: "예: 입고 화면", required: false },
    { key: "repro", label: "무엇이 필요한가", line: "필요", hint: "", placeholder: "예: 바코드 스캔으로 SKU 자동 입력", required: true, rows: 2 },
    { key: "result", label: "왜 필요한가", line: "이유", hint: "지금은 어떻게 하고 있나", placeholder: "예: 작업자가 SKU 를 손으로 입력해 오타가 잦다", required: false, rows: 3 },
    { key: "clue", label: "참고", line: "참고", hint: "비슷한 기능 · 바라는 모양", placeholder: "예: 재고 조회의 스캔 버튼과 같은 모양", required: false, rows: 2 },
  ],
  change_request: [
    { key: "where", label: "어디를", line: "어디를", hint: "변경 대상 화면 · 기능", placeholder: "예: 조회 화면 필터 결과", required: false },
    { key: "repro", label: "무엇을 바꾸나", line: "변경", hint: "", placeholder: "예: 엑셀 내보내기 버튼 추가", required: true, rows: 2 },
    { key: "result", label: "왜 바꾸나", line: "이유", hint: "계약 범위와의 관계", placeholder: "예: 센터별 월말 보고에 필요. 요구사항에는 없음", required: false, rows: 3 },
    { key: "clue", label: "참고", line: "참고", hint: "", placeholder: "", required: false, rows: 2 },
  ],
};

const KIND_LABEL: Record<Kind, string> = { bug: "버그", feature: "신규 기능", change_request: "변경 요청" };
const ENVS = ["운영", "스테이징", "개발"];
const SEV: { id: Severity; label: string }[] = [
  { id: "critical", label: "치명 — 서비스 중단·데이터 손상" },
  { id: "high", label: "높음 — 주요 기능 불가" },
  { id: "medium", label: "보통 — 우회 가능" },
  { id: "low", label: "낮음 — 사소" },
];

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9가-힣]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 32);

export function IntakeDrawer({ onClose, defaultProjectId }: { onClose: () => void; defaultProjectId?: string }) {
  const { toast } = useToast();
  const { addTask } = usePreview();
  const [kind, setKind] = useState<Kind>("bug");
  const [projectId, setProjectId] = useState(defaultProjectId ?? projects[0].id);
  const [title, setTitle] = useState("");
  const [env, setEnv] = useState("운영");
  const [severity, setSeverity] = useState<Severity>("medium");
  const [priority, setPriority] = useState<"1" | "2" | "3">("2");
  const [reporter, setReporter] = useState<"external" | "internal">("external");
  const [scenario, setScenario] = useState<Record<ScenarioKey, string>>({ where: "", repro: "", result: "", clue: "" });
  const [contextIds, setContextIds] = useState<Record<string, boolean>>({});
  const [agent, setAgent] = useState(true);

  const fields = FIELDS[kind];
  const valid = title.trim().length > 0 && fields.every((f) => !f.required || scenario[f.key].trim().length > 0);
  const ctx = byProject.context(projectId).filter((c) => c.kind === "requirement" || c.kind === "decision" || c.kind === "customer_doc");

  const submit = () => {
    const lines = fields.map((f) => ({ label: f.line, text: scenario[f.key].trim() })).filter((l) => l.text).map((l) => `${l.label}: ${l.text}`);
    const picked = Object.keys(contextIds).filter((id) => contextIds[id]);
    const id = `t-new-${Date.now().toString(36)}`;
    const task: Task = {
      id,
      projectId,
      title: title.trim(),
      kind,
      state: "new",
      scope: kind === "change_request" ? "unclear" : "in",
      ownerId: "m-junho",
      severity,
      priority: Number(priority) as 1 | 2 | 3,
      createdAt: "2026-10-14",
      reporter,
      dedupKey: slug(title),
      description: `${lines.join("\n")}${kind === "bug" ? `\n환경: ${env}` : ""}`,
      preflight: [
        picked.length > 0
          ? { id: "pf1", label: "근거 연결", status: "pass", detail: `${picked.length}건`, evidenceId: picked[0] }
          : { id: "pf1", label: "근거 연결", status: "warn", detail: "관련 요구사항·결정을 연결하면 에이전트가 범위를 판단합니다" },
        kind === "change_request"
          ? { id: "pf2", label: "범위 판정", status: "warn", detail: "계약 범위 밖 가능성 — CR 전환 검토" }
          : { id: "pf2", label: "범위 판정", status: "pass", detail: "범위 내" },
      ],
      contextIds: picked,
      timeline: [
        { at: "2026-10-14", who: reporter === "external" ? "고객 포털" : "김서연", text: "접수", kind: "create" },
        { at: "2026-10-14", who: "Nora", text: agent ? "군집 판정 — 유사 사례 없음 → 신규. 분류(사람) 대기" : "에이전트 미배정 — 수동 처리", kind: "triage" },
      ],
    };
    addTask(task);
    toast({ title: "접수됨", description: agent ? "Nora 가 군집 판정을 마쳤습니다. 분류 승인 후 에이전트가 착수합니다." : "수동 처리 항목으로 등록됐습니다.", tone: "success" });
    onClose();
  };

  return (
    <Drawer
      open
      onOpenChange={(o) => !o && onClose()}
      size="lg"
      title="접수"
      description={<Subtle>리포터: {reporter === "external" ? "고객 포털" : "김서연 (내부)"} · 접수 후 Nora 가 유사 사례와 대조해 합류/신규를 판정합니다</Subtle>}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>취소</Button>
          <Button variant="primary" leftIcon={<Icon name="check" />} disabled={!valid} onClick={submit}>접수</Button>
        </>
      }
    >
      <div className={styles.intake}>
        <Input
          size="md"
          label={kind === "bug" ? "무엇이 잘못됐나요?" : kind === "feature" ? "무엇이 필요한가요?" : "무엇을 바꾸나요?"}
          placeholder={kind === "bug" ? "예: 센터 전체 조회 시 4초 이상 걸림" : kind === "feature" ? "예: 입고 화면 바코드 스캔" : "예: 조회 결과 엑셀 내보내기"}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />

        <div className={styles.intakeGrid}>
          <Select size="sm" label="프로젝트" value={projectId} onValueChange={setProjectId}>
            <Select.Trigger />
            <Select.Content>
              {projects.map((p) => <Select.Item key={p.id} value={p.id}>{p.name}</Select.Item>)}
            </Select.Content>
          </Select>
          <Select size="sm" label="종류" value={kind} onValueChange={(v) => setKind(v as Kind)}>
            <Select.Trigger />
            <Select.Content>
              {(Object.keys(KIND_LABEL) as Kind[]).map((k) => <Select.Item key={k} value={k}>{KIND_LABEL[k]}</Select.Item>)}
            </Select.Content>
          </Select>
          {kind === "bug" && (
            <Select size="sm" label="환경" description="어디서 돌리다 났나요" value={env} onValueChange={setEnv}>
              <Select.Trigger />
              <Select.Content>
                {ENVS.map((e) => <Select.Item key={e} value={e}>{e}</Select.Item>)}
              </Select.Content>
            </Select>
          )}
          <Select size="sm" label="심각도" description="모르면 그대로 두세요" value={severity} onValueChange={(v) => setSeverity(v as Severity)}>
            <Select.Trigger />
            <Select.Content>
              {SEV.map((s) => <Select.Item key={s.id} value={s.id}>{s.label}</Select.Item>)}
            </Select.Content>
          </Select>
          <Select size="sm" label="우선순위" value={priority} onValueChange={(v) => setPriority(v as "1" | "2" | "3")}>
            <Select.Trigger />
            <Select.Content>
              <Select.Item value="1">P1 — 이번 주</Select.Item>
              <Select.Item value="2">P2 — 다음 배포</Select.Item>
              <Select.Item value="3">P3 — 여유 있을 때</Select.Item>
            </Select.Content>
          </Select>
          <Select size="sm" label="접수 경로" value={reporter} onValueChange={(v) => setReporter(v as "external" | "internal")}>
            <Select.Trigger />
            <Select.Content>
              <Select.Item value="external">고객 포털</Select.Item>
              <Select.Item value="internal">내부</Select.Item>
            </Select.Content>
          </Select>
        </div>

        <Section title={kind === "bug" ? "상황" : "내용"} icon="article">
          <Stack>
            {fields.map((f) => (
              <Textarea
                key={f.key}
                size="sm"
                label={<>{f.label}{f.required && <span aria-hidden> *</span>}</>}
                description={f.hint || undefined}
                placeholder={f.placeholder}
                value={scenario[f.key]}
                onChange={(e) => setScenario((s) => ({ ...s, [f.key]: e.target.value }))}
                autoResize
                minRows={f.rows ?? 1}
                maxRows={8}
              />
            ))}
          </Stack>
        </Section>

        <Section title="첨부 이미지" icon="camera">
          <Panel subtle>
            <Row tight><Icon name="upload-simple" size={16} /><Subtle>여기에 끌어다 놓거나 클릭해서 올리세요 (프리뷰 — 업로드 없음)</Subtle></Row>
          </Panel>
        </Section>

        {ctx.length > 0 && (
          <Section title="관련 컨텍스트" icon="path" hint="연결하면 에이전트가 범위·근거를 바로 봅니다">
            <Panel>
              <Stack tight>
                {ctx.map((c) => (
                  <Checkbox key={c.id} checked={!!contextIds[c.id]} onChange={(e) => setContextIds((m) => ({ ...m, [c.id]: e.target.checked }))}>{c.title}</Checkbox>
                ))}
              </Stack>
            </Panel>
          </Section>
        )}

        <Callout tone={agent ? "brand" : "neutral"} variant="outline" icon="waveform" title="Nora 에이전트" actions={<Checkbox checked={agent} onChange={(e) => setAgent(e.target.checked)}>에이전트에게 맡기기</Checkbox>} actionsPlacement="right">
          접수 즉시 유사 사례와 대조(군집 판정)하고, 분류가 승인되면 수정에 착수합니다. 사람은 분류 · 결과 승인 · 고객 발송만 결정합니다.
        </Callout>
      </div>
    </Drawer>
  );
}
