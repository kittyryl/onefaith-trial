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
  { name: "Settings", href: "/settings", icon: LuSettings },
];

export default function SidebarNav() {
  const pathname = usePathname(); // <-- Gets the current path (e.g., "/coffee-pos")

  return (
    <nav className="px-4 space-y-2">
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
    </nav>
  );
}
