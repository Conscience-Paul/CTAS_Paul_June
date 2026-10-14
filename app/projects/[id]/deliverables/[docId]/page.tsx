/** 정적 내보내기(Tauri)용 — 화면은 view.tsx. */
import { deliverables } from "@/lib/mock";
import View from "./view";

export const dynamicParams = false;
export function generateStaticParams() {
  return deliverables.map((d) => ({ id: d.projectId, docId: d.id }));
}
export default function Page() {
  return <View />;
}
