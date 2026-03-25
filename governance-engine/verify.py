#!/usr/bin/env python3
"""
OpenInnovate DAO — Condition Verification Script v1.0

Validates that MODIFY conditions in an execution record have been
satisfied by examining current repository state, file contents, and hashes.

This script runs locally without API calls for most verification types.
It exists to close the governance gap where the same entity that generates
conditions also declares them satisfied.

Usage:
    python verify.py --execution governance/executions/002-ratify-constitutional-corpus-v2.json
    python verify.py --corpus-integrity
    python verify.py --decision governance/decisions/003-financial-infrastructure.json --check-hash
"""

import argparse
import json
import re
import subprocess
import sys
import tempfile
from hashlib import sha3_256 as keccak256
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CORPUS_DIR = ROOT / "corpus"
MANIFEST_FILE = CORPUS_DIR / "manifest.json"
REPO = "hocmemini/openinnovate-dao"


# ---------------------------------------------------------------------------
# Verification checks
# ---------------------------------------------------------------------------

class VerificationResult:
    def __init__(self, check_name, passed, detail=""):
        self.check_name = check_name
        self.passed = passed
        self.detail = detail

    def __str__(self):
        status = "PASS" if self.passed else "FAIL"
        msg = f"[{status}] {self.check_name}"
        if self.detail:
            msg += f" — {self.detail}"
        return msg


def verify_file_exists(path):
    """Check that a file exists at the given path."""
    resolved = ROOT / path if not Path(path).is_absolute() else Path(path)
    exists = resolved.exists()
    return VerificationResult(
        f"file_exists: {path}",
        exists,
        str(resolved) if exists else f"NOT FOUND at {resolved}"
    )


def verify_hash_match(path, expected_hash):
    """Check that a file's keccak256 hash matches the expected value."""
    resolved = ROOT / path if not Path(path).is_absolute() else Path(path)
    if not resolved.exists():
        return VerificationResult(f"hash_match: {path}", False, "file not found")

    actual_hash = "0x" + keccak256(resolved.read_bytes()).hexdigest()
    matches = actual_hash == expected_hash
    return VerificationResult(
        f"hash_match: {path}",
        matches,
        f"expected {expected_hash[:18]}... got {actual_hash[:18]}..." if not matches else "hashes match"
    )


def verify_content_header(path):
    """Check that a corpus file's header metadata matches its actual content."""
    resolved = CORPUS_DIR / path if not Path(path).is_absolute() else Path(path)
    if not resolved.exists():
        return VerificationResult(f"content_header: {path}", False, "file not found")

    text = resolved.read_text(errors="replace")
    lines = text.split("\n")

    # Extract header title (first line starting with #)
    header_title = None
    for line in lines[:10]:
        if line.startswith("# ") and not line.startswith("# Author"):
            header_title = line[2:].strip()
            break

    if not header_title:
        return VerificationResult(
            f"content_header: {path}", False, "no title header found"
        )

    # Check if the body content (after headers) contains words from the title
    body_start = 0
    for i, line in enumerate(lines):
        if not line.startswith("#") and line.strip():
            body_start = i
            break

    body_text = " ".join(lines[body_start:body_start + 50]).lower()
    title_words = [w.lower() for w in re.findall(r"[a-z]+", header_title.lower()) if len(w) > 4]

    if not title_words:
        return VerificationResult(
            f"content_header: {path}", True, "no significant title words to check"
        )

    matches = sum(1 for w in title_words if w in body_text)
    ratio = matches / len(title_words)

    # Content header is a heuristic — 0% match is suspicious (possible wrong file),
    # but low matches on letters/extracted PDFs are expected. Only fail on 0%.
    passed = ratio > 0 or len(title_words) <= 2
    return VerificationResult(
        f"content_header: {path}",
        passed,
        f"{matches}/{len(title_words)} title words found in body ({ratio:.0%})"
    )


def verify_corpus_integrity():
    """Verify all corpus files match their manifest hashes and headers match content."""
    if not MANIFEST_FILE.exists():
        return [VerificationResult("corpus_integrity", False, "manifest.json not found")]

    manifest = json.loads(MANIFEST_FILE.read_text())
    results = []

    for entry in manifest.get("files", []):
        fpath = CORPUS_DIR / entry["path"]

        # Check existence
        if not fpath.exists():
            results.append(VerificationResult(
                f"corpus_file: {entry['path']}", False, "MISSING"
            ))
            continue

        # Check hash — manifest may use "hash" (keccak with 0x) or "sha256" (hex)
        expected = entry.get("hash") or entry.get("sha256")
        if expected:
            if expected.startswith("0x"):
                actual_hash = "0x" + keccak256(fpath.read_bytes()).hexdigest()
            else:
                import hashlib
                actual_hash = hashlib.sha256(fpath.read_bytes()).hexdigest()
            hash_match = actual_hash == expected
            if not hash_match:
                results.append(VerificationResult(
                    f"corpus_hash: {entry['path']}", False,
                    f"manifest says {expected[:18]}..., file is {actual_hash[:18]}..."
                ))
            else:
                results.append(VerificationResult(
                    f"corpus_hash: {entry['path']}", True, "hash matches manifest"
                ))

        # Check content header for .txt files
        if fpath.suffix == ".txt":
            results.append(verify_content_header(str(fpath.relative_to(CORPUS_DIR))))

    # Verify manifest hash itself
    manifest_data = MANIFEST_FILE.read_text()
    manifest_hash = "0x" + keccak256(manifest_data.encode()).hexdigest()
    results.append(VerificationResult(
        "manifest_hash",
        True,
        f"manifest hash: {manifest_hash}"
    ))

    return results


def verify_execution_record(execution_path):
    """Verify conditions in an execution record."""
    path = ROOT / execution_path if not Path(execution_path).is_absolute() else Path(execution_path)
    if not path.exists():
        return [VerificationResult("execution_record", False, f"not found: {path}")]

    record = json.loads(path.read_text())
    results = []

    # Check that the referenced decision exists
    decision_id = record.get("decisionId")
    if decision_id:
        results.append(VerificationResult("execution_has_decision_id", True, f"Decision #{decision_id}"))

    # Check corpus manifest hash if present
    claimed_hash = record.get("corpusManifestHash")
    if claimed_hash:
        if MANIFEST_FILE.exists():
            manifest_data = MANIFEST_FILE.read_text()
            actual_hash = "0x" + keccak256(manifest_data.encode()).hexdigest()
            matches = actual_hash == claimed_hash
            results.append(VerificationResult(
                "corpus_manifest_hash_match",
                matches,
                f"claimed {claimed_hash[:18]}..., actual {actual_hash[:18]}..."
            ))
        else:
            results.append(VerificationResult("corpus_manifest_hash_match", False, "manifest.json not found"))

    # Check modify conditions if present
    conditions = record.get("modifyConditions", {})
    for key, value in conditions.items():
        satisfied = "SATISFIED" in str(value).upper()
        results.append(VerificationResult(
            f"condition: {key}",
            satisfied,
            value
        ))

    return results


def verify_decision_hash(decision_path):
    """Verify a decision file's hash for on-chain comparison."""
    path = ROOT / decision_path if not Path(decision_path).is_absolute() else Path(decision_path)
    if not path.exists():
        return [VerificationResult("decision_hash", False, f"not found: {path}")]

    file_hash = "0x" + keccak256(path.read_bytes()).hexdigest()
    return [VerificationResult("decision_hash", True, f"keccak256: {file_hash}")]


# ---------------------------------------------------------------------------
# Issue integration
# ---------------------------------------------------------------------------

DETERMINISTIC_CHECKS = {"file_exists", "hash_match", "corpus_hash", "corpus_file", "manifest_hash", "decision_hash"}
SELF_ATTESTATION_CHECKS = {"condition", "content_header"}


def classify_result(result):
    """Classify a verification result as deterministic or self-attestation."""
    check_prefix = result.check_name.split(":")[0].strip()
    if check_prefix in DETERMINISTIC_CHECKS:
        return "deterministic"
    if check_prefix in SELF_ATTESTATION_CHECKS:
        return "self-attestation"
    return "other"


def format_results_for_issue(results):
    """Format verification results as a Markdown comment for GitHub Issues."""
    deterministic = []
    attestation = []
    other = []

    for r in results:
        cat = classify_result(r)
        status = "PASS" if r.passed else "FAIL"
        line = f"| `{r.check_name}` | {status} | {r.detail} |"
        if cat == "deterministic":
            deterministic.append(line)
        elif cat == "self-attestation":
            attestation.append(line)
        else:
            other.append(line)

    passed = sum(1 for r in results if r.passed)
    failed = sum(1 for r in results if not r.passed)
    all_passed = failed == 0

    lines = [
        "## Verification Results",
        "",
        f"**Status:** {'ALL PASSED' if all_passed else f'{failed} FAILED'}",
        f"**Checks:** {passed} passed, {failed} failed, {passed + failed} total",
        "",
    ]

    if deterministic:
        lines.extend([
            "### Deterministic Checks",
            "*These are objective, repeatable checks (hash matches, file existence).*",
            "",
            "| Check | Status | Detail |",
            "|-------|--------|--------|",
            *deterministic,
            "",
        ])

    if attestation:
        lines.extend([
            "### Self-Attestation Checks",
            "*These rely on string matching or heuristics — verify manually.*",
            "",
            "| Check | Status | Detail |",
            "|-------|--------|--------|",
            *attestation,
            "",
        ])

    if other:
        lines.extend([
            "### Other Checks",
            "",
            "| Check | Status | Detail |",
            "|-------|--------|--------|",
            *other,
            "",
        ])

    if all_passed:
        lines.extend([
            "---",
            "**Recommendation:** All checks passed. Human Executor may close this issue after review.",
            "*verify.py does NOT auto-close. HE must confirm and close manually.*",
        ])
    else:
        lines.extend([
            "---",
            f"**Recommendation:** {failed} check(s) failed. Do NOT close until failures are resolved.",
        ])

    return "\n".join(lines)


def post_to_issues(results, proposal_id=None):
    """Post verification results as comments on matching GitHub issues."""
    comment_body = format_results_for_issue(results)

    with tempfile.NamedTemporaryFile(mode="w", suffix=".md", delete=False) as f:
        f.write(comment_body)
        body_file = f.name

    # Find matching issues
    cmd = ["gh", "issue", "list", "--repo", REPO, "--state", "open",
           "--label", "governance-execution", "--limit", "200",
           "--json", "title,number"]
    result = subprocess.run(cmd, capture_output=True, text=True, cwd=ROOT)
    if result.returncode != 0:
        print(f"WARNING: Could not list issues: {result.stderr.strip()}")
        Path(body_file).unlink(missing_ok=True)
        return

    issues = json.loads(result.stdout)
    posted = 0

    for issue in issues:
        title = issue.get("title", "")
        # Match by proposal ID in title key
        if proposal_id and f"[P{proposal_id:03d}" in title:
            subprocess.run(
                ["gh", "issue", "comment", str(issue["number"]),
                 "--repo", REPO, "--body-file", body_file],
                capture_output=True, text=True, cwd=ROOT
            )
            print(f"  Posted verification results on #{issue['number']}: {title}")
            posted += 1

    Path(body_file).unlink(missing_ok=True)
    if posted == 0:
        print(f"  No open issues found for proposal {proposal_id}")
    else:
        print(f"  Posted to {posted} issue(s)")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description="OpenInnovate DAO Condition Verification")
    parser.add_argument("--execution", help="Path to execution record JSON to verify")
    parser.add_argument("--corpus-integrity", action="store_true", help="Verify all corpus files against manifest")
    parser.add_argument("--decision", help="Path to decision JSON to hash-check")
    parser.add_argument("--check-hash", action="store_true", help="Compute and display decision hash")
    parser.add_argument("--file-exists", help="Check if a file exists at path")
    parser.add_argument("--hash-match", nargs=2, metavar=("PATH", "HASH"), help="Check file hash against expected")
    parser.add_argument("--check-issues", action="store_true",
                        help="Post verification results as comments on matching GitHub issues")
    parser.add_argument("--proposal-id", type=int,
                        help="Proposal ID to match issues against (used with --check-issues)")
    args = parser.parse_args()

    results = []

    if args.execution:
        print(f"Verifying execution record: {args.execution}")
        print("=" * 60)
        results = verify_execution_record(args.execution)

    elif args.corpus_integrity:
        print("Verifying corpus integrity against manifest")
        print("=" * 60)
        results = verify_corpus_integrity()

    elif args.decision and args.check_hash:
        print(f"Computing hash for: {args.decision}")
        print("=" * 60)
        results = verify_decision_hash(args.decision)

    elif args.file_exists:
        results = [verify_file_exists(args.file_exists)]

    elif args.hash_match:
        results = [verify_hash_match(args.hash_match[0], args.hash_match[1])]

    else:
        parser.print_help()
        return

    # Print results
    passed = 0
    failed = 0
    for r in results:
        print(r)
        if r.passed:
            passed += 1
        else:
            failed += 1

    print("=" * 60)
    print(f"Results: {passed} passed, {failed} failed, {passed + failed} total")

    if args.check_issues and args.proposal_id:
        print(f"\nPosting results to GitHub issues for Proposal #{args.proposal_id}...")
        post_to_issues(results, args.proposal_id)
    elif args.check_issues and not args.proposal_id:
        print("\nWARNING: --check-issues requires --proposal-id to match issues")

    if failed > 0:
        print("\nVERIFICATION FAILED")
        sys.exit(1)
    else:
        print("\nVERIFICATION PASSED")
        sys.exit(0)


if __name__ == "__main__":
    main()
