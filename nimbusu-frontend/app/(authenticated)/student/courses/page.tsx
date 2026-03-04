"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { enrollmentsService } from "@/services/api";
import type { Enrollment } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { BookOpen } from "lucide-react";

export default function StudentCoursesPage() {
    const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetch() {
            try { const { data } = await enrollmentsService.mine(); setEnrollments(data.results ?? []); }
            catch { toast.error("Failed to load courses"); }
            finally { setLoading(false); }
        }
        fetch();
    }, []);

    if (loading) return <div className="space-y-4"><Skeleton className="h-8 w-48" /><div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14" />)}</div></div>;

    return (
        <div className="space-y-4">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">My Courses</h1>
                <p className="text-sm text-muted-foreground">Your enrolled courses this semester</p>
            </div>
            {enrollments.length === 0 ? (
                <div className="py-16 text-center text-muted-foreground"><BookOpen className="h-8 w-8 mx-auto mb-2 opacity-40" />No enrollments found.</div>
            ) : (
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {enrollments.map((e) => (
                        <Link key={e.id} href={`/student/courses/${e.course_offering}`}>
                            <div className="flex items-center gap-3 p-4 rounded-lg border border-transparent hover:border-border hover:bg-accent/30 transition-all cursor-pointer" style={{ borderRadius: "var(--radius-lg)" }}>
                                <div className="flex h-10 w-10 items-center justify-center rounded-lg shrink-0" style={{ background: "var(--primary)", borderRadius: "var(--radius)" }}>
                                    <BookOpen className="h-5 w-5" style={{ color: "var(--primary-foreground)" }} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">{e.course_name}</p>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        <Badge variant={e.status === "active" ? "default" : "secondary"} className="text-[10px] h-4 px-1.5">{e.status}</Badge>
                                        <span className="text-xs text-muted-foreground">Enrolled {new Date(e.enrolled_at).toLocaleDateString()}</span>
                                    </div>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}
