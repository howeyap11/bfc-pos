"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { isAuthenticated } from "@/lib/api";

export default function RootPage() {
  const router = useRouter();
  useEffect(() => {
    if (isAuthenticated()) router.replace("/menu");
    else router.replace("/login");
  }, [router]);
  return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-gray-500">Redirecting…</p>
    </div>
  );
}
