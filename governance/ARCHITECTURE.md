# OpenInnovate DAO — Governance Architecture & Work Flows

## System Overview

```
                    +-------------------+
                    |   ROOT THESIS     |
                    |     MAXIM         |
                    +--------+----------+
                             |
              +--------------+--------------+
              |                             |
     +--------v--------+          +--------v--------+
     |  CONSTITUTIONAL  |          |  SMART CONTRACT  |
     |     CORPUS       |          |   (Base L2)      |
     |  148 docs, 4 tiers|         | UUPS + RBAC +   |
     |  5.6 MB          |          | TimelockController|
     +--------+---------+          +--------+---------+
              |                             |
              +-------------+---------------+
                            |
                   +--------v--------+
                   | GOVERNANCE      |
                   | ENGINE          |
                   | (Python + GHA)  |
                   +-----------------+
```

## Governance Pipeline — Complete Flow

```
 HUMAN EXECUTOR (HE)                  ALGORITHMIC MANAGER (AM)
 =====================                ========================

 1. Identify need
        |
        v
 2. Write proposal JSON ----+
    governance/proposals/    |
        |                    |
        v                    v
 3. git commit + push   4. evaluate.py
        |                    |  - Load corpus (weighted)
        |                    |  - Load system prompt
        |                    |  - Call Claude API
        |                    |  - Generate reasoning tree
        |                    v
        |               5. Decision JSON
        |                  governance/decisions/
        |                    |
        v                    v
 6. Review decision     7. On-chain recording
    APPROVE/MODIFY/         cast send submitProposal()
    REJECT?                 cast send recordDecision()
        |                    |
   +----+----+               |
   |         |               |
   v         v               |
 APPROVE   REJECT            |
   |         |               |
   v         +---> END       |
 8. Execute                  |
    the decision             |
        |                    |
        v                    |
 9. Create execution    10. On-chain attestation
    record                   cast send attestExecution()
    governance/executions/   |
        |                    |
        v                    v
 11. Close GitHub       12. issue_manager.py
     issues                  (auto-creates milestones)
        |                    |
        +--------------------+
                |
                v
          COMPLETE
```

## Divergence Flow (HE Overrides AM)

```
 AM recommends X
        |
        v
 HE disagrees -----> Write divergence JSON
        |             governance/divergences/
        |                    |
        v                    v
 Document reason        On-chain recording
 (W.S. 17-31-104)      cast send recordDivergence()
        |                    |
        v                    v
 Update GitHub          Close/update related
 issues with            issues with divergence
 divergence label       label
        |
        v
 Divergence cost noted
 (operational + constitutional)
```

## CEO Strategic Review Flow

```
 TRIGGER                         CEO (AM as Strategic Planner)
 =======                         =============================

 Manual: recommend.py             1. Gather full DAO state
 GHA: schedule (annual)              - proposals, decisions
 GHA: workflow_dispatch               - executions, divergences
        |                             - open issues, corpus
        v                             - on-chain counts
 gather_state() --------->            - recommendation outcomes
        |                                    |
        v                                    v
 load corpus (weighted)           2. Strategic analysis
        |                             - State assessment
        v                             - Gap analysis
 Call Claude API                      - Business strategy (v1.1)
 (system-prompt-recommend-v1.1)       - Revenue/monetization
        |                             - Growth/partnerships
        v                                    |
 Strategic review JSON                       v
 governance/recommendations/      3. 10 recommendations
        |                             - Corpus-grounded
        v                             - Maxim-traced
 create_recommendation_issues()       - Scored & prioritized
        |                                    |
        v                                    v
 GitHub issues created -------> Project board updated
 (date-stamped keys)            (Category + Target Date)
        |
        v
 HE reviews, acts,
 defers, or rejects
        |
        v
 Outcomes fed back to
 next CEO review cycle
 (quality feedback loop)
```

## CEO Content Review Flow

```
 HE writes content
 (article, legal doc,
  financial plan, etc.)
        |
        v
 review.py --content <path>
 --category publication|legal|
           financial|technical
        |
        v
 Load corpus with
 category-specific weights:
   legal    -> tier-4 heavy (2.0x)
   financial -> tier-1 heavy (1.5x)
   technical -> tier-3 heavy (1.5x)
   publication -> tier-2 heavy (1.3x)
        |
        v
 Call Claude API
 (system-prompt-review-v1.0)
        |
        v
 Review JSON
 governance/reviews/
        |
        v
 APPROVE / REVISE / REJECT
        |
   +----+----+
   |         |
   v         v
 Publish   Revise content
            Re-review
```

## Smart Contract Security Model

```
                    +------------------+
                    | TimelockController|
                    | 7-day delay      |
                    | 0x554B8D...      |
                    +--------+---------+
                             |
                    Holds: DEFAULT_ADMIN_ROLE
                    Holds: UPGRADER_ROLE
                             |
                    +--------v---------+
                    | Governance Proxy  |
                    | 0x3efDCc...       |
                    | (UUPS + RBAC)     |
                    +--------+---------+
                             |
              +--------------+--------------+
              |              |              |
     +--------v--+    +------v------+  +---v---------+
     | V2 Impl   |    | Operational |  | Admin Ops   |
     | 0x66Feb.. |    | Roles       |  | (via timelock)|
     +----------+    +------+------+  +---+---------+
                            |              |
                  +---------+--------+     |
                  |    |    |    |         |
                  v    v    v    v         v
              SUBMIT RECORD ATTEST DIVERGE  UPGRADE
              PROPOSAL DECISION EXEC      GRANT ROLE
              (direct) (direct) (direct)  (7-day delay)

 ROLE ASSIGNMENTS:
 +---------------------------+----------+-----------+
 | Role                      | HE (EOA) | Timelock  |
 +---------------------------+----------+-----------+
 | DEFAULT_ADMIN_ROLE        |    no    |    yes    |
 | UPGRADER_ROLE             |    no    |    yes    |
 | PROPOSAL_SUBMITTER        |   yes    |    no     |
 | DECISION_RECORDER         |   yes    |    no     |
 | EXECUTION_ATTESTER        |   yes    |    no     |
 | DIVERGENCE_RECORDER       |   yes    |    no     |
 +---------------------------+----------+-----------+
```

## GHA Workflow — Three Jobs

```
 TRIGGER                    JOB                         OUTPUT
 =======                    ===                         ======

 push to                    verify-decisions            Pass/fail
 governance/decisions/  --> - Verify file hashes        (checks)
 corpus/weights.json        - Check corpus integrity
 governance-engine/         - Validate prompt integrity
 system-prompt-*.md         - Verify weights governance

 workflow_dispatch           evaluate-proposal          Decision JSON
 mode=evaluate          --> - Validate inputs           + GitHub issues
 proposal=<path>            - Run evaluate.py           + On-chain hash
                            - Call Claude API (Opus)
                            - Create milestone issues

 workflow_dispatch           ceo-strategic-review       Review JSON
 mode=recommend         --> - Run recommend.py          + GitHub issues
 schedule (annual)          - Call Claude API (Opus)    + Project board
                            - Create rec issues
                            - Add to project board
```

## Issue Lifecycle

```
 CREATED                    STATES                      RESOLUTION
 =======                    ======                      ==========

 issue_manager.py     +---> Ready                 +--> Closed
 or                   |     (actionable,           |   (executed,
 recommend.py         |      no blockers)          |    code shipped)
 or                   |          |                 |
 manual creation      |          v                 |
        |             |     In Progress       +---+
        v             |     (work started)    |
 Added to         +---+          |            |
 project board    |              v            |
        |         |     Review               +--> Closed
        v         |     (needs decision       |   (decided,
 Categorized      |      or investigation)    |    no action needed)
 + dated          |          |                |
        |         |          v                |
        v         +---- Blocked          +---+
 Todo             |     (external dep,    |
 (default)        |      waiting)         |
                  |          |            |
                  |          v            +--> Closed
                  +---- Deferred              (diverged,
                        (not actionable,       superseded)
                         future trigger)
```

## Constitutional Corpus — Weight Architecture

```
 TIER HIERARCHY                    WEIGHT DISTRIBUTION
 ==============                    ===================

 tier-1-governance (highest)       Buffett letters: ~67%
 +--> Founding principles          of corpus by volume
 +--> Buffett annual letters       Weight: 1.0x base
 +--> Root Thesis Maxim
                                   Category overrides:
 tier-2-civic                      - legal: tier-4 @ 2.0x
 +--> US Constitution              - financial: tier-1 @ 1.5x
 +--> Ostrom commons               - technical: tier-3 @ 1.5x
 +--> Tocqueville democracy        - publication: tier-2 @ 1.3x

 tier-3-systems
 +--> Meadows leverage points
 +--> DAO survey 2022
 +--> Quadratic funding
 +--> Klages-Mundt mechanisms

 tier-4-wyoming (legal authority)
 +--> DAO LLC Act (W.S. 17-31)
 +--> DUNA Act
 +--> Digital Assets Act
 +--> UETA
```

## Data Flow — On-Chain Recording

```
 LOCAL FILE                 HASH                    ON-CHAIN
 ==========                 ====                    ========

 proposals/XXX.json   -->  keccak256(bytes)   -->  submitProposal(hash, uri)
                           OR                       proposalId = sequential
                           canonical_json()
                           (post-migration)

 decisions/XXX.json   -->  keccak256(bytes)   -->  recordDecision(propId, hash, score, uri)
                                                    decisionId = sequential

 executions/XXX.json  -->  keccak256(bytes)   -->  attestExecution(decId, hash)
                                                    keyed by decisionId

 divergences/XXX.json -->  keccak256(bytes)   -->  recordDivergence(decId, hash, uri)
                                                    divergenceId = sequential

 VERIFICATION:
 cast call getProposal(id) --> returns (hash, uri, proposer, timestamp)
 cast call getDecision(id) --> returns (propId, hash, score, uri, recorder, attested, timestamp)
 verify.py --check-hash    --> compares local hash vs on-chain hash
 verify.py --canonical     --> computes both raw + canonical hashes
```
