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

## Contract Deployment

- **Chain:** Base (Chain ID 8453)
- **Governor proxy:** deployed via OpenZeppelin UUPS upgradeable pattern
- **Token:** OpenInnovateToken (OIT) — ERC-20 votes token

## Directory Structure

```
openinnovate-dao/
  contracts/          # Foundry project (Solidity + tests) — DO NOT modify outside normal workflow
  corpus/             # Constitutional texts metadata, tiered and weighted
    tier-1-governance/
    tier-2-civic/
    tier-3-systems/
    tier-4-wyoming/
    weights.json      # Document weight configuration
  decisions/          # Reasoning tree JSONs produced by the governance pipeline
  governance-engine/  # GitHub Actions workflows for the governance proposal pipeline
  frontend/           # Transparency UI (Next.js, coming soon)
  CLAUDE.md           # This file — project conventions for Claude Code
```

## Rules

- **Never commit `.env` or the export file (`openinnovate-complete-export.md`).** These contain secrets and large context dumps that must stay local.
- **Governance acts go through the full pipeline, not direct edits.** All governance decisions must be submitted as proposals, evaluated by the constitutional reasoning engine, and recorded as reasoning trees in `decisions/`. No direct edits to governance state.
