import React, { useState } from "react";
import {
    format,
    addMonths,
    subMonths,
    addWeeks,
    subWeeks,
    addDays,
    subDays,
    startOfWeek,
    endOfWeek,
    startOfMonth,
    endOfMonth,
    eachDayOfInterval,
    isSameMonth,
    isSameDay,
    isToday
} from "date-fns";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

export type CalendarEvent = {
    id: string;
    title: string;
    start: Date;
    end: Date;
    color?: string; // Tailwind color class or hex
    extendedProps?: Record<string, unknown>;
};

interface CalendarProps {
    events: CalendarEvent[];
    onEventClick?: (event: CalendarEvent) => void;
    onDateClick?: (date: Date) => void;
    onAddEvent?: (date?: Date) => void;
}

type ViewMode = "month" | "week" | "day";

export function EventCalendar({ events, onEventClick, onDateClick, onAddEvent }: CalendarProps) {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [view, setView] = useState<ViewMode>("week");

    const handlePrevious = () => {
        if (view === "month") setCurrentDate(subMonths(currentDate, 1));
        else if (view === "week") setCurrentDate(subWeeks(currentDate, 1));
        else setCurrentDate(subDays(currentDate, 1));
    };

    const handleNext = () => {
        if (view === "month") setCurrentDate(addMonths(currentDate, 1));
        else if (view === "week") setCurrentDate(addWeeks(currentDate, 1));
        else setCurrentDate(addDays(currentDate, 1));
    };

    const handleToday = () => {
        setCurrentDate(new Date());
    };

    const title = () => {
        if (view === "month") return format(currentDate, "MMMM yyyy");
        if (view === "week") {
            const start = startOfWeek(currentDate, { weekStartsOn: 0 }); // Sunday start
            const end = endOfWeek(currentDate, { weekStartsOn: 0 });
            if (isSameMonth(start, end)) {
                return `${format(start, "MMM d")} - ${format(end, "d, yyyy")}`;
            }
            return `${format(start, "MMM d")} - ${format(end, "MMM d, yyyy")}`;
        }
        return format(currentDate, "MMMM d, yyyy");
    };

    // Filter events for a specific day
    const getEventsForDay = (date: Date) => {
        return events.filter(e => isSameDay(e.start, date)).sort((a, b) => a.start.getTime() - b.start.getTime());
    };

    // ─── MONTH VIEW ─────────────────────────────────────────────────────────────
    const renderMonthView = () => {
        const monthStart = startOfMonth(currentDate);
        const monthEnd = endOfMonth(monthStart);
        const startDate = startOfWeek(monthStart, { weekStartsOn: 0 });
        const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 });

        const days = eachDayOfInterval({ start: startDate, end: endDate });
        const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

        return (
            <div className="flex flex-col h-full bg-card rounded-md border border-border overflow-hidden">
                <div className="grid grid-cols-7 border-b border-border bg-muted/30">
                    {weekDays.map(day => (
                        <div key={day} className="py-2 text-center text-xs font-medium text-muted-foreground border-r border-border last:border-r-0">
                            {day}
                        </div>
                    ))}
                </div>
                <div className="grid grid-cols-7 flex-1 auto-rows-fr">
                    {days.map((day, i) => {
                        const dayEvents = getEventsForDay(day);
                        return (
                            <div
                                key={day.toISOString()}
                                className={cn(
                                    "min-h-[120px] p-1.5 border-r border-b border-border transition-colors hover:bg-muted/10 cursor-default",
                                    !isSameMonth(day, monthStart) && "bg-muted/30 text-muted-foreground",
                                    (i + 1) % 7 === 0 && "border-r-0"
                                )}
                                onClick={() => onDateClick?.(day)}
                            >
                                <div className="flex justify-between items-start mb-1">
                                    <span className={cn(
                                        "text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full",
                                        isToday(day) && "bg-primary text-primary-foreground"
                                    )}>
                                        {format(day, "d")}
                                    </span>
                                </div>
                                <div className="flex flex-col gap-1 overflow-y-auto max-h-[80px]">
                                    {dayEvents.slice(0, 3).map(event => (
                                        <div
                                            key={event.id}
                                            onClick={(e) => { e.stopPropagation(); onEventClick?.(event); }}
                                            className={cn(
                                                "text-xs px-1.5 py-0.5 rounded truncate bg-primary/10 text-primary cursor-pointer hover:bg-primary/20 transition-colors",
                                                event.color
                                            )}
                                        >
                                            <span className="font-semibold mr-1">{format(event.start, "h:mm a")}</span>
                                            {event.title}
                                        </div>
                                    ))}
                                    {dayEvents.length > 3 && (
                                        <div className="text-xs text-muted-foreground px-1">
                                            {dayEvents.length - 3} more...
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    // ─── WEEK VIEW ──────────────────────────────────────────────────────────────
    const renderWeekView = () => {
        const startDate = startOfWeek(currentDate, { weekStartsOn: 0 });
        const days = eachDayOfInterval({ start: startDate, end: addDays(startDate, 6) });
        const hours = Array.from({ length: 24 }, (_, i) => i);

        return (
            <div className="flex flex-col h-full bg-card rounded-md border border-border overflow-hidden">
                <div className="flex border-b border-border bg-muted/30">
                    <div className="w-16 shrink-0 border-r border-border" /> {/* Time column header placeholder */}
                    {days.map(day => (
                        <div key={day.toISOString()} className="flex-1 py-2 text-center border-r border-border last:border-r-0">
                            <div className="text-xs font-medium text-muted-foreground">{format(day, "EEE")} {format(day, "d")}</div>
                            {isToday(day) && <div className="h-1 w-1 bg-primary rounded-full mx-auto mt-1" />}
                        </div>
                    ))}
                </div>
                <div className="flex-1 overflow-y-auto relative" style={{ height: "600px" }}>
                    <div className="flex">
                        {/* Time labels axis */}
                        <div className="w-16 shrink-0 border-r border-border bg-card">
                            {hours.map(hour => (
                                <div key={hour} className="h-16 relative border-b border-border last:border-b-0">
                                    <span className="absolute -top-3 right-2 text-xs text-muted-foreground">
                                        {hour === 0 ? "12 AM" : hour < 12 ? `${hour} AM` : hour === 12 ? "12 PM" : `${hour - 12} PM`}
                                    </span>
                                </div>
                            ))}
                        </div>

                        {/* Days columns */}
                        {days.map(day => {
                            const dayEvents = getEventsForDay(day);
                            return (
                                <div key={day.toISOString()} className="flex-1 relative border-r border-border last:border-r-0" onClick={() => onDateClick?.(day)}>
                                    {/* Grid Lines */}
                                    {hours.map(hour => (
                                        <div key={hour} className="h-16 border-b border-border/50 last:border-b-0 pointer-events-none" />
                                    ))}

                                    {/* Events */}
                                    {dayEvents.map(event => {
                                        const startHour = event.start.getHours() + event.start.getMinutes() / 60;
                                        const endHour = event.end.getHours() + event.end.getMinutes() / 60;
                                        const duration = endHour - startHour;
                                        const top = startHour * 64; // 64px per hour
                                        const height = duration * 64;

                                        return (
                                            <div
                                                key={event.id}
                                                onClick={(e) => { e.stopPropagation(); onEventClick?.(event); }}
                                                className={cn(
                                                    "absolute left-1 right-1 rounded p-1 text-xs overflow-hidden cursor-pointer bg-primary/10 text-primary border border-primary/20 hover:border-primary/40 transition-colors z-10",
                                                    event.color
                                                )}
                                                style={{ top: `${top}px`, height: `${Math.max(height, 20)}px` }}
                                            >
                                                <div className="font-semibold truncate">{event.title}</div>
                                                <div className="opacity-80 truncate">{format(event.start, "h:mm a")} - {format(event.end, "h:mm a")}</div>
                                            </div>
                                        );
                                    })}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        );
    };

    // ─── DAY VIEW ───────────────────────────────────────────────────────────────
    const renderDayView = () => {
        const hours = Array.from({ length: 24 }, (_, i) => i);
        const dayEvents = getEventsForDay(currentDate);

        return (
            <div className="flex h-full gap-4">
                <div className="flex-1 flex flex-col bg-card rounded-md border border-border overflow-hidden">
                    <div className="flex border-b border-border bg-muted/30 py-2 items-center justify-center">
                        <div className="font-medium text-lg text-foreground">{format(currentDate, "EEEE, MMMM d")}</div>
                    </div>
                    <div className="flex-1 overflow-y-auto relative" style={{ height: "600px" }}>
                        <div className="flex">
                            <div className="w-16 shrink-0 border-r border-border bg-card">
                                {hours.map(hour => (
                                    <div key={hour} className="h-20 relative border-b border-border last:border-b-0">
                                        <span className="absolute -top-3 right-2 text-xs text-muted-foreground">
                                            {hour === 0 ? "12 AM" : hour < 12 ? `${hour} AM` : hour === 12 ? "12 PM" : `${hour - 12} PM`}
                                        </span>
                                    </div>
                                ))}
                            </div>
                            <div className="flex-1 relative" onClick={() => onDateClick?.(currentDate)}>
                                {hours.map(hour => (
                                    <div key={hour} className="h-20 border-b border-border/50 last:border-b-0 pointer-events-none" />
                                ))}
                                {dayEvents.map(event => {
                                    const startHour = event.start.getHours() + event.start.getMinutes() / 60;
                                    const endHour = event.end.getHours() + event.end.getMinutes() / 60;
                                    const duration = endHour - startHour;
                                    const top = startHour * 80; // 80px per hour for day view
                                    const height = duration * 80;

                                    return (
                                        <div
                                            key={event.id}
                                            onClick={(e) => { e.stopPropagation(); onEventClick?.(event); }}
                                            className={cn(
                                                "absolute left-2 right-4 rounded-md p-2 text-sm overflow-hidden cursor-pointer bg-primary/10 text-primary border border-primary/20 hover:border-primary/40 transition-colors z-10",
                                                event.color
                                            )}
                                            style={{ top: `${top}px`, height: `${Math.max(height, 30)}px` }}
                                        >
                                            <div className="font-semibold truncate">{event.title}</div>
                                            <div className="opacity-80 truncate">{format(event.start, "h:mm a")} - {format(event.end, "h:mm a")}</div>
                                            {event.extendedProps && typeof event.extendedProps.description === "string" && (
                                                <div className="mt-1 text-xs opacity-70 truncate">{event.extendedProps.description}</div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="flex flex-col h-full gap-4">
            {/* Toolbar */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="flex items-center bg-card rounded-md border border-border shadow-sm p-1">
                        <div className="px-3 py-1 bg-muted rounded text-sm font-semibold flex items-center justify-center min-w-[3rem]">
                            <span className="text-[10px] text-muted-foreground uppercase leading-none block text-center mb-0.5">{format(currentDate, "MMM")}</span>
                            <span className="text-lg leading-none block text-center">{format(currentDate, "d")}</span>
                        </div>
                    </div>
                    <div>
                        <h2 className="text-xl font-bold flex items-center gap-2">
                            {title()}
                            {view !== "day" && <span className="text-xs font-normal text-muted-foreground border border-border rounded px-1.5 py-0.5">Week {format(currentDate, "w")}</span>}
                        </h2>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex items-center rounded-md border border-border overflow-hidden bg-card">
                        <Button variant="ghost" size="icon" onClick={handlePrevious} className="h-9 w-9 rounded-none border-r border-border hover:bg-muted"><ChevronLeft className="h-4 w-4" /></Button>
                        <Button variant="ghost" onClick={handleToday} className="h-9 rounded-none hover:bg-muted font-medium">Today</Button>
                        <Button variant="ghost" size="icon" onClick={handleNext} className="h-9 w-9 rounded-none border-l border-border hover:bg-muted"><ChevronRight className="h-4 w-4" /></Button>
                    </div>

                    <Select value={view} onValueChange={(v: ViewMode) => setView(v)}>
                        <SelectTrigger className="w-[130px] h-9 bg-card">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="month">Month view</SelectItem>
                            <SelectItem value="week">Week view</SelectItem>
                            <SelectItem value="day">Day view</SelectItem>
                        </SelectContent>
                    </Select>

                    <Button onClick={() => onAddEvent?.()} className="h-9 gap-1 shadow-sm">
                        <Plus className="h-4 w-4" /> Add event
                    </Button>
                </div>
            </div>

            {/* Calendar Body */}
            <div className="flex-1 min-h-[600px]">
                {view === "month" && renderMonthView()}
                {view === "week" && renderWeekView()}
                {view === "day" && renderDayView()}
            </div>
        </div>
    );
}
