"use client";

import { useEffect, useState } from "react";
import { notificationsService } from "@/services/api";
import type { Notification } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Bell, CheckCheck, Settings } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export default function StudentNotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const [prefsOpen, setPrefsOpen] = useState(false);
  const [preferences, setPreferences] = useState<Record<string, boolean>>({});
  const [loadingPrefs, setLoadingPrefs] = useState(false);

  async function fetch() {
    setLoading(true);
    try {
      const { data } = await notificationsService.list();
      setNotifications(data.results ?? []);
    } catch {
      toast.error("Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetch();
  }, []);

  async function markAllRead() {
    try {
      await notificationsService.markAllRead();
      toast.success("All marked as read");
      fetch();
    } catch {
      toast.error("Failed");
    }
  }

  async function markRead(id: string) {
    try {
      await notificationsService.markRead(id);
      fetch();
    } catch {
      /* ignore */
    }
  }

  async function fetchPreferences() {
    setLoadingPrefs(true);
    try {
      const { data } = await notificationsService.preferences();
      // Data could be an array of preference objects or a single dict
      const prefsObj = Array.isArray(data.results ?? data)
        ? (data.results ?? data).reduce(
            (acc: any, p: any) => ({ ...acc, ...p.preferences }),
            {},
          )
        : (data.preferences ?? {});
      setPreferences(prefsObj);
    } catch {
      toast.error("Failed to load preferences");
    } finally {
      setLoadingPrefs(false);
    }
  }

  async function updatePreference(key: string, value: boolean) {
    const newPrefs = { ...preferences, [key]: value };
    setPreferences(newPrefs);
    try {
      // Attempt to create or update globally depending on the backend behavior
      await notificationsService.createPreference(newPrefs);
      toast.success("Preferences updated");
    } catch {
      try {
        // Fallback to update if create fails and we have a specific ID endpoint
        // Assuming we just send the whole dict to the first preference obj if ID exists
        await notificationsService.createPreference(newPrefs);
      } catch {
        toast.error("Failed to save preference");
        // Revert on error
        setPreferences(preferences);
      }
    }
  }

  if (loading)
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton
          className="h-[300px]"
          style={{ borderRadius: "var(--radius-lg)" }}
        />
      </div>
    );

  const unread = notifications.filter((n) => !n.is_read).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {unread > 0 && (
            <Button
              variant="outline"
              onClick={markAllRead}
              style={{ borderRadius: "var(--radius)" }}
            >
              <CheckCheck className="h-4 w-4 mr-2" /> Mark All Read
            </Button>
          )}
          <Dialog
            open={prefsOpen}
            onOpenChange={(open) => {
              setPrefsOpen(open);
              if (open) fetchPreferences();
            }}
          >
            <DialogTrigger asChild>
              <Button
                variant="outline"
                style={{ borderRadius: "var(--radius)" }}
              >
                <Settings className="h-4 w-4 mr-2" /> Preferences
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Notification Preferences</DialogTitle>
              </DialogHeader>
              {loadingPrefs ? (
                <Skeleton className="h-32 w-full" />
              ) : (
                <div className="space-y-4 py-4">
                  <div className="flex items-center justify-between">
                    <Label
                      htmlFor="email-notifications"
                      className="flex flex-col gap-1"
                    >
                      <span>Email Notifications</span>
                      <span className="font-normal text-sm text-muted-foreground">
                        Receive important updates via email
                      </span>
                    </Label>
                    <Switch
                      id="email-notifications"
                      checked={preferences.email ?? true}
                      onCheckedChange={(v) => updatePreference("email", v)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label
                      htmlFor="push-notifications"
                      className="flex flex-col gap-1"
                    >
                      <span>In-App Notifications</span>
                      <span className="font-normal text-sm text-muted-foreground">
                        Show alerts when using the app
                      </span>
                    </Label>
                    <Switch
                      id="push-notifications"
                      checked={preferences.in_app ?? true}
                      onCheckedChange={(v) => updatePreference("in_app", v)}
                    />
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </div>
      <Card
        style={{
          boxShadow: "var(--shadow-sm)",
          borderRadius: "var(--radius-lg)",
        }}
      >
        <CardContent className="pt-4">
          {notifications.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground flex flex-col items-center gap-2">
              <Bell className="h-8 w-8 opacity-40" />
              <p>No notifications yet.</p>
            </div>
          ) : (
            <div className="space-y-1">
              {notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => !n.is_read && markRead(n.id)}
                  className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors ${!n.is_read ? "bg-accent/50" : "hover:bg-accent/30"}`}
                  style={{ borderRadius: "var(--radius)" }}
                >
                  <Bell
                    className="h-4 w-4 mt-0.5 shrink-0"
                    style={{
                      color: n.is_read
                        ? "var(--muted-foreground)"
                        : "var(--primary)",
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p
                        className={`text-sm ${!n.is_read ? "font-semibold" : ""}`}
                      >
                        {n.title}
                      </p>
                      {!n.is_read && (
                        <Badge
                          variant="default"
                          className="h-4 text-[10px] px-1.5"
                        >
                          New
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {n.message}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(n.created_at).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
