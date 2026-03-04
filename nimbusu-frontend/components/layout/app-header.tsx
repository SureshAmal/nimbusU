"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell, Search, Settings } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth";
import api from "@/lib/api";

export function AppHeader() {
    const { user, logout } = useAuth();
    const [unreadCount, setUnreadCount] = useState(0);

    useEffect(() => {
        async function fetchUnread() {
            try {
                const { data } = await api.get("/notifications/unread-count/");
                setUnreadCount(data.data?.unread_count ?? 0);
            } catch {
                /* ignore */
            }
        }
        fetchUnread();
        const interval = setInterval(fetchUnread, 30000);
        return () => clearInterval(interval);
    }, []);

    const initials = user
        ? `${user.first_name[0] ?? ""}${user.last_name[0] ?? ""}`.toUpperCase()
        : "?";

    return (
        <header
            className="flex h-14 shrink-0 items-center gap-2 border-b px-4"
            style={{
                borderColor: "var(--border)",
                background: "var(--background)",
            }}
        >
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />

            {/* Breadcrumb / Page title placeholder */}
            <div className="flex-1" />

            {/* Settings */}
            <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                    window.dispatchEvent(
                        new KeyboardEvent("keydown", { key: ",", ctrlKey: true, bubbles: true })
                    );
                }}
                title="Settings (Ctrl+,)"
            >
                <Settings className="h-4 w-4" />
            </Button>

            {/* Notifications */}
            <Button variant="ghost" size="icon" asChild className="relative">
                <Link href={user?.role === "admin" ? "/admin/notifications" : "/student/notifications"}>
                    <Bell className="h-4 w-4" />
                    {unreadCount > 0 && (
                        <Badge
                            variant="destructive"
                            className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 text-xs flex items-center justify-center"
                        >
                            {unreadCount > 99 ? "99+" : unreadCount}
                        </Badge>
                    )}
                </Link>
            </Button>

            {/* User menu */}
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                        <Avatar className="h-8 w-8">
                            <AvatarImage
                                src={user?.profile_picture ?? undefined}
                                alt={user?.first_name ?? "User"}
                            />
                            <AvatarFallback
                                style={{
                                    background: "var(--primary)",
                                    color: "var(--primary-foreground)",
                                    fontSize: "var(--text-xs)",
                                }}
                            >
                                {initials}
                            </AvatarFallback>
                        </Avatar>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end">
                    <DropdownMenuLabel className="font-normal">
                        <div className="flex flex-col space-y-1">
                            <p className="text-sm font-medium leading-none">
                                {user?.first_name} {user?.last_name}
                            </p>
                            <p className="text-xs leading-none text-muted-foreground">
                                {user?.email}
                            </p>
                        </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                        <Link href="/settings">Settings</Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                        onClick={logout}
                        className="text-destructive focus:text-destructive"
                    >
                        Log out
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </header>
    );
}
