"use client";

import { useEffect, useState, useCallback } from "react";
import { contentService } from "@/services/api";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableCard } from "@/components/application/table/table";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  Bookmark,
  Trash2,
  Search,
  FileText,
  Video,
  Link2,
  Image,
  File,
  Loader2,
  BookOpen,
  User as UserIcon
} from "lucide-react";

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
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<{ courses: any[]; content: any[]; users: any[] } | null>(null);
  const [ctxBm, setCtxBm] = useState<BookmarkItem | null>(null);

  // Debounced search
  useEffect(() => {
    if (!search.trim()) {
      setSearchResults(null);
      return;
    }
    const timer = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const { data } = await contentService.search(search);
        setSearchResults(data);
      } catch {
        toast.error("Failed to perform search");
      } finally {
        setSearchLoading(false);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchBookmarks = useCallback(
    async (opts?: { showLoading?: boolean }) => {
      if (opts?.showLoading) setInitialLoading(true);
      try {
        const { data } = await contentService.bookmarks.list();
        setBookmarks(data.results ?? data ?? []);
      } catch {
        toast.error("Failed to load bookmarks");
      } finally {
        setInitialLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    fetchBookmarks({ showLoading: true });
  }, []);

  async function handleRemove(id: string) {
    const prev = [...bookmarks];
    setBookmarks((b) => b.filter((x) => x.id !== id));
    try {
      await contentService.bookmarks.remove(id);
      toast.success("Bookmark removed");
    } catch {
      setBookmarks(prev);
      toast.error("Failed to remove");
    }
  }

  // Bookmarks are no longer locally filtered since search is now global
  const filtered = bookmarks;

  return (
    <div className="space-y-4">
      <ContextMenu
        onOpenChange={(open) => {
          if (!open) setCtxBm(null);
        }}
      >
        <ContextMenuTrigger asChild>
          <div className="w-full">
            <TableCard.Root>
              <div className="flex items-center gap-2 border-b border-secondary px-4 py-2">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input
                    placeholder="Global search across courses, content, and users..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9 h-8 text-sm border-none shadow-none bg-transparent focus-visible:ring-0"
                  />
                  {searchLoading && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground animate-spin" />
                  )}
                  {searchResults && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-background border rounded-lg shadow-lg z-50 overflow-hidden isolate">
                      <div className="max-h-[400px] overflow-y-auto w-full">
                        {(!searchResults.courses.length && !searchResults.content.length && !searchResults.users.length) ? (
                          <div className="p-4 text-sm text-center text-muted-foreground">No results found for "{search}"</div>
                        ) : (
                          <div className="flex flex-col">
                            {searchResults.courses.length > 0 && (
                              <div className="border-b last:border-0 relative">
                                <div className="bg-muted/50 px-3 py-1.5 text-xs font-semibold text-muted-foreground sticky top-0 z-10">Courses</div>
                                {searchResults.courses.map((c) => (
                                  <a key={c.id} href={c.link} className="flex items-center gap-3 px-3 py-2 hover:bg-accent hover:text-accent-foreground text-sm">
                                    <BookOpen className="h-4 w-4 text-primary" />
                                    <div>
                                      <div className="font-medium">{c.title}</div>
                                      <div className="text-xs text-muted-foreground">{c.subtitle}</div>
                                    </div>
                                  </a>
                                ))}
                              </div>
                            )}
                            {searchResults.content.length > 0 && (
                              <div className="border-b last:border-0 relative">
                                <div className="bg-muted/50 px-3 py-1.5 text-xs font-semibold text-muted-foreground sticky top-0 z-10">Content</div>
                                {searchResults.content.map((c) => (
                                  <a key={c.id} href={c.link} className="flex items-center gap-3 px-3 py-2 hover:bg-accent hover:text-accent-foreground text-sm">
                                    <FileText className="h-4 w-4 text-blue-500" />
                                    <div>
                                      <div className="font-medium">{c.title}</div>
                                      <div className="text-xs text-muted-foreground">{c.subtitle}</div>
                                    </div>
                                  </a>
                                ))}
                              </div>
                            )}
                            {searchResults.users.length > 0 && (
                              <div className="border-b last:border-0 relative">
                                <div className="bg-muted/50 px-3 py-1.5 text-xs font-semibold text-muted-foreground sticky top-0 z-10">Users</div>
                                {searchResults.users.map((u) => (
                                  <a key={u.id} href={u.link} className="flex items-center gap-3 px-3 py-2 hover:bg-accent hover:text-accent-foreground text-sm">
                                    <UserIcon className="h-4 w-4 text-emerald-500" />
                                    <div>
                                      <div className="font-medium">{u.title}</div>
                                      <div className="text-xs text-muted-foreground">{u.subtitle}</div>
                                    </div>
                                  </a>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {initialLoading ? (
                <div className="p-6 space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : (
                <Table aria-label="Bookmarks">
                  <Table.Header>
                    <Table.Row>
                      <Table.Head isRowHeader>
                        <span className="text-xs font-semibold whitespace-nowrap text-quaternary">
                          Title
                        </span>
                      </Table.Head>
                      <Table.Head>
                        <span className="text-xs font-semibold whitespace-nowrap text-quaternary">
                          Type
                        </span>
                      </Table.Head>
                      <Table.Head>
                        <span className="text-xs font-semibold whitespace-nowrap text-quaternary">
                          Saved
                        </span>
                      </Table.Head>
                    </Table.Row>
                  </Table.Header>
                  <Table.Body>
                    {filtered.length === 0 ? (
                      <Table.Row id="empty">
                        <Table.Cell
                          colSpan={3}
                          className="text-center py-8 text-muted-foreground"
                        >
                          <Bookmark className="h-8 w-8 mx-auto mb-2 opacity-40" />
                          <p>No bookmarks found.</p>
                        </Table.Cell>
                      </Table.Row>
                    ) : (
                      filtered.map((b) => (
                        <Table.Row
                          key={b.id}
                          id={b.id}
                          onContextMenu={() => setCtxBm(b)}
                        >
                          <Table.Cell>
                            <div className="flex items-center gap-2">
                              <span className="text-muted-foreground shrink-0">
                                {TYPE_ICONS[b.content_type ?? "other"] ??
                                  TYPE_ICONS.other}
                              </span>
                              <span className="font-medium">
                                {b.content_title ?? "Content"}
                              </span>
                            </div>
                          </Table.Cell>
                          <Table.Cell>
                            <Badge variant="secondary">
                              {b.content_type ?? "—"}
                            </Badge>
                          </Table.Cell>
                          <Table.Cell className="text-muted-foreground">
                            {b.created_at
                              ? new Date(b.created_at).toLocaleDateString()
                              : "—"}
                          </Table.Cell>
                        </Table.Row>
                      ))
                    )}
                  </Table.Body>
                </Table>
              )}

              <div className="flex items-center justify-between border-t border-secondary px-4 py-2 text-xs text-muted-foreground">
                <span>
                  {filtered.length} bookmark{filtered.length !== 1 ? "s" : ""}
                </span>
              </div>
            </TableCard.Root>
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent>
          {ctxBm ? (
            <ContextMenuItem
              onClick={() => handleRemove(ctxBm.id)}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5 mr-2" />
              Remove Bookmark
            </ContextMenuItem>
          ) : (
            <ContextMenuItem disabled>
              Right-click a row for actions
            </ContextMenuItem>
          )}
        </ContextMenuContent>
      </ContextMenu>
    </div>
  );
}
