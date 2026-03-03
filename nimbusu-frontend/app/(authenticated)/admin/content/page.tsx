"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { contentService } from "@/services/api";
import type { Content } from "@/lib/types";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableCard } from "@/components/application/table/table";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
    ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger, ContextMenuSeparator,
} from "@/components/ui/context-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter,
} from "@/components/ui/sheet";
import { Search, FileText, Video, Link2, Image, File, Eye, Trash2, ExternalLink, Pencil, Loader2 } from "lucide-react";

const TYPE_ICONS: Record<string, React.ReactNode> = {
    document: <FileText className="h-4 w-4" />,
    video: <Video className="h-4 w-4" />,
    link: <Link2 className="h-4 w-4" />,
    image: <Image className="h-4 w-4" />,
    other: <File className="h-4 w-4" />,
};

const DEBOUNCE_MS = 400;

export default function AdminContentPage() {
    const [items, setItems] = useState<Content[]>([]);
    const [initialLoading, setInitialLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [typeFilter, setTypeFilter] = useState("all");
    const [ctxItem, setCtxItem] = useState<Content | null>(null);
    const [sheetOpen, setSheetOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [editId, setEditId] = useState<string | null>(null);
    const [form, setForm] = useState<{ title: string; description: string; visibility: Content["visibility"] }>({ title: "", description: "", visibility: "public" });

    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const abortRef = useRef<AbortController | null>(null);

    const fetchContent = useCallback(async (opts?: { showLoading?: boolean; searchOverride?: string }) => {
        if (opts?.showLoading) setInitialLoading(true);
        abortRef.current?.abort();
        const controller = new AbortController();
        abortRef.current = controller;
        try {
            const params: Record<string, string> = {};
            const q = opts?.searchOverride ?? search;
            if (q) params.search = q;
            if (typeFilter !== "all") params.content_type = typeFilter;
            const { data } = await contentService.list(params);
            if (!controller.signal.aborted) setItems(data.results ?? []);
        } catch (err: unknown) {
            if (err instanceof DOMException && err.name === "AbortError") return;
            if (!controller.signal.aborted) toast.error("Failed to load content");
        } finally {
            if (!controller.signal.aborted) setInitialLoading(false);
        }
    }, [search, typeFilter]);

    useEffect(() => { fetchContent({ showLoading: true }); return () => abortRef.current?.abort(); }, []);
    useEffect(() => { fetchContent(); }, [typeFilter]);

    const handleSearchChange = (val: string) => {
        setSearch(val);
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => fetchContent({ searchOverride: val }), DEBOUNCE_MS);
    };

    async function handleDelete(id: string) {
        const prev = [...items];
        setItems((i) => i.filter((x) => x.id !== id));
        try { await contentService.delete(id); toast.success("Content deleted"); }
        catch { setItems(prev); toast.error("Failed to delete"); }
    }

    function openEdit(c: Content) {
        setEditId(c.id);
        setForm({ title: c.title, description: c.description || "", visibility: c.visibility });
        setSheetOpen(true);
    }

    async function handleUpdate(e: React.FormEvent) {
        e.preventDefault();
        if (!editId) return;
        setSaving(true);
        try {
            await contentService.update(editId, form as Partial<Content>);
            toast.success("Content updated");
            setSheetOpen(false);
            setEditId(null);
            fetchContent();
        } catch { toast.error("Failed to update content"); }
        finally { setSaving(false); }
    }

    return (
        <div className="space-y-4">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Content Oversight</h1>
                <p className="text-muted-foreground text-sm">Monitor all uploaded content across the platform</p>
            </div>

            <ContextMenu onOpenChange={(open) => { if (!open) setCtxItem(null); }}>
                <ContextMenuTrigger asChild>
                    <div className="w-full">
                        <TableCard.Root>
                            <div className="flex items-center gap-2 border-b border-secondary px-4 py-2">
                                <div className="relative flex-1">
                                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                                    <Input placeholder="Filter content..." value={search} onChange={(e) => handleSearchChange(e.target.value)} className="pl-9 h-8 text-sm border-none shadow-none bg-transparent focus-visible:ring-0" />
                                </div>
                                <Select value={typeFilter} onValueChange={setTypeFilter}>
                                    <SelectTrigger className="w-36 h-8 text-xs"><SelectValue placeholder="All types" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Types</SelectItem>
                                        <SelectItem value="document">Documents</SelectItem>
                                        <SelectItem value="video">Videos</SelectItem>
                                        <SelectItem value="link">Links</SelectItem>
                                        <SelectItem value="image">Images</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {initialLoading ? (
                                <div className="p-6 space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
                            ) : (
                                <Table aria-label="Content">
                                    <Table.Header>
                                        <Table.Row>
                                            <Table.Head isRowHeader><span className="text-xs font-semibold whitespace-nowrap text-quaternary">Title</span></Table.Head>
                                            <Table.Head><span className="text-xs font-semibold whitespace-nowrap text-quaternary">Type</span></Table.Head>
                                            <Table.Head><span className="text-xs font-semibold whitespace-nowrap text-quaternary">Uploaded By</span></Table.Head>
                                            <Table.Head><span className="text-xs font-semibold whitespace-nowrap text-quaternary">Visibility</span></Table.Head>
                                            <Table.Head><span className="text-xs font-semibold whitespace-nowrap text-quaternary">Date</span></Table.Head>
                                        </Table.Row>
                                    </Table.Header>
                                    <Table.Body>
                                        {items.length === 0 ? (
                                            <Table.Row id="empty"><Table.Cell colSpan={5} className="text-center py-8 text-muted-foreground"><File className="h-8 w-8 mx-auto mb-2 opacity-40" /><p>No content found.</p></Table.Cell></Table.Row>
                                        ) : (
                                            items.map((c) => (
                                                <Table.Row key={c.id} id={c.id} onContextMenu={() => setCtxItem(c)}>
                                                    <Table.Cell>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-muted-foreground shrink-0">{TYPE_ICONS[c.content_type] ?? TYPE_ICONS.other}</span>
                                                            <span className="font-medium truncate">{c.title}</span>
                                                        </div>
                                                    </Table.Cell>
                                                    <Table.Cell><Badge variant="secondary">{c.content_type}</Badge></Table.Cell>
                                                    <Table.Cell className="text-muted-foreground">{c.uploaded_by_name}</Table.Cell>
                                                    <Table.Cell><Badge variant="outline">{c.visibility}</Badge></Table.Cell>
                                                    <Table.Cell className="text-muted-foreground">{new Date(c.created_at).toLocaleDateString()}</Table.Cell>
                                                </Table.Row>
                                            ))
                                        )}
                                    </Table.Body>
                                </Table>
                            )}

                            <div className="flex items-center justify-between border-t border-secondary px-4 py-2 text-xs text-muted-foreground">
                                <span>{items.length} item{items.length !== 1 ? "s" : ""}</span>
                            </div>
                        </TableCard.Root>
                    </div>
                </ContextMenuTrigger>
                <ContextMenuContent>
                    {ctxItem ? (
                        <>
                            {ctxItem.external_url && <ContextMenuItem onClick={() => window.open(ctxItem.external_url!, "_blank")}><ExternalLink className="h-3.5 w-3.5 mr-2" />Open Link</ContextMenuItem>}
                            <ContextMenuItem onClick={() => openEdit(ctxItem)}><Pencil className="h-3.5 w-3.5 mr-2" />Edit Details</ContextMenuItem>
                            <ContextMenuSeparator />
                            <ContextMenuItem onClick={() => handleDelete(ctxItem.id)} className="text-destructive focus:text-destructive"><Trash2 className="h-3.5 w-3.5 mr-2" />Delete</ContextMenuItem>
                        </>
                    ) : (
                        <ContextMenuItem disabled>Right-click a row for actions</ContextMenuItem>
                    )}
                </ContextMenuContent>
            </ContextMenu>

            <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
                <SheetContent side="right">
                    <SheetHeader>
                        <SheetTitle>Edit Content Details</SheetTitle>
                        <SheetDescription>Update title, description, or visibility.</SheetDescription>
                    </SheetHeader>
                    <form onSubmit={handleUpdate} className="flex flex-col gap-4 px-4 flex-1 mt-4">
                        <div className="space-y-2">
                            <Label>Title</Label>
                            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
                        </div>
                        <div className="space-y-2">
                            <Label>Description</Label>
                            <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={4} />
                        </div>
                        <div className="space-y-2">
                            <Label>Visibility</Label>
                            <Select value={form.visibility} onValueChange={(v) => setForm({ ...form, visibility: v as Content["visibility"] })}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="public">Public</SelectItem>
                                    <SelectItem value="department">Department</SelectItem>
                                    <SelectItem value="course">Course</SelectItem>
                                    <SelectItem value="private">Private</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <SheetFooter>
                            <Button type="submit" disabled={saving} className="w-full mt-4">
                                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Update Content
                            </Button>
                        </SheetFooter>
                    </form>
                </SheetContent>
            </Sheet>
        </div>
    );
}
