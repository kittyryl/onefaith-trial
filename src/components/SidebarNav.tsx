// Sidebar navigation
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LuLayoutDashboard,
  LuBoxes,
  LuArmchair,
  LuCar,
  LuCoffee,
  LuSettings,
  LuLogOut,
} from "react-icons/lu";
import { useAuth } from "@/contexts/AuthContext";

// Nav items
const navItems = [
  { name: "Dashboard", href: "/", icon: LuLayoutDashboard },
  { name: "Inventory", href: "/inventory", icon: LuBoxes },
  { name: "Sales", href: "/sales", icon: LuArmchair },
  { name: "Carwash Services", href: "/carwash-services", icon: LuCar },
  { name: "Coffee POS", href: "/coffee-pos", icon: LuCoffee, isPos: true },
  { name: "Carwash POS", href: "/carwash-pos", icon: LuCar, isPos: true },
  { name: "Settings", href: "/settings", icon: LuSettings },
];

export default function SidebarNav() {
  const pathname = usePathname();
  const { logout, user } = useAuth();

  return (
    <nav className="flex flex-col h-full">
      <div className="px-4 space-y-2 flex-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                isActive
                  ? item.isPos // POS links get the Coffee Brown accent
                    ? "bg-amber-900 text-white"
                    : "bg-gray-700 text-white" // Admin links use a neutral dark gray
                  : "hover:bg-amber-900 hover:text-white text-gray-300" // Hover is Coffee Brown
              }`}
            >
              <Icon size={20} />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </div>

      {/* Logout section */}
      {user && (
        <div className="px-4 pb-4 border-t border-stone-800 pt-4">
          <div className="text-gray-400 text-sm mb-2 px-3">
            Logged in as: <span className="text-white">{user.fullName}</span>
            <br />
            <span className="text-amber-600">({user.role})</span>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-3 p-3 rounded-lg transition-colors w-full hover:bg-red-900 hover:text-white text-gray-300"
          >
            <LuLogOut size={20} />
            <span>Logout</span>
          </button>
        </div>
      )}
    </nav>
  );
}
