"use client";

import { usePathname } from "next/navigation";
import AppShell from "./AppShell";

export default function LayoutContent({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isLoginPage = pathname === "/login";

  // Show children without AppShell on login page
  if (isLoginPage) {
    return <>{children}</>;
  }

  // Show AppShell with sidebar for all other pages
  return <AppShell>{children}</AppShell>;
}
