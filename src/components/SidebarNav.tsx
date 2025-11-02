// components/SidebarNav.tsx
"use client"; // <-- MUST be a client component

import Link from "next/link";
import { usePathname } from "next/navigation"; // <-- New hook
import {
  LuLayoutDashboard,
  LuBoxes,
  LuArmchair,
  LuCar,
  LuCoffee,
  LuSettings,
} from "react-icons/lu";

// Define all our navigation items
const navItems = [
  { name: "Dashboard", href: "/", icon: LuLayoutDashboard },
  { name: "Inventory", href: "/inventory", icon: LuBoxes },
  { name: "Sales", href: "/sales", icon: LuArmchair },
  { name: "Carwash Services", href: "/carwash-services", icon: LuCar },
  { name: "Coffee POS", href: "/coffee-pos", icon: LuCoffee, isPos: true },
  { name: "Carwash POS", href: "/carwash-pos", icon: LuCar, isPos: true },
];

export default function SidebarNav() {
  const pathname = usePathname(); // <-- Gets the current path (e.g., "/coffee-pos")

  return (
    <>
      <nav className="flex-1 px-4 space-y-2">
        {navItems.map((item) => {
          // Check if the current pathname matches the item's href
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                isActive
                  ? item.isPos // POS links use blue, others use dark gray
                    ? "bg-blue-600 text-white"
                    : "bg-gray-700 text-white"
                  : "hover:bg-gray-700 text-gray-300"
              }`}
            >
              <Icon size={20} />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* Settings link (kept separate as it's at the bottom) */}
      <div className="p-4 border-t border-gray-700">
        <Link
          href="/settings"
          className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
            pathname === "/settings"
              ? "bg-gray-700 text-white"
              : "hover:bg-gray-700 text-gray-300"
          }`}
        >
          <LuSettings size={20} />
          <span>Settings</span>
        </Link>
      </div>
    </>
  );
}
