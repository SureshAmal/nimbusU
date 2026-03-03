"use client";

import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { usersService, schoolsService, departmentsService, programsService } from "@/services/api";
import type { User, School, Department, Program } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Table, TableCard } from "@/components/application/table/table";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
    SheetFooter,
} from "@/components/ui/sheet";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuTrigger,
    ContextMenuSeparator,
} from "@/components/ui/context-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
    Search,
    UserPlus,
    KeyRound,
    Loader2,
    Shield,
    GraduationCap,
    BookOpen,
    ToggleRight,
    ChevronDown,
    X,
    Pencil,
    Filter,
    Eye,
    EyeOff,
} from "lucide-react";

const ROLE_ICONS: Record<string, React.ReactNode> = {
    admin: <Shield className="h-3 w-3" />,
    dean: <BookOpen className="h-3 w-3" />,
    head: <BookOpen className="h-3 w-3" />,
    faculty: <BookOpen className="h-3 w-3" />,
    student: <GraduationCap className="h-3 w-3" />,
};

const ROLE_COLORS: Record<string, string> = {
    admin: "bg-red-500/10 text-red-600 dark:text-red-400",
    dean: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
    head: "bg-teal-500/10 text-teal-600 dark:text-teal-400",
    faculty: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    student: "bg-green-500/10 text-green-600 dark:text-green-400",
};

const DEBOUNCE_MS = 400;

export default function AdminUsersPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [initialLoading, setInitialLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [roleFilter, setRoleFilter] = useState("all");
    const [statusFilter, setStatusFilter] = useState("all");
    const [schoolFilter, setSchoolFilter] = useState("all");
    const [departmentFilter, setDepartmentFilter] = useState("all");
    const [semesterFilter, setSemesterFilter] = useState("all");
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(20);
    const [sheetOpen, setSheetOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [editId, setEditId] = useState<string | null>(null);
    const [contextMenuUser, setContextMenuUser] = useState<User | null>(null);

    // Reset password dialog
    const [resetPwOpen, setResetPwOpen] = useState(false);
    const [resetPwUserId, setResetPwUserId] = useState<string | null>(null);
    const [resetPwUserName, setResetPwUserName] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showNewPw, setShowNewPw] = useState(false);
    const [resettingPw, setResettingPw] = useState(false);

    // Lookup data for filters and form dropdowns
    const [schools, setSchools] = useState<School[]>([]);
    const [allDepartments, setAllDepartments] = useState<Department[]>([]);
    const [allPrograms, setAllPrograms] = useState<Program[]>([]);

    const [form, setForm] = useState({
        email: "",
        first_name: "",
        last_name: "",
        role: "student",
        password: "",
        phone: "",
        department: "" as string,
        _school: "" as string, // UI-only (not sent to API)
        student_profile: {
            student_id_number: "",
            register_no: "",
            current_semester: 1,
            batch: "",
            division: "",
            batch_year: new Date().getFullYear(),
            admission_date: new Date().toISOString().split("T")[0],
            program: "" as string,
        },
        faculty_profile: {
            employee_id: "",
            designation: "",
            specialization: "",
            joining_date: new Date().toISOString().split("T")[0],
        },
    });

    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const abortRef = useRef<AbortController | null>(null);

    // Load lookup data on mount
    useEffect(() => {
        schoolsService.list().then((r) => setSchools(r.data.results ?? r.data ?? [])).catch(() => { });
        departmentsService.list().then((r) => setAllDepartments(r.data.results ?? r.data ?? [])).catch(() => { });
        programsService.list().then((r) => setAllPrograms(r.data.results ?? r.data ?? [])).catch(() => { });
    }, []);

    // Departments filtered by selected school (for filter toolbar)
    const filteredFilterDepartments = useMemo(() => {
        if (schoolFilter === "all") return allDepartments;
        return allDepartments.filter((d) => d.school === schoolFilter);
    }, [allDepartments, schoolFilter]);

    // Departments filtered by school selected in form
    const formDepartments = useMemo(() => {
        if (!form._school) return allDepartments;
        return allDepartments.filter((d) => d.school === form._school);
    }, [allDepartments, form._school]);

    // Programs filtered by department selected in form
    const formPrograms = useMemo(() => {
        if (!form.department) return allPrograms;
        return allPrograms.filter((p) => p.department === form.department);
    }, [allPrograms, form.department]);

    // Cross-reference: which user is dean of which school / head of which dept
    const deanOfSchoolMap = useMemo(() => {
        const m = new Map<string, string>();
        schools.forEach((s) => { if (s.dean) m.set(s.dean, s.name); });
        return m;
    }, [schools]);
    const headOfDeptMap = useMemo(() => {
        const m = new Map<string, string>();
        allDepartments.forEach((d) => { if (d.head) m.set(d.head, d.name); });
        return m;
    }, [allDepartments]);

    // Core fetch — silent by default (no skeleton after initial load)
    const fetchUsers = useCallback(async (opts?: { showLoading?: boolean; searchOverride?: string }) => {
        if (opts?.showLoading) setInitialLoading(true);

        // Cancel any in-flight request
        abortRef.current?.abort();
        const controller = new AbortController();
        abortRef.current = controller;

        try {
            const params: Record<string, string> = {};
            const q = opts?.searchOverride ?? search;
            if (q) params.search = q;
            if (roleFilter !== "all") params.role = roleFilter;
            if (schoolFilter !== "all") params.department__school = schoolFilter;
            if (departmentFilter !== "all") params.department = departmentFilter;
            if (semesterFilter !== "all") params.student_profile__current_semester = semesterFilter;
            const { data } = await usersService.list(params);
            if (!controller.signal.aborted) {
                setUsers(data.results ?? []);
            }
        } catch (err: unknown) {
            if (err instanceof DOMException && err.name === "AbortError") return;
            toast.error("Failed to load users");
        } finally {
            if (!controller.signal.aborted) setInitialLoading(false);
        }
    }, [search, roleFilter, schoolFilter, departmentFilter, semesterFilter]);

    // Initial load and filter resets
    useEffect(() => {
        setCurrentPage(1);
        fetchUsers({ showLoading: true });
    }, [roleFilter, statusFilter, schoolFilter, departmentFilter, semesterFilter]);

    // Reset department filter when school filter changes
    useEffect(() => {
        if (schoolFilter !== "all" && departmentFilter !== "all") {
            const valid = allDepartments.find((d) => d.id === departmentFilter && d.school === schoolFilter);
            if (!valid) setDepartmentFilter("all");
        }
    }, [schoolFilter, allDepartments, departmentFilter]);

    // Debounced search — calls backend API and resets page
    const handleSearchChange = useCallback((value: string) => {
        setSearch(value);
        setCurrentPage(1);
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            fetchUsers({ searchOverride: value });
        }, DEBOUNCE_MS);
    }, [fetchUsers]);

    // Cleanup debounce on unmount
    useEffect(() => {
        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
            abortRef.current?.abort();
        };
    }, []);

    const filteredUsers = useMemo(() => {
        let result = users;
        if (statusFilter === "active") result = result.filter((u) => u.is_active);
        if (statusFilter === "inactive") result = result.filter((u) => !u.is_active);
        return result;
    }, [users, statusFilter]);

    const paginatedUsers = useMemo(() => {
        const startIndex = (currentPage - 1) * pageSize;
        return filteredUsers.slice(startIndex, startIndex + pageSize);
    }, [filteredUsers, currentPage, pageSize]);

    const totalPages = Math.ceil(filteredUsers.length / pageSize);

    const emptyForm = () => ({
        email: "", first_name: "", last_name: "", role: "student", password: "", phone: "",
        department: "" as string, _school: "" as string,
        student_profile: {
            student_id_number: "", register_no: "", current_semester: 1,
            batch: "", division: "", batch_year: new Date().getFullYear(),
            admission_date: new Date().toISOString().split("T")[0], program: "" as string,
        },
        faculty_profile: {
            employee_id: "", designation: "", specialization: "",
            joining_date: new Date().toISOString().split("T")[0],
        },
    });

    function openCreate() {
        setEditId(null);
        setForm(emptyForm());
        setSheetOpen(true);
    }

    function openEdit(u: User) {
        // Determine school from department
        const dept = allDepartments.find((d) => d.id === u.department);
        setEditId(u.id);
        setForm({
            email: u.email,
            first_name: u.first_name,
            last_name: u.last_name,
            role: u.role,
            password: "",
            phone: u.phone || "",
            department: u.department || "",
            _school: dept?.school || "",
            student_profile: u.student_profile ? {
                student_id_number: u.student_profile.student_id_number || "",
                register_no: u.student_profile.register_no || "",
                current_semester: u.student_profile.current_semester || 1,
                batch: u.student_profile.batch || "",
                division: u.student_profile.division || "",
                batch_year: u.student_profile.batch_year || new Date().getFullYear(),
                admission_date: u.student_profile.admission_date || new Date().toISOString().split("T")[0],
                program: u.student_profile.program || "",
            } : {
                student_id_number: "", register_no: "", current_semester: 1,
                batch: "", division: "", batch_year: new Date().getFullYear(),
                admission_date: new Date().toISOString().split("T")[0], program: "",
            },
            faculty_profile: u.faculty_profile ? {
                employee_id: u.faculty_profile.employee_id || "",
                designation: u.faculty_profile.designation || "",
                specialization: u.faculty_profile.specialization || "",
                joining_date: u.faculty_profile.joining_date || new Date().toISOString().split("T")[0],
            } : {
                employee_id: "", designation: "", specialization: "",
                joining_date: new Date().toISOString().split("T")[0],
            },
        });
        setSheetOpen(true);
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setSaving(true);
        try {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { _school, ...submitData } = form;

            // Strip out irrelevant profiles based on selected role
            if (submitData.role !== "student") {
                delete (submitData as any).student_profile;
            }
            if (!["faculty", "dean", "head"].includes(submitData.role)) {
                delete (submitData as any).faculty_profile;
            }

            if (editId) {
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                const { password, ...rest } = submitData;
                await usersService.update(editId, rest as unknown as Parameters<typeof usersService.update>[1]);
                toast.success("User updated successfully");
            } else {
                await usersService.create(submitData as unknown as Parameters<typeof usersService.create>[0]);
                toast.success("User created successfully");
            }
            setSheetOpen(false);
            setEditId(null);
            setForm(emptyForm());
            fetchUsers();
        } catch {
            toast.error(editId ? "Failed to update user" : "Failed to create user");
        } finally {
            setSaving(false);
        }
    }

    function openResetPassword(user: User) {
        setResetPwUserId(user.id);
        setResetPwUserName(`${user.first_name} ${user.last_name}`);
        setNewPassword("");
        setConfirmPassword("");
        setShowNewPw(false);
        setResetPwOpen(true);
    }

    async function handleResetPassword() {
        if (!resetPwUserId) return;
        if (newPassword.length < 6) {
            toast.error("Password must be at least 6 characters");
            return;
        }
        if (newPassword !== confirmPassword) {
            toast.error("Passwords do not match");
            return;
        }
        setResettingPw(true);
        try {
            await usersService.resetPassword(resetPwUserId, newPassword);
            toast.success("Password reset successfully");
            setResetPwOpen(false);
        } catch {
            toast.error("Failed to reset password");
        } finally {
            setResettingPw(false);
        }
    }

    async function handleToggleActive(user: User) {
        // Optimistic update — flip locally first
        setUsers((prev) =>
            prev.map((u) => (u.id === user.id ? { ...u, is_active: !u.is_active } : u))
        );

        try {
            if (user.is_active) {
                await usersService.delete(user.id);
                toast.success("User deactivated");
            } else {
                await usersService.update(user.id, { is_active: true } as unknown as Parameters<typeof usersService.update>[1]);
                toast.success("User activated");
            }
        } catch {
            // Rollback on error
            setUsers((prev) =>
                prev.map((u) => (u.id === user.id ? { ...u, is_active: user.is_active } : u))
            );
            toast.error("Failed to toggle user status");
        }
    }

    function clearAllFilters() {
        setRoleFilter("all");
        setStatusFilter("all");
        setSchoolFilter("all");
        setDepartmentFilter("all");
        setSemesterFilter("all");
    }

    const activeFilters =
        (roleFilter !== "all" ? 1 : 0) +
        (statusFilter !== "all" ? 1 : 0) +
        (schoolFilter !== "all" ? 1 : 0) +
        (departmentFilter !== "all" ? 1 : 0) +
        (semesterFilter !== "all" ? 1 : 0);

    return (
        <div className="space-y-0">
            <ContextMenu onOpenChange={(open) => {
                if (!open) setTimeout(() => setContextMenuUser(null), 200);
            }}>
                <ContextMenuTrigger asChild>
                    <div className="w-full">
                        <TableCard.Root>
                            {/* Toolbar */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-secondary px-4 py-3">
                                <Tabs value={roleFilter} onValueChange={setRoleFilter} className="w-full sm:w-auto">
                                    <TabsList className="h-9 w-full sm:w-auto grid grid-cols-4 sm:flex bg-muted/50">
                                        <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
                                        <TabsTrigger value="student" className="text-xs">Students</TabsTrigger>
                                        <TabsTrigger value="faculty" className="text-xs">Faculty</TabsTrigger>
                                        <TabsTrigger value="admin" className="text-xs">Admins</TabsTrigger>
                                    </TabsList>
                                </Tabs>
                                <div className="flex items-center gap-2">
                                    <div className="relative w-full sm:w-64">
                                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                                        <Input
                                            placeholder="Filter users..."
                                            value={search}
                                            onChange={(e) => handleSearchChange(e.target.value)}
                                            className="pl-9 h-9 text-sm border-none shadow-none bg-transparent focus-visible:ring-0"
                                        />
                                    </div>
                                    {activeFilters > 0 && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-9 text-xs gap-1 hidden sm:flex"
                                            onClick={clearAllFilters}
                                        >
                                            <X className="h-3 w-3" /> Clear
                                        </Button>
                                    )}
                                    <Button size="sm" className="h-9 gap-1 shrink-0" onClick={openCreate}>
                                        <UserPlus className="h-3.5 w-3.5" /> Add User
                                    </Button>
                                </div>
                            </div>

                            {/* Filter Bar */}
                            <div className="flex flex-wrap items-center gap-2 border-b border-secondary px-4 py-2 bg-muted/30">
                                <Filter className="h-3.5 w-3.5 text-muted-foreground" />
                                <Select value={schoolFilter} onValueChange={setSchoolFilter}>
                                    <SelectTrigger className="h-8 w-[160px] text-xs">
                                        <SelectValue placeholder="All Schools" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Schools</SelectItem>
                                        {schools.map((s) => (
                                            <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                                    <SelectTrigger className="h-8 w-[180px] text-xs">
                                        <SelectValue placeholder="All Departments" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Departments</SelectItem>
                                        {filteredFilterDepartments.map((d) => (
                                            <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {roleFilter === "student" && (
                                    <Select value={semesterFilter} onValueChange={setSemesterFilter}>
                                        <SelectTrigger className="h-8 w-[140px] text-xs">
                                            <SelectValue placeholder="All Semesters" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Semesters</SelectItem>
                                            {Array.from({ length: 8 }, (_, i) => i + 1).map((s) => (
                                                <SelectItem key={s} value={s.toString()}>Semester {s}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                )}
                                {activeFilters > 0 && (
                                    <span className="text-xs text-muted-foreground ml-auto">
                                        {activeFilters} filter{activeFilters !== 1 ? "s" : ""} applied
                                    </span>
                                )}
                            </div>

                            <div className="overflow-auto" style={{ maxHeight: "calc(100vh - 340px)" }}>
                                {initialLoading ? (
                                    <div className="p-6 space-y-3">
                                        {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
                                    </div>
                                ) : (
                                    <Table aria-label="Users">
                                        <Table.Header className="sticky top-0 z-10 bg-secondary/95 backdrop-blur shadow-sm">
                                            <Table.Row>
                                                <Table.Head isRowHeader>
                                                    <span className="text-xs font-semibold whitespace-nowrap text-quaternary">Name</span>
                                                </Table.Head>
                                                {roleFilter === "student" && (
                                                    <>
                                                        <Table.Head><span className="text-xs font-semibold whitespace-nowrap text-quaternary">Enrollment No.</span></Table.Head>
                                                        <Table.Head><span className="text-xs font-semibold whitespace-nowrap text-quaternary">Register No.</span></Table.Head>
                                                        <Table.Head><span className="text-xs font-semibold whitespace-nowrap text-quaternary">Semester</span></Table.Head>
                                                        <Table.Head><span className="text-xs font-semibold whitespace-nowrap text-quaternary">Batch / Div</span></Table.Head>
                                                    </>
                                                )}
                                                {roleFilter !== "student" && (
                                                    <>
                                                        <Table.Head>
                                                            <span className="text-xs font-semibold whitespace-nowrap text-quaternary">Email</span>
                                                        </Table.Head>
                                                        <Table.Head>
                                                            <span className="text-xs font-semibold whitespace-nowrap text-quaternary">Phone</span>
                                                        </Table.Head>
                                                    </>
                                                )}
                                                {roleFilter === "student" && (
                                                    <Table.Head>
                                                        <span className="text-xs font-semibold whitespace-nowrap text-quaternary">Phone</span>
                                                    </Table.Head>
                                                )}
                                                {roleFilter === "all" && (
                                                    <Table.Head>
                                                        <span className="text-xs font-semibold whitespace-nowrap text-quaternary">Role</span>
                                                    </Table.Head>
                                                )}
                                                <Table.Head>
                                                    <span className="text-xs font-semibold whitespace-nowrap text-quaternary">School</span>
                                                </Table.Head>
                                                <Table.Head>
                                                    <span className="text-xs font-semibold whitespace-nowrap text-quaternary">Department</span>
                                                </Table.Head>
                                                <Table.Head>
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <button className="flex items-center gap-1 text-xs font-semibold whitespace-nowrap text-quaternary hover:text-foreground transition-colors cursor-pointer">
                                                                Status
                                                                {statusFilter !== "all" && <span className="inline-flex items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] h-4 w-4">{1}</span>}
                                                                <ChevronDown className="h-3 w-3 opacity-50" />
                                                            </button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="start" className="w-32">
                                                            <DropdownMenuItem onClick={() => setStatusFilter("all")} className={statusFilter === "all" ? "font-semibold" : ""}>All</DropdownMenuItem>
                                                            <DropdownMenuSeparator />
                                                            <DropdownMenuItem onClick={() => setStatusFilter("active")} className={statusFilter === "active" ? "font-semibold" : ""}>Active</DropdownMenuItem>
                                                            <DropdownMenuItem onClick={() => setStatusFilter("inactive")} className={statusFilter === "inactive" ? "font-semibold" : ""}>Inactive</DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </Table.Head>
                                            </Table.Row>
                                        </Table.Header>
                                        <Table.Body>
                                            {paginatedUsers.length === 0 ? (
                                                <Table.Row id="empty"><Table.Cell colSpan={roleFilter === "student" ? 9 : (roleFilter === "all" ? 7 : 6)} className="text-center py-8 text-muted-foreground">No users found.</Table.Cell></Table.Row>
                                            ) : (
                                                paginatedUsers.map((u) => (
                                                    <Table.Row
                                                        key={u.id}
                                                        id={u.id}
                                                        onContextMenu={() => setContextMenuUser(u)}
                                                        className={
                                                            deanOfSchoolMap.has(u.id) ? "border-l-4 border-l-purple-500" :
                                                                headOfDeptMap.has(u.id) ? "border-l-4 border-l-teal-500" : ""
                                                        }
                                                    >
                                                        <Table.Cell className="font-medium">
                                                            <div className="flex items-center gap-3">
                                                                <Avatar className="h-8 w-8 rounded-full border border-border">
                                                                    <AvatarImage src={u.profile_picture || undefined} alt={u.first_name} />
                                                                    <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
                                                                        {u.first_name?.[0]}{u.last_name?.[0]}
                                                                    </AvatarFallback>
                                                                </Avatar>
                                                                <div>
                                                                    <div
                                                                        className="text-sm font-medium leading-none flex items-center gap-1.5"
                                                                        title={deanOfSchoolMap.has(u.id) ? `Dean of ${deanOfSchoolMap.get(u.id)}` : headOfDeptMap.has(u.id) ? `Head of ${headOfDeptMap.get(u.id)}` : undefined}
                                                                    >
                                                                        {u.first_name} {u.last_name}
                                                                    </div>
                                                                    {roleFilter === "student" && <div className="text-xs text-muted-foreground mt-1">{u.email}</div>}
                                                                </div>
                                                            </div>
                                                        </Table.Cell>
                                                        {roleFilter === "student" && (
                                                            <>
                                                                <Table.Cell className="text-muted-foreground">{u.student_profile?.student_id_number || "—"}</Table.Cell>
                                                                <Table.Cell className="text-muted-foreground">{u.student_profile?.register_no || "—"}</Table.Cell>
                                                                <Table.Cell className="text-muted-foreground">Sem {u.student_profile?.current_semester || "—"}</Table.Cell>
                                                                <Table.Cell className="text-muted-foreground">
                                                                    {u.student_profile?.batch || "—"} / {u.student_profile?.division || "—"}
                                                                </Table.Cell>
                                                                <Table.Cell className="text-muted-foreground">{u.phone || "—"}</Table.Cell>
                                                            </>
                                                        )}
                                                        {roleFilter !== "student" && (
                                                            <>
                                                                <Table.Cell className="text-muted-foreground">{u.email}</Table.Cell>
                                                                <Table.Cell className="text-muted-foreground">{u.phone || "—"}</Table.Cell>
                                                            </>
                                                        )}
                                                        {roleFilter === "all" && (
                                                            <Table.Cell>
                                                                <Badge variant="secondary" className={ROLE_COLORS[u.role] ?? ""}>
                                                                    {ROLE_ICONS[u.role]} {u.role}
                                                                </Badge>
                                                            </Table.Cell>
                                                        )}
                                                        <Table.Cell className="text-muted-foreground">{u.school_name ?? "—"}</Table.Cell>
                                                        <Table.Cell className="text-muted-foreground">{u.department_name ?? "—"}</Table.Cell>
                                                        <Table.Cell>
                                                            <Badge variant={u.is_active ? "default" : "secondary"}>
                                                                {u.is_active ? "Active" : "Inactive"}
                                                            </Badge>
                                                        </Table.Cell>
                                                    </Table.Row>
                                                ))
                                            )}
                                        </Table.Body>
                                    </Table>
                                )}
                            </div>

                            {/* Footer */}
                            <div className="flex flex-col sm:flex-row items-center justify-between border-t border-secondary px-4 py-3 gap-4 text-xs text-muted-foreground bg-popover/50">
                                <div className="flex items-center gap-3">
                                    <span>{filteredUsers.length} user{filteredUsers.length !== 1 ? "s" : ""} total</span>
                                    {activeFilters > 0 && <span>• {activeFilters} filter{activeFilters !== 1 ? "s" : ""} applied</span>}
                                </div>

                                <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-2">
                                        <span>Rows per page</span>
                                        <Select value={pageSize.toString()} onValueChange={(v) => { setPageSize(Number(v)); setCurrentPage(1); }}>
                                            <SelectTrigger className="h-8 w-[70px] text-xs"><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="20">20</SelectItem>
                                                <SelectItem value="50">50</SelectItem>
                                                <SelectItem value="100">100</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span>Page {currentPage} of {totalPages || 1}</span>
                                        <div className="flex items-center gap-1">
                                            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1 || totalPages === 0}>
                                                <span className="sr-only">Previous page</span>
                                                <ChevronDown className="h-4 w-4 rotate-90" />
                                            </Button>
                                            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage >= totalPages || totalPages === 0}>
                                                <span className="sr-only">Next page</span>
                                                <ChevronDown className="h-4 w-4 -rotate-90" />
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </TableCard.Root>
                    </div>
                </ContextMenuTrigger>
                {contextMenuUser && (
                    <ContextMenuContent className="w-48">
                        <ContextMenuItem onClick={() => openEdit(contextMenuUser)}>
                            <Pencil className="mr-2 h-4 w-4" /> Edit User
                        </ContextMenuItem>
                        <ContextMenuItem onClick={() => openResetPassword(contextMenuUser)}>
                            <KeyRound className="mr-2 h-4 w-4" /> Reset Password
                        </ContextMenuItem>
                        <ContextMenuSeparator />
                        <ContextMenuItem onClick={() => handleToggleActive(contextMenuUser)}>
                            <ToggleRight className="mr-2 h-4 w-4" /> Toggle Active
                        </ContextMenuItem>
                    </ContextMenuContent>
                )}
            </ContextMenu>

            {/* Add/Edit User Sheet (slide-out) */}
            <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
                <SheetContent side="right">
                    <SheetHeader>
                        <SheetTitle>{editId ? "Edit User" : "Create New User"}</SheetTitle>
                        <SheetDescription>{editId ? "Update user details." : "Add a new user to the system."}</SheetDescription>
                    </SheetHeader>
                    <form onSubmit={handleSubmit} className="flex flex-col gap-4 px-4 flex-1 overflow-y-auto">
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-2">
                                <Label>First Name</Label>
                                <Input value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} required />
                            </div>
                            <div className="space-y-2">
                                <Label>Last Name</Label>
                                <Input value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} required />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-2">
                                <Label>Email</Label>
                                <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
                            </div>
                            <div className="space-y-2">
                                <Label>Phone No.</Label>
                                <Input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Role</Label>
                            <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="student">Student</SelectItem>
                                    <SelectItem value="faculty">Faculty</SelectItem>
                                    <SelectItem value="head">Faculty Head</SelectItem>
                                    <SelectItem value="dean">Dean</SelectItem>
                                    <SelectItem value="admin">Admin</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        {!editId && (
                            <div className="space-y-2">
                                <Label>Password</Label>
                                <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={8} />
                            </div>
                        )}

                        {/* School / Department / Program section */}
                        <div className="border-t pt-4">
                            <div className="col-span-2 text-sm font-semibold text-muted-foreground">School & Department</div>
                            <div className="space-y-2">
                                <Label>School</Label>
                                <Select
                                    value={form._school || "none"}
                                    onValueChange={(v) => {
                                        const val = v === "none" ? "" : v;
                                        setForm({
                                            ...form,
                                            _school: val,
                                            department: "", // reset department when school changes
                                            student_profile: { ...form.student_profile, program: "" }, // reset program
                                        });
                                    }}
                                >
                                    <SelectTrigger><SelectValue placeholder="Select school" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">— None —</SelectItem>
                                        {schools.map((s) => (
                                            <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                                        ))}
                                        {schools.length === 0 && (
                                            <div className="px-2 py-1.5 text-xs text-muted-foreground">No schools yet.</div>
                                        )}
                                        <div className="border-t mt-1 pt-1 px-2 pb-1">
                                            <a href="/admin/schools" target="_blank" className="text-xs text-primary hover:underline">+ Add New School</a>
                                        </div>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Department</Label>
                                <Select
                                    value={form.department || "none"}
                                    onValueChange={(v) => {
                                        const val = v === "none" ? "" : v;
                                        setForm({
                                            ...form,
                                            department: val,
                                            student_profile: { ...form.student_profile, program: "" }, // reset program
                                        });
                                    }}
                                >
                                    <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">— None —</SelectItem>
                                        {formDepartments.map((d) => (
                                            <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                                        ))}
                                        {formDepartments.length === 0 && (
                                            <div className="px-2 py-1.5 text-xs text-muted-foreground">No departments for this school.</div>
                                        )}
                                        <div className="border-t mt-1 pt-1 px-2 pb-1">
                                            <a href="/admin/departments" target="_blank" className="text-xs text-primary hover:underline">+ Add New Department</a>
                                        </div>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Student Profile Fields */}
                        {form.role === "student" && (
                            <div className="grid grid-cols-2 gap-3 border-t pt-4">
                                <div className="col-span-2 text-sm font-semibold text-muted-foreground">Student Profile</div>
                                <div className="space-y-2">
                                    <Label>Program</Label>
                                    <Select
                                        value={form.student_profile.program || "none"}
                                        onValueChange={(v) => setForm({ ...form, student_profile: { ...form.student_profile, program: v === "none" ? "" : v } })}
                                    >
                                        <SelectTrigger><SelectValue placeholder="Select program" /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">— None —</SelectItem>
                                            {formPrograms.map((p) => (
                                                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Enrollment No.</Label>
                                    <Input value={form.student_profile.student_id_number} onChange={(e) => setForm({ ...form, student_profile: { ...form.student_profile, student_id_number: e.target.value } })} required />
                                </div>
                                <div className="space-y-2">
                                    <Label>Register No.</Label>
                                    <Input value={form.student_profile.register_no} onChange={(e) => setForm({ ...form, student_profile: { ...form.student_profile, register_no: e.target.value } })} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Semester</Label>
                                    <Input type="number" min={1} value={form.student_profile.current_semester} onChange={(e) => setForm({ ...form, student_profile: { ...form.student_profile, current_semester: parseInt(e.target.value) || 1 } })} required />
                                </div>
                                <div className="space-y-2">
                                    <Label>Batch / Division</Label>
                                    <div className="flex gap-2">
                                        <Input placeholder="Batch" value={form.student_profile.batch} onChange={(e) => setForm({ ...form, student_profile: { ...form.student_profile, batch: e.target.value } })} />
                                        <Input placeholder="Div" value={form.student_profile.division} onChange={(e) => setForm({ ...form, student_profile: { ...form.student_profile, division: e.target.value } })} />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Faculty Profile Fields (includes dean and head) */}
                        {["faculty", "dean", "head"].includes(form.role) && (
                            <div className="grid grid-cols-2 gap-3 border-t pt-4">
                                <div className="col-span-2 text-sm font-semibold text-muted-foreground">Faculty Profile</div>
                                <div className="space-y-2">
                                    <Label>Employee ID</Label>
                                    <Input value={form.faculty_profile.employee_id} onChange={(e) => setForm({ ...form, faculty_profile: { ...form.faculty_profile, employee_id: e.target.value } })} required />
                                </div>
                                <div className="space-y-2">
                                    <Label>Designation</Label>
                                    <Input value={form.faculty_profile.designation} onChange={(e) => setForm({ ...form, faculty_profile: { ...form.faculty_profile, designation: e.target.value } })} required />
                                </div>
                                <div className="space-y-2">
                                    <Label>Specialization</Label>
                                    <Input value={form.faculty_profile.specialization} onChange={(e) => setForm({ ...form, faculty_profile: { ...form.faculty_profile, specialization: e.target.value } })} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Joining Date</Label>
                                    <Input type="date" value={form.faculty_profile.joining_date} onChange={(e) => setForm({ ...form, faculty_profile: { ...form.faculty_profile, joining_date: e.target.value } })} required />
                                </div>
                            </div>
                        )}

                        <SheetFooter>
                            <Button type="submit" disabled={saving} className="w-full">
                                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {editId ? "Update User" : "Create User"}
                            </Button>
                        </SheetFooter>
                    </form>
                </SheetContent>
            </Sheet>

            {/* Reset Password Dialog */}
            <Dialog open={resetPwOpen} onOpenChange={setResetPwOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Reset Password</DialogTitle>
                        <DialogDescription>Set a new password for <span className="font-semibold text-foreground">{resetPwUserName}</span></DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="space-y-2">
                            <Label htmlFor="new-password">New Password</Label>
                            <div className="relative">
                                <Input
                                    id="new-password"
                                    type={showNewPw ? "text" : "password"}
                                    placeholder="Enter new password"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    className="pr-10"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowNewPw(!showNewPw)}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                >
                                    {showNewPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="confirm-password">Confirm Password</Label>
                            <Input
                                id="confirm-password"
                                type="password"
                                placeholder="Confirm new password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                            />
                            {confirmPassword && newPassword !== confirmPassword && (
                                <p className="text-xs text-red-500">Passwords do not match</p>
                            )}
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setResetPwOpen(false)}>Cancel</Button>
                        <Button
                            onClick={handleResetPassword}
                            disabled={resettingPw || newPassword.length < 6 || newPassword !== confirmPassword}
                        >
                            {resettingPw && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Reset Password
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
