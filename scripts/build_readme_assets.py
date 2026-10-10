#!/usr/bin/env python3
"""
scripts/build_readme_assets.py
Generates all SVG, PNG, and preview assets for the Virasat README.
Reproducible, self-contained, no external URLs or fonts in SVGs.
All typography is converted to exact SVG path outlines using fontTools.
"""

import os
import sys
import math
import subprocess
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from PIL import Image, ImageDraw, ImageFont

ASSETS_DIR = os.path.abspath("docs/assets")
PREVIEW_DIR = os.path.join(ASSETS_DIR, "_preview")
SCREENS_DIR = os.path.join(ASSETS_DIR, "screens")
SCRIPTS_DIR = os.path.abspath("scripts")

FRAUNCES_PATH = os.path.join(SCRIPTS_DIR, "Fraunces-SemiBold.ttf")
INTER_PATH = os.path.join(SCRIPTS_DIR, "Inter-Regular.ttf")

os.makedirs(ASSETS_DIR, exist_ok=True)
os.makedirs(PREVIEW_DIR, exist_ok=True)
os.makedirs(SCREENS_DIR, exist_ok=True)

# Brand Palette
NAVY = "#0B1F3A"
DARK_BG = "#081528"
DARK_SURFACE = "#0E2442"
TEAL = "#14B8A6"
TEAL_LIGHT = "#2DD4BF"
GOLD = "#C9A227"
GOLD_LIGHT = "#EAB308"
SAND = "#F7F5F0"
SAND_DARK = "#EBE7DF"
TEXT_DARK = "#0F172A"
TEXT_LIGHT = "#F8FAFC"
MUTED_LIGHT = "#64748B"
MUTED_DARK = "#94A3B8"
CARD_LIGHT = "#FFFFFF"
CARD_DARK = "#102A4C"
BORDER_LIGHT = "#E2E8F0"
BORDER_DARK = "#1E3A5F"

def text_to_paths(text, font_path, font_size, x=0, y=0, fill=NAVY, letter_spacing=0):
    """Converts a text string to an SVG group of outlined <path> elements."""
    font = TTFont(font_path)
    cmap = font.getBestCmap()
    glyph_set = font.getGlyphSet()
    hmtx = font['hmtx']
    upm = font['head'].unitsPerEm
    scale = font_size / upm

    paths = []
    cursor = 0.0
    for ch in text:
        gid = cmap.get(ord(ch))
        if not gid:
            cursor += (font_size * 0.3) / scale
            continue
        adv, _ = hmtx[gid]
        pen = SVGPathPen(glyph_set)
        glyph_set[gid].draw(pen)
        d = pen.getCommands()
        if d:
            paths.append(f'    <path d="{d}" transform="translate({cursor:.1f}, 0)" />')
        cursor += adv + (letter_spacing / scale)

    total_width = cursor * scale
    svg_g = (
        f'  <g transform="translate({x:.1f}, {y:.1f}) scale({scale:.6f}, {-scale:.6f})" fill="{fill}">\n'
        + '\n'.join(paths)
        + '\n  </g>'
    )
    return svg_g, total_width

def get_logo_mark_markup(cx=60, cy=60, size=100, is_dark=False, animate=False):
    """
    Returns the abstract 'V' family-tree logo mark:
    - Gold root node at the bottom
    - Two teal branches rising to nodes at the top
    - Thin arc hinting at time (bi-temporal)
    """
    scale = size / 120.0
    gold_color = GOLD_LIGHT if is_dark else GOLD
    teal_color = TEAL_LIGHT if is_dark else TEAL
    arc_color = "#38BDF8" if is_dark else "#0EA5E9"
    node_fill = "#FFFFFF" if is_dark else "#FFFFFF"

    anim_draw = 'class="draw-branch"' if animate else ''
    anim_pulse_root = 'class="pulse-node-root"' if animate else ''
    anim_pulse_left = 'class="pulse-node-left"' if animate else ''
    anim_pulse_right = 'class="pulse-node-right"' if animate else ''
    anim_arc = 'class="orbit-arc"' if animate else ''

    # Coords relative to (0,0) with center at (60,60)
    # Root: (60, 96), Left: (24, 30), Right: (96, 30)
    markup = f"""
  <!-- Logo Mark (Abstract V Family Graph with Time Arc) -->
  <g transform="translate({cx - 60*scale:.1f}, {cy - 60*scale:.1f}) scale({scale:.4f})">
    <!-- Time Horizon Arc (Bi-temporal) -->
    <path {anim_arc} d="M 18,65 A 46,46 0 1,1 102,65" fill="none" stroke="{arc_color}" stroke-width="2.5" stroke-dasharray="4 4" stroke-opacity="0.75" />
    <circle cx="18" cy="65" r="2.5" fill="{arc_color}" opacity="0.8" />
    <circle cx="102" cy="65" r="2.5" fill="{arc_color}" opacity="0.8" />

    <!-- Left Branch (V leg) -->
    <path {anim_draw} d="M 60,94 C 54,78 36,54 26,32" fill="none" stroke="{teal_color}" stroke-width="4.5" stroke-linecap="round" />
    
    <!-- Right Branch (V leg) -->
    <path {anim_draw} d="M 60,94 C 66,78 84,54 94,32" fill="none" stroke="{teal_color}" stroke-width="4.5" stroke-linecap="round" />

    <!-- Connecting Inner Line (Generational bridge) -->
    <path d="M 44,60 C 52,66 68,66 76,60" fill="none" stroke="{gold_color}" stroke-width="2" stroke-dasharray="3 3" opacity="0.7" />

    <!-- Left Heir Node (Teal) -->
    <g {anim_pulse_left}>
      <circle cx="26" cy="32" r="9" fill="{teal_color}" />
      <circle cx="26" cy="32" r="5" fill="{node_fill}" />
    </g>

    <!-- Right Heir Node (Teal) -->
    <g {anim_pulse_right}>
      <circle cx="94" cy="32" r="9" fill="{teal_color}" />
      <circle cx="94" cy="32" r="5" fill="{node_fill}" />
    </g>

    <!-- Root Deceased / Ancestor Node (Gold) -->
    <g {anim_pulse_root}>
      <circle cx="60" cy="94" r="11" fill="{gold_color}" />
      <circle cx="60" cy="94" r="6" fill="{node_fill}" />
    </g>
  </g>
"""
    return markup

# ==============================================================================
# 1. LOGO & LOGO-MARK SVGs
# ==============================================================================
def build_logos():
    print("[1/6] Building logo and logo-mark SVGs...")
    for mode in ["light", "dark"]:
        is_dark = (mode == "dark")
        bg_fill = DARK_BG if is_dark else "none"
        text_fill = TEXT_LIGHT if is_dark else NAVY
        tagline_fill = MUTED_DARK if is_dark else MUTED_LIGHT

        # --- Logo Mark Only (120x120) ---
        mark_svg = f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120">
  <rect width="120" height="120" rx="24" fill="{DARK_SURFACE if is_dark else '#FFFFFF'}" stroke="{BORDER_DARK if is_dark else BORDER_LIGHT}" stroke-width="1.5" />
{get_logo_mark_markup(cx=60, cy=60, size=96, is_dark=is_dark)}
</svg>"""
        out_mark = os.path.join(ASSETS_DIR, f"logo-mark-{mode}.svg")
        with open(out_mark, "w", encoding="utf-8") as f:
            f.write(mark_svg)
        if mode == "light":
            with open(os.path.join(ASSETS_DIR, "logo-mark.svg"), "w", encoding="utf-8") as f:
                f.write(mark_svg)

        # --- Full Logo with Wordmark & Tagline (480x120) ---
        mark_snippet = get_logo_mark_markup(cx=60, cy=60, size=90, is_dark=is_dark)
        wordmark_paths, w_len = text_to_paths("Virasat", FRAUNCES_PATH, 46, x=125, y=65, fill=text_fill)
        tagline_paths, _ = text_to_paths("Every legacy, settled with care.", INTER_PATH, 14, x=128, y=90, fill=tagline_fill, letter_spacing=10)

        full_logo_svg = f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 460 120" width="460" height="120">
  <rect width="460" height="120" rx="16" fill="{bg_fill}" />
{mark_snippet}
{wordmark_paths}
{tagline_paths}
</svg>"""
        out_full = os.path.join(ASSETS_DIR, f"logo-{mode}.svg")
        with open(out_full, "w", encoding="utf-8") as f:
            f.write(full_logo_svg)
        if mode == "light":
            with open(os.path.join(ASSETS_DIR, "logo.svg"), "w", encoding="utf-8") as f:
                f.write(full_logo_svg)

# ==============================================================================
# 2. ANIMATED BANNERS (1200x360)
# ==============================================================================
def build_banners():
    print("[2/6] Building animated banner SVGs (1200x360)...")
    for mode in ["light", "dark"]:
        is_dark = (mode == "dark")
        bg_main = DARK_BG if is_dark else SAND
        bg_card = DARK_SURFACE if is_dark else "#FFFFFF"
        border_col = BORDER_DARK if is_dark else "#E2E8F0"
        title_fill = TEXT_LIGHT if is_dark else NAVY
        tagline_fill = TEAL_LIGHT if is_dark else TEAL
        sub_fill = MUTED_DARK if is_dark else MUTED_LIGHT
        badge_bg = "#13315C" if is_dark else "#E0F2FE"
        badge_text = "#38BDF8" if is_dark else "#0369A1"

        mark_snippet = get_logo_mark_markup(cx=140, cy=180, size=180, is_dark=is_dark, animate=True)
        title_paths, _ = text_to_paths("Virasat", FRAUNCES_PATH, 74, x=280, y=180, fill=title_fill)
        tagline_paths, _ = text_to_paths("Every legacy, settled with care.", INTER_PATH, 22, x=284, y=225, fill=tagline_fill, letter_spacing=20)
        desc_paths, _ = text_to_paths("Autonomous Estate Settlement • Bi-Temporal Knowledge Graph • Google Cloud BFSI 2026", INTER_PATH, 14, x=285, y=265, fill=sub_fill, letter_spacing=10)

        banner_svg = f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 360" width="1200" height="360">
  <defs>
    <linearGradient id="bannerBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="{bg_main}" />
      <stop offset="100%" stop-color="{DARK_SURFACE if is_dark else '#EAE6DC'}" />
    </linearGradient>
    <linearGradient id="glowG" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="{TEAL}" stop-opacity="0.3" />
      <stop offset="50%" stop-color="{GOLD}" stop-opacity="0.3" />
      <stop offset="100%" stop-color="{TEAL}" stop-opacity="0.3" />
    </linearGradient>
  </defs>

  <style>
    @keyframes drawPath {{
      0% {{ stroke-dashoffset: 160; opacity: 0; }}
      30% {{ opacity: 1; }}
      100% {{ stroke-dashoffset: 0; opacity: 1; }}
    }}
    @keyframes pulse {{
      0%, 100% {{ transform: scale(1); opacity: 0.95; }}
      50% {{ transform: scale(1.08); opacity: 1; filter: drop-shadow(0 0 6px {TEAL}); }}
    }}
    @keyframes pulseRoot {{
      0%, 100% {{ transform: scale(1); }}
      50% {{ transform: scale(1.12); filter: drop-shadow(0 0 8px {GOLD}); }}
    }}
    @keyframes orbit {{
      0% {{ transform: rotate(0deg); transform-origin: 60px 60px; }}
      100% {{ transform: rotate(360deg); transform-origin: 60px 60px; }}
    }}
    @keyframes fadeInTagline {{
      0%, 35% {{ opacity: 0; transform: translateY(6px); }}
      100% {{ opacity: 1; transform: translateY(0); }}
    }}
    @keyframes sweepGlow {{
      0% {{ stroke-dashoffset: 600; opacity: 0.2; }}
      50% {{ opacity: 0.8; }}
      100% {{ stroke-dashoffset: -600; opacity: 0.2; }}
    }}

    .draw-branch {{
      stroke-dasharray: 160;
      stroke-dashoffset: 160;
      animation: drawPath 2.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }}
    .pulse-node-left {{
      animation: pulse 3.5s ease-in-out infinite;
      transform-origin: 26px 32px;
    }}
    .pulse-node-right {{
      animation: pulse 3.5s ease-in-out infinite 0.7s;
      transform-origin: 94px 32px;
    }}
    .pulse-node-root {{
      animation: pulseRoot 3s ease-in-out infinite 0.3s;
      transform-origin: 60px 94px;
    }}
    .tagline-fade {{
      animation: fadeInTagline 2.5s ease-out forwards;
    }}
    .banner-border {{
      stroke-dasharray: 200 400;
      animation: sweepGlow 8s linear infinite;
    }}

    @media (prefers-reduced-motion: reduce) {{
      .draw-branch, .pulse-node-left, .pulse-node-right, .pulse-node-root, .tagline-fade, .banner-border {{
        animation: none !important;
        stroke-dashoffset: 0 !important;
        opacity: 1 !important;
      }}
    }}
  </style>

  <!-- Background Canvas -->
  <rect width="1200" height="360" rx="20" fill="url(#bannerBg)" stroke="{border_col}" stroke-width="2" />
  
  <!-- Subtle Grid Accent -->
  <g opacity="{ '0.08' if is_dark else '0.15' }">
    <line x1="280" y1="0" x2="280" y2="360" stroke="{TEAL}" stroke-width="1" />
    <line x1="940" y1="0" x2="940" y2="360" stroke="{GOLD}" stroke-width="1" />
    <line x1="0" y1="200" x2="1200" y2="200" stroke="{NAVY if not is_dark else '#38BDF8'}" stroke-width="0.7" stroke-dasharray="8 8" />
  </g>

  <!-- Glowing Accent Border -->
  <rect class="banner-border" x="2" y="2" width="1196" height="356" rx="18" fill="none" stroke="url(#glowG)" stroke-width="2.5" />

  <!-- Hackathon JAPAC 2026 Chip Top Right -->
  <g transform="translate(930, 36)">
    <rect width="230" height="36" rx="18" fill="{badge_bg}" stroke="{TEAL if is_dark else '#BAE6FD'}" stroke-width="1.2" />
    <circle cx="20" cy="18" r="6" fill="{TEAL}" />
    <text x="36" y="23" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="600" fill="{badge_text}" letter-spacing="0.5">AI BUILDER CUP • BFSI</text>
  </g>

  <!-- Main Logo Mark -->
{mark_snippet}

  <!-- Wordmark & Descriptions -->
{title_paths}
  <g class="tagline-fade">
{tagline_paths}
{desc_paths}
  </g>
</svg>"""

        out_banner = os.path.join(ASSETS_DIR, f"banner-{mode}.svg")
        with open(out_banner, "w", encoding="utf-8") as f:
            f.write(banner_svg)

# ==============================================================================
# 3. ANIMATED FLOW SVG (4 Steps with animateMotion dot)
# ==============================================================================
def build_flow():
    print("[3/6] Building animated flow.svg...")
    for mode in ["light", "dark"]:
        is_dark = (mode == "dark")
        bg_col = DARK_BG if is_dark else "#FFFFFF"
        card_bg = DARK_SURFACE if is_dark else SAND
        border_col = BORDER_DARK if is_dark else BORDER_LIGHT
        text_col = TEXT_LIGHT if is_dark else NAVY
        muted_col = MUTED_DARK if is_dark else MUTED_LIGHT

        steps = [
            ("01", "Upload Certificate", "Death certificate &amp; will ingestion", "Document AI + OCR"),
            ("02", "Discover Assets", "Demats, FDs, insurance, EPF, banks", "Multi-Agent Discovery"),
            ("03", "Verify Legal Heirs", "Succession law rule-engine graph", "Spanner Bi-Temporal Graph"),
            ("04", "Prepare &amp; Track", "Ready claim packets &amp; dispute flags", "Verified Institutions")
        ]

        # 4 cards placed horizontally across 1000px width
        cards_markup = []
        path_coords = []
        for i, (num, title, desc, tag) in enumerate(steps):
            x = 40 + i * 235
            y = 70
            cx = x + 105
            cy = y + 70
            path_coords.append(f"{cx},{cy}")

            cards_markup.append(f"""
    <!-- Step {num} Card -->
    <g transform="translate({x}, {y})">
      <rect width="210" height="150" rx="14" fill="{card_bg}" stroke="{border_col}" stroke-width="1.5" />
      <rect x="16" y="16" width="36" height="24" rx="6" fill="{TEAL}" fill-opacity="0.15" />
      <text x="25" y="33" font-family="-apple-system, sans-serif" font-size="12" font-weight="700" fill="{TEAL_LIGHT if is_dark else TEAL}">{num}</text>
      <text x="16" y="66" font-family="-apple-system, sans-serif" font-size="14" font-weight="700" fill="{text_col}">{title}</text>
      <text x="16" y="90" font-family="-apple-system, sans-serif" font-size="11" fill="{muted_col}">{desc}</text>
      <rect x="16" y="114" width="178" height="20" rx="4" fill="{'#13315C' if is_dark else '#E2E8F0'}" />
      <text x="24" y="128" font-family="-apple-system, sans-serif" font-size="10" font-weight="600" fill="{TEAL_LIGHT if is_dark else '#0369A1'}">{tag}</text>
    </g>""")

        motion_path = "M " + " L ".join(path_coords)

        flow_svg = f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 270" width="1000" height="270">
  <defs>
    <filter id="dotGlow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="3" result="blur" />
      <feMerge>
        <feMergeNode in="blur" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
  </defs>

  <style>
    @keyframes pulseStep {{
      0%, 100% {{ opacity: 0.3; }}
      50% {{ opacity: 1; }}
    }}
    .pipe-line {{
      stroke-dasharray: 6 6;
      animation: dashMove 12s linear infinite;
    }}
    @keyframes dashMove {{
      to {{ stroke-dashoffset: -120; }}
    }}
    @media (prefers-reduced-motion: reduce) {{
      .pipe-line {{ animation: none; }}
      circle.travel-dot {{ display: none; }}
    }}
  </style>

  <rect width="1000" height="270" rx="16" fill="{bg_col}" stroke="{border_col}" stroke-width="1.5" />

  <!-- Connecting Backbone Rail -->
  <path d="{motion_path}" fill="none" stroke="{border_col}" stroke-width="4" stroke-linecap="round" />
  <path class="pipe-line" d="{motion_path}" fill="none" stroke="{TEAL}" stroke-width="2.5" stroke-linecap="round" opacity="0.8" />

  <!-- Traveling Energy Bead -->
  <circle class="travel-dot" r="7" fill="{GOLD_LIGHT if is_dark else GOLD}" filter="url(#dotGlow)">
    <animateMotion path="{motion_path}" dur="6s" repeatCount="indefinite" />
  </circle>

  <!-- Step Cards -->
  {''.join(cards_markup)}
</svg>"""

        out_path = os.path.join(ASSETS_DIR, f"flow-{mode}.svg")
        with open(out_path, "w", encoding="utf-8") as f:
            f.write(flow_svg)
        if mode == "light":
            with open(os.path.join(ASSETS_DIR, "flow.svg"), "w", encoding="utf-8") as f:
                f.write(flow_svg)

# ==============================================================================
# 4. ANIMATED AGENTS SVG (6 Agents in Pipeline Order)
# ==============================================================================
def build_agents():
    print("[4/6] Building animated agents.svg...")
    for mode in ["light", "dark"]:
        is_dark = (mode == "dark")
        bg_col = DARK_BG if is_dark else "#FFFFFF"
        card_bg = DARK_SURFACE if is_dark else SAND
        border_col = BORDER_DARK if is_dark else BORDER_LIGHT
        text_col = TEXT_LIGHT if is_dark else NAVY
        muted_col = MUTED_DARK if is_dark else MUTED_LIGHT

        agents = [
            ("Orchestrator", "Task graph execution &amp; SSE event bus", 50, 100),
            ("Intake Agent", "Document AI OCR &amp; PII redaction", 210, 100),
            ("Asset Discovery", "Bank, demat, insurance, PF scan", 370, 100),
            ("Legal Eligibility", "Hindu &amp; Indian Succession Rules", 530, 100),
            ("Claims Packager", "Annexure, KYC &amp; institution packets", 690, 50),
            ("Fraud &amp; Dispute", "Conflict detection &amp; sanction scan", 690, 150)
        ]

        agent_boxes = []
        for name, role, x, y in agents:
            is_parallel = ("Packager" in name or "Fraud" in name)
            tag = "PARALLEL" if is_parallel else "STEP"
            agent_boxes.append(f"""
    <g transform="translate({x}, {y})">
      <rect width="145" height="74" rx="10" fill="{card_bg}" stroke="{border_col}" stroke-width="1.5" />
      <circle cx="16" cy="18" r="4" fill="{TEAL}" />
      <text x="26" y="22" font-family="-apple-system, sans-serif" font-size="11" font-weight="700" fill="{text_col}">{name}</text>
      <text x="14" y="42" font-family="-apple-system, sans-serif" font-size="9" fill="{muted_col}">{role[:28]}</text>
      <text x="14" y="55" font-family="-apple-system, sans-serif" font-size="9" fill="{muted_col}">{role[28:]}</text>
    </g>""")

        agents_svg = f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 880 250" width="880" height="250">
  <style>
    @keyframes flowGlow {{
      0% {{ stroke-dashoffset: 240; }}
      100% {{ stroke-dashoffset: 0; }}
    }}
    .flow-line {{
      stroke-dasharray: 8 8;
      animation: flowGlow 3s linear infinite;
    }}
    @media (prefers-reduced-motion: reduce) {{
      .flow-line {{ animation: none; }}
    }}
  </style>

  <rect width="880" height="250" rx="16" fill="{bg_col}" stroke="{border_col}" stroke-width="1.5" />

  <!-- Pipeline Connectors -->
  <!-- 1 -> 2 -->
  <line x1="195" y1="137" x2="210" y2="137" stroke="{TEAL}" stroke-width="2.5" class="flow-line" />
  <!-- 2 -> 3 -->
  <line x1="355" y1="137" x2="370" y2="137" stroke="{TEAL}" stroke-width="2.5" class="flow-line" />
  <!-- 3 -> 4 -->
  <line x1="515" y1="137" x2="530" y2="137" stroke="{TEAL}" stroke-width="2.5" class="flow-line" />
  <!-- 4 -> Parallel Branch (Packager & Dispute) -->
  <path d="M 675,137 C 682,137 685,87 690,87" fill="none" stroke="{TEAL}" stroke-width="2.5" class="flow-line" />
  <path d="M 675,137 C 682,137 685,187 690,187" fill="none" stroke="{GOLD}" stroke-width="2.5" class="flow-line" />

  <!-- Agent Cards -->
  {''.join(agent_boxes)}

  <!-- Title / Legend -->
  <text x="50" y="45" font-family="-apple-system, sans-serif" font-size="14" font-weight="700" fill="{text_col}">MULTI-AGENT WORKFLOW PIPELINE</text>
  <text x="50" y="65" font-family="-apple-system, sans-serif" font-size="11" fill="{muted_col}">Deterministic orchestration with dual verification and structured JSON audit trails</text>
</svg>"""

        out_path = os.path.join(ASSETS_DIR, f"agents-{mode}.svg")
        with open(out_path, "w", encoding="utf-8") as f:
            f.write(agents_svg)
        if mode == "light":
            with open(os.path.join(ASSETS_DIR, "agents.svg"), "w", encoding="utf-8") as f:
                f.write(agents_svg)

# ==============================================================================
# 5. ANIMATED TIMETRAVEL SVG (Bi-Temporal Knowledge Graph Slider)
# ==============================================================================
def build_timetravel():
    print("[5/6] Building animated timetravel.svg...")
    for mode in ["light", "dark"]:
        is_dark = (mode == "dark")
        bg_col = DARK_BG if is_dark else "#FFFFFF"
        card_bg = DARK_SURFACE if is_dark else SAND
        border_col = BORDER_DARK if is_dark else BORDER_LIGHT
        text_col = TEXT_LIGHT if is_dark else NAVY
        muted_col = MUTED_DARK if is_dark else MUTED_LIGHT

        timetravel_svg = f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 880 260" width="880" height="260">
  <defs>
    <filter id="sliderGlow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="3" result="blur" />
      <feMerge>
        <feMergeNode in="blur" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
  </defs>

  <style>
    @keyframes moveSlider {{
      0%, 45% {{ transform: translateX(0px); }}
      55%, 100% {{ transform: translateX(360px); }}
    }}
    @keyframes stateA {{
      0%, 45% {{ opacity: 1; }}
      55%, 100% {{ opacity: 0; }}
    }}
    @keyframes stateB {{
      0%, 45% {{ opacity: 0; }}
      55%, 100% {{ opacity: 1; }}
    }}
    .slider-handle {{
      animation: moveSlider 6s cubic-bezier(0.4, 0, 0.2, 1) infinite alternate;
    }}
    .state-a {{
      animation: stateA 6s cubic-bezier(0.4, 0, 0.2, 1) infinite alternate;
    }}
    .state-b {{
      animation: stateB 6s cubic-bezier(0.4, 0, 0.2, 1) infinite alternate;
    }}
    @media (prefers-reduced-motion: reduce) {{
      .slider-handle, .state-a, .state-b {{ animation: none; }}
      .state-b {{ opacity: 1; }}
    }}
  </style>

  <rect width="880" height="260" rx="16" fill="{bg_col}" stroke="{border_col}" stroke-width="1.5" />

  <text x="40" y="40" font-family="-apple-system, sans-serif" font-size="14" font-weight="700" fill="{text_col}">BI-TEMPORAL KNOWLEDGE GRAPH: TIME-TRAVEL DEMO</text>
  <text x="40" y="60" font-family="-apple-system, sans-serif" font-size="11" fill="{muted_col}">Valid Time (when event happened in reality) vs. Transaction Time (when Virasat recorded it)</text>

  <!-- Timeline Track -->
  <g transform="translate(140, 90)">
    <line x1="0" y1="20" x2="600" y2="20" stroke="{border_col}" stroke-width="6" stroke-linecap="round" />
    <circle cx="0" cy="20" r="7" fill="{TEAL}" />
    <circle cx="360" cy="20" r="7" fill="{GOLD}" />
    <circle cx="600" cy="20" r="7" fill="{border_col}" />

    <text x="-40" y="45" font-family="-apple-system, sans-serif" font-size="11" font-weight="600" fill="{text_col}">2021-04-12</text>
    <text x="-45" y="60" font-family="-apple-system, sans-serif" font-size="9" fill="{muted_col}">Nominee registered</text>

    <text x="320" y="45" font-family="-apple-system, sans-serif" font-size="11" font-weight="600" fill="{text_col}">2024-08-19</text>
    <text x="315" y="60" font-family="-apple-system, sans-serif" font-size="9" fill="{muted_col}">Codicil / Amendment</text>

    <!-- Animated Slider Thumb -->
    <g class="slider-handle">
      <circle cx="0" cy="20" r="14" fill="{TEAL_LIGHT if is_dark else TEAL}" filter="url(#sliderGlow)" />
      <circle cx="0" cy="20" r="6" fill="#FFFFFF" />
      <rect x="-35" y="-22" width="70" height="20" rx="4" fill="{CARD_DARK if is_dark else '#0F172A'}" />
      <text x="-25" y="-8" font-family="-apple-system, sans-serif" font-size="9" font-weight="700" fill="#FFFFFF">AS-OF READ</text>
    </g>
  </g>

  <!-- Live Edge Card State at Target Time -->
  <g transform="translate(140, 185)">
    <rect width="600" height="52" rx="10" fill="{card_bg}" stroke="{border_col}" stroke-width="1.5" />
    
    <!-- State A (Past: Sunita 100%) -->
    <g class="state-a">
      <circle cx="25" cy="26" r="6" fill="{TEAL}" />
      <text x="42" y="24" font-family="-apple-system, sans-serif" font-size="12" font-weight="700" fill="{text_col}">Asset: HDFC Mutual Fund (₹45,00,000)</text>
      <text x="42" y="40" font-family="-apple-system, sans-serif" font-size="11" fill="{TEAL_LIGHT if is_dark else TEAL}">Active Edge: Nominee → Sunita Sharma (100% Share)</text>
      <rect x="470" y="14" width="115" height="24" rx="6" fill="{TEAL}" fill-opacity="0.15" />
      <text x="480" y="30" font-family="-apple-system, sans-serif" font-size="10" font-weight="600" fill="{TEAL_LIGHT if is_dark else TEAL}">IMMUTABLE RECORD</text>
    </g>

    <!-- State B (Present: Sunita 50% + Vikram 50%) -->
    <g class="state-b">
      <circle cx="25" cy="26" r="6" fill="{GOLD}" />
      <text x="42" y="24" font-family="-apple-system, sans-serif" font-size="12" font-weight="700" fill="{text_col}">Asset: HDFC Mutual Fund (₹45,00,000)</text>
      <text x="42" y="40" font-family="-apple-system, sans-serif" font-size="11" fill="{GOLD_LIGHT if is_dark else GOLD}">Amended Edge: Nominee → Sunita (50%) • Vikram (50%)</text>
      <rect x="470" y="14" width="115" height="24" rx="6" fill="{GOLD}" fill-opacity="0.15" />
      <text x="480" y="30" font-family="-apple-system, sans-serif" font-size="10" font-weight="600" fill="{GOLD_LIGHT if is_dark else GOLD}">CLOSED &amp; REPLACED</text>
    </g>
  </g>
</svg>"""

        out_path = os.path.join(ASSETS_DIR, f"timetravel-{mode}.svg")
        with open(out_path, "w", encoding="utf-8") as f:
            f.write(timetravel_svg)
        if mode == "light":
            with open(os.path.join(ASSETS_DIR, "timetravel.svg"), "w", encoding="utf-8") as f:
                f.write(timetravel_svg)

# ==============================================================================
# 6. SOCIAL PREVIEW PNG (1280x640) & STATIC BANNER FALLBACKS
# ==============================================================================
def build_social_preview_and_pngs():
    print("[6/6] Generating social-preview.png and static banner PNG fallbacks...")
    # Social Preview (1280x640)
    w, h = 1280, 640
    img = Image.new("RGB", (w, h), color="#081528")
    draw = ImageDraw.Draw(img)

    # Gradient mesh / subtle circles
    for r in range(400, 50, -50):
        draw.ellipse([w//2 - r, h//2 - r, w//2 + r, h//2 + r], outline="#0B2545", width=2)

    # Accent lines
    draw.line([0, h - 8, w, h - 8], fill="#14B8A6", width=8)
    draw.line([0, h - 16, w//2, h - 16], fill="#C9A227", width=4)

    try:
        font_large = ImageFont.truetype(FRAUNCES_PATH, 92)
        font_sub = ImageFont.truetype(INTER_PATH, 28)
        font_meta = ImageFont.truetype(INTER_PATH, 18)
    except Exception:
        font_large = font_sub = font_meta = None

    # Title & Tagline
    draw.text((120, 180), "Virasat", fill="#FFFFFF", font=font_large)
    draw.text((120, 300), "Every legacy, settled with care.", fill="#14B8A6", font=font_sub)
    draw.text((120, 360), "Autonomous Estate Settlement Platform • Built for Indian Families", fill="#94A3B8", font=font_meta)
    draw.text((120, 400), "Google Cloud AI Builder Cup 2026 • Spanner Graph • Gemini • Cloud Run", fill="#38BDF8", font=font_meta)

    # Badges
    badges = ["VERTEX AI", "SPANNER GRAPH", "BI-TEMPORAL", "CLOUD RUN", "FIREBASE"]
    bx = 120
    for b in badges:
        draw.rectangle([bx, 480, bx + 150, 520], fill="#0E2442", outline="#1E3A5F", width=2)
        draw.text((bx + 18, 492), b, fill="#E2E8F0", font=font_meta)
        bx += 165

    soc_path = os.path.join(ASSETS_DIR, "social-preview.png")
    img.save(soc_path, optimize=True)
    print(f"Saved social-preview.png ({os.path.getsize(soc_path)} bytes)")

    # Static banner fallback PNGs (1200x360)
    for mode in ["light", "dark"]:
        bw, bh = 1200, 360
        b_img = Image.new("RGB", (bw, bh), color=("#081528" if mode == "dark" else "#F7F5F0"))
        b_draw = ImageDraw.Draw(b_img)
        b_draw.rectangle([0, 0, bw-1, bh-1], outline=("#1E3A5F" if mode == "dark" else "#E2E8F0"), width=3)
        b_draw.text((280, 100), "Virasat", fill=("#FFFFFF" if mode == "dark" else "#0B1F3A"), font=font_large)
        b_draw.text((284, 210), "Every legacy, settled with care.", fill="#14B8A6", font=font_sub)
        b_draw.text((285, 260), "Autonomous Estate Settlement • Bi-Temporal Knowledge Graph", fill=("#94A3B8" if mode == "dark" else "#64748B"), font=font_meta)
        b_path = os.path.join(ASSETS_DIR, f"banner-{mode}.png")
        b_img.save(b_path, optimize=True)
        print(f"Saved banner-{mode}.png ({os.path.getsize(b_path)} bytes)")

if __name__ == "__main__":
    build_logos()
    build_banners()
    build_flow()
    build_agents()
    build_timetravel()
    build_social_preview_and_pngs()
    print("All README assets built successfully!")
