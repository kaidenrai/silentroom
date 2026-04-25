import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || "";

// Client for browser-side queries (uses anon key)
export const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);

// Admin client for server-side queries (uses service key)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// Database types
export interface User {
  id: string;
  email: string;
  name: string;
  avatar_url?: string;
  created_at: string;
}

export interface Room {
  id: string;
  owner_id: string;
  name: string;
  prompt: string;
  deadline?: string;
  status: "OPEN" | "CLOSED" | "COMPLETE" | "PENDING" | "REJECTED";
  created_at: string;
}

export interface RoomMember {
  room_id: string;
  user_id: string;
  joined_at: string;
}

export interface Response {
  id: string;
  room_id: string;
  user_id: string;
  audio_url: string;
  transcript: string;
  submitted_at: string;
}

export interface RoomAnalysis {
  id: string;
  room_id: string;
  satisfaction_score: number;
  status: "COMPLETE" | "PENDING" | "REJECTED";
  consensus_points: string[];
  blockers: Array<{ owner: string; issue: string; severity: string }>;
  alignment_percent: number;
  meeting_needed: boolean;
  suggested_attendees: string[];
  suggested_agenda: string;
  created_at: string;
}
