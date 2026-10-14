/** 정적 내보내기(Tauri)용 — 화면은 view.tsx. 부모 세그먼트(id)까지 함께 생성. */
import { contextItems } from "@/lib/mock";
import View from "./view";

export const dynamicParams = false;
export function generateStaticParams() {
  return contextItems.map((c) => ({ id: c.projectId, itemId: c.id }));
}
export default function Page() {
  return <View />;
}
