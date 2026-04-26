"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Recorder from "@/components/Recorder";

interface Room {
  id: string;
  name: string;
  prompt: string;
  code: string;
  status: string;
  owner_id: string;
  created_at: string;
}

interface RoomMember {
  id: string;
  room_id: string;
  user_id: string;
  name: string;
}

interface RoomResponse {
  id: string;
  room_id: string;
  user_id: string;
  transcript: string | null;
  created_at?: string;
}

interface Analysis {
  satisfaction_score: number;
  status: string;
  consensus_points: string[];
  blockers: { owner: string; issue: string; severity: string }[];
  alignment_percent: number;
  meeting_needed: boolean;
  suggested_attendees: string[];
  suggested_agenda: string;
  narration_url?: string;
}

interface Solution {
  id: string;
  title: string;
  description: string;
  rationale: string;
  pros: string[];
  cons: string[];
  implementation_difficulty: string;
  estimated_effort: string;
  vote_count: number;
  user_voted: boolean;
}

interface DynamicPrompt {
  id: string;
  question: string;
  category: string;
  reasoning: string;
}

interface AuthUser {
  id: string;
  email: string;
}

const STATUS_META: Record<string, { label: string; color: string; bg: string; border: string; description: string }> = {
  OPEN: {
    label: "Open",
    color: "rgba(255,255,255,0.5)",
    bg: "rgba(255,255,255,0.04)",
    border: "rgba(255,255,255,0.1)",
    description: "Collecting responses.",
  },
  READY_FOR_ANALYSIS: {
    label: "Ready for Analysis",
    color: "#00b4ff",
    bg: "rgba(0,180,255,0.08)",
    border: "rgba(0,180,255,0.2)",
    description: "All responses collected. Running AI analysis.",
  },
  VOTING: {
    label: "Voting",
    color: "#ffd60a",
    bg: "rgba(255,214,10,0.08)",
    border: "rgba(255,214,10,0.2)",
    description: "Solutions proposed. Team voting on options.",
  },
  RESOLUTION_REACHED: {
    label: "Resolved",
    color: "#34c759",
    bg: "rgba(52,199,89,0.08)",
    border: "rgba(52,199,89,0.2)",
    description: "Solution selected. Task complete.",
  },
  COMPLETED: {
    label: "Completed",
    color: "#34c759",
    bg: "rgba(52,199,89,0.08)",
    border: "rgba(52,199,89,0.2)",
    description: "Room closed by owner.",
  },
  BLOCKED: {
    label: "Blocked",
    color: "#ff3b30",
    bg: "rgba(255,59,48,0.08)",
    border: "rgba(255,59,48,0.2)",
    description: "No clear resolution reached.",
  },
  COMPLETE: {
    label: "Complete",
    color: "#34c759",
    bg: "rgba(52,199,89,0.08)",
    border: "rgba(52,199,89,0.2)",
    description: "Team is aligned. No meeting needed.",
  },
  PENDING: {
    label: "Pending",
    color: "#ff9f0a",
    bg: "rgba(255,159,10,0.08)",
    border: "rgba(255,159,10,0.2)",
    description: "Mixed signals. A follow-up is suggested.",
  },
  REJECTED: {
    label: "Rejected",
    color: "#ff3b30",
    bg: "rgba(255,59,48,0.08)",
    border: "rgba(255,59,48,0.2)",
    description: "Critical blockers detected. Meeting required.",
  },
};

function ScoreRing({ score }: { score: number }) {
  const r = 52;
  const circ = 2 * Math.PI * r;
  const filled = (score / 100) * circ;
  const color = score >= 75 ? "#34c759" : score >= 40 ? "#ff9f0a" : "#ff3b30";
  return (
    <svg width={130} height={130} viewBox="0 0 130 130">
      <circle cx={65} cy={65} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={8} />
      <circle cx={65} cy={65} r={r} fill="none" stroke={color} strokeWidth={8}
        strokeDasharray={`${filled} ${circ - filled}`}
        strokeLinecap="round"
        transform="rotate(-90 65 65)"
        style={{ transition: "stroke-dasharray 1s ease" }}
      />
      <text x={65} y={60} textAnchor="middle" fill="#fff" fontSize={28} fontWeight={700} fontFamily="-apple-system,sans-serif">{score}</text>
      <text x={65} y={78} textAnchor="middle" fill="rgba(255,255,255,0.35)" fontSize={11} fontFamily="-apple-system,sans-serif">score</text>
    </svg>
  );
}

export default function RoomPage() {
  const params = useParams();
  const router = useRouter();
  const roomId = params?.id as string;

  const [room, setRoom] = useState<Room | null>(null);
  const [membership, setMembership] = useState<RoomMember | null>(null);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [allSubmitted, setAllSubmitted] = useState(false);
  const [memberCount, setMemberCount] = useState(0);
  const [responseCount, setResponseCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [name, setName] = useState("");
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);
  const [solutions, setSolutions] = useState<Solution[]>([]);
  const [loadingSolutions, setLoadingSolutions] = useState(false);
  const [members, setMembers] = useState<RoomMember[]>([]);
  const [responses, setResponses] = useState<RoomResponse[]>([]);
  const [prompts, setPrompts] = useState<DynamicPrompt[]>([]);
  const [showPromptsOnRecord, setShowPromptsOnRecord] = useState(false);
  const [votingInProgress, setVotingInProgress] = useState(false);
  const [completingRoom, setCompletingRoom] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);

  const loadRoom = useCallback(async () => {
    if (!roomId) return;
    try {
      const res = await fetch(`/api/rooms/${roomId}`);
      const data = await res.json();
      if (!res.ok) { setRoom(null); return; }
      setRoom(data.room);
      setUser(data.user);
      setMembership(data.membership);
      setMembers(data.members || []);
      setResponses(data.responses || []);
      setHasSubmitted(data.hasSubmitted);
      setAllSubmitted(data.allSubmitted);
      setMemberCount(data.memberCount || 0);
      setResponseCount(data.responseCount || 0);
    } catch (e) {
      console.error(e);
      setRoom(null);
    } finally {
      setLoading(false);
    }
  }, [roomId]);

  const loadAnalysis = useCallback(async () => {
    if (!roomId) return;
    setLoadingAnalysis(true);
    try {
      const res = await fetch(`/api/results/${roomId}`);
      if (res.ok) setAnalysis(await res.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingAnalysis(false);
    }
  }, [roomId]);

  const loadSolutions = useCallback(async () => {
    if (!roomId) return;
    setLoadingSolutions(true);
    try {
      const res = await fetch(`/api/solutions?roomId=${roomId}`);
      if (res.ok) setSolutions(await res.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingSolutions(false);
    }
  }, [roomId]);

  const loadPrompts = useCallback(async () => {
    if (!roomId) return;
    try {
      const res = await fetch(`/api/analyse/prompts?roomId=${roomId}`);
      if (res.ok) {
        const existingPrompts = await res.json();
        if (Array.isArray(existingPrompts) && existingPrompts.length > 0) {
          setPrompts(existingPrompts);
          return;
        }
      }

      const createRes = await fetch(`/api/analyse/prompts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId }),
      });
      if (createRes.ok) {
        const generatedPrompts = await createRes.json();
        setPrompts(Array.isArray(generatedPrompts) ? generatedPrompts : []);
      }
    } catch (e) {
      console.error(e);
    }
  }, [roomId]);

  useEffect(() => {
    const load = async () => {
      await loadRoom();
    };
    load().catch(console.error);
  }, [loadRoom]);

  // Auto-load data based on room status
  useEffect(() => {
    const loadPhase = async () => {
      if (!room) return;
      if (room.status === "VOTING" || room.status === "RESOLUTION_REACHED" || room.status === "COMPLETED") {
        await loadSolutions();
        await loadAnalysis();
      } else if (room.status === "OPEN") {
        await loadPrompts();
      } else if (room.status !== "OPEN") {
        await loadAnalysis();
      }
    };
    loadPhase().catch(console.error);
  }, [room, loadAnalysis, loadSolutions, loadPrompts]);

  async function joinRoom(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!name.trim()) return;
    setJoining(true);
    try {
      const res = await fetch(`/api/rooms/${roomId}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) { alert("Failed to join room"); return; }
      await loadRoom();
    } catch (e) { console.error(e); }
    finally { setJoining(false); }
  }

  async function handleRecordingSubmit(audioBlob: Blob) {
    if (!room || !membership || hasSubmitted) return;
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("audio", audioBlob);
      fd.append("room_id", room.id);
      const res = await fetch("/api/responses", { method: "POST", body: fd });
      if (!res.ok) { alert("Failed to save response"); return; }
      await loadRoom();
    } catch (e) { console.error(e); }
    finally { setSubmitting(false); }
  }

  async function handleAnalyze() {
    if (!room) return;
    setAnalyzing(true);
    try {
      const res = await fetch("/api/analyse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId: room.id, mode: "solutions" }),
      });
      if (res.ok) {
        await loadRoom();
        await loadSolutions();
      } else {
        alert("Failed to analyze");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setAnalyzing(false);
    }
  }

  async function handleVote(solutionId: string) {
    if (!room) return;
    setVotingInProgress(true);
    try {
      const res = await fetch("/api/solutions/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ solutionId, roomId: room.id }),
      });
      if (res.ok) {
        await loadSolutions(); // Refresh solutions to show updated vote counts
      } else {
        const error = await res.json();
        alert(error.error || "Failed to vote");
      }
    } catch (e) {
      console.error(e);
      alert("Error voting");
    } finally {
      setVotingInProgress(false);
    }
  }

  async function handleCompleteRoom(status: "COMPLETED" | "BLOCKED" | "RESOLUTION_REACHED", winningSolutionId?: string) {
    if (!room) return;
    setCompletingRoom(true);
    try {
      const res = await fetch(`/api/rooms/${room.id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          winningSolutionId,
          notes: `Room marked as ${status} by owner`,
        }),
      });
      if (res.ok) {
        await loadRoom();
      } else {
        alert("Failed to update room status");
      }
    } catch (e) {
      console.error(e);
      alert("Error updating room");
    } finally {
      setCompletingRoom(false);
    }
  }

  if (loading) return (
    <main style={{ minHeight: "100vh", background: "#000", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: 28, height: 28, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.1)", borderTop: "2px solid #fff", animation: "spin 0.8s linear infinite" }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </main>
  );

  if (!room) return (
    <main style={{ minHeight: "100vh", background: "#000", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "-apple-system,sans-serif" }}>
      <div style={{ textAlign: "center" }}>
        <p style={{ fontSize: 48, marginBottom: 12 }}>🔍</p>
        <h1 style={{ fontSize: 22, fontWeight: 600, marginBottom: 8 }}>Room not found</h1>
        <p style={{ color: "rgba(255,255,255,0.4)", marginBottom: 24, fontSize: 14 }}>This room doesn&apos;t exist or you don&apos;t have access.</p>
        <button onClick={() => router.push("/dashboard")}
          style={{ background: "#fff", color: "#000", border: "none", borderRadius: 980, padding: "10px 22px", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
          Back to dashboard
        </button>
      </div>
    </main>
  );

  const statusMeta = STATUS_META[room.status] ?? STATUS_META.OPEN;
  const progressPct = memberCount > 0 ? Math.round((responseCount / memberCount) * 100) : 0;

  function summarizeResponse(transcript?: string | null) {
    if (!transcript) return "No update submitted yet.";

    const normalized = transcript.trim().toLowerCase();
    const dayMatch = normalized.match(/\b(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/);
    const timeMatch = normalized.match(/\b\d{1,2}(?::\d{2})?\s?(?:am|pm)\b/);
    const availability = /\b(free|available|open|off)\b/.test(normalized);
    const blocker = /\b(blocked|blocker|blocked by|waiting on|depend|dependency|stalled|stuck|issue|problem)\b/.test(normalized);
    const completion = /\b(done|completed|finished|shipped|resolved|wrapped up)\b/.test(normalized);
    const progress = /\b(working on|in progress|continue|continuing|next|starting|planning|moving forward)\b/.test(normalized);
    const topicMatch = normalized.match(/\b(deploy|review|launch|release|testing|design|feedback|support|handoff|documentation|bug)\b/);

    if (availability && (dayMatch || timeMatch)) {
      let summary = "Shared availability";
      if (dayMatch) summary += ` on ${dayMatch[1]}`;
      if (timeMatch) summary += ` around ${timeMatch[0]}`;
      return `${summary}.`;
    }

    if (availability) {
      return "Shared availability and schedule preferences.";
    }

    if (blocker) {
      const detailMatch = normalized.match(/\b(blocked by|waiting on|dependency on|issue with|problem with)\b([^,.]*)/);
      if (detailMatch?.[2]) {
        return `Blocked by${detailMatch[2].trim()}.`;
      }
      return "Reported blockers and dependencies affecting progress.";
    }

    if (completion) {
      return topicMatch
        ? `Completed work related to ${topicMatch[1]}.`
        : "Reported completed progress and next steps.";
    }

    if (progress) {
      return topicMatch
        ? `Working on ${topicMatch[1]} with next steps in progress.`
        : "Provided a work-in-progress update and next steps.";
    }

    if (topicMatch) {
      return `Shared an update related to ${topicMatch[1]}.`;
    }

    return "Summarized progress and any blockers from their update.";
  }

  return (
    <main style={{ minHeight: "100vh", background: "#000", color: "#fff", fontFamily: "-apple-system,'SF Pro Display','Helvetica Neue',sans-serif" }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
        @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.4; } }
      `}</style>

      {/* Nav */}
      <nav style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 32px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <button onClick={() => router.push("/dashboard")}
          style={{ background: "none", border: "none", color: "rgba(255,255,255,0.5)", cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center", gap: 6, padding: 0 }}
          onMouseEnter={e => (e.currentTarget.style.color = "#fff")}
          onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.5)")}>
          ← Dashboard
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)" }}>
            Room
          </span>
          <span style={{ fontFamily: "monospace", fontSize: 13, fontWeight: 700, color: "#fff", background: "rgba(255,255,255,0.07)", padding: "4px 10px", borderRadius: 6 }}>
            {room.code}
          </span>
        </div>
      </nav>

      <div style={{ maxWidth: 760, margin: "0 auto", padding: "48px 24px" }}>

        {/* Room header */}
        <div style={{ marginBottom: 40, animation: "fadeUp 0.5s ease both" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: statusMeta.color, display: "inline-block", boxShadow: `0 0 8px ${statusMeta.color}`, animation: room.status === "OPEN" ? "pulse 2s ease infinite" : "none" }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: statusMeta.color, letterSpacing: "0.06em", textTransform: "uppercase" }}>
              {statusMeta.label}
            </span>
          </div>
          <h1 style={{ fontSize: "clamp(28px, 5vw, 42px)", fontWeight: 700, letterSpacing: "-0.03em", lineHeight: 1.1, marginBottom: 12 }}>
            {room.name}
          </h1>
          <p style={{ fontSize: 16, color: "rgba(255,255,255,0.45)", lineHeight: 1.6, maxWidth: 560 }}>
            {room.prompt}
          </p>
        </div>

        {/* Progress bar */}
        <div style={{ marginBottom: 40, animation: "fadeUp 0.5s ease 0.1s both", opacity: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", fontWeight: 500 }}>Response progress</span>
            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", fontWeight: 600 }}>{responseCount} of {memberCount}</span>
          </div>
          <div style={{ height: 4, background: "rgba(255,255,255,0.07)", borderRadius: 4, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${progressPct}%`, background: allSubmitted ? "#34c759" : "rgba(255,255,255,0.4)", borderRadius: 4, transition: "width 0.6s ease" }} />
          </div>
        </div>

        {/* ── NOT A MEMBER YET ── */}
        {!membership && (
          <div style={{ animation: "fadeUp 0.5s ease 0.2s both", opacity: 0 }}>
            <div style={{ borderRadius: 20, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.025)", padding: 32 }}>
              <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 8 }}>Join this room</h2>
              <p style={{ fontSize: 14, color: "rgba(255,255,255,0.4)", marginBottom: 24 }}>Enter your name to record your 90-second response.</p>
              <form onSubmit={joinRoom} style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <input value={name} onChange={e => setName(e.target.value)} placeholder="Your name"
                  style={{ flex: 1, minWidth: 200, padding: "12px 16px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)", color: "#fff", fontSize: 15, outline: "none" }} />
                <button type="submit" disabled={joining || !name.trim()}
                  style={{ background: "#fff", color: "#000", border: "none", borderRadius: 12, padding: "12px 24px", fontSize: 14, fontWeight: 600, cursor: "pointer", opacity: joining || !name.trim() ? 0.4 : 1 }}>
                  {joining ? "Joining..." : "Join room"}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* ── MEMBER: RECORD OR SUBMITTED ── */}
        {membership && !["VOTING", "RESOLUTION_REACHED", "COMPLETED", "BLOCKED"].includes(room.status) && (
          <div style={{ animation: "fadeUp 0.5s ease 0.2s both", opacity: 0 }}>
            {!hasSubmitted ? (
              <div style={{ borderRadius: 20, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.025)", padding: 32, marginBottom: 24 }}>
                <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 6 }}>Your response</h2>
                <p style={{ fontSize: 14, color: "rgba(255,255,255,0.4)", marginBottom: 24 }}>
                  Record up to 90 seconds. Listen back, then submit.
                </p>

                {/* Dynamic Prompts to Guide Response */}
                {showPromptsOnRecord && prompts.length > 0 && (
                  <div style={{ marginBottom: 24 }}>
                    <p style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>Consider these questions</p>
                    <div style={{ display: "grid", gap: 8 }}>
                      {prompts.slice(0, 3).map((prompt, i) => (
                        <div key={i} style={{
                          borderRadius: 10,
                          border: "1px solid rgba(255,255,255,0.06)",
                          background: "rgba(255,255,255,0.02)",
                          padding: "12px",
                        }}>
                          <div style={{ display: "flex", gap: 10 }}>
                            <span style={{ fontSize: 16, flexShrink: 0 }}>💭</span>
                            <div style={{ flex: 1 }}>
                              <p style={{ fontSize: 13, fontWeight: 500, marginBottom: 4, color: "#fff" }}>
                                {prompt.question}
                              </p>
                              <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>
                                {prompt.reasoning}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <Recorder onSubmit={handleRecordingSubmit} maxSeconds={90} onRecordingStart={() => setShowPromptsOnRecord(true)} />
                {submitting && (
                  <div style={{ marginTop: 16, display: "flex", alignItems: "center", gap: 8, color: "rgba(255,255,255,0.4)", fontSize: 13 }}>
                    <div style={{ width: 14, height: 14, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.2)", borderTop: "2px solid #fff", animation: "spin 0.8s linear infinite" }} />
                    Uploading and transcribing...
                  </div>
                )}
              </div>
            ) : (
              <div style={{ borderRadius: 20, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.025)", padding: 32, marginBottom: 24 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                  <span style={{ fontSize: 24 }}>✓</span>
                  <h2 style={{ fontSize: 20, fontWeight: 600 }}>Response submitted</h2>
                </div>
                <p style={{ fontSize: 14, color: "rgba(255,255,255,0.4)", marginBottom: allSubmitted ? 24 : 0 }}>
                  {allSubmitted ? "Everyone has responded. Run the analysis to see results." : `Waiting for ${memberCount - responseCount} more ${memberCount - responseCount === 1 ? "person" : "people"} to respond.`}
                </p>
                {allSubmitted && room.owner_id === user?.id && (
                  <button onClick={handleAnalyze} disabled={analyzing}
                    style={{ marginTop: 4, background: "#fff", color: "#000", border: "none", borderRadius: 12, padding: "13px 28px", fontSize: 14, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 8, opacity: analyzing ? 0.6 : 1 }}>
                    {analyzing ? (
                      <>
                        <div style={{ width: 14, height: 14, borderRadius: "50%", border: "2px solid rgba(0,0,0,0.2)", borderTop: "2px solid #000", animation: "spin 0.8s linear infinite" }} />
                        Analysing responses...
                      </>
                    ) : "Run AI analysis →"}
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── ANALYSIS LOADING ── */}
        {loadingAnalysis && !["VOTING", "RESOLUTION_REACHED", "COMPLETED", "BLOCKED"].includes(room.status) && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 64, gap: 12, color: "rgba(255,255,255,0.3)", fontSize: 14 }}>
            <div style={{ width: 18, height: 18, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.1)", borderTop: "2px solid #fff", animation: "spin 0.8s linear infinite" }} />
            Loading analysis...
          </div>
        )}

        {/* ── ANALYSIS RESULTS ── */}
        {analysis && !loadingAnalysis && !["VOTING", "RESOLUTION_REACHED", "COMPLETED", "BLOCKED"].includes(room.status) && (() => {
          const meta = STATUS_META[analysis.status] ?? STATUS_META.OPEN;
          return (
            <div style={{ animation: "fadeUp 0.6s ease both" }}>

              {/* Status + score hero */}
              <div style={{ borderRadius: 20, border: `1px solid ${meta.border}`, background: meta.bg, padding: "36px 32px", marginBottom: 20, display: "flex", alignItems: "center", gap: 32, flexWrap: "wrap" }}>
                <ScoreRing score={analysis.satisfaction_score} />
                <div style={{ flex: 1, minWidth: 200 }}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: meta.color, marginBottom: 10 }}>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: meta.color }} />
                    {meta.label}
                  </span>
                  <h2 style={{ fontSize: 26, fontWeight: 700, letterSpacing: "-0.02em", marginBottom: 8 }}>
                    {analysis.status === "COMPLETE" ? "Team is aligned." : analysis.status === "PENDING" ? "Needs follow-up." : "Meeting required."}
                  </h2>
                  <p style={{ fontSize: 14, color: "rgba(255,255,255,0.45)", lineHeight: 1.6, marginBottom: 16 }}>{meta.description}</p>
                  <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                    <div>
                      <p style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginBottom: 2, textTransform: "uppercase", letterSpacing: "0.06em" }}>Alignment</p>
                      <p style={{ fontSize: 18, fontWeight: 700, color: meta.color }}>{analysis.alignment_percent}%</p>
                    </div>
                    <div>
                      <p style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginBottom: 2, textTransform: "uppercase", letterSpacing: "0.06em" }}>Meeting needed</p>
                      <p style={{ fontSize: 18, fontWeight: 700, color: analysis.meeting_needed ? "#ff3b30" : "#34c759" }}>{analysis.meeting_needed ? "Yes" : "No"}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Narration audio */}
              {analysis.narration_url && (
                <div style={{ borderRadius: 16, border: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.025)", padding: "20px 24px", marginBottom: 20 }}>
                  <p style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>AI summary narration</p>
                  <audio controls src={analysis.narration_url} style={{ width: "100%", height: 36 }} />
                </div>
              )}

              {/* Two column: consensus + blockers */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16, marginBottom: 16 }}>
                {/* Consensus */}
                <div style={{ borderRadius: 16, border: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.025)", padding: "24px" }}>
                  <p style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 16 }}>Consensus points</p>
                  {analysis.consensus_points.length ? (
                    <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 10 }}>
                      {analysis.consensus_points.map((pt, i) => (
                        <li key={i} style={{ display: "flex", gap: 10, fontSize: 14, color: "rgba(255,255,255,0.65)", lineHeight: 1.5 }}>
                          <span style={{ color: "#34c759", flexShrink: 0, marginTop: 2 }}>✓</span>
                          {pt}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p style={{ fontSize: 14, color: "rgba(255,255,255,0.25)" }}>No consensus points found.</p>
                  )}
                </div>

                {/* Blockers */}
                <div style={{ borderRadius: 16, border: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.025)", padding: "24px" }}>
                  <p style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 16 }}>Blockers</p>
                  {analysis.blockers.length ? (
                    <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 10 }}>
                      {analysis.blockers.map((b, i) => {
                        const sev = b.severity === "high" ? "#ff3b30" : b.severity === "medium" ? "#ff9f0a" : "#34c759";
                        return (
                          <li key={i} style={{ borderRadius: 10, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", padding: "12px 14px" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                              <span style={{ fontSize: 13, fontWeight: 600, color: "#fff" }}>{b.owner}</span>
                              <span style={{ fontSize: 10, fontWeight: 700, color: sev, textTransform: "uppercase", letterSpacing: "0.06em" }}>{b.severity}</span>
                            </div>
                            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", lineHeight: 1.5, margin: 0 }}>{b.issue}</p>
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <p style={{ fontSize: 14, color: "rgba(255,255,255,0.25)" }}>No blockers detected.</p>
                  )}
                </div>
              </div>

              {/* Suggested agenda */}
              {analysis.meeting_needed && analysis.suggested_agenda && (
                <div style={{ borderRadius: 16, border: "1px solid rgba(255,59,48,0.15)", background: "rgba(255,59,48,0.04)", padding: "24px" }}>
                  <p style={{ fontSize: 12, fontWeight: 600, color: "#ff3b30", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>
                    Suggested meeting agenda
                  </p>
                  {analysis.suggested_attendees?.length > 0 && (
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
                      {analysis.suggested_attendees.map((a, i) => (
                        <span key={i} style={{ fontSize: 11, fontWeight: 600, background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.6)", borderRadius: 6, padding: "3px 8px" }}>{a}</span>
                      ))}
                    </div>
                  )}
                  <p style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", lineHeight: 1.7, whiteSpace: "pre-line" }}>{analysis.suggested_agenda}</p>
                </div>
              )}
            </div>
          );
        })()}

        {/* ── SOLUTIONS LOADING ── */}
        {loadingSolutions && ["VOTING", "RESOLUTION_REACHED", "COMPLETED", "BLOCKED"].includes(room.status) && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 64, gap: 12, color: "rgba(255,255,255,0.3)", fontSize: 14, marginTop: 40 }}>
            <div style={{ width: 18, height: 18, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.1)", borderTop: "2px solid #fff", animation: "spin 0.8s linear infinite" }} />
            Loading solutions...
          </div>
        )}

        {/* ── VOTING PHASE: SOLUTIONS ── */}
        {room.status === "VOTING" && solutions.length > 0 && !loadingSolutions && (
          <div style={{ animation: "fadeUp 0.6s ease both", marginTop: 40 }}>
            {/* Analysis Summary Above Solutions */}
            {analysis && (
              <div style={{ marginBottom: 40 }}>
                <div style={{ marginBottom: 24 }}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(255,255,255,0.5)", marginBottom: 12 }}>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: "rgba(255,255,255,0.5)" }} />
                    AI Analysis Summary
                  </span>
                  <h3 style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-0.02em", marginBottom: 8 }}>Team Insights</h3>
                </div>

                <div style={{ borderRadius: 20, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.025)", padding: "32px" }}>
                  {/* Satisfaction Score */}
                  <div style={{ display: "flex", alignItems: "center", gap: 24, marginBottom: 24, flexWrap: "wrap" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                      <div style={{ width: 80, height: 80, borderRadius: "50%", border: "3px solid rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <span style={{ fontSize: 24, fontWeight: 700, color: "#fff" }}>{analysis.satisfaction_score}</span>
                      </div>
                      <div>
                        <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>Satisfaction Score</p>
                        <p style={{ fontSize: 14, color: "rgba(255,255,255,0.65)" }}>
                          {analysis.satisfaction_score >= 75 ? "High alignment" : analysis.satisfaction_score >= 40 ? "Mixed signals" : "Needs attention"}
                        </p>
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: 16 }}>
                      <div>
                        <p style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginBottom: 2, textTransform: "uppercase", letterSpacing: "0.06em" }}>Alignment</p>
                        <p style={{ fontSize: 18, fontWeight: 700, color: "#34c759" }}>{analysis.alignment_percent}%</p>
                      </div>
                    </div>
                  </div>

                  {/* Consensus Points */}
                  {analysis.consensus_points.length > 0 && (
                    <div style={{ marginBottom: 24 }}>
                      <p style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>Consensus Points</p>
                      <div style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))" }}>
                        {analysis.consensus_points.map((point, i) => (
                          <div key={i} style={{ display: "flex", gap: 10, padding: "12px", borderRadius: 10, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                            <span style={{ color: "#34c759", flexShrink: 0, marginTop: 2 }}>✓</span>
                            <span style={{ fontSize: 14, color: "rgba(255,255,255,0.65)", lineHeight: 1.5 }}>{point}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Blockers */}
                  {analysis.blockers.length > 0 && (
                    <div>
                      <p style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>Blockers Identified</p>
                      <div style={{ display: "grid", gap: 8 }}>
                        {analysis.blockers.map((blocker, i) => {
                          const severityColor = blocker.severity === "high" ? "#ff3b30" : blocker.severity === "medium" ? "#ff9f0a" : "#34c759";
                          return (
                            <div key={i} style={{ borderRadius: 10, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", padding: "12px" }}>
                              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                                <span style={{ fontSize: 13, fontWeight: 600, color: "#fff" }}>{blocker.owner}</span>
                                <span style={{ fontSize: 10, fontWeight: 700, color: severityColor, textTransform: "uppercase", letterSpacing: "0.06em" }}>{blocker.severity}</span>
                              </div>
                              <p style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", lineHeight: 1.5, margin: 0 }}>{blocker.issue}</p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Participant update summary during VOTING phase */}
            {room.status === "VOTING" && (
              <div style={{ borderRadius: 20, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.025)", padding: "32px", marginBottom: 32 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20 }}>
                  <div style={{ width: 48, height: 48, borderRadius: "50%", background: "rgba(255,214,10,0.1)", border: "2px solid #ffd60a", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ fontSize: 20 }}>🧑‍🤝‍🧑</span>
                  </div>
                  <div>
                    <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Participant updates</h2>
                    <p style={{ fontSize: 14, color: "rgba(255,255,255,0.45)", marginBottom: 8 }}>What each person reported and the blockers identified from those responses.</p>
                    <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", lineHeight: 1.6 }}>
                      {responseCount}/{memberCount} responses received. {analysis?.blockers.length ? `${analysis.blockers.length} team blocker${analysis.blockers.length === 1 ? "" : "s"} identified.` : "No blockers flagged yet."}
                    </p>
                  </div>
                </div>

                <div style={{ display: "grid", gap: 18 }}>
                  {members.map((member) => {
                    const response = responses.find((r) => r.user_id === member.user_id);
                    const memberBlockers = analysis?.blockers.filter((blocker) => blocker.owner === member.name) || [];
                    return (
                      <div key={member.id} style={{ borderRadius: 16, border: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.02)", padding: "22px" }}>
                        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
                          <p style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>{member.name}</p>
                        </div>
                        <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
                          <div>
                            <p style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>Update summary</p>
                            <p style={{ fontSize: 14, color: "rgba(255,255,255,0.65)", lineHeight: 1.7, margin: 0 }}>
                              {summarizeResponse(response?.transcript)}
                            </p>
                          </div>
                          {memberBlockers.length > 0 && (
                            <div>
                              <p style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Blockers</p>
                              <div style={{ display: "grid", gap: 8 }}>
                                {memberBlockers.map((blocker, idx) => (
                                  <div key={idx} style={{ borderRadius: 12, background: "rgba(255,255,255,0.04)", padding: "12px" }}>
                                    <p style={{ fontSize: 13, fontWeight: 600, color: "#fff", marginBottom: 4 }}>{blocker.issue}</p>
                                    <span style={{ fontSize: 11, color: blocker.severity === "high" ? "#ff3b30" : blocker.severity === "medium" ? "#ff9f0a" : "#34c759", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                                      {blocker.severity}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div style={{ marginBottom: 32 }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#ffd60a", marginBottom: 12 }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#ffd60a" }} />
                Voting Phase
              </span>
              <h2 style={{ fontSize: 28, fontWeight: 700, letterSpacing: "-0.02em", marginBottom: 8 }}>AI Proposed Solutions</h2>
              <p style={{ fontSize: 16, color: "rgba(255,255,255,0.45)" }}>Review and vote on the proposed solutions below. Each team member can vote for one solution.</p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 20, marginBottom: 32 }}>
              {solutions.map((solution) => (
                <div key={solution.id} style={{
                  borderRadius: 16,
                  border: solution.user_voted ? "2px solid #34c759" : "1px solid rgba(255,255,255,0.07)",
                  background: solution.user_voted ? "rgba(52,199,89,0.08)" : "rgba(255,255,255,0.025)",
                  padding: "24px",
                  position: "relative",
                  transition: "all 0.3s ease",
                }}>
                  {solution.user_voted && (
                    <div style={{ position: "absolute", top: 12, right: 12, background: "#34c759", color: "#000", width: 20, height: 20, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700 }}>
                      ✓
                    </div>
                  )}

                  <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8, paddingRight: 30 }}>{solution.title}</h3>
                  <p style={{ fontSize: 14, color: "rgba(255,255,255,0.65)", marginBottom: 14, lineHeight: 1.6 }}>
                    {solution.description}
                  </p>

                  {/* Difficulty + Effort */}
                  <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 11, fontWeight: 600, background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.5)", borderRadius: 6, padding: "4px 10px", textTransform: "capitalize" }}>
                      {solution.implementation_difficulty} difficulty
                    </span>
                    <span style={{ fontSize: 11, fontWeight: 600, background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.5)", borderRadius: 6, padding: "4px 10px" }}>
                      {solution.estimated_effort}
                    </span>
                  </div>

                  {/* Pros */}
                  {solution.pros?.length > 0 && (
                    <div style={{ marginBottom: 12 }}>
                      <p style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>Pros</p>
                      <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 4 }}>
                        {solution.pros?.map((pro, i) => (
                          <li key={i} style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", display: "flex", gap: 6 }}>
                            <span style={{ color: "#34c759" }}>+</span> {pro}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Cons */}
                  {solution.cons?.length > 0 && (
                    <div style={{ marginBottom: 16 }}>
                      <p style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>Cons</p>
                      <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 4 }}>
                        {solution.cons?.map((con, i) => (
                          <li key={i} style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", display: "flex", gap: 6 }}>
                            <span style={{ color: "#ff3b30" }}>−</span> {con}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Vote count */}
                  <div style={{ marginBottom: 16, padding: "12px", borderRadius: 8, background: "rgba(255,255,255,0.03)", textAlign: "center" }}>
                    <p style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.06em" }}>Votes</p>
                    <p style={{ fontSize: 20, fontWeight: 700, color: "#ffd60a" }}>{solution.vote_count}</p>
                  </div>

                  {/* Vote button */}
                  <button
                    onClick={() => handleVote(solution.id)}
                    disabled={votingInProgress || solution.user_voted}
                    style={{
                      width: "100%",
                      padding: "12px 16px",
                      borderRadius: 10,
                      border: "none",
                      background: solution.user_voted ? "#34c759" : "#ffd60a",
                      color: "#000",
                      fontWeight: 700,
                      fontSize: 14,
                      cursor: solution.user_voted ? "default" : "pointer",
                      opacity: votingInProgress ? 0.6 : 1,
                      transition: "all 0.3s ease",
                    }}
                  >
                    {solution.user_voted ? "✓ Your vote" : votingInProgress ? "Voting..." : "Vote for this"}
                  </button>
                </div>
              ))}
            </div>

            {/* Owner controls */}
            {user && room.owner_id === user.id && (
              <div style={{ borderRadius: 16, border: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.025)", padding: "24px" }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 16 }}>Owner controls</p>
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                  <button
                    onClick={() => {
                      const topVotes = Math.max(...solutions.map((sol) => sol.vote_count || 0));
                      const tiedSolutions = solutions.filter((sol) => (sol.vote_count || 0) === topVotes);
                      let winningSolution = tiedSolutions[0];
                      if (tiedSolutions.length > 1 && user) {
                        const ownerVote = tiedSolutions.find((sol) => sol.user_voted);
                        if (ownerVote) {
                          winningSolution = ownerVote;
                        }
                      }
                      handleCompleteRoom("RESOLUTION_REACHED", winningSolution.id);
                    }}
                    disabled={completingRoom}
                    style={{
                      padding: "12px 24px",
                      borderRadius: 10,
                      border: "none",
                      background: "#34c759",
                      color: "#000",
                      fontWeight: 700,
                      fontSize: 14,
                      cursor: "pointer",
                      opacity: completingRoom ? 0.6 : 1,
                    }}
                  >
                    {completingRoom ? "Completing..." : "Mark as resolved"}
                  </button>
                  <button
                    onClick={() => handleCompleteRoom("BLOCKED")}
                    disabled={completingRoom}
                    style={{
                      padding: "12px 24px",
                      borderRadius: 10,
                      border: "2px solid #ff3b30",
                      background: "transparent",
                      color: "#ff3b30",
                      fontWeight: 700,
                      fontSize: 14,
                      cursor: "pointer",
                      opacity: completingRoom ? 0.6 : 1,
                    }}
                  >
                    Mark as blocked
                  </button>
                </div>
              </div>
            )}
          </div>
        )}


        {/* ── RESOLUTION/COMPLETION SUMMARY ── */}
        {(room.status === "RESOLUTION_REACHED" || room.status === "COMPLETED" || room.status === "BLOCKED") && solutions.length > 0 && (
          <div style={{ animation: "fadeUp 0.6s ease both", marginTop: 40 }}>
            <div style={{
              borderRadius: 20,
              border: `1px solid ${STATUS_META[room.status]?.border}`,
              background: STATUS_META[room.status]?.bg,
              padding: "32px",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                <span style={{ fontSize: 28 }}>
                  {room.status === "COMPLETED" ? "✓" : room.status === "BLOCKED" ? "⚠️" : "🎯"}
                </span>
                <div>
                  <p style={{ fontSize: 12, fontWeight: 700, color: STATUS_META[room.status]?.color, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>
                    {STATUS_META[room.status]?.label}
                  </p>
                  <h2 style={{ fontSize: 22, fontWeight: 700, color: "#fff" }}>
                    {room.status === "COMPLETED" ? "Room completed" : room.status === "BLOCKED" ? "Resolution blocked" : "Resolution reached"}
                  </h2>
                </div>
              </div>

              {room.status === "RESOLUTION_REACHED" && (
                <div style={{ marginTop: 16 }}>
                  <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>Winning solution</p>
                  {(() => {
                    const winningSolution = solutions.reduce((max, sol) => (sol.vote_count || 0) > (max.vote_count || 0) ? sol : max, solutions[0]);
                    return (
                      <div style={{ background: "rgba(255,255,255,0.08)", borderRadius: 12, padding: "16px" }}>
                        <p style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>{winningSolution?.title}</p>
                        <p style={{ fontSize: 14, color: "rgba(255,255,255,0.65)", lineHeight: 1.6 }}>
                          {winningSolution?.description}
                        </p>
                        <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontSize: 20, fontWeight: 700, color: "#ffd60a" }}>{winningSolution?.vote_count}</span>
                          <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>votes received</span>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}