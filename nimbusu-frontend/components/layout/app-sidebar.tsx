"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import {
    BookOpen,
    Calendar,
    ClipboardList,
    FileText,
    GraduationCap,
    Home,
    LayoutDashboard,
    LogOut,
    Mail,
    Bell,
    Moon,
    Sun,
    Shield,
    Users,
    Building2,
    BookMarked,
    BarChart3,
    ScrollText,
    Settings,
    Library,
} from "lucide-react";
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarSeparator,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";

/* ─── Navigation items per role ───────────────────────────────────── */

const adminNav = [
    { title: "Dashboard", url: "/admin/dashboard", icon: LayoutDashboard },
    { title: "Users", url: "/admin/users", icon: Users },
    { title: "Schools", url: "/admin/schools", icon: Library },
    { title: "Departments", url: "/admin/departments", icon: Building2 },
    { title: "Academics", url: "/admin/academics", icon: GraduationCap },
    { title: "Timetable", url: "/admin/timetable", icon: Calendar },
    { title: "Content", url: "/admin/content", icon: FileText },
    { title: "Announcements", url: "/admin/announcements", icon: Bell },
    { title: "Audit Logs", url: "/admin/audit-logs", icon: ScrollText },
    { title: "Notifications", url: "/admin/notifications", icon: BarChart3 },
];

const facultyNav = [
    { title: "Dashboard", url: "/faculty/dashboard", icon: LayoutDashboard },
    { title: "My Courses", url: "/faculty/courses", icon: BookOpen },
    { title: "Timetable", url: "/faculty/timetable", icon: Calendar },
    { title: "Messages", url: "/faculty/messages", icon: Mail },
    { title: "Announcements", url: "/faculty/announcements", icon: Bell },
];

const studentNav = [
    { title: "Dashboard", url: "/student/dashboard", icon: LayoutDashboard },
    { title: "My Courses", url: "/student/courses", icon: BookOpen },
    { title: "Content", url: "/student/content", icon: FileText },
    { title: "Bookmarks", url: "/student/bookmarks", icon: BookMarked },
    { title: "Assignments", url: "/student/assignments", icon: ClipboardList },
    { title: "Timetable", url: "/student/timetable", icon: Calendar },
    { title: "Attendance", url: "/student/attendance", icon: ScrollText },
    { title: "Messages", url: "/student/messages", icon: Mail },
    { title: "Notifications", url: "/student/notifications", icon: Bell },
];

function getNavItems(role?: string) {
    switch (role) {
        case "admin":
            return adminNav;
        case "faculty":
            return facultyNav;
        case "student":
            return studentNav;
        default:
            return [];
    }
}

function getRoleLabel(role?: string) {
    switch (role) {
        case "admin":
            return "Administration";
        case "faculty":
            return "Faculty Portal";
        case "student":
            return "Student Portal";
        default:
            return "Menu";
    }
}

/* ─── Component ───────────────────────────────────────────────────── */

export function AppSidebar() {
    const pathname = usePathname();
    const { user, logout } = useAuth();
    const { theme, setTheme } = useTheme();
    const navItems = getNavItems(user?.role);
    const [mounted, setMounted] = useState(false);
    useEffect(() => {
        const timer = setTimeout(() => setMounted(true), 0);
        return () => clearTimeout(timer);
    }, []);

    return (
        <Sidebar collapsible="icon">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href="/">
                                <div
                                    className="flex aspect-square size-8 items-center justify-center rounded-md"
                                    style={{
                                        background: "var(--primary)",
                                        borderRadius: "calc(var(--radius) - 2px)",
                                    }}
                                >
                                    <GraduationCap
                                        className="size-4 shrink-0"
                                        style={{ color: "var(--primary-foreground)" }}
                                    />
                                </div>
                                <span className="truncate font-bold text-lg">NimbusU</span>
                            </Link>
                        </SidebarMenuButton>

                    </SidebarMenuItem>
                </SidebarMenu>

            </SidebarHeader>

            <SidebarContent>
                <SidebarGroup>
                    <SidebarGroupLabel>{getRoleLabel(user?.role)}</SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {navItems.map((item) => (
                                <SidebarMenuItem key={item.url}>
                                    <SidebarMenuButton
                                        asChild
                                        isActive={pathname === item.url}
                                        tooltip={item.title}
                                    >
                                        <Link href={item.url}>
                                            <item.icon className="h-4 w-4" />
                                            <span>{item.title}</span>
                                        </Link>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            ))}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
            </SidebarContent>

            <SidebarFooter>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton asChild tooltip="Settings">
                            <Link href="/settings">
                                <Settings className="h-4 w-4" />
                                <span>Settings</span>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                        <SidebarMenuButton
                            tooltip={
                                mounted
                                    ? theme === "dark"
                                        ? "Light mode"
                                        : "Dark mode"
                                    : "Toggle theme"
                            }
                            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                        >
                            {mounted ? (
                                theme === "dark" ? (
                                    <Sun className="h-4 w-4" />
                                ) : (
                                    <Moon className="h-4 w-4" />
                                )
                            ) : (
                                <Sun className="h-4 w-4" />
                            )}
                            <span>
                                {mounted
                                    ? theme === "dark"
                                        ? "Light Mode"
                                        : "Dark Mode"
                                    : "Toggle Theme"}
                            </span>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                        <SidebarMenuButton
                            tooltip="Logout"
                            onClick={logout}
                            className="text-destructive hover:text-destructive"
                        >
                            <LogOut className="h-4 w-4" />
                            <span>Logout</span>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarFooter>
        </Sidebar>
    );
}
