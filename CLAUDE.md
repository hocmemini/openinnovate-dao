# OpenInnovate DAO

AI-augmented direct democracy on Base L2, governed by a weighted constitutional corpus.

## Root Thesis Maxim

> "Every law, institution, and system of governance should be evaluated by how well it serves the people it governs — not by tradition, precedent, or the convenience of those in power."

## Key Commands

```bash
cd contracts/
forge build    # compile Solidity contracts
forge test     # run the Foundry test suite
```

## Contract

- **Chain:** Base (Chain ID 8453)
- **Contract:** `0x3efDCccF7b141B5dA4B21478221B0bf0cfdF7536` (OpenInnovateGovernance — UUPS upgradeable)
- **Token:** OpenInnovateToken (OIT) — ERC-20 votes token
- **Owner:** `0xC91ED1978a1b89D0321fcF6BFf919a0f785d5EC7`
- **RPC:** `https://mainnet.base.org`
- **Explorer:** `https://basescan.org/address/0x3efDCccF7b141B5dA4B21478221B0bf0cfdF7536`

## Foundry / cast Setup

```bash
export PATH=$PATH:/home/reso/.foundry/bin
```

All `cast` commands below assume this PATH and use these shared vars:

```bash
CONTRACT=0x3efDCccF7b141B5dA4B21478221B0bf0cfdF7536
RPC=https://mainnet.base.org
KEY=$(grep DEPLOYER_PRIVATE_KEY .env | cut -d= -f2)
```

## On-Chain Operations

### Submit Proposal

```bash
# 1. Hash the proposal JSON
HASH=$(cast keccak256 "$(cat governance/proposals/XXX-name.json)")

# 2. Submit on-chain
cast send $CONTRACT "submitProposal(bytes32,string)" \
  $HASH \
  "https://github.com/hocmemini/openinnovate-dao/blob/main/governance/proposals/XXX-name.json" \
  --private-key $KEY --rpc-url $RPC
```

Returns: proposalId (sequential, check with `cast call $CONTRACT "proposalCount()(uint256)" --rpc-url $RPC`)

### Record Decision

```bash
# 1. Hash the decision JSON
HASH=$(cast keccak256 "$(cat governance/decisions/XXX-name.json)")

# 2. Record on-chain (proposalId = on-chain proposal number, score = maximAlignmentScore)
cast send $CONTRACT "recordDecision(uint256,bytes32,uint8,string)" \
  <proposalId> \
  $HASH \
  <score> \
  "https://github.com/hocmemini/openinnovate-dao/blob/main/governance/decisions/XXX-name.json" \
  --private-key $KEY --rpc-url $RPC
```

Returns: decisionId (sequential, check with `cast call $CONTRACT "decisionCount()(uint256)" --rpc-url $RPC`)

### Attest Execution

```bash
# 1. Create execution record at governance/executions/XXX-name.json
# 2. Hash it
HASH=$(cast keccak256 "$(cat governance/executions/XXX-name.json)")

# 3. Attest on-chain (decisionId = on-chain decision number)
cast send $CONTRACT "attestExecution(uint256,bytes32)" \
  <decisionId> \
  $HASH \
  --private-key $KEY --rpc-url $RPC
```

### Record Divergence

```bash
# 1. Create divergence record, hash it
HASH=$(cast keccak256 "$(cat governance/divergences/XXX-name.json)")

# 2. Record on-chain
cast send $CONTRACT "recordDivergence(uint256,bytes32,string)" \
  <decisionId> \
  $HASH \
  "https://github.com/hocmemini/openinnovate-dao/blob/main/governance/divergences/XXX-name.json" \
  --private-key $KEY --rpc-url $RPC
```

### Read On-Chain State

```bash
# Counts
cast call $CONTRACT "proposalCount()(uint256)" --rpc-url $RPC
cast call $CONTRACT "decisionCount()(uint256)" --rpc-url $RPC

# Get records (returns tuples)
cast call $CONTRACT "getProposal(uint256)((bytes32,string,address,uint256))" <id> --rpc-url $RPC
cast call $CONTRACT "getDecision(uint256)((uint256,bytes32,uint8,string,address,bool,uint256))" <id> --rpc-url $RPC
cast call $CONTRACT "getAttestation(uint256)((bytes32,address,uint256))" <id> --rpc-url $RPC
cast call $CONTRACT "getDivergence(uint256)((uint256,bytes32,string,address,uint256))" <id> --rpc-url $RPC

# Check if attested (executionHash != 0x000...0)
cast call $CONTRACT "getAttestation(uint256)((bytes32,address,uint256))" <decisionId> --rpc-url $RPC
```

## Governance Pipeline (evaluate.py)

```bash
ANTHROPIC_API_KEY=$(grep ANTHROPIC_API_KEY .env | cut -d= -f2) \
  python3 governance-engine/evaluate.py \
  --proposal governance/proposals/XXX-name.json \
  --model claude-sonnet-4-6
```

Output: `governance/decisions/XXX-name.json` (reasoning tree with recommendation and score)

evaluate.py uses version-aware prompt loading: tries v1.1 first, falls back to v1.0. The `systemPromptVersion` field in output reflects which prompt was loaded.

## CEO Strategic Recommendations (recommend.py)

```bash
# Gather DAO state only (no API call)
ANTHROPIC_API_KEY=$(grep ANTHROPIC_API_KEY .env | cut -d= -f2) \
  python3 governance-engine/recommend.py --state-only

# Dry run — call API but don't create issues
ANTHROPIC_API_KEY=$(grep ANTHROPIC_API_KEY .env | cut -d= -f2) \
  python3 governance-engine/recommend.py --dry-run

# Full run — create GitHub issues from recommendations
ANTHROPIC_API_KEY=$(grep ANTHROPIC_API_KEY .env | cut -d= -f2) \
  python3 governance-engine/recommend.py --create-issues
```

Output: `governance/recommendations/strategic-review-YYYYMMDD.json`

## CEO Content Review (review.py)

```bash
# Review a publication before release
ANTHROPIC_API_KEY=$(grep ANTHROPIC_API_KEY .env | cut -d= -f2) \
  python3 governance-engine/review.py \
  --content path/to/article.md \
  --category publication

# Categories: publication, legal, financial, technical
# Flags: --dry-run, --output path.json, --model
```

Output: `governance/reviews/{category}-{stem}-{timestamp}.json`

Category-specific corpus weight overrides: legal → tier-4 heavy (2.0x), financial → tier-1 heavy (1.5x), technical → tier-3 heavy (1.5x), publication → tier-2 heavy (1.3x).

## Verification (verify.py)

```bash
python3 governance-engine/verify.py
```

## GitHub Repo

- **Repo:** `hocmemini/openinnovate-dao`
- **Project board:** "OpenInnovate Governance" (public, linked to repo)
- **Branch protection:** PRs required (1 approval), force-push blocked, admin bypass enabled for development
- **Issue templates:** `governance-milestone.yml`, `governance-proposal.yml`
- **Issue key format:** `[P{proposalId}-{phase}.{index}]` for milestones, `[P{proposalId}-rec-{i}]` for CEO recommendations, `[P{proposalId}]` for trackers

## Directory Structure

```
openinnovate-dao/
  contracts/              # Foundry project (Solidity + tests) — DO NOT modify outside normal workflow
  corpus/                 # Constitutional texts, tiered and weighted
    tier-1-governance/    # Buffett letters, founding principles
    tier-2-civic/         # US Constitution, Ostrom commons, Tocqueville
    tier-3-systems/       # Meadows, systems thinking
    tier-4-wyoming/       # Wyoming DAO statutes
    weights.json          # Document weight configuration
    manifest.json         # File manifest with hashes (149 files, 5.6MB)
  governance/
    proposals/            # Proposal JSONs (input to evaluate.py)
    decisions/            # Reasoning tree JSONs (output of evaluate.py)
    executions/           # Execution records (input to attestExecution)
    divergences/          # Divergence records (when HE overrides AM)
  governance-engine/      # Pipeline scripts and system prompts
    evaluate.py           # Constitutional evaluation engine (--create-issues flag)
    issue_manager.py      # Idempotent issue creation from decisions + followOnRecommendations
    recommend.py          # CEO proactive strategic recommendations
    review.py             # CEO content review gate (publication/legal/financial/technical)
    verify.py             # Verification checks
    system-prompt-v1.0.md # AM evaluation prompt (original)
    system-prompt-v1.1.md # AM evaluation prompt (adds followOnRecommendations, Step 5)
    system-prompt-recommend-v1.0.md  # CEO strategic planning prompt
    system-prompt-review-v1.0.md     # CEO content review prompt
  frontend/               # Transparency UI (Next.js on Vercel at dao.openinnovate.org)
  .github/
    ISSUE_TEMPLATE/       # governance-milestone.yml, governance-proposal.yml
  CLAUDE.md               # This file
```

## Milestone Manifest Format

Future proposals with multi-phase roadmaps MUST include a machine-parseable `milestones` array. This enables `issue_manager.py` to auto-create issues without fragile natural language parsing.

```json
{
  "milestones": [
    {
      "id": 1,
      "domain": "infrastructure",
      "description": "What needs to be built or done",
      "phase": 1,
      "dependencies": [],
      "targetDate": "2026-04-15",
      "verificationType": "deterministic"
    }
  ]
}
```

| Field | Required | Values |
|-------|----------|--------|
| `id` | yes | Integer, unique within proposal |
| `domain` | yes | Free text: `infrastructure`, `legal`, `financial`, `governance`, etc. |
| `description` | yes | Acceptance criteria — what "done" means |
| `phase` | yes | Integer matching `implementationPhases` keys |
| `dependencies` | no | Array of milestone IDs this is blocked by |
| `targetDate` | no | `YYYY-MM-DD` |
| `verificationType` | yes | `deterministic` (code/hash check), `attestation` (HE confirms), `manual` (tracked only) |

Issue key generated: `[P{proposalId:03d}-{phase}.{id}]` — e.g., `[P007-1.3]`

## Issue Manager (issue_manager.py)

```bash
# Create issues from a decision (APPROVE or MODIFY)
python3 governance-engine/issue_manager.py \
  --decision governance/decisions/XXX-name.json \
  --proposal governance/proposals/XXX-name.json

# Run divergence workflow (close all issues for a decision)
python3 governance-engine/issue_manager.py \
  --diverge --decision-id <N> --reason "HE override: ..." --divergence-hash <hash>
```

See `governance/DIVERGENCE-WORKFLOW.md` for full divergence label/state lifecycle.

## Execution Record Format

```json
{
  "decisionId": <on-chain decision number>,
  "proposalId": "<XXX-short-name>",
  "executionSummary": "<what was done, commit SHA if applicable>",
  "conditions": "<conditions satisfied from the decision>",
  "executedBy": "0xC91ED1978a1b89D0321fcF6BFf919a0f785d5EC7",
  "date": "YYYY-MM-DD"
}
```

## Rules

- **Never commit `.env` or the export file (`openinnovate-complete-export.md`).** These contain secrets and large context dumps that must stay local.
- **Governance acts go through the full pipeline, not direct edits.** All governance decisions must be submitted as proposals, evaluated by the constitutional reasoning engine, and recorded as reasoning trees in `decisions/`. No direct edits to governance state.
- **On-chain IDs are sequential.** proposalCount and decisionCount are the current max IDs. Attestations are keyed by decisionId, not sequential.
- **Commit and push before on-chain recording.** The URI in on-chain records must point to content that exists at that commit on GitHub.
