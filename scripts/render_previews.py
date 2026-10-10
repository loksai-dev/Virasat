#!/usr/bin/env python3
"""
scripts/render_previews.py
Renders all SVG assets in docs/assets/ to PNG previews in docs/assets/_preview/
using headless Chromium (Chrome or Edge).
"""

import os
import sys
import glob
import subprocess
import shutil

ASSETS_DIR = os.path.abspath("docs/assets")
PREVIEW_DIR = os.path.join(ASSETS_DIR, "_preview")
os.makedirs(PREVIEW_DIR, exist_ok=True)

CHROME_PATHS = [
    r"C:\Program Files\Google\Chrome\Application\chrome.exe",
    r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
]

CHROME_BIN = None
for p in CHROME_PATHS:
    if os.path.exists(p):
        CHROME_BIN = p
        break

if not CHROME_BIN:
    print("Warning: Neither Chrome nor Edge executable was found.")
    sys.exit(1)

DIMENSIONS = {
    "banner": (1200, 360),
    "flow": (1000, 270),
    "agents": (880, 250),
    "timetravel": (880, 260),
    "logo-mark": (120, 120),
    "logo": (460, 120),
}

def get_dimensions(filename):
    for key, dims in DIMENSIONS.items():
        if filename.startswith(key):
            return dims
    return (800, 400)

def main():
    print(f"Using browser: {CHROME_BIN}")
    svg_files = sorted(glob.glob(os.path.join(ASSETS_DIR, "*.svg")))
    
    temp_dir = os.path.abspath("scripts/temp_render")
    os.makedirs(temp_dir, exist_ok=True)

    rendered_count = 0
    for svg_path in svg_files:
        name = os.path.splitext(os.path.basename(svg_path))[0]
        is_dark = "dark" in name
        w, h = get_dimensions(name)
        
        with open(svg_path, "r", encoding="utf-8") as f:
            svg_content = f.read()

        bg_color = "#081528" if is_dark else "#F7F5F0"
        
        # HTML wrapper with centering and clean background
        html_content = f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    * {{ margin: 0; padding: 0; box-sizing: border-box; }}
    body {{
      width: {w}px;
      height: {h}px;
      background: {bg_color};
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
    }}
    svg {{
      width: {w}px;
      height: {h}px;
      display: block;
    }}
  </style>
</head>
<body>
{svg_content}
</body>
</html>"""

        html_path = os.path.join(temp_dir, f"{name}.html")
        with open(html_path, "w", encoding="utf-8") as f:
            f.write(html_content)

        out_png = os.path.join(PREVIEW_DIR, f"{name}.png")
        
        # Invoke headless Chrome
        cmd = [
            CHROME_BIN,
            "--headless=new",
            f"--window-size={w},{h}",
            "--hide-scrollbars",
            "--disable-gpu",
            f"--screenshot={out_png}",
            f"file:///{html_path.replace(os.sep, '/')}"
        ]
        
        subprocess.run(cmd, capture_output=True)
        if os.path.exists(out_png) and os.path.getsize(out_png) > 0:
            print(f"[RENDERED] {name}.png ({w}x{h}, {os.path.getsize(out_png)} bytes)")
            rendered_count += 1
        else:
            print(f"[FAILED] Could not render {name}.png")

    # Clean up temp html directory
    shutil.rmtree(temp_dir, ignore_errors=True)
    print(f"\nRendered {rendered_count} of {len(svg_files)} previews in docs/assets/_preview/")

if __name__ == "__main__":
    main()
