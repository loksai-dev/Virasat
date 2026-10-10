#!/usr/bin/env python3
"""
scripts/validate_svgs.py
Validates all SVG assets in docs/assets/:
- File size < 150 KB
- No <script> tags
- No <foreignObject> tags
- No inline on* event attributes (onclick, onload, etc.)
- No external href/url() references (only internal fragments #id allowed)
- Valid XML structure
"""

import os
import sys
import re
import glob
import xml.etree.ElementTree as ET

MAX_SIZE_BYTES = 150 * 1024  # 150 KB
ASSETS_DIR = os.path.abspath("docs/assets")

def validate_svg(filepath):
    errors = []
    filename = os.path.basename(filepath)
    size = os.path.getsize(filepath)

    # 1. File size check
    if size > MAX_SIZE_BYTES:
        errors.append(f"Size {size/1024:.1f} KB exceeds 150 KB limit")

    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()

    # 2. No <script>
    if re.search(r"<\s*script\b", content, re.IGNORECASE):
        errors.append("Contains <script> tag")

    # 3. No <foreignObject>
    if re.search(r"<\s*foreignObject\b", content, re.IGNORECASE):
        errors.append("Contains <foreignObject> tag")

    # 4. No on* event handlers
    if re.search(r"\bon[a-z]+\s*=", content, re.IGNORECASE):
        errors.append("Contains inline on* event attribute")

    # 5. No external href/url references (only internal #fragments allowed)
    # Check href="..." and xlink:href="..."
    for match in re.finditer(r'(?:href|xlink:href)\s*=\s*["\']([^"\']+)["\']', content, re.IGNORECASE):
        ref = match.group(1).strip()
        if not ref.startswith("#") and not ref.startswith("data:"):
            # If it's a URL or path, it's forbidden
            errors.append(f"Forbidden external href reference: {ref}")

    # Check url(...) in style or attributes
    for match in re.finditer(r'url\s*\(\s*["\']?([^"\'\)]+)["\']?\s*\)', content, re.IGNORECASE):
        ref = match.group(1).strip()
        if not ref.startswith("#") and not ref.startswith("data:"):
            errors.append(f"Forbidden external url() reference: {ref}")

    # 6. XML Well-formedness
    try:
        ET.fromstring(content)
    except ET.ParseError as e:
        errors.append(f"Malformed XML: {e}")

    return errors, size

def main():
    print("=" * 60)
    print(" Validating SVG Assets in docs/assets/")
    print("=" * 60)

    svg_files = sorted(glob.glob(os.path.join(ASSETS_DIR, "*.svg")))
    if not svg_files:
        print("ERROR: No SVG files found in docs/assets/")
        sys.exit(1)

    all_passed = True
    for svg_path in svg_files:
        rel_path = os.path.relpath(svg_path, os.getcwd())
        errors, size = validate_svg(svg_path)
        if errors:
            all_passed = False
            print(f"[FAIL] {rel_path} ({size/1024:.1f} KB):")
            for err in errors:
                print(f"       - {err}")
        else:
            print(f"[PASS] {rel_path.ljust(35)} ({size/1024:.1f} KB)")

    print("=" * 60)
    if all_passed:
        print(f">>> ALL {len(svg_files)} SVGs PASSED VALIDATION! <<<")
        sys.exit(0)
    else:
        print(">>> SOME SVGs FAILED VALIDATION. <<<")
        sys.exit(1)

if __name__ == "__main__":
    main()
