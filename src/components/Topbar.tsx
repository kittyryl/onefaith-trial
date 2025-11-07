"use client";

import { LuMenu, LuLogOut, LuSearch } from "react-icons/lu";
import { useAuth } from "@/contexts/AuthContext";

interface TopbarProps {
  onToggleSidebar?: () => void;
  showHamburger?: boolean;
}

export default function Topbar({
  onToggleSidebar,
  showHamburger,
}: TopbarProps) {
  const { user, logout } = useAuth();

  return (
    <header className="sticky top-0 z-20 flex items-center gap-3 bg-white/90 backdrop-blur border-b border-gray-200 px-4 py-3">
      {showHamburger && (
        <button
          onClick={onToggleSidebar}
          aria-label="Toggle sidebar"
          className="p-2 rounded-md border border-gray-300 hover:bg-gray-100"
        >
          <LuMenu size={20} />
        </button>
      )}

      {/* Search */}
      <div className="flex-1 hidden md:flex items-center">
        <div className="relative w-full max-w-md">
          <LuSearch
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            className="w-full pl-9 pr-3 py-2 rounded-md border border-gray-300 focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            placeholder="Search (coming soon)"
            disabled
          />
        </div>
      </div>

      {/* User chip */}
      {user && (
        <div className="ml-auto flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <div className="text-sm font-medium text-gray-800 leading-tight">
              {user.fullName}
            </div>
            <div className="text-xs text-gray-500">{user.role}</div>
          </div>
          <button
            onClick={logout}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm rounded-md border border-gray-300 hover:bg-gray-100"
            title="Logout"
          >
            <LuLogOut size={18} />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      )}
    </header>
  );
}
