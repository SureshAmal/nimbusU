"use client";

import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/lib/auth";
import api from "@/lib/api";
import { assignmentsService, attendanceService, offeringsService } from "@/services/api";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Calendar, ClipboardList, Clock, TrendingUp, TrendingDown, Users, Target } from "lucide-react";
import type { TimetableEntry, Assignment, CourseOffering } from "@/lib/types";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const COLORS = {
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

export default function FacultyDashboardPage() {
    const { user, isLoading: authLoading } = useAuth();
    const [timetable, setTimetable] = useState<TimetableEntry[]>([]);
    const [offerings, setOfferings] = useState<CourseOffering[]>([]);
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [pendingGrades, setPendingGrades] = useState(0);
    const [totalSubmissions, setTotalSubmissions] = useState(0);
    const [gradedSubmissions, setGradedSubmissions] = useState(0);
    const [courseStudentCounts, setCourseStudentCounts] = useState<Array<{ name: string; students: number }>>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchData() {
            try {
                const [ttRes, offRes, assRes] = await Promise.all([
                    api.get("/timetable/me/"),
                    offeringsService.list(),
                    assignmentsService.list(),
                ]);
                const tt: TimetableEntry[] = ttRes.data.results ?? ttRes.data ?? [];
                const off: CourseOffering[] = offRes.data.results ?? [];
                const ass: Assignment[] = assRes.data.results ?? [];
                setTimetable(tt);
                setOfferings(off);
                setAssignments(ass);

                // Fetch student counts per course
                const counts: typeof courseStudentCounts = [];
                for (const o of off.slice(0, 8)) {
                    try {
                        const { data } = await api.get(`/academics/offerings/${o.id}/students/`);
                        const students = Array.isArray(data) ? data : (data.results ?? data.data ?? []);
                        counts.push({
                            name: (o.course_name || "Course").split(" ").slice(0, 3).join(" "),
                            students: students.length,
                        });
                    } catch { counts.push({ name: o.course_name || "Course", students: o.enrolled_count ?? 0 }); }
                }
                setCourseStudentCounts(counts);

                // Fetch submission stats
                let pending = 0;
                let totalSubs = 0;
                let graded = 0;
                for (const a of ass) {
                    if (a.submission_count > 0) {
                        try {
                            const { data } = await assignmentsService.submissions(a.id);
                            const subs = data.results ?? [];
                            totalSubs += subs.length;
                            const gradedCount = subs.filter((s: { status: string }) => s.status === "graded").length;
                            graded += gradedCount;
                            pending += subs.length - gradedCount;
                        } catch { /* skip */ }
                    }
                }
                setPendingGrades(pending);
                setTotalSubmissions(totalSubs);
                setGradedSubmissions(graded);
            } catch { /* ignore */ }
            finally { setLoading(false); }
        }
        if (!authLoading) fetchData();
    }, [authLoading]);

    const today = new Date().getDay();
    const todayClasses = timetable.filter((e) => e.day_of_week === today);

    // Weekly schedule
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

    const gradingRate = totalSubmissions > 0 ? Math.round((gradedSubmissions / totalSubmissions) * 100) : 0;

    if (authLoading || loading) {
        return (
            <div className="space-y-6">
                <Skeleton className="h-8 w-64" />
                <div className="grid gap-3 grid-cols-2 md:grid-cols-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" style={{ borderRadius: "var(--radius-lg)" }} />)}</div>
                <div className="grid gap-4 md:grid-cols-2"><Skeleton className="h-72" style={{ borderRadius: "var(--radius-lg)" }} /><Skeleton className="h-72" style={{ borderRadius: "var(--radius-lg)" }} /></div>
            </div>
        );
    }

    const totalStudents = courseStudentCounts.reduce((s, c) => s + c.students, 0);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
                    <p className="text-sm text-muted-foreground">Welcome, {user?.first_name}. Here&apos;s your teaching overview.</p>
                </div>
                <span className="text-xs text-muted-foreground">{new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}</span>
            </div>

            {/* Stat Cards */}
            <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
                <StatCard label="Today's Classes" value={todayClasses.length} change={`${timetable.length} total / week`} trend="neutral" icon={Calendar} />
                <StatCard label="Total Courses" value={offerings.length} change={`${totalStudents} students`} trend="neutral" icon={BookOpen} />
                <StatCard label="Grading Rate" value={`${gradingRate}%`} change={`${gradedSubmissions}/${totalSubmissions} graded`} trend={gradingRate >= 80 ? "up" : "down"} icon={Target} />
                <StatCard label="Pending Grades" value={pendingGrades} change={pendingGrades === 0 ? "All caught up!" : "Needs attention"} trend={pendingGrades === 0 ? "up" : "down"} icon={ClipboardList} />
            </div>

            {/* Charts Row 1 */}
            <div className="grid gap-4 md:grid-cols-5">
                {/* Students per course bar chart */}
                <div className="md:col-span-3 rounded-xl border p-4" style={{ borderRadius: "var(--radius-lg)" }}>
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h3 className="text-sm font-semibold">Students per Course</h3>
                            <p className="text-xs text-muted-foreground">Enrollment distribution</p>
                        </div>
                        <Badge variant="secondary" className="text-[10px]">{totalStudents} total</Badge>
                    </div>
                    {courseStudentCounts.length > 0 ? (
                        <ResponsiveContainer width="100%" height={240}>
                            <BarChart data={courseStudentCounts} barCategoryGap="20%">
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                                <XAxis dataKey="name" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                                <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
                                <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid var(--border)", fontSize: 12, background: "var(--popover)", color: "var(--popover-foreground)" }} />
                                <Bar dataKey="students" fill={COLORS.blue} radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : <p className="text-sm text-muted-foreground h-60 flex items-center justify-center">No course data available.</p>}
                </div>

                {/* Grading progress + quick stats */}
                <div className="md:col-span-2 space-y-3">
                    {/* Grading progress */}
                    <div className="rounded-xl border p-4 space-y-3" style={{ borderRadius: "var(--radius-lg)" }}>
                        <h3 className="text-sm font-semibold">Grading Progress</h3>
                        <div className="space-y-3">
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">Graded</span>
                                <span className="font-semibold">{gradedSubmissions}</span>
                            </div>
                            <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                                <div className="h-full rounded-full transition-all" style={{ width: `${gradingRate}%`, background: COLORS.emerald }} />
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">Pending</span>
                                <span className="font-semibold" style={{ color: pendingGrades > 0 ? COLORS.orange : undefined }}>{pendingGrades}</span>
                            </div>
                            <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                                <div className="h-full rounded-full transition-all" style={{ width: totalSubmissions > 0 ? `${Math.round((pendingGrades / totalSubmissions) * 100)}%` : "0%", background: COLORS.orange }} />
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">Total Submissions</span>
                                <span className="font-semibold">{totalSubmissions}</span>
                            </div>
                        </div>
                    </div>

                    {/* Assignment types donut */}
                    <div className="rounded-xl border p-4 self-start" style={{ borderRadius: "var(--radius-lg)" }}>
                        <h3 className="text-sm font-semibold mb-2">Assignment Types</h3>
                        {assignmentTypes.length === 0 ? (
                            <p className="text-xs text-muted-foreground py-4 text-center">No assignments</p>
                        ) : (
                            <>
                                <ResponsiveContainer width="100%" height={120}>
                                    <PieChart>
                                        <Pie data={assignmentTypes} cx="50%" cy="50%" innerRadius={30} outerRadius={50} paddingAngle={3} dataKey="value" stroke="none">
                                            {assignmentTypes.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                                        </Pie>
                                        <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid var(--border)", fontSize: 12, background: "var(--popover)", color: "var(--popover-foreground)" }} />
                                    </PieChart>
                                </ResponsiveContainer>
                                <div className="flex flex-wrap gap-2 justify-center">
                                    {assignmentTypes.map((t, i) => (
                                        <span key={t.name} className="flex items-center gap-1 text-[10px] text-muted-foreground">
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

            {/* Bottom Row */}
            <div className="grid gap-4 md:grid-cols-2">
                {/* Weekly Schedule */}
                <div className="rounded-xl border p-4" style={{ borderRadius: "var(--radius-lg)" }}>
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h3 className="text-sm font-semibold">Weekly Class Load</h3>
                            <p className="text-xs text-muted-foreground">Your teaching schedule</p>
                        </div>
                        <Badge variant="secondary" className="text-[10px]">{timetable.length} / week</Badge>
                    </div>
                    <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={weeklySchedule} barCategoryGap="30%">
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                            <XAxis dataKey="day" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                            <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
                            <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid var(--border)", fontSize: 12, background: "var(--popover)", color: "var(--popover-foreground)" }} />
                            <Bar dataKey="classes" fill={COLORS.purple} radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Today's Schedule */}
                <div className="rounded-xl border p-4" style={{ borderRadius: "var(--radius-lg)" }}>
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-semibold flex items-center gap-2"><Clock className="h-4 w-4" style={{ color: COLORS.blue }} /> Today&apos;s Schedule</h3>
                        <Badge variant="secondary" className="text-[10px]">{todayClasses.length} classes</Badge>
                    </div>
                    {todayClasses.length === 0 ? (
                        <p className="text-sm text-muted-foreground py-8 text-center">No classes today</p>
                    ) : (
                        <div className="space-y-0.5 max-h-[200px] overflow-y-auto">
                            {todayClasses.sort((a, b) => a.start_time.localeCompare(b.start_time)).map((entry, i) => (
                                <div key={entry.id} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-accent/30 transition-colors" style={{ borderRadius: "var(--radius)" }}>
                                    <div className="w-1 h-8 rounded-full shrink-0" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium truncate">{entry.course_name}</p>
                                        <p className="text-xs text-muted-foreground">{entry.location}</p>
                                    </div>
                                    <span className="text-xs font-mono text-muted-foreground shrink-0">{entry.start_time?.substring(0, 5)}–{entry.end_time?.substring(0, 5)}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
