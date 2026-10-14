/** 정적 내보내기(Tauri)용 — 목데이터의 id 로 경로를 미리 생성. 화면은 view.tsx. */
import { projects } from "@/lib/mock";
import View from "./view";

export const dynamicParams = false;
export function generateStaticParams() {
  return projects.map((p) => ({ id: p.id }));
}
export default function Page() {
  return <View />;
}
