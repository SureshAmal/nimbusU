"use client";

import { useState } from "react";

/* ═══════════════════════════════════════════════════════════════════
   CustomStepper — Number input with − / + buttons, keyboard accessible
   ═══════════════════════════════════════════════════════════════════ */

interface CustomStepperProps {
    value: number;
    min: number;
    max: number;
    step?: number;
    onChange: (value: number) => void;
}

export function CustomStepper({ value, min, max, step = 1, onChange }: CustomStepperProps) {
    const [active, setActive] = useState(false);

    function decrement() {
        onChange(Math.max(min, value - step));
    }
    function increment() {
        onChange(Math.min(max, value + step));
    }

    function onKeyDown(e: React.KeyboardEvent) {
        if (!active) {
            if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setActive(true);
            }
            // Allow Arrow navigation to pass through to the parent
            return;
        }

        if (e.key === "Escape" || e.key === "Enter") {
            e.preventDefault();
            e.stopPropagation(); // Prevent modal from closing
            setActive(false);
            return;
        }

        if (e.key === "ArrowUp" || e.key === "ArrowRight") {
            e.preventDefault();
            increment();
        } else if (e.key === "ArrowDown" || e.key === "ArrowLeft") {
            e.preventDefault();
            decrement();
        } else if (e.key === "Home") {
            e.preventDefault();
            onChange(min);
        } else if (e.key === "End") {
            e.preventDefault();
            onChange(max);
        }
    }

    return (
        <div
            className="inline-flex items-center overflow-hidden focus-visible:outline-hidden"
            style={{
                borderRadius: "var(--radius, 8px)",
                border: "1px solid var(--border)",
                boxShadow: active ? "0 0 0 2px var(--ring)" : "none",
                transition: "box-shadow 0.1s ease",
            }}
            role="spinbutton"
            aria-valuenow={value}
            aria-valuemin={min}
            aria-valuemax={max}
            tabIndex={0}
            onKeyDown={onKeyDown}
            onBlur={() => setActive(false)}
        >
            <button
                onClick={decrement}
                disabled={value <= min}
                tabIndex={-1}
                aria-label="Decrease"
                className="px-2.5 py-1 text-base font-bold transition-colors hover:bg-accent/50 disabled:opacity-30 disabled:cursor-not-allowed"
                style={{ borderRight: "1px solid var(--border)" }}
            >
                −
            </button>
            <span
                className="px-3 py-1 text-sm font-mono text-center min-w-[44px] select-none"
                style={{ background: "var(--muted)" }}
            >
                {value}
            </span>
            <button
                onClick={increment}
                disabled={value >= max}
                tabIndex={-1}
                aria-label="Increase"
                className="px-2.5 py-1 text-base font-bold transition-colors hover:bg-accent/50 disabled:opacity-30 disabled:cursor-not-allowed"
                style={{ borderLeft: "1px solid var(--border)" }}
            >
                +
            </button>
        </div>
    );
}
