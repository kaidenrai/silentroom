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



export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [joinCode, setJoinCode] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserAndRooms = async () => {
      try {
        // Check if user is authenticated
        const userRes = await fetch("/api/auth/me");
        if (!userRes.ok) {
          router.replace("/");
          return;
        }

        const userData = await userRes.json();
        setUser(userData);

        // Fetch rooms
        const roomsRes = await fetch("/api/rooms");
        if (roomsRes.ok) {
          const roomsData = await roomsRes.json();
          setRooms(roomsData);
        }
      } catch (error) {
        console.error("Error fetching user/rooms:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserAndRooms();
  }, [router]);

  const signOut = async () => {
    window.location.href = "/auth/logout";
    router.push("/");
  };

  const handleJoin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!joinCode.trim()) return;
    
    try {
      const res = await fetch("/api/rooms/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomCode: joinCode }),
      });

      if (res.ok) {
        const member = await res.json();
        setJoinCode("");
        // Add the room to the list if not already there
        const roomRes = await fetch("/api/rooms");
        if (roomRes.ok) {
          const roomsData = await roomRes.json();
          setRooms(roomsData);
        }
        router.push(`/room/${member.room_id}`);
      } else {
        alert("Invalid room code");
      }
    } catch (error) {
      console.error("Error joining room:", error);
    }
  };

  const goToCreate = () => {
    router.push("/room/create");
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-zinc-950 text-white flex items-center justify-center">
        <p>Loading...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <section className="mx-auto flex min-h-screen max-w-6xl flex-col justify-center px-6 py-16 sm:px-10 lg:px-0">
        <div className="mb-10 flex flex-col gap-4 rounded-4xl border border-white/10 bg-white/5 p-10 shadow-2xl shadow-black/20 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.35em] text-cyan-300">Dashboard</p>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight">Welcome back{user?.name ? `, ${user.name.split(" ")[0]}` : "!"}</h1>
            <p className="mt-3 max-w-2xl text-zinc-300">Create a new room or join an existing room with a 6-digit code shared by your team.</p>
          </div>
          <button onClick={signOut} className="rounded-3xl border border-white/10 bg-zinc-900/80 px-5 py-3 text-sm transition hover:bg-zinc-800">
            Sign out
          </button>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <div className="rounded-4xl border border-white/10 bg-white/5 p-8 shadow-xl shadow-black/20">
            <h2 className="text-2xl font-semibold">Create a room</h2>
            <p className="mt-3 text-zinc-300">Start a new async standup and share the generated code with teammates.</p>
            <button onClick={goToCreate} className="mt-6 inline-flex rounded-3xl bg-cyan-500 px-6 py-3 font-semibold text-zinc-950 transition hover:bg-cyan-400">
              Create room
            </button>
          </div>

          <div className="rounded-4xl border border-white/10 bg-zinc-900/80 p-8 shadow-xl shadow-black/20">
            <h2 className="text-2xl font-semibold">Join a room</h2>
            <p className="mt-3 text-zinc-300">Enter the 6-digit room code from your teammate.</p>
            <form onSubmit={handleJoin} className="mt-6 flex flex-col gap-4">
              <input
                value={joinCode}
                onChange={(event) => setJoinCode(event.target.value)}
                placeholder="123456"
                className="rounded-3xl border border-white/10 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20"
              />
              <button type="submit" className="rounded-3xl bg-cyan-500 px-6 py-3 font-semibold text-zinc-950 transition hover:bg-cyan-400">
                Join room
              </button>
            </form>
          </div>
        </div>

        <div className="mt-8 rounded-4xl border border-white/10 bg-white/5 p-8 shadow-xl shadow-black/20">
          <h2 className="text-2xl font-semibold">Your rooms</h2>
          {rooms.length ? (
            <div className="mt-6 grid gap-4">
              {rooms.map((room) => (
                <button
                  key={room.id}
                  onClick={() => router.push(`/room/${room.id}`)}
                  className="rounded-3xl border border-white/10 bg-zinc-950/80 px-6 py-5 text-left transition hover:bg-zinc-900"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm uppercase tracking-[0.35em] text-cyan-300">Room code</p>
                      <p className="mt-2 text-2xl font-semibold">{room.code}</p>
                    </div>
                    <span className="rounded-full bg-white/10 px-3 py-1 text-xs uppercase tracking-[0.25em] text-zinc-200">
                      View
                    </span>
                  </div>
                  <p className="mt-4 text-zinc-300">{room.name}</p>
                  <p className="mt-2 text-sm text-zinc-500">{room.prompt}</p>
                </button>
              ))}
            </div>
          ) : (
            <p className="mt-6 text-zinc-300">You haven&apos;t created any rooms yet. Create one to get a shareable 6-digit code.</p>
          )}
        </div>
      </section>
    </main>
  );
}
