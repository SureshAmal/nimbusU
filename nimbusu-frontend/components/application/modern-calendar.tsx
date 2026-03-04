import React, { useState, useEffect, useRef } from "react";
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
    isToday,
} from "date-fns";
import {
    ChevronLeft,
    ChevronRight,
    Search,
    Calendar as CalendarIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type CalendarEvent = {
    id: string;
    title: string;
    start: Date;
    end: Date;
    color?: string; // e.g., "bg-cyan-500/10 border-cyan-500/20 text-cyan-700 dark:text-cyan-400"
    extendedProps?: Record<string, unknown>;
};

interface CalendarProps {
    events: CalendarEvent[];
    onEventClick?: (event: CalendarEvent) => void;
    onDateClick?: (date: Date) => void;
    onAddEvent?: (date?: Date) => void;
    searchQuery?: string;
    onSearchChange?: (query: string) => void;
}

type ViewMode = "month" | "week" | "day";

export function ModernEventCalendar({
    events,
    onEventClick,
    onDateClick,
    onAddEvent,
    searchQuery,
    onSearchChange,
}: CalendarProps) {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedMonthDate, setSelectedMonthDate] = useState<Date>(new Date());
    const [view, setView] = useState<ViewMode>(
        typeof window !== "undefined" && window.innerWidth < 640 ? "day" : "week"
    );

    // Current time indicator line
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 60000); // update every minute
        return () => clearInterval(timer);
    }, []);

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
            const start = startOfWeek(currentDate, { weekStartsOn: 1 });
            const end = endOfWeek(currentDate, { weekStartsOn: 1 });
            return `${format(start, "MMM dd")} - ${format(end, "MMM dd yyyy")}`;
        }
        return format(currentDate, "MMMM d, yyyy");
    };

    const getEventsForDay = (date: Date) => {
        return events
            .filter((e) => isSameDay(e.start, date))
            .sort((a, b) => a.start.getTime() - b.start.getTime());
    };

    // Helper to calculate overlapping events for Week/Day views
    const calculateOverlapingEvents = (dayEvents: CalendarEvent[]) => {
        if (dayEvents.length === 0) return [];

        // Groups of events that overlap
        const columns: CalendarEvent[][] = [];
        let lastEventEnding: Date | null = null;

        dayEvents.forEach(ev => {
            if (lastEventEnding !== null && ev.start >= lastEventEnding) {
                // No overlap with previous group, create new group
                // Reset columns is not needed here as we just need to place it in the first available slot
            }

            let placed = false;
            for (let i = 0; i < columns.length; i++) {
                const col = columns[i];
                const lastEventInCol = col[col.length - 1];
                if (ev.start >= lastEventInCol.end) {
                    col.push(ev);
                    placed = true;
                    break;
                }
            }
            if (!placed) {
                columns.push([ev]);
            }

            if (lastEventEnding === null || ev.end > lastEventEnding) {
                lastEventEnding = ev.end;
            }
        });

        // Now map events to their visual properties
        type RenderableEvent = CalendarEvent & { width: number; leftOffset: number };
        const renderableEvents: RenderableEvent[] = [];
        const numColumns = columns.length;

        columns.forEach((col, colIndex) => {
            col.forEach(ev => {
                renderableEvents.push({
                    ...ev,
                    width: 100 / numColumns,
                    leftOffset: (100 / numColumns) * colIndex
                });
            });
        });

        return renderableEvents;
    };

    // ─── MONTH VIEW ─────────────────────────────────────────────────────────────
    const renderMonthView = () => {
        const monthStart = startOfMonth(currentDate);
        const monthEnd = endOfMonth(monthStart);
        const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
        const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

        const days = eachDayOfInterval({ start: startDate, end: endDate });
        const weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

        const selectedDayEvents = getEventsForDay(selectedMonthDate);

        return (
            <div className="flex flex-col lg:flex-row flex-1 h-full gap-4">
                <div className="flex flex-col flex-1 rounded-[var(--radius)] border border-border overflow-hidden bg-background shadow-sm">
                    <div className="grid grid-cols-7 border-b border-border bg-muted/40">
                        {weekDays.map((day) => (
                            <div
                                key={day}
                                className="py-2.5 text-center text-xs font-semibold text-muted-foreground border-r border-border last:border-r-0 tracking-wider uppercase"
                            >
                                {day}
                            </div>
                        ))}
                    </div>
                    <div className="grid grid-cols-7 flex-1 auto-rows-fr min-h-0">
                        {days.map((day, i) => {
                            const dayEvents = getEventsForDay(day);
                            const isSelected = isSameDay(day, selectedMonthDate);
                            return (
                                <div
                                    key={day.toISOString()}
                                    className={cn(
                                        "min-h-0 p-1.5 border-r border-b border-border transition-colors hover:bg-muted/10 cursor-pointer group/day relative flex flex-col",
                                        !isSameMonth(day, monthStart) && "bg-muted/30 opacity-70",
                                        (i + 1) % 7 === 0 && "border-r-0",
                                        isSelected && "bg-primary/5 hover:bg-primary/10"
                                    )}
                                    onClick={() => {
                                        setSelectedMonthDate(day);
                                        onDateClick?.(day);
                                    }}
                                >
                                    {isSelected && (
                                        <div className="absolute inset-0 border-2 border-primary pointer-events-none rounded-[calc(var(--radius)-2px)] z-10" />
                                    )}
                                    <div className="flex justify-between items-start mb-1 px-1">
                                        <span
                                            className={cn(
                                                "text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full transition-colors",
                                                isToday(day)
                                                    ? "bg-primary text-primary-foreground shadow-sm"
                                                    : "text-muted-foreground group-hover/day:text-foreground",
                                            )}
                                        >
                                            {format(day, "d")}
                                        </span>
                                    </div>
                                    <div className="flex flex-col gap-1 overflow-hidden flex-1 custom-scrollbar px-0.5 min-h-0">
                                        {dayEvents.map((event) => (
                                            <div
                                                key={event.id}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setSelectedMonthDate(day);
                                                    onEventClick?.(event);
                                                }}
                                                className={cn(
                                                    "group flex flex-col gap-0.5 rounded-[calc(var(--radius)-4px)] px-2 py-1.5 text-xs overflow-hidden flex-shrink-0 cursor-pointer border transition-all hover:brightness-95 dark:hover:brightness-110",
                                                    event.color || "bg-cyan-500/10 border-cyan-500/20 text-cyan-700 dark:text-cyan-400"
                                                )}
                                            >
                                                <div className="font-semibold truncate">
                                                    {event.title}
                                                </div>
                                                <div className="text-[10px] opacity-80 font-medium tracking-tight">
                                                    {format(event.start, "HH:mm")}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Side Panel for Selected Date */}
                <div className="w-full lg:w-[300px] flex-shrink-0 flex flex-col rounded-[var(--radius)] border border-border bg-background shadow-sm overflow-hidden animate-in slide-in-from-right-4 duration-300 max-h-[200px] lg:max-h-none">
                    <div className="p-4 border-b border-border bg-muted/20">
                        <div className="text-xl font-bold">{format(selectedMonthDate, "d")}</div>
                        <div className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                            {format(selectedMonthDate, "EEEE")}
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
                        {selectedDayEvents.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-muted-foreground text-sm opacity-80">
                                No events scheduled
                            </div>
                        ) : (
                            selectedDayEvents.map((event) => (
                                <div
                                    key={event.id}
                                    onClick={() => onEventClick?.(event)}
                                    className={cn(
                                        "flex flex-col gap-1.5 rounded-lg p-3 text-sm cursor-pointer border hover:shadow-md transition-all",
                                        event.color || "bg-cyan-500/10 border-cyan-500/20 text-cyan-700 dark:text-cyan-400"
                                    )}
                                >
                                    <div className="font-semibold leading-tight">
                                        {event.title}
                                    </div>
                                    <div className="text-xs opacity-90 font-medium tracking-wide">
                                        {format(event.start, "hh:mm a")} - {format(event.end, "hh:mm a")}
                                    </div>
                                    {event.extendedProps && typeof event.extendedProps.description === "string" && (
                                        <div className="text-xs opacity-80 mt-1 line-clamp-2">
                                            {event.extendedProps.description}
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        );
    };

    // ─── WEEK VIEW ──────────────────────────────────────────────────────────────
    const renderWeekView = () => {
        const startDate = startOfWeek(currentDate, { weekStartsOn: 1 });
        const days = eachDayOfInterval({
            start: startDate,
            end: addDays(startDate, 6),
        });
        const hours = Array.from({ length: 24 }, (_, i) => i);

        const isCurrentWeek = days.some(day => isSameDay(day, currentTime));

        return (
            <div className="flex flex-col h-full bg-background rounded-[var(--radius)] border border-border overflow-hidden shadow-sm min-w-[640px]">
                <div className="flex border-b border-border bg-muted/40 sticky top-0 z-30">
                    <div className="w-16 shrink-0 border-r border-border" />
                    {days.map((day) => (
                        <div
                            key={day.toISOString()}
                            className="flex-1 py-3 text-center border-r border-border last:border-r-0 cursor-pointer hover:bg-muted/50 transition-colors"
                            onClick={() => onDateClick?.(day)}
                        >
                            <div className="flex flex-col items-center gap-1">
                                <span
                                    className={cn(
                                        "text-xs font-semibold uppercase tracking-wider",
                                        isToday(day) ? "text-primary" : "text-muted-foreground",
                                    )}
                                >
                                    {format(day, "EEE")}
                                </span>
                                <span className={cn(
                                    "text-lg font-medium w-8 h-8 flex items-center justify-center rounded-full transition-all",
                                    isToday(day) ? "bg-primary text-primary-foreground shadow-sm" : "text-foreground"
                                )}>
                                    {format(day, "d")}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
                <div className="flex-1 overflow-y-auto relative custom-scrollbar scroll-smooth">
                    <div className="flex min-h-max isolate">
                        {/* Time labels axis */}
                        <div className="w-16 shrink-0 border-r border-border bg-muted/10 sticky left-0 z-20">
                            {hours.map((hour) => (
                                <div
                                    key={hour}
                                    className="h-24 relative border-b border-border last:border-b-0"
                                >
                                    <span className="absolute -top-2.5 left-2 text-[10px] font-semibold text-muted-foreground bg-background/80 backdrop-blur-xs px-1 rounded">
                                        {hour === 0
                                            ? "12 AM"
                                            : hour < 12
                                                ? `${hour} AM`
                                                : hour === 12
                                                    ? "12 PM"
                                                    : `${hour - 12} PM`}
                                    </span>
                                </div>
                            ))}
                        </div>

                        {/* Days columns */}
                        {days.map((day) => {
                            const dayEvents = getEventsForDay(day);
                            const isDayToday = isToday(day);

                            const currentHour = currentTime.getHours() + currentTime.getMinutes() / 60;
                            const currentTop = currentHour * 96;

                            return (
                                <div
                                    key={day.toISOString()}
                                    className={cn("flex-1 relative border-r border-border last:border-r-0 group/col", isDayToday ? "bg-primary/5 dark:bg-primary/10" : "")}
                                    onClick={() => onDateClick?.(day)}
                                >
                                    {/* Grid Lines */}
                                    {hours.map((hour) => (
                                        <div
                                            key={hour}
                                            className="h-24 border-b border-border/40 last:border-b-0 pointer-events-none group-hover/col:border-border/60 transition-colors"
                                        />
                                    ))}

                                    {/* Current Time Indicator Line */}
                                    {isDayToday && (
                                        <div className="absolute left-0 right-0 z-20 flex items-center pointer-events-none" style={{ top: `${currentTop}px`, transform: 'translateY(-50%)' }}>
                                            <div className="w-2 h-2 rounded-full bg-destructive ml-[-4px]" />
                                            <div className="h-[2px] bg-destructive flex-1 opacity-70" />
                                        </div>
                                    )}

                                    {/* Events */}
                                    {calculateOverlapingEvents(dayEvents).map((event) => {
                                        const startHour =
                                            event.start.getHours() + event.start.getMinutes() / 60;
                                        const endHour =
                                            event.end.getHours() + event.end.getMinutes() / 60;
                                        const duration = endHour - startHour;
                                        const top = startHour * 96;
                                        const height = duration * 96;

                                        return (
                                            <div
                                                key={event.id}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onEventClick?.(event);
                                                }}
                                                className={cn(
                                                    "absolute rounded-md p-2 text-xs overflow-hidden cursor-pointer border hover:shadow-md transition-all z-10 shadow-sm flex flex-col gap-1",
                                                    event.color || "bg-cyan-500/10 border-cyan-500/20 text-cyan-700 dark:text-cyan-400"
                                                )}
                                                style={{
                                                    top: `${top + 1}px`,
                                                    height: `${Math.max(height - 2, 28)}px`,
                                                    left: `calc(${event.leftOffset}% + 4px)`,
                                                    width: `calc(${event.width}% - 8px)`,
                                                }}
                                            >
                                                <div className="font-semibold line-clamp-2 leading-tight">
                                                    {event.title}
                                                </div>
                                                {height > 40 && (
                                                    <div className="text-[10px] opacity-80 font-medium tracking-tight mt-auto">
                                                        {format(event.start, "HH:mm")} -{" "}
                                                        {format(event.end, "HH:mm")}
                                                    </div>
                                                )}
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
        const isDayToday = isToday(currentDate);

        const currentHour = currentTime.getHours() + currentTime.getMinutes() / 60;
        const currentTop = currentHour * 112;

        return (
            <div className="flex flex-col h-full bg-background rounded-[var(--radius)] border border-border overflow-hidden shadow-sm">
                <div className="flex border-b border-border py-4 items-center justify-center bg-muted/40 sticky top-0 z-30">
                    <div className="flex items-center gap-3">
                        <span className={cn(
                            "text-2xl font-semibold w-12 h-12 flex items-center justify-center rounded-full",
                            isDayToday ? "bg-primary text-primary-foreground shadow-sm" : "bg-muted text-foreground"
                        )}>
                            {format(currentDate, "d")}
                        </span>
                        <div className="flex flex-col">
                            <span className="font-medium text-foreground uppercase tracking-wider text-sm">
                                {format(currentDate, "EEEE")}
                            </span>
                            <span className="text-muted-foreground text-sm font-medium">
                                {format(currentDate, "MMMM yyyy")}
                            </span>
                        </div>
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto relative custom-scrollbar scroll-smooth">
                    <div className="flex isolate">
                        <div className="w-20 shrink-0 border-r border-border bg-muted/10 sticky left-0 z-20">
                            {hours.map((hour) => (
                                <div
                                    key={hour}
                                    className="h-28 relative border-b border-border last:border-b-0"
                                >
                                    <span className="absolute -top-2.5 right-3 text-[13px] font-semibold text-muted-foreground bg-background/80 backdrop-blur-xs px-1 rounded">
                                        {hour === 0
                                            ? "12 AM"
                                            : hour < 12
                                                ? `${hour} AM`
                                                : hour === 12
                                                    ? "12 PM"
                                                    : `${hour - 12} PM`}
                                    </span>
                                </div>
                            ))}
                        </div>
                        <div
                            className={cn("flex-1 relative group/col", isDayToday ? "bg-primary/5 dark:bg-primary/10" : "")}
                            onClick={() => onDateClick?.(currentDate)}
                        >
                            {hours.map((hour) => (
                                <div
                                    key={hour}
                                    className="h-28 border-b border-border/40 last:border-b-0 pointer-events-none group-hover/col:border-border/60 transition-colors"
                                />
                            ))}

                            {/* Current Time Indicator Line */}
                            {isDayToday && (
                                <div className="absolute left-0 right-0 z-20 flex items-center pointer-events-none" style={{ top: `${currentTop}px`, transform: 'translateY(-50%)' }}>
                                    <div className="w-2.5 h-2.5 rounded-full bg-destructive ml-[-5px]" />
                                    <div className="h-[2px] bg-destructive flex-1 opacity-70" />
                                </div>
                            )}

                            {/* Events */}
                            {calculateOverlapingEvents(dayEvents).map((event) => {
                                const startHour =
                                    event.start.getHours() + event.start.getMinutes() / 60;
                                const endHour =
                                    event.end.getHours() + event.end.getMinutes() / 60;
                                const duration = endHour - startHour;
                                const top = startHour * 112;
                                const height = duration * 112;

                                return (
                                    <div
                                        key={event.id}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onEventClick?.(event);
                                        }}
                                        className={cn(
                                            "absolute rounded-lg p-3.5 text-sm overflow-hidden cursor-pointer border hover:shadow-lg transition-all z-10 shadow-sm flex flex-col gap-2",
                                            event.color || "bg-cyan-500/10 border-cyan-500/20 text-cyan-700 dark:text-cyan-400"
                                        )}
                                        style={{
                                            top: `${top + 1}px`,
                                            height: `${Math.max(height - 2, 48)}px`,
                                            left: `calc(${event.leftOffset}% + 16px)`,
                                            width: `calc(${event.width}% - 32px)`,
                                        }}
                                    >
                                        <div className="font-semibold text-base">
                                            {event.title}
                                        </div>
                                        <div className="text-xs opacity-90 font-medium tracking-wide">
                                            {format(event.start, "hh:mm a")} -{" "}
                                            {format(event.end, "hh:mm a")}
                                        </div>
                                        {event.extendedProps &&
                                            typeof event.extendedProps.description ===
                                            "string" && (
                                                <span className="mt-1 text-xs opacity-80 leading-relaxed max-w-[80%]">
                                                    {event.extendedProps.description}
                                                </span>
                                            )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="flex flex-col h-full gap-3 sm:gap-4">
            {/* Top Toolbar */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 pb-1 sm:pb-2">
                {/* Row 1: Search + View selector */}
                <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
                    <div className="relative flex-1 sm:flex-none">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search in calendar..."
                            value={searchQuery}
                            onChange={(e) => onSearchChange?.(e.target.value)}
                            className="w-full sm:w-[220px] pl-9 h-9 sm:h-10 bg-background/50 border-border focus-visible:ring-1 focus-visible:ring-ring"
                        />
                    </div>

                    <Select value={view} onValueChange={(v: ViewMode) => setView(v)}>
                        <SelectTrigger className="w-[100px] sm:w-[120px] h-9 sm:h-10 font-medium shrink-0">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="month">Month</SelectItem>
                            <SelectItem value="week">Week</SelectItem>
                            <SelectItem value="day">Day</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {/* Row 2: Navigation */}
                <div className="flex items-center gap-2 sm:gap-3 sm:ml-auto">
                    <div className="flex items-center gap-0.5 rounded-lg border bg-background p-1 shadow-sm">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={handlePrevious}
                            className="h-7 w-7 sm:h-8 sm:w-8 rounded-md hover:bg-muted"
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <div className="w-px h-4 bg-border mx-0.5 sm:mx-1" />
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={handleNext}
                            className="h-7 w-7 sm:h-8 sm:w-8 rounded-md hover:bg-muted"
                        >
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>

                    <Button
                        variant="secondary"
                        onClick={handleToday}
                        className="h-9 sm:h-10 px-3 sm:px-5 font-semibold text-sm"
                    >
                        Today
                    </Button>

                    <div className="flex items-center gap-1.5 sm:gap-2.5 px-2.5 sm:px-5 h-9 sm:h-10 bg-muted/50 border rounded-lg text-xs sm:text-sm font-semibold text-foreground/90 tabular-nums">
                        <CalendarIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary shrink-0" />
                        <span className="truncate">{title()}</span>
                    </div>
                </div>
            </div>

            {/* Calendar Body */}
            <div className="flex-1 min-h-0 overflow-x-auto">
                {view === "month" && renderMonthView()}
                {view === "week" && renderWeekView()}
                {view === "day" && renderDayView()}
            </div>
        </div>
    );
}
