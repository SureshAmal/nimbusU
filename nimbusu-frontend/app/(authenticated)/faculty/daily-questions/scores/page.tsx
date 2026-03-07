"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePageHeader } from "@/lib/page-header";
import { dailyQuestionsService, offeringsService } from "@/services/api";
import type {
  CourseOffering,
  FacultyDailyQuestionStudentScore,
} from "@/lib/types";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  ArrowLeft,
  BarChart3,
  Clock3,
  Flame,
  Search,
  Target,
  Trophy,
  Users,
} from "lucide-react";

function getInitials(name: string) {
  return name
    .split(" ")
    .map((word) => word[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function formatDuration(seconds: number) {
  if (!seconds) return "—";
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (!minutes) return `${remainingSeconds}s`;
  return `${minutes}m ${remainingSeconds}s`;
}

export default function FacultyDailyQuestionScoresPage() {
  const { setHeader } = usePageHeader();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<FacultyDailyQuestionStudentScore[]>([]);
  const [offerings, setOfferings] = useState<CourseOffering[]>([]);
  const [selectedCourse, setSelectedCourse] = useState("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    setHeader({
      title: "Daily Question Scores",
      subtitle: "Track student performance across your daily questions",
      backUrl: "/faculty/daily-questions",
    });
    return () => setHeader(null);
  }, [setHeader]);

  useEffect(() => {
    loadData(selectedCourse);
  }, [selectedCourse]);

  async function loadData(courseOffering: string) {
    setLoading(true);
    try {
      const [scoresRes, offeringsRes] = await Promise.all([
        dailyQuestionsService.studentScores(
          courseOffering !== "all" ? { course_offering: courseOffering } : undefined,
        ),
        offeringsService.list({ limit: "100" }),
      ]);
      setRows(scoresRes.data ?? []);
      setOfferings(offeringsRes.data.results ?? offeringsRes.data ?? []);
    } catch {
      toast.error("Failed to load student scores");
    } finally {
      setLoading(false);
    }
  }

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return rows;
    return rows.filter((row) =>
      [
        row.student_name,
        row.email,
        row.batch ?? "",
        row.division ?? "",
        row.course_names.join(" "),
      ]
        .join(" ")
        .toLowerCase()
        .includes(query),
    );
  }, [rows, search]);

  const summary = useMemo(() => {
    const activeStudents = filteredRows.length;
    const totalPoints = filteredRows.reduce(
      (sum, row) => sum + row.total_points_earned,
      0,
    );
    const totalSubmitted = filteredRows.reduce(
      (sum, row) => sum + row.total_submitted,
      0,
    );
    const avgAccuracy = activeStudents
      ? Math.round(
          filteredRows.reduce((sum, row) => sum + row.accuracy_rate, 0) /
            activeStudents,
        )
      : 0;
    const topStreak = Math.max(
      ...filteredRows.map((row) => row.longest_streak),
      0,
    );

    return { activeStudents, totalPoints, totalSubmitted, avgAccuracy, topStreak };
  }, [filteredRows]);

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col gap-4 overflow-hidden">
      <div className="flex shrink-0 flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/faculty/daily-questions">
              <ArrowLeft className="mr-1 h-4 w-4" /> Back to Questions
            </Link>
          </Button>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative min-w-[250px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search student, batch, or course"
              className="pl-9"
            />
          </div>
          <Select value={selectedCourse} onValueChange={setSelectedCourse}>
            <SelectTrigger className="min-w-[220px]">
              <SelectValue placeholder="Filter by course" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All courses</SelectItem>
              {offerings.map((offering) => (
                <SelectItem key={offering.id} value={offering.id}>
                  {offering.course_code} · {offering.course_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading ? (
        <div className="min-h-0 flex-1 space-y-4 overflow-hidden">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-24" />
            ))}
          </div>
          <Skeleton className="h-full min-h-[420px]" />
        </div>
      ) : (
        <>
          <div className="grid shrink-0 gap-2 sm:grid-cols-2 xl:grid-cols-4 sm:gap-3">
            {[
              {
                label: "Students tracked",
                value: summary.activeStudents,
                icon: Users,
              },
              {
                label: "Points earned",
                value: summary.totalPoints,
                icon: Trophy,
              },
              {
                label: "Average accuracy",
                value: `${summary.avgAccuracy}%`,
                icon: Target,
              },
              {
                label: "Top streak",
                value: `${summary.topStreak} days`,
                icon: Flame,
              },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-lg border p-3 sm:p-4"
                style={{ borderRadius: "var(--radius)" }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground">{item.label}</p>
                    <p className="mt-1 text-xl font-bold sm:text-2xl">{item.value}</p>
                  </div>
                  <item.icon className="h-4 w-4 text-muted-foreground sm:h-5 sm:w-5" />
                </div>
              </div>
            ))}
          </div>

          {filteredRows.length === 0 ? (
            <div className="flex min-h-0 flex-1 items-center justify-center rounded-lg border border-dashed py-16 text-center text-muted-foreground">
              <BarChart3 className="mx-auto mb-3 h-10 w-10 opacity-40" />
              No student score data found.
            </div>
          ) : (
            <div
              className="min-h-0 flex-1 overflow-hidden rounded-xl border"
              style={{ borderRadius: "var(--radius-lg)" }}
            >
              <div className="h-full overflow-auto">
                <div className="sticky top-0 z-10 grid grid-cols-[minmax(320px,1.4fr)_110px_110px_100px_110px_110px] gap-3 border-b bg-background px-4 py-3 text-xs font-medium text-muted-foreground backdrop-blur">
                  <span>Student</span>
                  <span className="text-right">Assigned</span>
                  <span className="text-right">Submitted</span>
                  <span className="text-right">Correct</span>
                  <span className="text-right">Points</span>
                  <span className="text-right">Accuracy</span>
                </div>
                <div className="divide-y">
                {filteredRows.map((row) => (
                  <div
                    key={row.student}
                    className="grid grid-cols-[minmax(320px,1.4fr)_110px_110px_100px_110px_110px] gap-3 px-4 py-4 hover:bg-accent/20"
                  >
                    <div className="min-w-0">
                      <div className="flex items-start gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback className="bg-primary/10 text-primary text-xs">
                            {getInitials(row.student_name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="truncate font-medium">{row.student_name}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {row.email}
                          </p>
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {row.batch && (
                              <Badge variant="outline" className="text-[10px]">
                                Batch {row.batch}
                              </Badge>
                            )}
                            {row.division && (
                              <Badge variant="outline" className="text-[10px]">
                                Div {row.division}
                              </Badge>
                            )}
                            {row.course_names.slice(0, 2).map((course) => (
                              <Badge
                                key={course}
                                variant="secondary"
                                className="max-w-[180px] truncate text-[10px]"
                              >
                                {course}
                              </Badge>
                            ))}
                            {row.course_names.length > 2 && (
                              <Badge variant="secondary" className="text-[10px]">
                                +{row.course_names.length - 2} more
                              </Badge>
                            )}
                          </div>
                          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                            <span className="inline-flex items-center gap-1">
                              <Clock3 className="h-3.5 w-3.5" />
                              Avg {formatDuration(row.average_time_seconds)}
                            </span>
                            <span>Current streak {row.current_streak}d</span>
                            <span>Best {row.longest_streak}d</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="text-right font-medium">{row.total_assigned}</div>
                    <div className="text-right font-medium">{row.total_submitted}</div>
                    <div className="text-right font-medium text-green-600">
                      {row.total_correct}
                    </div>
                    <div className="text-right font-semibold">{row.total_points_earned}</div>
                    <div className="text-right">
                      <p className="font-semibold">{Math.round(row.accuracy_rate)}%</p>
                      <p className="text-xs text-muted-foreground">
                        {row.latest_activity
                          ? new Date(row.latest_activity).toLocaleDateString()
                          : "No activity"}
                      </p>
                    </div>
                  </div>
                ))}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
