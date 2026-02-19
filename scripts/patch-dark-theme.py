#!/usr/bin/env python3
"""
DevExtreme Fluent Blue Dark → Nanum Slate Dark theme patcher.

Reads the stock dark theme CSS, replaces neutral grays with slate-tinted colors,
and writes the result to src/styles/dx.fluent.nanum-dark.css.
"""

import re
import sys
from pathlib import Path
from collections import Counter

ROOT = Path(__file__).resolve().parent.parent
STOCK_CSS = ROOT / "node_modules/devextreme/dist/css/dx.fluent.blue.dark.compact.css"
OUTPUT_CSS = ROOT / "src/styles/dx.fluent.nanum-dark.css"

# ─────────────────────────────────────────────
# Color mapping: stock neutral grays → slate
# ─────────────────────────────────────────────
# Tailwind Slate palette reference:
#   50: #f8fafc   100: #f1f5f9   200: #e2e8f0   300: #cbd5e1
#   400: #94a3b8  500: #64748b   600: #475569    700: #334155
#   800: #1e293b  900: #0f172a   950: #020617

COLOR_MAP = {
    # --- Background layers (dark → light) ---
    "#000000": "#020617",   # pure black → slate-950 (deepest bg)
    "#141414": "#0c1425",   # near-black → between 950-900
    "#1f1f1f": "#0f172a",   # base dark bg → slate-900
    "#242424": "#142033",   # slightly lighter → between 900-800
    "#262626": "#162236",   # → between 900-800
    "#272727": "#172337",   # → between 900-800
    "#292929": "#1e293b",   # component bg → slate-800
    "#2a2a2a": "#1e293b",   # component bg variant → slate-800
    "#2b2b2b": "#1f2a3c",   # → near slate-800
    "#303030": "#233044",   # → between 800-700
    "#333333": "#263347",   # → between 800-700
    "#363636": "#283649",   # row/section bg → between 800-700

    # --- Hover / elevated surfaces ---
    "#3d3d3d": "#334155",   # hover bg → slate-700
    "#3b3b3b": "#2f3d51",   # → near slate-700
    "#404040": "#334155",   # hover bg variant → slate-700
    "#424242": "#354353",   # → near slate-700
    "#474747": "#3b4a5e",   # → between 700-600
    "#4a4a4a": "#3e4d61",   # → between 700-600
    "#4d4d4d": "#415064",   # → between 700-600

    # --- Border / separator ---
    "#515151": "#445167",   # → between 700-600
    "#525252": "#445167",   # → between 700-600
    "#555555": "#475569",   # border → slate-600
    "#5c5c5c": "#475569",   # border/separator → slate-600
    "#595959": "#475569",   # → slate-600
    "#616161": "#4b5e78",   # primary border → between 600-500
    "#666666": "#506580",   # → between 600-500
    "#6b6b6b": "#546985",   # → between 600-500
    "#6e6e6e": "#576c88",   # → between 600-500

    # --- Muted text / icons ---
    "#737373": "#64748b",   # muted text → slate-500
    "#757575": "#64748b",   # → slate-500
    "#7a7a7a": "#6b7c94",   # → near slate-500
    "#808080": "#708499",   # → between 500-400
    "#858585": "#7a8da0",   # → between 500-400
    "#8a8a8a": "#8493a5",   # → between 500-400
    "#8c8c8c": "#8796a8",   # → between 500-400
    "#999999": "#94a3b8",   # disabled/muted → slate-400
    "#9e9e9e": "#94a3b8",   # → slate-400

    # --- Secondary text ---
    "#a1a1a1": "#9baabd",   # → near slate-400
    "#a3a3a3": "#9eadc0",   # → between 400-300
    "#a6a6a6": "#a1b0c3",   # → between 400-300
    "#adadad": "#a8b6c8",   # secondary text → between 400-300
    "#b3b3b3": "#b0bdcd",   # → between 400-300
    "#b8b8b8": "#b8c4d2",   # → near slate-300
    "#bfbfbf": "#bfcad6",   # → near slate-300
    "#c2c2c2": "#c2cdd9",   # → near slate-300
    "#c4c4c4": "#c4cfdb",   # → near slate-300
    "#cccccc": "#cbd5e1",   # → slate-300

    # --- Primary text / headings ---
    "#d4d4d4": "#d3dbe5",   # → near slate-200
    "#d6d6d6": "#d5dde7",   # → near slate-200
    "#dbdbdb": "#dbe1ea",   # → near slate-200
    "#dedede": "#dee4ec",   # → near slate-200
    "#e0e0e0": "#e2e8f0",   # → slate-200
    "#e5e5e5": "#e5eaf1",   # → near slate-200
    "#e8e8e8": "#e8ecf3",   # → near slate-100/200
    "#ebebeb": "#ebeef4",   # → near slate-100
    "#f0f0f0": "#f1f5f9",   # → slate-100
    "#f5f5f5": "#f5f7fa",   # → near slate-50
}

# ─────────────────────────────────────────────
# Also handle rgb(...) format for common values
# ─────────────────────────────────────────────
RGB_MAP = {}

def hex_to_rgb_str(h: str) -> str:
    """Convert '#RRGGBB' to 'R,G,B' string."""
    r = int(h[1:3], 16)
    g = int(h[3:5], 16)
    b = int(h[5:7], 16)
    return f"{r},{g},{b}"

# Build RGB equivalents
for old_hex, new_hex in COLOR_MAP.items():
    old_rgb = hex_to_rgb_str(old_hex)
    new_rgb = hex_to_rgb_str(new_hex)
    RGB_MAP[old_rgb] = new_rgb


def replace_colors(css: str) -> str:
    """Replace hex and rgb color values."""
    count = Counter()

    # 1. Replace hex colors (case-insensitive, ensure word boundary)
    # Sort by length descending to avoid partial matches
    for old_hex, new_hex in sorted(COLOR_MAP.items(), key=lambda x: len(x[0]), reverse=True):
        pattern = re.compile(re.escape(old_hex), re.IGNORECASE)
        matches = pattern.findall(css)
        if matches:
            count[f"{old_hex} → {new_hex}"] = len(matches)
            css = pattern.sub(new_hex, css)

    # 2. Replace rgb(R,G,B) patterns (with optional spaces)
    for old_rgb, new_rgb in RGB_MAP.items():
        parts = old_rgb.split(",")
        # Match rgb(R, G, B) with flexible whitespace
        pattern = re.compile(
            rf"rgb\(\s*{parts[0]}\s*,\s*{parts[1]}\s*,\s*{parts[2]}\s*\)"
        )
        matches = pattern.findall(css)
        if matches:
            new_parts = new_rgb.split(",")
            replacement = f"rgb({new_parts[0]},{new_parts[1]},{new_parts[2]})"
            count[f"rgb({old_rgb}) → {replacement}"] = len(matches)
            css = pattern.sub(replacement, css)

    # 3. Replace rgba(R,G,B,A) patterns
    for old_rgb, new_rgb in RGB_MAP.items():
        parts = old_rgb.split(",")
        pattern = re.compile(
            rf"rgba\(\s*{parts[0]}\s*,\s*{parts[1]}\s*,\s*{parts[2]}\s*,\s*"
        )
        matches = pattern.findall(css)
        if matches:
            new_parts = new_rgb.split(",")
            replacement = f"rgba({new_parts[0]},{new_parts[1]},{new_parts[2]},"
            count[f"rgba({old_rgb},*) → rgba({new_rgb},*)"] = len(matches)
            css = pattern.sub(replacement, css)

    return css, count


def adjust_borders(css: str) -> str:
    """Make thick borders thinner: 2px → 1px for borders."""
    border_count = 0

    def replace_thick_border(m):
        nonlocal border_count
        border_count += 1
        return m.group(0).replace("2px", "1px")

    # Replace "border.*: 2px" patterns but NOT border-radius
    css = re.sub(
        r'border(?!-radius)[\w-]*\s*:\s*[^;]*?2px',
        replace_thick_border,
        css
    )

    print(f"  Border adjustments: {border_count} occurrences of 2px → 1px")
    return css


def main():
    if not STOCK_CSS.exists():
        print(f"ERROR: Stock CSS not found: {STOCK_CSS}")
        sys.exit(1)

    print(f"Reading stock dark theme: {STOCK_CSS}")
    css = STOCK_CSS.read_text(encoding="utf-8")
    original_size = len(css)

    print(f"  Size: {original_size:,} bytes")

    # Step 1: Color replacements
    print("\nReplacing colors...")
    css, counts = replace_colors(css)

    total_replacements = sum(counts.values())
    print(f"  Total color replacements: {total_replacements}")

    # Show top 15 replacements
    print("\n  Top replacements:")
    for key, c in sorted(counts.items(), key=lambda x: x[1], reverse=True)[:15]:
        print(f"    {c:4d}x  {key}")

    # Step 2: Border adjustments
    print("\nAdjusting borders...")
    css = adjust_borders(css)

    # Step 3: Fix font paths (icons/ → devextreme package path)
    print("\nFixing font paths...")
    # Vite resolves relative URLs from the CSS file location.
    # Our CSS is in src/styles/, but fonts live in node_modules/devextreme/dist/css/icons/
    # Use an absolute import path that Vite can resolve.
    font_count = css.count("icons/dxiconsfluent")
    css = css.replace(
        "icons/dxiconsfluent",
        "devextreme/dist/css/icons/dxiconsfluent"
    )
    print(f"  Fixed {font_count} font references")

    # Step 4: Add header comment
    header = """/* ==========================================================
 * DevExtreme Fluent Blue Dark — Nanum Slate Edition
 * Auto-generated by scripts/patch-dark-theme.py
 * Base: dx.fluent.blue.dark.compact.css
 * Changes: neutral grays → Tailwind Slate palette
 * ========================================================== */
"""
    css = header + css

    # Write output
    OUTPUT_CSS.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_CSS.write_text(css, encoding="utf-8")
    final_size = len(css)

    print(f"\nOutput: {OUTPUT_CSS}")
    print(f"  Size: {final_size:,} bytes ({final_size - original_size:+,} from header)")

    # Verify: check if any stock neutral grays remain
    print("\nVerification — remaining neutral grays:")
    remaining = Counter()
    for old_hex in COLOR_MAP:
        matches = re.findall(re.escape(old_hex), css, re.IGNORECASE)
        if matches:
            remaining[old_hex] = len(matches)

    if remaining:
        for h, c in sorted(remaining.items(), key=lambda x: x[1], reverse=True)[:10]:
            print(f"  WARNING: {h} still appears {c}x")
    else:
        print("  All neutral grays successfully replaced!")

    print("\nDone!")


if __name__ == "__main__":
    main()
