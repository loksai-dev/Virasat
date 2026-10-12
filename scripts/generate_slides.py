#!/usr/bin/env python3
"""
scripts/generate_slides.py
Renders high-resolution (1920x1080) brand graphics and slides for Virasat demo video.
Colors: Navy (#0B1F3A), Teal (#14B8A6), Gold (#C9A227), Sand (#F7F5F0).
Fonts: Fraunces serif and Inter sans.
Outputs slides in docs/submission/video/slides/ and thumbnail.png in docs/submission/video/.
"""

import os
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

SLIDES_DIR = Path("docs/submission/video/slides")
SLIDES_DIR.mkdir(parents=True, exist_ok=True)
OUTPUT_DIR = Path("docs/submission/video")

# Brand colors
NAVY = (11, 31, 58)          # #0B1F3A
NAVY_LIGHT = (19, 42, 74)    # #132A4A
TEAL = (20, 184, 166)        # #14B8A6
TEAL_MUTED = (15, 118, 110)  # #0F766E
GOLD = (201, 162, 39)        # #C9A227
SAND = (247, 245, 240)       # #F7F5F0
WHITE = (255, 255, 255)
SLATE_MUTED = (148, 163, 184)
CARD_BG = (17, 39, 68)
BORDER_TEAL = (20, 184, 166, 120)

FONT_SERIF = "scripts/Fraunces-SemiBold.ttf"
FONT_SANS = "scripts/Inter-Regular.ttf"

def get_font(path, size):
    try:
        return ImageFont.truetype(path, size)
    except Exception:
        return ImageFont.load_default()

def draw_header_badge(draw, text, y=100, font_sans=None):
    font = font_sans or get_font(FONT_SANS, 22)
    bbox = font.getbbox(text)
    w = bbox[2] - bbox[0] + 40
    h = 44
    x = (1920 - w) // 2
    # pill
    draw.rounded_rectangle([x, y, x + w, y + h], radius=22, fill=(20, 184, 166, 40), outline=TEAL, width=2)
    draw.text((x + 20, y + 8), text, font=font, fill=TEAL)

def create_title_slide():
    img = Image.new("RGB", (1920, 1080), NAVY)
    draw = ImageDraw.Draw(img)

    # Ambient gradient circles
    draw.ellipse([-100, -100, 600, 600], fill=(20, 184, 166, 25))
    draw.ellipse([1400, 500, 2100, 1200], fill=(201, 162, 39, 20))

    # Badge
    draw_header_badge(draw, "GOOGLE CLOUD AI BUILDER CUP 2026", y=180)

    # Main Brand Title
    f_title = get_font(FONT_SERIF, 110)
    title_text = "VIRASAT"
    bbox = f_title.getbbox(title_text)
    tw = bbox[2] - bbox[0]
    draw.text(((1920 - tw) // 2, 280), title_text, font=f_title, fill=WHITE)

    # Accent Line
    draw.rectangle([860, 440, 1060, 446], fill=GOLD)

    # Tagline
    f_tag = get_font(FONT_SERIF, 48)
    tag_text = "Every legacy, settled with care."
    bbox = f_tag.getbbox(tag_text)
    draw.text(((1920 - (bbox[2] - bbox[0])) // 2, 480), tag_text, font=f_tag, fill=TEAL)

    # Description
    f_desc = get_font(FONT_SANS, 28)
    desc_text = "India's First Autonomous Estate Settlement & Succession Mesh"
    bbox = f_desc.getbbox(desc_text)
    draw.text(((1920 - (bbox[2] - bbox[0])) // 2, 570), desc_text, font=f_desc, fill=SLATE_MUTED)

    # Key Pillars Bar at bottom
    pillars = [
        "Cloud Spanner Property Graph",
        "Vertex AI Gemini 2.5",
        "Deterministic Legal Rules Engine",
        "Bi-Temporal Audit Chains"
    ]
    bar_y = 740
    for i, p in enumerate(pillars):
        px = 160 + i * 410
        draw.rounded_rectangle([px, bar_y, px + 380, bar_y + 100], radius=16, fill=CARD_BG, outline=(30, 58, 95), width=2)
        pf = get_font(FONT_SANS, 20)
        p_bbox = pf.getbbox(p)
        draw.text((px + (380 - (p_bbox[2] - p_bbox[0])) // 2, bar_y + 36), p, font=pf, fill=WHITE)

    # Footer note
    f_foot = get_font(FONT_SANS, 20)
    foot_text = "Synthetic Demonstration Data • Simulated Gateways • Section 8 Hindu Succession Act, 1956"
    bbox = f_foot.getbbox(foot_text)
    draw.text(((1920 - (bbox[2] - bbox[0])) // 2, 980), foot_text, font=f_foot, fill=(100, 116, 139))

    img.save(SLIDES_DIR / "slide_title.png")
    print("Saved slide_title.png")

def create_problem_slide():
    img = Image.new("RGB", (1920, 1080), NAVY)
    draw = ImageDraw.Draw(img)

    draw_header_badge(draw, "THE PROBLEM • THE UNCLAIMED INHERITANCE CRISIS", y=90)

    f_title = get_font(FONT_SERIF, 64)
    t = "When a loved one passes away, families face chaos."
    bbox = f_title.getbbox(t)
    draw.text(((1920 - (bbox[2] - bbox[0])) // 2, 160), t, font=f_title, fill=WHITE)

    f_sub = get_font(FONT_SANS, 26)
    sub = "Fragmented banking records, missing demat folios, and months of administrative friction."
    bbox = f_sub.getbbox(sub)
    draw.text(((1920 - (bbox[2] - bbox[0])) // 2, 250), sub, font=f_sub, fill=SLATE_MUTED)

    # 3 Large Metric Cards
    metrics = [
        {"num": "₹1.8 Lakh Cr", "label": "Unclaimed Assets", "detail": "Sitting idle across Indian banks, insurance policies, mutual funds, and EPFO pension folios."},
        {"num": "12,000+", "label": "Financial Institutions", "detail": "Each requiring bespoke claim forms, indemnity bonds, gazette notices, and legal affidavits."},
        {"num": "280+ Days", "label": "Average Settlement", "detail": "Families endure painful, opaque probate cycles while grieving their loved ones."}
    ]

    card_y = 310
    card_w = 480
    card_h = 410
    for i, m in enumerate(metrics):
        cx = 160 + i * (card_w + 50)
        draw.rounded_rectangle([cx, card_y, cx + card_w, card_y + card_h], radius=24, fill=CARD_BG, outline=GOLD if i == 0 else (30, 58, 95), width=2)
        
        # Num
        f_num = get_font(FONT_SERIF, 54)
        draw.text((cx + 40, card_y + 40), m["num"], font=f_num, fill=GOLD if i == 0 else TEAL)
        
        # Label
        f_lbl = get_font(FONT_SANS, 24)
        draw.text((cx + 40, card_y + 115), m["label"], font=f_lbl, fill=WHITE)
        
        draw.line([cx + 40, card_y + 165, cx + card_w - 40, card_y + 165], fill=(30, 58, 95), width=2)
        
        # Detail
        f_det = get_font(FONT_SANS, 21)
        words = m["detail"].split()
        lines = []
        cur = []
        for w in words:
            cur.append(w)
            if len(" ".join(cur)) > 30:
                lines.append(" ".join(cur))
                cur = []
        if cur:
            lines.append(" ".join(cur))
        
        ly = card_y + 195
        for l in lines:
            draw.text((cx + 40, ly), l, font=f_det, fill=SLATE_MUTED)
            ly += 32

    # Bottom contrast line (shifted up to y=750 to leave room for subtitles at y=850+)
    draw.rounded_rectangle([160, 750, 1760, 850], radius=16, fill=(20, 184, 166, 30), outline=TEAL, width=2)
    f_call = get_font(FONT_SERIF, 28)
    c_text = "Virasat reduces settlement from 280+ days to under 45 minutes with autonomous agents."
    c_bbox = f_call.getbbox(c_text)
    draw.text(((1920 - (c_bbox[2] - c_bbox[0])) // 2, 785), c_text, font=f_call, fill=WHITE)

    img.save(SLIDES_DIR / "slide_problem.png")
    print("Saved slide_problem.png")

def create_architecture_slide():
    img = Image.new("RGB", (1920, 1080), NAVY)
    draw = ImageDraw.Draw(img)

    draw_header_badge(draw, "UNDER THE HOOD • GOOGLE CLOUD ARCHITECTURE", y=45)

    f_title = get_font(FONT_SERIF, 44)
    t = "Production Multi-Agent Mesh on Google Cloud"
    bbox = f_title.getbbox(t)
    draw.text(((1920 - (bbox[2] - bbox[0])) // 2, 105), t, font=f_title, fill=WHITE)

    # Load architecture diagram
    arch_path = Path("docs/submission/diagrams/architecture.png")
    if arch_path.exists():
        arch_img = Image.open(arch_path)
        arch_img.thumbnail((1550, 620), Image.Resampling.LANCZOS)
        ax = (1920 - arch_img.width) // 2
        ay = 175
        draw.rounded_rectangle([ax - 10, ay - 10, ax + arch_img.width + 10, ay + arch_img.height + 10], radius=16, fill=(15, 30, 55), outline=TEAL, width=2)
        img.paste(arch_img, (ax, ay))

    # Bottom tech stack pills (shifted up to y=815)
    techs = [
        "Google Cloud Spanner (Graph & Relational)",
        "Vertex AI Gemini 2.5 Pro & Flash",
        "Text-Embedding-005 (GraphRAG)",
        "Google Cloud Run (FastAPI Backend)",
        "Firebase Auth & Hosting"
    ]
    f_tech = get_font(FONT_SANS, 17)
    tx_start = 120
    ty = 815
    for i, tech in enumerate(techs):
        bx = tx_start + i * 340
        draw.rounded_rectangle([bx, ty, bx + 320, ty + 50], radius=12, fill=CARD_BG, outline=(30, 58, 95), width=2)
        draw.text((bx + 15, ty + 15), tech, font=f_tech, fill=TEAL)

    img.save(SLIDES_DIR / "slide_architecture.png")
    print("Saved slide_architecture.png")

def create_guardrails_slide():
    img = Image.new("RGB", (1920, 1080), NAVY)
    draw = ImageDraw.Draw(img)

    draw_header_badge(draw, "ENGINEERING PRINCIPLES • ENTERPRISE SAFETY", y=65)

    f_title = get_font(FONT_SERIF, 54)
    t = "Zero LLM Arithmetic. Statutory Mathematical Proof."
    bbox = f_title.getbbox(t)
    draw.text(((1920 - (bbox[2] - bbox[0])) // 2, 135), t, font=f_title, fill=WHITE)

    pillars = [
        {
            "num": "01",
            "title": "Deterministic Rules Engine",
            "sub": "Never LLM Math",
            "body": "Legal heir shares under Section 8, 9, and 10 of the Hindu Succession Act are computed strictly via deterministic code engines with exact mathematical fraction reduction (1/3, 1/4). Zero LLM hallucinations."
        },
        {
            "num": "02",
            "title": "Grounded Statutory Citations",
            "sub": "Every Claim Verified",
            "body": "Every legal explanation links directly to statutory clauses, case law precedents, and uploaded documents. Gemini 2.5 Pro acts as an evaluator, verifying clauses against Spanner relational records."
        },
        {
            "num": "03",
            "title": "Bi-Temporal Audit Trails",
            "sub": "Immutable SHA-256 Chains",
            "body": "Spanner records valid time (when events happened in the real world) versus transaction time (when Virasat ingested them). Every estate modification is sealed in cryptographic hash chains."
        }
    ]

    card_y = 230
    card_w = 480
    card_h = 500
    for i, p in enumerate(pillars):
        cx = 160 + i * (card_w + 50)
        draw.rounded_rectangle([cx, card_y, cx + card_w, card_y + card_h], radius=24, fill=CARD_BG, outline=TEAL if i == 0 else (30, 58, 95), width=2)
        
        # Pill
        f_num = get_font(FONT_SERIF, 36)
        draw.text((cx + 40, card_y + 35), p["num"], font=f_num, fill=GOLD)
        
        f_t = get_font(FONT_SERIF, 26)
        draw.text((cx + 40, card_y + 90), p["title"], font=f_t, fill=WHITE)
        
        f_sub = get_font(FONT_SANS, 18)
        draw.text((cx + 40, card_y + 135), p["sub"], font=f_sub, fill=TEAL)
        
        draw.line([cx + 40, card_y + 175, cx + card_w - 40, card_y + 175], fill=(30, 58, 95), width=2)
        
        # Body text wrapping
        f_body = get_font(FONT_SANS, 19)
        words = p["body"].split()
        lines = []
        cur = []
        for w in words:
            cur.append(w)
            if len(" ".join(cur)) > 30:
                lines.append(" ".join(cur))
                cur = []
        if cur:
            lines.append(" ".join(cur))
        
        by = card_y + 200
        for l in lines:
            draw.text((cx + 40, by), l, font=f_body, fill=SLATE_MUTED)
            by += 30

    # Bottom summary banner (shifted up to y=760)
    draw.rounded_rectangle([160, 760, 1760, 840], radius=16, fill=(19, 42, 74), outline=GOLD, width=2)
    f_ban = get_font(FONT_SERIF, 24)
    ban_text = "Cryptographic integrity meets statutory compliance — court-admissible settlement dockets."
    b_bbox = f_ban.getbbox(ban_text)
    draw.text(((1920 - (b_bbox[2] - b_bbox[0])) // 2, 790), ban_text, font=f_ban, fill=WHITE)

    img.save(SLIDES_DIR / "slide_guardrails.png")
    print("Saved slide_guardrails.png")

def create_eval_slide():
    img = Image.new("RGB", (1920, 1080), NAVY)
    draw = ImageDraw.Draw(img)

    draw_header_badge(draw, "EMPIRICAL EVALUATION • PRODUCTION BENCHMARKS", y=65)

    f_title = get_font(FONT_SERIF, 54)
    t = "Rigorous Legal Benchmarks from backend/eval/report.md"
    bbox = f_title.getbbox(t)
    draw.text(((1920 - (bbox[2] - bbox[0])) // 2, 135), t, font=f_title, fill=WHITE)

    metrics = [
        {
            "stat": "100%",
            "label": "Golden Share Accuracy",
            "desc": "30 / 30 golden succession cases verified across Hindu, Muslim, Parsi, and Christian statutory rules with 0 arithmetic defects."
        },
        {
            "stat": "100%",
            "label": "Defect & Fraud Recall",
            "desc": "10 / 10 planted defects caught: unnotarized memos, timeline contradictions, forged signatures, and predeceased heir exclusions."
        },
        {
            "stat": "$0.015",
            "label": "Cost per Estate Run",
            "desc": "₹1.3 per full pipeline execution utilizing Vertex AI Gemini 2.5 Flash token caching and deterministic local solvers."
        },
        {
            "stat": "15.1s",
            "label": "p50 Execution Latency",
            "desc": "6 autonomous agents orchestrating intake, asset discovery, kinship graph, legal shares, claims, and fraud shield."
        }
    ]

    card_y = 230
    card_w = 360
    card_h = 500
    for i, m in enumerate(metrics):
        cx = 150 + i * (card_w + 35)
        draw.rounded_rectangle([cx, card_y, cx + card_w, card_y + card_h], radius=24, fill=CARD_BG, outline=GOLD if i < 2 else TEAL, width=2)
        
        f_s = get_font(FONT_SERIF, 56)
        draw.text((cx + 35, card_y + 35), m["stat"], font=f_s, fill=GOLD if i < 2 else TEAL)
        
        f_l = get_font(FONT_SANS, 22)
        draw.text((cx + 35, card_y + 115), m["label"], font=f_l, fill=WHITE)
        
        draw.line([cx + 35, card_y + 160, cx + card_w - 35, card_y + 160], fill=(30, 58, 95), width=2)
        
        f_d = get_font(FONT_SANS, 19)
        words = m["desc"].split()
        lines = []
        cur = []
        for w in words:
            cur.append(w)
            if len(" ".join(cur)) > 24:
                lines.append(" ".join(cur))
                cur = []
        if cur:
            lines.append(" ".join(cur))
        
        dy = card_y + 185
        for l in lines:
            draw.text((cx + 35, dy), l, font=f_d, fill=SLATE_MUTED)
            dy += 28

    # Bottom line (shifted up to y=760)
    draw.rounded_rectangle([150, 760, 1770, 840], radius=16, fill=(19, 42, 74), outline=(30, 58, 95), width=2)
    f_bot = get_font(FONT_SANS, 20)
    b_text = "Business Model: B2B SaaS for Banks & Insurers • Free Tier for Indian Citizens • ₹0 Out-of-pocket for Families"
    b_bbox = f_bot.getbbox(b_text)
    draw.text(((1920 - (b_bbox[2] - b_bbox[0])) // 2, 795), b_text, font=f_bot, fill=SAND)

    img.save(SLIDES_DIR / "slide_eval.png")
    print("Saved slide_eval.png")

def create_end_slide():
    img = Image.new("RGB", (1920, 1080), NAVY)
    draw = ImageDraw.Draw(img)

    draw_header_badge(draw, "EXPERIENCE THE LIVE PLATFORM TODAY", y=90)

    f_title = get_font(FONT_SERIF, 90)
    draw.text(((1920 - f_title.getbbox("VIRASAT")[2] + f_title.getbbox("VIRASAT")[0]) // 2, 170), "VIRASAT", font=f_title, fill=WHITE)

    f_tag = get_font(FONT_SERIF, 40)
    t = "Every legacy, settled with care."
    bbox = f_tag.getbbox(t)
    draw.text(((1920 - (bbox[2] - bbox[0])) // 2, 290), t, font=f_tag, fill=TEAL)

    # Box for Live Links (shifted up to y=380)
    box_w = 900
    box_h = 220
    bx = (1920 - box_w) // 2
    by = 380
    draw.rounded_rectangle([bx, by, bx + box_w, by + box_h], radius=24, fill=CARD_BG, outline=GOLD, width=3)

    f_url_lbl = get_font(FONT_SANS, 20)
    draw.text((bx + 50, by + 30), "LIVE HOSTING URL", font=f_url_lbl, fill=GOLD)
    f_url = get_font(FONT_SERIF, 36)
    draw.text((bx + 50, by + 65), "https://virasat-511210.web.app", font=f_url, fill=WHITE)

    f_git_lbl = get_font(FONT_SANS, 18)
    draw.text((bx + 50, by + 125), "OPEN SOURCE CODEBASE", font=f_git_lbl, fill=SLATE_MUTED)
    f_git = get_font(FONT_SANS, 24)
    draw.text((bx + 50, by + 155), "https://github.com/loksai-dev/Virasat", font=f_git, fill=TEAL)

    # Responsible Use Notice (at y=640 and y=675)
    f_resp = get_font(FONT_SANS, 19)
    r_text = "Responsible Use: Virasat provides legal-tech decision support, not binding judicial advice."
    bbox = f_resp.getbbox(r_text)
    draw.text(((1920 - (bbox[2] - bbox[0])) // 2, 640), r_text, font=f_resp, fill=SLATE_MUTED)

    r_text2 = "All case names, folio numbers, and KYC assets demonstrated are realistic synthetic simulations."
    bbox2 = f_resp.getbbox(r_text2)
    draw.text(((1920 - (bbox2[2] - bbox2[0])) // 2, 675), r_text2, font=f_resp, fill=(100, 116, 139))

    # Built with Google Cloud Badge (at y=740)
    f_team = get_font(FONT_SANS, 20)
    team = "Team Virasat • Google AI Builder Cup 2026"
    draw.text(((1920 - f_team.getbbox(team)[2] + f_team.getbbox(team)[0]) // 2, 740), team, font=f_team, fill=SAND)

    img.save(SLIDES_DIR / "slide_end.png")
    print("Saved slide_end.png")

def create_thumbnail():
    # 1280 x 720 YouTube Thumbnail
    img = Image.new("RGB", (1280, 720), NAVY)
    draw = ImageDraw.Draw(img)

    # Ambient glow
    draw.ellipse([-50, -50, 450, 450], fill=(20, 184, 166, 40))
    draw.ellipse([900, 300, 1400, 800], fill=(201, 162, 39, 30))

    # Pill
    f_badge = get_font(FONT_SANS, 18)
    draw.rounded_rectangle([70, 70, 440, 115], radius=22, fill=(20, 184, 166, 40), outline=TEAL, width=2)
    draw.text((90, 80), "AI BUILDER CUP 2026", font=f_badge, fill=TEAL)

    # Big Title
    f_t = get_font(FONT_SERIF, 90)
    draw.text((70, 150), "VIRASAT", font=f_t, fill=WHITE)

    f_sub = get_font(FONT_SERIF, 36)
    draw.text((70, 260), "Autonomous Estate Settlement Mesh", font=f_sub, fill=GOLD)

    f_tag = get_font(FONT_SANS, 22)
    draw.text((70, 330), "Every legacy, settled with care.", font=f_tag, fill=SAND)

    # 3 highlight badges
    badges = [
        "100% Deterministic Share Math",
        "Spanner Bi-Temporal Graph",
        "Live Demo: virasat-511210.web.app"
    ]
    f_b = get_font(FONT_SANS, 18)
    for i, b in enumerate(badges):
        by = 410 + i * 65
        draw.rounded_rectangle([70, by, 540, by + 50], radius=12, fill=CARD_BG, outline=TEAL if i==0 else (30, 58, 95), width=2)
        draw.text((95, by + 14), b, font=f_b, fill=WHITE)

    # Right side graphic / stat box
    draw.rounded_rectangle([680, 140, 1200, 600], radius=24, fill=CARD_BG, outline=GOLD, width=3)
    f_sb_t = get_font(FONT_SERIF, 32)
    draw.text((720, 180), "Production Evaluation", font=f_sb_t, fill=GOLD)

    stats = [
        ("100%", "Golden Case Accuracy (30/30)"),
        ("100%", "Defect & Fraud Recall (10/10)"),
        ("$0.015", "Execution Cost per Estate (₹1.3)"),
        ("45 Days", "Estimated Settlement vs 280 Baseline")
    ]
    f_val = get_font(FONT_SERIF, 34)
    f_lbl = get_font(FONT_SANS, 16)
    for i, (val, lbl) in enumerate(stats):
        sy = 250 + i * 80
        draw.text((720, sy), val, font=f_val, fill=TEAL)
        draw.text((860, sy + 8), lbl, font=f_lbl, fill=SLATE_MUTED)

    thumb_path = OUTPUT_DIR / "thumbnail.png"
    img.save(thumb_path)
    print(f"Saved thumbnail.png to {thumb_path}")

def main():
    print("=" * 60)
    print(" Generating Video Slides & Thumbnail")
    print("=" * 60)
    create_title_slide()
    create_problem_slide()
    create_architecture_slide()
    create_guardrails_slide()
    create_eval_slide()
    create_end_slide()
    create_thumbnail()
    print("All slides and thumbnail generated successfully!")

if __name__ == "__main__":
    main()
