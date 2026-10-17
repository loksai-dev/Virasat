#!/usr/bin/env python3
"""Run automated Lighthouse audits across mobile and desktop.
Targets:
- Landing Page (/)
- Demo Page (/demo)
- Case Page (/case/VR-2026-0142/overview)
Saves HTML & JSON reports and prints summary table.
"""

import argparse
import json
import re
import subprocess
import sys
from pathlib import Path

TARGETS = [
    {"name": "landing", "path": "/"},
    {"name": "demo", "path": "/demo"},
    {"name": "case", "path": "/case/VR-2026-0142/overview"},
]


def run_lh(url: str, out_prefix: Path, desktop: bool = False) -> dict:
    mode_str = "desktop" if desktop else "mobile"
    json_path = out_prefix.with_suffix(f".{mode_str}.report.json")
    html_path = out_prefix.with_suffix(f".{mode_str}.report.html")

    cmd = [
        "npx",
        "--yes",
        "lighthouse",
        url,
        "--chrome-flags=--headless=new --no-sandbox",
        "--output=json,html",
        f"--output-path={out_prefix.with_suffix(f'.{mode_str}')}",
        "--quiet",
    ]
    if desktop:
        cmd.append("--preset=desktop")

    print(f"Running Lighthouse ({mode_str}): {url} ...", flush=True)
    subprocess.run(cmd, check=True, shell=True)

    # Automatically redact any Google API Key pattern from generated reports to prevent secret exposure
    key_re = re.compile(rb"AIza[0-9A-Za-z_-]{35}")
    placeholder = b"[REDACTED_GOOGLE_API_KEY]"
    for cand in out_prefix.parent.glob(f"*{out_prefix.name}*{mode_str}*"):
        if cand.suffix in (".html", ".json"):
            try:
                raw_bytes = cand.read_bytes()
                if key_re.search(raw_bytes):
                    cand.write_bytes(key_re.sub(placeholder, raw_bytes))
            except Exception:
                pass

    # Note: Lighthouse appends .report.json or .json
    actual_json = None
    for cand in [json_path, out_prefix.with_name(f"{out_prefix.name}.{mode_str}.report.json"), out_prefix.with_name(f"{out_prefix.name}.{mode_str}.json")]:
        if cand.exists():
            actual_json = cand
            break

    if not actual_json:
        # Check folder for matching files
        for f in out_prefix.parent.glob(f"*{out_prefix.name}*{mode_str}*.json"):
            actual_json = f
            break

    if not actual_json:
        return {"error": "JSON report not found"}

    with open(actual_json, encoding="utf-8") as f:
        data = json.load(f)

    cats = data.get("categories", {})
    audits = data.get("audits", {})

    perf = cats.get("performance", {}).get("score", 0) * 100
    a11y = cats.get("accessibility", {}).get("score", 0) * 100
    bp = cats.get("best-practices", {}).get("score", 0) * 100
    seo = cats.get("seo", {}).get("score", 0) * 100

    fcp = audits.get("first-contentful-paint", {}).get("displayValue", "N/A")
    lcp = audits.get("largest-contentful-paint", {}).get("displayValue", "N/A")
    tbt = audits.get("total-blocking-time", {}).get("displayValue", "N/A")
    cls = audits.get("cumulative-layout-shift", {}).get("displayValue", "N/A")

    return {
        "url": url,
        "mode": mode_str,
        "perf": round(perf),
        "a11y": round(a11y),
        "best_practices": round(bp),
        "seo": round(seo),
        "fcp": fcp,
        "lcp": lcp,
        "tbt": tbt,
        "cls": cls,
        "json_file": str(actual_json),
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--base-url", default="https://virasat-511210.web.app")
    parser.add_argument("--out-dir", default="docs/perf/lighthouse_before")
    args = parser.parse_args()

    out_dir = Path(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    results = []
    for target in TARGETS:
        full_url = f"{args.base_url.rstrip('/')}{target['path']}"
        prefix = out_dir / target["name"]

        # Mobile
        res_m = run_lh(full_url, prefix, desktop=False)
        results.append(res_m)

        # Desktop
        res_d = run_lh(full_url, prefix, desktop=True)
        results.append(res_d)

    summary_file = out_dir / "summary.json"
    with open(summary_file, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2)

    print("\n" + "=" * 80)
    print(f" LIGHTHOUSE AUDIT RESULTS ({args.out_dir})")
    print("=" * 80)
    print(f"{'Page':<12} {'Mode':<8} {'Perf':<6} {'A11y':<6} {'BP':<6} {'SEO':<6} {'LCP':<10} {'TBT':<10} {'CLS':<8}")
    print("-" * 80)
    for r in results:
        print(f"{r.get('url', '').split('/')[-1] or 'landing':<12} {r.get('mode', ''):<8} {r.get('perf', 0):<6} {r.get('a11y', 0):<6} {r.get('best_practices', 0):<6} {r.get('seo', 0):<6} {r.get('lcp', ''):<10} {r.get('tbt', ''):<10} {r.get('cls', ''):<8}")
    print("=" * 80)


if __name__ == "__main__":
    main()
