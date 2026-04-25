"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to Auth0 login or dashboard if already authenticated
    const checkAuth = async () => {
      const res = await fetch("/api/auth/me");
      if (res.ok) {
        // User is authenticated, redirect to dashboard
        router.replace("/dashboard");
      }
    };
    checkAuth();
  }, [router]);

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <section className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center px-6 py-16 sm:px-10 lg:px-0">
        <div className="space-y-10 rounded-4xl border border-white/10 bg-white/5 p-10 shadow-2xl shadow-black/20">
          <div className="space-y-4">
            <p className="text-sm uppercase tracking-[0.4em] text-cyan-300">SilentRoom</p>
            <h1 className="text-5xl font-semibold tracking-tight">Async standups for modern teams</h1>
            <p className="max-w-2xl text-lg leading-8 text-zinc-300">
              Log in with your email via Auth0, then create or join a room. Teammates share a 6-digit room code, record a 90-second voice memo, and AI generates a status once responses are complete.
            </p>
          </div>

          <div className="space-y-6">
            <a
              href="/auth/login"
              className="inline-flex items-center justify-center rounded-3xl bg-cyan-500 px-6 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-cyan-400"
            >
              Sign in with Auth0
            </a>
          </div>

          <div className="rounded-3xl bg-zinc-900/70 p-6 text-zinc-300">
            <h2 className="text-base font-semibold text-white">Features</h2>
            <ul className="mt-3 space-y-2 text-sm leading-6">
              <li>• Auth0 authentication with secure sessions</li>
              <li>• Real-time voice recording (90 seconds max)</li>
              <li>• ElevenLabs speech-to-text transcription</li>
              <li>• Google Gemini AI analysis and decision engine</li>
              <li>• Supabase backend for rooms and responses</li>
              <li>• AI-generated meeting agendas when needed</li>
            </ul>
          </div>
        </div>
      </section>
    </main>
  );
}
