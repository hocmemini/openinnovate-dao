# Corpus Maintenance Schedule

## Annual Review — Wyoming Legislative Session

**Timing:** April each year, after the Wyoming Legislature concludes its general session (typically adjourns in March).

**Scope:** All tier-4-wyoming statutes in `corpus/tier-4-wyoming/`.

### Current Tier-4 Files

| File | Statute | Last Updated |
|------|---------|-------------|
| `wyoming-dao-supplement.txt` | W.S. 17-31-101 through 17-31-116 | 2026-03-24 |
| `wyoming-duna.txt` | DUNA Act | 2026-03-24 |
| `wyoming-digital-assets.txt` | Digital Assets Act (incl. Laws 2025 ch. 150 amendment) | 2026-03-24 |
| `wyoming-ueta.txt` | Uniform Electronic Transactions Act | 2026-03-24 |
| `wyoming-llc-act.txt` | Wyoming LLC Act | 2026-03-24 |
| `wyoming-constitution.txt` | Wyoming Constitution | 2026-03-24 |

### Checklist

Each April:

1. Check [Wyoming Legislature](https://wyoleg.gov/) for bills passed during the most recent session that affect:
   - Title 17, Chapter 31 (DAO Supplement)
   - Title 34-29 (Digital Assets)
   - Title 40-21 (UETA)
   - Title 17, Chapter 29 (LLC Act)
   - Any new DAO/blockchain/digital asset legislation
2. Download updated statute text from [wyoleg.gov](https://wyoleg.gov/statutes)
3. Replace the relevant file(s) in `corpus/tier-4-wyoming/`
4. Update `corpus/manifest.json` with new file hashes
5. Update `corpus/weights.json` if new files are added
6. Submit as a governance proposal referencing this maintenance schedule
7. Record the decision and update this table

### Why This Matters

Wyoming's DAO statutes are the legal foundation for OpenInnovate's existence (W.S. 17-31-101 et seq.). The 2025 Digital Assets Act amendment (Laws 2025, ch. 150) demonstrates that these statutes evolve. Stale legal corpus creates risk of governance decisions based on superseded law.

### GHA Reminder

The governance workflow includes an annual heartbeat cron (February 1) that triggers a CEO strategic review. The corpus maintenance review should be performed as a separate action in April, after the legislative session concludes.

## Reference

- Decision #8, Proposal #007 — CEO follow-on recommendation
- Issue #17 — tracking issue
