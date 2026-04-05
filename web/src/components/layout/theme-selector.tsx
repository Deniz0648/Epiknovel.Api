"use client";

import { Fragment, type MouseEvent as ReactMouseEvent, useEffect, useRef, useState } from "react";
import { Check, Palette } from "lucide-react";
import { dispatchHeaderOverlayOpen, getHeaderOverlayEventName } from "@/lib/header-overlays";

const PRIORITY_THEMES = ["light", "dark"] as const;
const LIGHT_THEMES = [
  "acid",
  "autumn",
  "bumblebee",
  "caramellatte",
  "cmyk",
  "corporate",
  "cupcake",
  "cyberpunk",
  "emerald",
  "fantasy",
  "garden",
  "lemonade",
  "lofi",
  "nord",
  "pastel",
  "retro",
  "silk",
  "valentine",
  "winter",
  "wireframe",
] as const;
const DARK_THEMES = [
  "abyss",
  "aqua",
  "black",
  "business",
  "coffee",
  "dim",
  "dracula",
  "forest",
  "halloween",
  "luxury",
  "night",
  "sunset",
  "synthwave",
] as const;

const THEMES = [...PRIORITY_THEMES, ...LIGHT_THEMES, ...DARK_THEMES] as const;
type ThemeName = (typeof THEMES)[number];
const THEME_GROUPS = [
  { title: "Temel", themes: PRIORITY_THEMES },
  { title: "Acik Temalar", themes: LIGHT_THEMES },
  { title: "Koyu Temalar", themes: DARK_THEMES },
] as const;

function isThemeName(value: string | null): value is ThemeName {
  return value !== null && (THEMES as readonly string[]).includes(value);
}

function formatThemeLabel(themeName: ThemeName) {
  return themeName.charAt(0).toUpperCase() + themeName.slice(1);
}

function ThemePaletteBadge({
  themeName,
  className = "h-8 w-8",
}: {
  themeName: ThemeName;
  className?: string;
}) {
  return (
    <span
      data-theme={themeName}
      className={`relative inline-flex items-center justify-center overflow-hidden rounded-full border ${className}`}
      style={{
        borderColor: "color-mix(in oklab, var(--color-base-content) 16%, transparent)",
        backgroundColor: "var(--color-base-200)",
      }}
      aria-hidden="true"
    >
      <span
        className="relative inline-flex items-center gap-1 rounded-full px-1.5 py-1"
        style={{
          backgroundColor:
            "color-mix(in oklab, var(--color-base-100) 84%, transparent)",
        }}
      >
        <span
          className="h-1.5 w-1.5 rounded-full"
          style={{ backgroundColor: "var(--color-primary)" }}
        />
        <span
          className="h-1.5 w-1.5 rounded-full"
          style={{ backgroundColor: "var(--color-secondary)" }}
        />
        <span
          className="h-1.5 w-1.5 rounded-full"
          style={{ backgroundColor: "var(--color-accent)" }}
        />
      </span>
    </span>
  );
}

export function ThemeSelector() {
  const detailsRef = useRef<HTMLDetailsElement | null>(null);
  const [theme, setTheme] = useState<ThemeName>("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const storedTheme = window.localStorage.getItem("theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const fallbackTheme: ThemeName = prefersDark ? "dark" : "light";

    if (isThemeName(storedTheme)) {
      setTheme(storedTheme);
    } else {
      setTheme(fallbackTheme);
    }
  }, []);

  useEffect(() => {
    if (!mounted) return;
    document.documentElement.setAttribute("data-theme", theme);
    window.localStorage.setItem("theme", theme);
  }, [theme, mounted]);

  useEffect(() => {
    function closeDropdown() {
      if (detailsRef.current?.open) {
        detailsRef.current.open = false;
      }
    }

    function closeOnOutsidePointer(event: Event) {
      if (!detailsRef.current?.open) {
        return;
      }
      const target = event.target;
      if (target instanceof Node && !detailsRef.current.contains(target)) {
        closeDropdown();
      }
    }

    function closeOnOutsideFocus(event: FocusEvent) {
      if (!detailsRef.current?.open) {
        return;
      }
      const target = event.target;
      if (target instanceof Node && !detailsRef.current.contains(target)) {
        closeDropdown();
      }
    }

    function closeOnScroll(event: Event) {
      if (!detailsRef.current?.open) {
        return;
      }
      const target = event.target;
      if (target instanceof Node && detailsRef.current.contains(target)) {
        return;
      }
      closeDropdown();
    }

    function closeOnWheel(event: WheelEvent) {
      if (!detailsRef.current?.open) {
        return;
      }
      const target = event.target;
      if (target instanceof Node && detailsRef.current.contains(target)) {
        return;
      }
      closeDropdown();
    }

    window.addEventListener("mousedown", closeOnOutsidePointer);
    window.addEventListener("touchstart", closeOnOutsidePointer, { passive: true });
    window.addEventListener("focusin", closeOnOutsideFocus);
    document.addEventListener("scroll", closeOnScroll, true);
    window.addEventListener("wheel", closeOnWheel, { passive: true });

    return () => {
      window.removeEventListener("mousedown", closeOnOutsidePointer);
      window.removeEventListener("touchstart", closeOnOutsidePointer);
      window.removeEventListener("focusin", closeOnOutsideFocus);
      document.removeEventListener("scroll", closeOnScroll, true);
      window.removeEventListener("wheel", closeOnWheel);
    };
  }, []);

  useEffect(() => {
    function closeWhenAnotherOverlayOpens(event: Event) {
      const customEvent = event as CustomEvent<string>;
      if (customEvent.detail !== "theme" && detailsRef.current?.open) {
        detailsRef.current.open = false;
      }
    }

    window.addEventListener(getHeaderOverlayEventName(), closeWhenAnotherOverlayOpens);
    return () => {
      window.removeEventListener(getHeaderOverlayEventName(), closeWhenAnotherOverlayOpens);
    };
  }, []);

  function handleThemeSelect(nextTheme: ThemeName, event: ReactMouseEvent<HTMLButtonElement>) {
    setTheme(nextTheme);

    const details = event.currentTarget.closest("details");
    if (details instanceof HTMLDetailsElement) {
      details.open = false;
    }
  }

  return (
    <details ref={detailsRef} className="dropdown dropdown-end">
      <summary
        aria-label="Tema sec"
        onClick={() => {
          const willOpen = !detailsRef.current?.open;
          if (willOpen) {
            dispatchHeaderOverlayOpen("theme");
          }
        }}
        className="inline-flex h-10 w-10 list-none cursor-pointer items-center justify-center rounded-2xl border border-base-content/14 bg-base-100/26 text-base-content/78 transition-all duration-200 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35"
      >
        <Palette strokeWidth={1.9} className="h-4.5 w-4.5" aria-hidden="true" />
        <span className="sr-only" suppressHydrationWarning>
          Tema sec: {formatThemeLabel(theme)}
        </span>
      </summary>

      <div className="glass-frame glass-dropdown dropdown-content z-[70] mt-3 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-[1.8rem] border border-base-content/14 bg-base-100/92 p-2 shadow-2xl max-sm:fixed max-sm:left-4 max-sm:right-4 max-sm:top-[5.25rem] max-sm:mt-0 max-sm:w-auto">
        <div className="mb-2 flex items-center justify-between gap-3 rounded-2xl border border-base-content/10 bg-base-100/38 px-3.5 py-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.14em] text-base-content/48">Tema</p>
            <p className="mt-1 text-sm font-semibold text-base-content/72">
              {formatThemeLabel(theme)}
            </p>
          </div>
          <ThemePaletteBadge themeName={theme} className="h-10 w-10" />
        </div>
        <ul className="overlay-scroll-region menu block max-h-[22rem] w-full overflow-y-auto p-0 max-sm:max-h-[62vh]">
        {THEME_GROUPS.map((group) => (
          <Fragment key={group.title}>
            <li className="menu-title px-2 pb-1 pt-2 text-[11px] uppercase tracking-[0.15em] text-base-content/50">
              {group.title}
            </li>

            {group.themes.map((themeName) => {
              const isActive = theme === themeName;

              return (
                <li key={themeName}>
                  <button
                    type="button"
                    onClick={(event) => handleThemeSelect(themeName, event)}
                    className={`flex items-center gap-3 rounded-xl px-2.5 py-2.5 text-left ${
                      isActive ? "bg-primary/14" : "hover:bg-base-content/6"
                    }`}
                  >
                    <ThemePaletteBadge themeName={themeName} />
                    <span className="flex-1 text-sm font-medium text-base-content">
                      {formatThemeLabel(themeName)}
                    </span>
                    {isActive ? (
                      <Check className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                    ) : null}
                  </button>
                </li>
              );
            })}
          </Fragment>
        ))}
        </ul>
      </div>
    </details>
  );
}
