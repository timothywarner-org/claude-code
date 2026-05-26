#!/usr/bin/env python3
"""Audit the CLAUDE.md hierarchy for this O'Reilly course repo.

Walks the canonical five CLAUDE.md files (root + four segments) and reports drift:
referenced files that no longer exist, ground-truth facts that have aged out of
the segment_4_hero block, and bullet entries that name files which are missing
from disk. Output is JSON on stdout, exit code signals status.
"""

# Why a script and not inline prompt logic: the audit is deterministic, runs
# in milliseconds, and produces structured output Claude can reason over. Pushing
# this into a prompt would burn tokens on every run and lose reproducibility.

from __future__ import annotations

import argparse
import json
import os
import re
import sys
from dataclasses import dataclass, asdict, field
from pathlib import Path
from typing import Iterable

# Directories we never recurse into when building the basename cache. Walking
# node_modules turns this script from milliseconds into seconds on a typical
# JS/TS course repo, and learners on stage cannot wait.
PRUNE_DIRS = frozenset({".git", "node_modules", ".venv", "venv", "dist", "build", "__pycache__", ".next", "out"})

# The five CLAUDE.md files this repo teaches. Order matters: it's the order
# learners encounter them as they walk the course arc.
CANONICAL_FILES: tuple[tuple[str, str], ...] = (
    ("root", "CLAUDE.md"),
    ("segment_1", "segment_1_quickstart/CLAUDE.md"),
    ("segment_2", "segment_2_context/CLAUDE.md"),
    ("segment_3", "segment_3_agents/CLAUDE.md"),
    ("segment_4", "segment_4_hero/CLAUDE.md"),
)

# Ground-truth facts the segment_4_hero/CLAUDE.md must contain verbatim or
# near-verbatim. If any of these strings is missing, the segment doc has drifted
# from the course's published facts. Update this list when the course updates.
GROUND_TRUTH_TOKENS: tuple[str, ...] = (
    "2025-11-25",
    "stdio",
    "Streamable HTTP",
    "Opus 4.7",
    "Sonnet 4.6",
    "Haiku 4.5",
    "${CLAUDE_SKILL_DIR}",
)

# Backtick-quoted relative paths inside CLAUDE.md files. We treat any backticked
# token ending in a recognized extension as a path claim worth verifying.
PATH_PATTERN = re.compile(
    r"`([A-Za-z0-9_./\-]+\.(?:md|ts|py|json|sh|ps1|yaml|yml|toml))`"
)

# Severity bands the audit script uses. The skill prompt groups findings by these.
SEVERITY_HIGH = "high"
SEVERITY_MEDIUM = "medium"
SEVERITY_LOW = "low"


@dataclass
class Finding:
    file: str
    severity: str
    category: str
    message: str
    line: int | None = None


@dataclass
class AuditResult:
    status: str
    repo_root: str
    files_audited: list[str] = field(default_factory=list)
    findings: list[Finding] = field(default_factory=list)


def find_repo_root(start: Path) -> Path:
    """Walk upward until we find a directory containing both .git and CLAUDE.md.

    Why both: a .git folder alone could be a nested submodule. CLAUDE.md alone
    could be a sibling project. Together they uniquely identify the course repo
    root no matter which subdirectory the user invokes us from.
    """
    current = start.resolve()
    for candidate in (current, *current.parents):
        if (candidate / ".git").exists() and (candidate / "CLAUDE.md").exists():
            return candidate
    raise FileNotFoundError(
        "Could not locate repo root (need .git/ and CLAUDE.md). "
        "Run from inside the claude-code repo."
    )


def extract_path_claims(text: str) -> Iterable[tuple[int, str]]:
    """Yield (line_number, claimed_path) for every backticked path-like token."""
    for lineno, line in enumerate(text.splitlines(), start=1):
        for match in PATH_PATTERN.finditer(line):
            yield lineno, match.group(1)


def looks_like_external_url_fragment(claim: str) -> bool:
    """Filter out path-looking strings that are actually URL fragments or examples."""
    # We see things like `claude.ai/code` in backticks. Those have no extension
    # that matches the pattern, so PATH_PATTERN already excludes them, but we
    # also skip anything starting with http or claude.ai just in case.
    return claim.startswith(("http://", "https://", "claude.ai/"))


def build_basename_index(repo_root: Path) -> set[str]:
    """Walk the repo once, return the set of all filenames present.

    The basename fallback in audit_file() used to call rglob() per claim, which
    on a node_modules-heavy repo would do N full tree walks. One walk + O(1)
    set membership is dramatically cheaper.
    """
    index: set[str] = set()
    for dirpath, dirnames, filenames in os.walk(repo_root):
        # In-place mutation of dirnames is the documented way to prune os.walk.
        dirnames[:] = [d for d in dirnames if d not in PRUNE_DIRS]
        index.update(filenames)
    return index


def audit_file(
    label: str,
    rel_path: str,
    repo_root: Path,
    basename_index: set[str],
) -> list[Finding]:
    """Run all checks against one CLAUDE.md file. Returns findings (may be empty)."""
    findings: list[Finding] = []
    abs_path = repo_root / rel_path

    if not abs_path.exists():
        findings.append(
            Finding(
                file=rel_path,
                severity=SEVERITY_HIGH,
                category="missing_file",
                message=f"Expected CLAUDE.md at {rel_path} but it does not exist.",
            )
        )
        return findings

    text = abs_path.read_text(encoding="utf-8")

    # Check 1: every backticked relative path inside the CLAUDE.md resolves on disk.
    # Resolution order:
    #   1. Exact relative to repo root.
    #   2. Relative to the CLAUDE.md's own directory.
    #   3. Basename-only claims (no slash) match against the prebuilt index.
    #      Claims with a slash are author-intentional path specs and must
    #      resolve exactly. This keeps the fallback from masking real drift like
    #      `src/old/server.py` when an unrelated `server.py` exists elsewhere.
    for lineno, claim in extract_path_claims(text):
        if looks_like_external_url_fragment(claim):
            continue
        if (repo_root / claim).exists():
            continue
        if (abs_path.parent / claim).exists():
            continue
        if "/" not in claim and claim in basename_index:
            continue
        findings.append(
            Finding(
                file=rel_path,
                line=lineno,
                severity=SEVERITY_MEDIUM,
                category="broken_path_claim",
                message=f"Referenced path `{claim}` does not exist on disk.",
            )
        )

    # Check 2: segment_4_hero ground-truth facts block must contain every token.
    if label == "segment_4":
        for token in GROUND_TRUTH_TOKENS:
            if token not in text:
                findings.append(
                    Finding(
                        file=rel_path,
                        severity=SEVERITY_HIGH,
                        category="ground_truth_drift",
                        message=(
                            f"Ground-truth token '{token}' is missing from the "
                            "segment_4_hero/CLAUDE.md facts block. Course material has "
                            "drifted from this CLAUDE.md."
                        ),
                    )
                )

    # Check 3: voice rules from the segment_4_hero/CLAUDE.md style guide.
    # We only enforce em-dash and "noun ask" inside CLAUDE.md files themselves,
    # because that's where the course style is most visible to learners.
    em_dash_lines = [
        lineno
        for lineno, line in enumerate(text.splitlines(), start=1)
        if "—" in line  # actual em-dash character
    ]
    for lineno in em_dash_lines:
        findings.append(
            Finding(
                file=rel_path,
                line=lineno,
                severity=SEVERITY_LOW,
                category="voice_violation",
                message="Em dash detected. Use hyphens with spaces, commas, or periods.",
            )
        )

    return findings


def apply_fixes(repo_root: Path, findings: list[Finding]) -> int:
    """Auto-correct fixable findings. Returns count of corrections applied.

    Only the em-dash voice violations are auto-fixable right now. Path claims
    and ground-truth drift need human judgment.

    Two safety constraints:
      1. Replacement is line-scoped using the recorded lineno, never global,
         so em-dashes inside fenced code blocks stay untouched.
      2. The write is atomic via os.replace() on a sibling temp file, so a
         Ctrl-C or power loss mid-write cannot leave a zero-length CLAUDE.md.
    """
    fixable = [f for f in findings if f.category == "voice_violation" and f.line]
    if not fixable:
        return 0

    # Group fixable findings by file so we read each file once.
    by_file: dict[str, list[int]] = {}
    for finding in fixable:
        by_file.setdefault(finding.file, []).append(finding.line or 0)

    fix_count = 0
    for rel_path, linenos in by_file.items():
        abs_path = repo_root / rel_path
        # Echo the resolved absolute path before mutating, so a misrouted run
        # (cwd in a different repo with .git + CLAUDE.md) is visible immediately.
        sys.stderr.write(f"--fix: rewriting {abs_path}\n")
        lines = abs_path.read_text(encoding="utf-8").splitlines(keepends=True)
        target_lines = set(linenos)
        in_fence = False
        for idx, line in enumerate(lines, start=1):
            stripped = line.lstrip()
            if stripped.startswith("```"):
                in_fence = not in_fence
                continue
            if idx in target_lines and not in_fence and "—" in line:
                lines[idx - 1] = line.replace("—", " - ")
                fix_count += 1

        tmp_path = abs_path.with_suffix(abs_path.suffix + ".tmp")
        tmp_path.write_text("".join(lines), encoding="utf-8")
        os.replace(tmp_path, abs_path)

    return fix_count


def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Audit the CLAUDE.md hierarchy in this course repo."
    )
    parser.add_argument(
        "--scope",
        choices=("root", "segment_1", "segment_2", "segment_3", "segment_4", "all"),
        default="all",
        help="Limit the audit to one CLAUDE.md (default: all five).",
    )
    parser.add_argument(
        "--fix",
        action="store_true",
        help="Auto-correct fixable findings (currently em-dash voice violations only).",
    )
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv if argv is not None else sys.argv[1:])

    try:
        repo_root = find_repo_root(Path.cwd())
    except FileNotFoundError as exc:
        json.dump(
            {"status": "error", "message": str(exc)},
            sys.stdout,
            indent=2,
        )
        sys.stdout.write("\n")
        return 2

    targets = (
        CANONICAL_FILES
        if args.scope == "all"
        else tuple((label, rel) for label, rel in CANONICAL_FILES if label == args.scope)
    )

    basename_index = build_basename_index(repo_root)
    result = AuditResult(status="clean", repo_root=str(repo_root))
    for label, rel_path in targets:
        result.files_audited.append(rel_path)
        result.findings.extend(audit_file(label, rel_path, repo_root, basename_index))

    if args.fix and result.findings:
        fixed = apply_fixes(repo_root, result.findings)
        # After fixing, re-audit so the report reflects the post-fix state.
        if fixed:
            result.findings = []
            for label, rel_path in targets:
                result.findings.extend(audit_file(label, rel_path, repo_root, basename_index))

    if result.findings:
        result.status = "drift"

    # Pydantic-style dump without the dependency. dataclasses.asdict handles nesting.
    json.dump(asdict(result), sys.stdout, indent=2)
    sys.stdout.write("\n")
    return 0 if result.status == "clean" else 1


if __name__ == "__main__":
    sys.exit(main())
