"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

interface AnalysisResult {
  score: number;
  status: string;
  meetingNeeded: boolean;
  blockers: string[];
  consensus: string[];
  suggestedAgenda: string;
}


export default function ResultsPage() {
  const params = useParams();
  const router = useRouter();
  const code = params?.id as string;
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [roomName, setRoomName] = useState<string | null>(null);

  useEffect(() => {
  if (!code) return;

  async function loadResults() {
    const res = await fetch(`/api/results/${code}`);

    if (!res.ok) {
      setAnalysis(null);
      return;
    }

    const data = await res.json();

    setAnalysis({
      score: data.satisfaction_score,
      status: data.status,
      meetingNeeded: data.meeting_needed,
      blockers: data.blockers?.map(
        (b: { owner: string; issue: string; severity: string }) =>
          `${b.owner}: ${b.issue} (${b.severity})`
      ) || [],
      consensus: data.consensus_points || [],
      suggestedAgenda: data.suggested_agenda || "",
    });
  }

  loadResults();
}, [code]);

  if (!analysis) {
    return (
      <main className="min-h-screen bg-zinc-950 text-white">
        <section className="mx-auto flex min-h-screen max-w-4xl flex-col justify-center px-6 py-16 sm:px-10 lg:px-0">
          <div className="rounded-4xl border border-white/10 bg-white/5 p-10 shadow-2xl shadow-black/20">
            <button onClick={() => router.push(`/room/${code}`)} className="mb-6 inline-flex rounded-full border border-white/10 px-4 py-2 text-sm text-zinc-300 transition hover:bg-white/5">
              ← Back to room
            </button>
            <h1 className="text-3xl font-semibold">No analysis found</h1>
            <p className="mt-4 text-zinc-300">This room has not been analyzed yet. Collect responses and run the analysis step first.</p>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <section className="mx-auto flex min-h-screen max-w-4xl flex-col justify-center px-6 py-16 sm:px-10 lg:px-0">
        <div className="rounded-4xl border border-white/10 bg-white/5 p-10 shadow-2xl shadow-black/20">
          <button onClick={() => router.push(`/room/${code}`)} className="mb-6 inline-flex rounded-full border border-white/10 px-4 py-2 text-sm text-zinc-300 transition hover:bg-white/5">
            ← Back to room
          </button>

          <div className="space-y-4">
            <p className="text-sm uppercase tracking-[0.35em] text-cyan-300">Results</p>
            <h1 className="text-4xl font-semibold">{roomName || `Room ${code}`}</h1>
            <div className="mt-4 flex flex-wrap gap-4">
              <span className="rounded-3xl bg-green-500/10 px-4 py-2 text-sm uppercase tracking-[0.2em] text-green-300">{analysis.status}</span>
              <span className="rounded-3xl bg-white/10 px-4 py-2 text-sm text-zinc-200">Score {analysis.score}</span>
              <span className="rounded-3xl bg-white/10 px-4 py-2 text-sm text-zinc-200">
                Meeting needed: {analysis.meetingNeeded ? "Yes" : "No"}
              </span>
            </div>
          </div>

          <div className="mt-10 grid gap-6 lg:grid-cols-2">
            <div className="rounded-3xl border border-white/10 bg-zinc-900/80 p-6">
              <h2 className="text-xl font-semibold">Consensus</h2>
              <ul className="mt-4 space-y-3 text-zinc-300">
                {analysis.consensus.map((item, index) => (
                  <li key={index} className="rounded-3xl bg-zinc-950/80 p-4">{item}</li>
                ))}
              </ul>
            </div>
            <div className="rounded-3xl border border-white/10 bg-zinc-900/80 p-6">
              <h2 className="text-xl font-semibold">Suggested agenda</h2>
              <p className="mt-4 text-zinc-300">{analysis.suggestedAgenda}</p>
            </div>
          </div>

          <div className="mt-6 rounded-3xl border border-white/10 bg-zinc-900/80 p-6">
            <h2 className="text-xl font-semibold">Blockers</h2>
            {analysis.blockers.length ? (
              <ul className="mt-4 space-y-3 text-zinc-300">
                {analysis.blockers.map((blocker, index) => (
                  <li key={index} className="rounded-3xl bg-zinc-950/80 p-4">{blocker}</li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 text-zinc-500">No blockers detected.</p>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
