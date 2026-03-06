"use client";

import { useEffect, useState, useMemo } from "react";
import { announcementsService } from "@/services/api";
import type { Announcement } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Megaphone, Search, Filter } from "lucide-react";

export default function StudentAnnouncementsPage() {
  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [urgentOnly, setUrgentOnly] = useState(false);

  useEffect(() => {
    async function fetch() {
      try {
        const { data } = await announcementsService.list();
        setItems(data.results ?? []);
      } catch {
        toast.error("Failed to load");
      } finally {
        setLoading(false);
      }
    }
    fetch();
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return items.filter((a) => {
      if (urgentOnly && !a.is_urgent) return false;
      if (!q) return true;
      return (
        a.title.toLowerCase().includes(q) ||
        a.body.toLowerCase().includes(q) ||
        a.created_by_name.toLowerCase().includes(q)
      );
    });
  }, [items, search, urgentOnly]);

  if (loading)
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-[300px]" />
      </div>
    );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-8 text-sm"
            style={{ borderRadius: "var(--radius)" }}
          />
        </div>
        <Button
          size="sm"
          variant={urgentOnly ? "default" : "outline"}
          onClick={() => setUrgentOnly(!urgentOnly)}
          className="h-8 text-xs"
          style={{ borderRadius: "var(--radius)" }}
        >
          <Filter className="h-3.5 w-3.5 mr-1" /> Urgent
        </Button>
      </div>

      {filtered.length === 0 ? (
        <div className="py-16 text-center text-muted-foreground">
          <Megaphone className="h-8 w-8 mx-auto mb-2 opacity-40" />
          <p>{items.length === 0 ? "No announcements yet." : "No matches."}</p>
        </div>
      ) : (
        <div className="space-y-0.5">
          {filtered.map((a) => (
            <div
              key={a.id}
              className="flex items-start gap-3 p-3 rounded-lg hover:bg-accent/30 transition-colors"
              style={{ borderRadius: "var(--radius)" }}
            >
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-lg shrink-0 ${a.is_urgent ? "bg-destructive/10" : "bg-muted"}`}
                style={{ borderRadius: "var(--radius)" }}
              >
                <Megaphone
                  className="h-4 w-4"
                  style={{
                    color: a.is_urgent
                      ? "var(--destructive)"
                      : "var(--muted-foreground)",
                  }}
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium">{a.title}</p>
                  {a.is_urgent && (
                    <Badge
                      variant="destructive"
                      className="text-[10px] h-4 px-1.5"
                    >
                      Urgent
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                  {a.body}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {a.created_by_name} ·{" "}
                  {new Date(a.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-muted-foreground text-center">
        {filtered.length} of {items.length}
      </p>
    </div>
  );
}
