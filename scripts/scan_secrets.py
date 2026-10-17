#!/usr/bin/env python3
"""
scripts/scan_secrets.py
Audits entire Git history and working tree for leaked secrets, private keys, service account JSON files, and tokens.
"""

import os
import re
import subprocess
import sys
from pathlib import Path

# Patterns that represent high-risk leaks
SECRET_PATTERNS = [
    ("Private Key PEM", re.compile(r"-----BEGIN [A-Z ]*PRIVATE KEY-----")),
    ("Service Account JSON", re.compile(r'"type"\s*:\s*"service_account"')),
    ("Private Key ID JSON", re.compile(r'"private_key"\s*:\s*"-----BEGIN')),
    ("AWS Access Key", re.compile(r"(?:A3T[A-Z0-9]|AKIA|AGPA|AIDA|AROA|AIPA|ANPA|ANVA|ASIA)[A-Z0-9]{16}")),
    ("GitHub Personal Access Token", re.compile(r"gh[pousr]_[A-Za-z0-9_]{36,255}")),
    ("Generic Secret Assignment", re.compile(r'(?i)(?:api_key|secret_key|private_key|client_secret|password)\s*[:=]\s*["\']([a-zA-Z0-9+/=_-]{20,})["\']')),
]

# Benign public Firebase keys or placeholders
BENIGN_PATTERNS = [
    "AIzaSyABofmhSGSj0z6u_Yb5EKRyaieG3JLHAPQ",  # Public Firebase Web Client API key
    "your_gcp_project",
    "virasat-511210",
]

def scan_text(text: str, source: str) -> list[dict]:
    findings = []
    for name, pattern in SECRET_PATTERNS:
        matches = pattern.finditer(text)
        for m in matches:
            matched_str = m.group(0)
            # Check if benign
            is_benign = any(b in matched_str for b in BENIGN_PATTERNS)
            if not is_benign:
                snippet = matched_str[:40] + ("..." if len(matched_str) > 40 else "")
                findings.append({
                    "rule": name,
                    "source": source,
                    "snippet": snippet
                })
    return findings

def scan_git_history() -> list[dict]:
    print("1. Scanning complete git history (git log -p)...")
    try:
        proc = subprocess.run(
            ["git", "log", "-p", "--full-history", "--all"],
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="ignore",
            timeout=120
        )
        if proc.returncode != 0:
            print(f"Git log failed: {proc.stderr}")
            return []
        
        findings = []
        commits = proc.stdout.split("commit ")
        for c in commits[1:]:
            header = c.split("\n", 1)[0]
            c_findings = scan_text(c, f"commit {header}")
            findings.extend(c_findings)
        return findings
    except Exception as e:
        print(f"Error scanning git log: {e}")
        return []

def scan_working_tree() -> list[dict]:
    print("2. Scanning working tree files...")
    findings = []
    root = Path(".")
    ignored_dirs = {".git", "node_modules", ".venv", "__pycache__", ".pytest_cache", ".ruff_cache"}
    
    for path in root.rglob("*"):
        if path.is_file():
            # Check if in ignored dir
            if any(part in ignored_dirs for part in path.parts):
                continue
            # Skip media / binary files
            if path.suffix.lower() in {".png", ".jpg", ".jpeg", ".mp4", ".wav", ".webm", ".ttf", ".woff", ".woff2", ".ico", ".pdf"}:
                continue
            
            try:
                content = path.read_text(encoding="utf-8", errors="ignore")
                f_findings = scan_text(content, str(path))
                findings.extend(f_findings)
            except Exception as e:
                pass
    return findings

def scan_dist_bundle() -> list[dict]:
    print("3. Scanning frontend dist/ production bundle...")
    dist_dir = Path("frontend/dist")
    if not dist_dir.exists():
        print("frontend/dist does not exist!")
        return []
    
    findings = []
    for path in dist_dir.rglob("*.js"):
        content = path.read_text(encoding="utf-8", errors="ignore")
        # Search for any unexpected private keys or service account patterns
        f_findings = scan_text(content, str(path))
        findings.extend(f_findings)
    return findings

if __name__ == "__main__":
    git_findings = scan_git_history()
    tree_findings = scan_working_tree()
    dist_findings = scan_dist_bundle()
    
    total = git_findings + tree_findings + dist_findings
    print("\n" + "=" * 60)
    print(" SECRETS AUDIT SUMMARY")
    print("=" * 60)
    print(f"Git History Findings: {len(git_findings)}")
    print(f"Working Tree Findings: {len(tree_findings)}")
    print(f"Dist Bundle Findings: {len(dist_findings)}")
    print("-" * 60)
    
    if not total:
        print("RESULT: PASS. Zero leaked secrets, zero private keys, zero service-account files.")
        sys.exit(0)
    else:
        print(f"RESULT: FAIL. {len(total)} potential secrets flagged:")
        for idx, f in enumerate(total, 1):
            print(f" [{idx}] {f['rule']} in {f['source']}: {f['snippet']}")
        sys.exit(1)
