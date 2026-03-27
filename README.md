# OpenInnovate DAO LLC

**AI-augmented direct democracy on Base L2, governed by a weighted constitutional corpus.**

OpenInnovate DAO LLC is a Wyoming Decentralized Autonomous Organization ([W.S. 17-31-101](https://wyoleg.gov/Legislation/2021/SF0038)) with an AI Algorithmic Manager designated in its Articles of Organization. Every governance decision is evaluated against a 148-document constitutional corpus, scored for alignment with the Root Thesis Maxim, and recorded on-chain with full reasoning transparency.

[**Read the Thesis**](https://dao.openinnovate.org/thesis) | [**Transparency UI**](https://dao.openinnovate.org) | [**Smart Contract**](https://basescan.org/address/0x3efDCccF7b141B5dA4B21478221B0bf0cfdF7536)

---

## Root Thesis Maxim

> *"Maximize the creation of sovereign, self-sustaining systems that compound human agency over generational timescales."*

Every governance decision includes an explicit traceability chain from the recommended action to this Maxim.

---

## How It Works

```
Proposal → Corpus-Grounded Evaluation → Reasoning Tree → On-Chain Hash → Human Execution (or Divergence)
```

1. **Proposals** are submitted as structured JSON describing governance decisions
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
| 002 | Ratify Constitutional Corpus | MODIFY | 88/100 | Attested |
| 003 | Financial Infrastructure & Credit Strategy | APPROVE | 82/100 | Divergence #1 |
| 004 | Condition Verification Protocol | APPROVE | 91/100 | Attested |
| 005 | Transparency UI & Public Dashboard | APPROVE | 90/100 | Attested |
| 006 | Governance Pipeline Integrity | APPROVE | 89/100 | Attested |
| 007 | Expand Wyoming Constitutional Corpus | APPROVE | 91/100 | Attested |
| 008 | CEO Executive Expansion | APPROVE | 82/100 | Attested |

8 proposals, 9 decisions, 1 divergence. Full reasoning trees: [`governance/decisions/`](governance/decisions/)

---

## Constitutional Corpus

148 documents across 4 weighted tiers:

| Tier | Weight | Documents | Contents |
|------|--------|-----------|----------|
| **Tier 1 — Governance** | 1.0 | 50 | Buffett's Owner's Manual, 48 Berkshire shareholder letters (1977-2024), Munger's Psychology of Human Misjudgment |
| **Tier 2 — Civic** | 0.9 | 88 | US Constitution, UN Declaration of Human Rights, Ostrom's 8 Principles for Managing a Commons, 85 Federalist Papers |
| **Tier 3 — Systems** | 0.8 | 4 | Meadows' Leverage Points, Buterin/Hitzig/Weyl Quadratic Funding, Klages-Mundt Stablecoin Governance, DAO Overview Survey |
| **Tier 4 — Wyoming** | 1.2 | 6 | Wyoming Constitution, Wyoming DAO Supplement, Wyoming LLC Act, Wyoming DUNA Act, Wyoming Digital Assets Act, Wyoming UETA |

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
  .github/workflows/       # GitHub Actions governance pipeline
  contracts/               # Solidity governance contract (Foundry)
  corpus/                  # Constitutional corpus (4 tiers, 148 documents)
    tier-1-governance/     # Buffett, Munger
    tier-2-civic/          # Constitution, Federalist Papers, UDHR, Ostrom
    tier-3-systems/        # Meadows, Buterin, DAO research
    tier-4-wyoming/        # Wyoming Constitution, DAO Supplement, LLC Act, DUNA, Digital Assets, UETA
    weights.json           # Tier weight configuration
    manifest.json          # Corpus manifest with file hashes
  governance/              # Governance pipeline records
    proposals/             # Submitted proposals
    decisions/             # Algorithmic Manager reasoning trees
    executions/            # Human Executor attestation records
    divergences/           # Divergence Protocol records
    reviews/               # CEO content review outputs
    recommendations/       # CEO strategic review outputs
  governance-engine/       # Pipeline scripts and system prompts
    evaluate.py            # Constitutional evaluation engine
    issue_manager.py       # Idempotent issue creation from decisions
    recommend.py           # CEO proactive strategic recommendations
    review.py              # CEO content review gate
    verify.py              # Verification checks
    system-prompt-v1.1.md  # AM evaluation prompt (current)
    system-prompt-recommend-v1.0.md  # CEO strategic planning prompt
    system-prompt-review-v1.0.md     # CEO content review prompt
  frontend/                # Transparency UI (Next.js on Vercel)
  assets/                  # Logo and publication images
  legal/                   # Articles of Organization, Operating Agreement
```

---

## Running the Governance Engine

```bash
# Evaluate a proposal
ANTHROPIC_API_KEY=sk-ant-... python3 governance-engine/evaluate.py \
  --proposal governance/proposals/XXX-name.json

# CEO strategic recommendations
ANTHROPIC_API_KEY=sk-ant-... python3 governance-engine/recommend.py --dry-run

# CEO content review
ANTHROPIC_API_KEY=sk-ant-... python3 governance-engine/review.py \
  --content path/to/article.md --category publication
```

---

## Legal Entity

| Field | Value |
|-------|-------|
| **Name** | OpenInnovate DAO LLC |
| **Jurisdiction** | Wyoming |
| **Filing Reference** | [2026-001929314](https://wyobiz.wyo.gov) |
| **EIN** | 41-5085693 |
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
