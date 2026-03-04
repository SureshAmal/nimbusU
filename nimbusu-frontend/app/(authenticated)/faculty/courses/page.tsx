"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import api from "@/lib/api";
import type { CourseOffering } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { BookOpen, Users } from "lucide-react";

export default function FacultyCoursesPage() {
    const [offerings, setOfferings] = useState<CourseOffering[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetch() {
            try { const { data } = await api.get("/academics/offerings/"); setOfferings(data.results ?? []); }
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
                <p className="text-sm text-muted-foreground">Courses you are teaching this semester</p>
            </div>
            {offerings.length === 0 ? (
                <div className="py-16 text-center text-muted-foreground"><BookOpen className="h-8 w-8 mx-auto mb-2 opacity-40" />No courses assigned.</div>
            ) : (
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {offerings.map((o) => (
                        <Link key={o.id} href={`/faculty/courses/${o.id}`}>
                            <div className="flex items-start gap-3 p-4 rounded-lg border border-transparent hover:border-border hover:bg-accent/30 transition-all cursor-pointer" style={{ borderRadius: "var(--radius-lg)" }}>
                                <div className="flex h-10 w-10 items-center justify-center rounded-lg shrink-0" style={{ background: "var(--primary)", borderRadius: "var(--radius)" }}>
                                    <BookOpen className="h-5 w-5" style={{ color: "var(--primary-foreground)" }} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">{o.course_name}</p>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        <Badge variant="secondary" className="text-[10px] h-3.5 px-1">{o.course_code}</Badge>
                                        <span className="text-xs text-muted-foreground flex items-center gap-1"><Users className="h-3 w-3" /> {o.enrolled_count}/{o.max_students}</span>
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-0.5">Section {o.section} · {o.semester_name}</p>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}
