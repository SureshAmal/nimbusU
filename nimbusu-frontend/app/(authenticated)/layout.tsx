"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { AppHeader } from "@/components/layout/app-header";
import {
    SearchableContextMenu,
    type ContextMenuGroup,
} from "@/components/ui/searchable-context-menu";
import { useAuth } from "@/lib/auth";
import {
    LayoutDashboard,
    BookOpen,
    Calendar,
    FileText,
    Users,
    Settings,
    Moon,
    Sun,
    LogOut,
    Bell,
    Mail,
    ClipboardList,
    Building2,
    ScrollText,
    BookMarked,
} from "lucide-react";

function useContextMenuGroups(): ContextMenuGroup[] {
    const { user, logout } = useAuth();
    const { theme, setTheme } = useTheme();
    const router = useRouter();
    const [mounted, setMounted] = useState(false);
    useEffect(() => {
        const timer = setTimeout(() => setMounted(true), 0);
        return () => clearTimeout(timer);
    }, []);
    const go = (url: string) => () => router.push(url);

    const navItems: ContextMenuGroup = {
        label: "Navigation",
        items: [],
    };

    if (user?.role === "admin") {
        navItems.items = [
            { label: "Dashboard", icon: <LayoutDashboard className="h-4 w-4" />, onClick: go("/admin/dashboard"), shortcut: "⌘D" },
            { label: "Users", icon: <Users className="h-4 w-4" />, onClick: go("/admin/users") },
            { label: "Departments", icon: <Building2 className="h-4 w-4" />, onClick: go("/admin/departments") },
            { label: "Academics", icon: <BookOpen className="h-4 w-4" />, onClick: go("/admin/academics") },
            { label: "Timetable", icon: <Calendar className="h-4 w-4" />, onClick: go("/admin/timetable") },
            { label: "Announcements", icon: <Bell className="h-4 w-4" />, onClick: go("/admin/announcements") },
        ];
    } else if (user?.role === "faculty") {
        navItems.items = [
            { label: "Dashboard", icon: <LayoutDashboard className="h-4 w-4" />, onClick: go("/faculty/dashboard"), shortcut: "⌘D" },
            { label: "My Courses", icon: <BookOpen className="h-4 w-4" />, onClick: go("/faculty/courses") },
            { label: "Timetable", icon: <Calendar className="h-4 w-4" />, onClick: go("/faculty/timetable") },
            { label: "Messages", icon: <Mail className="h-4 w-4" />, onClick: go("/faculty/messages") },
        ];
    } else {
        navItems.items = [
            { label: "Dashboard", icon: <LayoutDashboard className="h-4 w-4" />, onClick: go("/student/dashboard"), shortcut: "⌘D" },
            { label: "My Courses", icon: <BookOpen className="h-4 w-4" />, onClick: go("/student/courses") },
            { label: "Content", icon: <FileText className="h-4 w-4" />, onClick: go("/student/content") },
            { label: "Assignments", icon: <ClipboardList className="h-4 w-4" />, onClick: go("/student/assignments") },
            { label: "Timetable", icon: <Calendar className="h-4 w-4" />, onClick: go("/student/timetable") },
            { label: "Bookmarks", icon: <BookMarked className="h-4 w-4" />, onClick: go("/student/bookmarks") },
            { label: "Attendance", icon: <ScrollText className="h-4 w-4" />, onClick: go("/student/attendance") },
        ];
    }

    const actions: ContextMenuGroup = {
        label: "Actions",
        items: [
            { label: "Settings", icon: <Settings className="h-4 w-4" />, onClick: go("/settings"), shortcut: "⌘," },
            {
                label: mounted ? (theme === "dark" ? "Light Mode" : "Dark Mode") : "Toggle Theme",
                icon: mounted ? (theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />) : <Sun className="h-4 w-4" />,
                onClick: () => setTheme(theme === "dark" ? "light" : "dark"),
                shortcut: "⌘T",
            },
            { label: "Logout", icon: <LogOut className="h-4 w-4" />, onClick: logout, destructive: true },
        ],
    };

    return [navItems, actions];
}

export default function AuthenticatedLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const groups = useContextMenuGroups();

    return (
        <SidebarProvider>
            <AppSidebar />
            <SidebarInset className="overflow-hidden">
                <AppHeader />
                <div className="flex-1 overflow-auto">
                    <SearchableContextMenu groups={groups}>
                        <main className="p-4 md:p-6">{children}</main>
                    </SearchableContextMenu>
                </div>
            </SidebarInset>
        </SidebarProvider>
    );
}
