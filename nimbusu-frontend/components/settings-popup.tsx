"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { useTheme } from "next-themes";
import { CustomSelect, type SelectOption } from "@/components/ui/custom-select";
import { CustomRange } from "@/components/ui/custom-range";
import { CustomStepper } from "@/components/ui/custom-stepper";
import { CustomToggle } from "@/components/ui/custom-toggle";
import { CustomModal } from "@/components/ui/custom-modal";
import {
  Search,
  X,
  Sun,
  Moon,
  Monitor,
  Copy,
  RotateCcw,
  Check,
} from "lucide-react";

/* ═══════════════════════════════════════════════════════════════════
   Color presets
   ═══════════════════════════════════════════════════════════════════ */

interface ThemePalette {
  background: string;
  foreground: string;
  card: string;
  cardForeground: string;
  popover: string;
  popoverForeground: string;
  secondary: string;
  secondaryForeground: string;
  muted: string;
  mutedForeground: string;
  border: string;
  input: string;
  sidebar: string;
  sidebarForeground: string;
  sidebarBorder: string;
}

interface ColorPreset {
  name: string;
  dot: string;
  // Shared across light/dark
  primary: string;
  primaryForeground: string;
  accent: string;
  accentForeground: string;
  ring: string;
  destructive: string;
  chart1: string;
  chart2: string;
  chart3: string;
  chart4: string;
  chart5: string;
  // Mode-specific palettes
  light: ThemePalette;
  dark: ThemePalette;
}

// Helper: generate a light palette with a hue tint
function lightPalette(hue: number, sat = 0.01): ThemePalette {
  return {
    background: `oklch(0.99 ${sat} ${hue})`,
    foreground: `oklch(0.145 0.01 ${hue})`,
    card: `oklch(1 ${sat * 0.5} ${hue})`,
    cardForeground: `oklch(0.145 0.01 ${hue})`,
    popover: `oklch(1 ${sat * 0.5} ${hue})`,
    popoverForeground: `oklch(0.145 0.01 ${hue})`,
    secondary: `oklch(0.965 ${sat * 1.5} ${hue})`,
    secondaryForeground: `oklch(0.205 0.01 ${hue})`,
    muted: `oklch(0.965 ${sat * 1.5} ${hue})`,
    mutedForeground: `oklch(0.5 0.01 ${hue})`,
    border: `oklch(0.91 ${sat} ${hue})`,
    input: `oklch(0.91 ${sat} ${hue})`,
    sidebar: `oklch(0.98 ${sat} ${hue})`,
    sidebarForeground: `oklch(0.145 0.01 ${hue})`,
    sidebarBorder: `oklch(0.91 ${sat} ${hue})`,
  };
}

// Helper: generate a dark palette with a hue tint
function darkPalette(hue: number, sat = 0.015): ThemePalette {
  return {
    background: `oklch(0.13 ${sat} ${hue})`,
    foreground: `oklch(0.985 0.005 ${hue})`,
    card: `oklch(0.17 ${sat} ${hue})`,
    cardForeground: `oklch(0.985 0.005 ${hue})`,
    popover: `oklch(0.17 ${sat} ${hue})`,
    popoverForeground: `oklch(0.985 0.005 ${hue})`,
    secondary: `oklch(0.22 ${sat * 0.8} ${hue})`,
    secondaryForeground: `oklch(0.985 0.005 ${hue})`,
    muted: `oklch(0.22 ${sat * 0.8} ${hue})`,
    mutedForeground: `oklch(0.7 0.01 ${hue})`,
    border: `oklch(1 0 0 / 10%)`,
    input: `oklch(1 0 0 / 15%)`,
    sidebar: `oklch(0.15 ${sat} ${hue})`,
    sidebarForeground: `oklch(0.985 0.005 ${hue})`,
    sidebarBorder: `oklch(1 0 0 / 10%)`,
  };
}

const COLOR_PRESETS: ColorPreset[] = [
  {
    name: "Indigo",
    dot: "#6366f1",
    primary: "oklch(0.585 0.233 277)",
    primaryForeground: "oklch(0.985 0 0)",
    accent: "oklch(0.928 0.032 264)",
    accentForeground: "oklch(0.205 0 0)",
    ring: "oklch(0.585 0.233 277)",
    destructive: "oklch(0.577 0.245 27)",
    chart1: "oklch(0.646 0.222 41)",
    chart2: "oklch(0.6 0.118 185)",
    chart3: "oklch(0.398 0.07 227)",
    chart4: "oklch(0.828 0.189 84)",
    chart5: "oklch(0.769 0.188 70)",
    light: lightPalette(265),
    dark: darkPalette(265),
  },
  {
    name: "Blue",
    dot: "#3b82f6",
    primary: "oklch(0.623 0.214 260)",
    primaryForeground: "oklch(0.985 0 0)",
    accent: "oklch(0.932 0.032 256)",
    accentForeground: "oklch(0.205 0 0)",
    ring: "oklch(0.623 0.214 260)",
    destructive: "oklch(0.577 0.245 27)",
    chart1: "oklch(0.623 0.214 260)",
    chart2: "oklch(0.696 0.17 162)",
    chart3: "oklch(0.769 0.188 70)",
    chart4: "oklch(0.627 0.265 304)",
    chart5: "oklch(0.645 0.246 16)",
    light: lightPalette(250),
    dark: darkPalette(250),
  },
  {
    name: "Violet",
    dot: "#8b5cf6",
    primary: "oklch(0.541 0.281 293)",
    primaryForeground: "oklch(0.985 0 0)",
    accent: "oklch(0.915 0.042 293)",
    accentForeground: "oklch(0.205 0 0)",
    ring: "oklch(0.541 0.281 293)",
    destructive: "oklch(0.577 0.245 27)",
    chart1: "oklch(0.541 0.281 293)",
    chart2: "oklch(0.623 0.214 260)",
    chart3: "oklch(0.769 0.188 70)",
    chart4: "oklch(0.696 0.17 162)",
    chart5: "oklch(0.645 0.246 16)",
    light: lightPalette(293),
    dark: darkPalette(293),
  },
  {
    name: "Rose",
    dot: "#f43f5e",
    primary: "oklch(0.645 0.246 16)",
    primaryForeground: "oklch(0.985 0 0)",
    accent: "oklch(0.935 0.035 16)",
    accentForeground: "oklch(0.205 0 0)",
    ring: "oklch(0.645 0.246 16)",
    destructive: "oklch(0.577 0.245 27)",
    chart1: "oklch(0.645 0.246 16)",
    chart2: "oklch(0.541 0.281 293)",
    chart3: "oklch(0.623 0.214 260)",
    chart4: "oklch(0.769 0.188 70)",
    chart5: "oklch(0.696 0.17 162)",
    light: lightPalette(10, 0.012),
    dark: darkPalette(10, 0.018),
  },
  {
    name: "Sunset",
    dot: "#f97316",
    primary: "oklch(0.702 0.209 41)",
    primaryForeground: "oklch(0.985 0 0)",
    accent: "oklch(0.94 0.038 41)",
    accentForeground: "oklch(0.205 0 0)",
    ring: "oklch(0.702 0.209 41)",
    destructive: "oklch(0.577 0.245 27)",
    chart1: "oklch(0.702 0.209 41)",
    chart2: "oklch(0.769 0.188 70)",
    chart3: "oklch(0.645 0.246 16)",
    chart4: "oklch(0.828 0.189 84)",
    chart5: "oklch(0.623 0.214 260)",
    light: lightPalette(40, 0.015),
    dark: darkPalette(40, 0.02),
  },
  {
    name: "Emerald",
    dot: "#10b981",
    primary: "oklch(0.696 0.17 162)",
    primaryForeground: "oklch(0.985 0 0)",
    accent: "oklch(0.935 0.035 162)",
    accentForeground: "oklch(0.205 0 0)",
    ring: "oklch(0.696 0.17 162)",
    destructive: "oklch(0.577 0.245 27)",
    chart1: "oklch(0.696 0.17 162)",
    chart2: "oklch(0.623 0.214 260)",
    chart3: "oklch(0.769 0.188 70)",
    chart4: "oklch(0.541 0.281 293)",
    chart5: "oklch(0.645 0.246 16)",
    light: lightPalette(160, 0.012),
    dark: darkPalette(160, 0.018),
  },
  {
    name: "Amber",
    dot: "#f59e0b",
    primary: "oklch(0.769 0.188 70)",
    primaryForeground: "oklch(0.21 0.006 286)",
    accent: "oklch(0.94 0.038 70)",
    accentForeground: "oklch(0.205 0 0)",
    ring: "oklch(0.769 0.188 70)",
    destructive: "oklch(0.577 0.245 27)",
    chart1: "oklch(0.769 0.188 70)",
    chart2: "oklch(0.702 0.209 41)",
    chart3: "oklch(0.645 0.246 16)",
    chart4: "oklch(0.696 0.17 162)",
    chart5: "oklch(0.623 0.214 260)",
    light: lightPalette(70, 0.012),
    dark: darkPalette(70, 0.018),
  },
  {
    name: "Cyan",
    dot: "#06b6d4",
    primary: "oklch(0.715 0.143 215)",
    primaryForeground: "oklch(0.985 0 0)",
    accent: "oklch(0.935 0.035 215)",
    accentForeground: "oklch(0.205 0 0)",
    ring: "oklch(0.715 0.143 215)",
    destructive: "oklch(0.577 0.245 27)",
    chart1: "oklch(0.715 0.143 215)",
    chart2: "oklch(0.696 0.17 162)",
    chart3: "oklch(0.623 0.214 260)",
    chart4: "oklch(0.769 0.188 70)",
    chart5: "oklch(0.645 0.246 16)",
    light: lightPalette(210),
    dark: darkPalette(210),
  },
  {
    name: "Teal",
    dot: "#14b8a6",
    primary: "oklch(0.704 0.14 181)",
    primaryForeground: "oklch(0.985 0 0)",
    accent: "oklch(0.935 0.03 181)",
    accentForeground: "oklch(0.205 0 0)",
    ring: "oklch(0.704 0.14 181)",
    destructive: "oklch(0.577 0.245 27)",
    chart1: "oklch(0.704 0.14 181)",
    chart2: "oklch(0.623 0.214 260)",
    chart3: "oklch(0.769 0.188 70)",
    chart4: "oklch(0.541 0.281 293)",
    chart5: "oklch(0.702 0.209 41)",
    light: lightPalette(180),
    dark: darkPalette(180),
  },
  {
    name: "Fuchsia",
    dot: "#d946ef",
    primary: "oklch(0.591 0.293 323)",
    primaryForeground: "oklch(0.985 0 0)",
    accent: "oklch(0.92 0.045 323)",
    accentForeground: "oklch(0.205 0 0)",
    ring: "oklch(0.591 0.293 323)",
    destructive: "oklch(0.577 0.245 27)",
    chart1: "oklch(0.591 0.293 323)",
    chart2: "oklch(0.645 0.246 16)",
    chart3: "oklch(0.623 0.214 260)",
    chart4: "oklch(0.769 0.188 70)",
    chart5: "oklch(0.696 0.17 162)",
    light: lightPalette(320, 0.012),
    dark: darkPalette(320, 0.018),
  },
  {
    name: "Coral",
    dot: "#fb7185",
    primary: "oklch(0.679 0.19 19)",
    primaryForeground: "oklch(0.985 0 0)",
    accent: "oklch(0.94 0.035 19)",
    accentForeground: "oklch(0.205 0 0)",
    ring: "oklch(0.679 0.19 19)",
    destructive: "oklch(0.577 0.245 27)",
    chart1: "oklch(0.679 0.19 19)",
    chart2: "oklch(0.702 0.209 41)",
    chart3: "oklch(0.769 0.188 70)",
    chart4: "oklch(0.623 0.214 260)",
    chart5: "oklch(0.696 0.17 162)",
    light: lightPalette(15, 0.012),
    dark: darkPalette(15, 0.018),
  },
  {
    name: "Crimson",
    dot: "#dc2626",
    primary: "oklch(0.577 0.245 27)",
    primaryForeground: "oklch(0.985 0 0)",
    accent: "oklch(0.935 0.04 27)",
    accentForeground: "oklch(0.205 0 0)",
    ring: "oklch(0.577 0.245 27)",
    destructive: "oklch(0.645 0.246 16)",
    chart1: "oklch(0.577 0.245 27)",
    chart2: "oklch(0.645 0.246 16)",
    chart3: "oklch(0.702 0.209 41)",
    chart4: "oklch(0.769 0.188 70)",
    chart5: "oklch(0.541 0.281 293)",
    light: lightPalette(25, 0.012),
    dark: darkPalette(25, 0.018),
  },
  {
    name: "Ocean",
    dot: "#0ea5e9",
    primary: "oklch(0.685 0.169 237)",
    primaryForeground: "oklch(0.985 0 0)",
    accent: "oklch(0.935 0.035 237)",
    accentForeground: "oklch(0.205 0 0)",
    ring: "oklch(0.685 0.169 237)",
    destructive: "oklch(0.577 0.245 27)",
    chart1: "oklch(0.685 0.169 237)",
    chart2: "oklch(0.715 0.143 215)",
    chart3: "oklch(0.696 0.17 162)",
    chart4: "oklch(0.541 0.281 293)",
    chart5: "oklch(0.769 0.188 70)",
    light: lightPalette(235),
    dark: darkPalette(235),
  },
  {
    name: "Slate",
    dot: "#64748b",
    primary: "oklch(0.551 0.027 264)",
    primaryForeground: "oklch(0.985 0 0)",
    accent: "oklch(0.928 0.006 264)",
    accentForeground: "oklch(0.205 0 0)",
    ring: "oklch(0.551 0.027 264)",
    destructive: "oklch(0.577 0.245 27)",
    chart1: "oklch(0.551 0.027 264)",
    chart2: "oklch(0.446 0.03 257)",
    chart3: "oklch(0.372 0.044 257)",
    chart4: "oklch(0.279 0.041 260)",
    chart5: "oklch(0.208 0.042 266)",
    light: lightPalette(264, 0.005),
    dark: darkPalette(264, 0.008),
  },
];

const FONT_OPTIONS: SelectOption[] = [
  { value: "Inter", label: "Inter" },
  { value: "Roboto", label: "Roboto" },
  { value: "Outfit", label: "Outfit" },
  { value: "Poppins", label: "Poppins" },
  { value: "system-ui", label: "System UI" },
  { value: "monospace", label: "Monospace" },
];

const PRESET_OPTIONS: SelectOption[] = COLOR_PRESETS.map((p) => ({
  value: p.name,
  label: p.name,
  dot: p.dot,
}));

/* ═══════════════════════════════════════════════════════════════════
   CSS helpers
   ═══════════════════════════════════════════════════════════════════ */

function getCss(v: string) {
  if (typeof window === "undefined") return "";
  return getComputedStyle(document.documentElement).getPropertyValue(v).trim();
}

function setCss(v: string, val: string) {
  document.documentElement.style.setProperty(v, val);
}

function parseRem(val: string): number {
  const n = parseFloat(val);
  if (!n) return 0;
  if (val.includes("rem")) return Math.round(n * 16);
  return n;
}

/* ═══════════════════════════════════════════════════════════════════
   Main component
   ═══════════════════════════════════════════════════════════════════ */

export function SettingsPopup() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const { theme, setTheme } = useTheme();
  const [search, setSearch] = useState("");
  const [activePreset, setActivePreset] = useState("Indigo");
  const [font, setFont] = useState("Inter");
  const [fontSize, setFontSize] = useState(16);
  const [headingSize, setHeadingSize] = useState(24);
  const [spacing, setSpacing] = useState(4);
  const [animations, setAnimations] = useState(true);
  const [roundCorners, setRoundCorners] = useState(true);
  const [radius, setRadius] = useState(10);
  const [shadow, setShadow] = useState(50);
  const [blur, setBlur] = useState(8);
  const [transition, setTransition] = useState(250);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(timer);
  }, []);

  // ── Keyboard shortcut: Ctrl+, ──
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === ",") {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === "Escape" && open) setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // ── Init from CSS ──
  useEffect(() => {
    if (!open) return;
    const updateStateFromCss = () => {
      setFontSize(parseRem(getCss("--text-base")) || 16);
      setHeadingSize(parseRem(getCss("--text-2xl")) || 24);
      const r = parseFloat(getCss("--radius"));
      setRadius(r ? Math.round(r * 16) : 10);
      setBlur(parseInt(getCss("--blur-md")) || 8);
    };
    updateStateFromCss();
  }, [open]);

  // ── Apply changes ──
  function onFontChange(v: string) {
    setFont(v);
    setCss("--font-sans", v + ", sans-serif");
  }

  function onFontSizeChange(v: number) {
    setFontSize(v);
    setCss("--text-base", `${v / 16}rem`);
  }

  function onHeadingSizeChange(v: number) {
    setHeadingSize(v);
    setCss("--text-2xl", `${v / 16}rem`);
  }

  function onSpacingChange(v: number) {
    setSpacing(v);
    setCss("--spacing", `${v}px`);
  }

  function setAllRadii(px: number) {
    const rem = px / 16;
    setCss("--radius", `${rem}rem`);
    setCss("--radius-sm", `${Math.max(0, rem - 0.25)}rem`);
    setCss("--radius-md", `${Math.max(0, rem - 0.125)}rem`);
    setCss("--radius-lg", `${rem}rem`);
    setCss("--radius-xl", `${rem + 0.25}rem`);
    setCss("--radius-2xl", `${rem + 0.5}rem`);
    setCss("--radius-3xl", `${rem + 0.75}rem`);
    setCss("--radius-4xl", `${rem + 1}rem`);
  }

  function onRadiusChange(v: number) {
    setRadius(v);
    setAllRadii(v);
  }

  function onShadowChange(v: number) {
    setShadow(v);
    const a = v / 100;
    setCss("--shadow-sm", `0 1px 3px oklch(0 0 0 / ${(8 * a).toFixed(1)}%)`);
    setCss("--shadow-md", `0 4px 6px oklch(0 0 0 / ${(7 * a).toFixed(1)}%)`);
    setCss("--shadow-lg", `0 10px 15px oklch(0 0 0 / ${(8 * a).toFixed(1)}%)`);
  }

  function onBlurChange(v: number) {
    setBlur(v);
    setCss("--blur-sm", `${Math.max(2, v / 2)}px`);
    setCss("--blur-md", `${v}px`);
    setCss("--blur-lg", `${v * 2}px`);
  }

  function onTransitionChange(v: number) {
    setTransition(v);
    setCss("--transition-fast", `${Math.max(50, v / 2)}ms`);
    setCss("--transition-normal", `${v}ms`);
    setCss("--transition-slow", `${v * 1.5}ms`);
  }

  function onAnimationsChange(v: boolean) {
    setAnimations(v);
    if (!v) setCss("--transition-normal", "0ms");
    else setCss("--transition-normal", `${transition}ms`);
  }

  function onRoundCornersChange(v: boolean) {
    setRoundCorners(v);
    if (!v) {
      setRadius(0);
      setAllRadii(0);
    } else {
      setRadius(10);
      setAllRadii(10);
    }
  }

  function applyPreset(name: string) {
    const p = COLOR_PRESETS.find((x) => x.name === name);
    if (!p) return;
    setActivePreset(name);

    // Base colors
    setCss("--primary", p.primary);
    setCss("--primary-foreground", p.primaryForeground);
    setCss("--accent", p.accent);
    setCss("--accent-foreground", p.accentForeground);
    setCss("--ring", p.ring);
    setCss("--destructive", p.destructive);
    setCss("--chart-1", p.chart1);
    setCss("--chart-2", p.chart2);
    setCss("--chart-3", p.chart3);
    setCss("--chart-4", p.chart4);
    setCss("--chart-5", p.chart5);

    // Sidebar uses same as primary if not explicitly defined in theme palette
    setCss("--sidebar-primary", p.primary);
    setCss("--sidebar-primary-foreground", p.primaryForeground);
    setCss("--sidebar-accent", p.accent);
    setCss("--sidebar-accent-foreground", p.accentForeground);
    setCss("--sidebar-ring", p.ring);

    // Mode-specific palette
    const palette =
      theme === "dark" ||
        (theme === "system" &&
          window.matchMedia("(prefers-color-scheme: dark)").matches)
        ? p.dark
        : p.light;

    setCss("--background", palette.background);
    setCss("--foreground", palette.foreground);
    setCss("--card", palette.card);
    setCss("--card-foreground", palette.cardForeground);
    setCss("--popover", palette.popover);
    setCss("--popover-foreground", palette.popoverForeground);
    setCss("--secondary", palette.secondary);
    setCss("--secondary-foreground", palette.secondaryForeground);
    setCss("--muted", palette.muted);
    setCss("--muted-foreground", palette.mutedForeground);
    setCss("--border", palette.border);
    setCss("--input", palette.input);

    // Contextual sidebar bg
    setCss("--sidebar-background", palette.sidebar);
    setCss("--sidebar-foreground", palette.sidebarForeground);
    setCss("--sidebar-border", palette.sidebarBorder);
  }

  // Re-apply preset when light/dark theme changes so the correct sub-palette is applied
  useEffect(() => {
    const timer = setTimeout(() => applyPreset(activePreset), 0);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme]);

  function resetAll() {
    document.documentElement.removeAttribute("style");
    setActivePreset("Indigo");
    setFont("Inter");
    setOpen(false);
    setTimeout(() => setOpen(true), 50);
  }

  function copyConfig() {
    const vars = [
      "--primary",
      "--primary-foreground",
      "--accent",
      "--radius",
      "--text-base",
      "--text-2xl",
      "--blur-md",
      "--transition-normal",
    ];
    const cfg: Record<string, string> = {};
    vars.forEach((v) => {
      cfg[v] = getCss(v);
    });
    navigator.clipboard.writeText(JSON.stringify(cfg, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // ── Search filter ──
  type SectionKey =
    | "scheme"
    | "accent"
    | "font"
    | "fontSize"
    | "headingSize"
    | "spacing"
    | "animations"
    | "roundCorners"
    | "radius"
    | "shadow"
    | "blur"
    | "transition";
  const sectionLabels: Record<SectionKey, string[]> = {
    scheme: ["color scheme light dark system theme"],
    accent: ["accent color primary"],
    font: ["font family typeface"],
    fontSize: ["font size scale text"],
    headingSize: ["heading title size"],
    spacing: ["spacing padding margin gap"],
    animations: ["animations transitions motion"],
    roundCorners: ["round corners border"],
    radius: ["border radius rounding"],
    shadow: ["shadow depth intensity"],
    blur: ["backdrop blur glass"],
    transition: ["transition speed duration"],
  };

  function visible(key: SectionKey) {
    if (!search) return true;
    const q = search.toLowerCase();
    return sectionLabels[key].some((s) => s.includes(q));
  }

  if (!mounted) return null;

  return (
    <CustomModal
      open={open}
      onOpenChange={setOpen}
      width="540px"
      title={
        <div className="flex-1 flex items-center gap-2">
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <input
            type="text"
            placeholder="Search settings..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
      }
      actions={
        <button
          onClick={resetAll}
          className="p-1 rounded hover:bg-accent/50 text-muted-foreground"
          title="Reset to defaults"
        >
          <RotateCcw className="h-4 w-4" />
        </button>
      }
    >
      {/* ── Scrollable body ── */}
      <style>{`
                  .settings-scroll::-webkit-scrollbar { width: 5px; }
                  .settings-scroll::-webkit-scrollbar-track { background: transparent; }
                  .settings-scroll::-webkit-scrollbar-thumb { background: var(--primary); border-radius: 999px; }
                  .settings-scroll::-webkit-scrollbar-thumb:hover { background: var(--ring); }
                `}</style>
      <div
        className="flex-1 overflow-y-auto settings-scroll"
        style={{
          scrollbarWidth: "thin",
          scrollbarColor: "var(--primary) transparent",
        }}
      >
        {/* Color Scheme */}
        {visible("scheme") && (
          <Row
            label="System Light / Dark Scheme"
            desc="Automatically adapt between light and dark color schemes"
          >
            <div className="flex gap-1">
              {(["system", "light", "dark"] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setTheme(v)}
                  tabIndex={0}
                  role="radio"
                  aria-checked={theme === v}
                  aria-label={`${v} color scheme`}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-all focus-visible:outline-2 focus-visible:outline-offset-1"
                  style={{
                    borderRadius: "var(--radius-lg, 9999px)",
                    background:
                      theme === v ? "var(--primary)" : "var(--muted)",
                    color:
                      theme === v
                        ? "var(--primary-foreground)"
                        : "var(--foreground)",
                    outlineColor: "var(--ring)",
                  }}
                >
                  {v === "system" && <Monitor className="h-3 w-3" />}
                  {v === "light" && <Sun className="h-3 w-3" />}
                  {v === "dark" && <Moon className="h-3 w-3" />}
                  {v.charAt(0).toUpperCase() + v.slice(1)}
                </button>
              ))}
            </div>
          </Row>
        )}

        {/* Accent Color — CustomSelect dropdown */}
        {visible("accent") && (
          <Row
            label="Accent Color"
            desc="Choose primary color for the interface"
          >
            <CustomSelect
              value={activePreset}
              options={PRESET_OPTIONS}
              onChange={applyPreset}
              placeholder="Choose color"
            />
          </Row>
        )}

        {/* Font — CustomSelect dropdown */}
        {visible("font") && (
          <Row label="Font" desc="System font applied to the entire UI">
            <CustomSelect
              value={font}
              options={FONT_OPTIONS}
              onChange={onFontChange}
              placeholder="Choose font"
            />
          </Row>
        )}

        {/* Font Size — Stepper */}
        {visible("fontSize") && (
          <Row label="Font Size" desc="Determines the scale of the whole UI">
            <CustomStepper
              value={fontSize}
              min={10}
              max={22}
              step={1}
              onChange={onFontSizeChange}
            />
          </Row>
        )}

        {/* Heading Size — Stepper */}
        {visible("headingSize") && (
          <Row
            label="Heading Size"
            desc="Scale factor for headings and titles"
          >
            <CustomStepper
              value={headingSize}
              min={18}
              max={40}
              step={1}
              onChange={onHeadingSizeChange}
            />
          </Row>
        )}

        {/* Spacing — Range */}
        {visible("spacing") && (
          <Row label="Spacing" desc="Controls padding, gaps, and margins">
            <CustomRange
              value={spacing}
              min={4}
              max={6.4}
              step={0.1}
              onChange={onSpacingChange}
            />
          </Row>
        )}

        {/* Animations — Toggle */}
        {visible("animations") && (
          <Row
            label="Animations"
            desc="Enable smooth transitions and hover effects"
          >
            <CustomToggle
              checked={animations}
              onChange={onAnimationsChange}
            />
          </Row>
        )}

        {/* Round Corners — Toggle */}
        {visible("roundCorners") && (
          <Row
            label="Round Corners"
            desc="Apply rounding to buttons, inputs, cards"
          >
            <CustomToggle
              checked={roundCorners}
              onChange={onRoundCornersChange}
            />
          </Row>
        )}

        {/* Border Radius — Range */}
        {visible("radius") && (
          <Row
            label="Border Radius"
            desc="Controls the rounding amount when enabled"
          >
            <CustomRange
              value={radius}
              min={0}
              max={20}
              step={1}
              onChange={onRadiusChange}
            />
          </Row>
        )}

        {/* Shadow Intensity — Range */}
        {visible("shadow") && (
          <Row
            label="Shadow Intensity"
            desc="Depth of drop shadows on cards and popups"
          >
            <CustomRange
              value={shadow}
              min={0}
              max={100}
              step={5}
              onChange={onShadowChange}
            />
          </Row>
        )}

        {/* Backdrop Blur — Range */}
        {visible("blur") && (
          <Row
            label="Backdrop Blur"
            desc="Blur on overlays and glass surfaces"
          >
            <CustomRange
              value={blur}
              min={0}
              max={32}
              step={2}
              onChange={onBlurChange}
            />
          </Row>
        )}

        {/* Transition Speed — Range */}
        {visible("transition") && (
          <Row label="Transition Speed" desc="Duration of all UI animations">
            <CustomRange
              value={transition}
              min={0}
              max={500}
              step={50}
              onChange={onTransitionChange}
            />
          </Row>
        )}
      </div>

      {/* ── Footer ── */}
      <div
        className="hidden sm:block px-4 py-2 border-t mt-4 text-xs text-muted-foreground text-center"
        style={{ borderColor: "var(--border)" }}
      >
        <kbd className="px-1 py-0.5 rounded bg-muted text-[10px] font-mono">Up</kbd>{" "}
        <kbd className="px-1 py-0.5 rounded bg-muted text-[10px] font-mono">Down</kbd> to navigate{" · "}
        <kbd className="px-1 py-0.5 rounded bg-muted text-[10px] font-mono">Enter</kbd> to use{" · "}
        <kbd className="px-1 py-0.5 rounded bg-muted text-[10px] font-mono">Escape</kbd> to dismiss
      </div>
    </CustomModal>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   Row layout — label + description on left, control on right
   ═══════════════════════════════════════════════════════════════════ */

function Row({
  label,
  desc,
  children,
}: {
  label: string;
  desc: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="flex flex-col sm:flex-row sm:items-center justify-between px-4 py-3.5 border-b gap-2 sm:gap-4"
      style={{ borderColor: "var(--border)" }}
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground leading-snug">{desc}</p>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}
