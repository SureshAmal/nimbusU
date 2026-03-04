"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import api from "@/lib/api";
import { assignmentsService, contentService, attendanceService } from "@/services/api";
import type { CourseOffering, Assignment, Content, Submission } from "@/lib/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { ClipboardList, FileText, ScrollText, Download, Upload, Loader2, CheckCircle2, Eye, File, Video, Link2, Image, X, ExternalLink } from "lucide-react";

const TYPE_ICONS: Record<string, React.ReactNode> = {
    document: <FileText className="h-4 w-4 text-blue-500" />,
    video: <Video className="h-4 w-4 text-purple-500" />,
    link: <Link2 className="h-4 w-4 text-cyan-500" />,
    image: <Image className="h-4 w-4 text-emerald-500" />,
    other: <File className="h-4 w-4 text-gray-500" />,
};

function getFileExt(url?: string | null): string {
    if (!url) return "";
    const clean = url.split("?")[0].split("#")[0];
    const dot = clean.lastIndexOf(".");
    return dot >= 0 ? clean.substring(dot + 1).toLowerCase() : "";
}

function isPreviewable(ext: string, contentType: string): "pdf" | "video" | "image" | "office" | "text" | null {
    if (ext === "pdf") return "pdf";
    if (["mp4", "webm", "ogg", "mov"].includes(ext) || contentType === "video") return "video";
    if (["jpg", "jpeg", "png", "gif", "webp", "svg", "bmp"].includes(ext) || contentType === "image") return "image";
    if (["pptx", "ppt", "docx", "doc", "xlsx", "xls"].includes(ext)) return "office";
    if (["txt", "md", "markdown", "py", "js", "ts", "tsx", "jsx", "java", "c", "cpp", "h", "cs", "go", "rs", "rb", "php", "html", "css", "json", "xml", "yaml", "yml", "sh", "bash", "sql", "r"].includes(ext)) return "text";
    return null;
};

export default function StudentCourseDetailPage() {
    const params = useParams();
    const id = params.id as string;
    const [offering, setOffering] = useState<CourseOffering | null>(null);
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [content, setContent] = useState<Content[]>([]);
    const [attendance, setAttendance] = useState<unknown[]>([]);
    const [loading, setLoading] = useState(true);

    const [submitDialog, setSubmitDialog] = useState(false);
    const [submitAssignment, setSubmitAssignment] = useState<Assignment | null>(null);
    const [submitText, setSubmitText] = useState("");
    const [submitFile, setSubmitFile] = useState<File | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [viewSubDialog, setViewSubDialog] = useState(false);
    const [viewSubmission, setViewSubmission] = useState<Submission | null>(null);
    const [loadingSub, setLoadingSub] = useState(false);

    /* Content preview */
    const [previewContent, setPreviewContent] = useState<Content | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [textPreview, setTextPreview] = useState<string | null>(null);
    const [loadingPreview, setLoadingPreview] = useState(false);

    useEffect(() => {
        async function fetch() {
            try {
                const [offRes, assRes, contRes, attRes] = await Promise.all([
                    api.get(`/academics/offerings/${id}/`),
                    assignmentsService.list({ course_offering: id }),
                    contentService.list({ course_offering: id }),
                    attendanceService.myCourse(id).catch(() => ({ data: { results: [] } })),
                ]);
                setOffering(offRes.data);
                setAssignments(assRes.data.results ?? []);
                setContent(contRes.data.results ?? []);
                setAttendance(attRes.data.results ?? []);
            } catch { toast.error("Failed to load course data"); }
            finally { setLoading(false); }
        }
        fetch();
    }, [id]);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!submitAssignment) return;
        if (!submitText.trim() && !submitFile) { toast.error("Provide a file or text response"); return; }
        setSubmitting(true);
        try {
            const fd = new FormData();
            if (submitFile) fd.append("file", submitFile);
            if (submitText.trim()) fd.append("text_content", submitText);
            await assignmentsService.submit(submitAssignment.id, fd);
            toast.success("Assignment submitted!");
            setSubmitDialog(false); setSubmitText(""); setSubmitFile(null);
        } catch { toast.error("Failed to submit"); }
        finally { setSubmitting(false); }
    }

    async function viewMySubmission(assignment: Assignment) {
        setLoadingSub(true); setViewSubDialog(true); setViewSubmission(null);
        try {
            const { data } = await assignmentsService.mySubmission(assignment.id);
            setViewSubmission(data);
        } catch { toast.error("No submission found"); setViewSubDialog(false); }
        finally { setLoadingSub(false); }
    }

    async function resolveFileUrl(c: Content): Promise<string | null> {
        try {
            const { data } = await contentService.download(c.id);
            if (typeof data === "string") return data;
            if (data?.file_url) return data.file_url;
            if (data?.url) return data.url;
            if (data?.data?.file_url) return data.data.file_url;
        } catch { /* fallback */ }
        return c.file || null;
    }

    async function handleDownload(c: Content) {
        const url = await resolveFileUrl(c);
        if (url) window.open(url, "_blank");
        else toast.error("Download not available");
    }

    async function openPreview(c: Content) {
        setPreviewContent(c);
        setTextPreview(null);
        setPreviewUrl(null);

        // Resolve actual URL
        const url = await resolveFileUrl(c);
        setPreviewUrl(url);

        // For text files, try loading the content
        const ext = getFileExt(url || c.file);
        const kind = isPreviewable(ext, c.content_type);
        if (kind === "text" && url) {
            setLoadingPreview(true);
            try {
                const res = await fetch(url);
                const text = await res.text();
                setTextPreview(text.substring(0, 50000)); // Cap at 50k chars
            } catch { setTextPreview("[Could not load file contents]"); }
            finally { setLoadingPreview(false); }
        }
    }

    function closePreview() { setPreviewContent(null); setPreviewUrl(null); setTextPreview(null); }

    if (loading) return <div className="space-y-4"><Skeleton className="h-8 w-64" /><Skeleton className="h-[500px]" style={{ borderRadius: "var(--radius-lg)" }} /></div>;

    const present = (attendance as Array<{ status: string }>).filter((a) => a.status === "present" || a.status === "late").length;
    const total = attendance.length;
    const pct = total > 0 ? Math.round((present / total) * 100) : 0;

    return (
        <div className="space-y-6">
            {/* Header — flat, no card */}
            <div>
                <h1 className="text-2xl font-bold tracking-tight">{offering?.course_name}</h1>
                <div className="flex items-center gap-2 mt-1.5 text-sm text-muted-foreground">
                    <span className="font-mono">{offering?.course_code}</span>
                    <span>·</span>
                    <span>{offering?.faculty_name}</span>
                    <span>·</span>
                    <span>{offering?.semester_name}</span>
                </div>
            </div>

            <Tabs defaultValue="content">
                <TabsList>
                    <TabsTrigger value="content"><FileText className="h-4 w-4 mr-1.5" /> Content</TabsTrigger>
                    <TabsTrigger value="assignments"><ClipboardList className="h-4 w-4 mr-1.5" /> Assignments</TabsTrigger>
                    <TabsTrigger value="attendance"><ScrollText className="h-4 w-4 mr-1.5" /> Attendance</TabsTrigger>
                </TabsList>

                {/* Content tab — file-manager style grid */}
                <TabsContent value="content" className="mt-4">
                    {content.length === 0 ? (
                        <div className="py-16 text-center text-muted-foreground"><FileText className="h-8 w-8 mx-auto mb-2 opacity-40" />No content available.</div>
                    ) : (
                        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                            {content.map((c) => (
                                <div
                                    key={c.id}
                                    className="flex items-start gap-3 p-3 rounded-lg border border-transparent hover:border-border hover:bg-accent/30 transition-all cursor-pointer group"
                                    style={{ borderRadius: "var(--radius)" }}
                                    onClick={() => c.external_url ? window.open(c.external_url, "_blank") : openPreview(c)}
                                >
                                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted shrink-0" style={{ borderRadius: "var(--radius)" }}>
                                        {TYPE_ICONS[c.content_type] || TYPE_ICONS.other}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium truncate">{c.title}</p>
                                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                                            {c.file_size ? `${(c.file_size / 1024).toFixed(0)} KB` : c.content_type}
                                            {' · '}{c.uploaded_by_name}
                                        </p>
                                        <p className="text-xs text-muted-foreground">{new Date(c.created_at).toLocaleDateString()}</p>
                                    </div>
                                    {(c.file || c.external_url) && (
                                        <Download className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-1" />
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </TabsContent>

                {/* Assignments tab — flat list */}
                <TabsContent value="assignments" className="mt-4">
                    {assignments.length === 0 ? (
                        <div className="py-16 text-center text-muted-foreground"><ClipboardList className="h-8 w-8 mx-auto mb-2 opacity-40" />No assignments yet.</div>
                    ) : (
                        <div className="space-y-1">
                            {assignments.map((a) => {
                                const overdue = new Date(a.due_date) < new Date();
                                return (
                                    <div key={a.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent/30 transition-colors" style={{ borderRadius: "var(--radius)" }}>
                                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted shrink-0" style={{ borderRadius: "var(--radius)" }}>
                                            <ClipboardList className="h-4 w-4 text-muted-foreground" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium">{a.title}</p>
                                            <p className="text-xs text-muted-foreground">
                                                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 mr-1">{a.assignment_type}</Badge>
                                                Max: {a.max_marks}
                                                <span className="mx-1">·</span>
                                                Due: <span style={{ color: overdue ? "var(--destructive)" : undefined }}>{new Date(a.due_date).toLocaleDateString()}</span>
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-1.5 shrink-0">
                                            {!overdue && (
                                                <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => { setSubmitAssignment(a); setSubmitDialog(true); }} style={{ borderRadius: "var(--radius)" }}>
                                                    <Upload className="h-3 w-3 mr-1" /> Submit
                                                </Button>
                                            )}
                                            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => viewMySubmission(a)} style={{ borderRadius: "var(--radius)" }}>
                                                <Eye className="h-3 w-3 mr-1" /> Grade
                                            </Button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </TabsContent>

                {/* Attendance tab — flat stats, no card */}
                <TabsContent value="attendance" className="mt-4">
                    <div className="flex items-center gap-8 py-4">
                        <div className="text-center">
                            <div className="text-3xl font-bold" style={{ color: pct >= 75 ? "var(--primary)" : "var(--destructive)" }}>{pct}%</div>
                            <p className="text-xs text-muted-foreground mt-0.5">Overall</p>
                        </div>
                        <div className="h-12 w-px bg-border" />
                        <div className="text-center"><div className="text-xl font-semibold">{present}</div><p className="text-xs text-muted-foreground mt-0.5">Present</p></div>
                        <div className="text-center"><div className="text-xl font-semibold">{total - present}</div><p className="text-xs text-muted-foreground mt-0.5">Absent</p></div>
                        <div className="text-center"><div className="text-xl font-semibold">{total}</div><p className="text-xs text-muted-foreground mt-0.5">Total</p></div>
                    </div>
                    {/* Attendance visual bar */}
                    {total > 0 && (
                        <div className="w-full h-2 rounded-full bg-muted overflow-hidden mt-2" style={{ borderRadius: "var(--radius)" }}>
                            <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: pct >= 75 ? "var(--primary)" : "var(--destructive)", borderRadius: "var(--radius)" }} />
                        </div>
                    )}
                </TabsContent>
            </Tabs>

            {/* Submit Assignment Dialog */}
            <Dialog open={submitDialog} onOpenChange={(open) => { setSubmitDialog(open); if (!open) { setSubmitText(""); setSubmitFile(null); } }}>
                <DialogContent>
                    <DialogHeader><DialogTitle>Submit: {submitAssignment?.title}</DialogTitle></DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <p className="text-sm text-muted-foreground">Due: {submitAssignment && new Date(submitAssignment.due_date).toLocaleString()} · Max Marks: {submitAssignment?.max_marks}</p>
                        <div className="space-y-2">
                            <Label>Upload file (optional)</Label>
                            <input ref={fileInputRef} type="file" className="block w-full text-sm border rounded-md p-2 file:mr-4 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-sm file:font-medium" style={{ borderColor: "var(--border)", borderRadius: "var(--radius)" }} onChange={(e) => setSubmitFile(e.target.files?.[0] ?? null)} />
                        </div>
                        <div className="space-y-2">
                            <Label>Text response (optional)</Label>
                            <Textarea value={submitText} onChange={(e) => setSubmitText(e.target.value)} placeholder="Type your answer..." rows={5} />
                        </div>
                        <DialogFooter>
                            <Button type="submit" disabled={submitting}>
                                {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />} Submit
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* View Submission Dialog */}
            <Dialog open={viewSubDialog} onOpenChange={setViewSubDialog}>
                <DialogContent>
                    <DialogHeader><DialogTitle>My Submission</DialogTitle></DialogHeader>
                    {loadingSub ? (
                        <div className="space-y-3 py-4"><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-3/4" /><Skeleton className="h-4 w-1/2" /></div>
                    ) : viewSubmission ? (
                        <div className="space-y-4">
                            <div className="flex items-center gap-2">
                                <Badge variant={viewSubmission.status === "graded" ? "default" : "secondary"}>
                                    {viewSubmission.status === "graded" && <CheckCircle2 className="h-3 w-3 mr-1" />}{viewSubmission.status}
                                </Badge>
                                <span className="text-xs text-muted-foreground">Submitted {new Date(viewSubmission.submitted_at).toLocaleString()}</span>
                            </div>
                            {viewSubmission.text_content && (
                                <div><p className="text-xs text-muted-foreground mb-1">Your Answer</p><p className="text-sm bg-muted p-3 rounded-md whitespace-pre-wrap" style={{ borderRadius: "var(--radius)" }}>{viewSubmission.text_content}</p></div>
                            )}
                            {viewSubmission.file && (
                                <Button variant="outline" size="sm" onClick={() => window.open(viewSubmission.file!, "_blank")}><Download className="h-3.5 w-3.5 mr-1.5" /> Download</Button>
                            )}
                            {viewSubmission.status === "graded" && (
                                <div className="border-t pt-4 space-y-2">
                                    <h4 className="font-semibold text-sm">Grade & Feedback</h4>
                                    <div className="flex items-center gap-4">
                                        {viewSubmission.marks_obtained !== null && <div><span className="text-2xl font-bold" style={{ color: "var(--primary)" }}>{viewSubmission.marks_obtained}</span><span className="text-xs text-muted-foreground ml-1">marks</span></div>}
                                        {viewSubmission.grade && <Badge variant="default" className="text-sm px-2 py-0.5">{viewSubmission.grade}</Badge>}
                                    </div>
                                    {viewSubmission.feedback && <p className="text-sm text-muted-foreground">{viewSubmission.feedback}</p>}
                                </div>
                            )}
                        </div>
                    ) : <p className="py-6 text-center text-muted-foreground">No submission found.</p>}
                </DialogContent>
            </Dialog>

            {/* Content Preview */}
            {previewContent && (() => {
                const ext = getFileExt(previewUrl || previewContent.file);
                const kind = isPreviewable(ext, previewContent.content_type);
                return (
                    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: "rgba(0,0,0,0.8)" }}>
                        {/* Header bar */}
                        <div className="flex items-center justify-between px-4 py-3 bg-background/95 border-b backdrop-blur">
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted shrink-0" style={{ borderRadius: "var(--radius)" }}>
                                    {TYPE_ICONS[previewContent.content_type] || TYPE_ICONS.other}
                                </div>
                                <div className="min-w-0">
                                    <p className="text-sm font-medium truncate">{previewContent.title}</p>
                                    <p className="text-xs text-muted-foreground">{ext.toUpperCase()} · {previewContent.uploaded_by_name} · {new Date(previewContent.created_at).toLocaleDateString()}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-1.5">
                                {previewUrl && (
                                    <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => window.open(previewUrl, "_blank")} style={{ borderRadius: "var(--radius)" }}>
                                        <Download className="h-3 w-3" /> Download
                                    </Button>
                                )}
                                {previewUrl && (
                                    <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => window.open(previewUrl, "_blank")} style={{ borderRadius: "var(--radius)" }}>
                                        <ExternalLink className="h-3 w-3" /> Open
                                    </Button>
                                )}
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={closePreview}>
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>

                        {/* Preview body */}
                        <div className="flex-1 overflow-auto flex items-center justify-center p-4">
                            {!previewUrl ? (
                                <div className="text-center text-muted-foreground"><Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" /><p className="text-sm">Loading...</p></div>
                            ) : kind === "pdf" ? (
                                <iframe src={previewUrl} className="w-full h-full rounded-lg bg-white" style={{ maxWidth: 900, borderRadius: "var(--radius-lg)" }} />
                            ) : kind === "video" ? (
                                <video src={previewUrl} controls autoPlay className="max-w-full max-h-full rounded-lg" style={{ borderRadius: "var(--radius-lg)" }} />
                            ) : kind === "image" ? (
                                <img src={previewUrl} alt={previewContent.title} className="max-w-full max-h-full object-contain rounded-lg" style={{ borderRadius: "var(--radius-lg)" }} />
                            ) : kind === "office" ? (
                                <iframe
                                    src={`https://docs.google.com/gview?url=${encodeURIComponent(previewUrl)}&embedded=true`}
                                    className="w-full h-full rounded-lg bg-white"
                                    style={{ maxWidth: 900, borderRadius: "var(--radius-lg)" }}
                                />
                            ) : kind === "text" ? (
                                <div className="w-full max-w-4xl max-h-full overflow-auto bg-background rounded-lg border p-4" style={{ borderRadius: "var(--radius-lg)" }}>
                                    {loadingPreview ? (
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading content...</div>
                                    ) : (
                                        <pre className="text-sm font-mono whitespace-pre-wrap break-words leading-relaxed">{textPreview}</pre>
                                    )}
                                </div>
                            ) : (
                                <div className="text-center space-y-3">
                                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted mx-auto">
                                        {TYPE_ICONS[previewContent.content_type] || <File className="h-8 w-8 text-muted-foreground" />}
                                    </div>
                                    <p className="text-sm text-muted-foreground">Preview not available for this file type</p>
                                    {previewUrl && (
                                        <Button size="sm" onClick={() => window.open(previewUrl, "_blank")} style={{ borderRadius: "var(--radius)" }}>
                                            <Download className="h-3.5 w-3.5 mr-1.5" /> Download to view
                                        </Button>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                );
            })()}
        </div>
    );
}
