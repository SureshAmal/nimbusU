"use client";

import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { assignmentsService } from "@/services/api";
import type { Assignment } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableCard } from "@/components/application/table/table";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { Search, ChevronDown, X } from "lucide-react";

const DEBOUNCE_MS = 400;

export default function StudentAssignmentsPage() {
    const [items, setItems] = useState<Assignment[]>([]);
    const [initialLoading, setInitialLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [typeFilter, setTypeFilter] = useState("all");
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
            const { data } = await assignmentsService.list(params);
            if (!controller.signal.aborted) setItems(data.results ?? []);
        } catch (err: unknown) {
            if (err instanceof DOMException && err.name === "AbortError") return;
            toast.error("Failed to load assignments");
        } finally {
            if (!controller.signal.aborted) setInitialLoading(false);
        }
    }, [search]);

    useEffect(() => { fetchItems({ showLoading: true }); }, []);

    const handleSearchChange = useCallback((value: string) => {
        setSearch(value);
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            fetchItems({ searchOverride: value });
        }, DEBOUNCE_MS);
    }, [fetchItems]);

    useEffect(() => {
        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
            abortRef.current?.abort();
        };
    }, []);

    const now = new Date();
    const uniqueTypes = useMemo(() => [...new Set(items.map((a) => a.assignment_type))].sort(), [items]);

    const filteredItems = useMemo(() => {
        let result = items;
        if (statusFilter === "overdue") result = result.filter((a) => new Date(a.due_date) < now);
        if (statusFilter === "open") result = result.filter((a) => new Date(a.due_date) >= now);
        if (typeFilter !== "all") result = result.filter((a) => a.assignment_type === typeFilter);
        return result;
    }, [items, statusFilter, typeFilter]);

    const activeFilters = (statusFilter !== "all" ? 1 : 0) + (typeFilter !== "all" ? 1 : 0);

    return (
        <div className="space-y-0">
            <TableCard.Root>
                <div className="flex items-center gap-2 border-b border-secondary px-4 py-2">
                    <div className="relative flex-1">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                        <Input
                            placeholder="Filter assignments..."
                            value={search}
                            onChange={(e) => handleSearchChange(e.target.value)}
                            className="pl-9 h-8 text-sm border-none shadow-none bg-transparent focus-visible:ring-0"
                        />
                    </div>
                    {activeFilters > 0 && (
                        <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => { setStatusFilter("all"); setTypeFilter("all"); }}>
                            <X className="h-3 w-3" /> Clear
                        </Button>
                    )}
                </div>

                {initialLoading ? (
                    <div className="p-6 space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
                ) : (
                    <Table aria-label="Assignments">
                        <Table.Header>
                            <Table.Row>
                                <Table.Head isRowHeader><span className="text-xs font-semibold whitespace-nowrap text-quaternary">Title</span></Table.Head>
                                <Table.Head><span className="text-xs font-semibold whitespace-nowrap text-quaternary">Course</span></Table.Head>
                                <Table.Head>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <button className="flex items-center gap-1 text-xs font-semibold whitespace-nowrap text-quaternary hover:text-foreground transition-colors cursor-pointer">
                                                Type
                                                {typeFilter !== "all" && <span className="inline-flex items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] h-4 w-4">1</span>}
                                                <ChevronDown className="h-3 w-3 opacity-50" />
                                            </button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="start" className="w-36">
                                            <DropdownMenuItem onClick={() => setTypeFilter("all")} className={typeFilter === "all" ? "font-semibold" : ""}>All Types</DropdownMenuItem>
                                            <DropdownMenuSeparator />
                                            {uniqueTypes.map((t) => (
                                                <DropdownMenuItem key={t} onClick={() => setTypeFilter(t)} className={typeFilter === t ? "font-semibold" : ""}>{t}</DropdownMenuItem>
                                            ))}
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </Table.Head>
                                <Table.Head><span className="text-xs font-semibold whitespace-nowrap text-quaternary">Due Date</span></Table.Head>
                                <Table.Head><span className="text-xs font-semibold whitespace-nowrap text-quaternary">Max Marks</span></Table.Head>
                                <Table.Head>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <button className="flex items-center gap-1 text-xs font-semibold whitespace-nowrap text-quaternary hover:text-foreground transition-colors cursor-pointer">
                                                Status
                                                {statusFilter !== "all" && <span className="inline-flex items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] h-4 w-4">1</span>}
                                                <ChevronDown className="h-3 w-3 opacity-50" />
                                            </button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="start" className="w-32">
                                            <DropdownMenuItem onClick={() => setStatusFilter("all")} className={statusFilter === "all" ? "font-semibold" : ""}>All</DropdownMenuItem>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem onClick={() => setStatusFilter("open")} className={statusFilter === "open" ? "font-semibold" : ""}>Open</DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => setStatusFilter("overdue")} className={statusFilter === "overdue" ? "font-semibold" : ""}>Overdue</DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </Table.Head>
                            </Table.Row>
                        </Table.Header>
                        <Table.Body>
                            {filteredItems.length === 0 ? (
                                <Table.Row id="empty"><Table.Cell colSpan={6} className="text-center py-8 text-muted-foreground">No assignments found.</Table.Cell></Table.Row>
                            ) : filteredItems.map((a) => {
                                const due = new Date(a.due_date);
                                const overdue = due < now;
                                return (
                                    <Table.Row key={a.id} id={a.id}>
                                        <Table.Cell className="font-medium">{a.title}</Table.Cell>
                                        <Table.Cell className="text-muted-foreground">{a.course_name}</Table.Cell>
                                        <Table.Cell><Badge variant="secondary">{a.assignment_type}</Badge></Table.Cell>
                                        <Table.Cell><span style={{ color: overdue ? "var(--destructive)" : undefined }}>{due.toLocaleDateString()}</span></Table.Cell>
                                        <Table.Cell>{a.max_marks}</Table.Cell>
                                        <Table.Cell>{overdue ? <Badge variant="destructive">Overdue</Badge> : <Badge variant="outline">Open</Badge>}</Table.Cell>
                                    </Table.Row>
                                );
                            })}
                        </Table.Body>
                    </Table>
                )}

                <div className="flex items-center justify-between border-t border-secondary px-4 py-2 text-xs text-muted-foreground">
                    <span>{filteredItems.length} assignment{filteredItems.length !== 1 ? "s" : ""}</span>
                    {activeFilters > 0 && <span>{activeFilters} filter{activeFilters !== 1 ? "s" : ""} applied</span>}
                </div>
            </TableCard.Root>
        </div>
    );
}
