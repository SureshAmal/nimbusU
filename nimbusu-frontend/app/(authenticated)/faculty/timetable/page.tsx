"use client";

import { useEffect, useState } from "react";
import { timetableService } from "@/services/api";
import type { TimetableEntry } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Clock, MapPin } from "lucide-react";

const DAYS = ["", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const TYPE_COLORS: Record<string, string> = {
    classroom: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    lab: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    tutorial: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
};

const BORDER_COLORS: Record<string, string> = {
    classroom: "var(--color-blue-500)",
    lab: "var(--color-emerald-500)",
    tutorial: "var(--color-amber-500)",
};

export default function FacultyTimetablePage() {
    const [entries, setEntries] = useState<TimetableEntry[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetch() {
            try {
                const { data } = await timetableService.mine();
                setEntries(Array.isArray(data) ? data : []);
            } catch { toast.error("Failed to load timetable"); }
            finally { setLoading(false); }
        }
        fetch();
    }, []);

    if (loading) return <div className="space-y-6"><Skeleton className="h-8 w-48" /><Skeleton className="h-[400px]" style={{ borderRadius: "var(--radius-lg)" }} /></div>;

    const byDay = DAYS.slice(1).map((day, i) => ({
        day,
        entries: entries.filter((e) => e.day_of_week === i + 1).sort((a, b) => a.start_time.localeCompare(b.start_time)),
    }));

    return (
        <div className="space-y-6">
            <div><h1 className="text-2xl font-bold tracking-tight">My Schedule</h1><p className="text-muted-foreground text-sm">Your weekly teaching timetable</p></div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {byDay.map(({ day, entries: dayEntries }) => (
                    <Card key={day} style={{ boxShadow: "var(--shadow-sm)", borderRadius: "var(--radius-lg)" }}>
                        <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">{day}</CardTitle></CardHeader>
                        <CardContent className="space-y-2">
                            {dayEntries.length === 0 ? (
                                <p className="text-xs text-muted-foreground">No classes</p>
                            ) : dayEntries.map((e) => (
                                <div key={e.id} className="flex items-start gap-3 border-l-3 pl-3 py-1.5" style={{ borderColor: BORDER_COLORS[e.subject_type] ?? BORDER_COLORS.classroom }}>
                                    <Clock className="h-3.5 w-3.5 shrink-0 mt-0.5" style={{ color: "var(--muted-foreground)" }} />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <p className="text-sm font-medium truncate">{e.course_name}</p>
                                            <Badge variant="secondary" className={`text-[10px] px-1.5 py-0 h-4 ${TYPE_COLORS[e.subject_type] ?? ""}`}>
                                                {e.subject_type_display}
                                            </Badge>
                                        </div>
                                        <p className="text-xs text-muted-foreground">{e.start_time.substring(0, 5)} – {e.end_time.substring(0, 5)} · Batch {e.batch}</p>
                                        {e.location && (
                                            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                                <MapPin className="h-3 w-3" />{e.location}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
