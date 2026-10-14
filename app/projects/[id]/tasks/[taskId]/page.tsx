/** 정적 내보내기(Tauri)용 — 화면은 view.tsx. */
import { tasks } from "@/lib/mock";
import View from "./view";

export const dynamicParams = false;
export function generateStaticParams() {
  return tasks.map((t) => ({ id: t.projectId, taskId: t.id }));
}
export default function Page() {
  return <View />;
}
