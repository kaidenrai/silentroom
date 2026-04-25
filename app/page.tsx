"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

const ROOMS = [
  { name: "Sprint Planning",  status: "COMPLETE", score: 91, members: 6, prompt: "What's everyone shipping this week?" },
  { name: "Q4 Roadmap",       status: "PENDING",  score: 58, members: 8, prompt: "What are your priorities for Q4?" },
  { name: "Team Retro",       status: "COMPLETE", score: 84, members: 5, prompt: "What went well? What didn't?" },
  { name: "Design Review",    status: "REJECTED", score: 31, members: 4, prompt: "Is the new design ready to ship?" },
  { name: "Eng Standup",      status: "COMPLETE", score: 78, members: 7, prompt: "Any blockers from yesterday?" },
  { name: "Product Sync",     status: "PENDING",  score: 63, members: 9, prompt: "Are we aligned on the launch date?" },
  { name: "Hiring Panel",     status: "COMPLETE", score: 95, members: 5, prompt: "Should we move forward?" },
  { name: "Budget Review",    status: "REJECTED", score: 22, members: 6, prompt: "Are we on track for Q3 spend?" },
  { name: "Marketing Sync",   status: "COMPLETE", score: 88, members: 4, prompt: "Is the campaign ready to go live?" },
  { name: "Infra Audit",      status: "PENDING",  score: 47, members: 3, prompt: "What needs fixing before launch?" },
  { name: "Customer Calls",   status: "COMPLETE", score: 72, members: 5, prompt: "What did we learn this week?" },
  { name: "OKR Check-in",     status: "REJECTED", score: 19, members: 8, prompt: "Are we on track with our OKRs?" },
];

const STATUS = {
  COMPLETE: { label: "Complete", dot: "#34c759" },
  PENDING:  { label: "Pending",  dot: "#ff9f0a" },
  REJECTED: { label: "Rejected", dot: "#ff3b30" },
};

function RoomCard({ room }: { room: typeof ROOMS[0] }) {
  const s = STATUS[room.status as keyof typeof STATUS];
  return (
    <div
      style={{
        flexShrink: 0,
        width: 220,
        borderRadius: 14,
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.08)",
        backdropFilter: "blur(12px)",
        padding: 16,
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      {/* Waveform */}
      <svg viewBox="0 0 200 36" style={{ width: "100%", height: 36 }}>
        {Array.from({ length: 32 }).map((_, i) => {
          const h = 4 + Math.abs(Math.sin(i * 0.55 + room.score * 0.08) * 14 + Math.cos(i * 0.9) * 8);
          return (
            <rect key={i} x={i * 6.2 + 1} y={(36 - h) / 2} width={3.5} height={h} rx={1.5}
              fill={s.dot} opacity={0.25 + (i % 4) * 0.15} />
          );
        })}
      </svg>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: "#fff", letterSpacing: "-0.01em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 130 }}>
          {room.name}
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: s.dot, fontWeight: 500 }}>
          <span style={{ width: 5, height: 5, borderRadius: "50%", background: s.dot, display: "inline-block" }} />
          {s.label}
        </span>
      </div>

      <p style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", lineHeight: 1.5, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
        {room.prompt}
      </p>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 10, color: "rgba(255,255,255,0.25)" }}>
        <span>{room.members} members</span>
        <span style={{ fontWeight: 600, color: "rgba(255,255,255,0.45)" }}>Score {room.score}</span>
      </div>
    </div>
  );
}

function ScrollRow({ rooms, speed, dir = 1 }: { rooms: typeof ROOMS; speed: number; dir?: 1 | -1 }) {
  const track = useRef<HTMLDivElement>(null);
  const x = useRef(0);
  useEffect(() => {
    let raf: number;
    const tick = () => {
      x.current += speed * dir;
      if (track.current) {
        const half = track.current.scrollWidth / 2;
        if (dir > 0 && x.current >= half) x.current -= half;
        if (dir < 0 && x.current <= -half) x.current += half;
        track.current.style.transform = `translateX(${-x.current}px)`;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [speed, dir]);
  const doubled = [...rooms, ...rooms];
  return (
    <div style={{ overflow: "hidden", maskImage: "linear-gradient(to right,transparent 0%,black 10%,black 90%,transparent 100%)" }}>
      <div ref={track} style={{ display: "flex", gap: 12, width: "max-content" }}>
        {doubled.map((r, i) => <RoomCard key={i} room={r} />)}
      </div>
    </div>
  );
}

export default function Home() {
  const router = useRouter();
  const [email, setEmail] = useState("");

  useEffect(() => {
    fetch("/api/auth/me").then(r => { if (r.ok) router.replace("/dashboard"); });
  }, [router]);

  return (
    <main style={{ minHeight: "100vh", background: "#000", color: "#fff", fontFamily: "-apple-system, 'SF Pro Display', 'Helvetica Neue', sans-serif", overflowX: "hidden" }}>

      {/* Nav */}
      <nav style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 48px", position: "relative", zIndex: 10 }}>
        <span style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-0.03em", color: "#fff" }}>
          SilentRoom
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <a href="/auth/login" style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", textDecoration: "none", transition: "color 0.15s" }}
            onMouseEnter={e => (e.currentTarget.style.color = "#fff")}
            onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.6)")}>
            Sign in
          </a>
          <a href="/auth/login" style={{ fontSize: 13, fontWeight: 500, background: "#fff", color: "#000", borderRadius: 980, padding: "7px 18px", textDecoration: "none", transition: "background 0.15s" }}
            onMouseEnter={e => (e.currentTarget.style.background = "#e5e5e5")}
            onMouseLeave={e => (e.currentTarget.style.background = "#fff")}>
            Get started
          </a>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ textAlign: "center", padding: "80px 24px 60px", position: "relative", zIndex: 10 }}>
        {/* Subtle glow */}
        <div style={{ position: "absolute", left: "50%", top: "40%", transform: "translate(-50%,-50%)", width: 700, height: 400, background: "radial-gradient(ellipse, rgba(255,255,255,0.04) 0%, transparent 70%)", pointerEvents: "none" }} />

        <p style={{ fontSize: 13, fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(255,255,255,0.4)", marginBottom: 20 }}>
          Async standup intelligence
        </p>

        <h1 style={{ fontSize: "clamp(40px, 7vw, 80px)", fontWeight: 700, lineHeight: 1.06, letterSpacing: "-0.04em", color: "#fff", margin: "0 auto 24px", maxWidth: 760 }}>
          Standups that{" "}
          <span style={{ color: "rgba(255,255,255,0.45)" }}>
            decide for you.
          </span>
        </h1>

        <p style={{ fontSize: 18, color: "rgba(255,255,255,0.5)", lineHeight: 1.6, maxWidth: 500, margin: "0 auto 44px", fontWeight: 400 }}>
          Your team records 90-second voice updates. AI analyses every response, scores alignment, and tells you if a meeting is actually needed.
        </p>

        {/* CTA */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, flexWrap: "wrap" }}>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="Work email address"
            style={{ width: 260, padding: "12px 18px", borderRadius: 980, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.05)", color: "#fff", fontSize: 14, outline: "none", backdropFilter: "blur(8px)" }}
          />
          <a href="/auth/login" style={{ display: "inline-block", background: "#fff", color: "#000", borderRadius: 980, padding: "12px 24px", fontSize: 14, fontWeight: 600, textDecoration: "none", letterSpacing: "-0.01em", transition: "background 0.15s, transform 0.15s" }}
            onMouseEnter={e => { e.currentTarget.style.background = "#e5e5e5"; e.currentTarget.style.transform = "scale(1.02)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "#fff"; e.currentTarget.style.transform = "scale(1)"; }}>
            Get started free →
          </a>
        </div>
        <p style={{ marginTop: 14, fontSize: 12, color: "rgba(255,255,255,0.2)" }}>
          No credit card required.
        </p>
      </section>

      {/* Scrolling room cards */}
      <section style={{ position: "relative", zIndex: 10, paddingBottom: 16, display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 48, background: "linear-gradient(to bottom, #000, transparent)", pointerEvents: "none", zIndex: 1 }} />
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 48, background: "linear-gradient(to top, #000, transparent)", pointerEvents: "none", zIndex: 1 }} />
        <ScrollRow rooms={ROOMS} speed={0.35} dir={1} />
        <ScrollRow rooms={[...ROOMS].reverse()} speed={0.28} dir={-1} />
        <ScrollRow rooms={ROOMS.slice(4)} speed={0.42} dir={1} />
      </section>

      {/* Thin separator */}
      <div style={{ margin: "64px auto 0", maxWidth: 900, height: 1, background: "rgba(255,255,255,0.06)" }} />

      {/* How it works */}
      <section style={{ maxWidth: 900, margin: "0 auto", padding: "80px 24px" }}>
        <p style={{ textAlign: "center", fontSize: 13, fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(255,255,255,0.35)", marginBottom: 12 }}>
          How it works
        </p>
        <h2 style={{ textAlign: "center", fontSize: "clamp(28px, 4vw, 44px)", fontWeight: 700, letterSpacing: "-0.03em", color: "#fff", marginBottom: 56 }}>
          Three steps. Zero scheduling.
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 24 }}>
          {[
            { n: "01", title: "Create a room", body: "Write a prompt. Share the 6-character code. Your team joins when they're ready." },
            { n: "02", title: "Everyone records", body: "Members record a 90-second voice update — async, no calendar invite required." },
            { n: "03", title: "AI decides", body: "SilentRoom scores alignment, surfaces blockers, and outputs Complete, Pending, or Rejected." },
          ].map(s => (
            <div key={s.n} style={{ borderRadius: 18, border: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.025)", padding: "28px 24px", backdropFilter: "blur(8px)" }}>
              <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.25)", marginBottom: 14 }}>{s.n}</p>
              <h3 style={{ fontSize: 16, fontWeight: 600, letterSpacing: "-0.02em", color: "#fff", marginBottom: 10 }}>{s.title}</h3>
              <p style={{ fontSize: 14, color: "rgba(255,255,255,0.4)", lineHeight: 1.6 }}>{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Bottom CTA */}
      <section style={{ maxWidth: 900, margin: "0 auto 80px", padding: "0 24px" }}>
        <div style={{ borderRadius: 24, border: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.025)", padding: "64px 32px", textAlign: "center", backdropFilter: "blur(8px)" }}>
          <h2 style={{ fontSize: "clamp(24px, 4vw, 40px)", fontWeight: 700, letterSpacing: "-0.03em", color: "#fff", marginBottom: 12 }}>
            Kill the meeting.
            <br />
            Keep the clarity.
          </h2>
          <p style={{ fontSize: 15, color: "rgba(255,255,255,0.4)", marginBottom: 32, maxWidth: 400, margin: "0 auto 32px" }}>
            Start using SilentRoom today and let AI handle the standup for you.
          </p>
          <a href="/auth/login" style={{ display: "inline-block", background: "#fff", color: "#000", borderRadius: 980, padding: "13px 28px", fontSize: 14, fontWeight: 600, textDecoration: "none", transition: "background 0.15s" }}
            onMouseEnter={e => (e.currentTarget.style.background = "#e5e5e5")}
            onMouseLeave={e => (e.currentTarget.style.background = "#fff")}>
            Get started free →
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: "1px solid rgba(255,255,255,0.05)", padding: "28px 48px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <span style={{ fontSize: 13, fontWeight: 600, letterSpacing: "-0.02em", color: "rgba(255,255,255,0.3)" }}>SilentRoom</span>
        <span style={{ fontSize: 12, color: "rgba(255,255,255,0.2)" }}>© 2026 · Built at BearHacks</span>
      </footer>

    </main>
  );
}