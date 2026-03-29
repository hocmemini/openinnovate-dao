"use client";

import { useEffect, useState } from "react";

const REPO = "hocmemini/openinnovate-dao";
const BRANCH = "main";
const GH_API = `https://api.github.com/repos/${REPO}/contents`;
const GH_RAW = `https://raw.githubusercontent.com/${REPO}/${BRANCH}`;
const CONTRACT = "0x3efDCccF7b141B5dA4B21478221B0bf0cfdF7536";
const BASESCAN = `https://basescan.org/address/${CONTRACT}`;

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
  const color =
    score >= 90
      ? "text-green-400 border-green-400/30 bg-green-400/5"
      : score >= 70
        ? "text-blue-400 border-blue-400/30 bg-blue-400/5"
        : score >= 50
          ? "text-yellow-400 border-yellow-400/30 bg-yellow-400/5"
          : "text-red-400 border-red-400/30 bg-red-400/5";
  return (
    <span className={`inline-block border px-2 py-0.5 text-xs font-mono ${color}`}>
      {score}/100
    </span>
  );
}

function RecBadge({ rec }: { rec: string }) {
  const colors: Record<string, string> = {
    APPROVE: "text-green-400 border-green-400/30 bg-green-400/5",
    MODIFY: "text-yellow-400 border-yellow-400/30 bg-yellow-400/5",
    REJECT: "text-red-400 border-red-400/30 bg-red-400/5",
    DEFER: "text-neutral-400 border-neutral-400/30 bg-neutral-400/5",
  };
  return (
    <span className={`inline-block border px-2 py-0.5 text-xs font-mono ${colors[rec] || colors.DEFER}`}>
      {rec}
    </span>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="text-lg font-bold mb-4 pb-2 border-b border-neutral-800">
        {title}
      </h2>
      {children}
    </section>
  );
}

function CorpusSourceCard({ cs }: { cs: CorpusSource }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-neutral-800 p-3 text-xs">
      <div
        className="flex items-start gap-2 cursor-pointer"
        onClick={() => setOpen(!open)}
      >
        <span className="text-neutral-500 shrink-0 w-5">{open ? "▾" : "▸"}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-blue-400 font-mono">
              {cs.tier.replace("tier-", "T").replace(/-.*/, "")}
            </span>
            <span className="text-neutral-200 font-medium truncate">
              {cs.source.split("/").pop()}
            </span>
            <span className="text-neutral-600 font-mono">w:{cs.weight.toFixed(1)}</span>
          </div>
          <p className="text-neutral-500 mt-1">{cs.relevance}</p>
        </div>
      </div>
      {open && cs.citedPassage && (
        <blockquote className="mt-3 ml-7 pl-3 border-l-2 border-neutral-700 text-neutral-400 italic whitespace-pre-wrap">
          {cs.citedPassage}
        </blockquote>
      )}
    </div>
  );
}

function AnalysisStepCard({ step }: { step: AnalysisStep }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-l-2 border-neutral-800 pl-4">
      <div
        className="cursor-pointer flex items-start gap-2 hover:text-blue-400 transition-colors"
        onClick={() => setOpen(!open)}
      >
        <span className="text-neutral-600 font-mono text-xs shrink-0">
          {open ? "▾" : "▸"} {step.step}.
        </span>
        <span className="text-sm font-medium">{step.description}</span>
      </div>
      {open && (
        <div className="mt-2 ml-6 text-xs text-neutral-400 whitespace-pre-wrap leading-relaxed">
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
    <div className="border border-neutral-800 bg-neutral-950">
      {/* Header */}
      <div
        className="p-4 cursor-pointer hover:bg-neutral-900 transition-colors"
        onClick={() => setOpen(!open)}
      >
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-neutral-600 font-mono text-sm">
            #{String(d.proposalId).match(/^\d+/)?.[0]?.padStart(3, "0") ?? d.proposalId}
          </span>
          <span className="font-medium flex-1 min-w-0">{d.title}</span>
          <RecBadge rec={d.recommendation} />
          <ScoreBadge score={d.maximAlignmentScore} />
          {divergence && (
            <span className="text-xs text-yellow-400 border border-yellow-400/30 bg-yellow-400/5 px-2 py-0.5 font-mono">
              DIVERGED
            </span>
          )}
        </div>
        <div className="flex gap-4 mt-2 text-xs text-neutral-600">
          <span>{d.date}</span>
          {d.model && <span>{d.model}</span>}
          {d.systemPromptVersion && <span>prompt v{d.systemPromptVersion}</span>}
        </div>
      </div>

      {/* Expanded content */}
      {open && (
        <div className="border-t border-neutral-800 p-4 space-y-6">
          {/* Inputs */}
          {rt?.inputs && Object.keys(rt.inputs).length > 0 && (
            <div>
              <h4 className="text-xs text-neutral-500 uppercase tracking-wider mb-2">
                Inputs
              </h4>
              <div className="grid grid-cols-1 gap-1 text-xs">
                {Object.entries(rt.inputs).map(([k, v]) => (
                  <div key={k} className="flex gap-2">
                    <span className="text-neutral-600 shrink-0 font-mono">{k}:</span>
                    <span className="text-neutral-400">
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
              <h4 className="text-xs text-neutral-500 uppercase tracking-wider mb-2">
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
              <h4 className="text-xs text-neutral-500 uppercase tracking-wider mb-2">
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
              <h4 className="text-xs text-neutral-500 uppercase tracking-wider mb-2">
                Alternatives Considered
              </h4>
              <div className="space-y-3">
                {rt.alternativesConsidered.map((a, i) => (
                  <div key={i} className="border-l-2 border-neutral-800 pl-4 text-xs">
                    <p className="text-neutral-300 font-medium">{a.alternative}</p>
                    <p className="text-neutral-500 mt-1 whitespace-pre-wrap">
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
              <h4 className="text-xs text-neutral-500 uppercase tracking-wider mb-2">
                Deferred Decisions
              </h4>
              <div className="space-y-2">
                {rt.deferredDecisions.map((dd, i) => (
                  <div key={i} className="border border-neutral-800 p-3 text-xs">
                    <p className="text-neutral-300 font-medium">{dd.item}</p>
                    <p className="text-neutral-500 mt-1">
                      <span className="text-neutral-600">Trigger:</span>{" "}
                      {dd.trigger_condition}
                    </p>
                    {dd.review_date && (
                      <p className="text-neutral-600 mt-1">Review: {dd.review_date}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Uncertainties */}
          {rt?.uncertaintiesAndLimitations && rt.uncertaintiesAndLimitations.length > 0 && (
            <div>
              <h4 className="text-xs text-neutral-500 uppercase tracking-wider mb-2">
                Uncertainties &amp; Limitations
              </h4>
              <ul className="space-y-2 text-xs text-neutral-500">
                {rt.uncertaintiesAndLimitations.map((u, i) => (
                  <li key={i} className="pl-4 border-l border-red-400/20">
                    {u}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Traceability Chain */}
          {rt?.traceabilityChain && (
            <div>
              <h4 className="text-xs text-neutral-500 uppercase tracking-wider mb-2">
                Traceability Chain (Recommendation → Maxim)
              </h4>
              <div className="bg-neutral-900 border border-neutral-800 p-4 text-xs text-neutral-400 whitespace-pre-wrap leading-relaxed">
                {rt.traceabilityChain}
              </div>
            </div>
          )}

          {/* Divergence */}
          {divergence && (
            <div className="border border-yellow-400/30 bg-yellow-400/5 p-4">
              <h4 className="text-xs text-yellow-400 uppercase tracking-wider mb-3">
                Divergence #{divergence.divergenceId}
              </h4>
              {divergence.domain && (
                <p className="text-xs text-neutral-400 mb-2">{divergence.domain}</p>
              )}
              <div className="space-y-2 text-xs">
                <p>
                  <span className="text-neutral-500">Algorithmic Manager:</span>{" "}
                  <span className="text-neutral-300">
                    {divergence.algorithmicManagerRecommendation}
                  </span>
                </p>
                <p>
                  <span className="text-neutral-500">Human Executor:</span>{" "}
                  <span className="text-yellow-400">
                    {divergence.humanExecutorDecision}
                  </span>
                </p>
                <p className="text-neutral-400 mt-2 whitespace-pre-wrap">
                  {divergence.reasoning}
                </p>
                {divergence.maximAlignmentAssessment && (
                  <p className="text-neutral-500 mt-2 italic">
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
        setDecisions(decs.sort((a, b) => Number(a.proposalId) - Number(b.proposalId)));
        setDivergences(divs);
        setProposals(props.sort((a, b) => a.proposalId - b.proposalId));
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
    <div className="min-h-screen p-4 md:p-8 max-w-5xl mx-auto">
      {/* Header */}
      <header className="mb-10">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight mb-1">
          OpenInnovate DAO LLC
        </h1>
        <p className="text-neutral-500 text-sm mb-4">
          AI-augmented direct democracy on Base L2, governed by a weighted
          constitutional corpus.
        </p>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-neutral-600">
          <a href={BASESCAN} className="text-blue-400 hover:underline" target="_blank">
            {CONTRACT.slice(0, 10)}...{CONTRACT.slice(-8)}
          </a>
          <span>Base L2 (8453)</span>
          <span>Wyoming #2026-001929314</span>
          <a
            href={`https://github.com/${REPO}`}
            className="text-blue-400 hover:underline"
            target="_blank"
          >
            Source
          </a>
        </div>
      </header>

      {/* What is OpenInnovate? */}
      <section className="mb-10">
        <h2 className="text-xl md:text-2xl font-bold tracking-tight mb-4">
          What is OpenInnovate?
        </h2>
        <div className="space-y-4 text-sm text-neutral-300 leading-relaxed">
          <p>
            OpenInnovate is a{" "}
            <strong className="text-neutral-100">
              Wyoming-registered DAO LLC
            </strong>{" "}
            that uses an AI governance engine to make every organizational
            decision transparent, constitutional, and on-chain verifiable.
          </p>
          <p>
            Most organizations make decisions behind closed doors and justify
            them after the fact. OpenInnovate inverts this: every proposal is
            evaluated by an{" "}
            <strong className="text-neutral-100">Algorithmic Manager</strong>{" "}
            (Claude, developed by Anthropic) against a{" "}
            <strong className="text-neutral-100">
              155-document constitutional corpus
            </strong>{" "}
            — drawing from the Federalist Papers, Warren Buffett&apos;s
            shareholder letters, Elinor Ostrom&apos;s commons governance,
            Wyoming DAO statutes, and systems thinking frameworks. The AI
            produces a scored reasoning tree. A human executor acts on it. If
            the human disagrees with the AI, the divergence is recorded on-chain
            with a legal citation.
          </p>
          <p>
            The result is an organization where you can audit every decision back
            to its constitutional basis — who proposed it, what the AI
            recommended, what score it received, whether the human agreed, and
            the exact corpus passages that informed the judgment.
          </p>
        </div>
      </section>

      {/* How it works */}
      <section className="mb-10">
        <h2 className="text-lg font-bold mb-4 pb-2 border-b border-neutral-800">
          How It Works
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            {
              step: "1",
              title: "Propose",
              desc: "A human submits a proposal as structured JSON — describing what the DAO should do and why.",
            },
            {
              step: "2",
              title: "Evaluate",
              desc: "The AI evaluates the proposal against the weighted constitutional corpus, producing a reasoning tree with a Maxim Alignment Score (0-100).",
            },
            {
              step: "3",
              title: "Decide & Record",
              desc: "The human executor reviews the AI\u2019s recommendation, acts on it (or formally diverges), and the decision is hashed and recorded on Base L2.",
            },
          ].map((s) => (
            <div
              key={s.step}
              className="border border-neutral-800 bg-neutral-950 p-4"
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="text-blue-400 font-bold font-mono text-lg">
                  {s.step}
                </span>
                <span className="font-medium">{s.title}</span>
              </div>
              <p className="text-xs text-neutral-500 leading-relaxed">
                {s.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Why this matters */}
      <section className="mb-10">
        <h2 className="text-lg font-bold mb-4 pb-2 border-b border-neutral-800">
          Why This Matters
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-neutral-400">
          {[
            {
              title: "Constitutional AI governance",
              desc: "Decisions aren\u2019t based on vibes or authority — they\u2019re grounded in a curated corpus of governance, legal, civic, and systems thinking literature.",
            },
            {
              title: "Full transparency",
              desc: "Every reasoning tree, corpus citation, and alignment score is public. The dashboard below shows every decision this DAO has ever made.",
            },
            {
              title: "Human override with accountability",
              desc: "The human can always override the AI. But when they do, the divergence is recorded on-chain with the reasoning and legal basis — no quiet vetoes.",
            },
            {
              title: "On-chain verification",
              desc: "Decision hashes are recorded on Base L2 via a UUPS upgradeable contract with RBAC and a 7-day timelock on administrative changes.",
            },
          ].map((item) => (
            <div
              key={item.title}
              className="border border-neutral-800 bg-neutral-950 p-4"
            >
              <p className="text-neutral-200 font-medium text-sm mb-1">
                {item.title}
              </p>
              <p className="leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Services */}
      <section className="mb-10">
        <h2 className="text-lg font-bold mb-4 pb-2 border-b border-neutral-800">
          Services
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            {
              title: "Governance Health Check",
              price: "Free",
              desc: "A 30-minute assessment of your DAO\u2019s governance structure, decision-making processes, and constitutional gaps. We run your governance documents through our evaluation engine and deliver a summary of findings.",
              cta: "Book a call",
            },
            {
              title: "Governance Audit",
              price: "From $1,500",
              desc: "A comprehensive AI-powered evaluation of your governance framework. You get a structured report: constitutional assessment, decision quality analysis, gap identification, and corpus-grounded recommendations with full reasoning trees.",
              cta: "Request an audit",
            },
            {
              title: "Governance-as-a-Service",
              price: "From $500/mo",
              desc: "Ongoing AI governance for your organization. Every proposal evaluated against your constitutional corpus, reasoning trees published, decisions recorded on-chain. Monthly strategic reviews and continuous governance intelligence.",
              cta: "Get started",
            },
          ].map((s) => (
            <div
              key={s.title}
              className="border border-neutral-800 bg-neutral-950 p-5 flex flex-col"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-sm">{s.title}</span>
                <span className="text-blue-400 font-mono text-xs">{s.price}</span>
              </div>
              <p className="text-xs text-neutral-500 leading-relaxed flex-1">
                {s.desc}
              </p>
              <a
                href="mailto:collaborate@openinnovate.org"
                className="mt-4 text-center text-xs text-blue-400 border border-blue-400/30 py-2 hover:bg-blue-400/5 transition-colors"
              >
                {s.cta}
              </a>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-neutral-600 mt-3">
          All services powered by the same governance engine that runs
          OpenInnovate. You get the same constitutional rigor we use on
          ourselves.
        </p>
      </section>

      {/* Maxim */}
      <div className="border border-neutral-800 bg-neutral-950 p-6 mb-8">
        <p className="text-[10px] text-neutral-600 uppercase tracking-widest mb-2">
          Root Thesis Maxim
        </p>
        <p className="text-base md:text-lg italic text-neutral-200 leading-relaxed">
          &ldquo;Maximize the creation of sovereign, self-sustaining systems
          that compound human agency over generational timescales.&rdquo;
        </p>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="text-center py-20 text-neutral-600">
          Loading governance data from GitHub...
        </div>
      )}
      {error && (
        <div className="text-center py-20 text-red-400">Error: {error}</div>
      )}

      {!loading && !error && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-10">
            {[
              { label: "Decisions", value: decisions.length },
              { label: "Avg Score", value: `${avgScore}/100` },
              { label: "Divergences", value: divergences.length },
              { label: "Proposals", value: proposals.length },
            ].map((s) => (
              <div key={s.label} className="border border-neutral-800 bg-neutral-950 p-4">
                <p className="text-[10px] text-neutral-600 uppercase tracking-widest">
                  {s.label}
                </p>
                <p className="text-2xl font-bold font-mono mt-1">{s.value}</p>
              </div>
            ))}
          </div>

          {/* Governance Record */}
          <Section title="Governance Record">
            <p className="text-xs text-neutral-600 mb-4">
              Click any decision to expand the full reasoning tree, corpus
              citations, analysis steps, alternatives considered, and
              traceability chain.
            </p>
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
          </Section>

          {/* Corpus */}
          <Section title="Constitutional Corpus">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[
                {
                  tier: "Tier 1 — Governance",
                  weight: 1.0,
                  docs: 50,
                  color: "border-blue-400/30",
                  desc: "Buffett Owner's Manual, 48 Berkshire shareholder letters (1977-2024), Munger's Psychology of Human Misjudgment",
                },
                {
                  tier: "Tier 2 — Civic",
                  weight: 0.9,
                  docs: 88,
                  color: "border-green-400/30",
                  desc: "US Constitution + Bill of Rights, 85 Federalist Papers, UN Declaration of Human Rights, Ostrom's 8 Principles for Managing a Commons",
                },
                {
                  tier: "Tier 3 — Systems",
                  weight: 0.8,
                  docs: 4,
                  color: "border-yellow-400/30",
                  desc: "Meadows' Leverage Points, Buterin/Hitzig/Weyl Quadratic Funding, Klages-Mundt Stablecoin Governance, DAO Overview Survey",
                },
                {
                  tier: "Tier 4 — Wyoming",
                  weight: 1.2,
                  docs: 2,
                  color: "border-red-400/30",
                  desc: "Wyoming Constitution, Wyoming DAO Supplement (W.S. 17-31-101 through 17-31-116)",
                },
              ].map((t) => (
                <div
                  key={t.tier}
                  className={`border ${t.color} bg-neutral-950 p-4`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-sm">{t.tier}</span>
                    <span className="text-xs text-neutral-600 font-mono">
                      w:{t.weight} · {t.docs} docs
                    </span>
                  </div>
                  <p className="text-xs text-neutral-500">{t.desc}</p>
                </div>
              ))}
            </div>
          </Section>

          {/* Constitutional Hierarchy */}
          <Section title="Constitutional Hierarchy">
            <p className="text-xs text-neutral-600 mb-3">
              Per W.S. 17-31-115 — Smart contract preempts Articles except
              W.S. 17-31-104 and 17-31-106(a)/(b):
            </p>
            <div className="space-y-2">
              {[
                { n: 1, label: "Smart Contract", desc: "preempts conflicting provisions of the Articles" },
                { n: 2, label: "Articles of Organization", desc: "preempts conflicting provisions of the Operating Agreement" },
                { n: 3, label: "Operating Agreement", desc: "supplements the above, does not override" },
              ].map((h) => (
                <div key={h.n} className="flex gap-3 items-start text-sm">
                  <span className="text-blue-400 font-bold font-mono">{h.n}.</span>
                  <span>
                    <strong>{h.label}</strong>{" "}
                    <span className="text-neutral-500">— {h.desc}</span>
                  </span>
                </div>
              ))}
            </div>
          </Section>
        </>
      )}

      {/* Footer */}
      <footer className="border-t border-neutral-800 pt-4 pb-8 text-xs text-neutral-600">
        <p>OpenInnovate DAO LLC — Wyoming filing 2026-001929314</p>
        <p className="mt-1">
          Built by{" "}
          <a href="https://github.com/hocmemini" className="text-blue-400 hover:underline">
            Jonathan
          </a>{" "}
          and{" "}
          <a href="https://anthropic.com" className="text-blue-400 hover:underline">
            Claude
          </a>
          . Governed by the Maxim. Data fetched live from{" "}
          <a href={`https://github.com/${REPO}`} className="text-blue-400 hover:underline">
            GitHub
          </a>
          .
        </p>
      </footer>
    </div>
  );
}
