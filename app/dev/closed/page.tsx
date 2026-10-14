"use client";

/**
 * 개발 › 종결 — 검증 완료·하지 않음 개발 항목. 행 클릭 → Drawer.
 */

import { useState } from "react";
import { TableHeader, TableRow } from "@/components/ctas/ctds";
import { Page, PageHeader, TableBox } from "@/components/ctas/ui";
import { DevDrawer } from "../_drawer";
import { type Task, type TaskState } from "@/lib/mock";
import { usePreview } from "@/lib/preview-state";
import { CountFilter, OPEN, ProjectSelect, devTasks, taskCell, taskColumns } from "../_shared";
import styles from "../dev.module.css";

export default function ClosedPage() {
  const { taskGroups } = usePreview();
  const [projectFilter, setProjectFilter] = useState<string | null>(null);
  const [state, setState] = useState<TaskState[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const base = devTasks().filter((t) => !OPEN(t) && (!projectFilter || t.projectId === projectFilter));
  const closed = base.filter((t) => state.length === 0 || state.includes(t.state));
  const openTask = openId ? closed.find((t) => t.id === openId) : undefined;

  return (
    <Page wide>
      <PageHeader title="종결" lead="검증이 끝났거나 하지 않기로 한 항목. 같은 증상이 다시 접수되면 재접수로 표시됩니다." />
      <div className={styles.filters}>
        <ProjectSelect value={projectFilter} onChange={setProjectFilter} />
        <span className={styles.vsep} />
        <CountFilter<TaskState>
          value={state}
          onChange={setState}
          options={[
            { id: "verified", label: "검증됨", count: base.filter((t) => t.state === "verified").length },
            { id: "done", label: "완료", count: base.filter((t) => t.state === "done").length },
            { id: "wont_do", label: "하지 않음", count: base.filter((t) => t.state === "wont_do").length },
          ]}
        />
      </div>
      <TableBox>
        <TableHeader columns={taskColumns} variant="line" />
        {closed.map((t) => (
          <TableRow<Task> key={t.id} variant="line" data={t} onClick={() => setOpenId(t.id)} columns={taskColumns.map((c) => ({ ...c, render: (d: Task) => taskCell(c.key, d) }))} />
        ))}
      </TableBox>
      {openTask && <DevDrawer task={openTask} group={taskGroups.find((g) => g.taskIds.includes(openTask.id))} onClose={() => setOpenId(null)} />}
    </Page>
  );
}
