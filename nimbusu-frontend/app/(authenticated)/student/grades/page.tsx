"use client";

import { useEffect, useState } from "react";
import { gradesService } from "@/services/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Download, GraduationCap, Award, BookOpen } from "lucide-react";
import type { Grade } from "@/lib/types";
import { toast } from "sonner";

interface GpaData {
  cgpa?: number;
  total_credits?: number;
  total_grade_points?: number;
}

export default function StudentGradesPage() {
  const [grades, setGrades] = useState<Grade[]>([]);
  const [gpaData, setGpaData] = useState<GpaData | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    async function fetchGradesData() {
      try {
        const [gradesRes, gpaRes] = await Promise.all([
          gradesService.me(),
          gradesService.gpa(),
        ]);

        // Handle different response structures
        setGrades(
          Array.isArray(gradesRes.data)
            ? gradesRes.data
            : ((gradesRes.data as any).results ?? []),
        );

        if (gpaRes.data && (gpaRes.data as any).data) {
          setGpaData((gpaRes.data as any).data);
        } else if (gpaRes.data) {
          setGpaData(gpaRes.data as any);
        }
      } catch (error) {
        toast.error("Failed to load grades data");
        console.error("Error fetching grades:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchGradesData();
  }, []);

  const handleExport = async () => {
    try {
      setExporting(true);
      const response = await gradesService.export();
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "transcript.csv");
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success("Transcript exported successfully");
    } catch (error) {
      toast.error("Failed to export transcript");
      console.error("Error exporting transcript:", error);
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton
            className="h-24 w-full"
            style={{ borderRadius: "var(--radius-lg)" }}
          />
          <Skeleton
            className="h-24 w-full"
            style={{ borderRadius: "var(--radius-lg)" }}
          />
          <Skeleton
            className="h-24 w-full"
            style={{ borderRadius: "var(--radius-lg)" }}
          />
        </div>
        <Skeleton
          className="h-[400px] w-full"
          style={{ borderRadius: "var(--radius-lg)" }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <Button
          variant="outline"
          onClick={handleExport}
          disabled={exporting || grades.length === 0}
          className="flex items-center gap-2"
        >
          <Download className="h-4 w-4" />
          {exporting ? "Exporting..." : "Export Transcript"}
        </Button>
      </div>

      {/* GPA Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="p-6 rounded-xl border bg-card text-card-foreground shadow-sm flex items-center gap-4">
          <div className="h-12 w-12 bg-primary/10 text-primary rounded-full flex items-center justify-center">
            <Award className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">
              Cumulative GPA
            </p>
            <h2 className="text-3xl font-bold">
              {gpaData?.cgpa ? gpaData.cgpa.toFixed(2) : "N/A"}
            </h2>
          </div>
        </div>

        <div className="p-6 rounded-xl border bg-card text-card-foreground shadow-sm flex items-center gap-4">
          <div className="h-12 w-12 bg-blue-500/10 text-blue-500 rounded-full flex items-center justify-center">
            <BookOpen className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">
              Credits Earned
            </p>
            <h2 className="text-3xl font-bold">
              {gpaData?.total_credits || 0}
            </h2>
          </div>
        </div>

        <div className="p-6 rounded-xl border bg-card text-card-foreground shadow-sm flex items-center gap-4">
          <div className="h-12 w-12 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center">
            <GraduationCap className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">
              Courses Completed
            </p>
            <h2 className="text-3xl font-bold">{grades.length}</h2>
          </div>
        </div>
      </div>

      {/* Grades Table */}
      <div className="rounded-xl border shadow-sm bg-card overflow-hidden">
        <div className="p-4 border-b bg-muted/20">
          <h3 className="font-semibold text-lg">Course Grades</h3>
        </div>
        {grades.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground flex flex-col items-center justify-center">
            <BookOpen className="h-10 w-10 text-muted-foreground/30 mb-3" />
            <p>No grades available yet.</p>
            <p className="text-sm">
              Your grades will appear here once they are published by faculty.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Course</TableHead>
                  <TableHead>Semester</TableHead>
                  <TableHead className="text-center">Credits</TableHead>
                  <TableHead className="text-center">Grade Points</TableHead>
                  <TableHead className="text-center">Grade</TableHead>
                  <TableHead className="text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {grades.map((grade) => (
                  <TableRow key={grade.id}>
                    <TableCell className="font-medium">
                      {grade.course_name || grade.course_offering}
                    </TableCell>
                    <TableCell>
                      {grade.semester_name || grade.semester || "Current"}
                    </TableCell>
                    <TableCell className="text-center">
                      {grade.credits_earned}
                    </TableCell>
                    <TableCell className="text-center">
                      {grade.grade_points}
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="font-bold text-lg">
                        {grade.grade_letter}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      {grade.is_pass ? (
                        <Badge
                          variant="secondary"
                          className="bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/25"
                        >
                          Pass
                        </Badge>
                      ) : (
                        <Badge variant="destructive">Fail</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}
