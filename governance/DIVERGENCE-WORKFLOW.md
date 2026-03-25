# Divergence-Issue Workflow

When the Human Executor (HE) diverges from an Algorithmic Manager (AM) decision, all related GitHub Issues must be updated to reflect the divergence. This prevents stale tracking of work the HE has chosen not to execute.

## Trigger

A divergence occurs when the HE records an on-chain divergence via `recordDivergence(decisionId, hash, uri)`.

## Full Divergence (HE rejects entire decision)

1. HE records divergence on-chain with reason
2. Run: `python3 governance-engine/issue_manager.py --diverge --decision-id <id> --reason "..."  --divergence-hash <hash>`
3. All open issues with `governance-execution` label for that proposal are:
   - Commented with divergence notice linking to on-chain record
   - Labeled `diverged`
   - Closed

## Partial Divergence (HE accepts some milestones, rejects others)

1. HE records divergence on-chain referencing specific milestone IDs
2. For **accepted** milestones:
   - HE removes `pending-review` label
   - HE adds `he-accepted` label
   - Issue remains open for execution tracking
3. For **rejected** milestones:
   - HE adds comment: reason for rejection + link to on-chain divergence record
   - HE adds `he-rejected-diverged` label
   - HE closes the issue

## Label Reference

| Label | Meaning |
|-------|---------|
| `pending-review` | AM created, awaiting HE activation |
| `he-accepted` | HE reviewed and activated for execution |
| `diverged` | Full divergence — HE rejected entire decision |
| `he-rejected-diverged` | Partial divergence — HE rejected this specific milestone |
| `attested` | Execution verified and attested on-chain |

## Constitutional Constraint

Per the Operating Agreement and constitutional analysis:
- Auto-created issues MUST start in `pending-review` state
- HE activates by removing `pending-review` — no auto-activation
- Divergence records MUST reference specific milestone IDs when partial
- On-chain divergence record is the trust root, not the GitHub issue state
