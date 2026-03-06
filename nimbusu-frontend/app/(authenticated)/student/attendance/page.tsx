"use client";

import { useEffect, useState, useCallback } from "react";
import { attendanceService } from "@/services/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableCard } from "@/components/application/table/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { ScrollText, Search } from "lucide-react";

const STATUS_VARIANT: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  present: "default",
  late: "secondary",
  absent: "destructive",
  excused: "outline",
};

interface AttendanceItem {
  id: string;
  date: string;
  status: string;
  course_name?: string;
  remarks?: string;
}

export default function StudentAttendancePage() {
  const [records, setRecords] = useState<AttendanceItem[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const fetchRecords = useCallback(async (opts?: { showLoading?: boolean }) => {
    if (opts?.showLoading) setInitialLoading(true);
    try {
      const { data } = await attendanceService.mine();
      setRecords(data.results ?? []);
    } catch {
      toast.error("Failed to load attendance");
    } finally {
      setInitialLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRecords({ showLoading: true });
  }, []);

  const q = search.toLowerCase();
  const filtered = records.filter((r) => {
    if (statusFilter !== "all" && r.status !== statusFilter) return false;
    if (!q) return true;
    return (
      (r.course_name ?? "").toLowerCase().includes(q) ||
      r.date.includes(q) ||
      (r.remarks ?? "").toLowerCase().includes(q)
    );
  });

  const present = records.filter(
    (r) => r.status === "present" || r.status === "late",
  ).length;
  const total = records.length;
  const pct = total > 0 ? Math.round((present / total) * 100) : 0;

  if (initialLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton
              key={i}
              className="h-24"
              style={{ borderRadius: "var(--radius-lg)" }}
            />
          ))}
        </div>
        <Skeleton
          className="h-[300px]"
          style={{ borderRadius: "var(--radius-lg)" }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card
          style={{
            boxShadow: "var(--shadow-sm)",
            borderRadius: "var(--radius-lg)",
          }}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Overall
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className="text-3xl font-bold"
              style={{
                color: pct >= 75 ? "var(--primary)" : "var(--destructive)",
              }}
            >
              {pct}%
            </div>
          </CardContent>
        </Card>
        <Card
          style={{
            boxShadow: "var(--shadow-sm)",
            borderRadius: "var(--radius-lg)",
          }}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Present
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{present}</div>
          </CardContent>
        </Card>
        <Card
          style={{
            boxShadow: "var(--shadow-sm)",
            borderRadius: "var(--radius-lg)",
          }}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Absent
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{total - present}</div>
          </CardContent>
        </Card>
        <Card
          style={{
            boxShadow: "var(--shadow-sm)",
            borderRadius: "var(--radius-lg)",
          }}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Total Classes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{total}</div>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <TableCard.Root>
        <div className="flex items-center gap-2 border-b border-secondary px-4 py-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Filter records..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-8 text-sm border-none shadow-none bg-transparent focus-visible:ring-0"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-32 h-8 text-xs">
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="present">Present</SelectItem>
              <SelectItem value="late">Late</SelectItem>
              <SelectItem value="absent">Absent</SelectItem>
              <SelectItem value="excused">Excused</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Table aria-label="Attendance">
          <Table.Header>
            <Table.Row>
              <Table.Head isRowHeader>
                <span className="text-xs font-semibold whitespace-nowrap text-quaternary">
                  Date
                </span>
              </Table.Head>
              <Table.Head>
                <span className="text-xs font-semibold whitespace-nowrap text-quaternary">
                  Course
                </span>
              </Table.Head>
              <Table.Head>
                <span className="text-xs font-semibold whitespace-nowrap text-quaternary">
                  Status
                </span>
              </Table.Head>
              <Table.Head>
                <span className="text-xs font-semibold whitespace-nowrap text-quaternary">
                  Remarks
                </span>
              </Table.Head>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {filtered.length === 0 ? (
              <Table.Row id="empty">
                <Table.Cell
                  colSpan={4}
                  className="text-center py-8 text-muted-foreground"
                >
                  <ScrollText className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  <p>No attendance records found.</p>
                </Table.Cell>
              </Table.Row>
            ) : (
              filtered.map((r) => (
                <Table.Row key={r.id} id={r.id}>
                  <Table.Cell className="font-medium">
                    {new Date(r.date).toLocaleDateString()}
                  </Table.Cell>
                  <Table.Cell className="text-muted-foreground">
                    {r.course_name ?? "—"}
                  </Table.Cell>
                  <Table.Cell>
                    <Badge variant={STATUS_VARIANT[r.status] ?? "secondary"}>
                      {r.status}
                    </Badge>
                  </Table.Cell>
                  <Table.Cell className="text-muted-foreground">
                    {r.remarks || "—"}
                  </Table.Cell>
                </Table.Row>
              ))
            )}
          </Table.Body>
        </Table>

        <div className="flex items-center justify-between border-t border-secondary px-4 py-2 text-xs text-muted-foreground">
          <span>
            {filtered.length} record{filtered.length !== 1 ? "s" : ""}
          </span>
          {statusFilter !== "all" && <span>Filtered by: {statusFilter}</span>}
        </div>
      </TableCard.Root>
    </div>
  );
}
