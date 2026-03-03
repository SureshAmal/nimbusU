"use client";
import { useEffect, useState, useMemo } from "react";
import { timetableService } from "@/services/api";
import type { TimetableEntry } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { semestersService } from "@/services/api";
import type { Semester } from "@/lib/types";
import { EventCalendar, CalendarEvent } from "@/components/application/calendar";
import { parse, setDay, startOfWeek, addWeeks } from "date-fns";

const SUBJECT_COLORS: Record<string, string> = {
    classroom: "bg-blue-500/15 text-blue-700 border-blue-300 dark:text-blue-300 dark:border-blue-600",
    lab: "bg-emerald-500/15 text-emerald-700 border-emerald-300 dark:text-emerald-300 dark:border-emerald-600",
    tutorial: "bg-amber-500/15 text-amber-700 border-amber-300 dark:text-amber-300 dark:border-amber-600",
};

// A helper to generate instances of a timetable entry across weeks
function generateEventsForEntry(entry: TimetableEntry, baseDate: Date, weeksBefore: number, weeksAfter: number): CalendarEvent[] {
    const events: CalendarEvent[] = [];
    const baseWeekStart = startOfWeek(baseDate, { weekStartsOn: 0 }); // Sunday start

    let targetDayIndex = entry.day_of_week;
    if (targetDayIndex === 7) targetDayIndex = 0;

    for (let i = -weeksBefore; i <= weeksAfter; i++) {
        const weekStart = addWeeks(baseWeekStart, i);
        const eventDate = setDay(weekStart, targetDayIndex, { weekStartsOn: 0 });

        const startTimeStr = entry.start_time.substring(0, 5);
        const endTimeStr = entry.end_time.substring(0, 5);

        const start = parse(startTimeStr, "HH:mm", eventDate);
        const end = parse(endTimeStr, "HH:mm", eventDate);

        events.push({
            id: `${entry.id}-${eventDate.toISOString()}`,
            title: entry.course_name,
            start,
            end,
            color: SUBJECT_COLORS[entry.subject_type] ?? SUBJECT_COLORS.classroom,
            extendedProps: {
                description: `${entry.location} • ${entry.faculty_name} • ${entry.subject_type_display}`,
                entry,
            },
        });
    }

    return events;
}

export default function AdminTimetablePage() {
    const [entries, setEntries] = useState<TimetableEntry[]>([]);
    const [semesters, setSemesters] = useState<Semester[]>([]);
    const [semesterFilter, setSemesterFilter] = useState<string>("all");
    const [batchFilter, setBatchFilter] = useState<string>("");
    const [subjectTypeFilter, setSubjectTypeFilter] = useState<string>("all");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchInitialData() {
            try {
                const [timetableRes, semestersRes] = await Promise.all([
                    timetableService.list(),
                    semestersService.list()
                ]);
                setEntries(timetableRes.data.results ?? []);
                setSemesters(semestersRes.data.results ?? []);
            } catch { toast.error("Failed to load initial data"); }
            finally { setLoading(false); }
        }
        fetchInitialData();
    }, []);

    // Unique batches from loaded entries
    const batches = useMemo(() => {
        const set = new Set(entries.map((e) => e.batch).filter(Boolean));
        return Array.from(set).sort();
    }, [entries]);

    // Effect to refetch timetable when filters change
    useEffect(() => {
        if (loading) return;
        async function fetchFiltered() {
            try {
                const params: Record<string, string> = {};
                if (semesterFilter !== "all") params.semester = semesterFilter;
                if (batchFilter) params.batch = batchFilter;
                if (subjectTypeFilter !== "all") params.subject_type = subjectTypeFilter;

                const { data } = await timetableService.list(params);
                setEntries(data.results ?? []);
            } catch { toast.error("Failed to apply filters"); }
        }

        const timeoutId = setTimeout(() => {
            fetchFiltered();
        }, 300);

        return () => clearTimeout(timeoutId);
    }, [semesterFilter, batchFilter, subjectTypeFilter]);

    // Generate event instances for a 20-week window (-10 to +10 weeks around today)
    const calendarEvents = useMemo(() => {
        const today = new Date();
        const allEvents: CalendarEvent[] = [];
        entries.forEach(entry => {
            const entryEvents = generateEventsForEntry(entry, today, 10, 10);
            allEvents.push(...entryEvents);
        });
        return allEvents;
    }, [entries]);

    if (loading) {
        return (
            <div className="space-y-6 h-[800px] flex flex-col">
                <div>
                    <Skeleton className="h-8 w-64 mb-2" />
                    <Skeleton className="h-4 w-96" />
                </div>
                <Skeleton className="flex-1 w-full rounded-lg" />
            </div>
        );
    }

    return (
        <div className="flex flex-col h-[calc(100vh-8rem)] min-h-[700px] space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Timetable Management</h1>
                    <p className="text-muted-foreground text-sm">View and manage class schedules across the semester.</p>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                    <Select value={semesterFilter} onValueChange={setSemesterFilter}>
                        <SelectTrigger className="w-[180px] h-9">
                            <SelectValue placeholder="All Semesters" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Semesters</SelectItem>
                            {semesters.map(sem => (
                                <SelectItem key={sem.id} value={sem.id}>{sem.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Select value={batchFilter || "all"} onValueChange={(v) => setBatchFilter(v === "all" ? "" : v)}>
                        <SelectTrigger className="w-[150px] h-9">
                            <SelectValue placeholder="All Batches" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Batches</SelectItem>
                            {batches.map(b => (
                                <SelectItem key={b} value={b}>{b}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Select value={subjectTypeFilter} onValueChange={setSubjectTypeFilter}>
                        <SelectTrigger className="w-[160px] h-9">
                            <SelectValue placeholder="All Types" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Types</SelectItem>
                            <SelectItem value="classroom">Classroom</SelectItem>
                            <SelectItem value="lab">Laboratory</SelectItem>
                            <SelectItem value="tutorial">Tutorial</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Legend */}
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5"><span className="inline-block w-3 h-3 rounded-sm bg-blue-500/30 border border-blue-300" /> Classroom</span>
                <span className="flex items-center gap-1.5"><span className="inline-block w-3 h-3 rounded-sm bg-emerald-500/30 border border-emerald-300" /> Lab</span>
                <span className="flex items-center gap-1.5"><span className="inline-block w-3 h-3 rounded-sm bg-amber-500/30 border border-amber-300" /> Tutorial</span>
            </div>

            <div className="flex-1 min-h-0 bg-card rounded-lg border border-border p-4 shadow-sm">
                <EventCalendar
                    events={calendarEvents}
                    onEventClick={(event) => toast.info(`Clicked: ${event.title}`)}
                    onAddEvent={() => toast.info("Add event functionality coming soon")}
                />
            </div>
        </div>
    );
}
