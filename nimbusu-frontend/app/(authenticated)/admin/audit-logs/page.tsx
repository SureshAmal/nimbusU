"use client";

import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { auditLogsService } from "@/services/api";
import type { AuditLog } from "@/lib/types";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableCard } from "@/components/application/table/table";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Search, ChevronDown, X } from "lucide-react";

const DEBOUNCE_MS = 400;

export default function AdminAuditLogsPage() {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [initialLoading, setInitialLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [actionFilter, setActionFilter] = useState("all");
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const abortRef = useRef<AbortController | null>(null);

    const fetchLogs = useCallback(async (opts?: { showLoading?: boolean; searchOverride?: string }) => {
        if (opts?.showLoading) setInitialLoading(true);
        abortRef.current?.abort();
        const controller = new AbortController();
        abortRef.current = controller;

        try {
            const params: Record<string, string> = {};
            const q = opts?.searchOverride ?? search;
            if (q) params.search = q;
            const { data } = await auditLogsService.list(params);
            if (!controller.signal.aborted) setLogs(data.results ?? []);
        } catch (err: unknown) {
            if (err instanceof DOMException && err.name === "AbortError") return;
            toast.error("Failed to load audit logs");
        } finally {
            if (!controller.signal.aborted) setInitialLoading(false);
        }
    }, [search]);

    useEffect(() => { fetchLogs({ showLoading: true }); }, []);

    const handleSearchChange = useCallback((value: string) => {
        setSearch(value);
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            fetchLogs({ searchOverride: value });
        }, DEBOUNCE_MS);
    }, [fetchLogs]);

    useEffect(() => {
        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
            abortRef.current?.abort();
        };
    }, []);

    const uniqueActions = useMemo(() => [...new Set(logs.map((l) => l.action))].sort(), [logs]);

    const filteredLogs = useMemo(() => {
        if (actionFilter === "all") return logs;
        return logs.filter((l) => l.action === actionFilter);
    }, [logs, actionFilter]);

    const activeFilters = actionFilter !== "all" ? 1 : 0;

    return (
        <div className="space-y-0">
            <TableCard.Root>
                <div className="flex items-center gap-2 border-b border-secondary px-4 py-2">
                    <div className="relative flex-1">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                        <Input
                            placeholder="Filter audit logs..."
                            value={search}
                            onChange={(e) => handleSearchChange(e.target.value)}
                            className="pl-9 h-8 text-sm border-none shadow-none bg-transparent focus-visible:ring-0"
                        />
                    </div>
                    {activeFilters > 0 && (
                        <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => setActionFilter("all")}>
                            <X className="h-3 w-3" /> Clear
                        </Button>
                    )}
                </div>

                {initialLoading ? (
                    <div className="p-6 space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
                ) : (
                    <Table aria-label="Audit Logs">
                        <Table.Header>
                            <Table.Row>
                                <Table.Head isRowHeader><span className="text-xs font-semibold whitespace-nowrap text-quaternary">User</span></Table.Head>
                                <Table.Head>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <button className="flex items-center gap-1 text-xs font-semibold whitespace-nowrap text-quaternary hover:text-foreground transition-colors cursor-pointer">
                                                Action
                                                {actionFilter !== "all" && <span className="inline-flex items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] h-4 w-4">1</span>}
                                                <ChevronDown className="h-3 w-3 opacity-50" />
                                            </button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="start" className="w-40 max-h-60 overflow-auto">
                                            <DropdownMenuItem onClick={() => setActionFilter("all")} className={actionFilter === "all" ? "font-semibold" : ""}>All Actions</DropdownMenuItem>
                                            <DropdownMenuSeparator />
                                            {uniqueActions.map((a) => (
                                                <DropdownMenuItem key={a} onClick={() => setActionFilter(a)} className={actionFilter === a ? "font-semibold" : ""}>{a}</DropdownMenuItem>
                                            ))}
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </Table.Head>
                                <Table.Head><span className="text-xs font-semibold whitespace-nowrap text-quaternary">Entity</span></Table.Head>
                                <Table.Head><span className="text-xs font-semibold whitespace-nowrap text-quaternary">IP</span></Table.Head>
                                <Table.Head><span className="text-xs font-semibold whitespace-nowrap text-quaternary">Time</span></Table.Head>
                            </Table.Row>
                        </Table.Header>
                        <Table.Body>
                            {filteredLogs.length === 0 ? (
                                <Table.Row id="empty"><Table.Cell colSpan={5} className="text-center py-8 text-muted-foreground">No audit logs found.</Table.Cell></Table.Row>
                            ) : filteredLogs.map((l) => (
                                <Table.Row key={l.id} id={l.id}>
                                    <Table.Cell className="text-muted-foreground">{l.user_email}</Table.Cell>
                                    <Table.Cell><Badge variant="secondary">{l.action}</Badge></Table.Cell>
                                    <Table.Cell className="font-mono text-xs">{l.entity_type}:{l.entity_id?.slice(0, 8)}</Table.Cell>
                                    <Table.Cell className="font-mono text-xs text-muted-foreground">{l.ip_address}</Table.Cell>
                                    <Table.Cell className="text-muted-foreground">{new Date(l.created_at).toLocaleString()}</Table.Cell>
                                </Table.Row>
                            ))}
                        </Table.Body>
                    </Table>
                )}

                <div className="flex items-center justify-between border-t border-secondary px-4 py-2 text-xs text-muted-foreground">
                    <span>{filteredLogs.length} log{filteredLogs.length !== 1 ? "s" : ""}</span>
                    {activeFilters > 0 && <span>{activeFilters} filter applied</span>}
                </div>
            </TableCard.Root>
        </div>
    );
}
