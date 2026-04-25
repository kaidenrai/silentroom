"use client";

import { useEffect, useState } from "react";
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
  user_id: string;
  audio_url: string;
  transcript: string;
  submitted_at: string;
}

export default function RoomPage() {
  const params = useParams();
  const router = useRouter();
  const roomId = params?.id as string;

  const [room, setRoom] = useState<Room | null>(null);
  const [membership, setMembership] = useState<RoomMember | null>(null);
  const [responses, setResponses] = useState<RoomResponse[]>([]);
  const [name, setName] = useState("");
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [allSubmitted, setAllSubmitted] = useState(false);
  const [memberCount, setMemberCount] = useState(0);
  const [responseCount, setResponseCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);

  async function loadRoom() {
    if (!roomId) return;

    setLoading(true);

    try {
      const res = await fetch(`/api/rooms/${roomId}`);
      const data = await res.json();

      if (!res.ok) {
        setRoom(null);
        return;
      }

      setRoom(data.room);
      setMembership(data.membership);
      setResponses(data.responses || []);
      setHasSubmitted(data.hasSubmitted);
      setAllSubmitted(data.allSubmitted);
      setMemberCount(data.memberCount || 0);
      setResponseCount(data.responseCount || 0);
    } catch (error) {
      console.error("Error fetching room:", error);
      setRoom(null);
    } finally {
      setLoading(false);
    }
  }


useEffect(() => {
  void loadRoom();
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [roomId]);

  async function joinRoom(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim()) return;

    setJoining(true);

    try {
      const res = await fetch(`/api/rooms/${roomId}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });

      if (!res.ok) {
        alert("Failed to join room");
        return;
      }

      await loadRoom();
    } catch (error) {
      console.error("Error joining room:", error);
      alert("Error joining room");
    } finally {
      setJoining(false);
    }
  }

  async function handleRecordingSubmit(audioBlob: Blob) {
    if (!room || !membership || hasSubmitted) return;

    setSubmitting(true);

    try {
      const formData = new FormData();
      formData.append("audio", audioBlob);
      formData.append("room_id", room.id);

      const res = await fetch("/api/responses", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        alert("Failed to save response");
        return;
      }

      await loadRoom();
      alert("Response saved.");
    } catch (error) {
      console.error("Error submitting response:", error);
      alert("Error submitting response");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleAnalyze() {
    if (!room) return;

    if (!allSubmitted) {
      alert("Wait until everyone has submitted.");
      return;
    }

    setAnalyzing(true);

    try {
      const res = await fetch("/api/analyse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId: room.id }),
      });

      if (res.ok) {
        router.push(`/results/${room.id}`);
      } else {
        alert("Failed to analyze room");
      }
    } catch (error) {
      console.error("Error analyzing room:", error);
      alert("Error analyzing room");
    } finally {
      setAnalyzing(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-zinc-950 text-white">
        <section className="mx-auto flex min-h-screen max-w-4xl flex-col justify-center px-6 py-16">
          <div className="rounded-4xl border border-white/10 bg-white/5 p-10">
            <p>Loading...</p>
          </div>
        </section>
      </main>
    );
  }

  if (!room) {
    return (
      <main className="min-h-screen bg-zinc-950 text-white">
        <section className="mx-auto flex min-h-screen max-w-4xl flex-col justify-center px-6 py-16">
          <div className="rounded-4xl border border-white/10 bg-white/5 p-10">
            <button
              onClick={() => router.push("/dashboard")}
              className="mb-6 rounded-full border border-white/10 px-4 py-2 text-sm text-zinc-300 hover:bg-white/5"
            >
              ← Back to dashboard
            </button>
            <h1 className="text-3xl font-semibold">Room not found</h1>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <section className="mx-auto flex min-h-screen max-w-4xl flex-col justify-center px-6 py-16">
        <div className="rounded-4xl border border-white/10 bg-white/5 p-10">
          <div className="mb-8 flex items-center justify-between gap-4">
            <button
              onClick={() => router.push("/dashboard")}
              className="rounded-full border border-white/10 px-4 py-2 text-sm text-zinc-300 hover:bg-white/5"
            >
              ← Back
            </button>
            <span className="rounded-full bg-cyan-500/15 px-4 py-2 text-sm uppercase tracking-[0.2em] text-cyan-300">
              Room {room.code}
            </span>
          </div>

          <h1 className="text-4xl font-semibold">{room.name}</h1>
          <p className="mt-4 text-lg leading-8 text-zinc-300">{room.prompt}</p>

          <div className="mt-6 flex flex-wrap gap-3 text-sm text-zinc-300">
            <span className="rounded-full bg-white/10 px-4 py-2">
              Responses: {responseCount}/{memberCount}
            </span>
            <span className="rounded-full bg-white/10 px-4 py-2">
              Status: {room.status}
            </span>
            {membership && (
              <span className="rounded-full bg-white/10 px-4 py-2">
                Joined as {membership.name}
              </span>
            )}
          </div>

          {!membership ? (
            <form onSubmit={joinRoom} className="mt-12 space-y-4 rounded-3xl bg-zinc-900/70 p-6">
              <h2 className="text-2xl font-semibold">Join this room</h2>
              <p className="text-zinc-400">Enter your name to answer the prompt.</p>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Your name"
                className="w-full rounded-3xl border border-white/10 bg-zinc-950 px-4 py-3 text-white outline-none"
              />
              <button
                type="submit"
                disabled={joining || !name.trim()}
                className="rounded-3xl bg-cyan-500 px-6 py-3 font-semibold text-zinc-950 disabled:opacity-50"
              >
                {joining ? "Joining..." : "Join room"}
              </button>
            </form>
          ) : (
            <div className="mt-12 space-y-8">
              {hasSubmitted ? (
                <div className="rounded-3xl border border-white/10 bg-zinc-900/70 p-6">
                  <h2 className="text-2xl font-semibold">You already submitted.</h2>
                  {allSubmitted ? (
                    <>
                      <p className="mt-2 text-zinc-400">Everyone has submitted. You can analyze the room now.</p>
                      <button
                        onClick={handleAnalyze}
                        disabled={analyzing}
                        className="mt-6 rounded-3xl bg-cyan-500 px-6 py-3 font-semibold text-zinc-950 disabled:opacity-50"
                      >
                        {analyzing ? "Analyzing..." : "Analyze and view results"}
                      </button>
                    </>
                  ) : (
                    <p className="mt-2 text-zinc-400">Waiting for everyone else to submit.</p>
                  )}
                </div>
              ) : (
                <div className="rounded-3xl border border-white/10 bg-zinc-900/70 p-6">
                  <h2 className="text-2xl font-semibold">Your response</h2>
                  <p className="mt-2 text-zinc-400">Record up to 90 seconds.</p>
                  <Recorder onSubmit={handleRecordingSubmit} maxSeconds={90} />
                  {submitting && <p className="mt-3 text-zinc-400">Submitting...</p>}
                </div>
              )}

              <div className="rounded-3xl border border-white/10 bg-zinc-900/70 p-6">
                <h3 className="text-xl font-semibold">Responses collected</h3>
                <div className="mt-4 space-y-3">
                  {responses.length ? (
                    responses.map((response) => (
                      <div key={response.id} className="rounded-3xl bg-zinc-950/80 p-4">
                        <p className="font-semibold">{response.user_id}</p>
                        <p className="mt-1 text-sm text-zinc-400">{response.transcript}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-zinc-500">No responses yet.</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}