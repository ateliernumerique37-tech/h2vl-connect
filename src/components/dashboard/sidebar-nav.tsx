"use client"

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, Shield, User, Users } from "lucide-react";
import {
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
} from "@/components/ui/sidebar";
import { Logo } from "@/components/icons";
import { Button } from "../ui/button";

const menuItems = [
  {
    href: "/dashboard/events",
    icon: CalendarDays,
    label: "Événements",
  },
  {
    href: "/dashboard/profile",
    icon: User,
    label: "Mon Profil",
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
        <div className="flex items-center gap-2">
          <Logo className="size-8 text-sidebar-foreground" />
          <span className="text-lg font-semibold text-sidebar-foreground">
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
                isActive={pathname.startsWith(item.href)}
                tooltip={{
                  children: item.label,
                  "aria-label": item.label,
                }}
                aria-label={item.label}
              >
                <Link href={item.href}>
                  <item.icon />
                  <span>{item.label}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter>
         {/* Could be a user profile link or logout */}
      </SidebarFooter>
    </>
  );
}
