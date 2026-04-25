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
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function checkAuth() {
      const res = await fetch("/api/auth/me");
      if (!res.ok) router.replace("/");
    }

    void checkAuth();
  }, [router]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!name.trim() || !prompt.trim()) {
      alert("Please enter a room name and prompt.");
      return;
    }

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

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "Failed to create room");
        return;
      }

      setCreatedRoom(data);
    } catch (error) {
      console.error("Error creating room:", error);
      alert("Error creating room");
    } finally {
      setLoading(false);
    }
  }

  async function copyCode() {
    if (!createdRoom) return;
    await navigator.clipboard.writeText(createdRoom.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  }

  if (createdRoom) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black px-6 text-white">
        <section className="w-full max-w-xl rounded-[2rem] border border-white/[0.1] bg-white/[0.035] p-8 text-center shadow-2xl shadow-black">
          <p className="text-sm text-white/45">Room created</p>

          <h1 className="mt-3 text-4xl font-semibold tracking-[-0.04em]">
            Share this code.
          </h1>

          <p className="mx-auto mt-4 max-w-[36ch] text-sm leading-6 text-white/45">
            Send this code to your team so they can join and submit their voice responses.
          </p>

          <div className="mt-8 rounded-3xl border border-white/[0.1] bg-black px-6 py-6">
            <p className="text-xs uppercase tracking-wide text-white/30">Room code</p>
            <p className="mt-3 font-mono text-4xl font-semibold tracking-[0.22em] text-white">
              {createdRoom.code}
            </p>
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <button
              onClick={copyCode}
              className="rounded-full border border-white/[0.14] bg-white/[0.04] px-6 py-3 text-sm font-medium text-white/75 transition hover:bg-white/[0.08] hover:text-white"
            >
              {copied ? "Copied" : "Copy code"}
            </button>

            <button
              onClick={() => router.push(`/room/${createdRoom.id}`)}
              className="rounded-full bg-white px-6 py-3 text-sm font-medium text-black transition hover:bg-white/90"
            >
              Go to room
            </button>
          </div>

          <button
            onClick={() => router.push("/dashboard")}
            className="mt-6 text-sm text-white/35 transition hover:text-white/65"
          >
            Back to dashboard
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <section className="mx-auto max-w-3xl px-6 py-10 sm:px-10">
        <button
          onClick={() => router.push("/dashboard")}
          className="mb-12 rounded-full border border-white/[0.12] bg-white/[0.03] px-4 py-2 text-sm text-white/60 transition hover:bg-white/[0.07] hover:text-white"
        >
          ← Back to dashboard
        </button>

        <div className="mb-10">
          <p className="mb-3 text-sm text-white/45">New room</p>
          <h1 className="text-5xl font-semibold tracking-[-0.04em] text-white">
            Create a room.
          </h1>
          <p className="mt-5 max-w-[44ch] text-base leading-7 text-white/45">
            Add a prompt, share the code, and collect voice responses without scheduling a meeting.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-5 rounded-3xl border border-white/[0.08] bg-white/[0.025] p-6"
        >
          <div>
            <label className="block text-sm text-white/55">Room name</label>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Weekend plans"
              className="mt-2 w-full rounded-2xl border border-white/[0.12] bg-black px-4 py-3 text-white outline-none placeholder:text-white/25 focus:border-white/30"
            />
          </div>

          <div>
            <label className="block text-sm text-white/55">Prompt</label>
            <textarea
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              rows={4}
              placeholder="Who is free and what should we do?"
              className="mt-2 w-full resize-none rounded-2xl border border-white/[0.12] bg-black px-4 py-3 text-white outline-none placeholder:text-white/25 focus:border-white/30"
            />
          </div>

          <div>
            <label className="block text-sm text-white/55">Deadline optional</label>

            <div className="mt-3 grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-white/[0.12] bg-white/[0.03] px-4 py-3 transition hover:border-white/30 hover:bg-white/[0.06] focus-within:border-white/40">
                <p className="mb-1 text-[11px] uppercase tracking-wide text-white/30">
                  Date
                </p>
                <input
                  type="date"
                  value={deadline.split("T")[0] || ""}
                  onChange={(event) => {
                    const date = event.target.value;
                    const time = deadline.split("T")[1] || "23:59";
                    setDeadline(date ? `${date}T${time}` : "");
                  }}
                  className="w-full bg-transparent text-sm text-white outline-none [color-scheme:dark]"
                />
              </div>

              <div className="rounded-2xl border border-white/[0.12] bg-white/[0.03] px-4 py-3 transition hover:border-white/30 hover:bg-white/[0.06] focus-within:border-white/40">
                <p className="mb-1 text-[11px] uppercase tracking-wide text-white/30">
                  Time
                </p>
                <input
                  type="time"
                  value={deadline.split("T")[1] || ""}
                  onChange={(event) => {
                    const time = event.target.value;
                    const date = deadline.split("T")[0];
                    setDeadline(date ? `${date}T${time}` : "");
                  }}
                  className="w-full bg-transparent text-sm text-white outline-none [color-scheme:dark]"
                />
              </div>
            </div>

            <p className="mt-2 text-xs text-white/30">
              Leave empty if there’s no deadline.
            </p>
          </div>

          <button
            type="submit"
            disabled={loading || !name.trim() || !prompt.trim()}
            className="rounded-full bg-white px-6 py-3 text-sm font-medium text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-30"
          >
            {loading ? "Creating..." : "Create room"}
          </button>
        </form>
      </section>
    </main>
  );
}