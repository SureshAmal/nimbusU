"use client";

import { useRef, useCallback, useEffect, useState } from "react";

/* ═══════════════════════════════════════════════════════════════════
   CustomRange — Accessible slider with filled track + round thumb
   ═══════════════════════════════════════════════════════════════════ */

interface CustomRangeProps {
    value: number;
    min: number;
    max: number;
    step?: number;
    onChange: (value: number) => void;
    label?: string;
}

export function CustomRange({ value, min, max, step = 1, onChange, label }: CustomRangeProps) {
    const trackRef = useRef<HTMLDivElement>(null);
    const [dragging, setDragging] = useState(false);
    const [active, setActive] = useState(false);

    const pct = Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));

    const updateFromEvent = useCallback(
        (clientX: number) => {
            if (!trackRef.current) return;
            const rect = trackRef.current.getBoundingClientRect();
            const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
            const raw = min + ratio * (max - min);
            const snapped = Math.round(raw / step) * step;
            onChange(Math.max(min, Math.min(max, snapped)));
        },
        [min, max, step, onChange]
    );

    // Mouse drag
    useEffect(() => {
        if (!dragging) return;
        const onMove = (e: MouseEvent) => updateFromEvent(e.clientX);
        const onUp = () => setDragging(false);
        document.addEventListener("mousemove", onMove);
        document.addEventListener("mouseup", onUp);
        return () => {
            document.removeEventListener("mousemove", onMove);
            document.removeEventListener("mouseup", onUp);
        };
    }, [dragging, updateFromEvent]);

    // Keyboard handling
    function onKeyDown(e: React.KeyboardEvent) {
        if (!active) {
            if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setActive(true);
            }
            // If not active, let ArrowDown/ArrowUp bubble up to parent navigation
            return;
        }

        if (e.key === "Escape" || e.key === "Enter") {
            e.preventDefault();
            e.stopPropagation(); // Prevent modal from closing
            setActive(false);
            return;
        }

        let newVal = value;
        switch (e.key) {
            case "ArrowRight":
            case "ArrowUp":
                e.preventDefault();
                newVal = Math.min(max, value + step);
                break;
            case "ArrowLeft":
            case "ArrowDown":
                e.preventDefault();
                newVal = Math.max(min, value - step);
                break;
            case "Home":
                e.preventDefault();
                newVal = min;
                break;
            case "End":
                e.preventDefault();
                newVal = max;
                break;
            case "PageUp":
                e.preventDefault();
                newVal = Math.min(max, value + step * 5);
                break;
            case "PageDown":
                e.preventDefault();
                newVal = Math.max(min, value - step * 5);
                break;
            default:
                return;
        }
        onChange(newVal);
    }

    return (
        <div
            ref={trackRef}
            className="relative w-44 h-5 flex items-center cursor-pointer select-none"
            role="slider"
            aria-valuenow={value}
            aria-valuemin={min}
            aria-valuemax={max}
            aria-label={label}
            tabIndex={0}
            onKeyDown={onKeyDown}
            onBlur={() => setActive(false)}
            onMouseDown={(e) => {
                setDragging(true);
                setActive(true);
                updateFromEvent(e.clientX);
            }}
        >
            {/* Background track */}
            <div
                className="absolute inset-x-0 h-[6px] rounded-full"
                style={{
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "var(--muted)",
                }}
            />
            {/* Filled track */}
            <div
                className="absolute h-[6px] rounded-full"
                style={{
                    top: "50%",
                    transform: "translateY(-50%)",
                    left: 0,
                    width: `${pct}%`,
                    background: "var(--primary)",
                    transition: dragging ? "none" : "width 100ms ease",
                }}
            />
            {/* Thumb */}
            <div
                className="absolute h-[18px] w-[18px] rounded-full shadow-md"
                style={{
                    top: "50%",
                    transform: "translate(-50%, -50%)",
                    left: `${pct}%`,
                    background: "var(--primary)",
                    border: "3px solid white",
                    boxShadow: active
                        ? "0 0 0 4px var(--ring)"
                        : "0 1px 4px oklch(0 0 0 / 25%)",
                    transition: dragging ? "none" : "left 100ms ease, box-shadow 100ms ease",
                }}
            />
        </div>
    );
}
