/**
 * 문서 드래그 상태 — dataTransfer 의 커스텀 MIME 을 못 읽는 WebView(WKWebView 등)를 위한 폴백.
 * 드래그 시작 시 id 를 기억하고, 드롭/종료 시 비운다.
 */
export const DOC_MIME = "application/x-ctas-doc";

let dragging: string | null = null;

export const startDocDrag = (id: string) => {
  dragging = id;
};
export const endDocDrag = () => {
  dragging = null;
};
export const draggedDoc = () => dragging;
