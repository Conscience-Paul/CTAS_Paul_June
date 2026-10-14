/** 정적 내보내기(Tauri)용 — 화면은 view.tsx. */
import { patterns } from "@/lib/mock";
import View from "./view";

export const dynamicParams = false;
export function generateStaticParams() {
  return patterns.map((p) => ({ id: p.id }));
}
export default function Page() {
  return <View />;
}
