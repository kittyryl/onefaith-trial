"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import PageLoader from "./PageLoader";

export default function ManagerOnlyRoute({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading, isManager } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    } else if (!loading && user && !isManager()) {
      router.push("/");
    }
  }, [user, loading, isManager, router]);

  if (loading) return <PageLoader />;

  if (!user || !isManager()) {
    return null;
  }

  return <>{children}</>;
}
