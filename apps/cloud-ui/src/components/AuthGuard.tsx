"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { isAuthenticated } from "@/lib/api";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  useEffect(() => {
    if (!isAuthenticated()) router.replace("/login");
  }, [router]);
  return <>{children}</>;
}
