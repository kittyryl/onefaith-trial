"use client";

import { usePathname } from "next/navigation";
import AppShell from "./AppShell";
import ShiftBanner from "./ShiftBanner";

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

  // Show AppShell with sidebar and ShiftBanner for all other pages
  return (
    <>
      <ShiftBanner />
      <AppShell>{children}</AppShell>
    </>
  );
}
