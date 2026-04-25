# SilentRoom

SilentRoom is an async-first standup platform that replaces synchronous team meetings with structured voice responses, AI analysis, and intelligent decision outputs.

Instead of coordinating calendars and forcing a live meeting, SilentRoom lets a room owner pose a prompt, team members record a 90-second voice update, and AI returns a score, status, blockers, and only suggests a meeting when it is genuinely needed.

## What it solves

- Reduces wasted standup time by removing forced synchrony
- Converts voice responses into structured AI data instead of plain summaries
- Flags blockers, consensus, and meeting needs automatically
- Preserves async participation for remote and distributed teams

## Key features

- Async voice standup flow with a 90-second recorder
- ElevenLabs transcription and TTS narration
- Claude analysis with structured JSON output
- Decision engine with `COMPLETE`, `PENDING`, and `REJECTED` status
- Suggested meeting agenda only when required
- Supabase-backed auth, rooms, responses, and storage

## Decision logic

- `COMPLETE`: score ≥ 75 and no high-severity blockers
- `PENDING`: score 40–74 with mixed signals or minor blockers
- `REJECTED`: score < 40 or critical blockers detected


## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Notes

The product is designed for demo speed and clarity: async-first updates, structured decision output, and meeting recommendations only when the AI detects real risk or unresolved blockers.
