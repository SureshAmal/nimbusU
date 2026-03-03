"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandSeparator,
    CommandShortcut,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";

/* ─── Types ───────────────────────────────────────────────────────── */

export interface ContextMenuItem {
    label: string;
    icon?: React.ReactNode;
    shortcut?: string;
    onClick?: () => void;
    disabled?: boolean;
    destructive?: boolean;
    children?: ContextMenuItem[]; // submenu
}

export interface ContextMenuGroup {
    label?: string;
    items: ContextMenuItem[];
}

interface ContextMenuProps {
    groups: ContextMenuGroup[];
    children: React.ReactNode;
}

/* ─── Component ───────────────────────────────────────────────────── */

export function SearchableContextMenu({ groups, children }: ContextMenuProps) {
    const [open, setOpen] = useState(false);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [submenu, setSubmenu] = useState<{
        items: ContextMenuItem[];
        position: { x: number; y: number };
    } | null>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const triggerRef = useRef<HTMLDivElement>(null);

    const handleContextMenu = useCallback((e: React.MouseEvent) => {
        // If the right-click originated inside a Radix ContextMenu trigger,
        // let that component handle it instead of the global command palette.
        const target = e.target as HTMLElement;
        if (target.closest('[data-slot="context-menu-trigger"]')) {
            return;
        }

        e.preventDefault();
        e.stopPropagation();

        const x = Math.min(e.clientX, window.innerWidth - 280);
        const y = Math.min(e.clientY, window.innerHeight - 400);

        setPosition({ x, y });
        setSubmenu(null);
        setOpen(true);
    }, []);

    /* Close on outside click or Escape */
    useEffect(() => {
        if (!open) return;

        function handleClick(e: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setOpen(false);
                setSubmenu(null);
            }
        }
        function handleKey(e: KeyboardEvent) {
            if (e.key === "Escape") {
                setOpen(false);
                setSubmenu(null);
            }
        }

        document.addEventListener("mousedown", handleClick);
        document.addEventListener("keydown", handleKey);
        return () => {
            document.removeEventListener("mousedown", handleClick);
            document.removeEventListener("keydown", handleKey);
        };
    }, [open]);

    function handleItemClick(item: ContextMenuItem) {
        if (item.disabled) return;
        if (item.children) return; // handled by hover
        item.onClick?.();
        setOpen(false);
        setSubmenu(null);
    }

    function handleItemHover(item: ContextMenuItem, e: React.MouseEvent) {
        if (item.children && item.children.length > 0) {
            const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
            setSubmenu({
                items: item.children,
                position: {
                    x: Math.min(rect.right + 4, window.innerWidth - 240),
                    y: rect.top,
                },
            });
        } else {
            setSubmenu(null);
        }
    }

    return (
        <>
            <div ref={triggerRef} onContextMenu={handleContextMenu}>
                {children}
            </div>

            {open &&
                createPortal(
                    <div ref={menuRef} className="fixed z-[9999]" style={{ left: 0, top: 0 }}>
                        {/* Main menu */}
                        <div
                            className="absolute"
                            style={{
                                left: position.x,
                                top: position.y,
                            }}
                        >
                            <Command
                                className="w-[260px] border shadow-lg"
                                style={{
                                    borderRadius: "var(--radius-lg)",
                                    boxShadow: "var(--shadow-xl)",
                                    background: "var(--popover)",
                                    borderColor: "var(--border)",
                                }}
                            >
                                <CommandInput placeholder="Search actions..." />
                                <CommandList className="max-h-[360px]">
                                    <CommandEmpty>No results found.</CommandEmpty>
                                    {groups.map((group, gi) => (
                                        <div key={gi}>
                                            {gi > 0 && <CommandSeparator />}
                                            <CommandGroup heading={group.label}>
                                                {group.items.map((item, ii) => (
                                                    <CommandItem
                                                        key={`${gi}-${ii}`}
                                                        disabled={item.disabled}
                                                        onSelect={() => handleItemClick(item)}
                                                        onMouseEnter={(e) => handleItemHover(item, e)}
                                                        className={cn(
                                                            "flex items-center gap-2 cursor-pointer",
                                                            item.destructive && "text-destructive",
                                                            item.disabled && "opacity-50 cursor-not-allowed"
                                                        )}
                                                    >
                                                        {item.icon && (
                                                            <span className="flex h-4 w-4 items-center justify-center shrink-0">
                                                                {item.icon}
                                                            </span>
                                                        )}
                                                        <span className="flex-1">{item.label}</span>
                                                        {item.shortcut && (
                                                            <CommandShortcut>{item.shortcut}</CommandShortcut>
                                                        )}
                                                        {item.children && (
                                                            <span className="ml-auto text-xs opacity-60">›</span>
                                                        )}
                                                    </CommandItem>
                                                ))}
                                            </CommandGroup>
                                        </div>
                                    ))}
                                </CommandList>
                            </Command>
                        </div>

                        {/* Submenu */}
                        {submenu && (
                            <div
                                className="absolute"
                                style={{
                                    left: submenu.position.x,
                                    top: submenu.position.y,
                                }}
                            >
                                <Command
                                    className="w-[220px] border shadow-lg"
                                    style={{
                                        borderRadius: "var(--radius-lg)",
                                        boxShadow: "var(--shadow-xl)",
                                        background: "var(--popover)",
                                        borderColor: "var(--border)",
                                    }}
                                >
                                    <CommandList>
                                        <CommandGroup>
                                            {submenu.items.map((item, i) => (
                                                <CommandItem
                                                    key={i}
                                                    disabled={item.disabled}
                                                    onSelect={() => handleItemClick(item)}
                                                    className={cn(
                                                        "flex items-center gap-2 cursor-pointer",
                                                        item.destructive && "text-destructive"
                                                    )}
                                                >
                                                    {item.icon && (
                                                        <span className="flex h-4 w-4 items-center justify-center shrink-0">
                                                            {item.icon}
                                                        </span>
                                                    )}
                                                    <span className="flex-1">{item.label}</span>
                                                    {item.shortcut && (
                                                        <CommandShortcut>{item.shortcut}</CommandShortcut>
                                                    )}
                                                </CommandItem>
                                            ))}
                                        </CommandGroup>
                                    </CommandList>
                                </Command>
                            </div>
                        )}
                    </div>,
                    document.body
                )}
        </>
    );
}
