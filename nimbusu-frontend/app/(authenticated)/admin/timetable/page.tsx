"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import {
  timetableService,
  offeringsService,
  semestersService,
} from "@/services/api";
import type { TimetableEntry, CourseOffering, Semester, User } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  ModernEventCalendar,
  CalendarEvent,
} from "@/components/application/modern-calendar";
import { TimePicker } from "@/components/ui/time-picker";
import { parse, setDay, startOfWeek, addWeeks } from "date-fns";
import {
  Plus,
  Loader2,
  AlertTriangle,
  Clock,
  MapPin,
  Users,
  Trash2,
  Pencil,
  BookOpen,
  Save,
  X,
  ExternalLink,
} from "lucide-react";

const SUBJECT_COLORS: Record<string, string> = {
  classroom: "bg-cyan-500/10 border-cyan-500/20 text-cyan-700 dark:text-cyan-400",
  lab: "bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-400",
  tutorial: "bg-amber-500/10 border-amber-500/20 text-amber-700 dark:text-amber-400",
};

const DAY_OPTIONS = [
  { value: 0, label: "Monday" },
  { value: 1, label: "Tuesday" },
  { value: 2, label: "Wednesday" },
  { value: 3, label: "Thursday" },
  { value: 4, label: "Friday" },
  { value: 5, label: "Saturday" },
  { value: 6, label: "Sunday" },
];

const SUBJECT_TYPE_OPTIONS = [
  { value: "classroom", label: "Classroom" },
  { value: "lab", label: "Laboratory" },
  { value: "tutorial", label: "Tutorial" },
];

// A helper to generate instances of a timetable entry across weeks
function generateEventsForEntry(
  entry: TimetableEntry,
  baseDate: Date,
  weeksBefore: number,
  weeksAfter: number,
): CalendarEvent[] {
  const events: CalendarEvent[] = [];
  const baseWeekStart = startOfWeek(baseDate, { weekStartsOn: 1 }); // Monday start

  let targetDayIndex = entry.day_of_week; // Assuming 0=Mon in backend
  if (targetDayIndex === 7) targetDayIndex = 0;

  for (let i = -weeksBefore; i <= weeksAfter; i++) {
    const weekStart = addWeeks(baseWeekStart, i);
    const eventDate = setDay(weekStart, targetDayIndex + 1, {
      weekStartsOn: 1,
    });

    const startTimeStr = entry.start_time.substring(0, 5);
    const endTimeStr = entry.end_time.substring(0, 5);

    const start = parse(startTimeStr, "HH:mm", eventDate);
    const end = parse(endTimeStr, "HH:mm", eventDate);

    events.push({
      id: `${entry.id}-${eventDate.toISOString()}`,
      title: entry.course_name,
      start,
      end,
      color: SUBJECT_COLORS[entry.subject_type] ?? "bg-blue-500/10 border-blue-500/20 text-blue-700 dark:text-blue-400",
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
  const [offerings, setOfferings] = useState<CourseOffering[]>([]);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Sheet state — single sheet for view + inline edit
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetEditing, setSheetEditing] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<TimetableEntry | null>(
    null,
  );

  // Create dialog (only for new entries)
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  // Delete confirmation
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Conflicts
  const [conflictsDialogOpen, setConflictsDialogOpen] = useState(false);
  const [conflicts, setConflicts] = useState<any[]>([]);
  const [loadingConflicts, setLoadingConflicts] = useState(false);

  // Students popup
  const [studentsDialogOpen, setStudentsDialogOpen] = useState(false);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [studentsList, setStudentsList] = useState<User[]>([]);

  const [saving, setSaving] = useState(false);

  // Form state — shared by create dialog and sheet inline edit
  const [form, setForm] = useState({
    course_offering: "",
    batch: "",
    subject_type: "classroom" as "classroom" | "lab" | "tutorial",
    location: "",
    day_of_week: 0,
    start_time: "09:00",
    end_time: "10:00",
    semester: "",
    is_active: true,
  });

  // Filter states
  const [selectedSemester, setSelectedSemester] = useState<string>("all");
  const [selectedSubjectType, setSelectedSubjectType] = useState<string>("all");
  const [selectedBatch, setSelectedBatch] = useState<string>("all");

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [timetableRes, offeringsRes, semestersRes] = await Promise.all([
        timetableService.list(),
        offeringsService.list(),
        semestersService.list(),
      ]);
      setEntries(timetableRes.data.results ?? []);
      setOfferings(offeringsRes.data.results ?? []);
      setSemesters(semestersRes.data.results ?? []);
    } catch {
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const uniqueBatches = useMemo(() => {
    const batches = new Set(entries.map((e) => e.batch).filter(Boolean));
    return Array.from(batches).sort();
  }, [entries]);

  // ── helpers ──

  const resetForm = () => {
    const cur = semesters.find((s) => s.is_current);
    setForm({
      course_offering: "",
      batch: "",
      subject_type: "classroom",
      location: "",
      day_of_week: 0,
      start_time: "09:00",
      end_time: "10:00",
      semester: cur?.id || "",
      is_active: true,
    });
  };

  const populateFormFromEntry = (entry: TimetableEntry) => {
    setForm({
      course_offering: entry.course_offering,
      batch: entry.batch,
      subject_type: entry.subject_type,
      location: entry.location,
      day_of_week: entry.day_of_week,
      start_time: entry.start_time.substring(0, 5),
      end_time: entry.end_time.substring(0, 5),
      semester: entry.semester,
      is_active: entry.is_active,
    });
  };

  // ── event click → open sheet in view mode ──

  const handleEventClick = (event: CalendarEvent) => {
    const entry = event.extendedProps?.entry as TimetableEntry;
    if (entry) {
      setSelectedEntry(entry);
      populateFormFromEntry(entry);
      setSheetEditing(false);
      setSheetOpen(true);
    }
  };

  // ── create ──

  const openCreateDialog = () => {
    resetForm();
    setCreateDialogOpen(true);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await timetableService.create(form as any);
      toast.success("Timetable entry created");
      setCreateDialogOpen(false);
      fetchAll();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to create entry");
    } finally {
      setSaving(false);
    }
  };

  // ── inline update (from sheet) ──

  const handleUpdate = async () => {
    if (!selectedEntry) return;
    setSaving(true);
    try {
      await timetableService.update(selectedEntry.id, form as any);
      toast.success("Timetable entry updated");
      setSheetEditing(false);
      setSheetOpen(false);
      fetchAll();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to update entry");
    } finally {
      setSaving(false);
    }
  };

  // ── delete ──

  const handleDelete = async () => {
    if (!selectedEntry) return;
    setSaving(true);
    try {
      await timetableService.delete(selectedEntry.id);
      toast.success("Timetable entry deleted");
      setDeleteDialogOpen(false);
      setSheetOpen(false);
      setSelectedEntry(null);
      fetchAll();
    } catch {
      toast.error("Failed to delete entry");
    } finally {
      setSaving(false);
    }
  };

  // ── conflicts ──

  const checkConflicts = async () => {
    setLoadingConflicts(true);
    setConflictsDialogOpen(true);
    try {
      const res = await timetableService.conflicts();
      setConflicts(res.data.data || []);
    } catch {
      toast.error("Failed to load conflicts");
    } finally {
      setLoadingConflicts(false);
    }
  };

  // ── filters ──

  const filteredEntries = useMemo(() => {
    let filtered = entries;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (e) =>
          e.course_name.toLowerCase().includes(q) ||
          e.faculty_name.toLowerCase().includes(q) ||
          e.course_code.toLowerCase().includes(q) ||
          e.location.toLowerCase().includes(q) ||
          e.batch.toLowerCase().includes(q),
      );
    }
    if (selectedSemester !== "all")
      filtered = filtered.filter((e) => e.semester === selectedSemester);
    if (selectedSubjectType !== "all")
      filtered = filtered.filter((e) => e.subject_type === selectedSubjectType);
    if (selectedBatch !== "all")
      filtered = filtered.filter((e) => e.batch === selectedBatch);
    return filtered;
  }, [
    entries,
    searchQuery,
    selectedSemester,
    selectedSubjectType,
    selectedBatch,
  ]);

  const calendarEvents = useMemo(() => {
    const today = new Date();
    const all: CalendarEvent[] = [];
    filteredEntries.forEach((entry) => {
      all.push(...generateEventsForEntry(entry, today, 10, 10));
    });
    return all;
  }, [filteredEntries]);

  // ── render ──

  if (loading) {
    return (
      <div className="space-y-6 h-[800px] flex flex-col p-6">
        <Skeleton className="h-12 w-full rounded-[var(--radius)]" />
        <Skeleton className="flex-1 w-full rounded-[var(--radius)]" />
      </div>
    );
  }

  // Shared form fields renderer
  const renderFormFields = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div className="space-y-2">
        <Label>Course Offering *</Label>
        <Select
          value={form.course_offering}
          onValueChange={(v) => setForm({ ...form, course_offering: v })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select course" />
          </SelectTrigger>
          <SelectContent>
            {offerings.map((o) => (
              <SelectItem key={o.id} value={o.id}>
                {o.course_code} – {o.course_name} ({o.section})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Semester *</Label>
        <Select
          value={form.semester}
          onValueChange={(v) => setForm({ ...form, semester: v })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select semester" />
          </SelectTrigger>
          <SelectContent>
            {semesters.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name} ({s.academic_year})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Batch *</Label>
        <Input
          value={form.batch}
          onChange={(e) => setForm({ ...form, batch: e.target.value })}
          placeholder="e.g. A1, B2, CS-2024"
        />
      </div>

      <div className="space-y-2">
        <Label>Subject Type *</Label>
        <Select
          value={form.subject_type}
          onValueChange={(v: any) => setForm({ ...form, subject_type: v })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SUBJECT_TYPE_OPTIONS.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Location *</Label>
        <Input
          value={form.location}
          onChange={(e) => setForm({ ...form, location: e.target.value })}
          placeholder="e.g. Room 101, Lab B1"
        />
      </div>

      <div className="space-y-2">
        <Label>Day of Week *</Label>
        <Select
          value={form.day_of_week.toString()}
          onValueChange={(v) => setForm({ ...form, day_of_week: parseInt(v) })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DAY_OPTIONS.map((d) => (
              <SelectItem key={d.value} value={d.value.toString()}>
                {d.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Start Time *</Label>
        <TimePicker
          value={form.start_time}
          onChange={(v) => setForm({ ...form, start_time: v })}
        />
      </div>

      <div className="space-y-2">
        <Label>End Time *</Label>
        <TimePicker
          value={form.end_time}
          onChange={(v) => setForm({ ...form, end_time: v })}
        />
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-[calc(100vh-7rem)] min-h-[500px]">
      {/* Filter Bar + Actions */}
      <div className="flex flex-wrap items-center gap-2 mb-2 px-1">
        <Select value={selectedSemester} onValueChange={setSelectedSemester}>
          <SelectTrigger className="w-full sm:w-[160px] h-8 text-sm">
            <SelectValue placeholder="All Semesters" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Semesters</SelectItem>
            {semesters.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={selectedSubjectType}
          onValueChange={setSelectedSubjectType}
        >
          <SelectTrigger className="w-[calc(50%-0.25rem)] sm:w-[130px] h-8 text-sm">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {SUBJECT_TYPE_OPTIONS.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={selectedBatch} onValueChange={setSelectedBatch}>
          <SelectTrigger className="w-[calc(50%-0.25rem)] sm:w-[130px] h-8 text-sm">
            <SelectValue placeholder="Batch" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Batches</SelectItem>
            {uniqueBatches.map((b) => (
              <SelectItem key={b} value={b}>
                {b}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Badge variant="secondary" className="text-xs">
          {filteredEntries.length}
        </Badge>

        <div className="flex items-center gap-1.5 ml-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={checkConflicts}
            className="h-8 gap-1.5 text-xs"
          >
            <AlertTriangle className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Conflicts</span>
          </Button>
          <Button size="sm" onClick={openCreateDialog} className="h-8 gap-1.5 text-xs">
            <Plus className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Add</span>
          </Button>
        </div>
      </div>

      {/* Calendar */}
      <div className="flex-1 px-1 min-h-0">
        <ModernEventCalendar
          events={calendarEvents}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onEventClick={handleEventClick}
          onAddEvent={openCreateDialog}
        />
      </div>

      {/* ────────── Side Sheet: view + inline edit ────────── */}
      <Sheet
        open={sheetOpen}
        onOpenChange={(open) => {
          if (!open) {
            setSheetEditing(false);
          }
          setSheetOpen(open);
        }}
      >
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <div className="flex items-center justify-between pr-6">
              <SheetTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                {selectedEntry?.course_name}
              </SheetTitle>
              {!sheetEditing ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => setSheetEditing(true)}
                >
                  <Pencil className="h-3.5 w-3.5" /> Edit
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => {
                    if (selectedEntry) populateFormFromEntry(selectedEntry);
                    setSheetEditing(false);
                  }}
                >
                  <X className="h-3.5 w-3.5" /> Cancel
                </Button>
              )}
            </div>
            <SheetDescription>
              {selectedEntry?.course_code} •{" "}
              {selectedEntry?.subject_type_display}
            </SheetDescription>
          </SheetHeader>

          {selectedEntry && !sheetEditing && (
            /* ── View Mode ── */
            <div className="space-y-6 py-4 px-3">
              <div className="rounded-lg border p-4 space-y-4">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                  Class Details
                </h3>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <Users className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div className="flex-1">
                      <div className="text-xs text-muted-foreground">
                        Faculty
                      </div>
                      <div className="font-medium">
                        {selectedEntry.faculty_name}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div className="flex-1">
                      <div className="text-xs text-muted-foreground">
                        Location
                      </div>
                      <div className="font-medium">
                        {selectedEntry.location}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div className="flex-1">
                      <div className="text-xs text-muted-foreground">
                        Schedule
                      </div>
                      <div className="font-medium">
                        {selectedEntry.day_name}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {selectedEntry.start_time.substring(0, 5)} –{" "}
                        {selectedEntry.end_time.substring(0, 5)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border p-4 space-y-3">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-1">
                  Academic Info
                </h3>
                {selectedEntry.department_name && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Department</span>
                    <span className="text-sm font-medium">{selectedEntry.department_name}</span>
                  </div>
                )}
                {selectedEntry.program_name && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Program</span>
                    <span className="text-sm font-medium">{selectedEntry.program_name}</span>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Semester</span>
                  <span className="text-sm font-medium">{selectedEntry.semester_name || 'N/A'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Batch</span>
                  <Badge variant="secondary" className="font-mono">
                    {selectedEntry.batch}
                  </Badge>
                </div>
                {selectedEntry.division && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Division</span>
                    <Badge variant="outline" className="font-mono">
                      {selectedEntry.division}
                    </Badge>
                  </div>
                )}
              </div>

              <div className="rounded-lg border p-4 space-y-2">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-3">
                  Additional Information
                </h3>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Type</span>
                  <Badge
                    variant="outline"
                    className={
                      selectedEntry.subject_type === "lab"
                        ? "border-emerald-500/50 text-emerald-600 dark:text-emerald-400"
                        : selectedEntry.subject_type === "tutorial"
                          ? "border-amber-500/50 text-amber-600 dark:text-amber-400"
                          : "border-cyan-500/50 text-cyan-600 dark:text-cyan-400"
                    }
                  >
                    {selectedEntry.subject_type_display}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Status</span>
                  <Badge
                    variant={selectedEntry.is_active ? "default" : "secondary"}
                  >
                    {selectedEntry.is_active ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  className="flex-1 gap-2"
                  onClick={async () => {
                    if (!selectedEntry) return;
                    setStudentsDialogOpen(true);
                    setStudentsLoading(true);
                    setStudentsList([]);
                    try {
                      const res = await offeringsService.students(selectedEntry.course_offering);
                      setStudentsList(res.data?.results ?? res.data ?? []);
                    } catch {
                      toast.error("Failed to load students");
                    } finally {
                      setStudentsLoading(false);
                    }
                  }}
                >
                  <Users className="h-4 w-4" /> View Students
                </Button>
              </div>

              <Separator />

              <Button
                variant="destructive"
                size="sm"
                className="w-full gap-2"
                onClick={() => setDeleteDialogOpen(true)}
              >
                <Trash2 className="h-4 w-4" /> Delete Entry
              </Button>
            </div>
          )}

          {selectedEntry && sheetEditing && (
            /* ── Edit Mode (inline) ── */
            <div className="space-y-6 py-4 px-3">
              {renderFormFields()}

              <div className="flex gap-2 pt-2">
                <Button
                  className="flex-1 gap-2"
                  disabled={saving}
                  onClick={handleUpdate}
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Save Changes
                </Button>
              </div>

              <Separator />

              <Button
                variant="destructive"
                size="sm"
                className="w-full gap-2"
                onClick={() => setDeleteDialogOpen(true)}
              >
                <Trash2 className="h-4 w-4" /> Delete Entry
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* ────────── Create Dialog (new entries only) ────────── */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Timetable Entry</DialogTitle>
            <DialogDescription>
              Add a new entry to the schedule.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            {renderFormFields()}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateDialogOpen(false)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ────────── Delete Confirmation ────────── */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Timetable Entry</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this timetable entry? This action
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={saving}
            >
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ────────── Conflicts Dialog ────────── */}
      <Dialog open={conflictsDialogOpen} onOpenChange={setConflictsDialogOpen}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Timetable Conflicts
            </DialogTitle>
            <DialogDescription>
              Scheduling conflicts detected in the timetable
            </DialogDescription>
          </DialogHeader>

          {loadingConflicts ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : conflicts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <AlertTriangle className="h-12 w-12 mx-auto mb-3 opacity-40" />
              <p className="font-medium">No conflicts found!</p>
              <p className="text-sm mt-1">
                All timetable entries are properly scheduled.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {conflicts.map((conflict, idx) => (
                <div
                  key={idx}
                  className="border rounded-lg p-4 bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800"
                >
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-500 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="font-medium text-amber-900 dark:text-amber-100">
                        {conflict.type === "location"
                          ? `Location Conflict: ${conflict.location}`
                          : `Faculty Conflict: ${conflict.faculty}`}
                      </div>
                      <div className="grid gap-2 text-sm">
                        <div className="bg-background rounded p-2 border">
                          <div className="font-medium">
                            {conflict.entry_a.course_name}
                          </div>
                          <div className="text-muted-foreground text-xs mt-1">
                            {conflict.entry_a.day_name} •{" "}
                            {conflict.entry_a.start_time} –{" "}
                            {conflict.entry_a.end_time} •{" "}
                            {conflict.entry_a.location}
                          </div>
                        </div>
                        <div className="bg-background rounded p-2 border">
                          <div className="font-medium">
                            {conflict.entry_b.course_name}
                          </div>
                          <div className="text-muted-foreground text-xs mt-1">
                            {conflict.entry_b.day_name} •{" "}
                            {conflict.entry_b.start_time} –{" "}
                            {conflict.entry_b.end_time} •{" "}
                            {conflict.entry_b.location}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <DialogFooter>
            <Button onClick={() => setConflictsDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ────────── Students Popup ────────── */}
      <Dialog open={studentsDialogOpen} onOpenChange={setStudentsDialogOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Enrolled Students
            </DialogTitle>
            <DialogDescription>
              {selectedEntry?.course_name} • {selectedEntry?.batch}
              {selectedEntry?.semester_name ? ` • ${selectedEntry.semester_name}` : ""}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto -mx-6 px-6">
            {studentsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : studentsList.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-3 opacity-40" />
                <p className="font-medium">No students enrolled</p>
                <p className="text-sm mt-1">
                  No students are currently enrolled in this course offering.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="text-xs text-muted-foreground font-medium mb-3">
                  {studentsList.length} student{studentsList.length !== 1 ? "s" : ""}
                </div>
                {studentsList.map((student: any) => (
                  <div
                    key={student.id}
                    className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                  >
                    <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold shrink-0">
                      {(student.first_name?.[0] || student.email?.[0] || "?").toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">
                        {student.first_name} {student.last_name}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {student.email}
                      </div>
                    </div>
                    {student.student_profile && (
                      <div className="flex items-center gap-1.5 shrink-0">
                        {student.student_profile.batch_year && (
                          <Badge variant="secondary" className="text-[10px] font-mono">
                            {student.student_profile.batch_year}
                          </Badge>
                        )}
                        {student.student_profile.current_semester && (
                          <Badge variant="outline" className="text-[10px]">
                            Sem {student.student_profile.current_semester}
                          </Badge>
                        )}
                        {student.student_profile.division && (
                          <Badge variant="outline" className="text-[10px]">
                            Div {student.student_profile.division}
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setStudentsDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
