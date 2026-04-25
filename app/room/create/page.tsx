"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface Room {
  id: string;
  name: string;
  prompt: string;
  code: string;
}

export default function CreateRoomPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [prompt, setPrompt] = useState("");
  const [deadline, setDeadline] = useState("");
  const [createdRoom, setCreatedRoom] = useState<Room | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const res = await fetch("/api/auth/me");
      if (!res.ok) {
        router.replace("/");
      }
    };
    checkAuth();
  }, [router]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!name.trim() || !prompt.trim()) return;

    setLoading(true);
    try {
      const res = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          prompt: prompt.trim(),
          deadline: deadline || null,
        }),
      });

      if (res.ok) {
        const room = await res.json();
        setCreatedRoom(room);
      } else {
        alert("Failed to create room");
      }
    } catch (error) {
      console.error("Error creating room:", error);
      alert("Error creating room");
    } finally {
      setLoading(false);
    }
  };

  const copyCode = async () => {
    if (!createdRoom) return;
    await navigator.clipboard.writeText(createdRoom.code);
  };

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <section className="mx-auto flex min-h-screen max-w-4xl flex-col justify-center px-6 py-16 sm:px-10 lg:px-0">
        <div className="rounded-4xl border border-white/10 bg-white/5 p-10 shadow-2xl shadow-black/20">
          <button onClick={() => router.push("/dashboard")} className="mb-6 inline-flex rounded-full border border-white/10 px-4 py-2 text-sm text-zinc-300 transition hover:bg-white/5">
            ← Back to dashboard
          </button>

          <h1 className="text-4xl font-semibold">Create a new room</h1>
          <p className="mt-3 text-zinc-300">Enter the prompt your teammates will answer, then share the generated 6-digit room code.</p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-6">
            <div>
              <label className="block text-sm font-medium text-zinc-200">Room name</label>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="mt-2 w-full rounded-3xl border border-white/10 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-200">Prompt</label>
              <textarea
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                rows={4}
                className="mt-2 w-full rounded-3xl border border-white/10 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-200">Deadline (optional)</label>
              <input
                value={deadline}
                onChange={(event) => setDeadline(event.target.value)}
                type="datetime-local"
                className="mt-2 w-full rounded-3xl border border-white/10 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20"
              />
            </div>

            <button type="submit" disabled={loading} className="inline-flex rounded-3xl bg-cyan-500 px-6 py-3 font-semibold text-zinc-950 transition hover:bg-cyan-400 disabled:opacity-50">
              {loading ? "Creating..." : "Create room"}
            </button>
          </form>

          {createdRoom ? (
            <div className="mt-10 rounded-3xl border border-cyan-500/30 bg-cyan-500/5 p-6">
              <h2 className="text-2xl font-semibold">Room created</h2>
              <p className="mt-3 text-zinc-300">Share this code with teammates so they can join.</p>
              <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center">
                <span className="rounded-3xl bg-zinc-900/80 px-5 py-4 text-2xl font-semibold tracking-[0.2em] text-white">{createdRoom.code}</span>
                <button onClick={copyCode} className="rounded-3xl bg-white/10 px-5 py-3 text-sm transition hover:bg-white/20">
                  Copy code
                </button>
                <button onClick={() => router.push(`/room/${createdRoom.id}`)} className="rounded-3xl bg-cyan-500 px-5 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-cyan-400">
                  Go to room
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </section>
    </main>
  );
}
