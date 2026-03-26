# C-Suite Architecture — Design Document

**Status:** Design only. No implementation until trigger conditions are met.
**Approved:** Decision #9 (Proposal #008), 2026-03-26
**Author:** Algorithmic Manager + Human Executor

## Overview

OpenInnovate DAO currently operates with a single Algorithmic Manager (CEO) that evaluates all proposal types against the full constitutional corpus. As the DAO grows in complexity, specialized executives with domain-focused corpus expertise will improve decision quality.

This document defines the architecture. Implementation is deferred until trigger conditions are met.

## Executive Roles

| Role | Focus | Primary Corpus | Trigger Condition |
|------|-------|---------------|-------------------|
| **CEO** | Strategic direction, Maxim alignment, cross-domain arbitration | All tiers equally | Exists now |
| **CFO** | Financial prudence, capital allocation, treasury management | Tier-1 heavy (Buffett/Munger) | Treasury > $10K or first investment |
| **CTO** | Technical architecture, smart contracts, engineering standards | Tier-3 heavy + future engineering corpus | Smart contract upgrades begin |
| **GC** | Legal compliance, regulatory risk, statutory interpretation | Tier-4 heavy (Wyoming statutes) | Regulatory complexity increases |
| **CMO** | Communications, brand, community engagement | Tier-2 heavy + future comms corpus | Community > 100 members |

## Proposal Routing

When a proposal is submitted, the system routes it to the appropriate executive(s) based on proposal type:

```
PROPOSAL_TYPE_ROUTING = {
    "governance-infrastructure": ["CEO", "CTO"],
    "financial":                 ["CEO", "CFO"],
    "operational":               ["CEO"],
    "constitutional-amendment":  ["CEO", "GC"],
    "corpus-maintenance":        ["CEO", "GC"],
    "technical":                 ["CTO", "CEO"],
    "legal":                     ["GC", "CEO"],
    "communications":            ["CMO", "CEO"],
    "treasury":                  ["CFO", "CEO"],
}
```

The first executive in the list is the **primary evaluator**. Additional executives provide secondary review. CEO always participates in cross-domain proposals.

## Sub-Corpus Weight Overrides

Each executive uses the same constitutional corpus but with different tier weight multipliers. This ensures domain focus without fragmenting the corpus.

```json
{
    "CEO":  {"tier-1": 1.0, "tier-2": 1.0, "tier-3": 1.0, "tier-4": 1.0},
    "CFO":  {"tier-1": 1.5, "tier-2": 0.6, "tier-3": 0.8, "tier-4": 1.0},
    "CTO":  {"tier-1": 0.7, "tier-2": 0.5, "tier-3": 1.5, "tier-4": 0.8},
    "GC":   {"tier-1": 0.8, "tier-2": 0.7, "tier-3": 0.6, "tier-4": 2.0},
    "CMO":  {"tier-1": 0.8, "tier-2": 1.5, "tier-3": 0.5, "tier-4": 0.7}
}
```

These are stored in `corpus/weights.json` under an `executive_overrides` key (when implemented).

## Composite Decisions

For proposals routed to multiple executives:

1. Each executive produces an independent reasoning tree
2. Each tree includes its own Maxim Alignment Score
3. If scores diverge by more than 15 points, the CEO produces an **arbitration tree** that:
   - Identifies the source of disagreement
   - Cites corpus sources supporting each position
   - Produces a composite recommendation with conflict resolution notes
4. The final decision is the CEO's composite, with all individual trees preserved for audit

```
Output structure:
{
    "compositeDecision": {
        "primaryEvaluation": { ... },     // Primary exec reasoning tree
        "secondaryEvaluations": [ ... ],  // All secondary trees
        "arbitration": { ... },           // CEO conflict resolution (if needed)
        "finalRecommendation": "APPROVE", // CEO's final call
        "finalScore": 85,
        "conflictResolution": "CTO scored lower due to ... CEO weighted ... because ..."
    }
}
```

## Implementation Architecture

When implemented, the system would be structured as:

```
governance-engine/
    evaluate.py              # Becomes the router — dispatches to executives
    executives/
        __init__.py
        base.py              # Base executive class (shared corpus loading, API call)
        ceo.py               # CEO-specific prompt and weight overrides
        cfo.py               # CFO
        cto.py               # CTO
        gc.py                # General Counsel
        cmo.py               # CMO
    system-prompts/
        ceo-evaluate-v1.1.md
        cfo-evaluate-v1.0.md
        cto-evaluate-v1.0.md
        gc-evaluate-v1.0.md
        cmo-evaluate-v1.0.md
    composite.py             # Multi-executive decision aggregation + arbitration
```

## Activation Protocol

Each executive role activation is a governance act:

1. **Proposal** — "Activate CFO executive role" with trigger condition evidence
2. **Evaluation** — CEO evaluates (heightened scrutiny for self-expanding governance)
3. **Implementation** — Create executive module, prompt, weight overrides
4. **Calibration** — Run 5 historical proposals through new executive, compare with CEO-only results
5. **Activation** — Enable routing for the executive's proposal types

## Why Not Now

At 8 proposals in 2 days (current pace), a single CEO with domain awareness handles everything effectively. Multi-executive overhead is premature because:

1. **Corpus depth insufficient** — Tier-3 has systems thinking texts, not engineering standards. Tier-2 has civic texts, not communications strategy. Sub-corpus differentiation produces marginal value until domain-specific depth exists.
2. **API cost multiplication** — Each additional executive per proposal costs $0.50-2.00. At current volume, this is fine. At scale, it matters.
3. **Complexity budget** — Every moving part is a governance surface to maintain. Single CEO is simpler to audit, debug, and trust.
4. **Arbitration risk** — Disagreeing executives create decision paralysis. The arbitration mechanism needs real-world testing before deployment.

## Future Corpus Expansion

When C-suite roles are activated, new tier-5 directories may be justified:

```
corpus/
    tier-5-engineering/    # CTO: software engineering principles, security standards
    tier-5-communications/ # CMO: brand guidelines, community playbooks
    tier-5-finance/        # CFO: financial modeling, treasury management
```

This is deferred. Current 4-tier corpus with weight overrides per executive is sufficient for initial activation.

## Decision Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-03-26 | Design only, no implementation | Proposal volume (8 in 2 days) well-served by single CEO |
| — | CFO first activation candidate | Treasury will be first domain requiring specialized evaluation |
| — | GC second candidate | Regulatory complexity already present via Wyoming statutes |
