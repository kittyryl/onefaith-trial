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
  LuChartBar,
} from "react-icons/lu";
import { useAuth } from "@/contexts/AuthContext";

// Nav sections
const managementItems = [
  { name: "Dashboard", href: "/", icon: LuLayoutDashboard, roles: ["manager", "staff"] },
  { name: "Inventory", href: "/inventory", icon: LuBoxes, roles: ["manager", "staff"] },
  { name: "Sales", href: "/sales", icon: LuArmchair, roles: ["manager"] },
  { name: "Reports", href: "/reports", icon: LuChartBar, roles: ["manager"] },
  { name: "Carwash Services", href: "/carwash-services", icon: LuCar, roles: ["manager", "staff"] },
  { name: "Settings", href: "/settings", icon: LuSettings, roles: ["manager", "staff"] },
];

const posItems = [
  { name: "Coffee POS", href: "/coffee-pos", icon: LuCoffee },
  { name: "Carwash POS", href: "/carwash-pos", icon: LuCar },
];

export default function SidebarNav() {
  const pathname = usePathname();
  const { user } = useAuth();

  const linkClass = (active: boolean, accent?: "pos") =>
    `flex items-center gap-3 p-3 rounded-lg transition-colors ${
      active
        ? accent === "pos"
          ? "bg-amber-700 text-white shadow"
          : "bg-stone-700 text-white shadow"
        : "text-gray-300 hover:bg-stone-800 hover:text-white"
    }`;

  const isActive = (href: string) =>
    pathname === href || (href !== "/" && pathname.startsWith(href));

  // Filter management items based on user role
  const visibleManagementItems = managementItems.filter(
    (item) => !item.roles || item.roles.includes(user?.role || "staff")
  );

  return (
    <nav className="flex flex-col h-full">
      <div className="px-4 py-3">
        <p className="text-xs uppercase tracking-wider text-stone-400 mb-2">Management</p>
        <div className="space-y-2">
          {visibleManagementItems.map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href} className={linkClass(active)}>
                <Icon size={20} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </div>
      </div>

      <div className="px-4 py-3">
        <p className="text-xs uppercase tracking-wider text-stone-400 mb-2">POS</p>
        <div className="space-y-2">
          {posItems.map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href} className={linkClass(active, "pos")}>
                <Icon size={20} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Sidebar footer with logged in user info */}
      {user && (
        <div className="mt-auto px-4 pb-4 border-t border-stone-800 pt-4">
          <div className="px-3 py-2 rounded-lg bg-stone-800">
            <div className="text-white font-medium text-sm truncate">
              {user.fullName}
            </div>
            <div className="text-amber-500 text-xs uppercase tracking-wide font-semibold mt-0.5">
              {user.role}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
