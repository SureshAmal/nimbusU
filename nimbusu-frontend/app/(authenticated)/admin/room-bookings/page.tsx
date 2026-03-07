"use client";

import { useEffect, useState } from "react";
import { usePageHeader } from "@/lib/page-header";
import { roomBookingsService } from "@/services/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Building, CheckCircle2, XCircle, Clock } from "lucide-react";
import type { RoomBooking } from "@/lib/types";

export default function AdminRoomBookingsPage() {
    const { setHeader } = usePageHeader();
    const [bookings, setBookings] = useState<RoomBooking[]>([]);
    const [loading, setLoading] = useState(true);
    const [actioning, setActioning] = useState<Record<string, boolean>>({});

    const fetchBookings = async () => {
        try {
            setLoading(true);
            const { data } = await roomBookingsService.list();
            setBookings(data.results ?? data ?? []);
        } catch {
            toast.error("Failed to load room bookings");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        setHeader({
            title: "Room Bookings",
            subtitle: "Manage and approve room booking requests",
        });
        void fetchBookings();
        return () => setHeader(null);
    }, [setHeader]);

    const handleApprove = async (id: string) => {
        setActioning((prev) => ({ ...prev, [id]: true }));
        try {
            await roomBookingsService.approve(id, { status: "approved" });
            toast.success("Booking approved");
            setBookings((prev) =>
                prev.map((booking) =>
                    booking.id === id ? { ...booking, status: "approved" } : booking,
                ),
            );
        } catch {
            toast.error("Failed to approve booking");
        } finally {
            setActioning((prev) => ({ ...prev, [id]: false }));
        }
    };

    const handleReject = async (id: string) => {
        setActioning((prev) => ({ ...prev, [id]: true }));
        try {
            await roomBookingsService.approve(id, { status: "rejected" });
            toast.success("Booking rejected");
            setBookings((prev) =>
                prev.map((booking) =>
                    booking.id === id ? { ...booking, status: "rejected" } : booking,
                ),
            );
        } catch {
            toast.error("Failed to reject booking");
        } finally {
            setActioning((prev) => ({ ...prev, [id]: false }));
        }
    };

    if (loading) {
        return (
            <div className="mx-auto max-w-6xl space-y-4">
                {Array.from({ length: 5 }).map((_, index) => (
                    <Skeleton key={index} className="h-24 w-full rounded-xl" />
                ))}
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-6xl space-y-6 pb-12">
            <h1 className="text-2xl font-bold tracking-tight">Room Booking Requests</h1>

            {bookings.length === 0 ? (
                <div className="rounded-xl border border-dashed py-16 text-center text-muted-foreground">
                    <Building className="mx-auto mb-3 h-10 w-10 opacity-30" />
                    <p>No room booking requests found.</p>
                </div>
            ) : (
                <div className="grid gap-4">
                    {bookings.map((booking) => {
                        const dateLabel = booking.date
                            ? new Date(`${booking.date}T00:00:00`).toLocaleDateString(undefined, {
                                    weekday: "short",
                                    month: "short",
                                    day: "numeric",
                                })
                            : "Date unavailable";
                        const timeLabel = `${booking.start_time.slice(0, 5)} - ${booking.end_time.slice(0, 5)}`;

                        return (
                            <div
                                key={booking.id}
                                className="flex flex-col justify-between gap-4 rounded-xl border bg-card p-5 shadow-sm sm:flex-row sm:items-center"
                            >
                                <div className="min-w-0 flex-1 space-y-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <h3 className="text-lg font-semibold">
                                            {booking.room_name || booking.room}
                                        </h3>
                                        {booking.building && (
                                            <span className="text-sm text-muted-foreground">
                                                • {booking.building}
                                            </span>
                                        )}
                                        <Badge
                                            variant={
                                                booking.status === "approved"
                                                    ? "default"
                                                    : booking.status === "rejected"
                                                        ? "destructive"
                                                        : "secondary"
                                            }
                                        >
                                            {booking.status.toUpperCase()}
                                        </Badge>
                                    </div>
                                    <p className="text-sm font-medium">
                                        Requested by: {booking.booked_by_name || booking.booked_by}
                                    </p>
                                    <p className="break-words text-sm text-muted-foreground">
                                        Purpose: {booking.purpose}
                                    </p>
                                    <div className="flex items-center gap-2 pt-1 text-xs text-muted-foreground">
                                        <Clock className="h-3 w-3" />
                                        <span>
                                            {dateLabel} • {timeLabel}
                                        </span>
                                    </div>
                                </div>

                                {booking.status === "pending" && (
                                    <div className="flex shrink-0 items-center gap-2">
                                        <Button
                                            variant="outline"
                                            className="border-destructive text-destructive hover:bg-destructive/10"
                                            disabled={actioning[booking.id]}
                                            onClick={() => handleReject(booking.id)}
                                        >
                                            <XCircle className="mr-2 h-4 w-4" />
                                            Reject
                                        </Button>
                                        <Button
                                            className="bg-emerald-600 text-white hover:bg-emerald-700"
                                            disabled={actioning[booking.id]}
                                            onClick={() => handleApprove(booking.id)}
                                        >
                                            <CheckCircle2 className="mr-2 h-4 w-4" />
                                            Approve
                                        </Button>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}