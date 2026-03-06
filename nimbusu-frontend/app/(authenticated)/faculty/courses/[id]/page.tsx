"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import api from "@/lib/api";
import {
  assignmentsService,
  attendanceService,
  contentService,
  timetableService,
  forumsService,
} from "@/services/api";
import { usePageHeader } from "@/lib/page-header";
import type {
  CourseOffering,
  Assignment,
  Content,
  User,
  Submission,
  TimetableEntry,
  AttendanceRecord,
} from "@/lib/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  BookOpen,
  ClipboardList,
  Users,
  FileText,
  Calendar,
  Plus,
  Loader2,
  Upload,
  ScrollText,
  Eye,
  Check,
  Download,
  Trash2,
  File,
  Video,
  Link2,
  Image,
  FolderOpen,
  MessageSquare,
  Pencil,
} from "lucide-react";

type Forum = any;
type ForumPost = any;

const STATUS_OPTIONS = [
  { value: "present", label: "Present", color: "text-emerald-600" },
  { value: "absent", label: "Absent", color: "text-red-600" },
  { value: "late", label: "Late", color: "text-amber-600" },
  { value: "excused", label: "Excused", color: "text-blue-600" },
];

const TYPE_ICONS: Record<string, React.ReactNode> = {
  document: <FileText className="h-4 w-4 text-blue-500" />,
  video: <Video className="h-4 w-4 text-purple-500" />,
  link: <Link2 className="h-4 w-4 text-cyan-500" />,
  image: <Image className="h-4 w-4 text-emerald-500" />,
  other: <File className="h-4 w-4 text-gray-500" />,
};

export default function FacultyCourseDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [offering, setOffering] = useState<CourseOffering | null>(null);
  const [students, setStudents] = useState<User[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [content, setContent] = useState<Content[]>([]);
  const [folders, setFolders] = useState<any[]>([]);
  const [forums, setForums] = useState<Forum[]>([]);
  const [loading, setLoading] = useState(true);
  const { setHeader } = usePageHeader();
  const router = useRouter();

  /* Submission grading */
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [subDialog, setSubDialog] = useState(false);
  const [subAssignment, setSubAssignment] = useState<Assignment | null>(null);
  const [loadingSubs, setLoadingSubs] = useState(false);
  const [gradeDialog, setGradeDialog] = useState(false);
  const [gradeSub, setGradeSub] = useState<Submission | null>(null);
  const [gradeForm, setGradeForm] = useState({
    marks_obtained: 0,
    grade: "",
    feedback: "",
  });
  const [grading, setGrading] = useState(false);

  /* Content upload */
  const [uploadDialog, setUploadDialog] = useState(false);
  const [uploadSaving, setUploadSaving] = useState(false);
  const [uploadForm, setUploadForm] = useState({
    title: "",
    description: "",
    content_type: "document",
    visibility: "course",
  });
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const uploadFileRef = useRef<HTMLInputElement>(null);

  /* Attendance */
  const [timetableEntries, setTimetableEntries] = useState<TimetableEntry[]>(
    [],
  );
  const [selectedEntry, setSelectedEntry] = useState("");
  const [attendanceDate, setAttendanceDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [attendanceRecords, setAttendanceRecords] = useState<
    Record<string, string>
  >({});
  const [markingAttendance, setMarkingAttendance] = useState(false);
  const [courseAttendance, setCourseAttendance] = useState<AttendanceRecord[]>([]);
  const [loadingAttendance, setLoadingAttendance] = useState(false);

  /* Forums & Folders details */
  const [folderDetails, setFolderDetails] = useState<any | null>(null);
  const [folderDialogOpen, setFolderDialogOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<{ forumId: string; postId: string; body: string } | null>(null);
  const [editingPostSaving, setEditingPostSaving] = useState(false);
  const [deletingPost, setDeletingPost] = useState<{ forumId: string; postId: string } | null>(null);
  const [deletingPostSaving, setDeletingPostSaving] = useState(false);

  useEffect(() => {
    async function fetch() {
      try {
        const [offRes, studRes, assRes, contRes, fldrRes, forumRes, ttRes] = await Promise.all([
          api.get(`/academics/offerings/${id}/`),
          api.get(`/academics/offerings/${id}/students/`),
          assignmentsService.list({ course_offering: id }),
          contentService.list({ course_offering: id }),
          contentService.folders?.list
            ? contentService.folders.list({ course_offering: id })
            : api.get("/content/folders/", { params: { course_offering: id } }),
          forumsService.list({ course_offering: id }),
          timetableService.mine(),
        ]);
        setOffering(offRes.data);
        const studData = studRes.data as
          | User[]
          | { results?: User[]; data?: User[] };
        setStudents(
          Array.isArray(studData)
            ? studData
            : (studData.results ?? studData.data ?? []),
        );
        setAssignments(assRes.data.results ?? []);
        setContent(contRes.data.results ?? []);
        setFolders(fldrRes.data?.results ?? []);
        setForums(forumRes.data?.results ?? []);
        const ttData = ttRes.data as
          | TimetableEntry[]
          | { results?: TimetableEntry[] };
        const allEntries = Array.isArray(ttData)
          ? ttData
          : (ttData.results ?? []);
        setTimetableEntries(
          allEntries.filter((e: TimetableEntry) => e.course_offering === id),
        );
      } catch {
        toast.error("Failed to load course data");
      } finally {
        setLoading(false);
      }
    }
    fetch();
  }, [id]);

  useEffect(() => {
    if (offering) {
      setHeader({
        title: offering.course_name,
        subtitle: `${offering.course_code} · Section ${offering.section} · ${offering.semester_name}`,
        backUrl: "/faculty/courses",
      });
    } else {
      setHeader({ title: "Course Details", backUrl: "/faculty/courses" });
    }
    return () => setHeader(null);
  }, [offering, setHeader]);

  const fetchAttendanceReport = useCallback(async () => {
    setLoadingAttendance(true);
    try {
      const { data } = await attendanceService.byCourse(id);
      setCourseAttendance(data.results ?? []);
    } catch {
      /* ignore */
    } finally {
      setLoadingAttendance(false);
    }
  }, [id]);

  async function handleUploadContent(e: React.FormEvent) {
    e.preventDefault();
    if (!uploadFile && uploadForm.content_type !== "link") {
      toast.error("Select a file");
      return;
    }
    setUploadSaving(true);
    try {
      const fd = new FormData();
      fd.append("title", uploadForm.title);
      fd.append("description", uploadForm.description);
      fd.append("content_type", uploadForm.content_type);
      fd.append("visibility", uploadForm.visibility);
      fd.append("course_offering", id);
      fd.append("is_published", "true");
      if (uploadFile) fd.append("file", uploadFile);
      await contentService.create(fd);
      toast.success("Uploaded");
      setUploadDialog(false);
      setUploadForm({
        title: "",
        description: "",
        content_type: "document",
        visibility: "course",
      });
      setUploadFile(null);
      const { data } = await contentService.list({ course_offering: id });
      setContent(data.results ?? []);
    } catch {
      toast.error("Upload failed");
    } finally {
      setUploadSaving(false);
    }
  }

  async function deleteContent(cId: string) {
    try {
      await contentService.delete(cId);
      toast.success("Deleted");
      setContent((p) => p.filter((c) => c.id !== cId));
    } catch {
      toast.error("Failed to delete");
    }
  }

  async function handleViewFolder(f: any) {
    try {
      const { data } = await contentService.folders.get(f.id);
      setFolderDetails(data);
      setFolderDialogOpen(true);
    } catch {
      toast.error("Failed to load folder details");
    }
  }

  async function handleDeletePost() {
    if (!deletingPost) return;
    setDeletingPostSaving(true);
    try {
      await forumsService.deletePost(deletingPost.forumId, deletingPost.postId);
      toast.success("Post deleted");
      setDeletingPost(null);
      // Ideally refresh posts here
    } catch {
      toast.error("Failed to delete post");
    } finally {
      setDeletingPostSaving(false);
    }
  }

  async function handleUpdatePost() {
    if (!editingPost) return;
    setEditingPostSaving(true);
    try {
      await forumsService.updatePost(editingPost.forumId, editingPost.postId, { body: editingPost.body });
      toast.success("Post updated");
      setEditingPost(null);
      // Ideally refresh posts here
    } catch {
      toast.error("Failed to update post");
    } finally {
      setEditingPostSaving(false);
    }
  }

  async function handleMarkAttendance() {
    if (!selectedEntry || !attendanceDate) {
      toast.error("Select a class and date");
      return;
    }
    const activeEntry = timetableEntries.find((e) => e.id === selectedEntry);
    const targetStudents =
      activeEntry && activeEntry.batch
        ? students.filter((s) => s.student_profile?.batch === activeEntry.batch)
        : students;

    if (targetStudents.length === 0) {
      toast.error("No students found in this batch.");
      return;
    }

    const records = targetStudents.map((s) => ({
      student_id: s.id,
      status: attendanceRecords[s.id] || "present",
    }));
    setMarkingAttendance(true);
    try {
      await attendanceService.markBulk({
        timetable_entry_id: selectedEntry,
        date: attendanceDate,
        records,
      });
      toast.success("Attendance saved!");
      setAttendanceRecords({});
      fetchAttendanceReport();
    } catch {
      toast.error("Failed to mark");
    } finally {
      setMarkingAttendance(false);
    }
  }

  if (loading)
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-10 w-full" />
        <Skeleton
          className="h-[500px]"
          style={{ borderRadius: "var(--radius-lg)" }}
        />
      </div>
    );

  return (
    <div className="space-y-6">
      {/* Quick stats */}
      <div className="flex justify-end mb-2">
        <div className="hidden sm:flex items-center gap-6 text-center">
          <div>
            <div className="text-xl font-bold">{students.length}</div>
            <p className="text-xs text-muted-foreground">Students</p>
          </div>
          <div>
            <div className="text-xl font-bold">{assignments.length}</div>
            <p className="text-xs text-muted-foreground">Assignments</p>
          </div>
          <div>
            <div className="text-xl font-bold">{content.length}</div>
            <p className="text-xs text-muted-foreground">Content</p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">
            <BookOpen className="h-4 w-4 mr-1" /> Overview
          </TabsTrigger>
          <TabsTrigger value="students">
            <Users className="h-4 w-4 mr-1" /> Students
          </TabsTrigger>
          <TabsTrigger value="assignments">
            <ClipboardList className="h-4 w-4 mr-1" /> Assignments
          </TabsTrigger>
          <TabsTrigger value="content">
            <FileText className="h-4 w-4 mr-1" /> Content
          </TabsTrigger>
          <TabsTrigger value="forums">
            <MessageSquare className="h-4 w-4 mr-1" /> Forums
          </TabsTrigger>
          <TabsTrigger
            value="attendance"
            onClick={() => fetchAttendanceReport()}
          >
            <ScrollText className="h-4 w-4 mr-1" /> Attendance
          </TabsTrigger>
        </TabsList>

        {/* Overview — flat stats */}
        <TabsContent value="overview" className="mt-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Students", value: students.length, icon: Users },
              {
                label: "Assignments",
                value: assignments.length,
                icon: ClipboardList,
              },
              { label: "Content Items", value: content.length, icon: FileText },
              {
                label: "Classes/Week",
                value: timetableEntries.length,
                icon: Calendar,
              },
            ].map((s) => (
              <div
                key={s.label}
                className="flex items-center gap-3 p-4 rounded-lg border"
                style={{ borderRadius: "var(--radius-lg)" }}
              >
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted"
                  style={{ borderRadius: "var(--radius)" }}
                >
                  <s.icon className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <div className="text-xl font-bold">{s.value}</div>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* Students — flat list */}
        <TabsContent value="students" className="mt-4">
          {students.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground">
              <Users className="h-8 w-8 mx-auto mb-2 opacity-40" />
              No students enrolled.
            </div>
          ) : (
            <div className="space-y-0.5">
              {students.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent/30 transition-colors"
                  style={{ borderRadius: "var(--radius)" }}
                >
                  <div
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-medium"
                    style={{ borderRadius: "9999px" }}
                  >
                    {s.first_name?.[0]}
                    {s.last_name?.[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">
                        {s.first_name} {s.last_name}
                      </p>
                      {s.student_profile?.roll_no && (
                        <Badge
                          variant="outline"
                          className="text-[10px] h-4 px-1"
                        >
                          {s.student_profile.roll_no}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {s.email}
                    </p>
                  </div>
                  <div className="text-right flex flex-col items-end gap-1">
                    <span className="text-xs text-muted-foreground">
                      {s.student_profile?.program ?? s.department_name ?? ""}{" "}
                      {s.student_profile?.current_semester
                        ? `· Sem ${s.student_profile.current_semester}`
                        : ""}
                    </span>
                    {s.student_profile?.batch && (
                      <Badge
                        variant="secondary"
                        className="text-[10px] h-4 px-1"
                      >
                        {s.student_profile.batch}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
              <p className="text-xs text-muted-foreground pt-2 pl-1">
                {students.length} student{students.length !== 1 ? "s" : ""}
              </p>
            </div>
          )}
        </TabsContent>

        {/* Assignments — flat list */}
        <TabsContent value="assignments" className="mt-4 space-y-3">
          <div className="flex justify-end">
            <Button
              size="sm"
              onClick={() =>
                router.push(`/faculty/courses/${id}/assignments/new`)
              }
              style={{ borderRadius: "var(--radius)" }}
            >
              <Plus className="h-3.5 w-3.5 mr-1.5" /> New Assignment
            </Button>
          </div>
          {assignments.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground">
              <ClipboardList className="h-8 w-8 mx-auto mb-2 opacity-40" />
              No assignments yet.
            </div>
          ) : (
            <div className="space-y-0.5">
              {assignments.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent/30 transition-colors"
                  style={{ borderRadius: "var(--radius)" }}
                >
                  <div
                    className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted shrink-0"
                    style={{ borderRadius: "var(--radius)" }}
                  >
                    <ClipboardList className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{a.title}</p>
                    <p className="text-xs text-muted-foreground">
                      <Badge
                        variant="secondary"
                        className="text-[10px] px-1.5 py-0 h-4 mr-1"
                      >
                        {a.assignment_type}
                      </Badge>
                      Due {new Date(a.due_date).toLocaleDateString()} ·{" "}
                      {a.submission_count} submission
                      {a.submission_count !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() =>
                        router.push(
                          `/faculty/courses/${id}/assignments/${a.id}/groups`,
                        )
                      }
                      style={{ borderRadius: "var(--radius)" }}
                    >
                      <Users className="h-3 w-3 mr-1" /> Groups
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() =>
                        router.push(
                          `/faculty/courses/${id}/assignments/${a.id}/submissions`,
                        )
                      }
                      style={{ borderRadius: "var(--radius)" }}
                    >
                      <Eye className="h-3 w-3 mr-1" /> Submissions
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Content — file-manager grid */}
        <TabsContent value="content" className="mt-4 space-y-3">
          <div className="flex justify-end">
            <Button
              size="sm"
              onClick={() => setUploadDialog(true)}
              style={{ borderRadius: "var(--radius)" }}
            >
              <Upload className="h-3.5 w-3.5 mr-1.5" /> Upload
            </Button>
          </div>

          {folders.length > 0 && (
            <div className="mb-6 space-y-3">
              <h3 className="text-sm font-semibold">Folders</h3>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {folders.map(f => (
                  <div key={f.id} onClick={() => handleViewFolder(f)} className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-accent/30 transition-colors">
                    <FolderOpen className="h-5 w-5 text-blue-500" />
                    <div>
                      <p className="text-sm font-medium">{f.name}</p>
                      <p className="text-xs text-muted-foreground">{f.items?.length || 0} items</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <h3 className="text-sm font-semibold">Files</h3>
          {content.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground">
              <FileText className="h-8 w-8 mx-auto mb-2 opacity-40" />
              No content uploaded yet.
            </div>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {content.map((c) => (
                <div
                  key={c.id}
                  className="flex items-start gap-3 p-3 rounded-lg border border-transparent hover:border-border hover:bg-accent/30 transition-all group"
                  style={{ borderRadius: "var(--radius)" }}
                >
                  <div
                    className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted shrink-0"
                    style={{ borderRadius: "var(--radius)" }}
                  >
                    {TYPE_ICONS[c.content_type] || TYPE_ICONS.other}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{c.title}</p>
                    <p className="text-xs text-muted-foreground">
                      <Badge
                        variant="outline"
                        className="text-[10px] px-1 py-0 h-3.5 mr-1"
                      >
                        {c.visibility}
                      </Badge>
                      {new Date(c.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-0.5 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    {c.file && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => window.open(c.file!, "_blank")}
                      >
                        <Download className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive"
                      onClick={() => deleteContent(c.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Forums */}
        <TabsContent value="forums" className="mt-4 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-semibold">Course Forums</h3>
          </div>
          {forums.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground border rounded-lg border-dashed">
              <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-40" />
              No forums created yet.
            </div>
          ) : (
            <div className="space-y-4">
              {forums.map(forum => (
                <div key={forum.id} className="p-4 border rounded-lg space-y-3">
                  <h4 className="font-semibold">{forum.title}</h4>
                  <p className="text-sm text-muted-foreground">{forum.description}</p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => toast("View Posts not implemented in demo")}>
                      View Posts
                    </Button>
                    {/* Demo for update/delete post */}
                    <div className="flex items-center gap-2 border-l pl-4 ml-2">
                      <Button variant="secondary" size="sm" onClick={() => setEditingPost({ forumId: forum.id, postId: 'demo-post-123', body: 'Edit me' })}>
                        <Pencil className="h-3 w-3 mr-1" /> Edit Post
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => setDeletingPost({ forumId: forum.id, postId: 'demo-post-123' })}>
                        <Trash2 className="h-3 w-3 mr-1" /> Delete Post
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Attendance — clean inline form */}
        <TabsContent value="attendance" className="mt-4 space-y-6">
          {/* Mark attendance */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Calendar
                className="h-4 w-4"
                style={{ color: "var(--primary)" }}
              />{" "}
              Mark Attendance
            </h3>
            <div className="flex items-end gap-3">
              <div className="space-y-1.5 flex-1">
                <Label className="text-xs">Class</Label>
                <Select value={selectedEntry} onValueChange={setSelectedEntry}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue placeholder="Select a class" />
                  </SelectTrigger>
                  <SelectContent>
                    {timetableEntries.map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.day_name} · {e.start_time?.substring(0, 5)}–
                        {e.end_time?.substring(0, 5)} · {e.subject_type_display}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Date</Label>
                <Input
                  type="date"
                  value={attendanceDate}
                  onChange={(e) => setAttendanceDate(e.target.value)}
                  className="h-8 text-sm w-36"
                />
              </div>
            </div>
            {selectedEntry &&
              students.length > 0 &&
              (() => {
                const activeEntry = timetableEntries.find(
                  (e) => e.id === selectedEntry,
                );
                const filteredStudents =
                  activeEntry && activeEntry.batch
                    ? students.filter(
                      (s) => s.student_profile?.batch === activeEntry.batch,
                    )
                    : students;

                return (
                  <>
                    <div className="space-y-0.5">
                      {filteredStudents.length === 0 ? (
                        <p className="text-sm text-muted-foreground py-4 text-center border rounded-lg border-dashed">
                          No students found matching this class batch (
                          {activeEntry?.batch}).
                        </p>
                      ) : (
                        filteredStudents.map((s) => (
                          <div
                            key={s.id}
                            className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent/30"
                            style={{ borderRadius: "var(--radius)" }}
                          >
                            <div
                              className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-xs shrink-0"
                              style={{ borderRadius: "9999px" }}
                            >
                              {s.first_name?.[0]}
                              {s.last_name?.[0]}
                            </div>
                            <div className="flex-1 min-w-0 flex items-center gap-2">
                              <span className="text-sm font-medium truncate">
                                {s.first_name} {s.last_name}
                              </span>
                              {s.student_profile?.roll_no && (
                                <Badge
                                  variant="outline"
                                  className="text-[10px] h-4 px-1 hidden sm:inline-flex"
                                >
                                  {s.student_profile.roll_no}
                                </Badge>
                              )}
                              {s.student_profile?.batch && (
                                <Badge
                                  variant="secondary"
                                  className="text-[10px] h-4 px-1 hidden sm:inline-flex"
                                >
                                  {s.student_profile.batch}
                                </Badge>
                              )}
                            </div>
                            <Select
                              value={attendanceRecords[s.id] || "present"}
                              onValueChange={(v) =>
                                setAttendanceRecords((r) => ({
                                  ...r,
                                  [s.id]: v,
                                }))
                              }
                            >
                              <SelectTrigger className="w-28 h-7 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {STATUS_OPTIONS.map((o) => (
                                  <SelectItem key={o.value} value={o.value}>
                                    {o.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        ))
                      )}
                    </div>
                    <Button
                      className="mt-4"
                      size="sm"
                      onClick={handleMarkAttendance}
                      disabled={
                        markingAttendance || filteredStudents.length === 0
                      }
                      style={{ borderRadius: "var(--radius)" }}
                    >
                      {markingAttendance ? (
                        <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Check className="h-3.5 w-3.5 mr-1.5" />
                      )}{" "}
                      Save
                    </Button>
                  </>
                );
              })()}
          </div>

          {/* Attendance report */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold">Report</h3>
            {loadingAttendance ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-8" />
                ))}
              </div>
            ) : courseAttendance.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">
                No attendance records yet.
              </p>
            ) : (
              <div className="space-y-0.5">
                {courseAttendance.slice(0, 50).map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent/30 text-sm"
                    style={{ borderRadius: "var(--radius)" }}
                  >
                    <span className="flex-1 font-medium">{r.student_name}</span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(r.date).toLocaleDateString()}
                    </span>
                    <Badge
                      variant={
                        r.status === "present"
                          ? "default"
                          : r.status === "absent"
                            ? "destructive"
                            : "secondary"
                      }
                      className="text-[10px] px-1.5 h-4"
                    >
                      {r.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Upload Content Dialog */}
      <Dialog
        open={uploadDialog}
        onOpenChange={(open) => {
          setUploadDialog(open);
          if (!open) setUploadFile(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Content</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUploadContent} className="space-y-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                value={uploadForm.title}
                onChange={(e) =>
                  setUploadForm({ ...uploadForm, title: e.target.value })
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={uploadForm.description}
                onChange={(e) =>
                  setUploadForm({ ...uploadForm, description: e.target.value })
                }
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select
                  value={uploadForm.content_type}
                  onValueChange={(v) =>
                    setUploadForm({ ...uploadForm, content_type: v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="document">Document</SelectItem>
                    <SelectItem value="video">Video</SelectItem>
                    <SelectItem value="image">Image</SelectItem>
                    <SelectItem value="link">Link</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Visibility</Label>
                <Select
                  value={uploadForm.visibility}
                  onValueChange={(v) =>
                    setUploadForm({ ...uploadForm, visibility: v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="course">Course</SelectItem>
                    <SelectItem value="department">Department</SelectItem>
                    <SelectItem value="public">Public</SelectItem>
                    <SelectItem value="private">Private</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>File</Label>
              <input
                ref={uploadFileRef}
                type="file"
                className="block w-full text-sm border rounded-md p-2 file:mr-4 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-sm file:font-medium"
                style={{
                  borderColor: "var(--border)",
                  borderRadius: "var(--radius)",
                }}
                onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
              />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={uploadSaving}>
                {uploadSaving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4 mr-2" />
                )}{" "}
                Upload
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Folder Details Dialog */}
      <Dialog open={folderDialogOpen} onOpenChange={setFolderDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Folder: {folderDetails?.title || folderDetails?.name}</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-2">
            <p className="text-sm text-muted-foreground">{folderDetails?.description || "No description provided."}</p>
            <div className="border rounded-md p-4 text-xs font-mono bg-muted/50 overflow-auto max-h-[300px]">
              {JSON.stringify(folderDetails, null, 2)}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Post Dialog */}
      <Dialog open={!!editingPost} onOpenChange={(o) => !o && setEditingPost(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Forum Post</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Textarea
              value={editingPost?.body || ''}
              onChange={e => setEditingPost(prev => prev ? { ...prev, body: e.target.value } : null)}
              className="min-h-[100px]"
            />
            <Button onClick={handleUpdatePost} disabled={editingPostSaving} className="w-full">
              {editingPostSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Post Dialog */}
      <Dialog open={!!deletingPost} onOpenChange={(o) => (!o && !deletingPostSaving) && setDeletingPost(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Post</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              Are you sure you want to delete this post? This action cannot be undone.
            </p>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeletingPost(null)} disabled={deletingPostSaving}>Cancel</Button>
              <Button variant="destructive" onClick={handleDeletePost} disabled={deletingPostSaving}>
                {deletingPostSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Delete Post
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
