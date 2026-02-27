"use client"

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, BarChart2, CalendarDays, Shield, Users } from "lucide-react";
import {
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarContent,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Logo } from "@/components/icons";

const menuItems = [
  {
    href: "/dashboard",
    icon: LayoutDashboard,
    label: "Tableau de bord",
    exact: true,
    accessKey: "1",
  },
  {
    href: "/dashboard/events",
    icon: CalendarDays,
    label: "Événements",
    accessKey: "2",
  },
  {
    href: "/dashboard/adherents",
    icon: Users,
    label: "Adhérents",
    accessKey: "3",
  },
  {
    href: "/dashboard/stats",
    icon: BarChart2,
    label: "Statistiques",
  },
  {
    href: "/dashboard/admin",
    icon: Shield,
    label: "Admin",
  },
];

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <>
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-4">
          <Logo className="size-8 text-primary" />
          <span className="text-xl font-bold text-primary tracking-tight">
            H2vl Connect
          </span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          {menuItems.map((item) => (
            <SidebarMenuItem key={item.href}>
              <SidebarMenuButton
                asChild
                isActive={item.exact ? pathname === item.href : pathname.startsWith(item.href)}
                tooltip={{
                  children: item.label,
                  "aria-label": item.label,
                }}
                aria-label={item.accessKey ? `${item.label}, raccourci Alt + ${item.accessKey}` : item.label}
                className="focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
              >
                <Link href={item.href} accessKey={item.accessKey}>
                  <item.icon className="size-5" />
                  <span className="font-medium">{item.label}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter>
         {/* Espace réservé pour d'éventuels liens de profil ou paramètres */}
      </SidebarFooter>
    </>
  );
}
