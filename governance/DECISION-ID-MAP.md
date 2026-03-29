# Decision ID Map — On-Chain to Local File Reconciliation

**Date:** 2026-03-29
**Audited by:** COO

## Problem

The `decisionId` field in local decision JSON files does not reliably match the on-chain sequential decision ID. This is because `evaluate.py` generates the `decisionId` at file creation time without querying the on-chain counter. The on-chain recording happens later, and the sequential ID assigned by the smart contract may differ.

**Impact:** Local file `decisionId` values cannot be trusted for matching to on-chain records. The on-chain hash + URI is the canonical link between the decision file and its on-chain record.

**Files cannot be corrected** because they are already recorded on-chain with their original hashes. Modifying them would break hash integrity.

## Canonical Mapping

| On-Chain ID | Proposal | Decision File | File decisionId | Score | Attested |
|-------------|----------|---------------|-----------------|-------|----------|
| 1 | P1 | 001-ratify-operating-agreement.json | 1 | 95 | Yes |
| 2 | P2 | 002-ratify-constitutional-corpus.json | 2 | 88 | Yes |
| 3 | P2 (v2) | 002-ratify-constitutional-corpus-v2.json | 1 | 88 | Yes |
| **4** | **P3** | **003-financial-infrastructure.json** | **3** | **82** | **No** |
| 5 | P4 | 004-condition-verification-protocol.json | 4 | 91 | Yes |
| 6 | P5 | 005-governance-execution-tracking.json | 5001 | 84 | Yes |
| 7 | P6 | 006-governance-pipeline-integrity.json | 6001 | 87 | Yes |
| 8 | P7 | 007-expand-wyoming-corpus.json | 1 | 91 | Yes |
| 9 | P8 | 008-ceo-executive-expansion.json | 9 | 82 | Yes |
| 10 | P9 | 009-security-hardening.json | 9 | 91 | Yes |
| 11 | P10 | 010-corpus-expansion-tier3.json | 7 | 82 | Yes |

## Correct decisionId: 2 of 11

Only decisions #1 and #2 have `decisionId` values in their JSON files that match the on-chain sequential ID.

## Unattested Decision

**Decision #4 (Financial Infrastructure, P003)** is the only unattested decision. This is expected — P003 is a multi-phase roadmap with external blockers:
- Phase 1 (D-U-N-S): pending (~30 day registration)
- Phase 2 (store credit): blocked on D-U-N-S
- Phase 3 (credit cards): blocked on D-U-N-S
- Phase 4 (vehicle registration): no blocker, low priority
- Divergence recorded: Domain 2 (D-U-N-S expedited vs standard)

Attestation will occur when sufficient phases are complete to constitute execution.

## Prevention

For all future decisions, the COO must:
1. Record the decision on-chain **immediately** after `evaluate.py` generates the file
2. Update the local file's `decisionId` to match the on-chain ID **before** computing the execution hash
3. Alternatively, treat the local `decisionId` as a draft value and rely on the on-chain URI for authoritative linking

The on-chain record's URI field is the canonical link between the file and its on-chain representation.

## Execution Record Mapping

Execution records use the correct on-chain `decisionId` values because they are created after on-chain recording:

| Execution File | decisionId (correct) |
|----------------|---------------------|
| 001-ratify-operating-agreement.json | 1 |
| 002-ratify-constitutional-corpus.json | 2 |
| 002-ratify-constitutional-corpus-v2.json | 3 |
| 004-condition-verification-protocol.json | 5 |
| 005-governance-execution-tracking.json | 6 |
| 006-governance-pipeline-integrity.json | 7 |
| 007-expand-wyoming-corpus.json | 8 |
| 008-ceo-executive-expansion.json | 9 |
| 009-security-hardening.json | 10 |
| 011-corpus-expansion-tier3.json | 11 |
