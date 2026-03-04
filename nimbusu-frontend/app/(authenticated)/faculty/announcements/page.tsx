"use client";

import { useEffect, useState } from "react";
import { announcementsService, offeringsService } from "@/services/api";
import type { Announcement, CourseOffering } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { Megaphone, Plus, Loader2, MoreHorizontal, Pencil, Trash2 } from "lucide-react";

export default function FacultyAnnouncementsPage() {
    const [items, setItems] = useState<Announcement[]>([]);
    const [loading, setLoading] = useState(true);
    const [offerings, setOfferings] = useState<CourseOffering[]>([]);

    const [dialogOpen, setDialogOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [editId, setEditId] = useState<string | null>(null);
    const [form, setForm] = useState({ title: "", body: "", target_type: "course" as string, target_id: "" as string, is_urgent: false });

    async function fetchAnnouncements() {
        setLoading(true);
        try { const { data } = await announcementsService.list(); setItems(data.results ?? []); }
        catch { toast.error("Failed to load"); }
        finally { setLoading(false); }
    }

    useEffect(() => { fetchAnnouncements(); }, []);

    useEffect(() => {
        if (!dialogOpen) return;
        offeringsService.list().then(({ data }) => setOfferings(data.results ?? [])).catch(() => { });
    }, [dialogOpen]);

    function openCreate() { setEditId(null); setForm({ title: "", body: "", target_type: "course", target_id: "", is_urgent: false }); setDialogOpen(true); }
    function openEdit(a: Announcement) { setEditId(a.id); setForm({ title: a.title, body: a.body, target_type: a.target_type, target_id: a.target_id ?? "", is_urgent: a.is_urgent }); setDialogOpen(true); }

    async function handleSave(e: React.FormEvent) {
        e.preventDefault();
        if (!form.title.trim() || !form.body.trim()) { toast.error("Title and body required"); return; }
        setSaving(true);
        try {
            const payload = { title: form.title, body: form.body, target_type: form.target_type, target_id: form.target_id || null, is_urgent: form.is_urgent, is_published: true };
            if (editId) { await announcementsService.update(editId, payload); toast.success("Updated"); }
            else { await announcementsService.create(payload); toast.success("Created"); }
            setDialogOpen(false); fetchAnnouncements();
        } catch { toast.error("Failed to save"); }
        finally { setSaving(false); }
    }

    async function handleDelete(id: string) {
        try { await announcementsService.delete(id); toast.success("Deleted"); setItems((p) => p.filter((a) => a.id !== id)); }
        catch { toast.error("Failed to delete"); }
    }

    if (loading) return <div className="space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-[300px]" /></div>;

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Announcements</h1>
                    <p className="text-sm text-muted-foreground">Create and manage announcements</p>
                </div>
                <Button size="sm" onClick={openCreate} style={{ borderRadius: "var(--radius)" }}><Plus className="h-3.5 w-3.5 mr-1.5" /> New</Button>
            </div>

            {items.length === 0 ? (
                <div className="py-16 text-center text-muted-foreground"><Megaphone className="h-8 w-8 mx-auto mb-2 opacity-40" /><p>No announcements yet. Create your first one!</p></div>
            ) : (
                <div className="space-y-0.5">
                    {items.map((a) => (
                        <div key={a.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-accent/30 transition-colors group" style={{ borderRadius: "var(--radius)" }}>
                            <div className={`flex h-8 w-8 items-center justify-center rounded-lg shrink-0 ${a.is_urgent ? "bg-destructive/10" : "bg-muted"}`} style={{ borderRadius: "var(--radius)" }}>
                                <Megaphone className="h-4 w-4" style={{ color: a.is_urgent ? "var(--destructive)" : "var(--muted-foreground)" }} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <p className="text-sm font-medium">{a.title}</p>
                                    {a.is_urgent && <Badge variant="destructive" className="text-[10px] h-4 px-1.5">Urgent</Badge>}
                                    <Badge variant="outline" className="text-[10px] h-3.5 px-1">{a.target_type}</Badge>
                                </div>
                                <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{a.body}</p>
                                <p className="text-xs text-muted-foreground mt-1">{new Date(a.created_at).toLocaleDateString()}</p>
                            </div>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"><MoreHorizontal className="h-4 w-4" /></Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => openEdit(a)}><Pencil className="h-3.5 w-3.5 mr-2" /> Edit</DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleDelete(a.id)} className="text-destructive focus:text-destructive"><Trash2 className="h-3.5 w-3.5 mr-2" /> Delete</DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    ))}
                </div>
            )}

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent>
                    <DialogHeader><DialogTitle>{editId ? "Edit" : "New"} Announcement</DialogTitle></DialogHeader>
                    <form onSubmit={handleSave} className="space-y-4">
                        <div className="space-y-2"><Label>Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required /></div>
                        <div className="space-y-2"><Label>Body</Label><Textarea value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} rows={4} required /></div>
                        <div className="space-y-2">
                            <Label>Target Course</Label>
                            <Select value={form.target_id} onValueChange={(v) => setForm({ ...form, target_id: v })}>
                                <SelectTrigger><SelectValue placeholder="All courses" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="">All</SelectItem>
                                    {offerings.map((o) => <SelectItem key={o.id} value={o.id}>{o.course_name} (Section {o.section})</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex items-center gap-2"><Switch checked={form.is_urgent} onCheckedChange={(v) => setForm({ ...form, is_urgent: v })} /><Label>Urgent</Label></div>
                        <DialogFooter><Button type="submit" disabled={saving}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{editId ? "Save" : "Publish"}</Button></DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
