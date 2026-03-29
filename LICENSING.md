# Licensing

OpenInnovate DAO uses a dual licensing model.

## AGPL-3.0 (Default)

All source code in this repository is licensed under the **GNU Affero General Public License v3.0** (see [LICENSE](LICENSE)) unless explicitly noted below. This includes:

- `governance-engine/*.py` — governance pipeline scripts
- `contracts/` — Solidity smart contracts and tests
- `frontend/` — transparency UI
- `.github/` — CI/CD workflows

The AGPL-3.0 requires that if you run a modified version of this software as a network service, you must make the modified source available to users of that service.

## Proprietary Components

The following components are **not** covered by the AGPL-3.0 and are proprietary to OpenInnovate DAO LLC:

- `governance-engine/system-prompt-*.md` — AI system prompts for constitutional evaluation, strategic planning, and content review
- `governance/templates/` — client-facing report templates

These files are included in the repository for transparency and auditability but may not be used, copied, modified, or distributed without explicit written permission from OpenInnovate DAO LLC.

## Constitutional Corpus

The files in `corpus/` are third-party works included under their respective licenses (public domain, CC0, CC BY 4.0, WTFPL, or US government works). See individual file headers for attribution. The corpus curation methodology (tiered weighting, category overrides, governance-gated modification) is proprietary.

## Commercial Licensing

For commercial use of the governance engine (including Governance-as-a-Service deployments), contact: collaborate@openinnovate.org

## Summary

| Component | License |
|-----------|---------|
| Pipeline code (`*.py`) | AGPL-3.0 |
| Smart contracts (`*.sol`) | AGPL-3.0 |
| Frontend | AGPL-3.0 |
| System prompts (`system-prompt-*.md`) | Proprietary |
| Report templates | Proprietary |
| Constitutional corpus texts | Various (see file headers) |
| Corpus curation methodology | Proprietary |
