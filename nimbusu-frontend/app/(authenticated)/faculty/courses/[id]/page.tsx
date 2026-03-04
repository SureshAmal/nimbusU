"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import api from "@/lib/api";
import { assignmentsService, attendanceService, contentService, timetableService } from "@/services/api";
import type { CourseOffering, Assignment, Content, User, Submission, TimetableEntry, AttendanceRecord } from "@/lib/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
    BookOpen, ClipboardList, Users, FileText, Calendar, Plus, Loader2,
    Upload, ScrollText, Eye, Check, Download, Trash2, File, Video, Link2, Image
} from "lucide-react";

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
    const [loading, setLoading] = useState(true);

    /* Assignment creation */
    const [assignDialog, setAssignDialog] = useState(false);
    const [assignSaving, setAssignSaving] = useState(false);
    const [assignForm, setAssignForm] = useState({ title: "", description: "", due_date: "", max_marks: 100, assignment_type: "assignment", is_published: true });

    /* Submission grading */
    const [submissions, setSubmissions] = useState<Submission[]>([]);
    const [subDialog, setSubDialog] = useState(false);
    const [subAssignment, setSubAssignment] = useState<Assignment | null>(null);
    const [loadingSubs, setLoadingSubs] = useState(false);
    const [gradeDialog, setGradeDialog] = useState(false);
    const [gradeSub, setGradeSub] = useState<Submission | null>(null);
    const [gradeForm, setGradeForm] = useState({ marks_obtained: 0, grade: "", feedback: "" });
    const [grading, setGrading] = useState(false);

    /* Content upload */
    const [uploadDialog, setUploadDialog] = useState(false);
    const [uploadSaving, setUploadSaving] = useState(false);
    const [uploadForm, setUploadForm] = useState({ title: "", description: "", content_type: "document", visibility: "course" });
    const [uploadFile, setUploadFile] = useState<File | null>(null);
    const uploadFileRef = useRef<HTMLInputElement>(null);

    /* Attendance */
    const [timetableEntries, setTimetableEntries] = useState<TimetableEntry[]>([]);
    const [selectedEntry, setSelectedEntry] = useState("");
    const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split("T")[0]);
    const [attendanceRecords, setAttendanceRecords] = useState<Record<string, string>>({});
    const [markingAttendance, setMarkingAttendance] = useState(false);
    const [courseAttendance, setCourseAttendance] = useState<AttendanceRecord[]>([]);
    const [loadingAttendance, setLoadingAttendance] = useState(false);

    useEffect(() => {
        async function fetch() {
            try {
                const [offRes, studRes, assRes, contRes, ttRes] = await Promise.all([
                    api.get(`/academics/offerings/${id}/`),
                    api.get(`/academics/offerings/${id}/students/`),
                    assignmentsService.list({ course_offering: id }),
                    contentService.list({ course_offering: id }),
                    timetableService.mine(),
                ]);
                setOffering(offRes.data);
                const studData = studRes.data;
                setStudents(Array.isArray(studData) ? studData : (studData.results ?? studData.data ?? []));
                setAssignments(assRes.data.results ?? []);
                setContent(contRes.data.results ?? []);
                const allEntries = Array.isArray(ttRes.data) ? ttRes.data : (ttRes.data.results ?? []);
                setTimetableEntries(allEntries.filter((e: TimetableEntry) => e.course_offering === id));
            } catch { toast.error("Failed to load course data"); }
            finally { setLoading(false); }
        }
        fetch();
    }, [id]);

    const fetchAttendanceReport = useCallback(async () => {
        setLoadingAttendance(true);
        try { const { data } = await attendanceService.byCourse(id); setCourseAttendance(data.results ?? []); }
        catch { /* ignore */ }
        finally { setLoadingAttendance(false); }
    }, [id]);

    async function createAssignment(e: React.FormEvent) {
        e.preventDefault(); setAssignSaving(true);
        try {
            await assignmentsService.create({ ...assignForm, course_offering: id, max_marks: assignForm.max_marks } as unknown as Parameters<typeof assignmentsService.create>[0]);
            toast.success("Assignment created"); setAssignDialog(false);
            setAssignForm({ title: "", description: "", due_date: "", max_marks: 100, assignment_type: "assignment", is_published: true });
            const { data } = await assignmentsService.list({ course_offering: id }); setAssignments(data.results ?? []);
        } catch { toast.error("Failed to create"); }
        finally { setAssignSaving(false); }
    }

    async function viewSubmissions(a: Assignment) {
        setSubAssignment(a); setSubDialog(true); setLoadingSubs(true);
        try { const { data } = await assignmentsService.submissions(a.id); setSubmissions(data.results ?? []); }
        catch { toast.error("Failed to load"); setSubmissions([]); }
        finally { setLoadingSubs(false); }
    }

    async function handleGrade(e: React.FormEvent) {
        e.preventDefault(); if (!subAssignment || !gradeSub) return;
        setGrading(true);
        try {
            await assignmentsService.grade(subAssignment.id, gradeSub.id, { marks_obtained: gradeForm.marks_obtained, grade: gradeForm.grade || undefined, feedback: gradeForm.feedback || undefined });
            toast.success("Graded!"); setGradeDialog(false);
            const { data } = await assignmentsService.submissions(subAssignment.id); setSubmissions(data.results ?? []);
        } catch { toast.error("Failed to grade"); }
        finally { setGrading(false); }
    }

    async function handleUploadContent(e: React.FormEvent) {
        e.preventDefault();
        if (!uploadFile && uploadForm.content_type !== "link") { toast.error("Select a file"); return; }
        setUploadSaving(true);
        try {
            const fd = new FormData();
            fd.append("title", uploadForm.title); fd.append("description", uploadForm.description);
            fd.append("content_type", uploadForm.content_type); fd.append("visibility", uploadForm.visibility);
            fd.append("course_offering", id); fd.append("is_published", "true");
            if (uploadFile) fd.append("file", uploadFile);
            await contentService.create(fd); toast.success("Uploaded");
            setUploadDialog(false); setUploadForm({ title: "", description: "", content_type: "document", visibility: "course" }); setUploadFile(null);
            const { data } = await contentService.list({ course_offering: id }); setContent(data.results ?? []);
        } catch { toast.error("Upload failed"); }
        finally { setUploadSaving(false); }
    }

    async function deleteContent(cId: string) {
        try { await contentService.delete(cId); toast.success("Deleted"); setContent((p) => p.filter((c) => c.id !== cId)); }
        catch { toast.error("Failed to delete"); }
    }

    async function handleMarkAttendance() {
        if (!selectedEntry || !attendanceDate) { toast.error("Select a class and date"); return; }
        const records = students.map((s) => ({ student_id: s.id, status: attendanceRecords[s.id] || "present" }));
        setMarkingAttendance(true);
        try { await attendanceService.markBulk({ timetable_entry_id: selectedEntry, date: attendanceDate, records }); toast.success("Attendance saved!"); setAttendanceRecords({}); fetchAttendanceReport(); }
        catch { toast.error("Failed to mark"); }
        finally { setMarkingAttendance(false); }
    }

    if (loading) return <div className="space-y-4"><Skeleton className="h-8 w-64" /><Skeleton className="h-10 w-full" /><Skeleton className="h-[500px]" style={{ borderRadius: "var(--radius-lg)" }} /></div>;

    return (
        <div className="space-y-6">
            {/* Header — flat */}
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">{offering?.course_name}</h1>
                    <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                        <span className="font-mono">{offering?.course_code}</span>
                        <span>·</span>
                        <span>Section {offering?.section}</span>
                        <span>·</span>
                        <span>{offering?.semester_name}</span>
                    </div>
                </div>
                {/* Quick stats */}
                <div className="hidden sm:flex items-center gap-6 text-center">
                    <div><div className="text-xl font-bold">{students.length}</div><p className="text-xs text-muted-foreground">Students</p></div>
                    <div><div className="text-xl font-bold">{assignments.length}</div><p className="text-xs text-muted-foreground">Assignments</p></div>
                    <div><div className="text-xl font-bold">{content.length}</div><p className="text-xs text-muted-foreground">Content</p></div>
                </div>
            </div>

            <Tabs defaultValue="overview">
                <TabsList>
                    <TabsTrigger value="overview"><BookOpen className="h-4 w-4 mr-1" /> Overview</TabsTrigger>
                    <TabsTrigger value="students"><Users className="h-4 w-4 mr-1" /> Students</TabsTrigger>
                    <TabsTrigger value="assignments"><ClipboardList className="h-4 w-4 mr-1" /> Assignments</TabsTrigger>
                    <TabsTrigger value="content"><FileText className="h-4 w-4 mr-1" /> Content</TabsTrigger>
                    <TabsTrigger value="attendance" onClick={() => fetchAttendanceReport()}><ScrollText className="h-4 w-4 mr-1" /> Attendance</TabsTrigger>
                </TabsList>

                {/* Overview — flat stats */}
                <TabsContent value="overview" className="mt-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[
                            { label: "Students", value: students.length, icon: Users },
                            { label: "Assignments", value: assignments.length, icon: ClipboardList },
                            { label: "Content Items", value: content.length, icon: FileText },
                            { label: "Classes/Week", value: timetableEntries.length, icon: Calendar },
                        ].map((s) => (
                            <div key={s.label} className="flex items-center gap-3 p-4 rounded-lg border" style={{ borderRadius: "var(--radius-lg)" }}>
                                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted" style={{ borderRadius: "var(--radius)" }}>
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
                        <div className="py-16 text-center text-muted-foreground"><Users className="h-8 w-8 mx-auto mb-2 opacity-40" />No students enrolled.</div>
                    ) : (
                        <div className="space-y-0.5">
                            {students.map((s) => (
                                <div key={s.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent/30 transition-colors" style={{ borderRadius: "var(--radius)" }}>
                                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-medium" style={{ borderRadius: "9999px" }}>
                                        {s.first_name?.[0]}{s.last_name?.[0]}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium">{s.first_name} {s.last_name}</p>
                                        <p className="text-xs text-muted-foreground truncate">{s.email}</p>
                                    </div>
                                    <span className="text-xs text-muted-foreground">{s.department_name ?? ""}</span>
                                </div>
                            ))}
                            <p className="text-xs text-muted-foreground pt-2 pl-1">{students.length} student{students.length !== 1 ? "s" : ""}</p>
                        </div>
                    )}
                </TabsContent>

                {/* Assignments — flat list */}
                <TabsContent value="assignments" className="mt-4 space-y-3">
                    <div className="flex justify-end">
                        <Button size="sm" onClick={() => setAssignDialog(true)} style={{ borderRadius: "var(--radius)" }}><Plus className="h-3.5 w-3.5 mr-1.5" /> New Assignment</Button>
                    </div>
                    {assignments.length === 0 ? (
                        <div className="py-16 text-center text-muted-foreground"><ClipboardList className="h-8 w-8 mx-auto mb-2 opacity-40" />No assignments yet.</div>
                    ) : (
                        <div className="space-y-0.5">
                            {assignments.map((a) => (
                                <div key={a.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent/30 transition-colors" style={{ borderRadius: "var(--radius)" }}>
                                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted shrink-0" style={{ borderRadius: "var(--radius)" }}>
                                        <ClipboardList className="h-4 w-4 text-muted-foreground" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium">{a.title}</p>
                                        <p className="text-xs text-muted-foreground">
                                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 mr-1">{a.assignment_type}</Badge>
                                            Due {new Date(a.due_date).toLocaleDateString()} · {a.submission_count} submission{a.submission_count !== 1 ? "s" : ""}
                                        </p>
                                    </div>
                                    <Button variant="outline" size="sm" className="h-7 text-xs shrink-0" onClick={() => viewSubmissions(a)} style={{ borderRadius: "var(--radius)" }}>
                                        <Eye className="h-3 w-3 mr-1" /> Submissions
                                    </Button>
                                </div>
                            ))}
                        </div>
                    )}
                </TabsContent>

                {/* Content — file-manager grid */}
                <TabsContent value="content" className="mt-4 space-y-3">
                    <div className="flex justify-end">
                        <Button size="sm" onClick={() => setUploadDialog(true)} style={{ borderRadius: "var(--radius)" }}><Upload className="h-3.5 w-3.5 mr-1.5" /> Upload</Button>
                    </div>
                    {content.length === 0 ? (
                        <div className="py-16 text-center text-muted-foreground"><FileText className="h-8 w-8 mx-auto mb-2 opacity-40" />No content uploaded yet.</div>
                    ) : (
                        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                            {content.map((c) => (
                                <div key={c.id} className="flex items-start gap-3 p-3 rounded-lg border border-transparent hover:border-border hover:bg-accent/30 transition-all group" style={{ borderRadius: "var(--radius)" }}>
                                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted shrink-0" style={{ borderRadius: "var(--radius)" }}>
                                        {TYPE_ICONS[c.content_type] || TYPE_ICONS.other}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium truncate">{c.title}</p>
                                        <p className="text-xs text-muted-foreground">
                                            <Badge variant="outline" className="text-[10px] px-1 py-0 h-3.5 mr-1">{c.visibility}</Badge>
                                            {new Date(c.created_at).toLocaleDateString()}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-0.5 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                        {c.file && <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => window.open(c.file!, "_blank")}><Download className="h-3.5 w-3.5" /></Button>}
                                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteContent(c.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
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
                        <h3 className="text-sm font-semibold flex items-center gap-2"><Calendar className="h-4 w-4" style={{ color: "var(--primary)" }} /> Mark Attendance</h3>
                        <div className="flex items-end gap-3">
                            <div className="space-y-1.5 flex-1">
                                <Label className="text-xs">Class</Label>
                                <Select value={selectedEntry} onValueChange={setSelectedEntry}>
                                    <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select a class" /></SelectTrigger>
                                    <SelectContent>
                                        {timetableEntries.map((e) => (
                                            <SelectItem key={e.id} value={e.id}>{e.day_name} · {e.start_time?.substring(0, 5)}–{e.end_time?.substring(0, 5)} · {e.subject_type_display}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs">Date</Label>
                                <Input type="date" value={attendanceDate} onChange={(e) => setAttendanceDate(e.target.value)} className="h-8 text-sm w-36" />
                            </div>
                        </div>
                        {selectedEntry && students.length > 0 && (
                            <>
                                <div className="space-y-0.5">
                                    {students.map((s) => (
                                        <div key={s.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent/30" style={{ borderRadius: "var(--radius)" }}>
                                            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-xs" style={{ borderRadius: "9999px" }}>
                                                {s.first_name?.[0]}{s.last_name?.[0]}
                                            </div>
                                            <span className="text-sm flex-1">{s.first_name} {s.last_name}</span>
                                            <Select value={attendanceRecords[s.id] || "present"} onValueChange={(v) => setAttendanceRecords((r) => ({ ...r, [s.id]: v }))}>
                                                <SelectTrigger className="w-28 h-7 text-xs"><SelectValue /></SelectTrigger>
                                                <SelectContent>{STATUS_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                                            </Select>
                                        </div>
                                    ))}
                                </div>
                                <Button size="sm" onClick={handleMarkAttendance} disabled={markingAttendance} style={{ borderRadius: "var(--radius)" }}>
                                    {markingAttendance ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5 mr-1.5" />} Save
                                </Button>
                            </>
                        )}
                    </div>

                    {/* Attendance report */}
                    <div className="space-y-3">
                        <h3 className="text-sm font-semibold">Report</h3>
                        {loadingAttendance ? <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-8" />)}</div>
                            : courseAttendance.length === 0 ? <p className="text-sm text-muted-foreground py-4">No attendance records yet.</p>
                                : (
                                    <div className="space-y-0.5">
                                        {courseAttendance.slice(0, 50).map((r) => (
                                            <div key={r.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent/30 text-sm" style={{ borderRadius: "var(--radius)" }}>
                                                <span className="flex-1 font-medium">{r.student_name}</span>
                                                <span className="text-xs text-muted-foreground">{new Date(r.date).toLocaleDateString()}</span>
                                                <Badge variant={r.status === "present" ? "default" : r.status === "absent" ? "destructive" : "secondary"} className="text-[10px] px-1.5 h-4">{r.status}</Badge>
                                            </div>
                                        ))}
                                    </div>
                                )}
                    </div>
                </TabsContent>
            </Tabs>

            {/* Create Assignment Dialog */}
            <Dialog open={assignDialog} onOpenChange={setAssignDialog}>
                <DialogContent>
                    <DialogHeader><DialogTitle>New Assignment</DialogTitle></DialogHeader>
                    <form onSubmit={createAssignment} className="space-y-4">
                        <div className="space-y-2"><Label>Title</Label><Input value={assignForm.title} onChange={(e) => setAssignForm({ ...assignForm, title: e.target.value })} required /></div>
                        <div className="space-y-2"><Label>Description</Label><Textarea value={assignForm.description} onChange={(e) => setAssignForm({ ...assignForm, description: e.target.value })} rows={3} /></div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-2"><Label>Due Date</Label><Input type="datetime-local" value={assignForm.due_date} onChange={(e) => setAssignForm({ ...assignForm, due_date: e.target.value })} required /></div>
                            <div className="space-y-2"><Label>Max Marks</Label><Input type="number" value={assignForm.max_marks} onChange={(e) => setAssignForm({ ...assignForm, max_marks: +e.target.value })} required /></div>
                        </div>
                        <div className="space-y-2">
                            <Label>Type</Label>
                            <Select value={assignForm.assignment_type} onValueChange={(v) => setAssignForm({ ...assignForm, assignment_type: v })}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="assignment">Assignment</SelectItem><SelectItem value="quiz">Quiz</SelectItem>
                                    <SelectItem value="exam">Exam</SelectItem><SelectItem value="project">Project</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <DialogFooter><Button type="submit" disabled={assignSaving}>{assignSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Create</Button></DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Upload Content Dialog */}
            <Dialog open={uploadDialog} onOpenChange={(open) => { setUploadDialog(open); if (!open) setUploadFile(null); }}>
                <DialogContent>
                    <DialogHeader><DialogTitle>Upload Content</DialogTitle></DialogHeader>
                    <form onSubmit={handleUploadContent} className="space-y-4">
                        <div className="space-y-2"><Label>Title</Label><Input value={uploadForm.title} onChange={(e) => setUploadForm({ ...uploadForm, title: e.target.value })} required /></div>
                        <div className="space-y-2"><Label>Description</Label><Textarea value={uploadForm.description} onChange={(e) => setUploadForm({ ...uploadForm, description: e.target.value })} rows={2} /></div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-2">
                                <Label>Type</Label>
                                <Select value={uploadForm.content_type} onValueChange={(v) => setUploadForm({ ...uploadForm, content_type: v })}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent><SelectItem value="document">Document</SelectItem><SelectItem value="video">Video</SelectItem><SelectItem value="image">Image</SelectItem><SelectItem value="link">Link</SelectItem><SelectItem value="other">Other</SelectItem></SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Visibility</Label>
                                <Select value={uploadForm.visibility} onValueChange={(v) => setUploadForm({ ...uploadForm, visibility: v })}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent><SelectItem value="course">Course</SelectItem><SelectItem value="department">Department</SelectItem><SelectItem value="public">Public</SelectItem><SelectItem value="private">Private</SelectItem></SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>File</Label>
                            <input ref={uploadFileRef} type="file" className="block w-full text-sm border rounded-md p-2 file:mr-4 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-sm file:font-medium" style={{ borderColor: "var(--border)", borderRadius: "var(--radius)" }} onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)} />
                        </div>
                        <DialogFooter>
                            <Button type="submit" disabled={uploadSaving}>{uploadSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />} Upload</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* View Submissions Dialog */}
            <Dialog open={subDialog} onOpenChange={setSubDialog}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader><DialogTitle>Submissions: {subAssignment?.title}</DialogTitle></DialogHeader>
                    {loadingSubs ? <div className="space-y-3 py-4">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
                        : submissions.length === 0 ? <p className="py-8 text-center text-muted-foreground">No submissions yet.</p>
                            : (
                                <div className="space-y-0.5">
                                    {submissions.map((s) => (
                                        <div key={s.id} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-accent/30" style={{ borderRadius: "var(--radius)" }}>
                                            <span className="text-sm font-medium flex-1">{s.student_name}</span>
                                            <span className="text-xs text-muted-foreground">{new Date(s.submitted_at).toLocaleString()}</span>
                                            <Badge variant={s.status === "graded" ? "default" : "secondary"} className="text-[10px] h-4">{s.status}</Badge>
                                            <span className="text-sm w-12 text-right">{s.marks_obtained ?? "—"}</span>
                                            <Button variant="outline" size="sm" className="h-6 text-xs" onClick={() => { setGradeSub(s); setGradeForm({ marks_obtained: s.marks_obtained ?? 0, grade: s.grade ?? "", feedback: s.feedback ?? "" }); setGradeDialog(true); }} style={{ borderRadius: "var(--radius)" }}>
                                                {s.status === "graded" ? "Edit" : "Grade"}
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            )}
                </DialogContent>
            </Dialog>

            {/* Grade Dialog */}
            <Dialog open={gradeDialog} onOpenChange={setGradeDialog}>
                <DialogContent>
                    <DialogHeader><DialogTitle>Grade — {gradeSub?.student_name}</DialogTitle></DialogHeader>
                    <form onSubmit={handleGrade} className="space-y-4">
                        {gradeSub?.text_content && <div><p className="text-xs text-muted-foreground mb-1">Answer</p><p className="text-sm bg-muted p-3 rounded-md max-h-32 overflow-y-auto whitespace-pre-wrap" style={{ borderRadius: "var(--radius)" }}>{gradeSub.text_content}</p></div>}
                        {gradeSub?.file && <Button type="button" variant="outline" size="sm" onClick={() => window.open(gradeSub.file!, "_blank")}><Download className="h-3.5 w-3.5 mr-1.5" /> View File</Button>}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-2"><Label>Marks (/ {subAssignment?.max_marks})</Label><Input type="number" value={gradeForm.marks_obtained} onChange={(e) => setGradeForm({ ...gradeForm, marks_obtained: +e.target.value })} min={0} max={subAssignment?.max_marks} required /></div>
                            <div className="space-y-2"><Label>Grade</Label><Input value={gradeForm.grade} onChange={(e) => setGradeForm({ ...gradeForm, grade: e.target.value })} placeholder="A+, B, etc" /></div>
                        </div>
                        <div className="space-y-2"><Label>Feedback</Label><Textarea value={gradeForm.feedback} onChange={(e) => setGradeForm({ ...gradeForm, feedback: e.target.value })} rows={3} /></div>
                        <DialogFooter><Button type="submit" disabled={grading}>{grading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save</Button></DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
