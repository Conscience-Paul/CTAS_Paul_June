"use client";

/**
 * /approvals — 승인 목록은 홈(대시보드)으로 합쳤다. 예전 링크(?open=<id> 포함)를 홈으로 넘긴다.
 */

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function ApprovalsRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace(`/${window.location.search}`);
  }, [router]);
  return null;
}
