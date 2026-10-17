#!/usr/bin/env python3
"""
Safely redact Google API-key-shaped strings from tracked Lighthouse reports.

Default mode is read-only. Run with --apply to:
  1. Create a timestamped backup outside the repository.
  2. Record repository state and file hashes in the backup.
  3. Redact Google API key patterns from tracked docs/perf/**/*.report.html/json.
  4. Print a verification summary without printing secrets.

This script does NOT revoke credentials, rewrite Git history, commit, push, or force-push.
"""
from __future__ import annotations

import argparse
import datetime as dt
import hashlib
import json
import re
import subprocess
import sys
from pathlib import Path

KEY_RE = re.compile(rb"AIza[0-9A-Za-z_-]{35}")
PLACEHOLDER = b"[REDACTED_GOOGLE_API_KEY]"
REPORT_SUFFIXES = (".report.html", ".report.json")


def run_git(repo: Path, *args: str) -> str:
    p = subprocess.run(
        ["git", *args], cwd=repo, text=True,
        stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=False
    )
    if p.returncode:
        raise RuntimeError(f"git {' '.join(args)} failed: {p.stderr.strip()}")
    return p.stdout.strip()


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--repo", default=".", help="Path to the Virasat Git repository")
    parser.add_argument("--apply", action="store_true", help="Back up and apply redactions")
    args = parser.parse_args()

    repo = Path(args.repo).resolve()
    if not (repo / ".git").exists():
        print("ERROR: --repo must point to a Git working tree (a .git directory is required).")
        return 2

    branch = run_git(repo, "branch", "--show-current")
    head = run_git(repo, "rev-parse", "HEAD")
    status = run_git(repo, "status", "--short")
    tracked = run_git(repo, "ls-files", "-z").split("\0")
    candidates = []
    for name in tracked:
        if not name:
            continue
        p = Path(name)
        if not name.startswith("docs/perf/"):
            continue
        if not name.endswith(REPORT_SUFFIXES):
            continue
        full = repo / p
        if full.is_file():
            data = full.read_bytes()
            count = len(KEY_RE.findall(data))
            if count:
                candidates.append((p, data, count))

    print(f"Repository: {repo}")
    print(f"Branch: {branch or '(detached HEAD)'}")
    print(f"HEAD: {head}")
    print(f"Working tree: {'CLEAN' if not status else 'HAS CHANGES (see git status locally)'}")
    print(f"Tracked Lighthouse report files scanned: {sum(1 for n in tracked if n.startswith('docs/perf/') and n.endswith(REPORT_SUFFIXES))}")
    print(f"Report files containing Google API-key-shaped strings: {len(candidates)}")
    print(f"Total matches to redact: {sum(count for _, _, count in candidates)}")

    if not candidates:
        print("No matching key patterns found in tracked Lighthouse report HTML/JSON files.")
        print("Note: this does not check Git history, untracked files, GitHub forks/caches, or key revocation.")
        return 0

    for rel, _, count in candidates:
        print(f"  {rel.as_posix()}: {count} match(es)")

    if not args.apply:
        print("\nDRY RUN ONLY. Review the paths above, then rerun with --apply to back up and redact.")
        return 0

    timestamp = dt.datetime.now().strftime("%Y%m%d-%H%M%S")
    backup = repo.parent / f"{repo.name}-secret-remediation-backup-{timestamp}"
    backup.mkdir(parents=True, exist_ok=False)

    manifest = {
        "created_at_local": dt.datetime.now().isoformat(timespec="seconds"),
        "repository": str(repo),
        "branch": branch,
        "head": head,
        "working_tree_status": status,
        "files": [],
        "note": "Backup of files before redaction. No Git history rewrite or remote operation was performed.",
    }

    try:
        for rel, original, count in candidates:
            dest = backup / rel
            dest.parent.mkdir(parents=True, exist_ok=True)
            dest.write_bytes(original)
            updated, replacements = KEY_RE.subn(PLACEHOLDER, original)
            (repo / rel).write_bytes(updated)
            manifest["files"].append({
                "path": rel.as_posix(),
                "matches_found": count,
                "replacements_made": replacements,
                "original_sha256": sha256(original),
                "redacted_sha256": sha256(updated),
                "backup_path": str(dest),
            })
        (backup / "manifest.json").write_text(
            json.dumps(manifest, indent=2), encoding="utf-8"
        )
    except Exception:
        print(f"ERROR while applying changes. Partial backup, if any, is at: {backup}")
        raise

    remaining = 0
    for rel, _, _ in candidates:
        remaining += len(KEY_RE.findall((repo / rel).read_bytes()))

    print(f"\nBackup created outside repository: {backup}")
    print(f"Files redacted: {len(manifest['files'])}")
    print(f"Remaining Google API-key-shaped matches in changed files: {remaining}")
    print("No commit, push, force-push, tag update, or Git history rewrite was performed.")
    print("Next: inspect git diff, run tests/scanning, verify key revocation in Google Cloud,")
    print("then request explicit approval before any Git history rewrite or force-push.")
    return 0 if remaining == 0 else 1


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (RuntimeError, OSError) as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        raise SystemExit(2)
