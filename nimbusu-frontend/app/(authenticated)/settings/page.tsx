"use client";

import { useRef, useState } from "react";
import { useAuth } from "@/lib/auth";
import { usersService } from "@/services/api";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
    User,
    Shield,
    Bell,
    Palette,
    Globe,
    Lock,
    ChevronRight,
    Save,
    Loader2,
    School,
    Upload,
} from "lucide-react";

/* ───────────────────────────── Settings Nav Items ───────────────────────────── */

type SettingsSection = {
    id: string;
    label: string;
    description: string;
    icon: React.ElementType;
    adminOnly?: boolean;
};

const settingsSections: SettingsSection[] = [
    { id: "profile", label: "Profile", description: "Personal information", icon: User },
    { id: "security", label: "Security", description: "Password & authentication", icon: Lock },
    { id: "notifications", label: "Notifications", description: "Alert preferences", icon: Bell },
    { id: "appearance", label: "Appearance", description: "Theme & display", icon: Palette },
    { id: "language", label: "Language & Region", description: "Locale settings", icon: Globe },
    { id: "site", label: "Site Settings", description: "Institution configuration", icon: School, adminOnly: true },
    { id: "permissions", label: "Permissions", description: "Roles & access control", icon: Shield, adminOnly: true },
];

/* ───────────────────────────── Profile ────────────────────────────── */

function ProfileSettings() {
    const { user, refreshUser } = useAuth();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [firstName, setFirstName] = useState(user?.first_name || "");
    const [lastName, setLastName] = useState(user?.last_name || "");
    const [phone, setPhone] = useState(user?.phone || "");
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

    const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 2 * 1024 * 1024) {
            toast.error("File too large. Max 2MB.");
            return;
        }

        // Show preview immediately
        setAvatarPreview(URL.createObjectURL(file));
        setUploading(true);
        try {
            await usersService.uploadAvatar(file);
            toast.success("Avatar updated!");
            refreshUser?.();
        } catch {
            toast.error("Failed to upload avatar.");
            setAvatarPreview(null);
        } finally {
            setUploading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await usersService.updateMe({ first_name: firstName, last_name: lastName, phone });
            toast.success("Profile updated successfully!");
            refreshUser?.();
        } catch {
            toast.error("Failed to update profile.");
        } finally {
            setSaving(false);
        }
    };

    const displayAvatar = avatarPreview || user?.profile_picture;

    return (
        <div className="space-y-8">
            <div>
                <h2 className="text-xl font-semibold tracking-tight">Profile</h2>
                <p className="text-sm text-muted-foreground mt-1">
                    Manage your personal information and account details.
                </p>
            </div>

            <div className="space-y-6">
                {/* Avatar */}
                <div className="flex items-center gap-5">
                    <div className="relative group">
                        {displayAvatar ? (
                            <img
                                src={displayAvatar}
                                alt="Avatar"
                                className="h-20 w-20 rounded-full object-cover border-2 border-primary/20"
                            />
                        ) : (
                            <div className="h-20 w-20 rounded-full bg-primary/10 text-primary flex items-center justify-center text-2xl font-bold border-2 border-primary/20 shrink-0">
                                {(user?.first_name?.[0] || "U").toUpperCase()}
                            </div>
                        )}
                        {uploading && (
                            <div className="absolute inset-0 rounded-full bg-background/70 flex items-center justify-center">
                                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                            </div>
                        )}
                    </div>
                    <div className="space-y-1.5">
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/png,image/jpeg,image/gif"
                            className="hidden"
                            onChange={handleAvatarChange}
                        />
                        <Button
                            variant="outline"
                            size="sm"
                            className="gap-2"
                            disabled={uploading}
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <Upload className="h-3.5 w-3.5" />
                            Change Avatar
                        </Button>
                        <p className="text-xs text-muted-foreground">JPG, PNG or GIF. Max 2MB.</p>
                    </div>
                </div>

                <Separator />

                {/* Editable fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 max-w-xl">
                    <div className="space-y-2">
                        <Label>First Name</Label>
                        <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label>Last Name</Label>
                        <Input value={lastName} onChange={(e) => setLastName(e.target.value)} />
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                        <Label>Email</Label>
                        <Input value={user?.email || ""} disabled />
                        <p className="text-xs text-muted-foreground">Contact admin to change your email.</p>
                    </div>
                    <div className="space-y-2">
                        <Label>Phone</Label>
                        <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 ..." />
                    </div>
                    <div className="space-y-2">
                        <Label>Role</Label>
                        <Input value={user?.role || ""} disabled className="capitalize" />
                    </div>
                </div>

                <div className="flex items-center gap-3 pt-2">
                    <Button onClick={handleSave} disabled={saving} className="gap-2">
                        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        Save Changes
                    </Button>
                </div>
            </div>
        </div>
    );
}

/* ───────────────────────────── Security ───────────────────────────── */

function SecuritySettings() {
    const [oldPassword, setOldPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [saving, setSaving] = useState(false);

    const handleChangePassword = async () => {
        if (!oldPassword || !newPassword) {
            toast.error("Please fill in all fields.");
            return;
        }
        if (newPassword.length < 8) {
            toast.error("New password must be at least 8 characters.");
            return;
        }
        if (newPassword !== confirmPassword) {
            toast.error("Passwords do not match.");
            return;
        }
        setSaving(true);
        try {
            await usersService.changePassword({ old_password: oldPassword, new_password: newPassword });
            toast.success("Password changed successfully!");
            setOldPassword("");
            setNewPassword("");
            setConfirmPassword("");
        } catch (err: any) {
            const msg = err?.response?.data?.message || err?.response?.data?.detail || "Failed to change password.";
            toast.error(msg);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-8">
            <div>
                <h2 className="text-xl font-semibold tracking-tight">Security</h2>
                <p className="text-sm text-muted-foreground mt-1">
                    Manage your password and security preferences.
                </p>
            </div>

            <div className="space-y-6 max-w-xl">
                <div className="rounded-lg border p-5 space-y-4">
                    <h3 className="font-medium">Change Password</h3>
                    <div className="space-y-3">
                        <div className="space-y-2">
                            <Label>Current Password</Label>
                            <Input type="password" value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label>New Password</Label>
                            <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label>Confirm New Password</Label>
                            <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
                        </div>
                    </div>
                    <Button size="sm" onClick={handleChangePassword} disabled={saving} className="gap-2">
                        {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                        Update Password
                    </Button>
                </div>

                <div className="rounded-lg border p-5 space-y-4">
                    <h3 className="font-medium">Active Sessions</h3>
                    <p className="text-sm text-muted-foreground">
                        You are currently logged in on this device.
                    </p>
                    <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
                        Sign Out All Other Sessions
                    </Button>
                </div>
            </div>
        </div>
    );
}

/* ───────────────────────────── Notifications ─────────────────────── */

function NotificationSettings() {
    return (
        <div className="space-y-8">
            <div>
                <h2 className="text-xl font-semibold tracking-tight">Notifications</h2>
                <p className="text-sm text-muted-foreground mt-1">
                    Choose what notifications you receive.
                </p>
            </div>

            <div className="space-y-4 max-w-xl">
                {[
                    { label: "Email Notifications", description: "Receive important updates via email", defaultOn: true },
                    { label: "Assignment Reminders", description: "Get notified before assignment deadlines", defaultOn: true },
                    { label: "Announcements", description: "University-wide and course announcements", defaultOn: true },
                    { label: "Timetable Changes", description: "Notify when schedule is updated", defaultOn: false },
                    { label: "Direct Messages", description: "New message notifications", defaultOn: true },
                ].map((item) => (
                    <div
                        key={item.label}
                        className="flex items-center justify-between rounded-lg border p-4 hover:bg-muted/30 transition-colors"
                    >
                        <div>
                            <div className="font-medium text-sm">{item.label}</div>
                            <div className="text-xs text-muted-foreground mt-0.5">{item.description}</div>
                        </div>
                        <Switch defaultChecked={item.defaultOn} />
                    </div>
                ))}
            </div>
        </div>
    );
}

/* ───────────────────────────── Appearance ─────────────────────────── */

function AppearanceSettings() {
    return (
        <div className="space-y-8">
            <div>
                <h2 className="text-xl font-semibold tracking-tight">Appearance</h2>
                <p className="text-sm text-muted-foreground mt-1">
                    Customize how NimbusU looks for you.
                </p>
            </div>

            <div className="space-y-6 max-w-xl">
                <div className="space-y-3">
                    <Label>Theme</Label>
                    <p className="text-xs text-muted-foreground">
                        Use the theme toggle in the sidebar or press{" "}
                        <kbd className="px-1 py-0.5 rounded bg-muted border text-[10px] font-mono">Ctrl+T</kbd> to switch themes.
                    </p>
                </div>

                <div className="space-y-3">
                    <Label>Calendar View</Label>
                    <Select defaultValue="week">
                        <SelectTrigger className="w-full sm:w-[200px]">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="month">Month</SelectItem>
                            <SelectItem value="week">Week</SelectItem>
                            <SelectItem value="day">Day</SelectItem>
                        </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">Default calendar view on load.</p>
                </div>

                <div className="space-y-3">
                    <Label>Sidebar</Label>
                    <div className="flex items-center justify-between rounded-lg border p-4">
                        <div>
                            <div className="font-medium text-sm">Compact Mode</div>
                            <div className="text-xs text-muted-foreground mt-0.5">Collapse the sidebar by default</div>
                        </div>
                        <Switch />
                    </div>
                </div>
            </div>
        </div>
    );
}

/* ───────────────────────────── Language ───────────────────────────── */

function LanguageSettings() {
    return (
        <div className="space-y-8">
            <div>
                <h2 className="text-xl font-semibold tracking-tight">Language & Region</h2>
                <p className="text-sm text-muted-foreground mt-1">
                    Set your preferred language and regional formatting.
                </p>
            </div>

            <div className="space-y-6 max-w-xl">
                <div className="space-y-2">
                    <Label>Language</Label>
                    <Select defaultValue="en">
                        <SelectTrigger className="w-full sm:w-[250px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="en">English</SelectItem>
                            <SelectItem value="hi">Hindi</SelectItem>
                            <SelectItem value="ta">Tamil</SelectItem>
                            <SelectItem value="te">Telugu</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label>Timezone</Label>
                    <Select defaultValue="asia_kolkata">
                        <SelectTrigger className="w-full sm:w-[250px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="asia_kolkata">Asia/Kolkata (IST)</SelectItem>
                            <SelectItem value="utc">UTC</SelectItem>
                            <SelectItem value="us_eastern">US/Eastern</SelectItem>
                            <SelectItem value="europe_london">Europe/London</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label>Date Format</Label>
                    <Select defaultValue="dd_mm_yyyy">
                        <SelectTrigger className="w-full sm:w-[250px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="dd_mm_yyyy">DD/MM/YYYY</SelectItem>
                            <SelectItem value="mm_dd_yyyy">MM/DD/YYYY</SelectItem>
                            <SelectItem value="yyyy_mm_dd">YYYY-MM-DD</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>
        </div>
    );
}

/* ───────────────────────────── Site Settings (Admin) ──────────────── */

function SiteSettings() {
    return (
        <div className="space-y-8">
            <div>
                <h2 className="text-xl font-semibold tracking-tight">Site Settings</h2>
                <p className="text-sm text-muted-foreground mt-1">Configure institution-wide settings.</p>
            </div>

            <div className="space-y-6 max-w-xl">
                <div className="space-y-2">
                    <Label>Institution Name</Label>
                    <Input defaultValue="NimbusU University" />
                </div>
                <div className="space-y-2">
                    <Label>Support Email</Label>
                    <Input defaultValue="support@nimbusu.edu" />
                </div>
                <div className="space-y-2">
                    <Label>Academic Year</Label>
                    <Input defaultValue="2025-2026" />
                </div>

                <Separator />

                <div className="space-y-4">
                    <h3 className="font-medium">Feature Toggles</h3>
                    {[
                        { label: "Student Self-Registration", description: "Allow students to create their own accounts", defaultOn: false },
                        { label: "File Uploads", description: "Allow file uploads in content & assignments", defaultOn: true },
                        { label: "Forum Discussions", description: "Enable course discussion forums", defaultOn: true },
                    ].map((item) => (
                        <div
                            key={item.label}
                            className="flex items-center justify-between rounded-lg border p-4 hover:bg-muted/30 transition-colors"
                        >
                            <div>
                                <div className="font-medium text-sm">{item.label}</div>
                                <div className="text-xs text-muted-foreground mt-0.5">{item.description}</div>
                            </div>
                            <Switch defaultChecked={item.defaultOn} />
                        </div>
                    ))}
                </div>

                <div className="flex items-center gap-3 pt-2">
                    <Button className="gap-2">
                        <Save className="h-4 w-4" />
                        Save Settings
                    </Button>
                </div>
            </div>
        </div>
    );
}

/* ───────────────────────────── Permissions (Admin) ────────────────── */

function PermissionsSettings() {
    return (
        <div className="space-y-8">
            <div>
                <h2 className="text-xl font-semibold tracking-tight">Permissions</h2>
                <p className="text-sm text-muted-foreground mt-1">Manage roles and access control.</p>
            </div>

            <div className="space-y-4 max-w-2xl">
                {[
                    { role: "Admin", permissions: "Full access", count: 2, color: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20" },
                    { role: "Dean", permissions: "School management, faculty oversight", count: 3, color: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20" },
                    { role: "Head", permissions: "Department management, course management", count: 5, color: "bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20" },
                    { role: "Faculty", permissions: "Course content, attendance, grading", count: 24, color: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20" },
                    { role: "Student", permissions: "View content, submit assignments", count: 450, color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" },
                ].map((item) => (
                    <div
                        key={item.role}
                        className="flex items-center gap-4 rounded-lg border p-4 hover:bg-muted/30 transition-colors"
                    >
                        <Badge variant="outline" className={cn("font-semibold text-xs px-2.5 py-1", item.color)}>
                            {item.role}
                        </Badge>
                        <div className="flex-1 min-w-0">
                            <div className="text-sm text-muted-foreground truncate">{item.permissions}</div>
                        </div>
                        <span className="text-xs text-muted-foreground font-mono tabular-nums">{item.count} users</span>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                ))}
            </div>
        </div>
    );
}

/* ───────────────────────────── Main Settings Page ─────────────────── */

const panelMap: Record<string, React.FC> = {
    profile: ProfileSettings,
    security: SecuritySettings,
    notifications: NotificationSettings,
    appearance: AppearanceSettings,
    language: LanguageSettings,
    site: SiteSettings,
    permissions: PermissionsSettings,
};

export default function SettingsPage() {
    const { user } = useAuth();
    const [activeSection, setActiveSection] = useState("profile");

    const visibleSections = settingsSections.filter(
        (s) => !s.adminOnly || user?.role === "admin"
    );

    const ActivePanel = panelMap[activeSection] || ProfileSettings;

    return (
        <div className="flex flex-col md:flex-row h-[calc(100vh-8rem)] -m-4 md:-m-6">
            {/* ── Mobile: Horizontal scrollable nav on top ── */}
            <div className="md:hidden border-b border-border bg-muted/20 shrink-0">
                <div className="px-4 pt-4 pb-2">
                    <h1 className="text-lg font-bold tracking-tight">Settings</h1>
                </div>
                <div className="relative overflow-x-auto scrollbar-none">
                    <nav className="flex gap-1 px-4 pb-3 min-w-max">
                        {visibleSections.map((section) => {
                            const Icon = section.icon;
                            const isActive = activeSection === section.id;
                            return (
                                <button
                                    key={section.id}
                                    onClick={() => setActiveSection(section.id)}
                                    className={cn(
                                        "relative flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium whitespace-nowrap transition-all duration-200",
                                        isActive
                                            ? "bg-primary text-primary-foreground shadow-md shadow-primary/20 scale-[1.02]"
                                            : "text-muted-foreground border border-border bg-background hover:bg-muted hover:text-foreground hover:border-foreground/20"
                                    )}
                                >
                                    <Icon className="h-3.5 w-3.5 shrink-0" />
                                    {section.label}
                                </button>
                            );
                        })}
                    </nav>
                </div>
            </div>

            {/* ── Desktop: Vertical sidebar ── */}
            <aside className="hidden md:block w-[260px] shrink-0 border-r border-border bg-muted/20 overflow-y-auto">
                <div className="p-5 pb-3">
                    <h1 className="text-lg font-bold tracking-tight">Settings</h1>
                </div>
                <nav className="px-3 pb-4 space-y-1">
                    {visibleSections.map((section) => {
                        const Icon = section.icon;
                        const isActive = activeSection === section.id;
                        return (
                            <button
                                key={section.id}
                                onClick={() => setActiveSection(section.id)}
                                className={cn(
                                    "w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-all duration-200 group",
                                    isActive
                                        ? "bg-primary/10 text-primary shadow-sm"
                                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                )}
                            >
                                <Icon className={cn("h-4 w-4 shrink-0 transition-colors", isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} />
                                <div className="flex-1 min-w-0">
                                    <div className={cn("text-sm font-medium truncate", isActive && "text-primary")}>
                                        {section.label}
                                    </div>
                                    <div className="text-[11px] text-muted-foreground truncate leading-tight mt-0.5">
                                        {section.description}
                                    </div>
                                </div>
                            </button>
                        );
                    })}
                </nav>
            </aside>

            {/* ── Content Panel ── */}
            <main className="flex-1 overflow-y-auto p-5 md:p-8">
                <ActivePanel />
            </main>
        </div>
    );
}
