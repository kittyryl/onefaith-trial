"use client";

import { useEffect, useState } from "react";
import SidebarNav from "./SidebarNav";
import { LuMenu, LuX } from "react-icons/lu";

interface AppShellProps {
  children: React.ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  const [open, setOpen] = useState(false);

  // Ensure sidebar is always open on extra-large screens; close on smaller when resizing
  useEffect(() => {
    const onResize = () => {
      // Use 1280px (Tailwind xl) so tablets (~1024px) stay collapsible
      if (window.innerWidth >= 1280) {
        setOpen(true);
      } else {
        setOpen(false);
      }
    };
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return (
    <div className="relative min-h-screen bg-linear-to-br from-gray-50 to-gray-100">
      {/* Sidebar for mobile/tablet: off-canvas; for lg+: fixed visible */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-stone-900 text-white transform transition-transform duration-200 xl:translate-x-0 xl:fixed xl:block flex flex-col overflow-hidden ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
        // Important: avoid reading window during render to prevent SSR hydration mismatches
        aria-hidden={!open}
      >
        <div className="p-6 text-2xl font-bold border-b border-stone-800">
          OneFaith
        </div>
        {/* Nav area with all items including Settings */}
        <div className="flex-1 overflow-y-auto">
          <SidebarNav />
        </div>
      </aside>

      {/* Backdrop on mobile/tablet when sidebar is open */}
      {open && (
        <button
          aria-label="Close sidebar backdrop"
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-30 bg-black/40 xl:hidden"
        />
      )}

      {/* Top bar for mobile/tablet with hamburger */}
      <header className="sticky top-0 z-20 flex items-center gap-3 bg-white border-b border-gray-200 px-4 py-3 xl:hidden">
        <button
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? "Close sidebar" : "Open sidebar"}
          className="p-2 rounded-md border border-gray-300 hover:bg-gray-100"
        >
          {open ? <LuX size={20} /> : <LuMenu size={20} />}
        </button>
        <span className="font-semibold">OneFaith POS</span>
      </header>

      {/* Main content: add left padding on lg to account for fixed sidebar */}
      <main className="xl:pl-64 min-h-screen">
        {children}
      </main>
    </div>
  );
}
