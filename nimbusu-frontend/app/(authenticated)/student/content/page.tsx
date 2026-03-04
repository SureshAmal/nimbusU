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
import { Search, Download, Bookmark, FileText, Video, Link2, Image, File, ChevronDown, X, ExternalLink, Loader2, Eye } from "lucide-react";

const TYPE_ICONS: Record<string, React.ReactNode> = { document: <FileText className="h-4 w-4" />, video: <Video className="h-4 w-4" />, link: <Link2 className="h-4 w-4" />, image: <Image className="h-4 w-4" />, other: <File className="h-4 w-4" /> };

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
}

const DEBOUNCE_MS = 400;

export default function StudentContentPage() {
    const [items, setItems] = useState<Content[]>([]);
    const [initialLoading, setInitialLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [typeFilter, setTypeFilter] = useState("all");
    const [contextMenuContent, setContextMenuContent] = useState<Content | null>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const abortRef = useRef<AbortController | null>(null);

    /* Preview state */
    const [previewContent, setPreviewContent] = useState<Content | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [textPreview, setTextPreview] = useState<string | null>(null);
    const [loadingPreview, setLoadingPreview] = useState(false);

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

    async function openPreview(c: Content) {
        setPreviewContent(c); setTextPreview(null); setPreviewUrl(null);
        let url = c.file || null;
        try {
            const { data } = await contentService.download(c.id);
            if (typeof data === "string") url = data;
            else if (data?.file_url) url = data.file_url;
            else if (data?.url) url = data.url;
            else if (data?.data?.file_url) url = data.data.file_url;
        } catch { /* fallback */ }
        if (!url) url = c.file || null;
        setPreviewUrl(url);
        const ext = getFileExt(url || c.file);
        const kind = isPreviewable(ext, c.content_type);
        if (kind === "text" && url) {
            setLoadingPreview(true);
            try { const res = await fetch(url); const text = await res.text(); setTextPreview(text.substring(0, 50000)); }
            catch { setTextPreview("[Could not load file contents]"); }
            finally { setLoadingPreview(false); }
        }
    }
    function closePreview() { setPreviewContent(null); setPreviewUrl(null); setTextPreview(null); }

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
                                            <Table.Head><span className="sr-only">Preview</span></Table.Head>
                                        </Table.Row>
                                    </Table.Header>
                                    <Table.Body>
                                        {filteredItems.length === 0 ? <Table.Row id="empty"><Table.Cell colSpan={5} className="text-center py-8 text-muted-foreground">No content found.</Table.Cell></Table.Row> : filteredItems.map((c) => (
                                            <Table.Row key={c.id} id={c.id} onContextMenu={() => setContextMenuContent(c)} className="cursor-pointer">
                                                <Table.Cell className="font-medium flex items-center gap-2">{TYPE_ICONS[c.content_type]} {c.title}</Table.Cell>
                                                <Table.Cell><Badge variant="secondary">{c.content_type}</Badge></Table.Cell>
                                                <Table.Cell className="text-muted-foreground">{c.uploaded_by_name}</Table.Cell>
                                                <Table.Cell className="text-muted-foreground">{new Date(c.created_at).toLocaleDateString()}</Table.Cell>
                                                <Table.Cell>
                                                    <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => c.external_url ? window.open(c.external_url, "_blank") : openPreview(c)} style={{ borderRadius: "var(--radius)" }}>
                                                        <Eye className="h-3.5 w-3.5" /> View
                                                    </Button>
                                                </Table.Cell>
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

            {/* Content Preview */}
            {previewContent && (() => {
                const ext = getFileExt(previewUrl || previewContent.file);
                const kind = isPreviewable(ext, previewContent.content_type);
                return (
                    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: "rgba(0,0,0,0.8)" }}>
                        <div className="flex items-center justify-between px-4 py-3 bg-background/95 border-b backdrop-blur">
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted shrink-0" style={{ borderRadius: "var(--radius)" }}>
                                    {TYPE_ICONS[previewContent.content_type] || TYPE_ICONS.other}
                                </div>
                                <div className="min-w-0">
                                    <p className="text-sm font-medium truncate">{previewContent.title}</p>
                                    <p className="text-xs text-muted-foreground">{ext.toUpperCase()} · {previewContent.uploaded_by_name}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-1.5">
                                {previewUrl && <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => window.open(previewUrl, "_blank")} style={{ borderRadius: "var(--radius)" }}><Download className="h-3 w-3" /> Download</Button>}
                                {previewUrl && <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => window.open(previewUrl, "_blank")} style={{ borderRadius: "var(--radius)" }}><ExternalLink className="h-3 w-3" /> Open</Button>}
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={closePreview}><X className="h-4 w-4" /></Button>
                            </div>
                        </div>
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
                                <iframe src={`https://docs.google.com/gview?url=${encodeURIComponent(previewUrl)}&embedded=true`} className="w-full h-full rounded-lg bg-white" style={{ maxWidth: 900, borderRadius: "var(--radius-lg)" }} />
                            ) : kind === "text" ? (
                                <div className="w-full max-w-4xl max-h-full overflow-auto bg-background rounded-lg border p-4" style={{ borderRadius: "var(--radius-lg)" }}>
                                    {loadingPreview ? <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading...</div> : <pre className="text-sm font-mono whitespace-pre-wrap break-words leading-relaxed">{textPreview}</pre>}
                                </div>
                            ) : (
                                <div className="text-center space-y-3">
                                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted mx-auto"><File className="h-8 w-8 text-muted-foreground" /></div>
                                    <p className="text-sm text-muted-foreground">Preview not available</p>
                                    {previewUrl && <Button size="sm" onClick={() => window.open(previewUrl, "_blank")} style={{ borderRadius: "var(--radius)" }}><Download className="h-3.5 w-3.5 mr-1.5" /> Download</Button>}
                                </div>
                            )}
                        </div>
                    </div>
                );
            })()}
        </div>
    );
}
