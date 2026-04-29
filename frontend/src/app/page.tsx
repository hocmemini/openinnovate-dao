"use client";

import { useEffect, useState } from "react";

const REPO = "hocmemini/openinnovate-dao";
const BRANCH = "main";
const GH_API = `https://api.github.com/repos/${REPO}/contents`;
const CONTRACT = "0x3efDCccF7b141B5dA4B21478221B0bf0cfdF7536";
const TIMELOCK = "0x554B8DBda3F9BDc08228531B7f28e05d857545B9";
const BASESCAN = `https://basescan.org/address/${CONTRACT}`;
const TIMELOCK_SCAN = `https://basescan.org/address/${TIMELOCK}`;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CorpusSource {
  source: string;
  tier: string;
  weight: number;
  relevance: string;
  citedPassage?: string;
}

interface AnalysisStep {
  step: number;
  description: string;
  reasoning: string;
}

interface Alternative {
  alternative: string;
  reasoning?: string;
  reason_rejected?: string;
  rejected_because?: string;
}

interface DeferredDecision {
  item: string;
  trigger_condition: string;
  review_date?: string;
}

interface ReasoningTree {
  inputs?: Record<string, unknown>;
  corpusSources?: CorpusSource[];
  analysis?: AnalysisStep[];
  alternativesConsidered?: Alternative[];
  traceabilityChain?: string;
  deferredDecisions?: DeferredDecision[];
  uncertaintiesAndLimitations?: string[];
}

interface Decision {
  decisionId: number;
  proposalId: number | string;
  title: string;
  model?: string;
  systemPromptVersion?: string;
  maximAlignmentScore: number;
  recommendation: string;
  date: string;
  evaluatedAt?: string;
  reasoningTree?: ReasoningTree;
}

interface Divergence {
  divergenceId: number;
  decisionId: number;
  proposalId: number;
  title: string;
  domain?: string;
  algorithmicManagerRecommendation: string;
  humanExecutorDecision: string;
  reasoning: string;
  maximAlignmentAssessment?: string;
  date: string;
}

interface Proposal {
  proposalId: number;
  title: string;
  type?: string;
  date: string;
  summary?: string;
}

// ---------------------------------------------------------------------------
// Data fetching
// ---------------------------------------------------------------------------

async function fetchDirJson<T>(path: string): Promise<T[]> {
  try {
    const res = await fetch(`${GH_API}/${path}`);
    if (!res.ok) return [];
    const files: { name: string; download_url: string }[] = await res.json();
    const jsons = files.filter((f) => f.name.endsWith(".json"));
    const results = await Promise.all(
      jsons.map(async (f) => {
        const r = await fetch(f.download_url);
        return r.json() as Promise<T>;
      })
    );
    return results;
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Components
// ---------------------------------------------------------------------------

function ScoreBadge({ score }: { score: number }) {
  const cls =
    score >= 90
      ? "text-green-700 border-green-200 bg-green-50"
      : score >= 70
        ? "text-blue-800 border-blue-200 bg-blue-50"
        : score >= 50
          ? "text-amber-700 border-amber-200 bg-amber-50"
          : "text-red-700 border-red-200 bg-red-50";
  return (
    <span className={`inline-block border rounded-sm px-2 py-0.5 text-xs font-mono ${cls}`}>
      {score}/100
    </span>
  );
}

function RecBadge({ rec }: { rec: string }) {
  const colors: Record<string, string> = {
    APPROVE: "text-green-700 border-green-200 bg-green-50",
    MODIFY: "text-amber-700 border-amber-200 bg-amber-50",
    REJECT: "text-red-700 border-red-200 bg-red-50",
    DEFER: "text-stone-600 border-stone-200 bg-stone-50",
  };
  return (
    <span className={`inline-block border rounded-sm px-2 py-0.5 text-xs font-mono ${colors[rec] || colors.DEFER}`}>
      {rec}
    </span>
  );
}

function SectionHeading({ eyebrow, title }: { eyebrow?: string; title: string }) {
  return (
    <div className="mb-5">
      {eyebrow && (
        <p className="text-[11px] font-display font-medium uppercase tracking-[0.14em] text-stone-500 mb-1">
          {eyebrow}
        </p>
      )}
      <h2 className="font-display text-xl md:text-2xl font-semibold text-stone-900">
        {title}
      </h2>
    </div>
  );
}

function CorpusSourceCard({ cs }: { cs: CorpusSource }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-stone-200 bg-white rounded-sm p-3 text-sm">
      <div
        className="flex items-start gap-2 cursor-pointer"
        onClick={() => setOpen(!open)}
      >
        <span className="text-stone-400 shrink-0 w-5 font-mono text-xs">{open ? "▾" : "▸"}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap font-display">
            <span className="text-blue-900 font-mono text-xs">
              {cs.tier.replace("tier-", "T").replace(/-.*/, "")}
            </span>
            <span className="text-stone-900 font-medium text-sm truncate">
              {cs.source.split("/").pop()}
            </span>
            <span className="text-stone-500 font-mono text-xs">w:{cs.weight.toFixed(1)}</span>
          </div>
          <p className="text-stone-600 mt-1 text-sm leading-relaxed">{cs.relevance}</p>
        </div>
      </div>
      {open && cs.citedPassage && (
        <blockquote className="mt-3 ml-7 pl-3 border-l-2 border-stone-300 text-stone-700 italic whitespace-pre-wrap text-sm leading-relaxed">
          {cs.citedPassage}
        </blockquote>
      )}
    </div>
  );
}

function AnalysisStepCard({ step }: { step: AnalysisStep }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-l-2 border-stone-200 pl-4">
      <div
        className="cursor-pointer flex items-start gap-2 hover:text-blue-900 transition-colors"
        onClick={() => setOpen(!open)}
      >
        <span className="text-stone-400 font-mono text-xs shrink-0">
          {open ? "▾" : "▸"} {step.step}.
        </span>
        <span className="text-sm font-display font-medium text-stone-900">{step.description}</span>
      </div>
      {open && (
        <div className="mt-2 ml-6 text-sm text-stone-700 whitespace-pre-wrap leading-relaxed">
          {step.reasoning}
        </div>
      )}
    </div>
  );
}

function DecisionCard({
  d,
  divergence,
}: {
  d: Decision;
  divergence?: Divergence;
}) {
  const [open, setOpen] = useState(false);
  const rt = d.reasoningTree;

  return (
    <div className="border border-stone-200 bg-white rounded-sm">
      {/* Header */}
      <div
        className="p-4 cursor-pointer hover:bg-stone-50 transition-colors"
        onClick={() => setOpen(!open)}
      >
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-stone-500 font-mono text-sm">
            #{String(d.proposalId).match(/^\d+/)?.[0]?.padStart(3, "0") ?? d.proposalId}
          </span>
          <span className="font-display font-medium text-stone-900 flex-1 min-w-0">{d.title}</span>
          <RecBadge rec={d.recommendation} />
          <ScoreBadge score={d.maximAlignmentScore} />
          {divergence && (
            <span className="text-xs text-amber-700 border border-amber-200 bg-amber-50 px-2 py-0.5 font-mono rounded-sm">
              DIVERGED
            </span>
          )}
        </div>
        <div className="flex gap-4 mt-2 text-xs text-stone-500 font-display">
          <span className="font-mono">{d.date}</span>
          {d.model && <span className="font-mono">{d.model}</span>}
          {d.systemPromptVersion && <span className="font-mono">prompt v{d.systemPromptVersion}</span>}
        </div>
      </div>

      {/* Expanded content */}
      {open && (
        <div className="border-t border-stone-200 p-5 space-y-7 bg-stone-50/50">
          {/* Inputs */}
          {rt?.inputs && Object.keys(rt.inputs).length > 0 && (
            <div>
              <h4 className="font-display text-[11px] text-stone-500 uppercase tracking-[0.14em] mb-2 font-medium">
                Inputs
              </h4>
              <div className="grid grid-cols-1 gap-1 text-sm">
                {Object.entries(rt.inputs).map(([k, v]) => (
                  <div key={k} className="flex gap-2">
                    <span className="text-stone-500 shrink-0 font-mono text-xs">{k}:</span>
                    <span className="text-stone-700">
                      {typeof v === "object" ? JSON.stringify(v) : String(v)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Corpus Sources */}
          {rt?.corpusSources && rt.corpusSources.length > 0 && (
            <div>
              <h4 className="font-display text-[11px] text-stone-500 uppercase tracking-[0.14em] mb-2 font-medium">
                Corpus Sources Consulted ({rt.corpusSources.length})
              </h4>
              <div className="space-y-2">
                {rt.corpusSources.map((cs, i) => (
                  <CorpusSourceCard key={i} cs={cs} />
                ))}
              </div>
            </div>
          )}

          {/* Analysis */}
          {rt?.analysis && rt.analysis.length > 0 && (
            <div>
              <h4 className="font-display text-[11px] text-stone-500 uppercase tracking-[0.14em] mb-2 font-medium">
                Analysis ({rt.analysis.length} steps)
              </h4>
              <div className="space-y-3">
                {rt.analysis.map((a) => (
                  <AnalysisStepCard key={a.step} step={a} />
                ))}
              </div>
            </div>
          )}

          {/* Alternatives Considered */}
          {rt?.alternativesConsidered && rt.alternativesConsidered.length > 0 && (
            <div>
              <h4 className="font-display text-[11px] text-stone-500 uppercase tracking-[0.14em] mb-2 font-medium">
                Alternatives Considered
              </h4>
              <div className="space-y-3">
                {rt.alternativesConsidered.map((a, i) => (
                  <div key={i} className="border-l-2 border-stone-200 pl-4 text-sm">
                    <p className="text-stone-900 font-display font-medium">{a.alternative}</p>
                    <p className="text-stone-600 mt-1 whitespace-pre-wrap leading-relaxed">
                      {a.reasoning || a.reason_rejected || a.rejected_because || ""}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Deferred Decisions */}
          {rt?.deferredDecisions && rt.deferredDecisions.length > 0 && (
            <div>
              <h4 className="font-display text-[11px] text-stone-500 uppercase tracking-[0.14em] mb-2 font-medium">
                Deferred Decisions
              </h4>
              <div className="space-y-2">
                {rt.deferredDecisions.map((dd, i) => (
                  <div key={i} className="border border-stone-200 bg-white rounded-sm p-3 text-sm">
                    <p className="text-stone-900 font-display font-medium">{dd.item}</p>
                    <p className="text-stone-600 mt-1">
                      <span className="text-stone-500 font-mono text-xs">trigger:</span>{" "}
                      {dd.trigger_condition}
                    </p>
                    {dd.review_date && (
                      <p className="text-stone-500 mt-1 font-mono text-xs">review: {dd.review_date}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Uncertainties */}
          {rt?.uncertaintiesAndLimitations && rt.uncertaintiesAndLimitations.length > 0 && (
            <div>
              <h4 className="font-display text-[11px] text-stone-500 uppercase tracking-[0.14em] mb-2 font-medium">
                Uncertainties &amp; Limitations
              </h4>
              <ul className="space-y-2 text-sm text-stone-700">
                {rt.uncertaintiesAndLimitations.map((u, i) => (
                  <li key={i} className="pl-4 border-l-2 border-amber-300 leading-relaxed">
                    {u}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Traceability Chain */}
          {rt?.traceabilityChain && (
            <div>
              <h4 className="font-display text-[11px] text-stone-500 uppercase tracking-[0.14em] mb-2 font-medium">
                Traceability Chain (Recommendation → Maxim)
              </h4>
              <div className="bg-white border border-stone-200 rounded-sm p-4 text-sm text-stone-700 whitespace-pre-wrap leading-relaxed">
                {rt.traceabilityChain}
              </div>
            </div>
          )}

          {/* Divergence */}
          {divergence && (
            <div className="border border-amber-300 bg-amber-50 rounded-sm p-4">
              <h4 className="font-display text-[11px] text-amber-800 uppercase tracking-[0.14em] mb-3 font-medium">
                Divergence #{divergence.divergenceId}
              </h4>
              {divergence.domain && (
                <p className="text-xs text-stone-600 mb-2 font-mono">{divergence.domain}</p>
              )}
              <div className="space-y-2 text-sm">
                <p>
                  <span className="text-stone-500 font-mono text-xs">algorithmic manager:</span>{" "}
                  <span className="text-stone-800">
                    {divergence.algorithmicManagerRecommendation}
                  </span>
                </p>
                <p>
                  <span className="text-stone-500 font-mono text-xs">human executor:</span>{" "}
                  <span className="text-amber-800 font-medium">
                    {divergence.humanExecutorDecision}
                  </span>
                </p>
                <p className="text-stone-700 mt-2 whitespace-pre-wrap leading-relaxed">
                  {divergence.reasoning}
                </p>
                {divergence.maximAlignmentAssessment && (
                  <p className="text-stone-600 mt-2 italic leading-relaxed">
                    {divergence.maximAlignmentAssessment}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function Home() {
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [divergences, setDivergences] = useState<Divergence[]>([]);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [decs, divs, props] = await Promise.all([
          fetchDirJson<Decision>("governance/decisions"),
          fetchDirJson<Divergence>("governance/divergences"),
          fetchDirJson<Proposal>("governance/proposals"),
        ]);
        setDecisions(decs.sort((a, b) => Number(b.proposalId) - Number(a.proposalId)));
        setDivergences(divs);
        setProposals(props.sort((a, b) => b.proposalId - a.proposalId));
      } catch (e) {
        setError(String(e));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const avgScore = decisions.length
    ? Math.round(
        decisions.reduce((s, d) => s + d.maximAlignmentScore, 0) / decisions.length
      )
    : 0;

  return (
    <div className="min-h-screen">
      {/* Masthead */}
      <header className="border-b border-stone-200 bg-white">
        <div className="max-w-3xl mx-auto px-5 md:px-8 pt-10 md:pt-14 pb-8">
          <p className="font-display text-[11px] uppercase tracking-[0.16em] text-stone-500 mb-3">
            Wyoming Decentralized Autonomous Organization · Governance Research Artifact
          </p>
          <h1 className="font-display text-3xl md:text-[2.5rem] font-semibold tracking-tight text-stone-900 leading-tight mb-4">
            OpenInnovate DAO LLC
          </h1>
          <p className="text-stone-700 text-base md:text-lg leading-relaxed mb-6 max-w-2xl">
            A live governance experiment: can a constitutionally constrained AI
            make organizational decision-making more transparent than any
            human-led organization?
          </p>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-xs font-display">
            <div className="flex gap-2">
              <dt className="text-stone-500 uppercase tracking-wider w-24 shrink-0">Filing</dt>
              <dd className="text-stone-800 font-mono">Wyoming #2026-001929314</dd>
            </div>
            <div className="flex gap-2">
              <dt className="text-stone-500 uppercase tracking-wider w-24 shrink-0">Statute</dt>
              <dd className="text-stone-800">W.S. 17-31-101 et seq.</dd>
            </div>
            <div className="flex gap-2">
              <dt className="text-stone-500 uppercase tracking-wider w-24 shrink-0">Contract</dt>
              <dd className="font-mono">
                <a href={BASESCAN} target="_blank" rel="noreferrer">
                  {CONTRACT.slice(0, 10)}…{CONTRACT.slice(-6)}
                </a>
              </dd>
            </div>
            <div className="flex gap-2">
              <dt className="text-stone-500 uppercase tracking-wider w-24 shrink-0">Network</dt>
              <dd className="text-stone-800">Base L2 (8453)</dd>
            </div>
            <div className="flex gap-2">
              <dt className="text-stone-500 uppercase tracking-wider w-24 shrink-0">Source</dt>
              <dd>
                <a href={`https://github.com/${REPO}`} target="_blank" rel="noreferrer">
                  github.com/{REPO}
                </a>
              </dd>
            </div>
            <div className="flex gap-2">
              <dt className="text-stone-500 uppercase tracking-wider w-24 shrink-0">Founded</dt>
              <dd className="text-stone-800">March 2026</dd>
            </div>
          </dl>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-5 md:px-8 py-12 md:py-16">
        {/* About */}
        <section className="mb-14">
          <SectionHeading eyebrow="§1" title="About the Experiment" />
          <div className="space-y-5 text-base text-stone-800 leading-relaxed">
            <p>
              OpenInnovate DAO LLC is a Wyoming-registered legal entity whose
              material operational decisions are evaluated by a
              constitutionally constrained AI — the{" "}
              <span className="font-medium">Algorithmic Manager</span> (Claude,
              developed by Anthropic) — against a 155-document constitutional
              corpus. The reasoning tree, corpus citations, alignment score,
              and any human override are published in real time and
              cryptographically anchored on Base L2.
            </p>
            <p>
              Most organizations make decisions behind closed doors and justify
              them after the fact. This entity inverts that: every proposal
              produces a public reasoning tree before action is taken. A human
              executor — required by Wyoming statute — acts on the AI&apos;s
              recommendation, or formally diverges and records the override
              with its reasoning and legal basis.
            </p>
            <p>
              The organization is the experiment, and this site is its public
              record. The corpus, reasoning trees, divergence log, and
              contracts are public artifacts intended for research, replication,
              and critique — not commercial use.
            </p>
          </div>
        </section>

        {/* Methodology */}
        <section className="mb-14">
          <SectionHeading eyebrow="§2" title="Methodology" />
          <p className="text-stone-700 text-base leading-relaxed mb-6 max-w-2xl">
            Each governance act passes through five stages. Every stage
            produces an artifact that is committed to the public repository
            and, where applicable, anchored on-chain.
          </p>
          <ol className="space-y-5">
            {[
              {
                n: "1",
                title: "Proposal",
                desc: "A human submits a structured JSON proposal with rationale, milestones, and out-of-scope notes. The proposal is committed to GitHub and its hash is recorded on-chain via submitProposal.",
              },
              {
                n: "2",
                title: "Constitutional Evaluation",
                desc: "The Algorithmic Manager retrieves a weighted subset of the corpus most relevant to the proposal, reasons through a six-step analysis (corpus consultation, option analysis, alternatives, deferred decisions, traceability, follow-on recommendations), and emits a reasoning tree with a Maxim Alignment Score from 0 to 100.",
              },
              {
                n: "3",
                title: "Decision Record",
                desc: "The reasoning tree is committed to the repository and its canonical hash is recorded on-chain via recordDecision, indexed by the on-chain proposal ID. The Algorithmic Manager has no execution authority — only an opinion of record.",
              },
              {
                n: "4",
                title: "Human Execution or Divergence",
                desc: "The Human Executor reviews the recommendation. If they act on it, an execution record is committed and attestExecution anchors the execution hash on-chain. If they override, a divergence record is committed and recordDivergence anchors the override with its reasoning and statutory basis.",
              },
              {
                n: "5",
                title: "Verification",
                desc: "verify.py and external auditors can reconstruct any decision from the on-chain hash and the public repository — including the exact corpus passages, alignment score, alternatives considered, and traceability chain back to the Root Thesis Maxim.",
              },
            ].map((s) => (
              <li key={s.n} className="flex gap-4">
                <span className="font-display font-mono text-xs text-stone-500 shrink-0 w-6 pt-1">
                  {s.n}
                </span>
                <div>
                  <h3 className="font-display text-[15px] font-semibold text-stone-900 mb-1">
                    {s.title}
                  </h3>
                  <p className="text-stone-700 text-base leading-relaxed">
                    {s.desc}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* Research Questions */}
        <section className="mb-14">
          <SectionHeading eyebrow="§3" title="Research Questions" />
          <p className="text-stone-700 text-base leading-relaxed mb-6 max-w-2xl">
            The open questions this experiment is designed to answer. The live
            record below is the data.
          </p>
          <div className="space-y-5">
            {[
              {
                q: "Can a constitutionally constrained AI produce more transparent organizational decisions than a human board?",
                a: "Every reasoning tree, corpus citation, and alignment score is published. The comparison set is any organization that publishes its decision-making rationale and allows external audit. The hypothesis is that constitutional AI governance produces a more auditable record than standard corporate governance.",
              },
              {
                q: "Does on-chain reasoning provenance change accountability dynamics?",
                a: "Decision hashes recorded on Base L2 mean reasoning cannot be retroactively edited. The hypothesis is that immutable provenance shifts how decisions are made in the first place — not only how they are reviewed.",
              },
              {
                q: "Is the divergence log itself a useful research artifact?",
                a: "Every time the human executor overrides the AI, the divergence is recorded with reasoning and legal basis. The log is a public dataset of where constitutional AI judgment and human judgment disagree, and why.",
              },
              {
                q: "How does Maxim Alignment Score track against post-hoc evaluation of decision quality?",
                a: "The AI assigns a 0–100 alignment score to every decision against a stated root thesis maxim. Whether that score predicts long-run decision quality is an empirical question this experiment is designed to surface, not assume.",
              },
            ].map((item, i) => (
              <div key={i}>
                <h3 className="font-display text-[15px] font-semibold text-stone-900 mb-1 leading-snug">
                  {item.q}
                </h3>
                <p className="text-stone-700 text-base leading-relaxed">
                  {item.a}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Live Record */}
        <section className="mb-14">
          <SectionHeading eyebrow="§4" title="Live Record" />
          <p className="text-stone-700 text-base leading-relaxed mb-6 max-w-2xl">
            Every governance act this entity has taken, from formation to the
            most recent decision. Click any row to expand the full reasoning
            tree, corpus citations, alternatives considered, and traceability
            chain.
          </p>

          {loading && (
            <div className="text-center py-16 text-stone-500 text-sm">
              Loading governance data from GitHub…
            </div>
          )}
          {error && (
            <div className="text-center py-16 text-red-700 text-sm">Error: {error}</div>
          )}

          {!loading && !error && (
            <>
              <dl className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
                {[
                  { label: "Decisions", value: decisions.length },
                  { label: "Avg Score", value: `${avgScore}/100` },
                  { label: "Divergences", value: divergences.length },
                  { label: "Proposals", value: proposals.length },
                ].map((s) => (
                  <div key={s.label} className="border border-stone-200 bg-white rounded-sm p-4">
                    <dt className="font-display text-[10px] text-stone-500 uppercase tracking-[0.14em] font-medium">
                      {s.label}
                    </dt>
                    <dd className="font-display text-2xl font-semibold font-mono mt-1 text-stone-900">
                      {s.value}
                    </dd>
                  </div>
                ))}
              </dl>

              <div className="space-y-3">
                {decisions.map((d) => {
                  const div = divergences.find(
                    (dv) => dv.decisionId === d.decisionId
                  );
                  return (
                    <DecisionCard
                      key={`${d.proposalId}-${d.decisionId}`}
                      d={d}
                      divergence={div}
                    />
                  );
                })}
              </div>
            </>
          )}
        </section>

        {/* Constitutional Corpus */}
        <section className="mb-14">
          <SectionHeading eyebrow="§5" title="Constitutional Corpus" />
          <p className="text-stone-700 text-base leading-relaxed mb-6 max-w-2xl">
            155 documents organized into four weighted tiers. The Algorithmic
            Manager retrieves a weighted, relevance-ranked subset for every
            evaluation. Tier weights are themselves a governance act and can
            only be changed through the proposal pipeline.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[
              {
                tier: "Tier 1 — Governance",
                weight: 1.0,
                docs: 50,
                desc: "Buffett Owner's Manual, 48 Berkshire shareholder letters (1977–2024), Munger's Psychology of Human Misjudgment.",
              },
              {
                tier: "Tier 2 — Civic",
                weight: 0.9,
                docs: 88,
                desc: "U.S. Constitution + Bill of Rights, the 85 Federalist Papers, the UN Universal Declaration of Human Rights, Ostrom's Eight Principles for Managing a Commons.",
              },
              {
                tier: "Tier 3 — Systems",
                weight: 0.8,
                docs: 11,
                desc: "Meadows on leverage points, Buterin on coin voting and plutocracy, MakerDAO governance manual, ENS DAO docs, Morrison et al. on the DAO controversy, token economy design literature.",
              },
              {
                tier: "Tier 4 — Wyoming",
                weight: 1.2,
                docs: 2,
                desc: "Wyoming Constitution, Wyoming DAO Supplement (W.S. 17-31-101 through 17-31-116). Highest weight: statutory law preempts contractual provisions.",
              },
            ].map((t) => (
              <div
                key={t.tier}
                className="border border-stone-200 bg-white rounded-sm p-4"
              >
                <div className="flex items-baseline justify-between mb-2 gap-2">
                  <span className="font-display font-semibold text-sm text-stone-900">{t.tier}</span>
                  <span className="text-xs text-stone-500 font-mono">
                    w:{t.weight} · {t.docs} docs
                  </span>
                </div>
                <p className="text-sm text-stone-700 leading-relaxed">{t.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Constitutional Hierarchy */}
        <section className="mb-14">
          <SectionHeading eyebrow="§6" title="Constitutional Hierarchy" />
          <p className="text-stone-700 text-base leading-relaxed mb-5 max-w-2xl">
            Per Wyoming Statute 17-31-115, the smart contract preempts the
            Articles of Organization, except where W.S. 17-31-104 and
            17-31-106(a)/(b) reserve specific matters for the Articles. The
            Operating Agreement supplements the above and does not override
            either.
          </p>
          <ol className="space-y-3">
            {[
              {
                n: "1",
                label: "Smart Contract",
                desc: "preempts conflicting provisions of the Articles, except where statute reserves the matter.",
              },
              {
                n: "2",
                label: "Articles of Organization",
                desc: "preempts conflicting provisions of the Operating Agreement.",
              },
              {
                n: "3",
                label: "Operating Agreement",
                desc: "supplements the above; does not override.",
              },
            ].map((h) => (
              <li key={h.n} className="flex gap-4 items-baseline">
                <span className="font-mono text-stone-500 text-sm shrink-0 w-5">{h.n}.</span>
                <div className="text-base">
                  <span className="font-display font-semibold text-stone-900">{h.label}</span>{" "}
                  <span className="text-stone-700">— {h.desc}</span>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* Primary Sources */}
        <section className="mb-14">
          <SectionHeading eyebrow="§7" title="Primary Sources" />
          <p className="text-stone-700 text-base leading-relaxed mb-6 max-w-2xl">
            Everything this site presents is derived from these public artifacts.
          </p>
          <ul className="space-y-3 text-base">
            {[
              {
                label: "Constitutional corpus",
                desc: "155 source documents, weighted across four tiers.",
                href: `https://github.com/${REPO}/tree/${BRANCH}/corpus`,
                hrefLabel: "github.com/…/corpus",
              },
              {
                label: "Smart contract — OpenInnovateGovernanceV2",
                desc: "UUPS upgradeable, role-based access control, 7-day timelock on administrative changes.",
                href: BASESCAN,
                hrefLabel: `${CONTRACT.slice(0, 10)}…${CONTRACT.slice(-6)}`,
              },
              {
                label: "Timelock controller",
                desc: "Gates contract upgrades and role changes.",
                href: TIMELOCK_SCAN,
                hrefLabel: `${TIMELOCK.slice(0, 10)}…${TIMELOCK.slice(-6)}`,
              },
              {
                label: "Reasoning trees",
                desc: "Every decision the Algorithmic Manager has produced.",
                href: `https://github.com/${REPO}/tree/${BRANCH}/governance/decisions`,
                hrefLabel: "github.com/…/decisions",
              },
              {
                label: "Divergence log",
                desc: "Every time the Human Executor has overridden the AI.",
                href: `https://github.com/${REPO}/tree/${BRANCH}/governance/divergences`,
                hrefLabel: "github.com/…/divergences",
              },
              {
                label: "Operating Agreement and Articles",
                desc: "Governing legal documents.",
                href: `https://github.com/${REPO}/tree/${BRANCH}/legal`,
                hrefLabel: "github.com/…/legal",
              },
              {
                label: "Wyoming DAO Supplement",
                desc: "W.S. 17-31-101 through 17-31-116 (statute under which this entity is organized).",
                href: `https://github.com/${REPO}/blob/${BRANCH}/legal/wyoming-dao-supplement-title17-ch31.md`,
                hrefLabel: "W.S. 17-31",
              },
            ].map((s) => (
              <li key={s.label} className="border-b border-stone-200 pb-3 last:border-0">
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span className="font-display font-semibold text-stone-900">{s.label}</span>
                  <a href={s.href} target="_blank" rel="noreferrer" className="text-sm font-mono">
                    {s.hrefLabel} ↗
                  </a>
                </div>
                <p className="text-stone-700 text-sm mt-1 leading-relaxed">{s.desc}</p>
              </li>
            ))}
          </ul>
        </section>

        {/* Inquiries */}
        <section className="mb-14">
          <SectionHeading eyebrow="§8" title="Inquiries" />
          <p className="text-stone-700 text-base leading-relaxed max-w-2xl">
            The DAO welcomes inquiries from researchers, journalists,
            governance scholars, and legal or compliance practitioners. It does
            not offer commercial services, financial products, or paid
            consulting. Substantive correspondence may be addressed to{" "}
            <a href="mailto:collaborate@openinnovate.org">
              collaborate@openinnovate.org
            </a>
            .
          </p>
        </section>

        {/* Maxim */}
        <aside className="border-t border-b border-stone-300 py-8 mb-14">
          <p className="font-display text-[10px] uppercase tracking-[0.18em] text-stone-500 mb-3">
            Root Thesis Maxim
          </p>
          <blockquote className="text-lg md:text-xl italic text-stone-800 leading-relaxed">
            &ldquo;Maximize the creation of sovereign, self-sustaining systems
            that compound human agency over generational timescales.&rdquo;
          </blockquote>
        </aside>
      </main>

      {/* Footer */}
      <footer className="border-t border-stone-200 bg-white">
        <div className="max-w-3xl mx-auto px-5 md:px-8 py-8 text-sm text-stone-600 space-y-3">
          <p className="font-display">
            <span className="text-stone-900 font-medium">OpenInnovate DAO LLC</span>{" "}
            · Wyoming Decentralized Autonomous Organization · Filing
            #2026-001929314 · Organized under W.S. 17-31-101 et seq.
          </p>
          <p>
            Maintained by{" "}
            <a href="https://github.com/hocmemini">Jonathan Piccirilli</a>, sole
            Member and Human Executor. Algorithmic Manager: Claude, developed
            by{" "}
            <a href="https://anthropic.com">Anthropic</a>. Data fetched live
            from{" "}
            <a href={`https://github.com/${REPO}`}>GitHub</a>.
          </p>
          <p className="text-xs text-stone-500 leading-relaxed pt-2 border-t border-stone-100">
            OpenInnovate DAO LLC does not issue tokens, solicit investment,
            or offer financial returns. This site is a public governance
            research artifact. Nothing on this site constitutes investment
            advice, a securities offering, or a solicitation of funds.
          </p>
        </div>
      </footer>
    </div>
  );
}
