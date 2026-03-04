"use client";

import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/lib/auth";
import api from "@/lib/api";
import { assignmentsService, attendanceService } from "@/services/api";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Calendar, ClipboardList, Clock, TrendingUp, TrendingDown, BarChart3, Target } from "lucide-react";
import type { TimetableEntry, Enrollment, Assignment } from "@/lib/types";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend, PieChart, Pie, Cell } from "recharts";

const COLORS = {
    primary: "hsl(var(--primary))",
    blue: "#6366f1",
    orange: "#f97316",
    emerald: "#10b981",
    rose: "#f43f5e",
    amber: "#f59e0b",
    cyan: "#06b6d4",
    purple: "#a855f7",
};

const PIE_COLORS = [COLORS.blue, COLORS.emerald, COLORS.orange, COLORS.rose, COLORS.amber, COLORS.cyan, COLORS.purple];

interface StatCardProps {
    label: string;
    value: string | number;
    change?: string;
    trend?: "up" | "down" | "neutral";
    icon: React.ElementType;
}

function StatCard({ label, value, change, trend, icon: Icon }: StatCardProps) {
    return (
        <div className="flex items-start justify-between p-4 rounded-xl border" style={{ borderRadius: "var(--radius-lg)" }}>
            <div className="space-y-1">
                <p className="text-xs text-muted-foreground font-medium">{label}</p>
                <p className="text-2xl font-bold tracking-tight">{value}</p>
                {change && (
                    <div className="flex items-center gap-1 text-xs">
                        {trend === "up" && <TrendingUp className="h-3 w-3 text-emerald-500" />}
                        {trend === "down" && <TrendingDown className="h-3 w-3 text-rose-500" />}
                        <span style={{ color: trend === "up" ? COLORS.emerald : trend === "down" ? COLORS.rose : undefined }}>{change}</span>
                    </div>
                )}
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted shrink-0" style={{ borderRadius: "var(--radius)" }}>
                <Icon className="h-5 w-5 text-muted-foreground" />
            </div>
        </div>
    );
}

export default function StudentDashboardPage() {
    const { user, isLoading: authLoading } = useAuth();
    const [timetable, setTimetable] = useState<TimetableEntry[]>([]);
    const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [attendanceData, setAttendanceData] = useState<Array<{ course_name: string; present: number; absent: number; total: number }>>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchData() {
            try {
                const [ttRes, enrRes, assRes] = await Promise.all([
                    api.get("/timetable/me/"),
                    api.get("/academics/enrollments/me/"),
                    api.get("/assignments/?ordering=-due_date"),
                ]);
                const tt = ttRes.data.results ?? ttRes.data ?? [];
                const enr: Enrollment[] = enrRes.data.results ?? enrRes.data ?? [];
                const ass: Assignment[] = assRes.data.results ?? assRes.data ?? [];
                setTimetable(tt);
                setEnrollments(enr);
                setAssignments(ass);

                // Fetch attendance per course
                const attArr: typeof attendanceData = [];
                for (const e of enr.slice(0, 8)) {
                    try {
                        const { data } = await attendanceService.myCourse(e.course_offering);
                        const records = data.results ?? data ?? [];
                        const present = records.filter((r: { status: string }) => r.status === "present" || r.status === "late").length;
                        const total = records.length;
                        attArr.push({ course_name: e.course_name?.split(" ").slice(0, 3).join(" ") ?? "Course", present, absent: total - present, total });
                    } catch { /* skip */ }
                }
                setAttendanceData(attArr);
            } catch { /* ignore */ }
            finally { setLoading(false); }
        }
        if (!authLoading) fetchData();
    }, [authLoading]);

    const today = new Date().getDay();
    const todayClasses = timetable.filter((e) => e.day_of_week === today);
    const now = new Date();
    const upcoming = assignments.filter((a) => new Date(a.due_date) > now).slice(0, 6);
    const overdue = assignments.filter((a) => new Date(a.due_date) < now).length;

    // Weekly schedule chart data
    const weeklySchedule = useMemo(() => {
        const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
        return days.map((day, i) => ({
            day,
            classes: timetable.filter((e) => e.day_of_week === i + 1).length,
        }));
    }, [timetable]);

    // Assignment type distribution
    const assignmentTypes = useMemo(() => {
        const map = new Map<string, number>();
        assignments.forEach((a) => map.set(a.assignment_type, (map.get(a.assignment_type) || 0) + 1));
        return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
    }, [assignments]);

    // Attendance bar chart data
    const attendanceChartData = useMemo(() => {
        return attendanceData.map((d) => ({
            name: d.course_name.length > 15 ? d.course_name.slice(0, 15) + "…" : d.course_name,
            Present: d.present,
            Absent: d.absent,
            rate: d.total > 0 ? Math.round((d.present / d.total) * 100) : 0,
        }));
    }, [attendanceData]);

    const overallAttendance = useMemo(() => {
        const totalPresent = attendanceData.reduce((s, d) => s + d.present, 0);
        const totalAll = attendanceData.reduce((s, d) => s + d.total, 0);
        return totalAll > 0 ? Math.round((totalPresent / totalAll) * 100) : 0;
    }, [attendanceData]);

    if (authLoading || loading) {
        return (
            <div className="space-y-6">
                <Skeleton className="h-8 w-64" />
                <div className="grid gap-3 grid-cols-2 md:grid-cols-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" style={{ borderRadius: "var(--radius-lg)" }} />)}</div>
                <div className="grid gap-4 md:grid-cols-2"><Skeleton className="h-72" style={{ borderRadius: "var(--radius-lg)" }} /><Skeleton className="h-72" style={{ borderRadius: "var(--radius-lg)" }} /></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
                    <p className="text-sm text-muted-foreground">Welcome back, {user?.first_name}! Here&apos;s your academic overview.</p>
                </div>
                <span className="text-xs text-muted-foreground">{new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}</span>
            </div>

            {/* Stat Cards */}
            <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
                <StatCard label="Today's Classes" value={todayClasses.length} change={`${timetable.length} total / week`} trend="neutral" icon={Calendar} />
                <StatCard label="Enrolled Courses" value={enrollments.length} change="This semester" trend="neutral" icon={BookOpen} />
                <StatCard label="Attendance Rate" value={`${overallAttendance}%`} change={overallAttendance >= 75 ? "On track" : "Below 75%"} trend={overallAttendance >= 75 ? "up" : "down"} icon={Target} />
                <StatCard label="Upcoming" value={upcoming.length} change={overdue > 0 ? `${overdue} overdue` : "All on time"} trend={overdue > 0 ? "down" : "up"} icon={ClipboardList} />
            </div>

            {/* Charts Row 1 */}
            <div className="grid gap-4 md:grid-cols-5">
                {/* Attendance bar chart — wider */}
                <div className="md:col-span-3 rounded-xl border p-4" style={{ borderRadius: "var(--radius-lg)" }}>
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h3 className="text-sm font-semibold">Attendance Overview</h3>
                            <p className="text-xs text-muted-foreground">Present vs Absent by course</p>
                        </div>
                        <div className="flex items-center gap-3 text-xs">
                            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full" style={{ background: COLORS.blue }} /> Present</span>
                            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full" style={{ background: COLORS.orange }} /> Absent</span>
                        </div>
                    </div>
                    {attendanceChartData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={240}>
                            <BarChart data={attendanceChartData} barGap={2} barCategoryGap="20%">
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                                <XAxis dataKey="name" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                                <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                                <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid var(--border)", fontSize: 12, background: "var(--popover)", color: "var(--popover-foreground)" }} />
                                <Bar dataKey="Present" fill={COLORS.blue} radius={[4, 4, 0, 0]} />
                                <Bar dataKey="Absent" fill={COLORS.orange} radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : <p className="text-sm text-muted-foreground h-60 flex items-center justify-center">No attendance data available yet.</p>}
                </div>

                {/* Right side — stat cards stack */}
                <div className="md:col-span-2 grid gap-3 grid-cols-2">
                    {attendanceData.slice(0, 4).map((d) => {
                        const rate = d.total > 0 ? Math.round((d.present / d.total) * 100) : 0;
                        return (
                            <div key={d.course_name} className="rounded-xl border p-3 space-y-2" style={{ borderRadius: "var(--radius-lg)" }}>
                                <p className="text-xs text-muted-foreground font-medium truncate">{d.course_name}</p>
                                <p className="text-xl font-bold">{rate}%</p>
                                <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
                                    <div className="h-full rounded-full transition-all" style={{ width: `${rate}%`, background: rate >= 75 ? COLORS.emerald : COLORS.rose }} />
                                </div>
                                <p className="text-[10px] text-muted-foreground">{d.present}/{d.total} classes</p>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Charts Row 2 */}
            <div className="grid gap-4 md:grid-cols-2">
                {/* Weekly Schedule */}
                <div className="rounded-xl border p-4" style={{ borderRadius: "var(--radius-lg)" }}>
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h3 className="text-sm font-semibold">Weekly Class Load</h3>
                            <p className="text-xs text-muted-foreground">Classes per day</p>
                        </div>
                        <Badge variant="secondary" className="text-[10px]">{timetable.length} / week</Badge>
                    </div>
                    <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={weeklySchedule} barCategoryGap="30%">
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                            <XAxis dataKey="day" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                            <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
                            <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid var(--border)", fontSize: 12, background: "var(--popover)", color: "var(--popover-foreground)" }} />
                            <Bar dataKey="classes" fill={COLORS.blue} radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Assignment type donut + today's schedule */}
                <div className="rounded-xl border p-4" style={{ borderRadius: "var(--radius-lg)" }}>
                    <div className="flex items-center justify-between mb-3">
                        <div>
                            <h3 className="text-sm font-semibold flex items-center gap-2"><Clock className="h-4 w-4" style={{ color: COLORS.blue }} /> Today&apos;s Classes</h3>
                        </div>
                    </div>
                    {todayClasses.length === 0 ? (
                        <p className="text-sm text-muted-foreground py-8 text-center">No classes today 🎉</p>
                    ) : (
                        <div className="space-y-0.5 max-h-[200px] overflow-y-auto">
                            {todayClasses.sort((a, b) => a.start_time.localeCompare(b.start_time)).map((entry, i) => (
                                <div key={entry.id} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-accent/30 transition-colors" style={{ borderRadius: "var(--radius)" }}>
                                    <div className="w-1 h-8 rounded-full shrink-0" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium truncate">{entry.course_name}</p>
                                        <p className="text-xs text-muted-foreground">{entry.location} · {entry.faculty_name}</p>
                                    </div>
                                    <span className="text-xs font-mono text-muted-foreground shrink-0">{entry.start_time?.substring(0, 5)}–{entry.end_time?.substring(0, 5)}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Bottom section */}
            <div className="grid gap-4 md:grid-cols-5">
                {/* Upcoming Deadlines */}
                <div className="md:col-span-3 rounded-xl border p-4" style={{ borderRadius: "var(--radius-lg)" }}>
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-semibold flex items-center gap-2"><ClipboardList className="h-4 w-4" style={{ color: COLORS.blue }} /> Upcoming Deadlines</h3>
                        <Badge variant="secondary" className="text-[10px]">{upcoming.length} pending</Badge>
                    </div>
                    {upcoming.length === 0 ? (
                        <p className="text-sm text-muted-foreground py-6 text-center">All caught up! 🎉</p>
                    ) : (
                        <div className="space-y-0.5">
                            {upcoming.map((a) => {
                                const daysLeft = Math.ceil((new Date(a.due_date).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                                return (
                                    <div key={a.id} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-accent/30 transition-colors" style={{ borderRadius: "var(--radius)" }}>
                                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted shrink-0" style={{ borderRadius: "var(--radius)" }}>
                                            <ClipboardList className="h-4 w-4 text-muted-foreground" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium truncate">{a.title}</p>
                                            <p className="text-xs text-muted-foreground">{a.course_name} · {a.max_marks} marks</p>
                                        </div>
                                        <Badge variant={daysLeft <= 2 ? "destructive" : "secondary"} className="text-[10px] h-5 px-1.5 shrink-0">
                                            {daysLeft <= 0 ? "Due today" : `${daysLeft}d left`}
                                        </Badge>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Assignment breakdown donut */}
                <div className="md:col-span-2 rounded-xl border p-4 self-start" style={{ borderRadius: "var(--radius-lg)" }}>
                    <h3 className="text-sm font-semibold mb-2">Assignment Types</h3>
                    {assignmentTypes.length === 0 ? (
                        <p className="text-sm text-muted-foreground py-8 text-center">No assignments</p>
                    ) : (
                        <>
                            <ResponsiveContainer width="100%" height={160}>
                                <PieChart>
                                    <Pie data={assignmentTypes} cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={3} dataKey="value" stroke="none">
                                        {assignmentTypes.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                                    </Pie>
                                    <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid var(--border)", fontSize: 12, background: "var(--popover)", color: "var(--popover-foreground)" }} />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="flex flex-wrap gap-2 justify-center mt-2">
                                {assignmentTypes.map((t, i) => (
                                    <span key={t.name} className="flex items-center gap-1 text-xs text-muted-foreground">
                                        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                                        {t.name} ({t.value})
                                    </span>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
