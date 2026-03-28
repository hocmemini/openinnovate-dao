# Intellectual Property Investigation

**Date:** 2026-03-28
**Source:** CEO Strategic Review, Recommendation #9 (#77)

## Current IP Status

### License
**No LICENSE file exists in the repository.** Under default copyright law, all rights are reserved to the author(s). The code is publicly visible on GitHub but is **not** open source — public visibility does not grant usage, modification, or distribution rights.

### Operating Agreement Authorization
Section 2.4(e) of the Operating Agreement explicitly includes "holding, developing, and licensing intellectual property" as a company purpose.

## IP Catalog

### 1. Governance Engine Pipeline (2,397 lines Python)

| Component | Lines | Description |
|-----------|-------|-------------|
| `evaluate.py` | 450 | Constitutional evaluation engine — takes proposal JSON, runs weighted corpus retrieval, calls Claude API, produces scored reasoning tree |
| `recommend.py` | 665 | CEO strategic review engine — gathers full DAO state, calls Claude API, produces prioritized recommendations with corpus grounding |
| `review.py` | 338 | Content review gate — evaluates publications/legal/financial/technical content against weighted corpus |
| `issue_manager.py` | 484 | Idempotent issue lifecycle management — creates, categorizes, and tracks governance issues |
| `verify.py` | 460 | Integrity verification — hash validation, corpus integrity, prompt integrity, dual-hash canonical migration |

### 2. System Prompts (619 lines)

| Prompt | Version | Purpose |
|--------|---------|---------|
| `system-prompt-v1.0.md` | 1.0 | Proposal evaluation (constitutional reasoning) |
| `system-prompt-v1.1.md` | 1.1 | Adds follow-on recommendations and Step 5 |
| `system-prompt-recommend-v1.0.md` | 1.0 | CEO strategic planning |
| `system-prompt-recommend-v1.1.md` | 1.1 | Adds business strategy mandate and feedback loop |
| `system-prompt-review-v1.0.md` | 1.0 | Content review gate |

### 3. Smart Contracts (1,689 lines Solidity)

| Contract | Lines | Description |
|----------|-------|-------------|
| `OpenInnovateGovernance.sol` | 251 | V1 — UUPS upgradeable proxy, proposal/decision/attestation/divergence recording |
| `OpenInnovateGovernanceV2.sol` | 256 | V2 — AccessControl RBAC with 5 operational roles |
| Test suites + deploy scripts | 1,182 | Full test coverage including TimelockController integration |

### 4. Constitutional Corpus Methodology

The curation methodology — tiered weighted corpus with adversarial diversity, category-specific weight overrides, and governance-gated modification — is a novel approach to AI constitutional governance. This is not a standard RAG system; it's a legally binding framework where:
- Weight changes are governance acts (OA Section 8.3)
- Corpus modifications require full pipeline evaluation
- Category-specific overrides (legal 2.0x, financial 1.5x) shape AI reasoning per domain

### 5. Governance Architecture

The complete human-AI governance model documented in `governance/ARCHITECTURE.md`:
- Proposal → Evaluate → Decide → Record pipeline
- Divergence protocol with on-chain accountability
- CEO strategic review with feedback loop
- Content review gate with domain-specific weighting

## Protectability Assessment

### Strong IP (potentially protectable)
1. **System prompts** — The specific prompt engineering for constitutional governance evaluation, including the reasoning tree structure, traceability chain requirement, and scoring methodology. These represent significant creative and technical investment.
2. **Corpus curation methodology** — The tiered weighting system with category overrides and governance-gated modification is novel. Not the texts themselves (most are public domain or government works), but the curation framework.
3. **Governance pipeline design** — The complete workflow from proposal to on-chain recording, including the divergence protocol, is a novel organizational design pattern.

### Moderate IP
4. **Tooling code** — The Python pipeline and Solidity contracts implement the above concepts. The code has value but is more replicable than the design it embodies.
5. **GHA workflow** — The CI/CD pipeline for governance verification is useful but follows standard patterns.

### Weak IP
6. **Constitutional corpus texts** — Most are public domain (Federalist Papers, Constitution), government works (Wyoming statutes), or published research. The DAO has no IP claim over the source texts.

## Strategic Options

### Option A: Open Source Everything
- **Pro:** Maximizes Maxim alignment ("compound human agency") — others can adopt the governance model
- **Pro:** Attracts contributors, credibility in DAO ecosystem
- **Con:** Eliminates licensing revenue opportunity
- **Con:** Competitors can fork without contributing back

### Option B: Dual License (AGPL + Commercial)
- **Pro:** Code is freely available for open governance use (AGPL forces reciprocity)
- **Pro:** Commercial users (governance-as-a-service) need a paid license
- **Pro:** Aligns with Maxim (open for individual agency, commercial for sustainability)
- **Con:** AGPL enforcement is resource-intensive for a single operator

### Option C: Source-Available (BSL or similar)
- **Pro:** Code is visible and auditable (transparency) but not freely usable
- **Pro:** Converts to open source after a delay (e.g., 2-3 years)
- **Con:** Not truly open — limits community adoption
- **Con:** May conflict with Maxim's emphasis on compounding agency

### Option D: Keep Current (No License)
- **Pro:** Maximum flexibility — can choose any path later
- **Con:** Ambiguity may deter contributors and partners
- **Con:** The longer the code is public without a license, the harder enforcement becomes

## Recommendation

**Option B (Dual License)** best balances the Maxim's mandate with commercial sustainability:
- AGPL for the governance pipeline (evaluate, recommend, review, verify)
- Proprietary license for system prompts (the core IP)
- Commercial license for enterprise/SaaS use

This decision should be formalized as a governance proposal since it's a significant strategic decision affecting the DAO's business model and mission alignment.

## Next Steps

1. Decide on licensing strategy (requires governance proposal per OA Section 2.4(e))
2. Add LICENSE file to repository
3. Add copyright headers to source files
4. Document licensing terms in README
5. Investigate patent potential for the governance methodology (consult IP attorney)

## References
- Operating Agreement Section 2.4(e) — IP as company purpose
- CEO Strategic Review 2026-03-28, Recommendation #9
- Buffett's "economic franchise" framework (1991 letter)
