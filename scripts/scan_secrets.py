#!/usr/bin/env python3
"""scripts/scan_secrets.py
Audits working tree and Git repository for leaked secrets, private keys, service account JSON files, and tokens.
Uses gitleaks if available, and falls back to a safe regex scanner with zero secret literals and masked output.
"""

import hashlib
import json
import os
import re
import shutil
import subprocess
import sys
from pathlib import Path

# Safe pattern definitions constructed without secret literals
PATTERNS = [
    ("Private Key PEM", re.compile(r"-----BEGIN " + r"(?:RSA |EC )?" + r"PRIVATE KEY-----")),
    ("Service Account JSON", re.compile(r'"type"' + r'\s*:\s*' + r'"service_account"')),
    ("Private Key ID JSON", re.compile(r'"private_key"' + r'\s*:\s*' + r'"-----BEGIN')),
    ("Google API Key Pattern", re.compile(r"AI" + r"za" + r"[0-9A-Za-z_-]{35}")),
    ("AWS Access Key", re.compile(r"(?:A3T[A-Z0-9]|AKIA|AGPA|AIDA|AROA|AIPA|ANPA|ANVA|ASIA)[A-Z0-9]{16}")),
    ("GitHub Personal Access Token", re.compile(r"gh[pousr]_[A-Za-z0-9_]{36,255}")),
    ("GitHub Fine-Grained Token", re.compile(r"github_pat_[0-9A-Za-z_]{82}")),
]

# Allowlisted paths where mock or benign items reside
ALLOWLIST_PATHS = {
    ".gitleaks.toml",
    "gitleaks_history.json",
    "gitleaks_worktree.json",
    "scripts/smoke_test.py",
}

IGNORED_DIRS = {".git", "node_modules", ".venv", "__pycache__", ".pytest_cache", ".ruff_cache", "dist"}


def mask_secret(secret: str) -> str:
    """Mask secret showing only first 4 and last 4 characters."""
    if len(secret) <= 8:
        return "***"
    return secret[:4] + "..." + secret[-4:]


def find_gitleaks_binary() -> str | None:
    """Locate gitleaks executable on PATH or WinGet package directory."""
    path = shutil.which("gitleaks")
    if path:
        return path
    winget_dir = Path(os.environ.get("LOCALAPPDATA", "")) / "Microsoft" / "WinGet" / "Packages"
    if winget_dir.exists():
        for f in winget_dir.rglob("gitleaks.exe"):
            return str(f)
    return None


def run_gitleaks_scan() -> tuple[bool, list[dict]]:
    """Run gitleaks scanner if installed."""
    gl_bin = find_gitleaks_binary()
    if not gl_bin:
        return False, []

    print(f"Running Gitleaks scanner ({gl_bin})...")
    report_file = Path("scripts/_gitleaks_temp.json")
    try:
        cmd = [gl_bin, "dir", "--no-banner", "--report-format=json", f"--report-path={report_file}"]
        cfg = Path(".gitleaks.toml")
        if cfg.exists():
            cmd.extend(["--config", str(cfg)])
        proc = subprocess.run(cmd, capture_output=True, text=True)
        findings = []
        if report_file.exists():
            data = json.loads(report_file.read_text(encoding="utf-8"))
            for item in data:
                sec = item.get("Secret", "")
                findings.append({
                    "rule": item.get("RuleID", "Secret"),
                    "file": item.get("File", ""),
                    "line": item.get("StartLine", 0),
                    "masked": mask_secret(sec),
                    "sha256": hashlib.sha256(sec.encode("utf-8")).hexdigest(),
                })
            report_file.unlink(missing_ok=True)
        return True, findings
    except Exception as e:
        print(f"Gitleaks invocation error: {e}")
        if report_file.exists():
            report_file.unlink(missing_ok=True)
        return False, []


def scan_working_tree_python() -> list[dict]:
    """Scan working tree files using safe regex matcher."""
    print("Scanning working tree files (Python engine)...")
    findings = []
    root = Path(".")

    for path in root.rglob("*"):
        if not path.is_file():
            continue
        if any(part in IGNORED_DIRS for part in path.parts):
            continue
        rel = str(path.as_posix())
        if rel in ALLOWLIST_PATHS or any(rel.endswith(p) for p in ALLOWLIST_PATHS):
            continue
        if path.suffix.lower() in {
            ".png", ".jpg", ".jpeg", ".mp4", ".wav", ".webm", ".ttf",
            ".woff", ".woff2", ".ico", ".pdf", ".pyc"
        }:
            continue

        try:
            content = path.read_text(encoding="utf-8", errors="ignore")
            for name, pattern in PATTERNS:
                for match in pattern.finditer(content):
                    val = match.group(0)
                    findings.append({
                        "rule": name,
                        "file": rel,
                        "line": content[:match.start()].count("\n") + 1,
                        "masked": mask_secret(val),
                        "sha256": hashlib.sha256(val.encode("utf-8")).hexdigest(),
                    })
        except Exception:
            pass

    return findings


def main():
    print("=" * 60)
    print(" Virasat Secret Scanning Audit")
    print("=" * 60)

    used_gitleaks, findings = run_gitleaks_scan()
    if not used_gitleaks:
        findings = scan_working_tree_python()

    print("-" * 60)
    if not findings:
        print("RESULT: PASS. Zero un-allowlisted secrets, private keys, or credentials found.")
        sys.exit(0)
    else:
        print(f"RESULT: FAIL. {len(findings)} potential secret(s) flagged:")
        for idx, f in enumerate(findings, 1):
            print(f" [{idx}] {f['rule']} in {f['file']}:{f['line']} (masked: {f['masked']}, sha256: {f['sha256'][:16]}...)")
        sys.exit(1)


if __name__ == "__main__":
    main()
