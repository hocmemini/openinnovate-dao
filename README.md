# OpenInnovate DAO LLC

**AI-augmented direct democracy on Base L2, governed by a weighted constitutional corpus.**

OpenInnovate DAO LLC is a Wyoming Decentralized Autonomous Organization ([W.S. 17-31-101](https://wyoleg.gov/Legislation/2021/SF0038)) with an AI Algorithmic Manager designated in its Articles of Organization. Every governance decision is evaluated against a 144-document constitutional corpus, scored for alignment with the Root Thesis Maxim, and recorded on-chain with full reasoning transparency.

---

## Root Thesis Maxim

> *"Maximize the creation of sovereign, self-sustaining systems that compound human agency over generational timescales."*

Every governance decision includes an explicit traceability chain from the recommended action to this Maxim.

---

## How It Works

```
Proposal → Corpus-Grounded Evaluation → Reasoning Tree → On-Chain Hash → Human Execution (or Divergence)
```

1. **Proposals** are submitted as structured JSON or markdown describing governance decisions
2. **The Governance Engine** retrieves relevant documents from the constitutional corpus via weighted TF-IDF, then calls Claude with a versioned system prompt to produce a structured Reasoning Tree
3. **The Algorithmic Manager** recommends APPROVE, REJECT, MODIFY, or DEFER with a Maxim Alignment Score (0-100)
4. **The Human Executor** either attests execution or exercises the **Divergence Protocol** — overriding the AI's recommendation with published reasoning
5. **Everything goes on-chain** — proposal hashes, decision hashes, execution attestations, and divergence records are committed to the governance smart contract on Base L2

---

## On-Chain

| Component | Address |
|-----------|---------|
| **Governance Contract (Proxy)** | [`0x3efDCccF7b141B5dA4B21478221B0bf0cfdF7536`](https://basescan.org/address/0x3efDCccF7b141B5dA4B21478221B0bf0cfdF7536) |
| **Chain** | Base L2 (Chain ID 8453) |
| **Human Executor** | `0xC91ED1978a1b89D0321fcF6BFf919a0f785d5EC7` |

---

## Governance Record

| # | Proposal | Decision | Score | Status |
|---|----------|----------|-------|--------|
| 001 | Ratify Operating Agreement | APPROVE | 97/100 | Attested |
| 002 | Ratify Constitutional Corpus | MODIFY | 88/100 | Attested (conditions satisfied) |
| 003 | Financial Infrastructure & Credit Strategy | APPROVE | 82/100 | Divergence #1 (Domain 2: standard D-U-N-S) |
| 004 | Condition Verification Protocol | APPROVE | 91/100 | Pending execution |

Full reasoning trees: [`governance/decisions/`](governance/decisions/)

---

## Constitutional Corpus

144 documents across 4 weighted tiers:

| Tier | Weight | Documents | Contents |
|------|--------|-----------|----------|
| **Tier 1 — Governance** | 1.0 | 50 | Buffett's Owner's Manual, 48 Berkshire shareholder letters (1977-2024), Munger's Psychology of Human Misjudgment |
| **Tier 2 — Civic** | 0.9 | 88 | US Constitution + Bill of Rights, UN Declaration of Human Rights, Ostrom's 8 Principles for Managing a Commons, 85 Federalist Papers |
| **Tier 3 — Systems** | 0.8 | 4 | Meadows' Leverage Points, Buterin/Hitzig/Weyl Quadratic Funding, Klages-Mundt Stablecoin Governance, DAO Overview Survey |
| **Tier 4 — Wyoming** | 1.2 | 2 | Wyoming Constitution, Wyoming DAO Supplement (W.S. 17-31-101 through 17-31-116) |

Corpus manifest hash: `0x99c7bc8c1f0438c469e286035673d8a8ad3bb755510d4bf0e5ec89d9932d528f`

---

## Divergence Protocol

The Human Executor retains sovereign authority to override any Algorithmic Manager decision. Divergences are:
- Published with reasoning explaining the override
- Committed on-chain with hash verification
- Part of the permanent governance record

**Divergence #1** (2026-03-24): Human Executor chose standard D-U-N-S registration (free, ~30 days) over the Algorithmic Manager's recommendation of expedited ($229, 9 days). Reasoning: credit acceleration has no time value when the credit facilities are not needed in the near term.

---

## Directory Structure

```
openinnovate-dao/
  .github/workflows/     # GitHub Actions governance pipeline
  contracts/             # Solidity governance contract (Foundry)
  corpus/                # Constitutional corpus (4 tiers, 144 documents)
    tier-1-governance/   # Buffett, Munger
    tier-2-civic/        # Constitution, Federalist Papers, UDHR, Ostrom
    tier-3-systems/      # Meadows, Buterin, DAO research
    tier-4-wyoming/      # Wyoming Constitution, DAO Supplement
    weights.json         # Tier weight configuration
    manifest.json        # Corpus manifest with file hashes
  governance/            # Governance pipeline records
    proposals/           # Submitted proposals
    decisions/           # Algorithmic Manager reasoning trees
    executions/          # Human Executor attestation records
    divergences/         # Divergence Protocol records
  governance-engine/     # Evaluation engine (Python + system prompt)
  legal/                 # Articles of Organization, Operating Agreement
```

---

## Running the Governance Engine

```bash
# Dry run (no API call)
python governance-engine/evaluate.py --proposal governance/proposals/003-financial-infrastructure.md --dry-run

# Full evaluation
export ANTHROPIC_API_KEY=sk-ant-...
python governance-engine/evaluate.py --proposal governance/proposals/003-financial-infrastructure.md

# With model override
python governance-engine/evaluate.py --proposal governance/proposals/004-condition-verification-protocol.json --model claude-sonnet-4-6
```

---

## Legal Entity

| Field | Value |
|-------|-------|
| **Name** | OpenInnovate DAO LLC |
| **Jurisdiction** | Wyoming |
| **Filing Reference** | 2026-001929314 |
| **Type** | Decentralized Autonomous Organization LLC |
| **Management** | Algorithmically managed (W.S. 17-31-104) |
| **Registered Agent** | Northwest Registered Agent Service Inc |

---

## Constitutional Hierarchy

Per [W.S. 17-31-115](https://wyoleg.gov/Legislation/2021/SF0038):

1. **Smart Contract** — preempts conflicting provisions of the Articles
2. **Articles of Organization** — preempts conflicting provisions of the Operating Agreement
3. **Operating Agreement** — supplements the above, does not override

---

*Built by [Jonathan](https://github.com/hocmemini) and [Claude](https://anthropic.com). Governed by the Maxim.*
