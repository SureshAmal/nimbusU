"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { schoolsService, usersService } from "@/services/api";
import type { School, User } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableCard } from "@/components/application/table/table";
import {
    Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter,
} from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
    ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger, ContextMenuSeparator,
} from "@/components/ui/context-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Plus, Building2, Loader2, Pencil, Trash2, Search } from "lucide-react";

const DEBOUNCE_MS = 400;

export default function AdminSchoolsPage() {
    const [schools, setSchools] = useState<School[]>([]);
    const [initialLoading, setInitialLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [sheetOpen, setSheetOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [editId, setEditId] = useState<string | null>(null);
    const [form, setForm] = useState({ name: "", code: "", dean: null as string | null });
    const [ctxDept, setCtxDept] = useState<School | null>(null);
    const [facultyUsers, setFacultyUsers] = useState<User[]>([]);

    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const abortRef = useRef<AbortController | null>(null);

    const fetchSchools = useCallback(async (opts?: { showLoading?: boolean }) => {
        if (opts?.showLoading) setInitialLoading(true);
        abortRef.current?.abort();
        const controller = new AbortController();
        abortRef.current = controller;
        try {
            const { data } = await schoolsService.list();
            if (!controller.signal.aborted) setSchools(data.results ?? []);
        } catch (err: unknown) {
            if (err instanceof DOMException && err.name === "AbortError") return;
            if (!controller.signal.aborted) toast.error("Failed to load schools");
        } finally {
            if (!controller.signal.aborted) setInitialLoading(false);
        }
    }, []);

    const fetchFaculty = useCallback(async () => {
        try {
            const [deanRes, headRes, adminRes] = await Promise.all([
                usersService.list({ role: "dean", page_size: "100" }),
                usersService.list({ role: "head", page_size: "100" }),
                usersService.list({ role: "admin", page_size: "50" })
            ]);
            setFacultyUsers([
                ...(deanRes.data.results ?? []),
                ...(headRes.data.results ?? []),
                ...(adminRes.data.results ?? [])
            ]);
        } catch { }
    }, []);

    useEffect(() => {
        fetchSchools({ showLoading: true });
        fetchFaculty();
        return () => abortRef.current?.abort();
    }, []);

    const handleSearchChange = (val: string) => {
        setSearch(val);
    };

    function openCreate() { setEditId(null); setForm({ name: "", code: "", dean: null }); setSheetOpen(true); }
    function openEdit(d: School) { setEditId(d.id); setForm({ name: d.name, code: d.code, dean: d.dean }); setSheetOpen(true); }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault(); setSaving(true);
        try {
            if (editId) await schoolsService.update(editId, form);
            else await schoolsService.create(form);
            toast.success(editId ? "School updated" : "School created");
            setSheetOpen(false); fetchSchools();
        } catch { toast.error("Failed to save school"); }
        finally { setSaving(false); }
    }

    async function handleDelete(id: string) {
        const prev = [...schools];
        setSchools((d) => d.filter((x) => x.id !== id));
        try { await schoolsService.delete(id); toast.success("School deleted"); }
        catch { setSchools(prev); toast.error("Failed to delete"); }
    }

    const q = search.toLowerCase();
    const filtered = schools.filter((d) => {
        if (!q) return true;
        return d.name.toLowerCase().includes(q) || d.code.toLowerCase().includes(q) || (d.dean_name ?? "").toLowerCase().includes(q);
    });

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Schools</h1>
                    <p className="text-muted-foreground text-sm">Manage university schools</p>
                </div>
                <Button onClick={openCreate} style={{ borderRadius: "var(--radius)" }}>
                    <Plus className="h-4 w-4 mr-2" /> Add School
                </Button>
            </div>

            <ContextMenu onOpenChange={(open) => { if (!open) setCtxDept(null); }}>
                <ContextMenuTrigger asChild>
                    <div className="w-full">
                        <TableCard.Root>
                            {/* Toolbar */}
                            <div className="flex items-center gap-2 border-b border-secondary px-4 py-2">
                                <div className="relative flex-1">
                                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                                    <Input
                                        placeholder="Filter schools..."
                                        value={search}
                                        onChange={(e) => handleSearchChange(e.target.value)}
                                        className="pl-9 h-8 text-sm border-none shadow-none bg-transparent focus-visible:ring-0"
                                    />
                                </div>
                            </div>

                            {initialLoading ? (
                                <div className="p-6 space-y-3">
                                    {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
                                </div>
                            ) : (
                                <Table aria-label="Schools">
                                    <Table.Header>
                                        <Table.Row>
                                            <Table.Head isRowHeader><span className="text-xs font-semibold whitespace-nowrap text-quaternary">Code</span></Table.Head>
                                            <Table.Head><span className="text-xs font-semibold whitespace-nowrap text-quaternary">Name</span></Table.Head>
                                            <Table.Head><span className="text-xs font-semibold whitespace-nowrap text-quaternary">Dean</span></Table.Head>
                                            <Table.Head><span className="text-xs font-semibold whitespace-nowrap text-quaternary">Created</span></Table.Head>
                                        </Table.Row>
                                    </Table.Header>
                                    <Table.Body>
                                        {filtered.length === 0 ? (
                                            <Table.Row id="empty">
                                                <Table.Cell colSpan={4} className="text-center py-8 text-muted-foreground">
                                                    <Building2 className="h-8 w-8 mx-auto mb-2 opacity-40" />
                                                    <p>No schools found.</p>
                                                </Table.Cell>
                                            </Table.Row>
                                        ) : (
                                            filtered.map((d) => (
                                                <Table.Row key={d.id} id={d.id} onContextMenu={() => setCtxDept(d)}>
                                                    <Table.Cell><Badge variant="secondary">{d.code}</Badge></Table.Cell>
                                                    <Table.Cell>
                                                        <div className="flex items-center gap-2">
                                                            <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                                                            <span className="font-medium">{d.name}</span>
                                                        </div>
                                                    </Table.Cell>
                                                    <Table.Cell className="text-muted-foreground">{d.dean_name ?? "Not assigned"}</Table.Cell>
                                                    <Table.Cell className="text-muted-foreground">{new Date(d.created_at).toLocaleDateString()}</Table.Cell>
                                                </Table.Row>
                                            ))
                                        )}
                                    </Table.Body>
                                </Table>
                            )}

                            <div className="flex items-center justify-between border-t border-secondary px-4 py-2 text-xs text-muted-foreground">
                                <span>{filtered.length} school{filtered.length !== 1 ? "s" : ""}</span>
                            </div>
                        </TableCard.Root>
                    </div>
                </ContextMenuTrigger>
                <ContextMenuContent>
                    {ctxDept ? (
                        <>
                            <ContextMenuItem onClick={() => openEdit(ctxDept)}><Pencil className="h-3.5 w-3.5 mr-2" />Edit</ContextMenuItem>
                            <ContextMenuSeparator />
                            <ContextMenuItem onClick={() => handleDelete(ctxDept.id)} className="text-destructive focus:text-destructive"><Trash2 className="h-3.5 w-3.5 mr-2" />Delete</ContextMenuItem>
                        </>
                    ) : (
                        <ContextMenuItem onClick={openCreate}><Plus className="h-3.5 w-3.5 mr-2" />Add School</ContextMenuItem>
                    )}
                </ContextMenuContent>
            </ContextMenu>

            {/* Sheet */}
            <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
                <SheetContent>
                    <SheetHeader>
                        <SheetTitle>{editId ? "Edit" : "Create"} School</SheetTitle>
                        <SheetDescription>{editId ? "Update school details." : "Add a new school."}</SheetDescription>
                    </SheetHeader>
                    <form onSubmit={handleSubmit} className="space-y-4 p-4">
                        <div className="space-y-2"><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
                        <div className="space-y-2"><Label>Code</Label><Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} required maxLength={10} /></div>
                        <div className="space-y-2">
                            <Label>Dean</Label>
                            <Select value={form.dean ?? "none"} onValueChange={(val) => setForm({ ...form, dean: val === "none" ? null : val })}>
                                <SelectTrigger><SelectValue placeholder="Select dean (optional)" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">Not assigned</SelectItem>
                                    {facultyUsers.map(u => <SelectItem key={u.id} value={u.id}>{u.first_name} {u.last_name} ({u.email})</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <SheetFooter><Button type="submit" disabled={saving}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{editId ? "Update" : "Create"}</Button></SheetFooter>
                    </form>
                </SheetContent>
            </Sheet>
        </div>
    );
}
