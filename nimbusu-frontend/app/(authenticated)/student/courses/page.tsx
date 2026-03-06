"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { enrollmentsService, offeringsService } from "@/services/api";
import type { Enrollment, CourseOffering } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { BookOpen, Plus, ShieldAlert } from "lucide-react";

export default function StudentCoursesPage() {
  const { user } = useAuth();
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [availableOfferings, setAvailableOfferings] = useState<
    CourseOffering[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [enrollingMap, setEnrollingMap] = useState<Record<string, boolean>>({});

  const fetchAll = async () => {
    try {
      setLoading(true);
      const [enrRes, offRes] = await Promise.all([
        enrollmentsService.mine(),
        offeringsService.list(),
      ]);
      setEnrollments(enrRes.data.results ?? enrRes.data ?? []);
      setAvailableOfferings(offRes.data.results ?? offRes.data ?? []);
    } catch (error) {
      toast.error("Failed to load course data");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const handleEnroll = async (offeringId: string) => {
    if (!user) return;
    setEnrollingMap((p) => ({ ...p, [offeringId]: true }));
    try {
      await enrollmentsService.create({
        student: user.id,
        course_offering: offeringId,
      });
      toast.success("Successfully enrolled!");
      fetchAll(); // Refresh lists
    } catch (error: any) {
      // Handle custom backend errors like Credit Limit or Prerequisites
      const errorMessage =
        error.response?.data?.detail ||
        error.response?.data?.non_field_errors?.[0] ||
        error.response?.data?.message ||
        "Enrollment failed";

      toast.error(errorMessage, {
        icon: <ShieldAlert className="h-4 w-4 text-rose-500" />,
        duration: 5000,
      });
      console.error("Enrollment error:", error.response?.data);
    } finally {
      setEnrollingMap((p) => ({ ...p, [offeringId]: false }));
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 pt-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  // Filter out offerings the student is already enrolled in
  const enrolledOfferingIds = new Set(
    enrollments.map((e) => e.course_offering),
  );
  const openOfferings = availableOfferings.filter(
    (o) => !enrolledOfferingIds.has(o.id),
  );

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-10">
      <Tabs defaultValue="my-courses" className="space-y-6">
        <TabsList>
          <TabsTrigger value="my-courses">My Courses</TabsTrigger>
          <TabsTrigger value="enroll">Available Courses</TabsTrigger>
        </TabsList>

        {/* MY COURSES TAB */}
        <TabsContent value="my-courses" className="space-y-4 outline-none">
          {enrollments.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground border rounded-xl border-dashed">
              <BookOpen className="h-8 w-8 mx-auto mb-3 opacity-40" />
              <p>You aren't enrolled in any courses yet.</p>
              <p className="text-sm mt-1">
                Switch to the Available Courses tab to enroll.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {enrollments.map((e) => (
                <Link key={e.id} href={`/student/courses/${e.course_offering}`}>
                  <div className="flex flex-col h-full gap-3 p-5 rounded-xl border border-transparent bg-card shadow-sm hover:border-border hover:shadow-md transition-all cursor-pointer">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center bg-primary/10 text-primary rounded-lg shrink-0">
                        <BookOpen className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold truncate leading-tight">
                          {e.course_name}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {e.status === "waitlisted"
                            ? "Waitlisted"
                            : "Active Enrollment"}
                        </p>
                      </div>
                    </div>
                    <div className="mt-auto pt-2 flex items-center justify-between">
                      <Badge
                        variant={
                          e.status === "active"
                            ? "default"
                            : e.status === "waitlisted"
                              ? "outline"
                              : "secondary"
                        }
                      >
                        {e.status}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground">
                        Enrolled {new Date(e.enrolled_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ENROLLMENT TAB */}
        <TabsContent value="enroll" className="space-y-4 outline-none">
          <div className="bg-muted/30 border rounded-xl p-4 mb-6">
            <h3 className="font-medium flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-blue-500" />
              Enrollment Rules
            </h3>
            <ul className="text-sm text-muted-foreground mt-2 space-y-1 list-disc list-inside">
              <li>You can only enroll up to your program's credit limit.</li>
              <li>
                You must have passed all prerequisites to enroll in advanced
                courses.
              </li>
              <li>If a course is full, you will be placed on a waitlist.</li>
            </ul>
          </div>

          {openOfferings.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground border rounded-xl border-dashed">
              <BookOpen className="h-8 w-8 mx-auto mb-3 opacity-40" />
              <p>No more courses available to enroll in.</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {openOfferings.map((o) => {
                const isFull = o.enrolled_count >= o.max_students;
                return (
                  <div
                    key={o.id}
                    className="flex flex-col h-full gap-4 p-5 rounded-xl border bg-card shadow-sm"
                  >
                    <div>
                      <div className="flex justify-between items-start gap-2 mb-1">
                        <h3 className="font-semibold leading-tight">
                          {o.course_name}
                        </h3>
                        <Badge variant="outline" className="shrink-0">
                          {o.course_code}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {o.faculty_name} • Section {o.section}
                      </p>
                    </div>

                    <div className="flex items-center justify-between text-sm mt-auto pt-4 border-t">
                      <span className="text-muted-foreground">
                        {o.enrolled_count} / {o.max_students} Students
                      </span>
                      <Button
                        size="sm"
                        variant={isFull ? "outline" : "default"}
                        disabled={enrollingMap[o.id]}
                        onClick={() => handleEnroll(o.id)}
                      >
                        {enrollingMap[o.id]
                          ? "Enrolling..."
                          : isFull
                            ? "Join Waitlist"
                            : "Enroll"}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
