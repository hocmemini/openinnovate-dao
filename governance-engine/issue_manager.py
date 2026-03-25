#!/usr/bin/env python3
"""
OpenInnovate DAO — Issue Manager v1.0

Creates and manages GitHub Issues from governance evaluation output.
Idempotent: uses canonical keys in issue titles for deduplication.

Usage:
    python issue_manager.py --decision governance/decisions/006-name.json --proposal governance/proposals/006-name.json
    python issue_manager.py --diverge --decision-id 7 --reason "HE override: ..."
"""

import argparse
import json
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
REPO = "hocmemini/openinnovate-dao"


# ---------------------------------------------------------------------------
# GitHub CLI helpers
# ---------------------------------------------------------------------------

def gh(*args, input_text=None):
    """Run a gh CLI command and return stdout. Returns None on failure."""
    cmd = ["gh"] + list(args)
    result = subprocess.run(
        cmd, capture_output=True, text=True,
        input=input_text, cwd=ROOT
    )
    if result.returncode != 0:
        print(f"  gh error: {result.stderr.strip()}", file=sys.stderr)
        return None
    return result.stdout.strip()


def list_issues(labels=None, state="all"):
    """List issues, optionally filtered by labels."""
    cmd = ["issue", "list", "--repo", REPO, "--state", state, "--limit", "200", "--json", "title,number,state,labels"]
    if labels:
        cmd.extend(["--label", labels])
    raw = gh(*cmd)
    if not raw:
        return []
    return json.loads(raw)


def issue_exists(canonical_key):
    """Check if an issue with the given canonical key in title already exists."""
    issues = list_issues()
    for issue in issues:
        if canonical_key in issue.get("title", ""):
            return issue["number"]
    return None


def create_issue(title, body, labels):
    """Create a GitHub issue using --body-file for shell injection prevention."""
    with tempfile.NamedTemporaryFile(mode="w", suffix=".md", delete=False) as f:
        f.write(body)
        body_file = f.name

    cmd = ["issue", "create", "--repo", REPO, "--title", title, "--body-file", body_file]
    for label in labels:
        cmd.extend(["--label", label])

    result = gh(*cmd)
    Path(body_file).unlink(missing_ok=True)

    if result:
        # Extract issue number from URL
        parts = result.strip().split("/")
        if parts:
            try:
                return int(parts[-1])
            except ValueError:
                pass
    return None


def add_comment(issue_number, body):
    """Add a comment to an existing issue using --body-file."""
    with tempfile.NamedTemporaryFile(mode="w", suffix=".md", delete=False) as f:
        f.write(body)
        body_file = f.name

    gh("issue", "comment", str(issue_number), "--repo", REPO, "--body-file", body_file)
    Path(body_file).unlink(missing_ok=True)


def close_issue(issue_number, comment=None):
    """Close an issue, optionally with a comment."""
    if comment:
        add_comment(issue_number, comment)
    gh("issue", "close", str(issue_number), "--repo", REPO)


def add_label(issue_number, label):
    """Add a label to an issue."""
    gh("issue", "edit", str(issue_number), "--repo", REPO, "--add-label", label)


def ensure_label(label):
    """Create a label if it doesn't exist."""
    gh("label", "create", label, "--repo", REPO, "--force")


# ---------------------------------------------------------------------------
# Issue creation from decisions
# ---------------------------------------------------------------------------

def build_milestone_body(milestone, proposal_id, decision_path, commit_sha=None):
    """Build issue body for a milestone issue."""
    lines = [
        f"**Proposal:** #{proposal_id}",
        f"**Phase:** {milestone.get('phase', 'N/A')}",
        f"**Domain:** {milestone.get('domain', 'general')}",
        f"**Verification:** {milestone.get('verificationType', 'manual')}",
        "",
        "## Description",
        milestone.get("description", "No description provided."),
        "",
    ]

    if milestone.get("dependencies"):
        lines.append("## Dependencies")
        for dep in milestone["dependencies"]:
            lines.append(f"- {dep}")
        lines.append("")

    if milestone.get("targetDate"):
        lines.append(f"**Target date:** {milestone['targetDate']}")
        lines.append("")

    # Link to full reasoning tree
    decision_rel = Path(decision_path).relative_to(ROOT) if Path(decision_path).is_absolute() else Path(decision_path)
    if commit_sha:
        tree_url = f"https://github.com/{REPO}/blob/{commit_sha}/{decision_rel}"
    else:
        tree_url = f"https://github.com/{REPO}/blob/main/{decision_rel}"
    lines.append(f"**Reasoning tree:** [{decision_rel}]({tree_url})")

    return "\n".join(lines)


def build_condition_body(condition, index, proposal_id, decision_path, commit_sha=None):
    """Build issue body for a MODIFY condition issue."""
    decision_rel = Path(decision_path).relative_to(ROOT) if Path(decision_path).is_absolute() else Path(decision_path)
    if commit_sha:
        tree_url = f"https://github.com/{REPO}/blob/{commit_sha}/{decision_rel}"
    else:
        tree_url = f"https://github.com/{REPO}/blob/main/{decision_rel}"

    return "\n".join([
        f"**Proposal:** #{proposal_id}",
        f"**Condition index:** {index}",
        f"**Type:** MODIFY condition — must be satisfied before execution",
        "",
        "## Condition",
        condition,
        "",
        f"**Reasoning tree:** [{decision_rel}]({tree_url})",
    ])


def create_issues_from_decision(decision_path, proposal_path):
    """Create GitHub issues from a governance decision."""
    decision_path = Path(decision_path)
    proposal_path = Path(proposal_path)

    decision = json.loads(decision_path.read_text())
    proposal = json.loads(proposal_path.read_text())

    proposal_id = proposal.get("proposalId", "???")
    recommendation = decision.get("recommendation", "UNKNOWN")
    score = decision.get("maximAlignmentScore", "N/A")
    title = proposal.get("title", decision.get("title", "Untitled"))
    commit_sha = decision.get("commitSha")

    print(f"Processing decision for Proposal #{proposal_id}: {recommendation} ({score}/100)")

    # Ensure labels exist
    for label in ["pending-review", "governance-execution", f"proposal-{proposal_id:03d}"]:
        ensure_label(label)

    created = 0
    skipped = 0

    if recommendation == "APPROVE":
        # Create milestone issues from structured milestones array
        milestones = proposal.get("milestones", [])
        if not milestones:
            # Fall back: create a single tracker issue
            key = f"[P{proposal_id:03d}]"
            existing = issue_exists(key)
            if existing:
                print(f"  SKIP: {key} already exists as #{existing}")
                skipped += 1
            else:
                body = build_milestone_body(
                    {"description": title, "phase": "all", "domain": "general"},
                    proposal_id, str(decision_path), commit_sha
                )
                num = create_issue(
                    f"{key} {title}",
                    body,
                    ["pending-review", "governance-execution", f"proposal-{proposal_id:03d}"]
                )
                if num:
                    print(f"  CREATED: #{num} — {key} {title}")
                    created += 1
        else:
            for milestone in milestones:
                m_id = milestone.get("id", "0")
                domain = milestone.get("domain", "general")
                phase = milestone.get("phase", 1)
                key = f"[P{proposal_id:03d}-{phase}.{m_id}]"

                existing = issue_exists(key)
                if existing:
                    print(f"  SKIP: {key} already exists as #{existing}")
                    skipped += 1
                    continue

                body = build_milestone_body(milestone, proposal_id, str(decision_path), commit_sha)
                labels = ["pending-review", "governance-execution", f"proposal-{proposal_id:03d}"]
                if milestone.get("dependencies"):
                    labels.append("blocked")

                num = create_issue(f"{key} {milestone.get('description', 'Milestone')}", body, labels)
                if num:
                    print(f"  CREATED: #{num} — {key}")
                    created += 1

        # Post evaluation summary as comment on the tracker issue
        tracker_key = f"[P{proposal_id:03d}]"
        tracker_num = issue_exists(tracker_key)
        if tracker_num:
            summary = build_evaluation_summary(decision, proposal, str(decision_path), commit_sha)
            add_comment(tracker_num, summary)
            print(f"  COMMENT: Posted evaluation summary on #{tracker_num}")

    elif recommendation == "MODIFY":
        # Create condition issues
        conditions = decision.get("reasoningTree", {}).get("modifyConditions", [])
        if not conditions:
            conditions = decision.get("modifyConditions", [])

        for i, condition in enumerate(conditions, 1):
            cond_text = condition if isinstance(condition, str) else json.dumps(condition)
            key = f"[P{proposal_id:03d}-cond-{i}]"

            existing = issue_exists(key)
            if existing:
                print(f"  SKIP: {key} already exists as #{existing}")
                skipped += 1
                continue

            body = build_condition_body(cond_text, i, proposal_id, str(decision_path), commit_sha)
            num = create_issue(
                f"{key} MODIFY condition: {cond_text[:80]}",
                body,
                ["pending-review", "governance-execution", f"proposal-{proposal_id:03d}", "modify-condition"]
            )
            if num:
                print(f"  CREATED: #{num} — {key}")
                created += 1

    print(f"\nDone: {created} created, {skipped} skipped (already exist)")
    return created


def build_evaluation_summary(decision, proposal, decision_path, commit_sha=None):
    """Build a summary comment (not the full reasoning tree) for posting on issues."""
    recommendation = decision.get("recommendation", "UNKNOWN")
    score = decision.get("maximAlignmentScore", "N/A")
    model = decision.get("model", "unknown")
    evaluated_at = decision.get("evaluatedAt", "unknown")

    decision_rel = Path(decision_path).relative_to(ROOT) if Path(decision_path).is_absolute() else Path(decision_path)
    if commit_sha:
        tree_url = f"https://github.com/{REPO}/blob/{commit_sha}/{decision_rel}"
    else:
        tree_url = f"https://github.com/{REPO}/blob/main/{decision_rel}"

    # Extract corpus sources summary
    sources = decision.get("reasoningTree", {}).get("corpusSources", [])
    if not sources:
        sources = decision.get("corpusSources", [])
    source_lines = []
    for s in sources[:6]:
        src = s.get("source", "unknown")
        weight = s.get("weight", 0)
        source_lines.append(f"- `{src}` (weight: {weight})")

    lines = [
        f"## Algorithmic Manager Evaluation",
        "",
        f"**Recommendation:** {recommendation}",
        f"**Maxim Alignment Score:** {score}/100",
        f"**Model:** {model}",
        f"**Evaluated:** {evaluated_at}",
        "",
        "### Corpus Sources",
        *source_lines,
        "",
        f"**Full reasoning tree:** [{decision_rel}]({tree_url})",
        "",
        "---",
        "*This summary was auto-generated by issue_manager.py. The full reasoning tree contains the complete analysis, alternatives considered, and traceability chain.*",
    ]
    return "\n".join(lines)


# ---------------------------------------------------------------------------
# Divergence workflow
# ---------------------------------------------------------------------------

def handle_divergence(decision_id, reason, divergence_hash=None):
    """Close all AM-generated issues for a decision with 'diverged' label."""
    ensure_label("diverged")
    ensure_label("he-rejected-diverged")

    issues = list_issues(state="open")
    closed = 0

    for issue in issues:
        title = issue.get("title", "")
        labels = [l["name"] for l in issue.get("labels", [])]

        # Match issues from this decision's proposal
        if "governance-execution" not in labels:
            continue
        if "pending-review" not in labels and "governance-execution" not in labels:
            continue

        comment = (
            f"## Divergence Notice\n\n"
            f"Human Executor has diverged from Decision #{decision_id}.\n\n"
            f"**Reason:** {reason}\n"
        )
        if divergence_hash:
            comment += f"**On-chain divergence hash:** `{divergence_hash}`\n"

        close_issue(issue["number"], comment)
        add_label(issue["number"], "diverged")
        closed += 1
        print(f"  CLOSED: #{issue['number']} — {title}")

    print(f"\nDivergence processed: {closed} issues closed")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description="OpenInnovate DAO Issue Manager")
    parser.add_argument("--decision", help="Path to decision JSON")
    parser.add_argument("--proposal", help="Path to proposal JSON")
    parser.add_argument("--diverge", action="store_true", help="Run divergence workflow")
    parser.add_argument("--decision-id", type=int, help="On-chain decision ID (for divergence)")
    parser.add_argument("--reason", help="Divergence reason")
    parser.add_argument("--divergence-hash", help="On-chain divergence hash")
    args = parser.parse_args()

    if args.diverge:
        if not args.decision_id or not args.reason:
            print("ERROR: --diverge requires --decision-id and --reason")
            sys.exit(1)
        handle_divergence(args.decision_id, args.reason, args.divergence_hash)

    elif args.decision and args.proposal:
        create_issues_from_decision(args.decision, args.proposal)

    else:
        parser.print_help()
        sys.exit(1)


if __name__ == "__main__":
    main()
