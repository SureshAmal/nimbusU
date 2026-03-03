"use client";

import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { announcementsService } from "@/services/api";
import type { Announcement } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
    Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter,
} from "@/components/ui/sheet";
import { Table, TableCard } from "@/components/application/table/table";
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
    ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger, ContextMenuSeparator,
} from "@/components/ui/context-menu";
import { toast } from "sonner";
import { Plus, Megaphone, Loader2, Trash2, Search, ChevronDown, X, Pencil } from "lucide-react";

const DEBOUNCE_MS = 400;

export default function AdminAnnouncementsPage() {
    const [items, setItems] = useState<Announcement[]>([]);
    const [initialLoading, setInitialLoading] = useState(true);
    const [sheetOpen, setSheetOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [editId, setEditId] = useState<string | null>(null);
    const [contextMenuAnnouncement, setContextMenuAnnouncement] = useState<Announcement | null>(null);
    const [search, setSearch] = useState("");
    const [priorityFilter, setPriorityFilter] = useState("all");
    const [form, setForm] = useState({ title: "", body: "", is_urgent: false, target_type: "all" });
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const abortRef = useRef<AbortController | null>(null);

    const fetchItems = useCallback(async (opts?: { showLoading?: boolean; searchOverride?: string }) => {
        if (opts?.showLoading) setInitialLoading(true);
        abortRef.current?.abort();
        const controller = new AbortController();
        abortRef.current = controller;
        try {
            const params: Record<string, string> = {};
            const q = opts?.searchOverride ?? search;
            if (q) params.search = q;
            const { data } = await announcementsService.list(params);
            if (!controller.signal.aborted) setItems(data.results ?? []);
        } catch (err: unknown) {
            if (err instanceof DOMException && err.name === "AbortError") return;
            toast.error("Failed to load");
        } finally {
            if (!controller.signal.aborted) setInitialLoading(false);
        }
    }, [search]);

    useEffect(() => { fetchItems({ showLoading: true }); }, []);
    useEffect(() => { return () => { if (debounceRef.current) clearTimeout(debounceRef.current); abortRef.current?.abort(); }; }, []);

    const handleSearchChange = useCallback((value: string) => {
        setSearch(value);
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => fetchItems({ searchOverride: value }), DEBOUNCE_MS);
    }, [fetchItems]);

    function openCreate() {
        setEditId(null);
        setForm({ title: "", body: "", is_urgent: false, target_type: "all" });
        setSheetOpen(true);
    }

    function openEdit(a: Announcement) {
        setEditId(a.id);
        setForm({ title: a.title, body: a.body, is_urgent: a.is_urgent, target_type: a.target_type });
        setSheetOpen(true);
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setSaving(true);
        try {
            if (editId) {
                await announcementsService.update(editId, form as unknown as Parameters<typeof announcementsService.update>[1]);
                toast.success("Announcement updated");
            } else {
                await announcementsService.create(form as unknown as Parameters<typeof announcementsService.create>[0]);
                toast.success("Announcement created");
            }
            setSheetOpen(false);
            setForm({ title: "", body: "", is_urgent: false, target_type: "all" });
            setEditId(null);
            fetchItems();
        } catch { toast.error("Failed to save"); }
        finally { setSaving(false); }
    }

    async function handleDelete(id: string) {
        setItems((prev) => prev.filter((a) => a.id !== id));
        try { await announcementsService.delete(id); toast.success("Deleted"); }
        catch { toast.error("Failed"); fetchItems(); }
    }

    const filteredItems = useMemo(() => {
        let result = items;
        if (priorityFilter === "urgent") result = result.filter((a) => a.is_urgent);
        if (priorityFilter === "normal") result = result.filter((a) => !a.is_urgent);
        return result;
    }, [items, priorityFilter]);

    const activeFilters = priorityFilter !== "all" ? 1 : 0;

    return (
        <div className="space-y-0">
            <ContextMenu onOpenChange={(open) => { if (!open) setTimeout(() => setContextMenuAnnouncement(null), 200); }}>
                <ContextMenuTrigger asChild>
                    <div className="w-full">
                        <TableCard.Root>
                            <div className="flex items-center gap-2 border-b border-secondary px-4 py-2">
                                <div className="relative flex-1">
                                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                                    <Input placeholder="Filter announcements..." value={search} onChange={(e) => handleSearchChange(e.target.value)} className="pl-9 h-8 text-sm border-none shadow-none bg-transparent focus-visible:ring-0" />
                                </div>
                                {activeFilters > 0 && (
                                    <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => setPriorityFilter("all")}><X className="h-3 w-3" /> Clear</Button>
                                )}
                                <Button size="sm" className="h-8 gap-1" onClick={openCreate}><Plus className="h-3.5 w-3.5" /> New</Button>
                            </div>

                            {initialLoading ? (
                                <div className="p-6 space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
                            ) : (
                                <Table aria-label="Announcements">
                                    <Table.Header>
                                        <Table.Row>
                                            <Table.Head isRowHeader><span className="text-xs font-semibold whitespace-nowrap text-quaternary">Title</span></Table.Head>
                                            <Table.Head><span className="text-xs font-semibold whitespace-nowrap text-quaternary">Author</span></Table.Head>
                                            <Table.Head><span className="text-xs font-semibold whitespace-nowrap text-quaternary">Target</span></Table.Head>
                                            <Table.Head>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <button className="flex items-center gap-1 text-xs font-semibold whitespace-nowrap text-quaternary hover:text-foreground transition-colors cursor-pointer">
                                                            Priority
                                                            {priorityFilter !== "all" && <span className="inline-flex items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] h-4 w-4">1</span>}
                                                            <ChevronDown className="h-3 w-3 opacity-50" />
                                                        </button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="start" className="w-32">
                                                        <DropdownMenuItem onClick={() => setPriorityFilter("all")} className={priorityFilter === "all" ? "font-semibold" : ""}>All</DropdownMenuItem>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem onClick={() => setPriorityFilter("urgent")} className={priorityFilter === "urgent" ? "font-semibold" : ""}>Urgent</DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => setPriorityFilter("normal")} className={priorityFilter === "normal" ? "font-semibold" : ""}>Normal</DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </Table.Head>
                                            <Table.Head><span className="text-xs font-semibold whitespace-nowrap text-quaternary">Date</span></Table.Head>
                                        </Table.Row>
                                    </Table.Header>
                                    <Table.Body>
                                        {filteredItems.length === 0 ? (
                                            <Table.Row id="empty"><Table.Cell colSpan={5} className="text-center py-8 text-muted-foreground">No announcements.</Table.Cell></Table.Row>
                                        ) : filteredItems.map((a) => (
                                            <Table.Row key={a.id} id={a.id} onContextMenu={() => setContextMenuAnnouncement(a)}>
                                                <Table.Cell className="font-medium flex items-center gap-2"><Megaphone className="h-4 w-4" style={{ color: "var(--primary)" }} />{a.title}</Table.Cell>
                                                <Table.Cell className="text-muted-foreground">{a.created_by_name}</Table.Cell>
                                                <Table.Cell><Badge variant="secondary">{a.target_type}</Badge></Table.Cell>
                                                <Table.Cell>{a.is_urgent ? <Badge variant="destructive">Urgent</Badge> : <Badge variant="outline">Normal</Badge>}</Table.Cell>
                                                <Table.Cell className="text-muted-foreground">{new Date(a.created_at).toLocaleDateString()}</Table.Cell>
                                            </Table.Row>
                                        ))}
                                    </Table.Body>
                                </Table>
                            )}

                            <div className="flex items-center justify-between border-t border-secondary px-4 py-2 text-xs text-muted-foreground">
                                <span>{filteredItems.length} announcement{filteredItems.length !== 1 ? "s" : ""}</span>
                                {activeFilters > 0 && <span>{activeFilters} filter applied</span>}
                            </div>
                        </TableCard.Root>
                    </div>
                </ContextMenuTrigger>
                {contextMenuAnnouncement && (
                    <ContextMenuContent className="w-48">
                        <ContextMenuItem onClick={() => openEdit(contextMenuAnnouncement)}>
                            <Pencil className="h-4 w-4 mr-2" /> Edit
                        </ContextMenuItem>
                        <ContextMenuSeparator />
                        <ContextMenuItem onClick={() => handleDelete(contextMenuAnnouncement.id)} className="text-destructive focus:bg-destructive/10">
                            <Trash2 className="h-4 w-4 mr-2" /> Delete
                        </ContextMenuItem>
                    </ContextMenuContent>
                )}
            </ContextMenu>

            <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
                <SheetContent side="right">
                    <SheetHeader>
                        <SheetTitle>{editId ? "Edit" : "New"} Announcement</SheetTitle>
                        <SheetDescription>{editId ? "Update this announcement." : "Publish an announcement to users."}</SheetDescription>
                    </SheetHeader>
                    <form onSubmit={handleSubmit} className="flex flex-col gap-4 px-4 flex-1">
                        <div className="space-y-2"><Label>Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required /></div>
                        <div className="space-y-2"><Label>Body</Label><Textarea value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} required rows={4} /></div>
                        <div className="flex items-center gap-2">
                            <Checkbox id="urgent" checked={form.is_urgent} onCheckedChange={(v) => setForm({ ...form, is_urgent: !!v })} />
                            <Label htmlFor="urgent">Mark as urgent</Label>
                        </div>
                        <SheetFooter>
                            <Button type="submit" disabled={saving} className="w-full">
                                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} {editId ? "Update" : "Publish"}
                            </Button>
                        </SheetFooter>
                    </form>
                </SheetContent>
            </Sheet>
        </div>
    );
}
