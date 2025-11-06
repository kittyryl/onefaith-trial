"use client";

import { useEffect, useState } from "react";
import SidebarNav from "./SidebarNav";
import { LuMenu, LuX, LuLogOut } from "react-icons/lu";
import { useAuth } from "@/contexts/AuthContext";

interface AppShellProps {
  children: React.ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  const [open, setOpen] = useState(false);
  const { logout, user } = useAuth();

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
    <div className="relative min-h-screen bg-gray-100">
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

      {/* Top bar for mobile/tablet with hamburger and logout */}
      <header className="sticky top-0 z-20 flex items-center gap-3 bg-white border-b border-gray-200 px-4 py-3 xl:hidden">
        <button
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? "Close sidebar" : "Open sidebar"}
          className="p-2 rounded-md border border-gray-300 hover:bg-gray-100"
        >
          {open ? <LuX size={20} /> : <LuMenu size={20} />}
        </button>
        <span className="font-semibold">OneFaith POS</span>
        <div className="ml-auto flex items-center gap-3">
          {user && (
            <button
              onClick={logout}
              className="px-3 py-2 text-sm rounded-md border border-gray-300 hover:bg-red-50 hover:border-red-300 text-gray-700 flex items-center gap-2"
              title="Logout"
            >
              <LuLogOut size={16} />
              <span className="hidden sm:inline">Logout</span>
            </button>
          )}
        </div>
      </header>

      {/* Top bar for desktop with logout (sidebar remains on left) */}
      <header className="hidden xl:flex sticky top-0 z-20 items-center bg-white border-b border-gray-200 px-6 py-3">
        <div className="ml-auto flex items-center gap-3">
          {user && (
            <button
              onClick={logout}
              className="px-3 py-2 text-sm rounded-md border border-gray-300 hover:bg-red-50 hover:border-red-300 text-gray-700 flex items-center gap-2"
              title="Logout"
            >
              <LuLogOut size={16} />
              <span>Logout</span>
            </button>
          )}
        </div>
      </header>

      {/* Main content: add left padding on lg to account for fixed sidebar */}
      <main className="xl:pl-64 min-h-screen">
        {/* Spacer for header so content doesn’t hide under it */}
        <div className="h-[52px]" />
        {children}
      </main>
    </div>
  );
}
