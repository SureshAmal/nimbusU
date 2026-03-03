"use client";

import { useEffect, useState, useCallback } from "react";
import { contentService } from "@/services/api";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableCard } from "@/components/application/table/table";
import {
    ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Bookmark, Trash2, Search, FileText, Video, Link2, Image, File } from "lucide-react";

interface BookmarkItem {
    id: string;
    content_title?: string;
    content_type?: string;
    created_at?: string;
    content?: string;
}

const TYPE_ICONS: Record<string, React.ReactNode> = {
    document: <FileText className="h-4 w-4" />,
    video: <Video className="h-4 w-4" />,
    link: <Link2 className="h-4 w-4" />,
    image: <Image className="h-4 w-4" />,
    other: <File className="h-4 w-4" />,
};

export default function StudentBookmarksPage() {
    const [bookmarks, setBookmarks] = useState<BookmarkItem[]>([]);
    const [initialLoading, setInitialLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [ctxBm, setCtxBm] = useState<BookmarkItem | null>(null);

    const fetchBookmarks = useCallback(async (opts?: { showLoading?: boolean }) => {
        if (opts?.showLoading) setInitialLoading(true);
        try {
            const { data } = await contentService.bookmarks.list();
            setBookmarks(data.results ?? data ?? []);
        } catch { toast.error("Failed to load bookmarks"); }
        finally { setInitialLoading(false); }
    }, []);

    useEffect(() => { fetchBookmarks({ showLoading: true }); }, []);

    async function handleRemove(id: string) {
        const prev = [...bookmarks];
        setBookmarks((b) => b.filter((x) => x.id !== id));
        try { await contentService.bookmarks.remove(id); toast.success("Bookmark removed"); }
        catch { setBookmarks(prev); toast.error("Failed to remove"); }
    }

    const q = search.toLowerCase();
    const filtered = bookmarks.filter((b) => {
        if (!q) return true;
        return (b.content_title ?? "").toLowerCase().includes(q) || (b.content_type ?? "").toLowerCase().includes(q);
    });

    return (
        <div className="space-y-4">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Bookmarks</h1>
                <p className="text-muted-foreground text-sm">Your saved content items</p>
            </div>

            <ContextMenu onOpenChange={(open) => { if (!open) setCtxBm(null); }}>
                <ContextMenuTrigger asChild>
                    <div className="w-full">
                        <TableCard.Root>
                            <div className="flex items-center gap-2 border-b border-secondary px-4 py-2">
                                <div className="relative flex-1">
                                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                                    <Input placeholder="Filter bookmarks..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-8 text-sm border-none shadow-none bg-transparent focus-visible:ring-0" />
                                </div>
                            </div>

                            {initialLoading ? (
                                <div className="p-6 space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
                            ) : (
                                <Table aria-label="Bookmarks">
                                    <Table.Header>
                                        <Table.Row>
                                            <Table.Head isRowHeader><span className="text-xs font-semibold whitespace-nowrap text-quaternary">Title</span></Table.Head>
                                            <Table.Head><span className="text-xs font-semibold whitespace-nowrap text-quaternary">Type</span></Table.Head>
                                            <Table.Head><span className="text-xs font-semibold whitespace-nowrap text-quaternary">Saved</span></Table.Head>
                                        </Table.Row>
                                    </Table.Header>
                                    <Table.Body>
                                        {filtered.length === 0 ? (
                                            <Table.Row id="empty"><Table.Cell colSpan={3} className="text-center py-8 text-muted-foreground"><Bookmark className="h-8 w-8 mx-auto mb-2 opacity-40" /><p>No bookmarks found.</p></Table.Cell></Table.Row>
                                        ) : (
                                            filtered.map((b) => (
                                                <Table.Row key={b.id} id={b.id} onContextMenu={() => setCtxBm(b)}>
                                                    <Table.Cell>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-muted-foreground shrink-0">{TYPE_ICONS[b.content_type ?? "other"] ?? TYPE_ICONS.other}</span>
                                                            <span className="font-medium">{b.content_title ?? "Content"}</span>
                                                        </div>
                                                    </Table.Cell>
                                                    <Table.Cell><Badge variant="secondary">{b.content_type ?? "—"}</Badge></Table.Cell>
                                                    <Table.Cell className="text-muted-foreground">{b.created_at ? new Date(b.created_at).toLocaleDateString() : "—"}</Table.Cell>
                                                </Table.Row>
                                            ))
                                        )}
                                    </Table.Body>
                                </Table>
                            )}

                            <div className="flex items-center justify-between border-t border-secondary px-4 py-2 text-xs text-muted-foreground">
                                <span>{filtered.length} bookmark{filtered.length !== 1 ? "s" : ""}</span>
                            </div>
                        </TableCard.Root>
                    </div>
                </ContextMenuTrigger>
                <ContextMenuContent>
                    {ctxBm ? (
                        <ContextMenuItem onClick={() => handleRemove(ctxBm.id)} className="text-destructive focus:text-destructive"><Trash2 className="h-3.5 w-3.5 mr-2" />Remove Bookmark</ContextMenuItem>
                    ) : (
                        <ContextMenuItem disabled>Right-click a row for actions</ContextMenuItem>
                    )}
                </ContextMenuContent>
            </ContextMenu>
        </div>
    );
}
