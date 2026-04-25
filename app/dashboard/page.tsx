"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface Room {
  id: string;
  name: string;
  prompt: string;
  status: string;
  code?: string;
}

interface AuthUser {
  name: string;
  email: string;
  picture?: string;
  sub: string;
}

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; dot: string; bg: string }
> = {
  COMPLETE: {
    label: "Complete",
    color: "text-white/85",
    dot: "bg-white/60",
    bg: "bg-white/[0.05] border-white/[0.1]",
  },
  PENDING: {
    label: "Pending",
    color: "text-white/75",
    dot: "bg-white/55",
    bg: "bg-white/[0.05] border-white/[0.1]",
  },
  REJECTED: {
    label: "Rejected",
    color: "text-red-300",
    dot: "bg-red-300",
    bg: "bg-red-400/12 border-red-400/30",
  },
  OPEN: {
    label: "Open",
    color: "text-white/70",
    dot: "bg-white/55",
    bg: "bg-white/[0.045] border-white/[0.1]",
  },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.OPEN;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${cfg.color} ${cfg.bg}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [joinCode, setJoinCode] = useState("");
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    async function init() {
      try {
        const userRes = await fetch("/api/auth/me");

        if (!userRes.ok) {
          router.replace("/");
          return;
        }

        setUser(await userRes.json());

        const roomsRes = await fetch("/api/rooms");

        if (roomsRes.ok) {
          setRooms(await roomsRes.json());
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }

    void init();
  }, [router]);

  function signOut() {
    window.location.href = "/auth/logout";
  }

  async function handleJoin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!joinCode.trim()) return;

    setJoining(true);

    try {
      const res = await fetch("/api/rooms/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomCode: joinCode.trim().toUpperCase() }),
      });

      if (res.ok) {
        const member = await res.json();

        setJoinCode("");

        const roomsRes = await fetch("/api/rooms");
        if (roomsRes.ok) {
          setRooms(await roomsRes.json());
        }

        router.push(`/room/${member.room_id}`);
      } else {
        alert("Room not found. Check the code and try again.");
      }
    } catch (error) {
      console.error(error);
      alert("Failed to join room.");
    } finally {
      setJoining(false);
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/20 border-t-white" />
      </main>
    );
  }

  const firstName = user?.name?.split(" ")[0] ?? "there";

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-5xl px-6 py-8 sm:px-10">
        <header className="mb-14 flex items-center justify-between border-b border-white/[0.1] pb-6">
          <button
            onClick={() => router.push("/dashboard")}
            className="text-lg font-semibold tracking-tight text-white"
          >
            Silent<span className="text-white/65">Room</span>
          </button>

          <div className="flex items-center gap-3">
            {user?.picture && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.picture}
                alt=""
                className="h-8 w-8 rounded-full ring-1 ring-white/20"
              />
            )}

            <button
              onClick={signOut}
              className="rounded-full border border-white/[0.14] bg-white/[0.035] px-4 py-2 text-xs font-medium text-white/60 transition hover:bg-white/[0.08] hover:text-white"
            >
              Sign out
            </button>
          </div>
        </header>

        <section className="mb-12">
          <p className="mb-3 text-sm text-white/50">Dashboard</p>

          <h1 className="max-w-[12ch] text-5xl font-semibold tracking-[-0.04em] text-white sm:text-6xl">
            Good to see you, {firstName}.
          </h1>

          <p className="mt-5 max-w-[42ch] text-base leading-7 text-white/50">
            Create a room or join one with a code from your team.
          </p>
        </section>

        <section className="mb-14 grid gap-3 sm:grid-cols-2">
          <button
            onClick={() => router.push("/room/create")}
            className="group flex min-h-[132px] items-center justify-between rounded-3xl border border-white/[0.1] bg-white/[0.035] p-6 text-left transition hover:border-white/[0.18] hover:bg-white/[0.06]"
          >
            <div>
              <p className="text-lg font-medium tracking-[-0.01em] text-white">
                Create a room
              </p>
              <p className="mt-2 max-w-[28ch] text-sm leading-6 text-white/45">
                Start a new async standup.
              </p>
            </div>

            <span className="text-2xl font-light text-white/50 transition group-hover:text-white">
              +
            </span>
          </button>

          <form
            onSubmit={handleJoin}
            className="flex min-h-[132px] items-center gap-3 rounded-3xl border border-white/[0.1] bg-white/[0.035] p-6 transition hover:border-white/[0.18] hover:bg-white/[0.06]"
          >
            <input
              value={joinCode}
              onChange={(event) => setJoinCode(event.target.value)}
              placeholder="Room code"
              maxLength={6}
              className="min-w-0 flex-1 rounded-2xl border border-white/[0.15] bg-black px-4 py-3 text-sm uppercase tracking-normal text-white outline-none placeholder:normal-case placeholder:text-white/40 focus:border-white/30"
            />

            <button
              type="submit"
              disabled={joining || !joinCode.trim()}
              className="rounded-2xl bg-white px-5 py-3 text-sm font-medium text-black transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              {joining ? "..." : "Join"}
            </button>
          </form>
        </section>

        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-medium text-white/50">Your rooms</h2>
            <span className="text-xs text-white/40">{rooms.length} total</span>
          </div>

          {rooms.length === 0 ? (
            <div className="rounded-3xl border border-white/[0.1] bg-white/[0.035] p-12 text-center">
              <p className="text-sm text-white/45">
                No rooms yet. Create one to get started.
              </p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {rooms.map((room) => (
                <button
                  key={room.id}
                  onClick={() => router.push(`/room/${room.id}`)}
                  className="group flex min-h-[180px] flex-col rounded-3xl border border-white/[0.1] bg-white/[0.035] p-5 text-left transition hover:border-white/[0.18] hover:bg-white/[0.06]"
                >
                  <div className="mb-5 flex items-start justify-between gap-2">
                    <StatusBadge status={room.status} />

                    {room.code && (
                      <span className="rounded-lg border border-white/[0.1] bg-black px-2 py-1 font-mono text-xs text-white/60">
                        {room.code}
                      </span>
                    )}
                  </div>

                  <p className="text-base font-medium tracking-[-0.01em] text-white">
                    {room.name}
                  </p>

                  <p className="mt-2 line-clamp-2 max-w-[32ch] text-sm leading-6 text-white/45">
                    {room.prompt}
                  </p>

                  <div className="mt-auto pt-5 text-xs text-white/45 transition group-hover:text-white/80">
                    Open →
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}