# Hash Migration: Canonical JSON Serialization

## Summary

All new governance records (proposals, decisions, executions, divergences, reviews) use **canonical JSON hashing** for deterministic, reproducible hashes. Existing records retain their original raw-file hashes.

## Canonical JSON Format

```python
json.dumps(obj, sort_keys=True, separators=(",", ":"), ensure_ascii=True)
```

Properties:
- Keys sorted alphabetically at all nesting levels
- No whitespace after separators (compact output)
- ASCII-only encoding (non-ASCII characters escaped as `\uXXXX`)
- Deterministic: same data always produces the same byte sequence

## Hashing Algorithm

- **Algorithm:** Keccak-256 (SHA-3 family, same as Ethereum/Solidity `keccak256()`)
- **Prefix:** `0x` (matching on-chain convention)
- **Input:** UTF-8 encoded canonical JSON string

```python
from hashlib import sha3_256 as keccak256
hash = "0x" + keccak256(canonical_json(data).encode()).hexdigest()
```

## Transition Policy

| Record Date | Raw Hash | Canonical Hash | On-Chain Hash |
|-------------|----------|----------------|---------------|
| Before 2026-03-28 | Primary | N/A | Raw hash |
| After 2026-03-28 | Recorded | Recorded | Canonical hash |

### Dual-Hash Period

During the transition, pipeline tools output **both** hashes:

- `evaluate.py` — outputs `treeHash` (raw) and `canonicalHash` in reasoning tree metadata
- `verify.py` — with `--canonical` flag, verifies both raw and canonical hashes
- `review.py` — outputs `contentHash` (raw) and `canonicalContentHash` in review metadata

### No Retroactive Migration

Existing governance records (Decisions #1-10, Proposals #1-9) keep their original raw-file hashes. Their on-chain `keccak256` values were computed from raw file bytes and are immutable. Retroactive re-hashing would break on-chain hash verification.

## On-Chain Usage

For new records after the migration date:

```bash
# Canonical hash for on-chain recording
HASH=$(python3 -c "
import json
from hashlib import sha3_256 as keccak256
data = json.load(open('governance/decisions/XXX-name.json'))
canonical = json.dumps(data, sort_keys=True, separators=(',',':'), ensure_ascii=True)
print('0x' + keccak256(canonical.encode()).hexdigest())
")

cast send $CONTRACT "recordDecision(uint256,bytes32,uint8,string)" \
  <proposalId> $HASH <score> <uri> \
  --private-key $KEY --rpc-url $RPC
```

## Verification

```bash
# Verify with dual hashes
python3 governance-engine/verify.py --decision governance/decisions/XXX.json --check-hash --canonical

# Output:
# [PASS] decision_hash — keccak256 (raw): 0xabc...
# [PASS] decision_hash_canonical — keccak256 (canonical): 0xdef...
```

## Rationale

Raw file hashing is fragile: whitespace changes, key reordering, or formatting differences produce different hashes even for semantically identical data. Canonical JSON eliminates this class of hash mismatches (SEC-10 finding from Proposal #009).

## References

- P009 Security Hardening, Phase 3, Milestone 8
- SEC-10 finding: Non-deterministic hashing in governance pipeline
- `governance-engine/evaluate.py` — `canonical_json()` implementation
- `governance-engine/verify.py` — `--canonical` flag
- `governance-engine/review.py` — `canonicalContentHash` in output
