"use client";

import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { contentService } from "@/services/api";
import type { Content } from "@/lib/types";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableCard } from "@/components/application/table/table";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { toast } from "sonner";
import { Search, Download, Bookmark, FileText, Video, Link2, Image, File, ChevronDown, X } from "lucide-react";

const TYPE_ICONS: Record<string, React.ReactNode> = { document: <FileText className="h-4 w-4" />, video: <Video className="h-4 w-4" />, link: <Link2 className="h-4 w-4" />, image: <Image className="h-4 w-4" />, other: <File className="h-4 w-4" /> };

const DEBOUNCE_MS = 400;

export default function StudentContentPage() {
    const [items, setItems] = useState<Content[]>([]);
    const [initialLoading, setInitialLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [typeFilter, setTypeFilter] = useState("all");
    const [contextMenuContent, setContextMenuContent] = useState<Content | null>(null);
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
            const { data } = await contentService.list(params);
            if (!controller.signal.aborted) setItems(data.results ?? []);
        } catch (err: unknown) {
            if (err instanceof DOMException && err.name === "AbortError") return;
            toast.error("Failed to load content");
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

    async function handleBookmark(contentId: string) {
        try { await contentService.bookmarks.add(contentId); toast.success("Bookmarked!"); }
        catch { toast.error("Already bookmarked or failed"); }
    }

    const uniqueTypes = useMemo(() => [...new Set(items.map((c) => c.content_type))].sort(), [items]);

    const filteredItems = useMemo(() => {
        if (typeFilter === "all") return items;
        return items.filter((c) => c.content_type === typeFilter);
    }, [items, typeFilter]);

    const activeFilters = typeFilter !== "all" ? 1 : 0;

    return (
        <div className="space-y-0">
            <ContextMenu onOpenChange={(open) => {
                if (!open) setTimeout(() => setContextMenuContent(null), 200);
            }}>
                <ContextMenuTrigger asChild>
                    <div className="w-full">
                        <TableCard.Root>
                            <div className="flex items-center gap-2 border-b border-secondary px-4 py-2">
                                <div className="relative flex-1">
                                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                                    <Input
                                        placeholder="Filter content..."
                                        value={search}
                                        onChange={(e) => handleSearchChange(e.target.value)}
                                        className="pl-9 h-8 text-sm border-none shadow-none bg-transparent focus-visible:ring-0"
                                    />
                                </div>
                                {activeFilters > 0 && (
                                    <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => setTypeFilter("all")}>
                                        <X className="h-3 w-3" /> Clear
                                    </Button>
                                )}
                            </div>

                            {initialLoading ? <div className="p-6 space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10" />)}</div> : (
                                <Table aria-label="Content">
                                    <Table.Header>
                                        <Table.Row>
                                            <Table.Head isRowHeader><span className="text-xs font-semibold whitespace-nowrap text-quaternary">Title</span></Table.Head>
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
                                            <Table.Head><span className="text-xs font-semibold whitespace-nowrap text-quaternary">Uploaded By</span></Table.Head>
                                            <Table.Head><span className="text-xs font-semibold whitespace-nowrap text-quaternary">Date</span></Table.Head>
                                        </Table.Row>
                                    </Table.Header>
                                    <Table.Body>
                                        {filteredItems.length === 0 ? <Table.Row id="empty"><Table.Cell colSpan={4} className="text-center py-8 text-muted-foreground">No content found.</Table.Cell></Table.Row> : filteredItems.map((c) => (
                                            <Table.Row key={c.id} id={c.id} onContextMenu={() => setContextMenuContent(c)}>
                                                <Table.Cell className="font-medium flex items-center gap-2">{TYPE_ICONS[c.content_type]} {c.title}</Table.Cell>
                                                <Table.Cell><Badge variant="secondary">{c.content_type}</Badge></Table.Cell>
                                                <Table.Cell className="text-muted-foreground">{c.uploaded_by_name}</Table.Cell>
                                                <Table.Cell className="text-muted-foreground">{new Date(c.created_at).toLocaleDateString()}</Table.Cell>
                                            </Table.Row>
                                        ))}
                                    </Table.Body>
                                </Table>
                            )}

                            <div className="flex items-center justify-between border-t border-secondary px-4 py-2 text-xs text-muted-foreground">
                                <span>{filteredItems.length} item{filteredItems.length !== 1 ? "s" : ""}</span>
                                {activeFilters > 0 && <span>{activeFilters} filter applied</span>}
                            </div>
                        </TableCard.Root>
                    </div>
                </ContextMenuTrigger>
                {contextMenuContent && (
                    <ContextMenuContent className="w-48">
                        <ContextMenuItem onClick={() => handleBookmark(contextMenuContent.id)}>
                            <Bookmark className="mr-2 h-4 w-4" /> Bookmark
                        </ContextMenuItem>
                        {contextMenuContent.file && (
                            <ContextMenuItem onClick={() => window.open(contextMenuContent.file as string, '_blank')}>
                                <Download className="mr-2 h-4 w-4" /> Download
                            </ContextMenuItem>
                        )}
                    </ContextMenuContent>
                )}
            </ContextMenu>
        </div>
    );
}
