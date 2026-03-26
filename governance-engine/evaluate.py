#!/usr/bin/env python3
"""
OpenInnovate DAO — Governance Evaluation Engine v1.0

Loads a proposal, retrieves relevant corpus context via weighted TF-IDF,
calls Claude via the Anthropic API with the governance system prompt,
and produces a structured Reasoning Tree.

Usage:
    python evaluate.py --proposal governance/proposals/003-financial-infrastructure.json
    python evaluate.py --proposal governance/proposals/003-financial-infrastructure.json --dry-run
    python evaluate.py --proposal governance/proposals/003-financial-infrastructure.json --commit-onchain
"""

import argparse
import json
import os
import re
import subprocess
import sys
import math
from hashlib import sha3_256 as keccak256
from collections import Counter
from pathlib import Path
from datetime import datetime, timezone

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

ROOT = Path(__file__).resolve().parent.parent
CORPUS_DIR = ROOT / "corpus"
WEIGHTS_FILE = CORPUS_DIR / "weights.json"
PROMPT_DIR = Path(__file__).resolve().parent
SYSTEM_PROMPT_VERSIONS = [
    ("1.1", PROMPT_DIR / "system-prompt-v1.1.md"),
    ("1.0", PROMPT_DIR / "system-prompt-v1.0.md"),
]
REPO_SLUG = "hocmemini/openinnovate-dao"

# Maximum corpus context to inject (chars). Leave room for system prompt,
# proposal, and response in a 200K-token context window.
MAX_CORPUS_CONTEXT = 400_000  # ~60K tokens

# Model to use for governance evaluations
MODEL = os.environ.get("GOVERNANCE_MODEL", "claude-opus-4-6")


def get_commit_sha():
    """Get the current git commit SHA."""
    try:
        result = subprocess.run(
            ["git", "rev-parse", "HEAD"],
            capture_output=True, text=True, check=True, cwd=ROOT
        )
        return result.stdout.strip()
    except (subprocess.CalledProcessError, FileNotFoundError):
        return None


def load_weights():
    """Load tier weights from weights.json."""
    with open(WEIGHTS_FILE) as f:
        data = json.load(f)
    return data.get("global_tier_weights", {})


def load_corpus_documents():
    """Load all corpus documents with metadata."""
    docs = []
    for tier_dir in sorted(CORPUS_DIR.iterdir()):
        if not tier_dir.is_dir() or tier_dir.name.startswith("."):
            continue
        tier_name = tier_dir.name  # e.g., "tier-1-governance"
        for fpath in sorted(tier_dir.rglob("*.txt")):
            text = fpath.read_text(errors="replace")
            docs.append({
                "path": str(fpath.relative_to(CORPUS_DIR)),
                "tier": tier_name,
                "text": text,
                "size": len(text),
            })
    return docs


def tokenize(text):
    """Simple whitespace + punctuation tokenizer."""
    return re.findall(r"[a-z0-9]+", text.lower())


def compute_tfidf_relevance(proposal_text, documents):
    """Score documents by TF-IDF relevance to the proposal."""
    proposal_tokens = tokenize(proposal_text)
    proposal_tf = Counter(proposal_tokens)

    # IDF across all documents
    doc_count = len(documents)
    doc_freq = Counter()
    doc_tokens = []
    for doc in documents:
        tokens = set(tokenize(doc["text"][:10000]))  # Sample first 10K chars
        doc_tokens.append(tokens)
        for token in tokens:
            doc_freq[token] += 1

    idf = {
        term: math.log(doc_count / (1 + doc_freq.get(term, 0)))
        for term in proposal_tf
    }

    # Score each document
    for i, doc in enumerate(documents):
        tokens = doc_tokens[i]
        score = sum(
            proposal_tf[term] * idf.get(term, 0)
            for term in tokens
            if term in proposal_tf
        )
        doc["relevance_score"] = score

    return documents


def select_corpus_context(documents, tier_weights, max_chars):
    """Select most relevant documents, weighted by tier, up to max_chars."""
    # Apply tier weight multiplier to relevance scores
    for doc in documents:
        tier_key = doc["tier"].replace("-", "_")  # tier-1-governance -> tier_1_governance
        weight = tier_weights.get(tier_key, 1.0)
        doc["weighted_score"] = doc.get("relevance_score", 0) * weight

    # Sort by weighted score descending
    ranked = sorted(documents, key=lambda d: d["weighted_score"], reverse=True)

    # Select documents until we fill the budget
    selected = []
    total_chars = 0
    for doc in ranked:
        if total_chars + doc["size"] > max_chars:
            # Try to include a truncated version
            remaining = max_chars - total_chars
            if remaining > 2000:  # Worth including a truncation
                doc = dict(doc)  # copy
                doc["text"] = doc["text"][:remaining] + "\n\n[... truncated for context limit ...]"
                doc["size"] = remaining
                selected.append(doc)
                total_chars += remaining
            break
        selected.append(doc)
        total_chars += doc["size"]

    return selected


def format_corpus_context(selected_docs):
    """Format selected documents into a context string."""
    parts = []
    parts.append("=" * 60)
    parts.append("CONSTITUTIONAL CORPUS — RETRIEVED CONTEXT")
    parts.append(f"Documents retrieved: {len(selected_docs)}")
    parts.append("=" * 60)

    for doc in selected_docs:
        parts.append("")
        parts.append("-" * 40)
        parts.append(f"Source: {doc['path']}")
        parts.append(f"Tier: {doc['tier']} (weight: {doc.get('weighted_score', 0):.2f})")
        parts.append("-" * 40)
        parts.append(doc["text"])

    return "\n".join(parts)


def call_anthropic(system_prompt, user_message, model):
    """Call the Anthropic API and return the response text."""
    try:
        import anthropic
    except ImportError:
        print("ERROR: anthropic package not installed. Run: pip install anthropic")
        sys.exit(1)

    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        print("ERROR: ANTHROPIC_API_KEY environment variable not set.")
        sys.exit(1)

    client = anthropic.Anthropic(api_key=api_key)

    print(f"Calling Anthropic API (model: {model})...")
    print(f"System prompt: {len(system_prompt)} chars")
    print(f"User message: {len(user_message)} chars")

    response = client.messages.create(
        model=model,
        max_tokens=16384,
        system=system_prompt,
        messages=[{"role": "user", "content": user_message}],
    )

    return response.content[0].text


def extract_json_from_response(text):
    """Extract JSON object from Claude's response."""
    # Try to find JSON block
    json_match = re.search(r"```json\s*\n(.*?)\n```", text, re.DOTALL)
    if json_match:
        return json.loads(json_match.group(1))

    # Try to find raw JSON object
    brace_start = text.find("{")
    if brace_start >= 0:
        depth = 0
        for i in range(brace_start, len(text)):
            if text[i] == "{":
                depth += 1
            elif text[i] == "}":
                depth -= 1
                if depth == 0:
                    return json.loads(text[brace_start : i + 1])

    raise ValueError("No valid JSON found in response")


def main():
    parser = argparse.ArgumentParser(description="OpenInnovate DAO Governance Evaluator")
    parser.add_argument("--proposal", required=True, help="Path to proposal JSON file")
    parser.add_argument("--dry-run", action="store_true", help="Generate reasoning tree without committing")
    parser.add_argument("--commit-onchain", action="store_true", help="Commit hashes on-chain after evaluation")
    parser.add_argument("--model", default=None, help=f"Override model (default: {MODEL})")
    parser.add_argument("--output", default=None, help="Output path for reasoning tree JSON")
    parser.add_argument("--create-issues", action="store_true",
                        help="Invoke issue_manager.py to create GitHub issues after evaluation")
    args = parser.parse_args()

    model = args.model or MODEL

    # Load proposal
    proposal_path = ROOT / args.proposal if not os.path.isabs(args.proposal) else Path(args.proposal)
    with open(proposal_path) as f:
        proposal = json.load(f) if proposal_path.suffix == ".json" else {"body": f.read()}
    proposal_text = json.dumps(proposal, indent=2)
    print(f"Loaded proposal: {proposal_path.name}")

    # Load system prompt (version-aware: try v1.1 first, fall back to v1.0)
    system_prompt = None
    system_prompt_version = None
    for version, path in SYSTEM_PROMPT_VERSIONS:
        if path.exists():
            system_prompt = path.read_text()
            system_prompt_version = version
            print(f"Loaded system prompt v{version} ({len(system_prompt)} chars)")
            break
    if system_prompt is None:
        print("ERROR: No system prompt found.")
        sys.exit(1)

    # Load corpus and compute relevance
    print("Loading corpus...")
    tier_weights = load_weights()
    documents = load_corpus_documents()
    print(f"Loaded {len(documents)} corpus documents")

    documents = compute_tfidf_relevance(proposal_text, documents)
    selected = select_corpus_context(documents, tier_weights, MAX_CORPUS_CONTEXT)
    corpus_context = format_corpus_context(selected)
    print(f"Selected {len(selected)} documents ({len(corpus_context)} chars) for context")

    # Build the user message
    user_message = f"""## GOVERNANCE PROPOSAL FOR EVALUATION

{proposal_text}

## CONSTITUTIONAL CORPUS CONTEXT

The following corpus documents have been retrieved based on relevance to this proposal, weighted by tier:

{corpus_context}

## INSTRUCTIONS

Evaluate this proposal following the evaluation framework in your system prompt. Produce a complete Reasoning Tree as a JSON object. Include corpus citations, analysis steps, alternatives considered, Maxim Alignment Score, and traceability chain.

Return ONLY the JSON reasoning tree object."""

    # Call the API
    if args.dry_run:
        print("\n[DRY RUN] Would call Anthropic API with:")
        print(f"  Model: {model}")
        print(f"  System prompt: {len(system_prompt)} chars")
        print(f"  User message: {len(user_message)} chars")
        print(f"  Corpus documents: {len(selected)}")
        for doc in selected[:10]:
            print(f"    - {doc['path']} (score: {doc['weighted_score']:.2f})")
        if len(selected) > 10:
            print(f"    ... and {len(selected) - 10} more")
        return

    response_text = call_anthropic(system_prompt, user_message, model)

    # Parse the response
    try:
        reasoning_tree = extract_json_from_response(response_text)
    except (json.JSONDecodeError, ValueError) as e:
        print(f"WARNING: Could not parse JSON from response: {e}")
        print("Raw response saved to /tmp/governance-raw-response.txt")
        Path("/tmp/governance-raw-response.txt").write_text(response_text)
        return

    # Add metadata
    reasoning_tree["systemPromptVersion"] = system_prompt_version
    reasoning_tree["model"] = model
    reasoning_tree["evaluatedAt"] = datetime.now(timezone.utc).isoformat()

    commit_sha = get_commit_sha()
    if commit_sha:
        reasoning_tree["commitSha"] = commit_sha
        proposal_rel = proposal_path.relative_to(ROOT)
        reasoning_tree["proposalUri"] = (
            f"https://raw.githubusercontent.com/{REPO_SLUG}/{commit_sha}/{proposal_rel}"
        )

    # Determine output path
    if args.output:
        output_path = Path(args.output)
    else:
        proposal_name = proposal_path.stem
        proposal_num = re.search(r"(\d+)", proposal_name)
        num = proposal_num.group(1) if proposal_num else "unknown"
        output_path = ROOT / "governance" / "decisions" / f"{num}-{proposal_name.split('-', 1)[-1] if '-' in proposal_name else proposal_name}.json"

    # Save reasoning tree
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, "w") as f:
        json.dump(reasoning_tree, f, indent=2)
    print(f"\nReasoning tree saved to: {output_path}")

    # Compute hash
    with open(output_path, "rb") as f:
        tree_hash = "0x" + keccak256(f.read()).hexdigest()
    print(f"Reasoning tree hash: {tree_hash}")

    # Print summary
    score = reasoning_tree.get("maximAlignmentScore", "N/A")
    rec = reasoning_tree.get("recommendation", "N/A")
    print(f"\nDecision: {rec}")
    print(f"Maxim Alignment Score: {score}/100")

    if args.commit_onchain:
        print("\n[ON-CHAIN] Would commit hash to Base L2 (not yet implemented in this script)")
        print(f"  Contract: 0x3efDCccF7b141B5dA4B21478221B0bf0cfdF7536")
        print(f"  Hash: {tree_hash}")

    if args.create_issues and rec in ("APPROVE", "MODIFY"):
        issue_manager = Path(__file__).resolve().parent / "issue_manager.py"
        if issue_manager.exists():
            print(f"\nCreating GitHub issues for {rec} decision...")
            subprocess.run(
                [sys.executable, str(issue_manager),
                 "--decision", str(output_path),
                 "--proposal", str(proposal_path)],
                check=False
            )
        else:
            print(f"\nWARNING: --create-issues passed but {issue_manager} not found")


if __name__ == "__main__":
    main()
